"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AVATARS, INTENT_ZONES, SOCIAL_GROUPS, MOODS } from "@/lib/data";
import { ShieldCheck, Sparkles, Dices, ArrowRight, Check } from "lucide-react";

export default function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("🌙");
  const [activeRole, setActiveRole] = useState("PROBLEM_FACER");
  const [intent, setIntent] = useState("PEACE");
  const [socialGroup, setSocialGroup] = useState("OPEN");
  const [mood, setMood] = useState("Stressed & Overwhelmed");
  const [agreed, setAgreed] = useState(true);
  const [honeypot, setHoneypot] = useState(""); // Anti-bot honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const RANDOM_NAMES = [
    "NightOwl_42", "CosmicWanderer", "PixelSamurai", "VelvetDreamer", "SilentNomad", "ZenExplorer", "AuraSeeker", "NeonVoyager"
  ];

  function generateRandomHandle() {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + "_" + Math.floor(10 + Math.random() * 90);
    setUsername(random);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please choose an anonymous username");
      return;
    }

    if (!agreed) {
      setError("Please accept the community safety agreement");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || undefined,
          password: password || undefined,
          avatar,
          activeRole,
          intent,
          socialGroup,
          mood,
          website: honeypot, // Pass honeypot
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign up");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070709] text-white flex items-center justify-center p-6 py-12">
      <div className="w-full max-w-xl">
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
            Create Your Anonymous Persona
          </h1>
          <p className="text-zinc-400 text-xs mt-2">
            No real identity required. 100% confidential and judgment-free.
          </p>
        </div>

        {/* Card */}
        <div className="border border-white/10 bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
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

            {/* Avatar Picker */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Choose Your Avatar
              </label>
              <div className="flex items-center gap-2 flex-wrap bg-black/40 p-3 rounded-2xl border border-white/5">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition ${
                      avatar === a
                        ? "bg-amber-400 scale-110 shadow-lg shadow-amber-400/30"
                        : "bg-zinc-800/60 hover:bg-zinc-700"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Username with Dice Button */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-zinc-300">
                  Anonymous Username
                </label>
                <button
                  type="button"
                  onClick={generateRandomHandle}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:underline"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Randomize Handle</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="e.g. NightOwl_42"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-400 transition"
              />
            </div>

            {/* Role Preference */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                How do you want to start today?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "PROBLEM_FACER", label: "👤 Problem Facer", desc: "Seek guidance" },
                  { id: "GUIDER", label: "🧭 Guider", desc: "Help & listen" },
                  { id: "CASUAL_CHILL", label: "☕ Casual Chill", desc: "Just talk" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setActiveRole(r.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      activeRole === r.id
                        ? "bg-amber-400/10 border-amber-400 text-amber-300"
                        : "bg-black/30 border-white/5 text-zinc-400 hover:border-white/20"
                    }`}
                  >
                    <div className="text-xs font-bold">{r.label}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Intent Zone */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Your Primary Conversation Intent
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INTENT_ZONES.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setIntent(zone.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      intent === zone.id
                        ? "bg-white/10 border-amber-400 text-white"
                        : "bg-black/30 border-white/5 text-zinc-400 hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{zone.emoji}</span>
                      <span className="text-xs font-bold text-white">{zone.name}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1 line-clamp-1">{zone.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Social Group */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Select Your Social Circle
              </label>
              <select
                value={socialGroup}
                onChange={(e) => setSocialGroup(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-400"
              >
                {SOCIAL_GROUPS.map((g) => (
                  <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                    {g.emoji} {g.name} — {g.tagline}
                  </option>
                ))}
              </select>
            </div>

            {/* Email & Password (Optional for quick starts) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="For account recovery"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Safety Pledge */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20">
              <input
                type="checkbox"
                id="safety-pledge"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-amber-400 focus:ring-0"
              />
              <label htmlFor="safety-pledge" className="text-[11px] text-zinc-300 cursor-pointer">
                I agree to respect boundaries, maintain anonymity, and uphold a zero-tolerance policy against harassment.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-400 text-black font-bold py-3.5 rounded-xl text-sm hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Creating Persona...</span>
              ) : (
                <>
                  <span>Enter One Hour Friend</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-xs text-zinc-400 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-400 hover:underline font-medium">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}