"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  ShieldCheck,
  RefreshCw,
  Camera,
} from "lucide-react";

interface VideoCallModalProps {
  roomId: string;
  currentUserId: string;
  currentUserName?: string;
  currentUserAvatar?: string;
  partnerUserId?: string;
  partnerName: string;
  partnerAvatar: string;
  isVideoCall?: boolean;
  isInitiator?: boolean;
  initialStream?: MediaStream | null;
  onClose: () => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.cloudflare.com:3478" },
    {
      urls: [
        "turn:openrelay.metered.ca:80",
        "turn:openrelay.metered.ca:443",
        "turn:openrelay.metered.ca:443?transport=tcp",
      ],
      username: "openrelay",
      credential: "openrelay",
    },
  ],
  iceCandidatePoolSize: 10,
};

function createSyntheticAudioStream(): MediaStream {
  try {
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const dst = ctx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        const track = dst.stream.getAudioTracks()[0];
        if (track) {
          track.enabled = false;
          return new MediaStream([track]);
        }
      }
    }
  } catch {}
  return new MediaStream();
}

async function requestUserMedia(isVideo: boolean): Promise<MediaStream | null> {
  const tryConstraints: MediaStreamConstraints[] = [
    { video: isVideo ? { facingMode: "user" } : false, audio: true },
    { video: isVideo, audio: true },
    { audio: true, video: false },
  ];

  for (const c of tryConstraints) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(c);
      if (stream) return stream;
    } catch {}
  }
  return null;
}

