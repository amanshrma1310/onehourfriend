"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SOCIAL_GROUPS, INTENT_ZONES, MOODS } from "@/lib/data";
import {
  ShieldCheck,
  Clock,
  HeartHandshake,
  Sparkles,
  Users,
  MessageSquare,
  Lock,
  ArrowRight,
  UserCheck,
  Compass,
} from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("peace");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const filteredMoods = MOODS.filter((m) => m.category === selectedCategory);

  return (
    <main className="min-h-screen flex flex-col bg-[#070709] text-white">
      {/* Top Banner: Safe Space Assurance */}
      <div className="bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-purple-500/10 border-b border-white/5 py-2 px-4 text-center text-xs text-zinc-400">
        🛡️ <span className="text-zinc-200 font-medium">100% Anonymous & Protected:</span> Strictly separated zones for peace, guidance, and friendships.
      </div>

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
            1H
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white block">
              ONE HOUR FRIEND
            </span>
            <span className="text-[10px] text-amber-400/90 tracking-widest uppercase font-medium">
              Anonymous 1-on-1 Guidance & Chat
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-amber-400 text-black px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"
            >
              <span>{user.avatar}</span>
              <span>Dashboard ({user.username})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-300 hover:text-white transition px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-amber-400 text-black px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-amber-300 transition shadow-lg shadow-amber-400/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-6 max-w-6xl mx-auto w-full text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/5 text-amber-400 text-xs font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>1,420+ Members Online Right Now</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl mx-auto">
          60 minutes. <br className="hidden md:inline" />
          One stranger. <br />
          <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            One real conversation.
          </span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl mt-7 max-w-2xl mx-auto font-normal leading-relaxed">
          Whether you need to <strong className="text-zinc-200">vent stress</strong>, seek <strong className="text-zinc-200">life guidance</strong>, or just have a <strong className="text-zinc-200">wholesome talk</strong> when you're bored. Connect 1-on-1 anonymously for exactly 1 hour.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href={user ? "/dashboard" : "/signup"}
            className="w-full sm:w-auto bg-amber-400 text-black font-bold px-8 py-4 rounded-full text-base hover:bg-amber-300 transition shadow-xl shadow-amber-400/25 flex items-center justify-center gap-2"
          >
            <span>Find Someone to Talk To</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium px-8 py-4 rounded-full text-base hover:bg-zinc-800 hover:text-white transition"
          >
            Try 1-Click Demo Account
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-14 pt-8 border-t border-white/5">
          <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-200">100% Anonymous</div>
              <div className="text-[11px] text-zinc-500">No photos or real names</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <Clock className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Strict 60-Min Timer</div>
              <div className="text-[11px] text-zinc-500">Zero clingy pressure</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Safety Shield</div>
              <div className="text-[11px] text-zinc-500">1-click panic exit & block</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <HeartHandshake className="w-5 h-5 text-pink-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-zinc-200">Keep Connection</div>
              <div className="text-[11px] text-zinc-500">Become friends if both agree</div>
            </div>
          </div>
        </div>
      </section>

      {/* Intent Zones: No Mismatched Intentions */}
      <section className="py-16 px-6 bg-zinc-950/60 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
              Protected Intent Zones
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
              No Awkward Surprises. Matched by Purpose.
            </h2>
            <p className="text-zinc-400 text-sm mt-3">
              If you come for peace, you will never be matched with someone looking for flirting. Every zone is strictly separated.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {INTENT_ZONES.map((zone) => (
              <div
                key={zone.id}
                className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/15 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl">{zone.emoji}</span>
                    <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${zone.color}`}>
                      {zone.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">{zone.name}</h3>
                  <div className={`text-xs font-medium mt-1 ${zone.color}`}>{zone.tagline}</div>
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                    {zone.description}
                  </p>
                </div>

                <Link
                  href={user ? "/dashboard" : "/signup"}
                  className="mt-6 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white pt-4 border-t border-white/5"
                >
                  <span>Enter {zone.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Groups / Circles */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-teal-400 text-xs font-semibold uppercase tracking-wider">
            Communities & Circles
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">
            Find Your Comfort Circle
          </h2>
          <p className="text-zinc-400 text-sm mt-3">
            Choose where you feel safest talking — whether in dedicated spaces for guys, girls, students, or night owls.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SOCIAL_GROUPS.map((group) => (
            <div
              key={group.id}
              className={`p-6 rounded-2xl bg-gradient-to-br ${group.bgGradient} border backdrop-blur-sm transition`}
            >
              <div className="text-3xl mb-4">{group.emoji}</div>
              <h3 className="text-lg font-bold text-white">{group.name}</h3>
              <div className={`text-xs font-medium mt-1 ${group.color}`}>
                {group.tagline}
              </div>
              <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                {group.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live Mood Explorer */}
      <section className="py-16 px-6 bg-zinc-950/80 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
              Express Yourself
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
              What are you feeling right now?
            </h2>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
            {[
              { id: "peace", label: "🕊️ Peace & Venting" },
              { id: "guidance", label: "🧭 Career & Growth" },
              { id: "casual", label: "☕ Bored / Chill" },
              { id: "spark", label: "💫 Spark & Fun" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  selectedCategory === tab.id
                    ? "bg-amber-400 text-black shadow-md shadow-amber-400/20"
                    : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Mood Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredMoods.map((m) => (
              <Link
                key={m.id}
                href={user ? "/dashboard" : "/signup"}
                className="p-4 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-amber-400/30 transition text-left group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition origin-left">{m.emoji}</div>
                <div className="text-sm font-semibold text-white">{m.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{m.hint}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Community Features Preview */}
      <section className="py-16 px-6 max-w-6xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/10 text-teal-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Community Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              No Guider Available? <br />
              <span className="text-amber-400">You Are Never Left Alone.</span>
            </h2>
            <p className="text-zinc-400 text-sm mt-4 leading-relaxed">
              If nobody is active in your exact topic at 3 AM, our <strong className="text-zinc-200">AI Compassionate Companion</strong> steps in immediately, or you can drop a thought on the <strong className="text-zinc-200">Anonymous Vent Wall</strong> and answer today's daily question.
            </p>

            <div className="space-y-4 mt-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center text-xs shrink-0 mt-0.5">✨</div>
                <div>
                  <div className="text-sm font-semibold text-white">AI Companion Guider</div>
                  <div className="text-xs text-zinc-400">Instant compassionate listener ready 24/7 with zero waiting time.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-400/10 text-purple-400 flex items-center justify-center text-xs shrink-0 mt-0.5">📢</div>
                <div>
                  <div className="text-sm font-semibold text-white">Anonymous Vent Wall</div>
                  <div className="text-xs text-zinc-400">Share your thoughts anonymously and receive warm virtual hugs.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-pink-400/10 text-pink-400 flex items-center justify-center text-xs shrink-0 mt-0.5">🎴</div>
                <div>
                  <div className="text-sm font-semibold text-white">Daily Reflection Question</div>
                  <div className="text-xs text-zinc-400">One thought-provoking question every day for the whole community.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Today's Question</div>
            <div className="text-xl font-bold text-white mb-6">
              "What is something you are silently proud of achieving that nobody noticed?"
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 flex items-center gap-3">
                <span className="text-lg">🌙</span>
                <span className="italic">"I woke up and went for a run even though I felt like staying in bed all day."</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 flex items-center gap-3">
                <span className="text-lg">⚡</span>
                <span className="italic">"Finally completed a full coding project after 3 months of self-doubt."</span>
              </div>
            </div>

            <Link
              href={user ? "/dashboard" : "/signup"}
              className="mt-6 block text-center bg-amber-400 text-black py-3 rounded-xl font-semibold text-xs hover:bg-amber-300 transition"
            >
              Answer Today's Question →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 py-10 px-6 bg-black/60 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <div className="text-white font-bold text-sm tracking-wide">ONE HOUR FRIEND</div>
            <div className="mt-1">Anonymous 60-Minute Conversations & Guided Support.</div>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-zinc-400">Respect • Empathy • Anonymity</span>
            <span>© 2026 One Hour Friend</span>
          </div>
        </div>
      </footer>
    </main>
  );
}