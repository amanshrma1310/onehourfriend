"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { INTENT_ZONES, SOCIAL_GROUPS, MOODS } from "@/lib/data";
import {
  Compass,
  Heart,
  MessageSquare,
  Sparkles,
  Users,
  ShieldCheck,
  Zap,
  ArrowRight,
  LogOut,
  Send,
  Plus,
  Search,
  SlidersHorizontal,
  Home,
  X,
  Radio,
  Phone,
  Video,
  CheckCheck,
  Flame,
  UserPlus,
  Bell,
  UserCheck,
  UserX,
} from "lucide-react";
import VideoCallModal from "@/components/VideoCallModal";
import { requestNotificationPermission, sendBrowserNotification } from "@/lib/notifications";

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"chat_home" | "circles" | "friends" | "vent" | "daily_q">("chat_home");

  // Video / Audio Call State
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const lastSignalCheckRef = useRef<number>(Date.now() - 5000);

  // Friend Requests State
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [showFriendRequestsModal, setShowFriendRequestsModal] = useState(false);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchFriendUsername, setSearchFriendUsername] = useState("");
  const [addFriendStatus, setAddFriendStatus] = useState<string | null>(null);

  // Category Matchmaker Modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState("PEACE");
  const [selectedMood, setSelectedMood] = useState("Stressed & Overwhelmed");
  const [selectedSocialGroup, setSelectedSocialGroup] = useState("OPEN");

  // Live Radar Matchmaking State
  const [isMatching, setIsMatching] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("Scanning for compatible active stranger...");
  const [matchSearchSeconds, setMatchSearchSeconds] = useState(0);

  // Friends & DMs State
  const [friends, setFriends] = useState<any[]>([]);
  const [activeFriendship, setActiveFriendship] = useState<any>(null);
  const [friendMessages, setFriendMessages] = useState<any[]>([]);
  const [newFriendMessage, setNewFriendMessage] = useState("");

  // Vent Wall State
  const [ventPosts, setVentPosts] = useState<any[]>([]);
  const [newVentContent, setNewVentContent] = useState("");
  const [newVentCategory, setNewVentCategory] = useState("Peace & Healing");

  // Daily Question State
  const [dailyQuestion, setDailyQuestion] = useState<any>(null);
  const [dailyAnswers, setDailyAnswers] = useState<any[]>([]);
  const [myAnswer, setMyAnswer] = useState("");

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  const matchIntervalRef = useRef<any>(null);
  const friendPollIntervalRef = useRef<any>(null);

  // Online Active Avatars Strip (From Image)
  const ONLINE_ACTIVE_PEOPLE = [
    { name: "Alex", avatar: "👨‍💻", intent: "GUIDANCE", mood: "Tech Roadmaps" },
    { name: "Isabella", avatar: "🌸", intent: "PEACE", mood: "Overthinking" },
    { name: "Karla", avatar: "🎨", intent: "CASUAL", mood: "Late Night Music" },
    { name: "Ethan", avatar: "⚡", intent: "GUIDANCE", mood: "Career Switch" },
    { name: "Harper", avatar: "🌙", intent: "PEACE", mood: "Need to Vent" },
    { name: "Zack", avatar: "🎮", intent: "CASUAL", mood: "Gaming & Anime" },
    { name: "Maya", avatar: "✨", intent: "SPARK", mood: "Fun Banter" },
  ];

  useEffect(() => {
    loadUserData();
    loadFriends();
    loadFriendRequests();
    loadVentWall();
    loadDailyQuestion();

    return () => {
      if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
      if (friendPollIntervalRef.current) clearInterval(friendPollIntervalRef.current);
    };
  }, []);

  const dismissedSignalIdsRef = useRef<Set<string>>(new Set());

  // Global Incoming Call Listener across all tabs and rooms
  useEffect(() => {
    if (!currentUser || activeCall) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/call/signal?checkIncoming=true");
        const data = await res.json();
        if (data.signals && data.signals.length > 0) {
          for (const s of data.signals) {
            if (dismissedSignalIdsRef.current.has(s.id)) continue;
            if (s.type === "CALL_RING") {
              setIncomingCall({
                signalId: s.id,
                roomId: s.roomId,
                partnerUserId: s.senderId,
                partnerName: s.payload?.callerName || "Friend",
                partnerAvatar: s.payload?.callerAvatar || "✨",
                isVideo: s.payload?.isVideo !== false,
              });
              if (document.hidden) {
                sendBrowserNotification(`Incoming ${s.payload?.isVideo !== false ? "Video" : "Voice"} Call`, {
                  body: `${s.payload?.callerName || "Friend"} is calling you!`,
                });
              }
            } else if (s.type === "HANGUP" || s.type === "CALL_DECLINE") {
              setIncomingCall(null);
            }
          }
        } else {
          setIncomingCall(null);
        }
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [currentUser, activeCall]);

  // Play pleasant ringtone when there is an incoming call
  useEffect(() => {
    let ctx: AudioContext | null = null;
    let ringInterval: any = null;

    if (incomingCall) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          ctx = new AudioCtx();
          const ring = () => {
            if (!ctx || ctx.state === "closed") return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
          };

          ring();
          ringInterval = setInterval(ring, 2500);
        }
      } catch {}
    }

    return () => {
      if (ringInterval) clearInterval(ringInterval);
      if (ctx && ctx.state !== "closed") {
        try {
          ctx.close();
        } catch {}
      }
    };
  }, [incomingCall]);

  // Poll friend direct messages in real time when active
  useEffect(() => {
    if (friendPollIntervalRef.current) clearInterval(friendPollIntervalRef.current);

    if (activeTab === "friends" && activeFriendship) {
      const friendshipId = activeFriendship.id || activeFriendship.friendshipId;
      if (friendshipId) {
        friendPollIntervalRef.current = setInterval(() => {
          loadFriendChat(friendshipId, true);
        }, 2000);
      }
    }

    return () => {
      if (friendPollIntervalRef.current) clearInterval(friendPollIntervalRef.current);
    };
  }, [activeTab, activeFriendship]);

  async function loadUserData() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (!res.ok || !data.user) {
        router.push("/login");
        return;
      }
      setCurrentUser(data.user);
      if (data.activeSession) {
        router.push(`/chat/${data.activeSession.id}`);
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  async function loadFriendRequests() {
    try {
      const res = await fetch("/api/friends/request");
      const data = await res.json();
      if (data.requests) {
        setFriendRequests(data.requests);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "ACCEPT" }),
      });
      const data = await res.json();
      if (res.ok) {
        loadFriends();
        loadFriendRequests();
        alert(data.message || "Friend request accepted!");
      }
    } catch {}
  }

  async function handleDeclineRequest(requestId: string) {
    try {
      const res = await fetch("/api/friends/request", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "DECLINE" }),
      });
      if (res.ok) {
        loadFriendRequests();
      }
    } catch {}
  }

  async function handleSendRequestByName(e: React.FormEvent) {
    e.preventDefault();
    if (!searchFriendUsername.trim()) return;
    setAddFriendStatus("Sending friend request...");
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverUsername: searchFriendUsername.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddFriendStatus(data.message || "Friend request sent!");
        setSearchFriendUsername("");
        loadFriends();
      } else {
        setAddFriendStatus(data.error || "Failed to send request");
      }
    } catch {
      setAddFriendStatus("Failed to send request");
    }
  }

  async function loadFriends() {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.friends) {
        setFriends(data.friends);
        if (data.friends.length > 0 && !activeFriendship) {
          const first = data.friends[0];
          setActiveFriendship(first);
          loadFriendChat(first.id || first.friendshipId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadFriendChat(friendshipId: string, isSilent = false) {
    if (!friendshipId) return;
    try {
      const res = await fetch(`/api/friends/${friendshipId}/messages`);
      const data = await res.json();
      if (data.messages) {
        setFriendMessages((prev) => {
          if (data.messages.length > prev.length && prev.length > 0) {
            const friendUser = activeFriendship?.partner || activeFriendship?.friend;
            const newMsg = data.messages[data.messages.length - 1];
            if (newMsg.senderId !== currentUser?.id && document.hidden) {
              sendBrowserNotification(`New message from ${friendUser?.username || "Friend"}`, {
                body: newMsg.content,
              });
            }
          }
          return data.messages;
        });
      }

      // Check for incoming call signals from friend
      if (!activeCall) {
        const sigRes = await fetch(`/api/call/signal?roomId=friendship_${friendshipId}&since=${lastSignalCheckRef.current}`);
        const sigData = await sigRes.json();
        if (sigData.signals && sigData.signals.length > 0) {
          for (const s of sigData.signals) {
            lastSignalCheckRef.current = s.timestamp || Date.now();
            if (s.type === "CALL_RING") {
              const friendUser = activeFriendship?.partner || activeFriendship?.friend;
              setIncomingCall({
                roomId: `friendship_${friendshipId}`,
                partnerUserId: friendUser?.id,
                partnerName: friendUser?.username || "Friend",
                partnerAvatar: friendUser?.avatar || "✨",
                isVideo: s.payload?.isVideo !== false,
              });
              if (document.hidden) {
                sendBrowserNotification(`Incoming ${s.payload?.isVideo !== false ? "Video" : "Voice"} Call`, {
                  body: `${friendUser?.username || "Friend"} is calling you!`,
                });
              }
            } else if (s.type === "HANGUP" || s.type === "CALL_DECLINE") {
              setIncomingCall(null);
            }
          }
        }
      }
    } catch (e) {
      if (!isSilent) console.error(e);
    }
  }

  async function startFriendCall(isVideo = true) {
    const friendUser = activeFriendship?.partner || activeFriendship?.friend;
    const friendshipId = activeFriendship?.id || activeFriendship?.friendshipId;
    if (!friendUser || !friendshipId || !currentUser) return;
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
      roomId: `friendship_${friendshipId}`,
      currentUserId: currentUser.id,
      currentUserName: currentUser.username,
      currentUserAvatar: currentUser.avatar,
      partnerUserId: friendUser.id,
      partnerName: friendUser.username || "Friend",
      partnerAvatar: friendUser.avatar || "✨",
      isVideoCall: isVideo,
      isInitiator: true,
      initialStream,
    });
  }

  async function acceptIncomingCall() {
    if (!incomingCall || !currentUser) return;

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
      partnerUserId: incomingCall.partnerUserId,
      partnerName: incomingCall.partnerName,
      partnerAvatar: incomingCall.partnerAvatar,
      isVideoCall: incomingCall.isVideo,
      isInitiator: false,
      initialStream,
    });
    setIncomingCall(null);
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
          body: JSON.stringify({ roomId: incomingCall.roomId, targetUserId: incomingCall.partnerUserId, type: "CALL_DECLINE" }),
        });
      } catch {}
    }
    setIncomingCall(null);
  }

  async function loadVentWall() {
    try {
      const res = await fetch("/api/community/vent");
      const data = await res.json();
      if (data.posts) setVentPosts(data.posts);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadDailyQuestion() {
    try {
      const res = await fetch("/api/community/daily-question");
      const data = await res.json();
      if (data.question) setDailyQuestion(data.question);
      if (data.answers) setDailyAnswers(data.answers);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleStartMatchmaking(fallbackToCompanion: boolean = false, customIntent?: string, customMood?: string) {
    if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);

    setShowCategoryModal(false);
    setIsMatching(true);
    setMatchSearchSeconds(0);
    setMatchStatus(fallbackToCompanion ? "Connecting to AI Empathetic Companion..." : "Scanning radar for an active partner in your category...");

    const intentToUse = customIntent || selectedIntent;
    const moodToUse = customMood || selectedMood;

    try {
      const res = await fetch("/api/match/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: intentToUse,
          socialGroup: "OPEN",
          mood: moodToUse,
          fallbackToCompanion,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        // Handle non-JSON HTML error page gracefully
        data = {};
      }

      if (data.sessionId) {
        setIsMatching(false);
        router.push(`/chat/${data.sessionId}`);
        return;
      }

      matchIntervalRef.current = setInterval(async () => {
        setMatchSearchSeconds((s) => s + 1);
        try {
          const pollRes = await fetch("/api/match/status");
          const pollData = await pollRes.json().catch(() => ({}));
          if (pollData && pollData.sessionId) {
            clearInterval(matchIntervalRef.current);
            setIsMatching(false);
            router.push(`/chat/${pollData.sessionId}`);
          }
        } catch {}
      }, 1000);
    } catch (err: any) {
      console.warn("Matchmaking error:", err);
      setIsMatching(false);
    }
  }

  async function handleCancelMatch() {
    if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
    await fetch("/api/match/cancel", { method: "POST" });
    setIsMatching(false);
  }

  async function handleSendFriendMessage(e: React.FormEvent) {
    e.preventDefault();
    const friendshipId = activeFriendship?.id || activeFriendship?.friendshipId;
    if (!newFriendMessage.trim() || !friendshipId) return;

    const messageText = newFriendMessage.trim();
    setNewFriendMessage("");

    try {
      const res = await fetch(`/api/friends/${friendshipId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageText }),
      });
      const data = await res.json();
      if (data.message) {
        setFriendMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePostVent(e: React.FormEvent) {
    e.preventDefault();
    if (!newVentContent.trim()) return;

    try {
      const res = await fetch("/api/community/vent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newVentContent.trim(), category: newVentCategory }),
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

  async function handleHugVent(postId: string) {
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

  async function handlePostDailyAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!myAnswer.trim() || !dailyQuestion) return;

    try {
      const res = await fetch("/api/community/daily-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: dailyQuestion.id, answer: myAnswer.trim() }),
      });
      const data = await res.json();
      if (data.answer) {
        setDailyAnswers((prev) => [data.answer, ...prev]);
        setMyAnswer("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#872bf5] flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-white animate-ping" />
          <span className="text-sm font-black">Opening One Hour Friend...</span>
        </div>
      </div>
    );
  }

  const activeFriendUser = activeFriendship?.partner || activeFriendship?.friend;

  return (
    <div className="h-screen flex flex-col md:flex-row bg-[#121218] text-white overflow-hidden selection:bg-[#872bf5] selection:text-white relative">
      {/* 1. Left Slim Navigation Rail (Desktop) */}
      <aside className="hidden md:flex flex-col items-center justify-between w-18 bg-[#181824] border-r border-white/10 py-6 z-20 shrink-0">
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/"
            className="w-11 h-11 rounded-2xl bg-[#872bf5] text-white font-black flex items-center justify-center text-base shadow-lg shadow-[#872bf5]/40 hover:scale-105 transition"
          >
            1H
          </Link>

          <nav className="flex flex-col items-center gap-3">
            <button
              onClick={() => setActiveTab("chat_home")}
              title="Chats & Matchmaking"
              className={`p-3 rounded-2xl transition ${
                activeTab === "chat_home"
                  ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Home className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setActiveTab("chat_home");
                setShowCategoryModal(true);
              }}
              title="Instant Matchmaker"
              className="p-3 rounded-2xl text-purple-300 hover:text-white hover:bg-[#872bf5]/20 transition relative"
            >
              <Radio className="w-5 h-5 animate-pulse" />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-2 ring-[#181824]" />
            </button>

            <button
              onClick={() => setActiveTab("circles")}
              title="Social Circles"
              className={`p-3 rounded-2xl transition ${
                activeTab === "circles"
                  ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Users className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab("friends")}
              title="Kept Friends & DMs"
              className={`p-3 rounded-2xl transition ${
                activeTab === "friends"
                  ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setShowFriendRequestsModal(true)}
              title="Friend Requests"
              className="p-3 rounded-2xl text-purple-300 hover:text-white hover:bg-white/[0.04] transition relative"
            >
              <UserPlus className="w-5 h-5" />
              {friendRequests.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center animate-pulse">
                  {friendRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("vent")}
              title="Anonymous Vent Wall"
              className={`p-3 rounded-2xl transition ${
                activeTab === "vent"
                  ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Heart className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab("daily_q")}
              title="Daily Question"
              className={`p-3 rounded-2xl transition ${
                activeTab === "daily_q"
                  ? "bg-[#872bf5] text-white shadow-lg shadow-[#872bf5]/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <span className="text-2xl">{currentUser?.avatar || "🌙"}</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-2 ring-[#181824]" />
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2.5 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Middle-Left Sidebar Panel (Active Stories + Crisp White Messages Card) */}
      <aside className="w-full md:w-88 bg-[#121218] border-r border-white/10 flex flex-col shrink-0 h-auto md:h-full z-10">
        {/* Header with Title & Search */}
        <div className="p-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-black text-white tracking-tight">Messages</h2>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="p-2 rounded-xl bg-[#872bf5] text-white font-bold text-xs hover:bg-[#7417e3] transition shadow-md shadow-[#872bf5]/30 flex items-center gap-1.5 hover:scale-105 active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Match</span>
            </button>
          </div>

          {/* Search Pill */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1e1e26] border border-white/5 rounded-2xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-[#872bf5]"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>
        </div>

        {/* HORIZONTAL ACTIVE STORIES STRIP */}
        <div className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
              <span>Currently Active</span>
              <span className="w-2 h-2 rounded-full bg-[#00e676] shadow-sm shadow-[#00e676]/60 animate-pulse" />
            </span>
            <span className="text-[10px] text-purple-300 font-bold">Tap to Talk</span>
          </div>

          <div className="flex items-center gap-3.5 overflow-x-auto pb-1">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="flex flex-col items-center gap-1 shrink-0 group"
            >
              <div className="w-12 h-12 rounded-full bg-[#872bf5] flex items-center justify-center text-white shadow-md shadow-[#872bf5]/30 group-hover:scale-105 transition">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] text-zinc-400 group-hover:text-white font-medium">Add Story</span>
            </button>

            {ONLINE_ACTIVE_PEOPLE.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleStartMatchmaking(false, p.intent, p.mood)}
                className="flex flex-col items-center gap-1 shrink-0 group"
              >
                <div className="relative w-12 h-12 rounded-full bg-[#1c1c24] border-2 border-[#872bf5] flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition">
                  {p.avatar}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00e676] ring-2 ring-[#121218]" />
                </div>
                <span className="text-[10px] font-bold text-zinc-300 group-hover:text-purple-300">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CRISP WHITE MESSAGE CONTAINER (From Screenshot) */}
        <div className="flex-1 bg-white rounded-t-[32px] text-black p-4 md:p-5 overflow-y-auto space-y-2 shadow-2xl">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-black text-black tracking-tight">Direct Connections</span>
            <span className="text-[10px] text-zinc-500 font-bold">{friends.length} Kept</span>
          </div>

          {friends.length === 0 ? (
            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-center">
                <p className="text-xs text-zinc-600 font-medium leading-relaxed">
                  Start your first 60-minute chat! Both click "Keep Friendship" to message here permanently.
                </p>
              </div>

              {INTENT_ZONES.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    setSelectedIntent(zone.id);
                    setShowCategoryModal(true);
                  }}
                  className="w-full p-3 rounded-2xl bg-zinc-50 hover:bg-purple-50 border border-zinc-100 hover:border-purple-200 transition flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{zone.emoji}</span>
                    <div>
                      <div className="text-xs font-black text-black group-hover:text-[#872bf5] transition">
                        {zone.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-medium">{zone.badge}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#872bf5] bg-purple-100 px-2 py-0.5 rounded-full">
                    Start
                  </span>
                </button>
              ))}
            </div>
          ) : (
            friends.map((f) => {
              const friendUser = f.partner || f.friend;
              const fId = f.id || f.friendshipId;
              const isSelected = activeFriendship?.id === fId || activeFriendship?.friendshipId === fId;

              return (
                <button
                  key={fId}
                  onClick={() => {
                    setActiveFriendship(f);
                    setActiveTab("friends");
                    loadFriendChat(fId);
                  }}
                  className={`w-full p-3 rounded-2xl transition flex items-center justify-between text-left border ${
                    isSelected
                      ? "bg-purple-50 border-purple-200 text-black shadow-sm"
                      : "bg-white hover:bg-zinc-50 border-transparent text-black"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="text-2xl">{friendUser?.avatar || "✨"}</span>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-1 ring-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-black">
                        {friendUser?.username || "Connected Friend"}
                      </div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1 font-medium">
                        {f.lastMessage?.content || "Permanent Friend"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 font-semibold block">Active</span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#872bf5] ml-auto mt-0.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 3. Center Main Viewport */}
      <main className="flex-1 flex flex-col bg-[#121218] overflow-y-auto relative">
        {/* Animated Background Rings behind main viewport */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full border border-white/5 animate-concentric-1 pointer-events-none -z-0" />
        <div className="absolute top-1/4 right-1/4 w-[800px] h-[800px] rounded-full border border-white/5 animate-concentric-2 pointer-events-none -z-0" />

        {/* TAB 1: Chat Home & Instant Excitement Hero */}
        {activeTab === "chat_home" && (
          <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8 relative z-10">
            {/* VIBRANT PURPLE HERO BANNER */}
            <div className="relative rounded-[32px] p-8 md:p-10 bg-[#872bf5] bg-[radial-gradient(circle_at_center,#9a46fc_0%,#872bf5_50%,#7016db_100%)] shadow-2xl shadow-[#872bf5]/40 overflow-hidden text-white group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer pointer-events-none" />

              <div className="relative z-10 max-w-xl space-y-3.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-[11px] font-black text-white shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>1-on-1 Real-Time Anonymous Space</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-sm">
                  Connect with a stranger in 60 seconds.
                </h1>

                <p className="text-xs md:text-sm text-purple-100 leading-relaxed font-medium">
                  Vent stress, get career guidance, or have late-night deep conversations with zero judgment and 100% privacy.
                </p>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    className="bg-white text-[#872bf5] font-black text-xs md:text-sm px-7 py-3.5 rounded-2xl transition shadow-xl hover:bg-zinc-100 flex items-center gap-2 group hover:scale-105 active:scale-95"
                  >
                    <Zap className="w-4 h-4 fill-[#872bf5]" />
                    <span>⚡ Match with Someone Online</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={() => handleStartMatchmaking(true)}
                    className="bg-black/30 hover:bg-black/40 border border-white/25 text-white font-bold text-xs px-5 py-3.5 rounded-2xl transition backdrop-blur-md flex items-center gap-2 hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-purple-200" />
                    <span>AI Companion (Zero Waiting)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION PROMPT BUTTONS */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-black text-white">What's on your mind right now?</h2>
                  <p className="text-xs text-zinc-400">Choose a trigger to match instantly</p>
                </div>
                <span className="text-xs text-purple-300 font-bold">1-Click Launch</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    title: "🌪️ Stressed / Need to Vent",
                    desc: "Find a gentle, empathetic listener right now",
                    intent: "PEACE",
                    mood: "Stressed & Overwhelmed",
                    btnText: "Vent Safely →",
                  },
                  {
                    title: "🧗 Stuck in Career / Tech",
                    desc: "Talk with someone for roadmaps and advice",
                    intent: "GUIDANCE",
                    mood: "Coding / Tech Roadmaps",
                    btnText: "Talk Guidance →",
                  },
                  {
                    title: "🌙 Late Night Deep Talks",
                    desc: "Philosophy, dreams, and midnight conversations",
                    intent: "PEACE",
                    mood: "Late Night Thoughts",
                    btnText: "Join Night Owls →",
                  },
                  {
                    title: "😴 Super Bored / Chill Banter",
                    desc: "Wholesome friendly chat about gaming, movies, life",
                    intent: "CASUAL",
                    mood: "Super Bored / Want to Talk",
                    btnText: "Banter Now →",
                  },
                  {
                    title: "💔 Heartbreak / Relationship",
                    desc: "Process emotions with someone who understands",
                    intent: "PEACE",
                    mood: "Heartbroken / Breakup",
                    btnText: "Find Healing →",
                  },
                  {
                    title: "✨ Spark & Playful Vibes",
                    desc: "Romantic chemistry in an isolated consensual zone",
                    intent: "SPARK",
                    mood: "Looking for a Spark",
                    btnText: "Explore Spark →",
                  },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleStartMatchmaking(false, action.intent, action.mood)}
                    className="p-5 rounded-3xl bg-[#181824] hover:bg-[#202030] border border-white/5 hover:border-[#872bf5]/70 text-left transition group flex flex-col justify-between shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-sm font-black text-white group-hover:text-purple-300 transition">
                        {action.title}
                      </div>
                      <p className="text-xs text-zinc-400 mt-2 leading-relaxed font-medium">
                        {action.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
                      <span>{action.btnText}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Community Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-3xl bg-[#181824] border border-white/5 space-y-3 shadow-md hover:scale-[1.01] transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Daily Reflection</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("daily_q")}
                    className="text-xs text-purple-300 font-bold hover:underline"
                  >
                    Answer →
                  </button>
                </div>
                <div className="text-sm font-bold text-zinc-100">
                  "{dailyQuestion?.question || "What is something you are silently proud of achieving?"}"
                </div>
                <div className="text-xs text-zinc-400">
                  {dailyAnswers.length} friends answered today.
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#181824] border border-white/5 space-y-3 shadow-md hover:scale-[1.01] transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    <span className="text-xs font-bold text-white">Anonymous Vent Wall</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("vent")}
                    className="text-xs text-pink-400 font-bold hover:underline"
                  >
                    Share Thoughts →
                  </button>
                </div>
                <div className="text-xs text-zinc-300 line-clamp-2 italic">
                  "{ventPosts[0]?.content || "Sending warmth to anyone having a difficult day right now..."}"
                </div>
                <div className="text-xs text-zinc-400">
                  {ventPosts.length} posts with virtual hugs active.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Social Circles */}
        {activeTab === "circles" && (
          <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-6 relative z-10">
            <div>
              <h1 className="text-2xl font-black text-white">Social Circles & Safe Spaces</h1>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Select your preferred identity or life stage circle for your next 60-minute match.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {SOCIAL_GROUPS.map((group) => (
                <div
                  key={group.id}
                  className="p-6 rounded-3xl bg-[#181824] border border-white/5 flex flex-col justify-between hover:scale-[1.02] transition shadow-lg"
                >
                  <div>
                    <span className="text-3xl mb-3 block">{group.emoji}</span>
                    <h3 className="text-base font-extrabold text-white">{group.name}</h3>
                    <div className="text-xs text-purple-300 font-semibold mt-1">{group.tagline}</div>
                    <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-medium">{group.description}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedSocialGroup(group.id);
                      setShowCategoryModal(true);
                    }}
                    className="mt-5 w-full bg-[#872bf5] hover:bg-[#7417e3] text-white font-bold text-xs py-3 rounded-2xl transition shadow-md shadow-[#872bf5]/20 hover:scale-105 active:scale-95"
                  >
                    Match in {group.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Kept Friends Direct Messaging */}
        {activeTab === "friends" && (
          <div className="flex-1 flex flex-col h-full relative z-10">
            {activeFriendship ? (
              <div className="flex-1 flex flex-col h-full">
                {/* DM Header with Friend's Exact Name and Avatar */}
                <div className="p-4 border-b border-white/10 bg-[#181824] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="text-3xl">{activeFriendUser?.avatar || "✨"}</span>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00e676] ring-2 ring-[#181824]" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">
                        {activeFriendUser?.username || "Connected Friend"}
                      </div>
                      <div className="text-[10px] text-[#00e676] flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                        <span>Connected Friend (Kept after 60-min chat)</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFriendRequestsModal(true)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold relative"
                      title="Friend Requests"
                    >
                      <UserPlus className="w-4 h-4 text-[#00e676]" />
                      <span className="hidden sm:inline">Add / Requests</span>
                      {friendRequests.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping absolute top-2 right-2" />
                      )}
                    </button>

                    <button
                      onClick={() => startFriendCall(false)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold"
                      title="Voice Call"
                    >
                      <Phone className="w-4 h-4 text-purple-300" />
                    </button>

                    <button
                      onClick={() => startFriendCall(true)}
                      className="p-2.5 rounded-xl bg-[#872bf5] hover:bg-[#7417e3] text-white transition flex items-center gap-1.5 text-xs font-black shadow-md shadow-[#872bf5]/40 hover:scale-105 active:scale-95"
                      title="Start 1-on-1 Video Call"
                    >
                      <Video className="w-4 h-4 fill-white" />
                      <span className="hidden sm:inline">Video Call</span>
                    </button>
                  </div>
                </div>

                {/* Message Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
                  {friendMessages.length === 0 ? (
                    <div className="text-center py-12 text-xs text-zinc-500">
                      Say hi to <strong>{activeFriendUser?.username || "your friend"}</strong>! You both chose to stay connected.
                    </div>
                  ) : (
                    friendMessages.map((m) => {
                      const isMe = m.senderId === currentUser?.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          {!isMe && <span className="text-lg">{activeFriendUser?.avatar || "✨"}</span>}
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isMe
                                ? "bg-[#872bf5] text-white rounded-br-none font-medium shadow-md shadow-[#872bf5]/20"
                                : "bg-[#20202c] text-white rounded-bl-none border border-white/5"
                            }`}
                          >
                            <div>{m.content}</div>
                            <div className="text-[9px] text-purple-200 mt-1 text-right">
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Direct Message Input Form with Quick Emoji Bar */}
                <div className="p-4 border-t border-white/10 bg-[#181824] space-y-2 relative z-30">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 shrink-0 mr-1">Quick:</span>
                    {["❤️", "😂", "🔥", "✨", "👏", "🥺", "👍", "☕", "🕊️", "🙌"].map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewFriendMessage((prev) => prev + emoji)}
                        className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-[#872bf5]/30 hover:scale-110 transition flex items-center justify-center text-xs shrink-0"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSendFriendMessage} className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder={`Message ${activeFriendUser?.username || "friend"}...`}
                      value={newFriendMessage}
                      onChange={(e) => setNewFriendMessage(e.target.value)}
                      className="flex-1 bg-[#121218] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-[#872bf5]"
                    />
                    <button
                      type="submit"
                      disabled={!newFriendMessage.trim()}
                      className="bg-[#872bf5] text-white font-extrabold px-6 py-3 rounded-2xl text-xs hover:bg-[#7417e3] transition flex items-center gap-1.5 shadow-lg shadow-[#872bf5]/30 hover:scale-105 active:scale-95 disabled:opacity-40"
                    >
                      <span>Send</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                <MessageSquare className="w-12 h-12 text-[#872bf5] mb-3" />
                <h3 className="text-base font-bold text-white">No Friends Selected</h3>
                <p className="text-xs text-zinc-500 max-w-sm mt-1 font-medium">
                  After a 60-minute chat session, if you both click "Keep Friendship", you can chat here permanently!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Vent Wall */}
        {activeTab === "vent" && (
          <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6 relative z-10">
            <div>
              <h1 className="text-2xl font-black text-white">Anonymous Vent Wall</h1>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Post anything on your mind. Send and receive virtual hugs from the community with zero judgment.
              </p>
            </div>

            <form onSubmit={handlePostVent} className="p-5 rounded-3xl bg-[#181824] border border-white/5 space-y-3">
              <textarea
                rows={3}
                placeholder="What is weighing on your mind today? (100% anonymous)"
                value={newVentContent}
                onChange={(e) => setNewVentContent(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-[#872bf5]"
              />

              <div className="flex items-center justify-between">
                <select
                  value={newVentCategory}
                  onChange={(e) => setNewVentCategory(e.target.value)}
                  className="bg-[#121218] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="Peace & Healing">🕊️ Peace & Healing</option>
                  <option value="Career & Studies">💼 Career & Studies</option>
                  <option value="Late Night Thoughts">🌙 Late Night Thoughts</option>
                  <option value="Relationships">💔 Relationships</option>
                </select>

                <button
                  type="submit"
                  className="bg-[#872bf5] hover:bg-[#7417e3] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition shadow-md shadow-[#872bf5]/20 hover:scale-105 active:scale-95"
                >
                  Post Anonymously
                </button>
              </div>
            </form>

            <div className="space-y-3.5">
              {ventPosts.map((post) => (
                <div key={post.id} className="p-5 rounded-3xl bg-[#181824] border border-white/5 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{post.avatar || "🌙"}</span>
                      <span className="text-xs font-bold text-white">{post.anonymousName}</span>
                      <span className="text-[10px] text-zinc-500">• {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-medium">{post.content}</p>
                  </div>

                  <button
                    onClick={() => handleHugVent(post.id)}
                    className="p-2.5 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 flex items-center gap-1.5 text-xs font-bold transition shrink-0 hover:scale-105 active:scale-95"
                  >
                    <Heart className="w-3.5 h-3.5 fill-pink-500" />
                    <span>{post.hugsCount || 0} Hugs</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: Daily Question */}
        {activeTab === "daily_q" && (
          <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6 relative z-10">
            <div>
              <h1 className="text-2xl font-black text-white">Daily Reflection Question</h1>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                One new question every day to reflect and read perspectives from friends around the world.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#181824] border border-white/5 space-y-4 shadow-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#872bf5]/20 border border-[#872bf5]/30 text-[10px] font-black text-purple-300">
                <Sparkles className="w-3 h-3" />
                <span>Today's Question</span>
              </div>

              <h2 className="text-lg md:text-xl font-black text-white">
                "{dailyQuestion?.question || "What is something you are silently proud of achieving that nobody noticed?"}"
              </h2>

              <form onSubmit={handlePostDailyAnswer} className="space-y-3">
                <textarea
                  rows={2}
                  placeholder="Write your reflection..."
                  value={myAnswer}
                  onChange={(e) => setMyAnswer(e.target.value)}
                  className="w-full bg-[#121218] border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-[#872bf5]"
                />
                <button
                  type="submit"
                  className="bg-[#872bf5] hover:bg-[#7417e3] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition hover:scale-105 active:scale-95 shadow-md shadow-[#872bf5]/30"
                >
                  Submit Answer
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">{dailyAnswers.length} Community Answers</h3>
              {dailyAnswers.map((ans) => (
                <div key={ans.id} className="p-4 rounded-2xl bg-[#181824] border border-white/5 flex items-start gap-3">
                  <span className="text-xl">{ans.avatar || "✨"}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{ans.anonymousName}</div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed font-medium">{ans.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FLOATING ACTION BUTTON (Only shown on Chat Home so it never covers Direct Message send button) */}
        {activeTab === "chat_home" && (
          <button
            onClick={() => setShowCategoryModal(true)}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#872bf5] hover:bg-[#7417e3] text-white flex items-center justify-center shadow-2xl shadow-[#872bf5]/60 hover:scale-110 active:scale-95 transition z-40"
            title="Instant 1-Click Match"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}
      </main>

      {/* CATEGORY & MOOD PICKER MODAL */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#181824] border border-white/15 rounded-[32px] p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Pick Your Conversation Room</h3>
                <p className="text-xs text-zinc-400 font-medium">1 tap to launch matching radar</p>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">Choose Room Category</label>
              <div className="grid grid-cols-2 gap-2.5">
                {INTENT_ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setSelectedIntent(zone.id)}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      selectedIntent === zone.id
                        ? "bg-[#872bf5]/30 border-[#872bf5] text-white shadow-md shadow-[#872bf5]/20"
                        : "bg-[#121218] border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{zone.emoji}</span>
                      <span className="text-xs font-extrabold text-white">{zone.name}</span>
                    </div>
                    <div className="text-[10px] text-purple-300 mt-1 line-clamp-1">{zone.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-2">Current Topic / Mood</label>
              <select
                value={selectedMood}
                onChange={(e) => setSelectedMood(e.target.value)}
                className="w-full bg-[#121218] border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-[#872bf5]"
              >
                {MOODS.map((m) => (
                  <option key={m.id} value={m.label} className="bg-[#121218] text-white">
                    {m.emoji} {m.label} ({m.hint})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => handleStartMatchmaking(false)}
                className="flex-1 bg-[#872bf5] hover:bg-[#7417e3] text-white font-black py-3.5 rounded-2xl text-xs transition shadow-xl shadow-[#872bf5]/40 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>Start Matchmaking Radar</span>
              </button>

              <button
                onClick={() => handleStartMatchmaking(true)}
                className="px-4 bg-[#121218] hover:bg-[#1f202c] border border-white/10 text-purple-300 font-bold text-xs rounded-2xl transition hover:scale-105 active:scale-95"
                title="Instant AI Companion"
              >
                AI Instant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RADAR MATCHMAKING OVERLAY */}
      {isMatching && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181824] border border-white/15 rounded-[32px] p-8 text-center space-y-6 shadow-2xl">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#872bf5]/40 animate-radar-1" />
              <div className="absolute inset-0 rounded-full border border-purple-400/40 animate-radar-2" />
              <div className="absolute inset-0 rounded-full border border-white/40 animate-radar-3" />
              <div className="w-14 h-14 rounded-full bg-[#872bf5] flex items-center justify-center text-2xl shadow-xl shadow-[#872bf5]/50 z-10">
                {currentUser?.avatar || "🌙"}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Scanning Active Rooms</h3>
              <p className="text-xs text-zinc-400 mt-1.5">{matchStatus}</p>
              <div className="text-xs font-mono font-bold text-purple-300 mt-2">{matchSearchSeconds}s elapsed</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelMatch}
                className="flex-1 border border-white/10 py-3 rounded-2xl text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={() => handleStartMatchmaking(true)}
                className="flex-1 bg-[#872bf5] hover:bg-[#7417e3] text-white font-bold py-3 rounded-2xl text-xs transition hover:scale-105 active:scale-95"
              >
                Switch to AI (Instant)
              </button>
            </div>
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

      {/* FRIEND REQUESTS MODAL */}
      {showFriendRequestsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#872bf5]" />
                <h3 className="text-sm font-black text-white">Friend Requests</h3>
              </div>
              <button
                onClick={() => setShowFriendRequestsModal(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {friendRequests.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-500">
                  No pending friend requests.
                </div>
              ) : (
                friendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-2xl bg-[#121218] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl">{req.sender?.avatar || "🌙"}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-white truncate">
                          {req.sender?.username}
                        </div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          {req.sender?.bio || "Wants to connect!"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="p-2 px-3 rounded-xl bg-[#872bf5] hover:bg-[#7417e3] text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-[#872bf5]/30"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs transition"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setShowFriendRequestsModal(false);
                  setShowAddFriendModal(true);
                }}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-purple-300 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Add Friend by Username</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FRIEND BY USERNAME MODAL */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#181824] border border-white/15 rounded-[32px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#872bf5]" />
                <h3 className="text-sm font-black text-white">Add Friend by Handle</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddFriendModal(false);
                  setAddFriendStatus(null);
                }}
                className="p-2 rounded-xl text-zinc-400 hover:text-white bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addFriendStatus && (
              <div className="p-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-semibold animate-fade-in">
                {addFriendStatus}
              </div>
            )}

            <form onSubmit={handleSendRequestByName} className="space-y-3">
              <input
                type="text"
                placeholder="Enter exact username (e.g. NightOwl_42)..."
                value={searchFriendUsername}
                onChange={(e) => setSearchFriendUsername(e.target.value)}
                required
                className="w-full bg-[#121218] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5] transition"
              />

              <button
                type="submit"
                disabled={!searchFriendUsername.trim()}
                className="w-full bg-[#872bf5] hover:bg-[#7417e3] disabled:opacity-40 text-white font-black py-3 rounded-2xl text-xs transition shadow-lg shadow-[#872bf5]/30 hover:scale-105 active:scale-95"
              >
                Send Friend Request 🤝
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 4. Mobile Bottom Navigation Bar (Visible only on mobile screens) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#181824]/95 backdrop-blur-lg border-t border-white/10 px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => setActiveTab("chat_home")}
          className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
            activeTab === "chat_home" ? "text-[#872bf5]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>

        <button
          onClick={() => setShowCategoryModal(true)}
          className="p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold text-purple-300"
        >
          <Zap className="w-4 h-4 fill-purple-400" />
          <span>Match</span>
        </button>

        <button
          onClick={() => setActiveTab("friends")}
          className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
            activeTab === "friends" ? "text-[#872bf5]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Friends</span>
        </button>

        <button
          onClick={() => setShowFriendRequestsModal(true)}
          className="p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold text-zinc-400 hover:text-white relative"
        >
          <UserPlus className="w-4 h-4" />
          <span>Requests</span>
          {friendRequests.length > 0 && (
            <span className="absolute top-1 right-2 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-black text-white flex items-center justify-center animate-pulse">
              {friendRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("vent")}
          className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
            activeTab === "vent" ? "text-[#872bf5]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Vent</span>
        </button>

        <button
          onClick={() => setActiveTab("daily_q")}
          className={`p-2 rounded-xl flex flex-col items-center gap-0.5 text-[10px] font-bold transition ${
            activeTab === "daily_q" ? "text-[#872bf5]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Daily</span>
        </button>
      </nav>

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
    </div>
  );
}
