"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const easeOut = [0.22, 1, 0.36, 1] as const;

function DeviceVisual({ reduced }: { reduced: boolean }) {
  return (
    <motion.div
      className="relative w-full max-w-[760px] mx-auto lg:mx-0"
      initial={reduced ? false : { opacity: 0, scale: 1.03, filter: "blur(10px)" }}
      animate={reduced ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 1.0, ease: easeOut, delay: 0.05 }}
    >
      {/* restrained ambient glow behind devices */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(229,57,69,0.10)_0%,rgba(255,255,255,0.03)_35%,transparent_70%)] blur-3xl"
        initial={reduced ? false : { opacity: 0 }}
        animate={
          reduced
            ? { opacity: 1 }
            : { opacity: [0.55, 0.75, 0.55], x: [0, 10, 0], y: [0, -8, 0] }
        }
        transition={
          reduced
            ? { duration: 0.8 }
            : { opacity: { duration: 1.2, ease: easeOut }, x: { duration: 18, repeat: Infinity, ease: "easeInOut" }, y: { duration: 22, repeat: Infinity, ease: "easeInOut" } }
        }
      />

      <div className="relative aspect-[16/11] w-full">
        {/* Primary device: desktop/TV */}
        <div className="absolute left-0 top-[4%] w-[92%]">
          <div className="relative rounded-[22px] border border-white/10 bg-[#0b0b0e] p-2 shadow-[0_40px_120px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.03)]">
            {/* soft top reflection */}
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] bg-[#070709]">
              {/* clean UI mockup */}
              <div className="absolute inset-x-0 top-0 h-9 border-b border-white/[0.06] bg-[#0d0d11]/95 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                    <span className="h-2 w-2 rounded-full bg-white/15" />
                  </div>
                  <div className="text-[10px] font-black tracking-tight"><span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span></div>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/45">
                  <span className="text-white/80">Home</span><span>Live</span><span>Shorts</span><span>Library</span>
                </div>
                <div className="h-5 w-20 rounded-full bg-white/[0.06] border border-white/[0.06]" />
              </div>
              <div className="absolute inset-x-0 top-9 bottom-0 p-4 sm:p-5">
                <div className="grid grid-cols-[1.3fr_1fr] gap-4 h-full">
                  <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-[#0f1014]">
                    <img
                      src="https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1600&auto=format&fit=crop"
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                      loading="eager"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute left-4 bottom-4 right-4">
                      <div className="mb-2 inline-flex rounded-md bg-[#E53945]/90 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white">Live</div>
                      <div className="text-white font-semibold text-sm sm:text-base leading-tight">Creator Broadcast Studio</div>
                      <div className="mt-1 text-[11px] text-white/60">Streaming now • 8.2k watching</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {[
                      { t: "Documentary Premiere", s: "Continue watching", w: "62%" },
                      { t: "Weekly Podcast", s: "New episode", w: "38%" },
                      { t: "Shorts Feed", s: "For you", w: "74%" },
                    ].map((item) => (
                      <div key={item.t} className="flex-1 rounded-xl border border-white/[0.07] bg-[#101015] p-3 flex flex-col justify-between">
                        <div>
                          <div className="text-[11px] font-medium text-white/85 leading-snug">{item.t}</div>
                          <div className="text-[10px] text-white/45 mt-0.5">{item.s}</div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full rounded-full bg-[#E53945]/80" style={{ width: item.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mx-auto mt-2 h-3 w-28 rounded-b-xl bg-gradient-to-b from-[#1a1a1f] to-[#0e0e12] border-x border-b border-white/[0.06]" />
          </div>
        </div>

        {/* Secondary device: iPhone, overlapping */}
        <motion.div
          className="absolute right-[2%] bottom-0 w-[26%] min-w-[110px] max-w-[170px]"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={
            reduced
              ? { opacity: 1, y: 0 }
              : { opacity: 1, y: [0, -4, 0] }
          }
          transition={
            reduced
              ? { duration: 0.9, ease: easeOut, delay: 0.15 }
              : { opacity: { duration: 0.9, ease: easeOut, delay: 0.15 }, y: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1.2 } }
          }
        >
          <div className="rounded-[28px] border border-white/12 bg-[#0b0b0e] p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
            <div className="relative aspect-[9/19.5] overflow-hidden rounded-[22px] bg-[#050507] border border-white/[0.06]">
              <img src="/reelpic.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="eager" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75" />
              <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-black/80" />
              <div className="absolute inset-x-3 top-8 flex items-center justify-between">
                <div className="text-[8px] font-black tracking-tight"><span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span></div>
                <div className="text-[7px] text-white/70">Shorts</div>
              </div>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col gap-2.5">
                <span className="h-5 w-5 rounded-full bg-white/15 border border-white/10" />
                <span className="h-5 w-5 rounded-full bg-white/15 border border-white/10" />
                <span className="h-5 w-5 rounded-full bg-[#E53945]/70" />
              </div>
              <div className="absolute inset-x-3 bottom-6">
                <div className="text-[9px] font-semibold text-white">@creator</div>
                <div className="mt-0.5 text-[8px] leading-snug text-white/75">Create. Publish. Own your audience.</div>
              </div>
              <div className="pointer-events-none absolute inset-x-4 top-10 h-10 bg-gradient-to-b from-white/[0.08] to-transparent opacity-40 rounded-full blur-md" />
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function SignedOutHero() {
  const reduced = useReducedMotion() ?? false;

  const fade = (delay: number) =>
    reduced
      ? { initial: false, animate: { opacity: 1, y: 0 } }
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, ease: easeOut, delay } };

  return (
    <section className="relative w-full min-h-[100svh] bg-[#070708] text-white overflow-hidden flex flex-col">
      {/* background atmosphere */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_20%_10%,rgba(255,255,255,0.04)_0%,rgba(10,10,12,0)_45%),radial-gradient(90%_70%_at_80%_20%,rgba(229,57,69,0.08)_0%,rgba(7,7,8,0)_55%),linear-gradient(180deg,#0a0a0c_0%,#050505_100%)]"
        initial={reduced ? false : { opacity: 0 }}
        animate={reduced ? { opacity: 1 } : { opacity: [0.85, 1, 0.9, 1] }}
        transition={reduced ? { duration: 0.6 } : { duration: 1.2, ease: "easeOut" }}
      />
      {!reduced && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-[-10%] h-[420px] w-[420px] rounded-full bg-white/[0.03] blur-[120px]"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 pt-[calc(env(safe-area-inset-top)+88px)] pb-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[44fr_56fr] items-center gap-12 lg:gap-10 min-h-[calc(100svh-160px)]">
            {/* Left: typography + CTAs */}
            <div className="flex flex-col items-start lg:items-start text-left max-w-xl">
              <motion.p
                {...(reduced ? { initial: false, animate: { opacity: 0.6 } } : { initial: { opacity: 0 }, animate: { opacity: 0.6 }, transition: { duration: 0.7, ease: easeOut, delay: 0.25 } })}
                className="uppercase text-[11px] sm:text-[12px] font-semibold text-white/60 tracking-[0.2em] mb-5"
              >
                TROOFLIX
              </motion.p>

              <motion.h1
                {...(reduced ? { initial: false, animate: { opacity: 1, y: 0 } } : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: easeOut, delay: 0.35 } })}
                className="text-[clamp(2.8rem,7vw,5.6rem)] leading-[0.95] font-black tracking-[-0.05em] text-white"
              >
                Create without limits.
              </motion.h1>

              <motion.p
                {...fade(0.48)}
                className="mt-5 text-[16px] sm:text-[18px] leading-relaxed text-[#a1a1aa] max-w-[34ch]"
              >
                The platform for creators who refuse to be controlled.
                <br />
                Go live. Publish. Monetize. Keep 99%.
              </motion.p>

              <motion.div
                {...(reduced ? { initial: false, animate: { opacity: 1 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6, ease: easeOut, delay: 0.62 } })}
                className="mt-8 flex flex-col sm:flex-row w-full sm:w-auto gap-3"
              >
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center w-full sm:w-auto rounded-full bg-[#E53945] hover:bg-[#ef4444] text-white font-semibold text-[15px] px-7 py-3.5 transition-colors"
                >
                  Join Today
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center justify-center w-full sm:w-auto rounded-full border border-white/20 hover:border-white/35 bg-transparent hover:bg-white/[0.04] text-white/90 font-semibold text-[15px] px-7 py-3.5 transition-colors"
                >
                  Explore the platform
                </Link>
              </motion.div>
            </div>

            {/* Right: device visual */}
            <div className="w-full lg:pl-4">
              <DeviceVisual reduced={reduced} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div className="relative z-10 w-full border-t border-white/[0.08]">
        <div className="max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 py-5 sm:py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 lg:gap-y-0">
            {[
              "Multi-device continuity",
              "1% fee · Keep 99%",
              "Unfiltered creation",
              "Native creator economy",
            ].map((item, i) => (
              <div
                key={item}
                className={`text-[11px] sm:text-[12px] uppercase tracking-[0.14em] text-white/55 font-medium ${
                  i < 3 ? "lg:border-r lg:border-white/[0.08]" : ""
                } lg:pr-6`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
