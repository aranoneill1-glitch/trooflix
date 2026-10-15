"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Mic,
  Upload,
  UserPlus,
  Users,
  Eye,
  TrendingUp,
  Film,
  Mic2,
  Bell,
  Settings,
} from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState<{
    totalViews: number;
    uniqueVisitors: number;
    today: number;
    last7Days: number;
  } | null>(null);
  const [subscribers, setSubscribers] = useState<number | null>(null);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [podcasterCount, setPodcasterCount] = useState<number>(0);

  useEffect(() => {
    fetch("/api/track-visit").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/subscriber-count").then((r) => r.json()).then((d) => setSubscribers(d.count)).catch(() => {});
    fetch("/api/videos").then((r) => r.json()).then((d) => setVideoCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
    fetch("/api/creators").then((r) => r.json()).then((d) => setPodcasterCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black mb-1">Overview</h1>
        <p className="text-white/50 text-sm">Your site at a glance</p>
      </div>

      {/* === CONTENT === */}
      <section className="mb-6">
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3">
          CONTENT
        </h2>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatCard
            icon={Film}
            label="Videos"
            value={videoCount}
          />
          <StatCard
            icon={Mic2}
            label="Podcasters"
            value={podcasterCount}
          />
          <StatCard
            icon={Users}
            label="Subscribers"
            value={subscribers ?? "—"}
          />
        </div>
      </section>

      {/* === TRAFFIC === */}
      <section className="mb-6">
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3">
          TRAFFIC
        </h2>
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <StatCard
            icon={Eye}
            label="Visitors"
            value={stats?.uniqueVisitors ?? "—"}
          />
          <StatCard
            icon={TrendingUp}
            label="Page Views"
            value={stats?.totalViews ?? "—"}
          />
          <StatCard
            icon={Bell}
            label="Today"
            value={stats?.today ?? "—"}
            highlight
          />
        </div>
      </section>

      {/* === QUICK ACTIONS === */}
      <section>
        <h2 className="text-[10px] font-bold tracking-[0.25em] text-white/40 mb-3">
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <ActionTile
            href="/admin/videos"
            icon={Upload}
            label="Add Video"
          />
          <ActionTile
            href="/admin/podcasters"
            icon={Mic}
            label="Podcasters"
          />
          <ActionTile
            href="/admin/videos"
            icon={Video}
            label="All Videos"
          />
          <ActionTile
            href="/admin/settings"
            icon={Settings}
            label="Settings"
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: any;
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 md:p-4 transition ${
        highlight
          ? "bg-red-600/10 border border-red-600/20"
          : "bg-[#141418] border border-white/5"
      }`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon
          size={13}
          className={highlight ? "text-red-500" : "text-white/40"}
        />
        <p className="text-[10px] md:text-[11px] font-semibold tracking-wide text-white/50 uppercase truncate">
          {label}
        </p>
      </div>
      <p className="text-2xl md:text-3xl font-black text-white tabular-nums leading-none">
        {value}
      </p>
    </div>
  );
}

function ActionTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: any;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[#141418] border border-white/5 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center gap-2 hover:border-red-600/40 hover:bg-red-600/5 transition group"
    >
      <Icon
        size={20}
        className="text-red-500 group-hover:scale-110 transition"
      />
      <p className="text-xs md:text-sm font-semibold text-white text-center">
        {label}
      </p>
    </Link>
  );
}
