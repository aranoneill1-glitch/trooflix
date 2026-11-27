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
    { id: "profile" as const, label: "Profile", icon: Eye, from: "#5B8DEF", to: "#2D5BE3", href: "/creator-dashboard?studioTab=profile" },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, from: "#FF7A59", to: "#E53945", href: "/creator-dashboard?studioTab=dashboard" },
    { id: "bank" as const, label: "TrooBank", icon: Wallet, from: "#43D17A", to: "#1FA855", href: "/wallet" },
    { id: "chat" as const, label: "TrooChat", icon: MessageCircle, from: "#5BC8F5", to: "#2A9FD6", href: "/messages" },
  ];

  return (
    <div className={className}>
      <div className={`grid grid-cols-4 ${compact ? "gap-2 max-w-[320px]" : "gap-3 sm:gap-4 max-w-md"} mx-auto`}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const locked = item.id === "dashboard" && dashboardLocked;
          const inner = (
            <>
              <div
                className={`relative mx-auto flex ${compact ? "h-[46px] w-[46px] rounded-[16px]" : "h-[62px] w-[62px] sm:h-[68px] sm:w-[68px] rounded-[22px]"} items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform duration-200 ${selected ? "scale-[1.04] ring-2 ring-white/70 ring-offset-2 ring-offset-[#09090B]" : "hover:scale-[1.03]"}`}
                style={{ background: `linear-gradient(160deg, ${item.from}, ${item.to})` }}
              >
                <Icon size={compact ? 22 : 30} className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]" strokeWidth={1.8} />
                {locked && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 border border-white/20">
                    <Lock size={10} className="text-white/80" />
                  </span>
                )}
              </div>
              <span className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px]"} block text-center font-semibold tracking-tight ${selected ? "text-white" : "text-white/70"}`}>
                {item.label}
              </span>
            </>
          );

          if ((item.id === "profile" || item.id === "dashboard") && onViewChange) {
            return (
              <button key={item.id} type="button" onClick={() => onViewChange(item.id)} className="flex flex-col items-center">
                {inner}
              </button>
            );
          }

          return (
            <Link key={item.id} href={item.href || "/creator-dashboard"} className="flex flex-col items-center">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
