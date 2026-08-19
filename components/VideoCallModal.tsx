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
  AlertCircle,
} from "lucide-react";
import type { Peer as PeerInstance, MediaConnection } from "peerjs";

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
  onClose: () => void;
}

const PEER_CONFIG = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  secure: true,
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
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
  },
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
  onClose,
}: VideoCallModalProps) {
  const [callState, setCallState] = useState<"CALLING" | "CONNECTING" | "CONNECTED" | "ENDED">("CALLING");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(!isVideoCall);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<PeerInstance | null>(null);
  const activeMediaConnRef = useRef<MediaConnection | null>(null);
  const callAttemptIntervalRef = useRef<any>(null);
  const ringAudioIntervalRef = useRef<any>(null);
  const httpSignalPollRef = useRef<any>(null);
  const isClosingRef = useRef(false);

  const cleanRoomId = (roomId || "global").replace(/[^a-zA-Z0-9_-]/g, "_");
  const myPeerId = `ohf_${(currentUserId || "usr").replace(/[^a-zA-Z0-9_-]/g, "_")}_${cleanRoomId}`;
  const targetPeerId = partnerUserId
    ? `ohf_${partnerUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${cleanRoomId}`
    : null;

  // Helper: Send HTTP backup signal
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
          ringAudioIntervalRef.current = setInterval(playRing, 3000);
        }
      } catch {}
    }

    return () => {
      if (ringAudioIntervalRef.current) clearInterval(ringAudioIntervalRef.current);
      if (ctx && ctx.state !== "closed") {
        try {
          ctx.close();
        } catch {}
      }
    };
  }, [callState]);

  // Clean close of tracks, peer, and connection
  const handleCleanClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    if (callAttemptIntervalRef.current) clearInterval(callAttemptIntervalRef.current);
    if (httpSignalPollRef.current) clearInterval(httpSignalPollRef.current);
    if (ringAudioIntervalRef.current) clearInterval(ringAudioIntervalRef.current);

    if (activeMediaConnRef.current) {
      try {
        activeMediaConnRef.current.close();
      } catch {}
      activeMediaConnRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch {}
      peerRef.current = null;
    }
  }, []);

  // Hot-swap media stream with real camera/mic if permission was delayed
  const enableRealMedia = useCallback(async () => {
    try {
      setErrorMessage(null);
      setPermissionDenied(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        setIsVideoDisabled(false);
      }

      // If call is active, re-call with real stream
      if (peerRef.current && targetPeerId) {
        const call = peerRef.current.call(targetPeerId, stream);
        if (call) {
          activeMediaConnRef.current = call;
          call.on("stream", (remoteStream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(() => {});
            }
            setCallState("CONNECTED");
          });
        }
      }
    } catch (err: any) {
      console.error("Enable media retry error:", err);
      setPermissionDenied(true);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Camera/Microphone access was blocked. Click the lock 🔒 icon next to your website address bar to allow permissions.");
      } else {
        setErrorMessage("Could not open camera/mic: " + (err.message || "Unknown error"));
      }
    }
  }, [isVideoCall, targetPeerId]);

  // Main Call Initializer using PeerJS
  const startPeerCall = useCallback(async () => {
    try {
      setErrorMessage(null);
      setPermissionDenied(false);

      // 1. Get Camera/Microphone access
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } : false,
          audio: true,
        });
        setIsVideoDisabled(!isVideoCall);
      } catch (videoErr: any) {
        console.warn("Video getUserMedia failed, trying audio-only:", videoErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoDisabled(true);
        } catch (audioErr: any) {
          console.warn("Audio getUserMedia also failed, using synthetic fallback stream:", audioErr);
          stream = createSyntheticAudioStream();
          setPermissionDenied(true);
          setIsVideoDisabled(true);
          if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
            setErrorMessage("Browsers require an HTTPS secure connection (SSL) to enable camera and microphone.");
          } else {
            setErrorMessage("Camera/Microphone permission was denied. Click the lock 🔒 icon in your browser address bar to allow permissions.");
          }
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current && stream.getVideoTracks().length > 0) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Dynamically import PeerJS (Client-side only)
      const { Peer } = await import("peerjs");
      const peer = new Peer(myPeerId, PEER_CONFIG);
      peerRef.current = peer;

      peer.on("open", (id) => {
        console.log(`[PeerJS Ready] My Peer ID: ${id}`);

        if (isInitiator && targetPeerId) {
          setCallState("CALLING");

          // Send HTTP Ring signal for UI notification
          sendSignal("CALL_RING", {
            callerName: currentUserName,
            callerAvatar: currentUserAvatar,
            isVideo: isVideoCall,
          });

          // Attempt call
          const makeCall = () => {
            if (!peerRef.current || peerRef.current.destroyed || !localStreamRef.current) return;
            const call = peerRef.current.call(targetPeerId, localStreamRef.current);
            if (call) {
              activeMediaConnRef.current = call;

              call.on("stream", (remoteStream) => {
                console.log("[PeerJS Stream Received]");
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = remoteStream;
                  remoteVideoRef.current.play().catch(() => {});
                }
                setCallState("CONNECTED");
                if (callAttemptIntervalRef.current) clearInterval(callAttemptIntervalRef.current);
              });

              call.on("close", () => {
                console.log("[PeerJS Call Closed by Remote]");
                setCallState("ENDED");
                handleCleanClose();
                onClose();
              });

              call.on("error", (err) => {
                console.error("[PeerJS Call Error]:", err);
              });
            }
          };

          makeCall();
          // Retry calling target peer every 2 seconds until connected
          callAttemptIntervalRef.current = setInterval(makeCall, 2000);
        } else {
          setCallState("CONNECTING");
          sendSignal("CALL_ACCEPT", { acceptedBy: currentUserId });
        }
      });

      // 3. Listen for Incoming Calls (for receiver or caller)
      peer.on("call", (incomingCall) => {
        console.log("[PeerJS Incoming Call Received from]:", incomingCall.peer);
        activeMediaConnRef.current = incomingCall;

        // Answer with local stream
        incomingCall.answer(localStreamRef.current || createSyntheticAudioStream());

        incomingCall.on("stream", (remoteStream) => {
          console.log("[PeerJS Connected & Stream Attached]");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(() => {});
          }
          setCallState("CONNECTED");
          if (callAttemptIntervalRef.current) clearInterval(callAttemptIntervalRef.current);
        });

        incomingCall.on("close", () => {
          console.log("[PeerJS Call Ended]");
          setCallState("ENDED");
          handleCleanClose();
          onClose();
        });

        incomingCall.on("error", (err) => {
          console.error("[PeerJS Answer Error]:", err);
        });
      });

      peer.on("error", (err) => {
        console.error("[PeerJS Engine Error]:", err);
      });
    } catch (err: any) {
      console.error("[Start Peer Call Failed]:", err);
    }
  }, [
    myPeerId,
    targetPeerId,
    isInitiator,
    isVideoCall,
    currentUserName,
    currentUserAvatar,
    currentUserId,
    sendSignal,
    handleCleanClose,
    onClose,
  ]);

  // HTTP Signal Listener for Backup Hangup Sync
  useEffect(() => {
    startPeerCall();

    httpSignalPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/call/signal?roomId=${roomId}`);
        const data = await res.json();
        if (data.signals && data.signals.length > 0) {
          for (const s of data.signals) {
            if (s.type === "HANGUP" || s.type === "CALL_DECLINE") {
              setCallState("ENDED");
              handleCleanClose();
              onClose();
            }
          }
        }
      } catch {}
    }, 800);

    return () => {
      handleCleanClose();
    };
  }, [roomId, startPeerCall, handleCleanClose, onClose]);

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
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-3 md:p-6 select-none animate-fade-in">
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
              <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                {errorMessage || "Establishing direct peer-to-peer HD encrypted video connection..."}
              </p>

              {permissionDenied && (
                <div className="pt-3 max-w-sm mx-auto bg-[#181824] border border-amber-500/40 p-4 rounded-2xl space-y-2.5 text-left shadow-xl">
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>How to enable Camera & Microphone:</span>
                  </div>
                  <ol className="text-[11px] text-zinc-400 list-decimal list-inside space-y-1">
                    <li>Look at the address/URL bar at the top of your browser.</li>
                    <li>Click the <strong>Lock 🔒</strong> or <strong>Settings 🎚️</strong> icon next to the URL.</li>
                    <li>Turn <strong>Camera</strong> and <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                  </ol>
                  <button
                    onClick={enableRealMedia}
                    className="w-full bg-[#872bf5] hover:bg-[#7417e3] text-white text-xs font-black py-2.5 rounded-xl shadow-lg shadow-[#872bf5]/40 flex items-center justify-center gap-1.5 transition hover:scale-105 active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Request Camera & Mic Access</span>
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
              {permissionDenied && (
                <button
                  onClick={enableRealMedia}
                  className="text-[9px] text-purple-300 underline font-bold mt-1"
                >
                  Enable
                </button>
              )}
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
