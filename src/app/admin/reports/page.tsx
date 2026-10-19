"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";

type Report = {
  id: number;
  reporter_user_id: string;
  content_type: "post" | "comment" | "user";
  content_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  reviewed_at: string | null;
};

const REASON_LABELS: Record<string, string> = {
  child_safety: "Child safety",
  pornography: "Pornography",
  ai_slop: "AI slop",
  copyright: "Copyright infringement",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [actioning, setActioning] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports", { cache: "no-store" });
      const d = await res.json();
      setReports(Array.isArray(d.reports) ? d.reports : []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: number, status: "reviewed" | "dismissed" | "actioned") => {
    setActioning(id);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } catch {}
    setActioning(null);
  };

  const filtered = filter === "pending" ? reports.filter((r) => r.status === "pending") : reports;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black">Reports</h1>
          <p className="text-sm text-white/50 mt-1">User-submitted content reports</p>
        </div>
        <div className="text-sm text-white/60">{filtered.length} {filter === "pending" ? "pending" : "total"}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === "pending" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            filter === "all" ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
          }`}
        >
          All
        </button>
      </div>

      {loading ? (
        <p className="text-white/50 py-12 text-center">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-[#141418] rounded-xl p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-500 mb-3" />
          <p className="text-white/60">No {filter === "pending" ? "pending " : ""}reports. All clear.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="bg-[#141418] border border-white/5 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm font-bold">{REASON_LABELS[r.reason] || r.reason}</span>
                  <span className="text-xs text-white/40">·</span>
                  <span className="text-xs text-white/60 capitalize">{r.content_type}</span>
                  <span className="text-xs text-white/40">#{r.content_id}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      r.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-400"
                        : r.status === "actioned"
                        ? "bg-red-500/20 text-red-400"
                        : r.status === "dismissed"
                        ? "bg-white/10 text-white/50"
                        : "bg-green-500/20 text-green-400"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
                <span className="text-xs text-white/40 flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>

              {r.details && (
                <p className="text-sm text-white/70 mb-3 pl-6 whitespace-pre-wrap">{r.details}</p>
              )}

              <div className="flex items-center gap-2 pl-6">
                <a
                  href={
                    r.content_type === "post"
                      ? `/podcast/${r.content_id}`
                      : r.content_type === "user"
                      ? `/u/${r.content_id}`
                      : "#"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
                >
                  <Eye size={14} /> View
                </a>
                {r.status === "pending" && (
                  <>
                    <button
                      onClick={() => updateStatus(r.id, "actioned")}
                      disabled={actioning === r.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <Trash2 size={14} /> Action
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "dismissed")}
                      disabled={actioning === r.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-50 px-3 py-1.5 rounded-lg transition"
                    >
                      <XCircle size={14} /> Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
