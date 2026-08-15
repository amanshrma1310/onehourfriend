"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  INTENT_ZONES,
  SOCIAL_GROUPS,
  MOODS,
  AVATARS,
  DAILY_QUESTIONS,
} from "@/lib/data";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  Heart,
  MessageSquare,
  Users,
  Compass,
  User,
  LogOut,
  Send,
  ArrowRight,
  Flame,
  CheckCircle2,
  X,
  Search,
  Dices,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"match" | "community" | "friends" | "profile">("match");

  // Matching configuration state
  const [activeRole, setActiveRole] = useState<string>("PROBLEM_FACER");
  const [selectedIntent, setSelectedIntent] = useState<string>("PEACE");
  const [selectedSocialGroup, setSelectedSocialGroup] = useState<string>("OPEN");
  const [selectedMood, setSelectedMood] = useState<string>("Stressed & Overwhelmed");
  const [problemSummary, setProblemSummary] = useState<string>("");

  // Radar Matchmaker Modal State
  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(0);
  const searchTimerRef = useRef<any>(null);

  // Active Session (if any)
  const [activeSession, setActiveSession] = useState<any>(null);

  // Community state
  const [ventPosts, setVentPosts] = useState<any[]>([]);
  const [newVentContent, setNewVentContent] = useState("");
  const [dailyQuestion, setDailyQuestion] = useState<any>(null);
  const [dailyAnswer, setDailyAnswer] = useState("");

  // Friends & DM state
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendMessages, setFriendMessages] = useState<any[]>([]);
  const [newFriendMsg, setNewFriendMsg] = useState("");

  // Load User Data & Active Session
  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();

      if (!data.authenticated || !data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);
      setActiveRole(data.user.activeRole || "PROBLEM_FACER");
      setSelectedIntent(data.user.preferredIntent || "PEACE");
      setSelectedSocialGroup(data.user.preferredSocialGroup || "OPEN");
      setSelectedMood(data.user.mood || "Stressed & Overwhelmed");
      setActiveSession(data.activeSession || null);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  // Load Community Data when tab is selected
  useEffect(() => {
    if (activeTab === "community") {
      loadCommunityData();
    } else if (activeTab === "friends") {
      loadFriendsData();
    }
  }, [activeTab]);

  async function loadCommunityData() {
    try {
      const [ventRes, qRes] = await Promise.all([
        fetch("/api/community/vent"),
        fetch("/api/community/daily-question"),
      ]);
      const ventData = await ventRes.json();
      const qData = await qRes.json();

      if (ventData.posts) setVentPosts(ventData.posts);
      if (qData.question) setDailyQuestion(qData.question);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadFriendsData() {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.friends) setFriends(data.friends);
    } catch (e) {
      console.error(e);
    }
  }

  // Open Friend Direct Chat
  async function openFriendChat(friendItem: any) {
    setSelectedFriend(friendItem);
    try {
      const res = await fetch(`/api/friends/${friendItem.friendshipId}/messages`);
      const data = await res.json();
      if (data.messages) setFriendMessages(data.messages);
    } catch (e) {
      console.error(e);
    }
  }

  async function sendFriendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newFriendMsg.trim() || !selectedFriend) return;

    try {
      const res = await fetch(`/api/friends/${selectedFriend.friendshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newFriendMsg.trim() }),
      });
      const data = await res.json();
      if (data.message) {
        setFriendMessages((prev) => [...prev, data.message]);
        setNewFriendMsg("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Send a Hug on Vent Wall
  async function sendHug(postId: string) {
    try {
      const res = await fetch("/api/community/vent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hugPostId: postId }),
      });
      const data = await res.json();
      if (data.post) {
        setVentPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, hugsCount: data.post.hugsCount } : p))
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Post to Vent Wall
  async function submitVentPost(e: React.FormEvent) {
    e.preventDefault();
    if (!newVentContent.trim()) return;

    try {
      const res = await fetch("/api/community/vent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newVentContent.trim(),
          category: selectedIntent === "PEACE" ? "Peace & Healing" : "General Thought",
          mood: selectedMood,
        }),
      });
      const data = await res.json();
      if (data.post) {
        setVentPosts((prev) => [data.post, ...prev]);
        setNewVentContent("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Submit Answer to Daily Question
  async function submitDailyAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!dailyAnswer.trim() || !dailyQuestion) return;

    try {
      const res = await fetch("/api/community/daily-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: dailyQuestion.id,
          answer: dailyAnswer.trim(),
        }),
      });
      const data = await res.json();
      if (data.answer) {
        setDailyQuestion((prev: any) => ({
          ...prev,
          answers: [data.answer, ...(prev.answers || [])],
        }));
        setDailyAnswer("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Logout handler
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  // Matchmaking: Start Search
  async function startMatchmaking(forceCompanion = false) {
    setIsSearching(true);
    setSearchSeconds(0);

    try {
      const res = await fetch("/api/match/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: activeRole,
          intent: selectedIntent,
          socialGroup: selectedSocialGroup,
          mood: selectedMood,
          problemSummary,
          fallbackToCompanion: forceCompanion,
        }),
      });

      const data = await res.json();

      if (data.matched && data.sessionId) {
        setIsSearching(false);
        router.push(`/chat/${data.sessionId}`);
        return;
      }

      // If waiting for a human match, start search polling interval
      searchTimerRef.current = setInterval(async () => {
        setSearchSeconds((s) => s + 1);

        const statusRes = await fetch("/api/match/status");
        const statusData = await statusRes.json();

        if (statusData.matched && statusData.sessionId) {
          clearInterval(searchTimerRef.current);
          setIsSearching(false);
          router.push(`/chat/${statusData.sessionId}`);
        }
      }, 2000);
    } catch (e) {
      console.error("Match error:", e);
      setIsSearching(false);
    }
  }

  // Cancel Matchmaking
  async function cancelMatchmaking() {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    setIsSearching(false);
    await fetch("/api/match/cancel", { method: "POST" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070709] flex items-center justify-center text-zinc-400">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-400 animate-ping"></div>
          <span className="text-sm font-medium">Entering One Hour Friend...</span>
        </div>
      </div>
    );
  }

  const currentZone = INTENT_ZONES.find((z) => z.id === selectedIntent) || INTENT_ZONES[0];
  const currentGroup = SOCIAL_GROUPS.find((g) => g.id === selectedSocialGroup) || SOCIAL_GROUPS[0];

  return (
    <main className="min-h-screen bg-[#070709] text-white flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-black font-bold flex items-center justify-center text-base shadow-md shadow-amber-500/20">
              1H
            </div>
            <span className="font-bold text-sm tracking-wide hidden sm:inline">
              ONE HOUR FRIEND
            </span>
          </Link>

          {/* Role Switcher Pill */}
          <div className="flex items-center bg-black/60 p-1 rounded-full border border-white/10">
            <button
              onClick={() => setActiveRole("PROBLEM_FACER")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeRole === "PROBLEM_FACER"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              👤 Seeker
            </button>
            <button
              onClick={() => setActiveRole("GUIDER")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeRole === "GUIDER"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              🧭 Guider
            </button>
            <button
              onClick={() => setActiveRole("CASUAL_CHILL")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                activeRole === "CASUAL_CHILL"
                  ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ☕ Casual
            </button>
          </div>

          {/* User Profile summary & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-right">
              <span className="text-2xl">{user?.avatar || "🌙"}</span>
              <div className="hidden md:block">
                <div className="text-xs font-bold text-white leading-tight">{user?.username}</div>
                <div className="text-[10px] text-amber-400 font-medium">
                  ⭐ {user?.trustScore?.toFixed(1) || "5.0"} • 🪙 {user?.karmaPoints || 100} pts
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-red-500/10 hover:text-red-400 border border-white/5 transition text-zinc-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Active Session Alert Banner (if user has a live chat open) */}
      {activeSession && (
        <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-b border-amber-500/30 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-white">
                You have an ongoing 60-Minute Conversation:
              </span>
              <span className="text-amber-300 font-medium hidden sm:inline">
                {activeSession.topic || "Active Chat"} ({activeSession.intent} Zone)
              </span>
            </div>

            <Link
              href={`/chat/${activeSession.id}`}
              className="bg-amber-400 text-black font-bold px-4 py-1.5 rounded-full text-xs hover:bg-amber-300 transition shadow-md shadow-amber-400/20 flex items-center gap-1.5"
            >
              <span>Resume Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full px-6 py-8 flex-1">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4 overflow-x-auto">
          {[
            { id: "match", label: "⚡ Find a 60-Min Friend", icon: Flame },
            { id: "community", label: "📢 Community & Vent Wall", icon: Sparkles },
            { id: "friends", label: `❤️ Kept Friends (${friends.length})`, icon: Heart },
            { id: "profile", label: "👤 Persona & Settings", icon: User },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-white/10 text-white border border-white/10"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-amber-400" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: MATCHMAKER CENTRAL */}
        {activeTab === "match" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left 2 Columns: Matchmaker Config */}
            <div className="lg:col-span-2 space-y-6">
              {/* Role Context Hero Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900/80 to-zinc-950 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {activeRole === "PROBLEM_FACER" ? "👤" : activeRole === "GUIDER" ? "🧭" : "☕"}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {activeRole === "PROBLEM_FACER"
                          ? "Problem Facer Mode (Seek Guidance)"
                          : activeRole === "GUIDER"
                          ? "Guider Mode (Help & Listen)"
                          : "Casual Chill Mode (Wholesome Banter)"}
                      </h2>
                      <div className="text-xs text-zinc-400">
                        {activeRole === "PROBLEM_FACER"
                          ? "Tell us what you're dealing with to pair with an active, empathetic listener."
                          : activeRole === "GUIDER"
                          ? "Help someone navigate their stress or career roadmap for 60 minutes."
                          : "Connect with someone to chat about hobbies, life, and good vibes."}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 1: Protected Intent Zone Selector */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    1. Choose Protected Intent Zone
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {INTENT_ZONES.map((zone) => (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() => setSelectedIntent(zone.id)}
                        className={`p-3.5 rounded-2xl border text-left transition ${
                          selectedIntent === zone.id
                            ? "bg-white/10 border-amber-400 text-white shadow-lg shadow-amber-400/5"
                            : "bg-black/30 border-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{zone.emoji}</span>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 ${zone.color}`}>
                            {zone.badge}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white mt-2">{zone.name}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{zone.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Social Group / Circle */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    2. Select Social Circle
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {SOCIAL_GROUPS.map((group) => (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedSocialGroup(group.id)}
                        className={`p-3 rounded-xl border text-left transition ${
                          selectedSocialGroup === group.id
                            ? "bg-white/10 border-teal-400 text-white"
                            : "bg-black/30 border-white/5 text-zinc-400 hover:border-white/15"
                        }`}
                      >
                        <div className="text-lg">{group.emoji}</div>
                        <div className="text-xs font-bold text-white mt-1">{group.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">{group.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Mood & Situation Picker */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    3. What is your current mood or topic?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {MOODS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(m.label)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          selectedMood === m.label
                            ? "bg-amber-400/10 border-amber-400 text-amber-300"
                            : "bg-black/20 border-white/5 text-zinc-400 hover:border-white/15"
                        }`}
                      >
                        <div className="text-base">{m.emoji}</div>
                        <div className="text-xs font-semibold text-zinc-200 mt-1 truncate">{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 4: Short summary / problem context (optional) */}
                <div className="mt-6">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    4. Brief thought or context for your partner (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Struggling with career direction, or just need to vent about today..."
                    value={problemSummary}
                    onChange={(e) => setProblemSummary(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400 transition"
                  />
                </div>

                {/* Big Match Button */}
                <button
                  onClick={() => startMatchmaking(false)}
                  className="w-full mt-8 bg-amber-400 text-black font-extrabold py-4 rounded-2xl text-sm hover:bg-amber-300 transition shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2 group"
                >
                  <Flame className="w-5 h-5 group-hover:scale-125 transition" />
                  <span>Start 60-Minute Matchmaking</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Platform Status & Quick Fallback */}
            <div className="space-y-6">
              {/* Instant AI Companion Box */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-500/20 relative overflow-hidden">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-base mb-3">
                  ✨
                </div>
                <h3 className="text-base font-bold text-white">
                  Need to Talk Right Now?
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Connect instantly with our <strong className="text-purple-300">AI Compassionate Companion</strong>. Zero waiting time, deep empathy, and 60 minutes of uninterrupted calm.
                </p>

                <button
                  onClick={() => startMatchmaking(true)}
                  className="mt-5 w-full border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <span>Talk with AI Companion Instantly</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Safety Rules reminder */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-zinc-400 space-y-2.5">
                <div className="flex items-center gap-2 text-zinc-200 font-bold">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Our Safety Commitments</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  • Zero tolerance for harassment or unwanted romantic advances in Peace & Guidance zones.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • 1-Click emergency exit & instant block available at all times during the chat.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • 100% anonymous identity protected.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMMUNITY VENT WALL & DAILY QUESTION */}
        {activeTab === "community" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Daily Question */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10">
                <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider mb-2">
                  Question of the Day 🎴
                </div>
                <h3 className="text-lg font-bold text-white">
                  "{dailyQuestion?.question || "What is a lesson your early 20s taught you?"}"
                </h3>

                {/* Answer form */}
                <form onSubmit={submitDailyAnswer} className="mt-5 space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Share your reflection anonymously..."
                    value={dailyAnswer}
                    onChange={(e) => setDailyAnswer(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="w-full bg-amber-400 text-black font-bold py-2.5 rounded-xl text-xs hover:bg-amber-300 transition"
                  >
                    Post Answer
                  </button>
                </form>

                {/* Answers List */}
                <div className="mt-6 space-y-3 max-h-96 overflow-y-auto pr-1">
                  <div className="text-[11px] font-semibold text-zinc-400">
                    Community Answers ({dailyQuestion?.answers?.length || 0})
                  </div>
                  {dailyQuestion?.answers?.map((ans: any) => (
                    <div key={ans.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                      <div className="flex items-center justify-between text-zinc-400 mb-1">
                        <span className="font-semibold text-zinc-300">{ans.avatar} {ans.anonymousName}</span>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{ans.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vent Wall */}
            <div className="lg:col-span-2 space-y-6">
              {/* Post a Vent */}
              <div className="p-6 rounded-3xl bg-zinc-900/60 border border-white/10">
                <h3 className="text-base font-bold text-white mb-2">
                  Anonymous Vent & Support Wall 📢
                </h3>
                <p className="text-xs text-zinc-400 mb-4">
                  Need to share a thought, celebrate a small win, or release stress? Post here and receive hugs from friends.
                </p>

                <form onSubmit={submitVentPost} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="What's weighing on your heart right now? (Anonymous)"
                    value={newVentContent}
                    onChange={(e) => setNewVentContent(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-amber-400 text-black font-bold px-5 py-2 rounded-xl text-xs hover:bg-amber-300 transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Anonymously</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Vent Posts Stream */}
              <div className="space-y-4">
                {ventPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition"
                  >
                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{post.avatar}</span>
                        <span className="font-bold text-zinc-200">{post.anonymousName}</span>
                        <span className="text-[10px] text-zinc-500">• {post.category}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-medium px-2 py-0.5 rounded-full bg-amber-400/10">
                        {post.mood}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                      {post.content}
                    </p>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <button
                        onClick={() => sendHug(post.id)}
                        className="flex items-center gap-1.5 text-pink-400 hover:text-pink-300 transition text-xs font-semibold"
                      >
                        <Heart className="w-3.5 h-3.5 fill-pink-500/20" />
                        <span>Send Virtual Hug ({post.hugsCount})</span>
                      </button>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KEPT CONNECTIONS / FRIENDS */}
        {activeTab === "friends" && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Friends list */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-base font-bold text-white">
                Your Kept Friends ({friends.length})
              </h3>
              <p className="text-xs text-zinc-400">
                People you mutually chose to stay connected with after your 60-minute conversations.
              </p>

              {friends.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/40 border border-white/5 text-xs text-zinc-500">
                  <Heart className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  No kept connections yet. Complete a 60-minute chat and both click "Keep Connection"!
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <button
                      key={f.friendshipId}
                      onClick={() => openFriendChat(f)}
                      className={`w-full p-3.5 rounded-2xl border text-left transition flex items-center justify-between ${
                        selectedFriend?.friendshipId === f.friendshipId
                          ? "bg-amber-400/10 border-amber-400"
                          : "bg-zinc-900/50 border-white/5 hover:border-white/15"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{f.friend.avatar}</span>
                        <div>
                          <div className="text-xs font-bold text-white">{f.friend.username}</div>
                          <div className="text-[10px] text-zinc-400 line-clamp-1">
                            {f.lastMessage?.content || "Permanent Friend"}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Chat Drawer */}
            <div className="lg:col-span-2">
              {selectedFriend ? (
                <div className="p-6 rounded-3xl bg-zinc-900/70 border border-white/10 flex flex-col h-[520px]">
                  {/* Chat header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{selectedFriend.friend.avatar}</span>
                      <div>
                        <div className="text-xs font-bold text-white">{selectedFriend.friend.username}</div>
                        <div className="text-[10px] text-emerald-400">Direct Message Channel</div>
                      </div>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                    {friendMessages.length === 0 && (
                      <div className="text-center text-xs text-zinc-500 py-10">
                        Say hello to your new friend! 👋
                      </div>
                    )}
                    {friendMessages.map((msg) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-amber-400 text-black font-medium"
                                : "bg-zinc-800 text-zinc-200 border border-white/5"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendFriendMessage} className="pt-3 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newFriendMsg}
                      onChange={(e) => setNewFriendMsg(e.target.value)}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="bg-amber-400 text-black px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-amber-300 transition"
                    >
                      Send
                    </button>
                  </form>
                </div>
              ) : (
                <div className="h-[520px] rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs">
                  <MessageSquare className="w-10 h-10 mb-3 text-zinc-600" />
                  <span>Select a friend on the left to start direct messaging.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PERSONA & SETTINGS */}
        {activeTab === "profile" && (
          <div className="max-w-xl mx-auto space-y-6">
            <div className="p-7 rounded-3xl bg-zinc-900/60 border border-white/10 space-y-5">
              <h3 className="text-base font-bold text-white">Your Anonymous Persona</h3>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2">Avatar</label>
                <div className="flex items-center gap-2 flex-wrap bg-black/40 p-3 rounded-2xl border border-white/5">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={async () => {
                        setUser((prev: any) => ({ ...prev, avatar: a }));
                        await fetch("/api/user/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ avatar: a }),
                        });
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                        user?.avatar === a ? "bg-amber-400 scale-110" : "bg-zinc-800/60 hover:bg-zinc-700"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Anonymous Handle</label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ""}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Persona Bio</label>
                <textarea
                  rows={2}
                  value={user?.bio || ""}
                  onChange={(e) => setUser((prev: any) => ({ ...prev, bio: e.target.value }))}
                  onBlur={async () => {
                    await fetch("/api/user/profile", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ bio: user.bio }),
                    });
                  }}
                  className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400">
                <div>Trust Score: <strong className="text-white">⭐ {user?.trustScore?.toFixed(1)}</strong></div>
                <div>Karma Points: <strong className="text-amber-400">🪙 {user?.karmaPoints}</strong></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RADAR MATCHMAKER MODAL */}
      {isSearching && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden shadow-2xl">
            {/* Pulsing Radar Animation */}
            <div className="relative w-40 h-40 mx-auto my-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-radar-1"></div>
              <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-radar-2"></div>
              <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-radar-3"></div>
              <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/50 flex items-center justify-center text-3xl z-10 shadow-lg shadow-amber-400/30">
                {user?.avatar || "🌙"}
              </div>
            </div>

            <h3 className="text-xl font-bold text-white">
              Searching for Your 60-Minute Match...
            </h3>
            <div className="text-xs text-amber-400 font-semibold mt-1">
              {currentZone.emoji} {currentZone.name} • {currentGroup.name}
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Looking for an available {activeRole === "PROBLEM_FACER" ? "Guider" : "Seeker"} in "{selectedMood}" ({searchSeconds}s)
            </p>

            {/* Instant AI Fallback Button */}
            <div className="mt-8 space-y-3">
              <button
                onClick={() => {
                  cancelMatchmaking();
                  startMatchmaking(true);
                }}
                className="w-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold py-3 rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <span>✨ Skip Wait & Talk with AI Companion</span>
              </button>

              <button
                onClick={cancelMatchmaking}
                className="w-full border border-white/10 hover:bg-white/5 text-zinc-400 font-semibold py-2.5 rounded-xl text-xs transition"
              >
                Cancel Search
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