export default function VideoCallModal({
  roomId,
  currentUserId,
  currentUserName = "Friend",
  currentUserAvatar = "🌙",
  partnerUserId,
  partnerName,
  partnerAvatar,
  isVideoCall = true,
  isInitiator = true,
  initialStream = null,
  onClose,
}: VideoCallModalProps) {
  const [callState, setCallState] = useState<"CALLING" | "CONNECTING" | "CONNECTED" | "ENDED">("CALLING");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [hasRealMedia, setHasRealMedia] = useState(!!initialStream);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(initialStream);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalIdsRef = useRef<Set<string>>(new Set());
  const pollTimerRef = useRef<any>(null);
  const ringAudioTimerRef = useRef<any>(null);
  const ringHeartbeatTimerRef = useRef<any>(null);

  // Send signaling message
  const sendSignal = useCallback(
    async (type: string, payload: any = {}) => {
      try {
        await fetch("/api/call/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, targetUserId: partnerUserId, type, payload }),
        });
      } catch (err) {
        console.error("Signal send error:", err);
      }
    },
    [roomId, partnerUserId]
  );

  // Flush queued candidates
  const flushIceCandidates = useCallback(async (pc: RTCPeerConnection) => {
    while (iceCandidatesQueueRef.current.length > 0) {
      const cand = iceCandidatesQueueRef.current.shift();
      if (cand) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn("Flush candidate error:", e);
        }
      }
    }
  }, []);

  // Pleasant ringing sound while dialing
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
          ringAudioTimerRef.current = setInterval(playRing, 3000);
        }
      } catch {}
    }

    return () => {
      if (ringAudioTimerRef.current) clearInterval(ringAudioTimerRef.current);
      if (ctx && ctx.state !== "closed") {
        try {
          ctx.close();
        } catch {}
      }
    };
  }, [callState]);

  // Clean shutdown
  const handleCleanClose = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (ringAudioTimerRef.current) clearInterval(ringAudioTimerRef.current);
    if (ringHeartbeatTimerRef.current) clearInterval(ringHeartbeatTimerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
  }, []);

  // Allow user to request camera & mic directly via user gesture if needed
  const enableUserMedia = useCallback(async () => {
    const stream = await requestUserMedia(isVideoCall);
    if (stream) {
      localStreamRef.current = stream;
      setHasRealMedia(true);
      setIsVideoDisabled(stream.getVideoTracks().length === 0);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        stream.getTracks().forEach((newTrack) => {
          const sender = senders.find((s) => s.track?.kind === newTrack.kind);
          if (sender) {
            sender.replaceTrack(newTrack);
          } else {
            pcRef.current?.addTrack(newTrack, stream);
          }
        });
      }
    }
  }, [isVideoCall]);

  // Main Call Initializer
  const initWebRTC = useCallback(async () => {
    // 1. Get initial stream
    let stream = localStreamRef.current;
    if (!stream) {
      stream = await requestUserMedia(isVideoCall);
    }
    if (!stream) {
      stream = createSyntheticAudioStream();
      setHasRealMedia(false);
      setIsVideoDisabled(true);
    } else {
      setHasRealMedia(true);
      setIsVideoDisabled(stream.getVideoTracks().length === 0);
    }

    localStreamRef.current = stream;
    if (localVideoRef.current && stream.getVideoTracks().length > 0) {
      localVideoRef.current.srcObject = stream;
    }

    // 2. Create RTCPeerConnection
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((t) => pc.addTrack(t, stream!));

    // Handle remote tracks
    pc.ontrack = (event) => {
      console.log("[WebRTC] Incoming remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
      } else {
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        remoteStreamRef.current.addTrack(event.track);
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        remoteVideoRef.current.play().catch(() => {});
      }
      setCallState("CONNECTED");
    };

    // Handle ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal("CANDIDATE", event.candidate);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCallState("CONNECTED");
      } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        setCallState("ENDED");
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("CONNECTED");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setCallState("ENDED");
      }
    };

    if (isInitiator) {
      setCallState("CALLING");
      sendSignal("CALL_RING", {
        callerName: currentUserName,
        callerAvatar: currentUserAvatar,
        isVideo: isVideoCall,
      });

      // Create Offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall,
      });
      await pc.setLocalDescription(offer);
      sendSignal("OFFER", offer);
    } else {
      setCallState("CONNECTING");
      sendSignal("CALL_ACCEPT", { acceptedBy: currentUserId });
    }
  }, [isInitiator, isVideoCall, currentUserName, currentUserAvatar, currentUserId, sendSignal]);

  // Continuous ring pulse for caller
  useEffect(() => {
    if (isInitiator && callState === "CALLING") {
      ringHeartbeatTimerRef.current = setInterval(() => {
        sendSignal("CALL_RING", {
          callerName: currentUserName,
          callerAvatar: currentUserAvatar,
          isVideo: isVideoCall,
        });
        if (pcRef.current?.localDescription) {
          sendSignal("OFFER", pcRef.current.localDescription);
        }
      }, 2500);
    }

    return () => {
      if (ringHeartbeatTimerRef.current) clearInterval(ringHeartbeatTimerRef.current);
    };
  }, [isInitiator, callState, currentUserName, currentUserAvatar, isVideoCall, sendSignal]);

  // Signaling Polling Loop
  useEffect(() => {
    initWebRTC();

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/call/signal?roomId=${roomId}`);
        const data = await res.json();

        if (data.signals && data.signals.length > 0) {
          for (const s of data.signals) {
            if (processedSignalIdsRef.current.has(s.id)) continue;
            processedSignalIdsRef.current.add(s.id);

            const pc = pcRef.current;
            if (!pc) continue;

            if (s.type === "CALL_ACCEPT" && isInitiator) {
              setCallState("CONNECTING");
              if (pc.localDescription) {
                sendSignal("OFFER", pc.localDescription);
              }
            } else if (s.type === "OFFER") {
              if (pc.signalingState === "stable" || pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(s.payload));
                await flushIceCandidates(pc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal("ANSWER", answer);
                setCallState("CONNECTED");
              }
            } else if (s.type === "ANSWER") {
              if (pc.signalingState === "have-local-offer") {
                await pc.setRemoteDescription(new RTCSessionDescription(s.payload));
                await flushIceCandidates(pc);
                setCallState("CONNECTED");
              }
            } else if (s.type === "CANDIDATE") {
              if (pc.remoteDescription && pc.remoteDescription.type) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(s.payload));
                } catch (e) {
                  console.warn("Candidate add error:", e);
                }
              } else {
                iceCandidatesQueueRef.current.push(s.payload);
              }
            } else if (s.type === "HANGUP" || s.type === "CALL_DECLINE") {
              setCallState("ENDED");
              handleCleanClose();
              onClose();
            }
          }
        }
      } catch (err) {
        console.error("Poll signal error:", err);
      }
    }, 350);

    return () => {
      handleCleanClose();
    };
  }, [roomId, initWebRTC, isInitiator, sendSignal, flushIceCandidates, handleCleanClose, onClose]);

  // Live Timer
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
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 md:p-6 select-none overflow-hidden">
      {/* Top Header Strip */}
      <div className="w-full max-w-5xl flex items-center justify-between z-20 shrink-0">
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
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#181824] border border-white/10 text-xs font-mono font-bold text-white shadow-lg">
          <span className="w-2 h-2 rounded-full bg-[#872bf5] animate-ping" />
          <span>{formatTimer(callDuration)}</span>
        </div>
      </div>

      {/* Main Video Viewport Area */}
      <div className="relative w-full max-w-5xl flex-1 my-3 md:my-4 rounded-[28px] md:rounded-[32px] overflow-hidden bg-[#121218] border border-white/10 shadow-2xl flex items-center justify-center">
        {/* Remote Video Stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover rounded-[28px] md:rounded-[32px] ${
            callState === "CONNECTED" ? "block" : "hidden"
          }`}
        />

        {/* Placeholder Screen when calling or camera is off */}
        {callState !== "CONNECTED" && (
          <div className="flex flex-col items-center justify-center text-center p-6 md:p-8 space-y-5">
            <div className="relative w-28 h-28 md:w-32 md:h-32 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#872bf5]/40 animate-radar-1" />
              <div className="absolute inset-0 rounded-full border border-purple-400/40 animate-radar-2" />
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#872bf5] flex items-center justify-center text-3xl md:text-4xl shadow-2xl shadow-[#872bf5]/60 z-10 animate-bounce">
                {partnerAvatar}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg md:text-2xl font-black text-white">
                {callState === "CALLING"
                  ? `Calling ${partnerName}...`
                  : callState === "CONNECTING"
                  ? `Connecting with ${partnerName}...`
                  : "Call Ended"}
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                {callState === "CALLING"
                  ? "Waiting for your friend to answer..."
                  : "Connecting live audio and video..."}
              </p>

              {!hasRealMedia && (
                <div className="pt-2 max-w-sm mx-auto">
                  <button
                    onClick={enableUserMedia}
                    className="bg-[#872bf5] hover:bg-[#7417e3] text-white text-xs font-bold px-5 py-2.5 rounded-2xl shadow-xl shadow-[#872bf5]/40 flex items-center gap-2 mx-auto transition hover:scale-105 active:scale-95"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Turn On Camera</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Picture-in-Picture Self Video Preview */}
        <div className="absolute bottom-4 right-4 w-28 h-36 sm:w-40 sm:h-52 rounded-2xl overflow-hidden bg-[#181824] border-2 border-[#872bf5] shadow-2xl z-30 group">
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
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#181824] text-zinc-400 text-xs gap-1 p-2 text-center">
              <VideoOff className="w-5 h-5 text-zinc-500" />
              <span className="text-[10px] font-bold">Camera Off</span>
            </div>
          )}
          <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[9px] font-bold text-white">
            You
          </div>
        </div>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="w-full max-w-md bg-[#181824] border border-white/10 rounded-full p-2.5 px-6 shadow-2xl flex items-center justify-between z-20">
        {/* Mic Mute/Unmute */}
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition shadow-md hover:scale-110 active:scale-95 ${
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
          className={`p-3 rounded-full transition shadow-md hover:scale-110 active:scale-95 ${
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
          className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/40 transition hover:scale-110 active:scale-95 flex items-center justify-center"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
