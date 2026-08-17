"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/data";
import AnimatedBackground from "@/components/AnimatedBackground";
import { ArrowRight, Sparkles, KeyRound, User } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoadingIndex, setDemoLoadingIndex] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          website: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin(index: number) {
    setError("");
    setDemoLoadingIndex(index);

    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed demo login");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed demo login");
    } finally {
      setDemoLoadingIndex(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#872bf5] text-white flex items-center justify-center p-6 py-12 relative overflow-hidden selection:bg-white selection:text-[#872bf5]">
      {/* Animated Background System */}
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 hover:scale-105 transition">
            <div className="w-10 h-10 rounded-2xl bg-white text-[#872bf5] font-black flex items-center justify-center text-sm shadow-xl shadow-black/20">
              1H
            </div>
            <span className="text-sm font-black tracking-wider text-white">
              ONE HOUR FRIEND
            </span>
          </Link>

          <h1 className="text-3xl font-black text-white drop-shadow-md">
            Welcome Back
          </h1>
          <p className="text-purple-200 text-xs mt-1.5 font-medium">
            Sign in to start your 60-minute conversation.
          </p>
        </div>

        {/* Card */}
        <div className="border border-white/15 bg-[#121218] rounded-[32px] p-7 md:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ display: "none", position: "absolute", left: "-9999px" }}
            />

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Anonymous Handle or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. NightOwl_42"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full bg-[#181824] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5]"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#181824] border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5]"
                />
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#872bf5] hover:bg-[#7417e3] text-white font-black py-3.5 rounded-2xl text-xs transition shadow-xl shadow-[#872bf5]/40 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-4">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[10px] uppercase font-black text-zinc-500 tracking-wider">
              1-Click Fast Personas
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <div className="space-y-2">
            {DEMO_USERS.map((demo, idx) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleDemoLogin(idx)}
                disabled={demoLoadingIndex !== null}
                className="w-full p-3 rounded-2xl bg-[#181824] hover:bg-[#202030] border border-white/5 hover:border-[#872bf5]/50 text-left transition flex items-center justify-between group disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{demo.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                      {demo.username}
                    </div>
                    <div className="text-[10px] text-purple-300 font-medium">
                      {demo.intent} Room • {demo.mood}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-purple-400 group-hover:text-purple-300 font-bold">
                  {demoLoadingIndex === idx ? "Logging in..." : "Login →"}
                </span>
              </button>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-400 pt-3 border-t border-white/5">
            Don't have an account?{" "}
            <Link href="/signup" className="text-purple-300 hover:underline font-bold">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}