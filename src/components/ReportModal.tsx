"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

const REASONS = [
  { key: "child_safety", label: "Child safety", description: "Content involving minors" },
  { key: "pornography", label: "Pornography", description: "Explicit sexual content" },
  { key: "ai_slop", label: "AI slop", description: "Low-quality AI-generated content" },
  { key: "copyright", label: "Copyright infringement", description: "Unauthorized use of copyrighted work" },
];

export default function ReportModal({
  open,
  onClose,
  contentType,
  contentId,
}: {
  open: boolean;
  onClose: () => void;
  contentType: "post" | "comment" | "user";
  contentId: number | string;
}) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setSelectedReason(null);
    setDetails("");
    setSubmitting(false);
    setSuccess(false);
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    setError("");
    try {
      const user = await getCachedUser();
      if (!user) {
        setError("Please sign in to report");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterUserId: user.id,
          contentType,
          contentId: String(contentId),
          reason: selectedReason,
          details: details.trim() || null,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not submit report");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        reset();
        onClose();
      }, 2000);
    } catch {
      setError("Network error");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[600] bg-black/70"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[601] bg-[#0f0f12] rounded-t-2xl md:max-w-md md:mx-auto md:rounded-2xl md:bottom-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-2.5">
              <div className="w-10 h-1 rounded-full bg-white/25" />
            </div>

            {success ? (
              <div className="p-8 text-center">
                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                <h2 className="text-xl font-black mb-2">Report submitted</h2>
                <p className="text-sm text-white/60">
                  Thank you. Our team will review it shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
                  <h2 className="text-base font-bold">Report content</h2>
                  <button
                    onClick={handleClose}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-white/50 mb-1">
                    Why are you reporting this?
                  </p>

                  {REASONS.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setSelectedReason(r.key)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedReason === r.key
                          ? "bg-red-600/15 border-red-600/60"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedReason === r.key
                              ? "border-red-500"
                              : "border-white/30"
                          }`}
                        >
                          {selectedReason === r.key && (
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{r.label}</p>
                          <p className="text-xs text-white/50">{r.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  <div>
                    <label className="text-xs text-white/50 block mb-1 mt-2">
                      Additional details (optional)
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Tell us more…"
                      className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm outline-none focus:border-red-600 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-950/30 border border-red-600/40 rounded px-3 py-2 text-xs text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={submit}
                    disabled={!selectedReason || submitting}
                    className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold transition mt-2"
                  >
                    {submitting ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
