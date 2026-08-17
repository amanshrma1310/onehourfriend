"use client";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Animated Shifting Aurora Glow */}
      <div className="absolute inset-0 animate-aurora opacity-30" />

      {/* 2. Cyber Dot Pattern Overlay */}
      <div className="absolute inset-0 bg-dot-pattern opacity-40" />

      {/* 3. Center Concentric Pulsing Radar Rings */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full border border-white/25 animate-concentric-1">
        {/* Orbiting Satellite Dot 1 */}
        <div className="absolute inset-0 animate-orbit-fast">
          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-white/80 -top-1.5 left-1/2 -translate-x-1/2" />
        </div>
      </div>

      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] rounded-full border border-white/20 animate-concentric-2">
        {/* Orbiting Satellite Dot 2 */}
        <div className="absolute inset-0 animate-orbit-medium">
          <div className="w-2.5 h-2.5 rounded-full bg-[#00e676] shadow-md shadow-[#00e676] -top-1.5 left-1/3" />
        </div>
      </div>

      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[940px] h-[940px] rounded-full border border-white/15 animate-concentric-3">
        {/* Orbiting Satellite Dot 3 */}
        <div className="absolute inset-0 animate-orbit-slow">
          <div className="w-3 h-3 rounded-full bg-purple-200 shadow-md shadow-purple-300 top-1/4 -left-1.5" />
        </div>
      </div>

      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1300px] h-[1300px] rounded-full border border-white/10 animate-concentric-4" />

      {/* 4. Floating Ambient Glowing Bokeh Spheres */}
      <div className="absolute top-16 left-12 w-80 h-80 rounded-full bg-gradient-to-tr from-[#d946ef]/35 to-[#8b5cf6]/25 blur-3xl animate-float-slow" />
      <div className="absolute bottom-16 right-12 w-96 h-96 rounded-full bg-gradient-to-tr from-[#6366f1]/40 to-[#ec4899]/30 blur-3xl animate-float-reverse" />
      <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full bg-gradient-to-tr from-[#00e676]/20 to-[#38bdf8]/20 blur-3xl animate-float-slow" />

      {/* 5. Rising Floating Light Particles / Embers */}
      <div className="absolute left-[10%] w-2 h-2 rounded-full bg-white/70 shadow-md shadow-white animate-particle-1" />
      <div className="absolute left-[25%] w-3 h-3 rounded-full bg-purple-300/80 shadow-md shadow-purple-300 animate-particle-2" />
      <div className="absolute left-[40%] w-1.5 h-1.5 rounded-full bg-pink-300/75 animate-particle-3" />
      <div className="absolute left-[55%] w-2.5 h-2.5 rounded-full bg-[#00e676]/80 shadow-md shadow-[#00e676] animate-particle-4" />
      <div className="absolute left-[70%] w-2 h-2 rounded-full bg-white/70 animate-particle-5" />
      <div className="absolute left-[85%] w-3 h-3 rounded-full bg-purple-200/80 shadow-md shadow-purple-200 animate-particle-6" />
      <div className="absolute left-[92%] w-1.5 h-1.5 rounded-full bg-yellow-200/75 animate-particle-7" />
      <div className="absolute left-[18%] w-2.5 h-2.5 rounded-full bg-indigo-300/80 animate-particle-8" />

      {/* 6. Twinkling Starlight Points */}
      <div className="absolute top-24 right-32 text-lg animate-twinkle-1 text-purple-200 opacity-60">✦</div>
      <div className="absolute top-1/3 left-20 text-sm animate-twinkle-2 text-white opacity-70">✦</div>
      <div className="absolute bottom-1/3 right-16 text-base animate-twinkle-3 text-pink-200 opacity-60">✦</div>
      <div className="absolute bottom-28 left-40 text-xs animate-twinkle-1 text-purple-100 opacity-70">✦</div>
      <div className="absolute top-1/2 left-1/3 text-sm animate-twinkle-2 text-white opacity-50">✦</div>
    </div>
  );
}
