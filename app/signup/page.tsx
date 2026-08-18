"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AVATARS } from "@/lib/data";
import AnimatedBackground from "@/components/AnimatedBackground";
import { Dices, ArrowRight, Mail, KeyRound, CheckCircle2, RefreshCw } from "lucide-react";

export default function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("🌙");
  const [agreed, setAgreed] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const RANDOM_NAMES = [
    "NightOwl_42", "CosmicWanderer", "PixelSamurai", "VelvetDreamer", "SilentNomad", "ZenExplorer", "AuraSeeker", "NeonVoyager", "AstroGuy_77", "LunaSoul_9"
  ];

  function generateRandomHandle() {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)] + "_" + Math.floor(10 + Math.random() * 90);
    setUsername(random);
  }

  async function handleSendOtp() {
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address first");
      return;
    }

    setOtpLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      setOtpSent(true);
      if (data.previewCode) {
        setPreviewOtp(data.previewCode);
      }
      setSuccessMsg(`Verification code sent to ${email.trim()}`);
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please choose an anonymous handle");
      return;
    }

    if (email.trim() && !otp.trim()) {
      setError("Please enter the 6-digit email verification code");
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
          otp: otp.trim() || undefined,
          password: password || undefined,
          avatar,
          activeRole: "PROBLEM_FACER",
          intent: "PEACE",
          socialGroup: "OPEN",
          mood: "Need to vent",
          website: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create persona");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
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
            Create Your Persona
          </h1>
          <p className="text-purple-200 text-xs mt-1.5 font-medium">
            100% anonymous, bot-protected & instant access.
          </p>
        </div>

        {/* Card */}
        <div className="border border-white/15 bg-[#121218] rounded-[32px] p-7 md:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {previewOtp && (
            <div className="p-3 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>Verification Code: <strong className="font-mono text-white text-sm tracking-wider">{previewOtp}</strong></span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(previewOtp)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg bg-[#872bf5] hover:bg-[#7417e3] text-white transition"
              >
                Auto-Fill
              </button>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
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
              <label className="block text-xs font-bold text-zinc-300 mb-2">
                Choose Your Avatar
              </label>
              <div className="flex items-center gap-2 flex-wrap bg-[#181824] p-2.5 rounded-2xl border border-white/5">
                {AVATARS.slice(0, 10).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition ${
                      avatar === a
                        ? "bg-[#872bf5] text-white scale-110 shadow-lg shadow-[#872bf5]/40"
                        : "bg-white/[0.04] hover:bg-white/10"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Anonymous Handle */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-zinc-300">
                  Anonymous Handle
                </label>
                <button
                  type="button"
                  onClick={generateRandomHandle}
                  className="flex items-center gap-1 text-[11px] text-purple-300 hover:underline font-bold"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Randomize</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="e.g. NightOwl_42"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#181824] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5] transition"
              />
            </div>

            {/* Email with Verification Code (Anti-Bot) */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Email Address (Anti-Bot Verification)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#181824] border border-white/10 rounded-2xl pl-9 pr-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5] transition"
                  />
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !email.trim()}
                  className="bg-[#872bf5] hover:bg-[#7417e3] disabled:opacity-40 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-1 shrink-0"
                >
                  {otpLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>{otpSent ? "Resend" : "Send OTP"}</span>}
                </button>
              </div>
            </div>

            {/* 6-Digit OTP Box (Shows once OTP is requested) */}
            {otpSent && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="block text-xs font-bold text-purple-300">
                  Enter 6-Digit Email Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    className="w-full bg-[#181824] border border-[#872bf5] rounded-2xl pl-9 pr-4 py-3 text-sm font-mono tracking-widest text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-[#872bf5] transition"
                  />
                  <KeyRound className="w-4 h-4 text-purple-400 absolute left-3 top-3.5" />
                </div>
              </div>
            )}

            {/* Optional Password */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Password (Optional)
              </label>
              <input
                type="password"
                placeholder="Leave blank for instant 1-click access"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#181824] border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-[#872bf5] transition"
              />
            </div>

            {/* Safety Pledge */}
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
              <input
                type="checkbox"
                id="safety-pledge"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 rounded border-white/20 text-[#872bf5] focus:ring-0"
              />
              <label htmlFor="safety-pledge" className="text-[11px] text-zinc-400 cursor-pointer leading-snug">
                I agree to respect boundaries, maintain anonymity, and uphold a zero-tolerance policy for abuse.
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#872bf5] hover:bg-[#7417e3] text-white font-black py-3.5 rounded-2xl text-xs transition shadow-xl shadow-[#872bf5]/40 flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <span>Verifying & Entering...</span>
              ) : (
                <>
                  <span>Enter One Hour Friend</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-xs text-zinc-400 pt-3 border-t border-white/5">
            Already have an account?{" "}
            <Link href="/login" className="text-purple-300 hover:underline font-bold">
              Sign In here
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}