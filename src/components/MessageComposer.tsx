"use client";

import { useEffect, useState } from "react";
import { Send, X, MessageSquare } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getCachedUser } from "@/lib/cache";

type Props = {
  creatorId: number;
  creatorName: string;
};

export default function MessageComposer({ creatorId, creatorName }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    getCachedUser()
      .then((user) => {
        setUserId(user?.id || null);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (!userId) return null; // signed-in only

  const send = async () => {
    setError("");
    const trimmed = body.trim();
    if (!trimmed) {
      setError("Write a message first.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Max 2000 characters.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: userId, creatorId, body: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not send.");
        setSending(false);
        return;
      }
      setSent(true);
      setBody("");
      setSending(false);
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1800);
    } catch {
      setError("Network error.");
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-1.5 rounded-full text-sm transition"
      >
        <MessageSquare size={16} /> Message
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => !sending && setOpen(false)}
        >
          <div
            className="bg-[#141418] border border-white/10 rounded-lg p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold">Message {creatorName}</h3>
                <p className="text-white/50 text-xs mt-1">
                  They'll see this in their inbox.
                </p>
              </div>
              <button
                onClick={() => !sending && setOpen(false)}
                className="text-white/50 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {sent ? (
              <div className="py-8 text-center">
                <p className="text-green-400 font-semibold mb-1">Sent ✓</p>
                <p className="text-white/60 text-sm">
                  {creatorName} will get back to you.
                </p>
              </div>
            ) : (
              <>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={`Write a message to ${creatorName}…`}
                  rows={5}
                  maxLength={2000}
                  className="w-full bg-black/40 border border-white/10 rounded p-3 text-sm text-white outline-none focus:border-white/30 resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/40">
                    {body.length}/2000
                  </span>
                  {error && (
                    <span className="text-xs text-red-400">{error}</span>
                  )}
                </div>

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={send}
                    disabled={sending}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 font-semibold py-2.5 rounded transition"
                  >
                    <Send size={16} /> {sending ? "Sending…" : "Send"}
                  </button>
                  <button
                    onClick={() => !sending && setOpen(false)}
                    className="flex-1 bg-white/10 hover:bg-white/20 font-semibold py-2.5 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
