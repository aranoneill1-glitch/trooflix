"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

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

function TrooBankIcon({ size = 24, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" fill="#FFFFFF" />
      <path d="M14 10h6v4h-6a2 2 0 1 1 0-4Z" fill="#111111" />
      <circle cx="15.5" cy="12" r="1.1" fill="#E53945" />
    </svg>
  );
}

function ProfileIcon({ size = 24, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="8" r="4" fill="#FFFFFF" />
      <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7" fill="#FFFFFF" />
      <circle cx="18" cy="18" r="3.2" fill="#E53945" />
      <path d="M18 16.5v3M16.5 18h3" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function TrooChatIcon({ size = 24, className, style }: { size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-4.2 3.1c-.5.4-1.3 0-1.3-.6V17A2.5 2.5 0 0 1 4 14.5v-8Z" fill="#FFFFFF" />
      <circle cx="17.5" cy="6.5" r="2.5" fill="#E53945" />
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
      id: "profile" as const, label: "Profile", icon: ProfileIcon, href: "/creator-dashboard?studioTab=profile",
      image: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=600&auto=format&fit=crop",
      boxShadow: "0 10px 28px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#FFFFFF",
    },
    {
      id: "dashboard" as const, label: "Dashboard", icon: DashboardHeartIcon, href: "/creator-dashboard?studioTab=dashboard",
      image: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop",
      boxShadow: "0 10px 28px rgba(229,57,69,0.22), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#FFFFFF",
    },
    {
      id: "bank" as const, label: "TrooBank", icon: TrooBankIcon, href: "/wallet",
      image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=600&auto=format&fit=crop",
      boxShadow: "0 10px 28px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#FFFFFF",
    },
    {
      id: "chat" as const, label: "TrooChat", icon: TrooChatIcon, href: "/messages",
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop",
      boxShadow: "0 10px 28px rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.4)",
      accent: "#FFFFFF",
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
              <div className={`relative mx-auto flex ${compact ? "h-[56px] w-[56px] rounded-[20px]" : "h-[64px] w-[64px] sm:h-[70px] sm:w-[70px] rounded-[22px]"} items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.05] active:scale-[0.96] group`} style={{ boxShadow: item.boxShadow }}>
                <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/45" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/20" />
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/20 via-white/5 to-transparent" />
                <div className="pointer-events-none absolute inset-[0.5px] rounded-[inherit] border border-white/15" />
                <div className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" style={{ color: item.accent }}>
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
