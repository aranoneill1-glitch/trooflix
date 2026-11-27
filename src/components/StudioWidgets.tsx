"use client";

import Link from "next/link";
import { Eye, LayoutDashboard, Lock, MessageCircle, ShoppingBag, Wallet } from "lucide-react";

export default function StudioWidgets({
  active,
  onViewChange,
  dashboardLocked = false,
  className = "mb-6",
  compact = false,
}: {
  active: "profile" | "dashboard" | "mytrooflix" | "bank" | "chat" | "shop";
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
    { id: "shop" as const, label: "Shop", icon: ShoppingBag, from: "#F5A623", to: "#E67E22", href: "/shop" },
  ];

  return (
    <div className={className}>
      <div className={`grid grid-cols-5 ${compact ? "gap-1.5 max-w-[360px]" : "gap-2 sm:gap-3 max-w-lg"} mx-auto`}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const locked = item.id === "dashboard" && dashboardLocked;
          const inner = (
            <>
              <div className="relative mx-auto">
                <div
                  className="absolute inset-0 rounded-[24px] blur-xl opacity-40"
                  style={{ background: `linear-gradient(160deg, ${item.from}, ${item.to})` }}
                />
                <div
                  className={`relative mx-auto flex ${compact ? "h-[48px] w-[48px] rounded-[18px]" : "h-[64px] w-[64px] sm:h-[72px] sm:w-[72px] rounded-[24px]"} items-center justify-center transition-all duration-300 ${selected ? "scale-[1.03]" : "hover:scale-[1.04] active:scale-[0.97]"}`}
                  style={{
                    background: `linear-gradient(180deg, ${item.from}, ${item.to})`,
                    boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.12)`,
                  }}
                >
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_28%,rgba(255,255,255,0)_55%)]" />
                  <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/10" />
                  <Icon size={compact ? 22 : 30} className="relative text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]" strokeWidth={1.9} />
                  {selected && <div className="pointer-events-none absolute -inset-[3px] rounded-[27px] border border-white/35" />}
                  {locked && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 border border-white/20">
                      <Lock size={10} className="text-white/80" />
                    </span>
                  )}
                </div>
              </div>
              <span className={`${compact ? "mt-1.5 text-[10px]" : "mt-2.5 text-[11px] sm:text-[12px]"} block text-center font-medium tracking-[-0.01em] ${selected ? "text-white" : "text-white/65"}`}>
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
