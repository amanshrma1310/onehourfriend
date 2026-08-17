"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { INTENT_ZONES, SOCIAL_GROUPS } from "@/lib/data";
import AnimatedBackground from "@/components/AnimatedBackground";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Users,
  MessageSquare,
  Heart,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#872bf5] text-white flex flex-col relative overflow-hidden selection:bg-white selection:text-[#872bf5]">
      {/* Dynamic Animated Background System */}
      <AnimatedBackground />

      {/* Top Navbar */}
      <header className="border-b border-white/15 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#872bf5] font-black flex items-center justify-center text-base shadow-xl shadow-black/20 hover:scale-105 transition">
              1H
            </div>
            <div>
              <span className="font-black text-sm tracking-wider text-white">
                ONE HOUR FRIEND
              </span>
              <span className="block text-[10px] text-purple-200 font-medium -mt-0.5">
                Anonymous 60-Min Safe Space
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="bg-white hover:bg-zinc-100 text-[#872bf5] font-black text-xs px-6 py-2.5 rounded-2xl transition shadow-xl shadow-black/20 flex items-center gap-2 hover:scale-105 active:scale-95"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-bold text-white hover:text-white px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 transition backdrop-blur-md"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-white hover:bg-zinc-100 text-[#872bf5] font-black text-xs px-6 py-2.5 rounded-2xl transition shadow-xl shadow-black/20 flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/30 border border-white/25 text-xs font-black text-white backdrop-blur-md shadow-2xl hover:scale-105 transition">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00e676] animate-pulse shadow-md shadow-[#00e676]" />
            <span>100% Anonymous • 60-Minute Real Conversation • Zero Judgment</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-lg">
            One Hour. One Stranger. <br />
            <span className="text-purple-100">One Real Conversation.</span>
          </h1>

          <p className="text-sm md:text-base text-purple-100 max-w-2xl mx-auto leading-relaxed font-medium">
            Connect 1-on-1 with an anonymous stranger for 60 minutes. Vent heavy stress, discuss tech & career roadmaps, or enjoy spontaneous late-night talks.
          </p>

          {/* Action Trigger Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={user ? "/dashboard" : "/signup"}
              className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-[#872bf5] font-black text-sm px-9 py-4 rounded-2xl transition shadow-2xl shadow-black/40 flex items-center justify-center gap-2.5 hover:scale-105 active:scale-95 group"
            >
              <Zap className="w-4 h-4 fill-[#872bf5]" />
              <span>⚡ Find Someone to Talk To</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto bg-black/35 hover:bg-black/45 border border-white/25 text-white font-bold text-sm px-7 py-4 rounded-2xl transition backdrop-blur-md flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>1-Click Demo Personas</span>
            </Link>
          </div>

          {/* Floating Mockup Preview Card */}
          <div className="pt-8 max-w-4xl mx-auto">
            <div className="bg-[#121218] border border-white/20 rounded-[36px] p-6 md:p-8 shadow-2xl text-left grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden group">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-white">
                  <h3 className="text-lg font-black tracking-tight">Messages</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#00e676] font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse" />
                    <span>Live Matching Active</span>
                  </div>
                </div>

                {/* Horizontal Active Stories */}
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {[
                    { name: "Alex", avatar: "👨‍💻" },
                    { name: "Isabella", avatar: "🌸" },
                    { name: "Karla", avatar: "🎨" },
                    { name: "Ethan", avatar: "⚡" },
                  ].map((p, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 shrink-0">
                      <div className="relative w-12 h-12 rounded-full bg-[#181824] border-2 border-[#872bf5] flex items-center justify-center text-xl shadow-md">
                        {p.avatar}
                        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00e676] ring-2 ring-[#121218]" />
                      </div>
                      <span className="text-[10px] text-zinc-300 font-bold">{p.name}</span>
                    </div>
                  ))}
                </div>

                {/* Crisp White Message Card */}
                <div className="bg-white rounded-[28px] p-4 text-black space-y-3 shadow-xl">
                  {[
                    { name: "Empathetic Guide", snippet: "Take a deep breath, you're not alone.", time: "12:25 PM", avatar: "🌿" },
                    { name: "Tech Mentor", snippet: "Here is the roadmap for React & Node...", time: "11:40 AM", avatar: "💻" },
                    { name: "Night Owl", snippet: "Late night thoughts are the realest!", time: "1:15 AM", avatar: "🌙" },
                  ].map((chat, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{chat.avatar}</span>
                        <div>
                          <div className="text-xs font-black text-black">{chat.name}</div>
                          <div className="text-[11px] text-zinc-500 line-clamp-1">{chat.snippet}</div>
                        </div>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-semibold">{chat.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Active Chat Room Mockup */}
              <div className="bg-[#181824] rounded-[28px] p-5 border border-white/10 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">👨‍💻</span>
                    <div>
                      <div className="text-xs font-black text-white">Alex (Guider)</div>
                      <div className="text-[10px] text-[#00e676] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00e676]" />
                        <span>Active 60-Min Session</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-200 px-3 py-1 rounded-full bg-[#872bf5]/30">
                    54:20
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-[#20202c] text-white p-3 rounded-2xl rounded-bl-none max-w-[85%]">
                    Hey! What is taking up the most headspace for you today?
                  </div>
                  <div className="bg-[#872bf5] text-white p-3 rounded-2xl rounded-br-none max-w-[85%] ml-auto font-medium shadow-md">
                    Feeling a bit stuck on choosing my career roadmap.
                  </div>
                  <div className="bg-[#20202c] text-white p-3 rounded-2xl rounded-bl-none max-w-[85%]">
                    Let's break it down step-by-step. You have a full hour!
                  </div>
                </div>

                <div className="bg-[#121218] border border-white/10 rounded-2xl p-2.5 flex items-center justify-between">
                  <span className="text-xs text-zinc-400 pl-2">Type a message...</span>
                  <span className="bg-[#872bf5] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl">
                    Send
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Intent Zones */}
      <section className="py-12 px-6 max-w-7xl mx-auto w-full z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-sm">4 Protected Intent Rooms</h2>
          <p className="text-xs text-purple-200 mt-1 font-medium">Matched exclusively with users who share your exact purpose.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INTENT_ZONES.map((zone) => (
            <div
              key={zone.id}
              className="p-6 rounded-3xl bg-[#121218] border border-white/10 hover:border-[#872bf5] hover:scale-105 transition shadow-2xl"
            >
              <div className="text-3xl mb-3">{zone.emoji}</div>
              <h3 className="text-base font-black text-white">{zone.name}</h3>
              <div className="text-xs text-purple-300 font-bold mt-0.5">{zone.tagline}</div>
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-medium">{zone.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/15 bg-black/20 py-8 px-6 text-center text-xs text-purple-200 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white text-[#872bf5] font-black flex items-center justify-center text-xs">
              1H
            </div>
            <span className="font-black text-white">ONE HOUR FRIEND</span>
          </div>
          <p>© 2026 One Hour Friend • 100% Anonymous & Free.</p>
        </div>
      </footer>
    </div>
  );
}