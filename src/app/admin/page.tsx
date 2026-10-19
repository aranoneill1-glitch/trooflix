"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {Video,
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
  AlertTriangle,
  Trash2,
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
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<string>("");

  useEffect(() => {
    fetch("/api/track-visit").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/subscriber-count").then((r) => r.json()).then((d) => setSubscribers(d.count)).catch(() => {});
    fetch("/api/videos").then((r) => r.json()).then((d) => setVideoCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
    fetch("/api/creators").then((r) => r.json()).then((d) => setPodcasterCount(Array.isArray(d) ? d.length : 0)).catch(() => {});
  }, []);

  const handleWipe = async () => {
    if (wipeConfirm !== "DELETE") {
      setWipeResult('You must type "DELETE" exactly to confirm.');
      return;
    }
    setWiping(true);
    setWipeResult("");
    try {
      const res = await fetch("/api/admin/wipe-feed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setWipeResult(d.error || "Wipe failed");
      } else {
        setWipeResult(`✅ Wiped ${d.deleted} posts. Kept ${d.kept} (Loose Change).`);
        setWipeConfirm("");
        setWipeOpen(false);
        // Refresh counts
        fetch("/api/videos").then((r) => r.json()).then((d2) => setVideoCount(Array.isArray(d2) ? d2.length : 0));
      }
    } catch {
      setWipeResult("Network error");
    } finally {
      setWiping(false);
    }
  };

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
      {/* === DANGER ZONE === */}
      <section className="mt-12 border border-red-600/30 rounded-lg p-4 md:p-6 bg-red-950/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="text-sm font-bold text-red-400 tracking-wider">
            DANGER ZONE
          </h2>
        </div>
        <p className="text-sm text-white/60 mb-4">
          Irreversible actions. Use with care.
        </p>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="font-semibold text-white">Wipe Feed</p>
            <p className="text-xs text-white/50">
              Deletes all videos, comments, likes, views, reposts, notifications, My Lists.
              Keeps Loose Change as the hero.
            </p>
          </div>
          <button
            onClick={() => {
              setWipeOpen(true);
              setWipeResult("");
              setWipeConfirm("");
            }}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg text-sm transition flex items-center gap-2 justify-center whitespace-nowrap"
          >
            <Trash2 size={16} /> Wipe Feed
          </button>
        </div>

        {wipeResult && (
          <div className="mt-3 text-xs text-white/70 bg-black/40 rounded px-3 py-2">
            {wipeResult}
          </div>
        )}
      </section>

      {/* === CONFIRM MODAL === */}
      {wipeOpen && (
        <div className="fixed inset-0 z-[500] bg-black/85 flex items-center justify-center px-4">
          <div className="bg-[#0f0f12] border border-red-600/40 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={22} className="text-red-500" />
              <h3 className="text-lg font-bold text-red-400">Wipe Feed?</h3>
            </div>
            <p className="text-sm text-white/70 mb-4">
              This will delete <strong className="text-white">every video</strong>, comment, like, view, repost, and notification. Only <strong className="text-white">Loose Change</strong> will remain.
            </p>
            <p className="text-sm text-white/70 mb-2">
              Type <strong className="text-red-400">DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={wipeConfirm}
              onChange={(e) => setWipeConfirm(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
              className="w-full bg-black/60 border border-white/10 rounded px-3 py-2 mb-4 outline-none focus:border-red-600 text-sm"
            />
            {wipeResult && (
              <p className="text-xs text-red-300 mb-3">{wipeResult}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setWipeOpen(false);
                  setWipeConfirm("");
                  setWipeResult("");
                }}
                disabled={wiping}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleWipe}
                disabled={wiping || wipeConfirm !== "DELETE"}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 font-semibold transition"
              >
                {wiping ? "Wiping…" : "Wipe Feed"}
              </button>
            </div>
          </div>
        </div>
      )}
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
