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
} from "lucide-react";

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
  const [error, setError] = useState("");

  // Drawer / Modals
  const [showToolbox, setShowToolbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState("UNWANTED_FLIRT");
  const [reportDesc, setReportDesc] = useState("");

  // Post-Session / End-of-Chat Completion Modal
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(5);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [myKeptDecision, setMyKeptDecision] = useState(false);
  const [partnerKeptDecision, setPartnerKeptDecision] = useState(false);
  const [mutualKeep, setMutualKeep] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Load Session Data
  useEffect(() => {
    loadSession();

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [sessionId]);

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

      // Start Countdown
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

      // Start Message Polling
      pollTimerRef.current = setInterval(pollUpdates, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to load chat");
    } finally {
      setLoading(false);
    }
  }

  // Poll for new messages and status
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
    } catch (e) {
      console.error(e);
    }
  }

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim(), type: "TEXT" }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to send message");
      } else if (data.message) {
        setMessages((prev) => [...prev, data.message]);
        setNewMessage("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  // Send Icebreaker Prompt into Chat
  async function sendIcebreaker(questionText: string) {
    setShowToolbox(false);
    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🎴 Icebreaker Question:\n"${questionText}"`,
          type: "ICEBREAKER",
        }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Trigger Completion Modal & Confetti
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

  // Submit Post-Chat Rating & Keep Decision
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
          comment: feedbackComment,
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

  // End Session Early
  async function endSessionEarly() {
    if (!confirm("Are you sure you want to end this 60-minute session early?")) return;
    await fetch(`/api/session/${sessionId}/end`, { method: "POST" });
    triggerCompletion();
  }

  // Submit Safety Report
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
      alert("Report submitted. Our moderation team has been alerted.");
      setShowReportModal(false);
    } catch (e) {
      console.error(e);
    }
  }

  // Block & Exit
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
      alert("User blocked. You have safely exited the session.");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
    }
  }

  // Format MM:SS
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
      <div className="min-h-screen bg-[#070709] flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-400 animate-ping"></div>
          <span className="text-sm font-medium">Entering 60-Minute Safe Space...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Conversation Unavailable</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">{error}</p>
        <Link
          href="/dashboard"
          className="bg-amber-400 text-black px-6 py-2.5 rounded-full text-xs font-bold hover:bg-amber-300"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="h-screen flex flex-col bg-[#070709] text-white overflow-hidden">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-zinc-950/90 px-6 py-3.5 flex items-center justify-between z-20">
        {/* Partner Info */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{partner?.avatar || "🌙"}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{partner?.username || "Anonymous Partner"}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-amber-300">
                  {session?.partnerRole === "GUIDER" ? "🧭 Guider" : "👤 Seeker"}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                <span>{currentZone.emoji} {currentZone.name}</span>
                <span>•</span>
                <span className="text-zinc-500">{session?.topic || "Topic"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Countdown Timer */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono font-bold shadow-lg ${
              remainingSeconds < 300
                ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                : remainingSeconds < 600
                ? "bg-amber-500/20 border-amber-500 text-amber-300"
                : "bg-zinc-900 border-white/10 text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timerStr}</span>
          </div>

          {/* Safety & Action Buttons */}
          <button
            onClick={() => setShowToolbox(true)}
            title="AI Icebreaker Prompts"
            className="p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden md:inline">Icebreakers</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            title="Report User"
            className="p-2 rounded-xl bg-white/[0.03] hover:bg-amber-500/10 text-zinc-400 hover:text-amber-400 transition"
          >
            <Flag className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowBlockModal(true)}
            title="Instant Block & Panic Exit"
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition"
          >
            <Ban className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Protected Intent Assurance Banner */}
      <div className="bg-zinc-950/60 border-b border-white/5 py-1.5 px-6 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
        <span>This room is protected under the <strong>{currentZone.name}</strong> zone. Be respectful and supportive.</span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser?.id;
          const isSystem = msg.type === "SYSTEM";
          const isIcebreaker = msg.type === "ICEBREAKER";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center py-2">
                <div className="inline-block px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 text-zinc-400 text-xs leading-relaxed max-w-md">
                  {msg.content}
                </div>
              </div>
            );
          }

          if (isIcebreaker) {
            return (
              <div key={msg.id} className="text-center py-2">
                <div className="inline-block p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-zinc-900 border border-purple-500/30 text-purple-200 text-xs leading-relaxed max-w-lg text-left shadow-lg">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Conversation Prompt</span>
                  </div>
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
            >
              {!isMe && <span className="text-xl shrink-0">{partner?.avatar || "🌙"}</span>}

              <div
                className={`max-w-md md:max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? "bg-amber-400 text-black font-medium rounded-br-none shadow-md shadow-amber-400/10"
                    : "bg-zinc-900 text-zinc-100 border border-white/10 rounded-bl-none shadow-md"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[9px] mt-1.5 text-right ${
                    isMe ? "text-amber-900" : "text-zinc-500"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {isMe && <span className="text-xl shrink-0">{currentUser?.avatar || "✨"}</span>}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <footer className="border-t border-white/10 bg-zinc-950/90 p-4 max-w-4xl mx-auto w-full">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowToolbox(true)}
            className="p-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-purple-300 transition"
            title="Open Icebreaker Prompts"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={isCompleted}
            className="flex-1 bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400 transition"
          />

          <button
            type="submit"
            disabled={sending || !newMessage.trim() || isCompleted}
            className="bg-amber-400 text-black font-bold p-3 rounded-2xl text-xs hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* ICEBREAKER TOOLBOX DRAWER */}
      {showToolbox && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Break the Ice Prompts</h3>
              </div>
              <button
                onClick={() => setShowToolbox(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Click any question below to automatically drop it into the conversation:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {icebreakers.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendIcebreaker(q)}
                  className="w-full p-3 rounded-xl bg-white/[0.03] hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 text-left transition text-xs text-zinc-200"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SAFETY REPORT MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Flag className="w-5 h-5" />
                <span>Report User</span>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Reason for Report</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                >
                  <option value="UNWANTED_FLIRT">Unwanted Flirting in Peaceful / Guidance Zone</option>
                  <option value="HARASSMENT">Harassment or Abusive Speech</option>
                  <option value="INAPPROPRIATE">Inappropriate Content / Photos</option>
                  <option value="SPAM">Spam or Promotion</option>
                  <option value="OTHER">Other Safety Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1.5">Additional Details</label>
                <textarea
                  rows={3}
                  placeholder="Describe what happened..."
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
              </div>

              <button
                onClick={submitSafetyReport}
                className="w-full bg-amber-400 text-black font-bold py-3 rounded-xl text-xs hover:bg-amber-300 transition"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANIC EXIT & BLOCK MODAL */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center">
            <Ban className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Instant Panic Exit & Block</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              This will immediately terminate this conversation, block <strong>{partner?.username}</strong> from ever matching with you again, and return you safely to your dashboard.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 border border-white/10 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={blockAndExit}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-lg shadow-red-500/20"
              >
                Block & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION COMPLETION & RATING MODAL */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-2xl font-extrabold text-white">60 Minutes Completed!</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Your 1-hour conversation with <strong>{partner?.username}</strong> has concluded.
            </p>

            {/* Rate Experience */}
            <div className="my-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-xs font-bold text-zinc-300 mb-2">
                Rate your partner's empathy & helpfulness:
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition hover:scale-125"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        rating >= star ? "text-amber-400 fill-amber-400" : "text-zinc-600"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Badges */}
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
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition ${
                        active
                          ? "bg-amber-400 text-black border-amber-400"
                          : "bg-black/30 border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {badge}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Keep Connection Section */}
            <div className="mb-6">
              <div className="text-xs font-bold text-white mb-2">
                Would you like to stay connected as permanent friends?
              </div>

              {mutualKeep ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>You both chose to stay connected! Added to your Kept Friends list.</span>
                </div>
              ) : myKeptDecision ? (
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-medium">
                  ⏳ You chose to Keep Connection. Waiting for your partner's choice...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => submitDecision(true)}
                    className="p-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Heart className="w-4 h-4 fill-pink-500" />
                    <span>Keep Friendship</span>
                  </button>

                  <button
                    onClick={() => submitDecision(false)}
                    className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-zinc-400 font-semibold text-xs transition"
                  >
                    👋 Politely Say Goodbye
                  </button>
                </div>
              )}
            </div>

            {/* Back to Dashboard */}
            <Link
              href="/dashboard"
              className="w-full block bg-amber-400 text-black font-bold py-3 rounded-xl text-xs hover:bg-amber-300 transition"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
