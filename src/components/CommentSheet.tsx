"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Comments from "@/components/Comments";
import GifPicker from "@/components/GifPicker";
import { getCachedUser } from "@/lib/cache";
import { createClient } from "@/utils/supabase/client";

type Props = {
  videoId: number | null;
  open: boolean;
  onClose: () => void;
  hideComposer?: boolean;
};

export default function CommentSheet({ videoId, open, onClose, hideComposer = false }: Props) {
  const [count, setCount] = useState(0);
  const [sortState, setSortState] = useState<{sort: string, setter: ((s: any) => void) | null}>({ sort: "newest", setter: null });
  const [refreshKey, setRefreshKey] = useState(0);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    getCachedUser().then(async (u) => {
      if (u) {
        setUser({ id: u.id, email: u.email || "" });
        const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("user_id", u.id).single();
        if (prof?.avatar_url) setUserAvatar(prof.avatar_url);
      }
    }).catch(() => {});
  }, [open]);

  const bumpRefresh = () => setRefreshKey((k) => k + 1);

  const submitText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user || !videoId || submitting || !text.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, userId: user.id, userEmail: user.email, text: text.trim(), parentId: null }),
      });
      if (res.ok) {
        setText("");
        bumpRefresh();
      }
    } catch {}
    finally { setSubmitting(false); }
  };

  const submitMedia = async (url: string) => {
    if (!user || !videoId) return;
    setGifOpen(false);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId, userId: user.id, userEmail: user.email, text: url }),
      });
      if (res.ok) bumpRefresh();
    } catch {}
  };

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type || "image/jpeg", folder: "comment-images" }),
      });
      if (!presign.ok) throw new Error("Upload failed");
      const { signedUrl, publicUrl } = await presign.json();
      const put = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": file.type || "image/jpeg" }, body: file });
      if (!put.ok) throw new Error("Upload failed");
      await submitMedia(publicUrl);
    } catch {
      alert("Couldn't upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && videoId !== null && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[400]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="fixed bottom-0 left-0 right-0 h-[75dvh] bg-black/60 rounded-t-3xl z-[410] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/20"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Drag handle */}
            <div className="w-full flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 shrink-0 border-b border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">Comments</h2>
                  <span className="text-white/40 font-bold">·</span>
                  <span className="text-white/60 text-sm font-bold">{count}</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <select
                    value={sortState.sort}
                    onChange={(e) => sortState.setter && sortState.setter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs outline-none focus:border-[#E53945]"
                  >
                    <option value="newest">For you first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="top">Top comments</option>
                  </select>
                  
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Comment bar in header section */}
              <form onSubmit={submitText} className="mt-3 flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={user ? "Add a comment..." : "Sign in to comment"}
                  disabled={!user || submitting}
                  className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-white/45 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!user || uploading}
                  className="w-8 h-8 flex items-center justify-center text-white/75 hover:text-white disabled:opacity-40 shrink-0"
                  aria-label="Add image"
                >
                  {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ImageIcon size={18} />}
                </button>
                <button
                  type="button"
                  onClick={() => user && setGifOpen(true)}
                  disabled={!user}
                  className="shrink-0 border border-white/35 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-tight text-white/80 hover:text-white hover:border-white transition disabled:opacity-40"
                  aria-label="Add GIF"
                >
                  GIF
                </button>
                {text.trim() && (
                  <button
                    type="submit"
                    disabled={submitting || !user}
                    className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 disabled:opacity-40 shrink-0"
                    aria-label="Post comment"
                  >
                    <Send size={16} />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
              </form>
              <GifPicker open={gifOpen} onClose={() => setGifOpen(false)} onPick={(url) => submitMedia(url)} />
            </div>

            {/* Scrollable body — reuse existing Comments component */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6 mt-4">
              <Comments 
                videoId={videoId} 
                hideComposer={true}
                refreshKey={refreshKey}
                onMetaChange={(c, s, setter) => {
                  setCount(c);
                  setSortState({ sort: s, setter: setter });
                }} 
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
