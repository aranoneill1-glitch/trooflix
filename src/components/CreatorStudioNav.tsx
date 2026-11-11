"use client";

import Link from "next/link";
import { Eye, LayoutDashboard, Lock, MessageCircle, Play, Wallet } from "lucide-react";

export type CreatorStudioSection = "profile" | "dashboard" | "mytrooflix" | "bank" | "chat";

type Props = {
  active: CreatorStudioSection;
  onViewChange?: (section: Extract<CreatorStudioSection, "profile" | "dashboard" | "mytrooflix">) => void;
  dashboardLocked?: boolean;
};

const tabs = [
  { id: "profile", label: "Profile", icon: Eye },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "mytrooflix", label: "MyTrooFlix", icon: Play },
  { id: "bank", label: "TrooBank", icon: Wallet, href: "/wallet" },
  { id: "chat", label: "TrooChat", icon: MessageCircle, href: "/messages" },
] as const;

export default function CreatorStudioNav({ active, onViewChange, dashboardLocked = false }: Props) {
  return (
    <nav aria-label="Creator studio" className="rounded-[22px] border border-white/[0.12] bg-[#100d10]/90 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-2">
      <div className="flex w-full items-stretch gap-1 overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => {
          const selected = active === tab.id;
          const Icon = tab.icon;
          const className = `flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 py-2.5 text-[10px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53945] sm:flex-row sm:gap-2 sm:px-3 sm:py-3 sm:text-xs ${selected ? "bg-gradient-to-br from-[#ef535d] to-[#b91f2b] text-white shadow-[0_6px_20px_rgba(229,57,69,0.28)]" : "text-white/55 hover:bg-white/[0.06] hover:text-white"} ${tab.id === "dashboard" && dashboardLocked ? "opacity-70" : ""}`;
          const label = (
            <>
              {tab.id === "dashboard" ? (
                <span className="flex items-center gap-1.5"><Icon size={17} className="shrink-0" />{dashboardLocked && <Lock size={10} className="text-white/45" />}</span>
              ) : <Icon size={17} className="shrink-0" />}
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
  );
}
