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
    { id: "profile" as const, label: "Profile", icon: Eye, accent: "#7EA2FF", href: "/creator-dashboard?studioTab=profile" },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, accent: "#FF8A7A", href: "/creator-dashboard?studioTab=dashboard" },
    { id: "bank" as const, label: "TrooBank", icon: Wallet, accent: "#6DD3A0", href: "/wallet" },
    { id: "chat" as const, label: "TrooChat", icon: MessageCircle, accent: "#7BCBFF", href: "/messages" },
    { id: "shop" as const, label: "Shop", icon: ShoppingBag, accent: "#F0B35A", href: "/shop" },
  ];

  return (
    <div className={className}>
      <div className={`grid grid-cols-5 ${compact ? "gap-2 max-w-[360px]" : "gap-3 sm:gap-4 max-w-lg"} mx-auto`}>
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          const locked = item.id === "dashboard" && dashboardLocked;
          const inner = (
            <>
              <div
                className={`relative mx-auto flex ${compact ? "h-[46px] w-[46px] rounded-[14px]" : "h-[60px] w-[60px] sm:h-[66px] sm:w-[66px] rounded-[18px]"} items-center justify-center transition-all duration-200 ${selected ? "bg-white/[0.1] border-white/[0.18]" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14]"} border backdrop-blur-sm active:scale-[0.97]`}
                style={{
                  boxShadow: selected
                    ? `0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${item.accent}33`
                    : "0 4px 16px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.12]"
                  style={{ background: `radial-gradient(120% 120% at 50% 0%, ${item.accent}, transparent 65%)` }}
                />
                <Icon
                  size={compact ? 20 : 26}
                  className="relative"
                  strokeWidth={1.8}
                  style={{ color: selected ? item.accent : "rgba(255,255,255,0.82)" }}
                />
                {locked && (
                  <span className="absolute -right-1 -top-1 flex h-4.5 w-4.5 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#141414] border border-white/15">
                    <Lock size={9} className="text-white/70" />
                  </span>
                )}
              </div>
              <span className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px] sm:text-[12px]"} block text-center font-medium tracking-[-0.01em] ${selected ? "text-white/95" : "text-white/55"}`}>
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
