"use client";

import Link from "next/link";
import { Eye, LayoutDashboard, Lock, MessageCircle, Play, Wallet } from "lucide-react";

export type CreatorStudioSection = "profile" | "dashboard" | "mytrooflix" | "bank" | "chat";

type Props = {
  active: CreatorStudioSection;
  onViewChange?: (section: Extract<CreatorStudioSection, "profile" | "dashboard" | "mytrooflix">) => void;
  dashboardLocked?: boolean;
  className?: string;
};

const tabs = [
  { id: "profile", label: "Profile", icon: Eye },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mytrooflix", label: "MyTrooFlix", icon: Play },
  { id: "bank", label: "TrooBank", icon: Wallet, href: "/wallet" },
  { id: "chat", label: "TrooChat", icon: MessageCircle, href: "/messages" },
] as const;

export default function CreatorStudioNav({ active, onViewChange, dashboardLocked = false, className = "mb-5" }: Props) {
  return (
    <div className={`sticky z-[150] ${className}`} style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}>
      <nav aria-label="Creator studio" className="rounded-full border border-white/20 bg-white/10 p-1 shadow-[0_10px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl backdrop-saturate-150 sm:p-1.5">
        <div className="flex w-full items-stretch gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => {
          const selected = active === tab.id;
          const Icon = tab.icon;
          const className = `flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 py-2 text-[9px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-[11px] ${selected ? "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] [text-shadow:0_0_14px_rgba(255,255,255,0.55)]" : "text-white/45 hover:bg-white/[0.06] hover:text-white/80"} ${tab.id === "dashboard" && dashboardLocked ? "opacity-70" : ""}`;
          const label = (
            <>
              {tab.id === "dashboard" ? (
                <span className={`flex items-center gap-1 ${selected ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : ""}`}><Icon size={15} className="shrink-0" />{dashboardLocked && <Lock size={9} className="text-white/45" />}</span>
              ) : <Icon size={15} className={`shrink-0 ${selected ? "drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" : ""}`} />}
              <span className="whitespace-nowrap">{tab.label}</span>
            </>
          );
          const viewId = tab.id === "profile" || tab.id === "dashboard" || tab.id === "mytrooflix";
          const href = viewId ? `/creator-dashboard?studioTab=${tab.id}` : tab.href;

            return (
              <span key={tab.id} className="contents">
                {index === 3 && <span aria-hidden="true" className="my-1.5 w-px shrink-0 bg-white/10" />}
                {viewId && onViewChange ? (
                  <button type="button" onClick={() => onViewChange(tab.id as Extract<CreatorStudioSection, "profile" | "dashboard" | "mytrooflix">)} aria-pressed={selected} className={className}>
                    {label}
                  </button>
                ) : (
                  <Link href={href!} aria-current={selected ? "page" : undefined} className={className}>
                    {label}
                  </Link>
                )}
              </span>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
