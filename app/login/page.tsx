"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEMO_USERS } from "@/lib/data";
import { ArrowRight, Sparkles, KeyRound, User } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot
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
          website: honeypot, // Pass honeypot
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
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-black font-bold flex items-center justify-center text-sm">
              1H
            </div>
            <span className="text-sm font-bold tracking-wider text-zinc-300">
              ONE HOUR FRIEND
            </span>
          </Link>

          <h1 className="text-3xl font-extrabold text-white">
            Welcome Back 👋
          </h1>
          <p className="text-zinc-400 text-xs mt-2">
            Ready for your next meaningful 60-minute conversation?
          </p>
        </div>

        {/* Card */}
        <div className="border border-white/10 bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Anti-Bot Honeypot (Invisible to humans) */}
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
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. NightOwl_42"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-black font-bold py-3.5 rounded-xl text-xs hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
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

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Or 1-Click Instant Testing
            </span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          {/* 1-Click Demo Accounts */}
          <div className="space-y-2">
            {DEMO_USERS.map((demo, idx) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => handleDemoLogin(idx)}
                disabled={demoLoadingIndex !== null}
                className="w-full p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-amber-400/30 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{demo.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-amber-300">
                      {demo.username}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {demo.role === "PROBLEM_FACER" ? "👤 Seeker" : demo.role === "GUIDER" ? "🧭 Guider" : "☕ Casual"} • {demo.intent} Zone
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 group-hover:text-amber-400 font-semibold">
                  {demoLoadingIndex === idx ? "Logging in..." : "Login →"}
                </span>
              </button>
            ))}
          </div>

          {/* Signup Link */}
          <p className="text-center text-xs text-zinc-400 mt-6 pt-4 border-t border-white/5">
            Don't have an account?{" "}
            <Link href="/signup" className="text-amber-400 hover:underline font-medium">
              Create one for free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}