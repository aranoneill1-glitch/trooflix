"use client";

import Link from "next/link";
import { Eye, Lock, MessageCircle, Wallet } from "lucide-react";

function DashboardHeartIcon({ size = 24, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect width="7" height="9" x="3" y="3" rx="1.5" fill="#FFFFFF" />
      <rect width="7" height="5" x="14" y="3" rx="1.5" fill="#FFFFFF" />
      <rect width="7" height="5" x="3" y="16" rx="1.5" fill="#FFFFFF" />
      <path d="M20.8 14.6c-.8-.8-2.1-.8-2.9 0l-.4.4-.4-.4c-.8-.8-2.1-.8-2.9 0-.8.8-.8 2.1 0 2.9l3.3 3.3 3.3-3.3c.8-.8.8-2.1 0-2.9Z" fill="#E53945" />
    </svg>
  );
}

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
    {
      id: "profile" as const, label: "Profile", icon: Eye, href: "/creator-dashboard?studioTab=profile",
      background: "linear-gradient(180deg, #2A1215 0%, #1A0D0F 45%, #12090A 100%)",
      boxShadow: "0 10px 28px rgba(229, 57, 69, 0.22), 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#E53945",
    },
    {
      id: "dashboard" as const, label: "Dashboard", icon: DashboardHeartIcon, href: "/creator-dashboard?studioTab=dashboard",
      background: "linear-gradient(180deg, #111111 0%, #000000 100%)",
      boxShadow: "0 10px 28px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#FFFFFF",
    },
    {
      id: "bank" as const, label: "TrooBank", icon: Wallet, href: "/wallet",
      background: "linear-gradient(180deg, #2A1215 0%, #1A0D0F 45%, #12090A 100%)",
      boxShadow: "0 10px 28px rgba(229, 57, 69, 0.22), 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#E53945",
    },
    {
      id: "chat" as const, label: "TrooChat", icon: MessageCircle, href: "/messages",
      background: "linear-gradient(180deg, #2A1215 0%, #1A0D0F 45%, #12090A 100%)",
      boxShadow: "0 10px 28px rgba(229, 57, 69, 0.22), 0 4px 10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#E53945",
    },
  ];

  return (
    <div className={className}>
      <div className={`grid grid-cols-4 ${compact ? "gap-3 max-w-[320px]" : "gap-4 sm:gap-5 max-w-lg"} mx-auto`}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const locked = item.id === "dashboard" && dashboardLocked;
          const inner = (
            <>
              <div className={`relative mx-auto flex ${compact ? "h-[56px] w-[56px] rounded-[20px]" : "h-[64px] w-[64px] sm:h-[70px] sm:w-[70px] rounded-[22px]"} items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] active:scale-[0.96] group`}>
                <div className="absolute inset-0 rounded-[inherit]" style={{ background: item.background, boxShadow: item.boxShadow }} />
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
                <div className="pointer-events-none absolute inset-[0.5px] rounded-[inherit] border border-white/10" />
                <div className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ boxShadow: `inset 0 0 0 1px ${item.accent}22` }} />
                <div className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]" style={{ color: item.accent }}>
                  <Icon size={compact ? 24 : 30} strokeWidth={1.9} />
                </div>
                {selected && <div className="pointer-events-none absolute -inset-[2px] rounded-[24px] border border-[#E53945]/60" />}
                {locked && (
                  <span className="absolute -right-1 -top-1 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/55 border border-white/20 backdrop-blur-sm">
                    <Lock size={9} className="text-white/85" />
                  </span>
                )}
              </div>
              <span className={`mt-2.5 block text-center text-[11px] sm:text-[12px] font-medium tracking-tight ${selected ? "text-white" : "text-white/90"}`}>
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
