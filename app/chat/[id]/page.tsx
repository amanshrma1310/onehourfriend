"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { ICEBREAKER_CARDS, INTENT_ZONES } from "@/lib/data";
import {
  Clock,
  ShieldCheck,
  Send,
  Sparkles,
  Heart,
  Flag,
  Ban,
  ArrowLeft,
  AlertTriangle,
  Star,
  CheckCircle2,
  X,
  Plus,
  CheckCheck,
  Phone,
  Video,
  Smile,
  LogOut,
  ChevronDown,
  UserPlus,
} from "lucide-react";

import VideoCallModal from "@/components/VideoCallModal";
import { requestNotificationPermission, sendBrowserNotification } from "@/lib/notifications";

export default function ChatRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id: sessionId } = use(params);
  const router = useRouter();

  // State
  const [session, setSession] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(3600);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendRequestSent, setFriendRequestSent] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [incomingFriendRequest, setIncomingFriendRequest] = useState<any>(null);
  const [friendshipAccepted, setFriendshipAccepted] = useState(false);

  // Video / Audio Call State
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const lastSignalCheckRef = useRef<number>(Date.now() - 5000);
  const dismissedSignalIdsRef = useRef<Set<string>>(new Set());

  // Modals & UI States
  const [showToolbox, setShowToolbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [reportReason, setReportReason] = useState("UNWANTED_FLIRT");
  const [reportDesc, setReportDesc] = useState("");

  // Post-Session / End-of-Chat Completion Modal
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(5);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [myKeptDecision, setMyKeptDecision] = useState(false);
  const [partnerKeptDecision, setPartnerKeptDecision] = useState(false);
  const [mutualKeep, setMutualKeep] = useState(false);

  // Scrolling references
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  const POPULAR_EMOJIS = ["❤️", "😂", "🔥", "✨", "👏", "🥺", "👍", "☕", "🕊️", "🙌", "💯", "🌸"];

  useEffect(() => {
    loadSession();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [sessionId]);

  // Smart Scrolling handler
  function handleChatScroll() {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const isNear = distanceToBottom < 120;
    isNearBottomRef.current = isNear;
    setShowScrollBottomBtn(!isNear);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
      setShowScrollBottomBtn(false);
      isNearBottomRef.current = true;
    }
  }

  // Scroll to bottom on messages update ONLY if user is already near bottom
  useEffect(() => {
    if (messages.length > 0) {
      if (!initialScrollDoneRef.current) {
        scrollToBottom("auto");
        initialScrollDoneRef.current = true;
      } else if (isNearBottomRef.current) {
        scrollToBottom("smooth");
      }
    }
  }, [messages]);

  async function loadSession() {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      const data = await res.json();

      if (!res.ok || !data.session) {
        throw new Error(data.error || "Failed to load session");
      }

      setSession(data.session);
      setPartner(data.partner);
      setCurrentUser(data.currentUser);
      setMessages(data.messages || []);
      setRemainingSeconds(data.session.remainingSeconds);

      if (data.session.status === "COMPLETED" || data.session.status === "EXPIRED") {
        setIsCompleted(true);
      }

      countdownTimerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current);
            triggerCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      pollTimerRef.current = setInterval(pollUpdates, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to load chat room");
    } finally {
      setLoading(false);
    }
  }

  async function pollUpdates() {
    try {
      const lastMsg = messages[messages.length - 1];
      const after = lastMsg?.createdAt || "";
      const res = await fetch(`/api/session/${sessionId}/poll?after=${encodeURIComponent(after)}`);
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          const fresh = data.messages.filter((m: any) => !ids.has(m.id));
          if (fresh.length > 0) {
            const partnerMsg = fresh.find((m: any) => m.userId !== currentUser?.id);
            if (partnerMsg && document.hidden) {
              sendBrowserNotification(`New message from ${partner?.username || "Friend"}`, {
                body: partnerMsg.content,
              });
            }
          }
          return [...prev, ...fresh];
        });
      }

      if (data.status === "COMPLETED" || data.status === "EXPIRED" || data.status === "CANCELLED") {
        if (!isCompleted) {
          triggerCompletion();
        }
      }

      if (data.myKeptDecision !== undefined) setMyKeptDecision(data.myKeptDecision);
      if (data.partnerKeptDecision !== undefined) setPartnerKeptDecision(data.partnerKeptDecision);
      if (data.mutualKeep !== undefined) setMutualKeep(data.mutualKeep);

      // Check for incoming call signals
      if (!activeCall) {
        const sigRes = await fetch(`/api/call/signal?roomId=session_${sessionId}`);
        const sigData = await sigRes.json();
        if (sigData.signals && sigData.signals.length > 0) {
          for (const s of sigData.signals) {
            if (dismissedSignalIdsRef.current.has(s.id)) continue;
            if (s.type === "CALL_RING") {
              setIncomingCall({
                signalId: s.id,
                roomId: `session_${sessionId}`,
                partnerUserId: partner?.id,
                partnerName: partner?.username || "Partner",
                partnerAvatar: partner?.avatar || "🌙",
                isVideo: s.payload?.isVideo !== false,
              });
              if (document.hidden) {
                sendBrowserNotification(`Incoming ${s.payload?.isVideo !== false ? "Video" : "Voice"} Call`, {
                  body: `${partner?.username || "Friend"} is calling you!`,
                });
              }
            } else if (s.type === "HANGUP" || s.type === "CALL_DECLINE") {
              setIncomingCall(null);
            }
          }
        } else {
          setIncomingCall(null);
        }
      }
      // Check for incoming friend request from partner
      if (partner?.id && !friendshipAccepted) {
        try {
          const reqRes = await fetch("/api/friends/request");
          const reqData = await reqRes.json();
          if (reqData.requests) {
            const incoming = reqData.requests.find((r: any) => r.senderId === partner.id);
            if (incoming) {
              setIncomingFriendRequest(incoming);
            }
          }
        } catch {}
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function startVideoCall(isVideo = true) {
    if (!currentUser || !partner) return;
    requestNotificationPermission();

    let initialStream: MediaStream | null = null;
    try {
      initialStream = await navigator.mediaDevices.getUserMedia({
        video: isVideo ? { facingMode: "user" } : false,
        audio: true,
      });
    } catch {
      try {
        initialStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
      } catch {
        try {
          initialStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {}
      }
    }

    setActiveCall({
      roomId: `session_${sessionId}`,
      currentUserId: currentUser.id,
      currentUserName: currentUser.username,
      currentUserAvatar: currentUser.avatar,
      partnerUserId: partner.id,
      partnerName: partner.username || "Partner",
      partnerAvatar: partner.avatar || "🌙",
      isVideoCall: isVideo,
      isInitiator: true,
      initialStream,
    });
  }

  async function acceptIncomingCall() {
    if (!incomingCall || !currentUser || !partner) return;

    let initialStream: MediaStream | null = null;
    try {
      initialStream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.isVideo ? { facingMode: "user" } : false,
        audio: true,
      });
    } catch {
      try {
        initialStream = await navigator.mediaDevices.getUserMedia({ video: incomingCall.isVideo, audio: true });
      } catch {
        try {
          initialStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {}
      }
    }

    setActiveCall({
      roomId: incomingCall.roomId,
      currentUserId: currentUser.id,
      currentUserName: currentUser.username,
      currentUserAvatar: currentUser.avatar,
      partnerUserId: partner.id,
      partnerName: partner.username || "Partner",
      partnerAvatar: partner.avatar || "🌙",
      isVideoCall: incomingCall.isVideo,
      isInitiator: false,
      initialStream,
    });
    setIncomingCall(null);
  }

  async function handleSendFriendRequest() {
    if (!partner?.id) return;
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: partner.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendRequestSent(true);
        alert(data.message || "🤝 Friend request sent successfully!");
      } else {
        alert(data.error || "Could not send friend request");
      }
    } catch {
      alert("Failed to send friend request.");
    }
  }

  async function handleAcceptInChatFriendRequest(reqId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId, action: "ACCEPT" }),
      });
      const data = await res.json();
      if (res.ok) {
        setFriendshipAccepted(true);
        setIncomingFriendRequest(null);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    } catch {}
  }

  async function handleDeclineInChatFriendRequest(reqId: string) {
    try {
      await fetch("/api/friends/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: reqId, action: "DECLINE" }),
      });
      setIncomingFriendRequest(null);
    } catch {}
  }

  async function declineIncomingCall() {
    if (incomingCall) {
      if (incomingCall.signalId) {
        dismissedSignalIdsRef.current.add(incomingCall.signalId);
      }
      try {
        await fetch("/api/call/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId: incomingCall.roomId, targetUserId: partner?.id, type: "CALL_DECLINE" }),
        });
      } catch {}
    }
    setIncomingCall(null);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, type: "TEXT" }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send message");
      } else if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  function handleAddEmoji(emoji: string) {
    setNewMessage((prev) => prev + emoji);
  }

  async function handleSendQuickReaction(emoji: string) {
    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: emoji, type: "TEXT" }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function sendIcebreaker(questionText: string) {
    setShowToolbox(false);
    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🎴 Topic: "${questionText}"`,
          type: "ICEBREAKER",
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function triggerCompletion() {
    setIsCompleted(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  }

  async function handleInstantExit() {
    try {
      await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    } catch {}
    router.push("/dashboard");
  }

  async function submitDecision(keep: boolean) {
    setMyKeptDecision(keep);
    try {
      const res = await fetch(`/api/session/${sessionId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepConnection: keep,
          rating,
          badges: selectedBadges,
        }),
      });

      const data = await res.json();
      if (data.mutualKeep) {
        setMutualKeep(true);
        confetti({
          particleCount: 120,
          spread: 100,
          origin: { y: 0.5 },
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function submitSafetyReport() {
    if (!partner?.id) return;
    try {
      await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: partner.id,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      alert("Report submitted.");
      setShowReportModal(false);
    } catch (e) {
      console.error(e);
    }
  }

  async function blockAndExit() {
    if (!partner?.id) return;
    try {
      await fetch("/api/safety/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedUserId: partner.id,
          sessionId,
        }),
      });
      alert("User blocked. Exited safely.");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    }
  }

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const timerStr = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const currentZone = INTENT_ZONES.find((z) => z.id === session?.intent) || INTENT_ZONES[0];
  const icebreakers = ICEBREAKER_CARDS[session?.intent] || ICEBREAKER_CARDS.PEACE;

  const BADGE_OPTIONS = [
    "🌟 Great Listener",
    "💡 Actionable Advice",
    "❤️ Highly Empathetic",
    "🛡️ Respectful & Safe",
    "☕ Wholesome Vibes",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#872bf5] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-white animate-ping" />
          <span className="text-sm font-black">Joining 60-Minute Room...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121218] flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-[#181824] border border-white/10 p-8 rounded-3xl space-y-4">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
          <h2 className="text-xl font-bold">Room Unavailable</h2>
          <p className="text-xs text-zinc-400">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#872bf5] hover:bg-[#7417e3] text-white font-bold px-6 py-2.5 rounded-xl text-xs"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="h-[100dvh] max-h-[100dvh] flex bg-[#121218] text-white overflow-hidden selection:bg-[#872bf5] selection:text-white">
      {/* MAIN CHAT STREAM */}
      <section className="flex-1 flex flex-col h-full border-r border-white/10 bg-[#121218] min-w-0">
        {/* Header Strip */}
        <header className="border-b border-white/10 bg-[#181824] px-3 md:px-6 py-2.5 md:py-3 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="relative shrink-0">
                <span className="text-2xl md:text-3xl">{partner?.avatar || "👨‍💻"}</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-2 ring-[#181824]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs md:text-sm font-black text-white truncate">{partner?.username || "Friend"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#872bf5]/25 text-purple-200 shrink-0 hidden sm:inline-block">
                    {currentZone.emoji} {currentZone.name}
                  </span>
                </div>
                <div className="text-[10px] md:text-[11px] text-[#00e676] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                  <span>Active Now</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
            {/* Live 60-Minute Countdown Clock */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-[11px] md:text-xs font-mono font-black shadow-md ${
                remainingSeconds < 300
                  ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                  : remainingSeconds < 600
                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                  : "bg-[#1f2237] border-[#872bf5]/40 text-purple-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-[#872bf5]" />
              <span>{timerStr}</span>
            </div>

            {/* Add Friend Request Button */}
            <button
              onClick={handleSendFriendRequest}
              disabled={friendRequestSent || friendshipAccepted}
              className={`p-2 md:px-3 md:py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                friendRequestSent || friendshipAccepted
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/5 hover:bg-[#872bf5]/20 text-purple-200 border border-white/10 hover:border-[#872bf5]/40 hover:scale-105 active:scale-95"
              }`}
              title="Send Friend Request"
            >
              <UserPlus className="w-4 h-4 text-[#00e676]" />
              <span className="hidden sm:inline">
                {friendshipAccepted ? "Friends" : friendRequestSent ? "Request Sent" : "Add Friend"}
              </span>
            </button>

            {/* Video Call Button (Prominent) */}
            <button
              onClick={() => startVideoCall(true)}
              className="p-2 md:px-3.5 md:py-2 rounded-xl bg-[#872bf5] hover:bg-[#7417e3] text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-[#872bf5]/40 hover:scale-105 active:scale-95"
              title="Start Live 1-on-1 Video Call"
            >
              <Video className="w-4 h-4 fill-white" />
              <span className="hidden md:inline">Video Call</span>
            </button>

            {/* Voice Call Button */}
            <button
              onClick={() => startVideoCall(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-bold transition"
              title="Start Voice Call"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Exit / Skip Room Button */}
            <button
              onClick={() => setShowExitConfirmModal(true)}
              className="p-2 px-2.5 md:px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold flex items-center gap-1 transition hover:scale-105 active:scale-95"
              title="Leave Conversation"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit</span>
            </button>
          </div>
        </header>

        {/* In-Chat Incoming Friend Request Banner */}
        {incomingFriendRequest && (
          <div className="bg-[#872bf5] text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg z-20 animate-fade-in text-xs">
            <div className="flex items-center gap-2 font-bold min-w-0 truncate">
              <UserPlus className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{partner?.username || "Your partner"} sent you a friend request!</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAcceptInChatFriendRequest(incomingFriendRequest.id)}
                className="bg-white text-[#872bf5] hover:bg-zinc-100 font-black px-3 py-1.5 rounded-xl shadow transition text-xs hover:scale-105 active:scale-95"
              >
                Accept 🤝
              </button>
              <button
                onClick={() => handleDeclineInChatFriendRequest(incomingFriendRequest.id)}
                className="bg-black/30 hover:bg-black/50 text-white font-semibold px-2.5 py-1.5 rounded-xl transition text-xs"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {friendshipAccepted && (
          <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-md z-20 text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>You are now permanent friends! Direct messages unlocked in Dashboard.</span>
          </div>
        )}

        {/* Scrollable Message Viewport with Smart Scroll Detection */}
        <div
          ref={chatContainerRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto p-3 md:p-6 space-y-3.5 max-w-4xl mx-auto w-full relative min-h-0"
        >
          <div className="text-center py-1">
            <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 px-3 py-1 rounded-full bg-white/5">
              60-Minute Encrypted Session
            </span>
          </div>

          {messages.map((msg) => {
            const isMe = msg.userId === currentUser?.id;
            const isSystem = msg.type === "SYSTEM";
            const isIcebreaker = msg.type === "ICEBREAKER";

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-1">
                  <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/5 text-zinc-400 text-xs leading-relaxed max-w-md">
                    {msg.content}
                  </div>
                </div>
              );
            }

            if (isIcebreaker) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <div className="inline-block p-4 rounded-3xl bg-[#181824] border border-[#872bf5]/40 text-purple-200 text-xs leading-relaxed max-w-lg text-left shadow-lg">
                    <div className="font-extrabold text-white flex items-center gap-1.5 mb-1 text-xs">
                      <Sparkles className="w-3.5 h-3.5 text-[#872bf5]" />
                      <span>Icebreaker Question</span>
                    </div>
                    <div className="text-white font-medium whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <span className="text-2xl shrink-0 pb-1">{partner?.avatar || "👨‍💻"}</span>
                )}

                <div
                  className={`max-w-[85%] md:max-w-lg p-3 md:p-4 rounded-3xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-[#872bf5] text-white font-medium rounded-br-none shadow-lg shadow-[#872bf5]/25"
                      : "bg-[#20202c] text-white rounded-bl-none border border-white/5 shadow-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[13px] leading-snug">{msg.content}</div>
                  <div
                    className={`text-[9px] mt-1 flex items-center gap-1 justify-end ${
                      isMe ? "text-purple-200" : "text-zinc-400"
                    }`}
                  >
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && <CheckCheck className="w-3 h-3 text-purple-200" />}
                  </div>
                </div>

                {isMe && (
                  <span className="text-2xl shrink-0 pb-1">{currentUser?.avatar || "✨"}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Floating Jump to Latest Button (Appears when scrolled up) */}
        {showScrollBottomBtn && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className="fixed bottom-24 right-6 z-30 bg-[#872bf5] hover:bg-[#7417e3] text-white text-xs font-bold py-2 px-4 rounded-full shadow-2xl flex items-center gap-1.5 transition hover:scale-105 active:scale-95 animate-bounce"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Latest Messages</span>
          </button>
        )}

        {/* Footer with Message Input Always Visible on Mobile */}
        <footer className="border-t border-white/10 bg-[#181824] p-2 md:p-3 w-full shrink-0 relative z-20">
          {/* Emoji Popover */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 right-0 p-2.5 bg-[#181824] border-t border-white/10 flex items-center gap-1.5 overflow-x-auto shadow-2xl z-30 animate-fade-in scrollbar-none">
              <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0 mr-1">Emojis:</span>
              {POPULAR_EMOJIS.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddEmoji(emoji)}
                  className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-[#872bf5]/40 hover:scale-125 transition flex items-center justify-center text-sm shrink-0 active:scale-95"
                  title={`Add ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5 bg-[#121218] border border-white/10 rounded-2xl p-1.5 pl-2 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setShowToolbox(true)}
              className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/5 transition shrink-0"
              title="Prompts"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-xl transition shrink-0 ${
                showEmojiPicker ? "bg-[#872bf5] text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
              title="Emojis"
            >
              <Smile className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isCompleted}
              className="flex-1 min-w-0 bg-transparent text-xs md:text-sm text-white placeholder:text-zinc-500 outline-none"
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim() || isCompleted}
              className="bg-[#872bf5] hover:bg-[#7417e3] text-white font-black px-4 md:px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-[#872bf5]/30 flex items-center gap-1.5 disabled:opacity-40 shrink-0 hover:scale-105 active:scale-95"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 fill-white" />
            </button>
          </form>
        </footer>
      </section>

      {/* RIGHT SIDEBAR (Profile, Safety & Exit Options) */}
      <aside className="hidden lg:flex flex-col w-80 bg-[#181824] border-l border-white/10 p-6 space-y-6 overflow-y-auto shrink-0">
        <div className="text-center space-y-3 pt-2">
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-[#121218] border-2 border-[#872bf5] flex items-center justify-center text-4xl shadow-xl shadow-[#872bf5]/20 mx-auto">
              {partner?.avatar || "👨‍💻"}
            </div>
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#00e676] ring-3 ring-[#181824]" />
          </div>

          <div>
            <h3 className="text-base font-black text-white">{partner?.username}</h3>
            <div className="text-xs text-purple-300 font-medium">
              {currentZone.emoji} {currentZone.name}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => startVideoCall(true)}
              className="p-2.5 rounded-xl bg-[#872bf5] hover:bg-[#7417e3] text-white transition shadow-md shadow-[#872bf5]/30"
              title="Start Video Call"
            >
              <Video className="w-4 h-4 fill-white" />
            </button>
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
              title="Report User"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBlockModal(true)}
              className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
              title="Panic Block"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-4 pt-2 border-t border-white/10 text-xs">
          <div>
            <div className="text-[10px] uppercase font-black tracking-wider text-zinc-400 mb-1.5">
              Room Category
            </div>
            <div className="p-3.5 rounded-2xl bg-[#121218] border border-white/5 text-[11px] text-zinc-300 leading-relaxed font-medium">
              🛡️ <strong>{currentZone.badge}</strong>: Respect boundaries, maintain anonymity, and keep the space supportive.
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-black tracking-wider text-zinc-400 mb-1.5">
              Topic & Mood
            </div>
            <div className="p-3.5 rounded-2xl bg-[#121218] border border-white/5 text-[11px] text-purple-300 font-bold">
              ✨ {session?.mood || "General Support"}
            </div>
          </div>
        </div>

        <div className="pt-auto mt-auto border-t border-white/10 pt-4 space-y-3">
          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="w-full py-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs flex items-center justify-center gap-2 transition hover:scale-105 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Conversation & Skip</span>
          </button>
        </div>
      </aside>

      {/* CONVERSATION PROMPTS MODAL */}
      {showToolbox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#872bf5]" />
                <h3 className="text-sm font-bold text-white">Conversation Starters</h3>
              </div>
              <button
                onClick={() => setShowToolbox(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {icebreakers.map((questionText, idx) => (
                <button
                  key={idx}
                  onClick={() => sendIcebreaker(questionText)}
                  className="w-full p-3.5 rounded-2xl bg-[#121218] hover:bg-[#872bf5]/20 border border-white/5 hover:border-[#872bf5]/40 text-left transition group"
                >
                  <div className="text-xs font-bold text-white group-hover:text-purple-300">
                    Prompt #{idx + 1}
                  </div>
                  <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">{questionText}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#181824] border border-white/15 rounded-[32px] p-6 text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center text-2xl mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Leave This Room?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                You can return to the dashboard and match with someone new right away.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirmModal(false)}
                className="flex-1 bg-white/10 hover:bg-white/15 py-3 rounded-2xl text-xs font-bold text-white transition"
              >
                Stay
              </button>
              <button
                onClick={handleInstantExit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl text-xs transition shadow-lg shadow-red-600/30"
              >
                Yes, Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Report User for Safety</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
              >
                <option value="UNWANTED_FLIRT">Unwanted Flirting / Boundary Violation</option>
                <option value="HARASSMENT">Harassment or Hate Speech</option>
                <option value="SPAM">Spam or Self-Promotion</option>
                <option value="HARMFUL_BEHAVIOR">Harmful Behavior</option>
              </select>

              <textarea
                rows={3}
                placeholder="Optional details..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
              />

              <button
                onClick={submitSafetyReport}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-3 rounded-2xl text-xs transition"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANIC BLOCK MODAL */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#181824] border border-red-500/40 rounded-[32px] p-6 text-center space-y-4 shadow-2xl">
            <Ban className="w-12 h-12 text-red-400 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">Panic Block & Exit?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                You will never be matched with <strong>{partner?.username}</strong> again.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 bg-white/10 text-white font-bold py-2.5 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={blockAndExit}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Block & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION COMPLETION MODAL */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#181824] border border-white/15 rounded-[32px] p-8 shadow-2xl text-center space-y-6">
            <div className="text-4xl">🎉</div>
            <div>
              <h2 className="text-2xl font-black text-white">60 Minutes Completed!</h2>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Your conversation with <strong>{partner?.username}</strong> has concluded.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#121218] border border-white/5 space-y-3">
              <div className="text-xs font-bold text-zinc-300">
                Rate your partner's empathy & respectfulness:
              </div>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition hover:scale-125"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating >= star ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {BADGE_OPTIONS.map((badge) => {
                  const active = selectedBadges.includes(badge);
                  return (
                    <button
                      key={badge}
                      type="button"
                      onClick={() => {
                        setSelectedBadges((prev) =>
                          active ? prev.filter((b) => b !== badge) : [...prev, badge]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                        active
                          ? "bg-[#872bf5] text-white border-[#872bf5]"
                          : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {badge}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {mutualKeep ? (
                <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>You both chose to stay connected! Added to your Kept Friends.</span>
                </div>
              ) : myKeptDecision ? (
                <div className="p-4 rounded-2xl bg-[#872bf5]/20 border border-[#872bf5]/30 text-purple-200 text-xs font-semibold">
                  ⏳ You chose to Keep Connection. Waiting for partner's choice...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => submitDecision(true)}
                    className="p-3.5 rounded-2xl bg-[#872bf5] hover:bg-[#7417e3] text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-lg shadow-[#872bf5]/30"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Keep Friendship</span>
                  </button>

                  <button
                    onClick={() => submitDecision(false)}
                    className="p-3.5 rounded-2xl bg-[#121218] hover:bg-white/10 border border-white/10 text-zinc-400 font-bold text-xs transition"
                  >
                    👋 Say Goodbye
                  </button>
                </div>
              )}
            </div>

            <Link
              href="/dashboard"
              className="w-full block bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-2xl text-xs transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* INCOMING CALL MODAL POPUP */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#181824] border-2 border-[#872bf5] rounded-[32px] p-6 text-center space-y-5 shadow-2xl shadow-[#872bf5]/40">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-[#872bf5] animate-ping" />
              <div className="w-16 h-16 rounded-full bg-[#872bf5] flex items-center justify-center text-3xl shadow-lg z-10">
                {incomingCall.partnerAvatar}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Incoming {incomingCall.isVideo ? "Video" : "Voice"} Call</h3>
              <p className="text-xs text-purple-300 mt-1 font-medium">{incomingCall.partnerName} is calling you...</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={declineIncomingCall}
                className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 font-bold py-3 rounded-2xl text-xs transition"
              >
                Decline
              </button>

              <button
                onClick={acceptIncomingCall}
                className="flex-1 bg-[#00e676] hover:bg-[#00c853] text-black font-black py-3 rounded-2xl text-xs transition shadow-lg shadow-[#00e676]/40 hover:scale-105 active:scale-95"
              >
                Accept Call 📞
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE FULL WEBRTC VIDEO/AUDIO CALL MODAL */}
      {activeCall && (
        <VideoCallModal
          roomId={activeCall.roomId}
          currentUserId={activeCall.currentUserId}
          currentUserName={activeCall.currentUserName}
          currentUserAvatar={activeCall.currentUserAvatar}
          partnerUserId={activeCall.partnerUserId}
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          isVideoCall={activeCall.isVideoCall}
          isInitiator={activeCall.isInitiator}
          initialStream={activeCall.initialStream}
          onClose={() => setActiveCall(null)}
        />
      )}
    </main>
  );
}
