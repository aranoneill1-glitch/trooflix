"use client";

import Link from "next/link";
import { Eye, LayoutDashboard, Lock, MessageCircle, Wallet } from "lucide-react";

export default function StudioWidgets({
  active,
  onViewChange,
  dashboardLocked = false,
  className = "mb-6",
  compact = false,
}: {
  active: "profile" | "dashboard" | "mytrooflix" | "bank" | "chat";
  onViewChange?: (section: "profile" | "dashboard") => void;
  dashboardLocked?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const items = [
    { id: "profile" as const, label: "Profile", icon: Eye, bg: "linear-gradient(160deg,#5AA2FF 0%,#2F6BFF 45%,#1D4ED8 100%)", glow: "rgba(59,130,246,0.45)" , href: "/creator-dashboard?studioTab=profile" },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, bg: "linear-gradient(160deg,#FF7A7A 0%,#FF4D5A 45%,#E11D48 100%)", glow: "rgba(244,63,94,0.45)", href: "/creator-dashboard?studioTab=dashboard" },
    { id: "bank" as const, label: "TrooBank", icon: Wallet, bg: "linear-gradient(160deg,#4ADE80 0%,#34C759 45%,#16A34A 100%)", glow: "rgba(34,197,94,0.42)", href: "/wallet" },
    { id: "chat" as const, label: "TrooChat", icon: MessageCircle, bg: "linear-gradient(160deg,#67D6FF 0%,#38BDF8 45%,#0284C7 100%)", glow: "rgba(56,189,248,0.42)", href: "/messages" },
  ];

  return (
    <div className={className}>
      <style>{`
        @keyframes widget-float { 0%,100%{ transform: translateY(0px) } 50%{ transform: translateY(-1px) } }
        @keyframes widget-shine { 0%{ transform: translateX(-140%) rotate(18deg); opacity:0 } 15%{opacity:.35} 45%{opacity:.12} 60%{opacity:0} 100%{ transform: translateX(180%) rotate(18deg); opacity:0 } }
        @keyframes widget-ambient { 0%,100%{ transform: scale(1) translate(0,0); opacity:.55 } 50%{ transform: scale(1.15) translate(4%,-4%); opacity:.75 } }
      `}</style>
      <div className={`grid grid-cols-4 ${compact ? "gap-3 max-w-[320px]" : "gap-3 sm:gap-5 max-w-md"} mx-auto`}>
        {items.map((item, i) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const locked = item.id === "dashboard" && dashboardLocked;
          const inner = (
            <>
              <div
                className={`relative mx-auto flex ${compact ? "h-[54px] w-[54px] rounded-[17px]" : "h-[64px] w-[64px] sm:h-[72px] sm:w-[72px] rounded-[22px]"} items-center justify-center transition-all duration-300 ${selected ? "scale-[1.04]" : "hover:scale-[1.04]"} active:scale-[0.97]`}
                style={{
                  background: item.bg,
                  boxShadow: `0 12px 28px ${item.glow}, 0 4px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -1px 0 rgba(0,0,0,0.12)`,
                  animation: `widget-float ${4.8 + i * 0.35}s ease-in-out infinite`,
                }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
                  <div
                    className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full blur-xl"
                    style={{ background: "rgba(255,255,255,0.35)", animation: `widget-ambient ${5.5 + i * 0.4}s ease-in-out infinite` }}
                  />
                  <div
                    className="absolute top-0 -left-[60%] w-[45%] h-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)]"
                    style={{ animation: `widget-shine ${5.2 + i * 0.6}s ease-in-out ${i * 0.45}s infinite` }}
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0.06)_34%,rgba(0,0,0,0)_58%,rgba(0,0,0,0.06)_100%)]" />
                <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/20" />
                <Icon
                  size={compact ? 24 : 30}
                  className="relative text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.22)]"
                  strokeWidth={1.9}
                />
                {selected && <div className="pointer-events-none absolute -inset-[2px] rounded-[24px] border border-white/30" />}
                {locked && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/55 border border-white/20 backdrop-blur-sm">
                    <Lock size={9} className="text-white/85" />
                  </span>
                )}
              </div>
              <span className={`${compact ? "mt-2 text-[10px]" : "mt-2.5 text-[11px] sm:text-[12px]"} block text-center font-medium tracking-[-0.01em] ${selected ? "text-white" : "text-white/72"}`}>
                {item.label}
              </span>
            </>
          );

          if ((item.id === "profile" || item.id === "dashboard") && onViewChange) {
            return (
              <button key={item.id} type="button" onClick={() => onViewChange(item.id)} className="group flex flex-col items-center">
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.id} href={item.href || "/creator-dashboard"} className="group flex flex-col items-center">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
