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
    { id: "profile" as const, label: "Profile", icon: Eye, from: "#4F8CFF", to: "#2563EB", href: "/creator-dashboard?studioTab=profile" },
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, from: "#FF6B6B", to: "#E53945", href: "/creator-dashboard?studioTab=dashboard" },
    { id: "bank" as const, label: "TrooBank", icon: Wallet, from: "#34C759", to: "#1F9D55", href: "/wallet" },
    { id: "chat" as const, label: "TrooChat", icon: MessageCircle, from: "#38BDF8", to: "#0EA5E9", href: "/messages" },
    { id: "shop" as const, label: "Shop", icon: ShoppingBag, from: "#FFB340", to: "#F97316", href: "/shop" },
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
                className={`relative mx-auto flex ${compact ? "h-[50px] w-[50px] rounded-[16px]" : "h-[62px] w-[62px] sm:h-[68px] sm:w-[68px] rounded-[20px]"} items-center justify-center transition-all duration-200 ${selected ? "scale-[1.03]" : "hover:scale-[1.03]"} active:scale-[0.97]`}
                style={{
                  background: `linear-gradient(180deg, ${item.from} 0%, ${item.to} 100%)`,
                  boxShadow: selected
                    ? `0 10px 24px ${item.to}55, 0 4px 10px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.12)`
                    : `0 8px 20px rgba(0,0,0,0.22), 0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.32), inset 0 -1px 0 rgba(0,0,0,0.1)`,
                }}
              >
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08)_35%,rgba(255,255,255,0)_60%)]" />
                <div className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/15" />
                <Icon
                  size={compact ? 22 : 28}
                  className="relative text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                  strokeWidth={1.9}
                />
                {selected && <div className="pointer-events-none absolute -inset-[2px] rounded-[22px] border border-white/25" />}
                {locked && (
                  <span className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/55 border border-white/20 backdrop-blur-sm">
                    <Lock size={9} className="text-white/85" />
                  </span>
                )}
              </div>
              <span className={`${compact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px] sm:text-[12px]"} block text-center font-medium tracking-[-0.01em] ${selected ? "text-white" : "text-white/70"}`}>
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
