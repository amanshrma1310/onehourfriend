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

  // Modals
  const [showToolbox, setShowToolbox] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState("UNWANTED_FLIRT");
  const [reportDesc, setReportDesc] = useState("");

  // Post-Session / End-of-Chat Completion Modal
  const [isCompleted, setIsCompleted] = useState(false);
  const [rating, setRating] = useState(5);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [myKeptDecision, setMyKeptDecision] = useState(false);
  const [partnerKeptDecision, setPartnerKeptDecision] = useState(false);
  const [mutualKeep, setMutualKeep] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          <span className="text-sm font-black">Entering 60-Minute Room...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#121218] flex flex-col items-center justify-center p-6 text-center text-white">
        <AlertTriangle className="w-12 h-12 text-[#872bf5] mb-4" />
        <h2 className="text-xl font-bold mb-2">Room Unavailable</h2>
        <p className="text-xs text-zinc-400 max-w-sm mb-6">{error}</p>
        <Link
          href="/dashboard"
          className="bg-[#872bf5] text-white px-6 py-2.5 rounded-full text-xs font-black"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="h-screen flex bg-[#121218] text-white overflow-hidden selection:bg-[#872bf5] selection:text-white">
      {/* MAIN CHAT STREAM (Exact Style from Screenshot) */}
      <section className="flex-1 flex flex-col h-full border-r border-white/10 bg-[#121218]">
        {/* Header from Screenshot: Partner Avatar, Name, ● Active, Call Icons */}
        <header className="border-b border-white/10 bg-[#181824] px-6 py-3.5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-3xl">{partner?.avatar || "👨‍💻"}</span>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-2 ring-[#181824]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{partner?.username || "Alex"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#872bf5]/25 text-purple-300">
                    {session?.partnerRole === "GUIDER" ? "🧭 Guider" : "👤 Seeker"}
                  </span>
                </div>
                <div className="text-[11px] text-[#00e676] font-semibold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                  <span>Active</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-400">{currentZone.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live 60-Minute Countdown Clock */}
            <div
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-mono font-black shadow-md ${
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

            <button
              onClick={() => setShowToolbox(true)}
              className="p-2 rounded-xl bg-[#872bf5]/20 hover:bg-[#872bf5]/30 border border-[#872bf5]/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition"
              title="Conversation Prompts"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">Prompts</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              title="Report"
              className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-400 transition"
            >
              <Flag className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowBlockModal(true)}
              title="Panic Exit & Block"
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl mx-auto w-full">
          <div className="text-center py-2">
            <span className="text-[11px] font-bold text-zinc-500 px-3 py-1 rounded-full bg-white/5">
              Today
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
                className={`flex items-end gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <span className="text-2xl shrink-0 pb-1">{partner?.avatar || "👨‍💻"}</span>
                )}

                <div
                  className={`max-w-md md:max-w-lg p-4 rounded-3xl text-xs leading-relaxed ${
                    isMe
                      ? "bg-[#872bf5] text-white font-medium rounded-br-none shadow-lg shadow-[#872bf5]/25"
                      : "bg-[#20202c] text-white rounded-bl-none border border-white/5 shadow-md"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-[13px] leading-snug">{msg.content}</div>
                  <div
                    className={`text-[9px] mt-1.5 flex items-center gap-1 justify-end ${
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <footer className="border-t border-white/10 bg-[#181824] p-4 max-w-4xl mx-auto w-full shrink-0">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2.5 bg-[#121218] border border-white/10 rounded-2xl p-1.5 pl-3">
            <button
              type="button"
              onClick={() => setShowToolbox(true)}
              className="p-2 rounded-xl text-purple-300 hover:text-white hover:bg-white/5 transition"
              title="Conversation Prompts"
            >
              <Plus className="w-5 h-5" />
            </button>

            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isCompleted}
              className="flex-1 bg-transparent text-xs md:text-sm text-white placeholder:text-zinc-500 outline-none"
            />

            <button
              type="submit"
              disabled={sending || !newMessage.trim() || isCompleted}
              className="bg-[#872bf5] hover:bg-[#7417e3] text-white font-black px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-[#872bf5]/30 flex items-center gap-1.5 disabled:opacity-40"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 fill-white" />
            </button>
          </form>
        </footer>
      </section>

      {/* RIGHT SIDEBAR (Profile, Keep Friendship) */}
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
              {session?.partnerRole === "GUIDER" ? "🧭 Guider" : "👤 Seeker"} • {currentZone.name}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
              title="Report"
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
              Room Rules
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
          <div className="text-[11px] text-zinc-400 text-center font-medium">
            Like this conversation? Choose to stay connected permanently.
          </div>

          <button
            onClick={() => submitDecision(true)}
            className={`w-full py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-2 ${
              myKeptDecision
                ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/40"
                : "bg-[#872bf5] hover:bg-[#7417e3] text-white shadow-xl shadow-[#872bf5]/30"
            }`}
          >
            <Heart className={`w-4 h-4 ${myKeptDecision ? "fill-white" : "fill-white"}`} />
            <span>{myKeptDecision ? "Connection Request Sent ❤️" : "Keep Connection"}</span>
          </button>
        </div>
      </aside>

      {/* ICEBREAKER TOOLBOX MODAL */}
      {showToolbox && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-300" />
                <h3 className="text-base font-black text-white">Break the Ice Prompts</h3>
              </div>
              <button
                onClick={() => setShowToolbox(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {icebreakers.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendIcebreaker(q)}
                  className="w-full p-3.5 rounded-2xl bg-[#121218] hover:bg-[#872bf5]/20 border border-white/5 hover:border-[#872bf5]/50 text-left transition text-xs text-zinc-200 font-medium"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
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

            <div>
              <label className="block text-zinc-300 font-bold text-xs mb-1.5">Reason</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[#872bf5]"
              >
                <option value="UNWANTED_FLIRT">Unwanted Flirting in Peaceful/Guidance Zone</option>
                <option value="HARASSMENT">Harassment or Abusive Speech</option>
                <option value="INAPPROPRIATE">Inappropriate Content</option>
                <option value="SPAM">Spam or Promotion</option>
                <option value="OTHER">Other Safety Violation</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-bold text-xs mb-1.5">Details</label>
              <textarea
                rows={3}
                placeholder="What happened..."
                value={reportDesc}
                onChange={(e) => setReportDesc(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-[#872bf5]"
              />
            </div>

            <button
              onClick={submitSafetyReport}
              className="w-full bg-[#872bf5] hover:bg-[#7417e3] text-white font-black py-3 rounded-xl text-xs transition"
            >
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* PANIC EXIT & BLOCK MODAL */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181824] border border-red-500/30 rounded-[32px] p-6 shadow-2xl text-center space-y-3">
            <Ban className="w-12 h-12 text-red-400 mx-auto" />
            <h3 className="text-lg font-black text-white">Instant Panic Exit & Block</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium">
              This immediately terminates the conversation and permanently blocks <strong>{partner?.username}</strong> from ever matching with you again.
            </p>

            <div className="pt-3 flex gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 border border-white/10 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={blockAndExit}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2.5 rounded-xl text-xs transition"
              >
                Block & Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-SESSION COMPLETION MODAL */}
      {isCompleted && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
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
    </main>
  );
}
