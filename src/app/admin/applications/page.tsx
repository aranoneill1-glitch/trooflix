"use client";

import { useEffect, useState } from "react";
import { Inbox, Check, X, ExternalLink, Loader2 } from "lucide-react";

type Application = {
  id: number;
  user_id: string;
  creator_name: string;
  bio: string;
  category: string;
  photo_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ApplicationsPage() {
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`/api/creator-applications?status=${tab}`)
      .then((r) => r.json())
      .then((d) => setApps(d.applications || []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const approve = async (id: number) => {
    if (!confirm("Approve this application? They'll be added as a podcaster.")) return;
    setBusy(id);
    const res = await fetch("/api/creator-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    });
    setBusy(null);
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
    } else {
      const d = await res.json();
      alert(d.error || "Could not approve");
    }
  };

  const reject = async () => {
    if (!rejectingId) return;
    setBusy(rejectingId);
    const res = await fetch("/api/creator-applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: rejectingId,
        action: "reject",
        adminNotes: rejectReason.trim() || null,
      }),
    });
    setBusy(null);
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== rejectingId));
      setRejectingId(null);
      setRejectReason("");
    } else {
      const d = await res.json();
      alert(d.error || "Could not reject");
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Applications</h1>
        <p className="text-white/50 text-sm">
          Review podcaster applications and approve them with one click.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              tab === t
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-white/50 gap-2">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      )}

      {!loading && apps.length === 0 && (
        <div className="bg-[#141418] border border-white/5 rounded-lg p-12 text-center">
          <div className="flex justify-center mb-5">
            <div className="bg-white/5 rounded-full p-5">
              <Inbox size={40} className="text-white/40" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-2">
            {tab === "pending" && "No pending applications"}
            {tab === "approved" && "No approved creators yet"}
            {tab === "rejected" && "No rejected applications"}
          </h2>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            {tab === "pending"
              ? "New applications will appear here for review."
              : "Nothing to see in this tab right now."}
          </p>
        </div>
      )}

      {!loading && apps.length > 0 && (
        <div className="space-y-3">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-[#141418] border border-white/5 rounded-lg p-5"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {app.photo_url ? (
                    <img src={app.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold">
                      {(app.creator_name[0] || "?").toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-lg font-bold">{app.creator_name}</h3>
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded">
                      {app.category}
                    </span>
                    <span className="text-xs text-white/40 ml-auto">
                      {timeAgo(app.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-white/70 mt-2 whitespace-pre-wrap leading-relaxed">
                    {app.bio}
                  </p>
                  <p className="text-[11px] text-white/40 mt-2 font-mono truncate">
                    user: {app.user_id}
                  </p>

                  {/* Actions */}
                  {tab === "pending" && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => approve(app.id)}
                        disabled={busy === app.id}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(app.id)}
                        disabled={busy === app.id}
                        className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        <X size={14} /> Reject
                      </button>
                      <a
                        href={`/u/${app.user_id}`}
                        target="_blank"
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded text-sm font-semibold transition"
                      >
                        View profile <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {tab === "approved" && (
                    <p className="text-xs text-green-400 mt-3">
                      ✓ Approved {app.reviewed_at ? timeAgo(app.reviewed_at) : ""}
                    </p>
                  )}
                  {tab === "rejected" && (
                    <div className="mt-3">
                      <p className="text-xs text-red-400">
                        ✕ Rejected {app.reviewed_at ? timeAgo(app.reviewed_at) : ""}
                      </p>
                      {app.admin_notes && (
                        <p className="text-xs text-white/50 mt-1">
                          Reason: {app.admin_notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectingId !== null && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setRejectingId(null)}
        >
          <div
            className="bg-[#141418] border border-white/10 rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">Reject application</h3>
            <p className="text-sm text-white/50 mb-4">
              Optional: give a reason. It'll be shown to the applicant.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Not enough sample content yet."
              rows={3}
              maxLength={300}
              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={reject}
                disabled={busy !== null}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 py-2 rounded font-semibold"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 py-2 rounded font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
