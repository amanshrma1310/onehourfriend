"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  Volume2,
} from "lucide-react";

interface VideoCallModalProps {
  roomId: string;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  partnerName: string;
  partnerAvatar: string;
  isVideoCall?: boolean;
  isInitiator?: boolean;
  onClose: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export default function VideoCallModal({
  roomId,
  currentUserId,
  currentUserName = "Friend",
  currentUserAvatar = "🌙",
  partnerName,
  partnerAvatar,
  isVideoCall = true,
  isInitiator = true,
  onClose,
}: VideoCallModalProps) {
  const [callState, setCallState] = useState<"CALLING" | "CONNECTING" | "CONNECTED" | "ENDED">("CALLING");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(!isVideoCall);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pollIntervalRef = useRef<any>(null);
  const ringIntervalRef = useRef<any>(null);
  const lastSignalTimeRef = useRef<number>(Date.now() - 60 * 1000); // look back 60s for offer
  const processedSignalIds = useRef<Set<string>>(new Set());

  // Helper: Send a signaling message
  const sendSignal = useCallback(
    async (type: string, payload: any = {}) => {
      try {
        await fetch("/api/call/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, type, payload }),
        });
      } catch (err) {
        console.error("Signal send error:", err);
      }
    },
    [roomId]
  );

  // Play pleasant Web Audio chime while calling
  useEffect(() => {
    let ctx: AudioContext | null = null;
    if (callState === "CALLING") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          ctx = new AudioCtx();
          const playRing = () => {
            if (!ctx || ctx.state === "closed") return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          };

          playRing();
          ringIntervalRef.current = setInterval(playRing, 3000);
        }
      } catch {}
    }

    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      if (ctx && ctx.state !== "closed") {
        try {
          ctx.close();
        } catch {}
      }
    };
  }, [callState]);

  // Clean close of tracks and connection
  const handleCleanClose = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  // Main Call Initializer
  const initCall = useCallback(async () => {
    try {
      // 1. Get Camera and Microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Create RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle remote incoming track
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setCallState("CONNECTED");
        }
      };

      // Handle ICE Candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("CANDIDATE", event.candidate);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("CONNECTED");
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setCallState("ENDED");
        }
      };

      if (isInitiator) {
        setCallState("CALLING");

        // Broadcast CALL_RING signal continuously so receiver catches it immediately
        sendSignal("CALL_RING", {
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          isVideo: isVideoCall,
        });

        // Create WebRTC Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal("OFFER", offer);
      } else {
        setCallState("CONNECTING");
        sendSignal("CALL_ACCEPT", { acceptedBy: currentUserId });
      }
    } catch (err: any) {
      console.error("Media error:", err);
      setErrorMessage(
        err.name === "NotAllowedError"
          ? "Camera/Mic permission was denied. Please allow permissions in your browser."
          : "Could not access camera/microphone."
      );
    }
  }, [isInitiator, isVideoCall, currentUserName, currentUserAvatar, currentUserId, sendSignal]);

  // Signaling Polling Loop
  useEffect(() => {
    initCall();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/call/signal?roomId=${roomId}&since=${lastSignalTimeRef.current}`);
        const data = await res.json();

        if (data.signals && data.signals.length > 0) {
          for (const signal of data.signals) {
            if (processedSignalIds.current.has(signal.id)) continue;
            processedSignalIds.current.add(signal.id);
            lastSignalTimeRef.current = new Date(signal.createdAt).getTime();

            const pc = pcRef.current;

            if (signal.type === "CALL_ACCEPT" && isInitiator && pc) {
              setCallState("CONNECTING");
              // Re-send current offer to ensure receiver has it
              if (pc.localDescription) {
                sendSignal("OFFER", pc.localDescription);
              }
            } else if (signal.type === "OFFER" && pc) {
              if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal("ANSWER", answer);
              }
            } else if (signal.type === "ANSWER" && pc) {
              if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
                setCallState("CONNECTED");
              }
            } else if (signal.type === "CANDIDATE" && pc) {
              try {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
                }
              } catch (e) {
                console.error("Candidate add error", e);
              }
            } else if (signal.type === "HANGUP" || signal.type === "CALL_DECLINE") {
              setCallState("ENDED");
              setTimeout(() => {
                handleCleanClose();
                onClose();
              }, 1200);
            }
          }
        }
      } catch (err) {
        console.error("Poll signal error:", err);
      }
    }, 1000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      handleCleanClose();
    };
  }, [roomId, initCall, isInitiator, sendSignal, handleCleanClose, onClose]);

  // Live Timer during active call
  useEffect(() => {
    let timer: any = null;
    if (callState === "CONNECTED") {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callState]);

  // Controls
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => (t.enabled = !t.enabled));
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => (t.enabled = !t.enabled));
      setIsVideoDisabled(!isVideoDisabled);
    }
  };

  const handleHangup = () => {
    sendSignal("HANGUP");
    setCallState("ENDED");
    handleCleanClose();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 md:p-6 select-none animate-fade-in">
      {/* Top Header Strip */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#872bf5] flex items-center justify-center text-xl shadow-lg shadow-[#872bf5]/40">
            {partnerAvatar}
          </div>
          <div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>{partnerName}</span>
              <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
            </div>
            <div className="text-xs text-purple-300 font-medium flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00e676]" />
              <span>
                {callState === "CONNECTED"
                  ? "Encrypted HD Call Active"
                  : callState === "CONNECTING"
                  ? "Connecting streams..."
                  : callState === "CALLING"
                  ? "Ringing partner..."
                  : "Call Ended"}
              </span>
            </div>
          </div>
        </div>

        {/* Live Call Duration */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#181824] border border-white/10 text-xs font-mono font-bold text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#872bf5] animate-ping" />
          <span>{formatTimer(callDuration)}</span>
        </div>
      </div>

      {/* Main Video Viewport Area */}
      <div className="relative w-full max-w-5xl flex-1 my-4 rounded-[32px] overflow-hidden bg-[#121218] border border-white/10 shadow-2xl flex items-center justify-center">
        {/* Remote Video Stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover rounded-[32px] ${
            callState === "CONNECTED" ? "block" : "hidden"
          }`}
        />

        {/* Placeholder Screen when calling or camera is off */}
        {callState !== "CONNECTED" && (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#872bf5]/40 animate-radar-1" />
              <div className="absolute inset-0 rounded-full border border-purple-400/40 animate-radar-2" />
              <div className="w-20 h-20 rounded-full bg-[#872bf5] flex items-center justify-center text-4xl shadow-2xl shadow-[#872bf5]/60 z-10 animate-bounce">
                {partnerAvatar}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white">
                {callState === "CALLING"
                  ? `Calling ${partnerName}...`
                  : callState === "CONNECTING"
                  ? `Connecting with ${partnerName}...`
                  : "Call Ended"}
              </h2>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                {errorMessage || "Live peer-to-peer WebRTC connection is securing your call."}
              </p>
            </div>
          </div>
        )}

        {/* Floating Picture-in-Picture Self Video Preview */}
        <div className="absolute bottom-5 right-5 w-32 h-44 sm:w-44 sm:h-56 rounded-2xl overflow-hidden bg-[#181824] border-2 border-[#872bf5] shadow-2xl z-30 group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${
              isVideoDisabled ? "hidden" : "block"
            }`}
          />
          {isVideoDisabled && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#181824] text-zinc-400 text-xs gap-1">
              <VideoOff className="w-6 h-6 text-zinc-500" />
              <span className="text-[10px] font-bold">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white">
            You
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="w-full max-w-md bg-[#181824] border border-white/10 rounded-full p-3 px-6 shadow-2xl flex items-center justify-between z-20">
        {/* Mic Mute/Unmute */}
        <button
          onClick={toggleAudio}
          className={`p-3.5 rounded-full transition shadow-md hover:scale-110 active:scale-95 ${
            isAudioMuted
              ? "bg-red-500/20 border border-red-500/40 text-red-400"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={toggleVideo}
          className={`p-3.5 rounded-full transition shadow-md hover:scale-110 active:scale-95 ${
            isVideoDisabled
              ? "bg-red-500/20 border border-red-500/40 text-red-400"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isVideoDisabled ? "Turn Camera On" : "Turn Camera Off"}
        >
          {isVideoDisabled ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </button>

        {/* End Call Button */}
        <button
          onClick={handleHangup}
          className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 transition hover:scale-110 active:scale-95 flex items-center justify-center"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
