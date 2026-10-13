"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, Mic, Upload, UserPlus } from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState<{ totalViews: number; uniqueVisitors: number; today: number; last7Days: number } | null>(null);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Overview</h1>
        <p className="text-white/50 text-sm">Your site at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10">
        <StatCard label="Videos" value={videoCount} />
        <StatCard label="Podcasters" value={podcasterCount} />
        <StatCard label="Subscribers" value={subscribers ?? "—"} />
        <StatCard label="Unique Visitors" value={stats?.uniqueVisitors ?? "—"} />
        <StatCard label="Total Page Views" value={stats?.totalViews ?? "—"} />
        <StatCard label="Views Today" value={stats?.today ?? "—"} />
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ActionCard
          href="/admin/videos"
          icon={Upload}
          title="Add a Video"
          description="Upload a new film, documentary, or podcast episode"
        />
        <ActionCard
          href="/admin/podcasters"
          icon={Mic}
          title="Manage Podcasters"
          description="Add, edit, or remove podcasters on the platform"
        />
        <ActionCard
          href="/admin/videos"
          icon={Video}
          title="View All Videos"
          description="Browse and edit your video catalog"
        />
        <ActionCard
          href="/admin/settings"
          icon={UserPlus}
          title="Settings"
          description="Admin preferences and account info"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#141418] border border-white/5 rounded-lg p-5">
      <p className="text-xs text-white/50 mb-2">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[#141418] border border-white/5 rounded-lg p-5 hover:border-white/20 transition group"
    >
      <div className="flex items-start gap-4">
        <div className="bg-red-600/10 rounded-lg p-3">
          <Icon size={22} className="text-red-500" />
        </div>
        <div>
          <p className="font-bold mb-1 group-hover:text-red-500 transition">{title}</p>
          <p className="text-sm text-white/50">{description}</p>
        </div>
      </div>
    </Link>
  );
}
