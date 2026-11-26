"use client";
import { getCachedUser, getCachedVideos, getCachedCreators } from "@/lib/cache";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Heart, Eye, MessageCircle, Play, Pause, ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Image as ImageIcon, Send } from "lucide-react";
import LikeButton, { externalLike } from "@/components/LikeButton";
import { motion, AnimatePresence } from "framer-motion";
import CommentSheet from "@/components/CommentSheet";
import Comments from "@/components/Comments";
import GifPicker from "@/components/GifPicker";
import { createClient } from "@/utils/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string;
  category: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl: string;
  backdropUrl: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  views?: number;
};

type Creator = {
  id: number;
  name?: string;
  slug?: string;
  photoUrl?: string;
};

export default function ShortsFeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [initialSeek, setInitialSeek] = useState<{ id: number; t: number; playing: boolean } | null>(null);
  const [commentSheetVideoId, setCommentSheetVideoId] = useState<number | null>(null);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewCounts, setViewCounts] = useState<Record<number, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});
  const [tipCounts, setTipCounts] = useState<Record<string, number>>({});
  const [composerUser, setComposerUser] = useState<{ id: string; email: string } | null>(null);
  const [composerAvatar, setComposerAvatar] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentGifOpen, setCommentGifOpen] = useState(false);
  const [commentUploading, setCommentUploading] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedReelId = params.get("reel");
    const requestedCreatorUserId = params.get("creator_user_id");
    const requestedCreatorId = params.get("creator_id");
    const mutedParam = params.get("muted");
    const tParam = Number(params.get("t") || "0");
    const playingParam = params.get("playing");
    if (mutedParam === "0") setIsMuted(false);
    else if (mutedParam === "1") setIsMuted(true);
    if (requestedReelId && Number.isFinite(tParam) && tParam >= 0) {
      setInitialSeek({ id: Number(requestedReelId), t: tParam, playing: playingParam === "1" });
    }
    Promise.all([
      getCachedVideos().catch(() => []),
      getCachedCreators().catch(() => []),
    ]).then(([vData, cData]) => {
      const all = Array.isArray(vData) ? vData : [];
      const shortsOnly = all.filter((v: any) => {
        const isShort = ["short", "reel"].includes(String(v.type || "").toLowerCase());
        // A specific reel id (e.g. from the home feed fullscreen button) can be
        // any video type — always include the requested one.
        const isRequested = requestedReelId && String(v.id) === requestedReelId;
        if (!isShort && !isRequested) return false;
        if (!requestedCreatorUserId && !requestedCreatorId) return true;
        const matchesCreatorUser = requestedCreatorUserId && String(v.uploaderUserId || "") === requestedCreatorUserId;
        const matchesCreatorId = requestedCreatorId && String(v.creatorId || "") === requestedCreatorId;
        return Boolean(matchesCreatorUser || matchesCreatorId);
      });
      const sortedShorts = shortsOnly.sort((a: any, b: any) => b.id - a.id);
      const requestedIndex = requestedReelId ? sortedShorts.findIndex((video: any) => String(video.id) === requestedReelId) : -1;
      const orderedShorts = requestedIndex > 0
        ? [sortedShorts[requestedIndex], ...sortedShorts.slice(0, requestedIndex), ...sortedShorts.slice(requestedIndex + 1)]
        : sortedShorts;
      setVideos(orderedShorts);
      setCreators(Array.isArray(cData) ? cData : []);
      const initialViews: Record<number, number> = {};
      orderedShorts.forEach((v: any) => { initialViews[v.id] = Number(v.views || 0); });
      setViewCounts(initialViews);
      if (orderedShorts.length > 0) {
        setActiveVideo(orderedShorts[0]);
      }
      setLoading(false);
      fetch("/api/comment-counts", { cache: "no-store" })
        .then(r => r.json())
        .then(d => setCommentCounts(d?.counts || {}))
        .catch(() => {});
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (commentSheetVideoId !== null) return;
    fetch("/api/comment-counts", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCommentCounts(d?.counts || {}))
      .catch(() => {});
  }, [commentSheetVideoId]);

  useEffect(() => {
    const ids = videos.map(v => v.id).filter(Boolean);
    if (ids.length === 0) return;
    fetch(`/api/tips/counts?videoIds=${ids.join(",")}`, { cache: "no-store" })
      .then(r => r.json())
      .then(d => setTipCounts(d?.videos || {}))
      .catch(() => {});
  }, [videos.map(v => v.id).join(",")]);

  useEffect(() => {
    const handler = (e: any) => {
      const { videoId, amount } = e.detail || {};
      if (videoId) setTipCounts((prev) => ({ ...prev, [String(videoId)]: Number(prev[String(videoId)] || 0) + Number(amount || 0) }));
    };
    window.addEventListener("tip-sent", handler as any);
    return () => window.removeEventListener("tip-sent", handler as any);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    getCachedUser().then(async (user) => {
      if (user) {
        setComposerUser({ id: user.id, email: user.email || "" });
        const { data: prof } = await supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single();
        if (prof?.avatar_url) setComposerAvatar(prof.avatar_url);
      }
    }).catch(() => {});
  }, []);

  const toggleMute = () => setIsMuted(prev => !prev);

  const scrollUp = () => {
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollBy({ top: -videoContainerRef.current.clientHeight, behavior: "smooth" });
    }
  };

  const scrollDown = () => {
    if (videoContainerRef.current) {
      videoContainerRef.current.scrollBy({ top: videoContainerRef.current.clientHeight, behavior: "smooth" });
    }
  };

  const refreshCommentCounts = () => {
    fetch("/api/comment-counts", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setCommentCounts(d?.counts || {}))
      .catch(() => {});
  };

  const submitShortComment = async (value?: string) => {
    if (!activeVideo || !composerUser || commentSubmitting) return;
    const body = (value ?? commentText).trim();
    if (!body) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: activeVideo.id,
          userId: composerUser.id,
          userEmail: composerUser.email,
          text: body,
          parentId: null,
        }),
      });
      if (res.ok) {
        setCommentText("");
        setCommentCounts((prev) => ({ ...prev, [activeVideo.id]: (prev[activeVideo.id] ?? 0) + 1 }));
      }
    } catch {}
    finally {
      setCommentSubmitting(false);
    }
  };

  const submitShortMedia = async (url: string) => {
    if (!activeVideo || !composerUser) return;
    setCommentGifOpen(false);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: activeVideo.id,
          userId: composerUser.id,
          userEmail: composerUser.email,
          text: url,
        }),
      });
      if (res.ok) setCommentCounts((prev) => ({ ...prev, [activeVideo.id]: (prev[activeVideo.id] ?? 0) + 1 }));
    } catch {}
  };

  const uploadShortCommentImage = async (file: File) => {
    if (!composerUser) return;
    setCommentUploading(true);
    try {
      const presign = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "image/jpeg",
          folder: "comment-images",
        }),
      });
      if (!presign.ok) throw new Error("Upload failed");
      const { signedUrl, publicUrl } = await presign.json();
      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!put.ok) throw new Error("Upload failed");
      await submitShortMedia(publicUrl);
    } catch {
      alert("Couldn't upload image");
    } finally {
      setCommentUploading(false);
      if (commentFileInputRef.current) commentFileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const ctx = activeVideo ? { id: activeVideo.id, creatorId: activeVideo.creatorId ?? null, uploaderUserId: activeVideo.uploaderUserId ?? null, title: activeVideo.title } : null;
    (window as any).__trooflixActiveReel = ctx;
    return () => { if ((window as any).__trooflixActiveReel?.id === ctx?.id) (window as any).__trooflixActiveReel = null; };
  }, [activeVideo]);

  useEffect(() => {
    const onAssistant = (e: Event) => {
      const detail = (e as CustomEvent)?.detail || {};
      const action = detail.action || detail.type;
      if (!action) return;
      if (action === "open_comments" && activeVideo) { setCommentSheetVideoId(activeVideo.id); return; }
      if (action === "close_comments") { setCommentSheetVideoId(null); return; }
      if (action === "open_tip" && activeVideo) {
        window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: activeVideo.creatorId, videoId: activeVideo.id } }));
        return;
      }
      if ((action === "like" || action === "like_reel" || action === "toggle_like") && activeVideo) {
        externalLike(activeVideo.id);
        return;
      }
      if ((action === "share" || action === "share_reel" || action === "open_share") && activeVideo) {
        const url = `${window.location.origin}/feed?reel=${activeVideo.id}`;
        if (navigator.share) navigator.share({ title: activeVideo.title || "Trooflix", url }).catch(() => {});
        else navigator.clipboard?.writeText(url).catch(() => {});
        return;
      }
      if (action === "toggle_mute") { toggleMute(); return; }
      if (action === "next_reel" || action === "scroll_down") { scrollDown(); return; }
      if (action === "prev_reel" || action === "scroll_up") { scrollUp(); return; }
    };
    document.addEventListener("trooflix-assistant-action", onAssistant as EventListener);
    return () => document.removeEventListener("trooflix-assistant-action", onAssistant as EventListener);
  }, [activeVideo, isMuted]);

  if (loading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+22px)] z-[100] inline-flex h-11 w-11 items-center justify-center text-white drop-shadow-lg transition hover:scale-110">
          <ArrowLeft size={28} strokeWidth={2.5} />
        </Link>
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  const activeCreator = activeVideo ? creators.find(c => String(c.id) === String(activeVideo.creatorId)) : null;

  return (
    <main className="h-[100dvh] w-full bg-[#050505] overflow-hidden flex flex-col lg:flex-row">
      <Link href="/" aria-label="Return to Home" className="fixed left-4 top-[calc(env(safe-area-inset-top)+22px)] z-[100] inline-flex h-11 w-11 items-center justify-center text-white drop-shadow-lg transition hover:scale-110">
        <ArrowLeft size={28} strokeWidth={2.5} />
      </Link>
      
      {/* MOBILE VIEW */}
      <div className="lg:hidden w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide relative bg-black pb-[calc(env(safe-area-inset-bottom)+62px)]">
        {videos.map((video, index) => {
          const creator = creators.find((c) => String(c.id) === String(video.creatorId)) || null;
          return (
            <MobileVideoShort
              key={video.id}
              video={video}
              creator={creator}
              shouldLoad={Math.abs(index - activeIndex) <= 1}
              onViewCounted={() => setViewCounts((prev) => ({ ...prev, [video.id]: (prev[video.id] ?? Number(video.views || 0)) + 1 }))}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onSetActive={() => { setActiveVideo(video); setActiveIndex(index); }}
              initialSeek={initialSeek?.id === Number(video.id) ? initialSeek : null}
              onInitialSeekApplied={() => setInitialSeek((prev) => (prev?.id === Number(video.id) ? null : prev))}
            />
          );
        })}
        {videos.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-white/50">
            <Play size={48} className="mb-4 opacity-50" />
            <p>No shorts available yet.</p>
          </div>
        )}
        <CommentSheet
          videoId={commentSheetVideoId}
          open={commentSheetVideoId !== null}
          onClose={() => setCommentSheetVideoId(null)}
        />
      </div>

      {/* Shared mobile bottom action bar (always visible) */}
      {activeVideo && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-[260] pointer-events-auto bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-3">
          <div className="mx-auto flex w-full max-w-[420px] items-center justify-around px-2 py-1">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute reel" : "Mute reel"}
              className="flex items-center justify-center min-w-0 flex-1 text-white hover:text-white/90 transition"
            >
              {isMuted ? <VolumeX size={26} strokeWidth={2.2} /> : <Volume2 size={26} strokeWidth={2.2} />}
            </button>

            <div className="flex items-center justify-center min-w-0 flex-1 text-white">
              <LikeButton key={activeVideo.id} videoId={activeVideo.id} size={28} showCount={true} stacked={false} />
            </div>

            <button
              onClick={() => setCommentSheetVideoId(activeVideo.id)}
              aria-label="Open comments"
              className="flex items-center justify-center gap-1.5 min-w-0 flex-1 text-white hover:text-white/90 transition"
            >
              <MessageCircle size={28} strokeWidth={2.2} className="text-white/90" />
              <span className="text-[13px] font-extrabold tracking-tight">{(commentCounts[activeVideo.id] ?? (commentCounts as any)[String(activeVideo.id)] ?? 0) || 0}</span>
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: activeVideo.creatorId, videoId: activeVideo.id } }))}
              aria-label="Tip creator"
              className="flex items-center justify-center gap-1.5 min-w-0 flex-1 text-white hover:text-white/90 transition"
            >
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-white/90">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
                <path d="M10.2 5.8L9.4 3.9M13.8 5.8L14.6 3.9M10.2 18.2L9.4 20.1M13.8 18.2L14.6 20.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
                <text x="12" y="15" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
              </svg>
              {Number(tipCounts[String(activeVideo.id)] || 0) > 0 && <span className="text-[13px] font-extrabold tracking-tight">{Number(tipCounts[String(activeVideo.id)] || 0).toLocaleString()}</span>}
            </button>

            <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1 text-white">
              <Eye size={28} strokeWidth={2.2} className="text-white/90" />
              <span className="text-[13px] font-extrabold tracking-tight">{(viewCounts[activeVideo.id] ?? Number((activeVideo as any).views || 0)) || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP VIEW */}
      <div className="hidden lg:flex w-full h-full items-center bg-[#050505] overflow-hidden">
        <div className="w-[10%] h-full shrink-0" />
        
        {/* 1. Left: Video (30%) */}
        <div 
          ref={videoContainerRef}
          className="w-[35%] h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide flex flex-col items-end shrink-0"
        >
          {videos.map((video, index) => (
            <DesktopVideoShort
              key={video.id}
              video={video}
              shouldLoad={Math.abs(index - activeIndex) <= 1}
              isMuted={isMuted}
              onSetActive={() => { setActiveVideo(video); setActiveIndex(index); }}
              initialSeek={initialSeek?.id === Number(video.id) ? initialSeek : null}
              onInitialSeekApplied={() => setInitialSeek((prev) => (prev?.id === Number(video.id) ? null : prev))}
            />
          ))}
        </div>

        {/* 2. Gap (1.5%) */}
        <div className="w-[1.5%] h-full shrink-0" />

        {/* 3. Middle: Control Dock (10%) */}
        <div className="w-[10%] h-full flex items-center justify-center shrink-0">
          <div className="bg-[#1c1c1e]/80 border border-white/10 rounded-full py-6 px-3 flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <button onClick={scrollUp} className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition">
              <ChevronUp size={28} />
            </button>
            <div className="w-8 h-px bg-white/10" />
            <button onClick={toggleMute} className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              {isMuted ? <VolumeX size={24}/> : <Volume2 size={24}/>}
            </button>
            <div className="flex flex-col items-center gap-1 text-white/70">
              <Eye size={24}/>
              <span className="text-[11px] font-bold">{activeVideo ? (viewCounts[activeVideo.id] ?? Number((activeVideo as any).views || 0)) : 0}</span>
            </div>
            <button className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 rounded-full transition">
              <MessageCircle size={24}/>
            </button>
            <button onClick={() => activeVideo && window.dispatchEvent(new CustomEvent("open-tip-modal", { detail: { creatorId: activeVideo.creatorId, videoId: activeVideo.id } }))} className="flex flex-col items-center gap-1 text-white/90 hover:text-white transition">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="6.6" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
                <path d="M10.2 5.8L9.4 3.9M13.8 5.8L14.6 3.9M10.2 18.2L9.4 20.1M13.8 18.2L14.6 20.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
                <text x="12" y="15" textAnchor="middle" fontSize="7.2" fontWeight="800" fill="currentColor" fontFamily="system-ui, -apple-system, sans-serif">TC</text>
              </svg>
              {activeVideo && Number(tipCounts[String(activeVideo.id)] || 0) > 0 && <span className="text-[11px] font-bold">{Number(tipCounts[String(activeVideo.id)] || 0).toLocaleString()}</span>}
            </button>
            <div className="flex flex-col items-center gap-1">
              {activeVideo && <LikeButton videoId={activeVideo.id} size={24} showCount={true} stacked={true} />}
            </div>
            <div className="w-8 h-px bg-white/10" />
            <button onClick={scrollDown} className="w-12 h-12 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 rounded-full transition">
              <ChevronDown size={28} />
            </button>
          </div>
        </div>

        {/* 4. Gap (1.5%) */}
        <div className="w-[1.5%] h-full shrink-0" />

        {/* 5. Right: Comments (57%) */}
        <div className="w-[42%] h-full flex items-center pr-6">
          <div className="w-full h-[85vh] max-h-[850px] bg-[#0a0a0a] border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {activeVideo && (
              <>
                <div className="p-4 flex items-center justify-between shrink-0 bg-[#0a0a0a] border-b border-white/5">
                  <div className="flex items-center gap-3">
                    {activeCreator?.photoUrl ? (
                      <img src={activeCreator.photoUrl} className="w-10 h-10 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-white">
                        {activeCreator?.name?.charAt(0) || "C"}
                      </div>
                    )}
                    <Link href={activeCreator?.slug ? `/profile/${activeCreator.slug}` : "#"} className="font-bold text-white hover:text-white/80 transition text-lg">
                      {activeCreator?.name || "Creator"}
                    </Link>
                  </div>
                  <button className="bg-[#E53945] hover:bg-[#d12e39] text-white text-sm font-bold px-5 py-1.5 rounded-full transition">
                    Follow
                  </button>
                </div>
                <div className="flex-1 overflow-hidden bg-[#0a0a0a]">
                  <Comments videoId={activeVideo.id} variant="chat" />
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}

function DesktopVideoShort({ video, isMuted, onSetActive, shouldLoad = true, initialSeek = null, onInitialSeekApplied }: { video: Video, isMuted: boolean, onSetActive: () => void, shouldLoad?: boolean, initialSeek?: { id: number; t: number; playing: boolean } | null, onInitialSeekApplied?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const onSetActiveRef = useRef(onSetActive);
  const isMutedRef = useRef(isMuted);
  const initialSeekRef = useRef(initialSeek);
  const initialSeekAppliedRef = useRef(false);
  const pendingInitialSeekRef = useRef(false);
  onSetActiveRef.current = onSetActive;
  isMutedRef.current = isMuted;
  initialSeekRef.current = initialSeek;

  const applyInitialSeekIfNeeded = () => {
    const current = videoRef.current;
    const seek = initialSeekRef.current;
    if (!current || !seek || initialSeekAppliedRef.current) return false;
    const ready = current.readyState >= 1 && Number.isFinite(current.duration) && current.duration > 0;
    if (!ready) { pendingInitialSeekRef.current = true; return false; }
    try {
      const t = Math.max(0, Math.min(seek.t, Math.max(0, current.duration - 0.05)));
      current.currentTime = t;
    } catch {}
    pendingInitialSeekRef.current = false;
    initialSeekAppliedRef.current = true;
    onInitialSeekApplied?.();
    return true;
  };

  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    if (diff < 320) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      lastTapRef.current = 0;
      externalLike(video.id, true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hId = Date.now() + Math.random();
      setFloatingHearts((prev) => [...prev.slice(-2), { id: hId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== hId));
      }, 900);
    } else {
      lastTapRef.current = now;
      const target = e.currentTarget;
      clickTimeoutRef.current = setTimeout(() => {
        if (target.paused) target.play();
        else target.pause();
      }, 260);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const current = videoRef.current;
        if (!current) return;
        if (entry.isIntersecting) {
          document.querySelectorAll<HTMLVideoElement>("video[data-short-player]").forEach((player) => {
            if (player !== current) {
              player.pause();
              player.muted = true;
              try { player.currentTime = 0; } catch {}
            }
          });
          const seek = initialSeekRef.current;
          const shouldApplyInitial = !!seek && !initialSeekAppliedRef.current;
          if (shouldApplyInitial) {
            pendingInitialSeekRef.current = true;
          } else {
            try { current.currentTime = 0; } catch {}
          }
          current.muted = isMutedRef.current;
          setIsActive(true);
          if (shouldApplyInitial) {
            applyInitialSeekIfNeeded();
            if (seek?.playing) current.play().catch(() => {});
            else current.play().catch(() => {});
          } else {
            current.play().catch(() => {});
          }
          onSetActiveRef.current();
        } else {
          current.pause();
          current.muted = true;
          try { current.currentTime = 0; } catch {}
          setIsActive(false);
        }
      },
      { threshold: 0.6 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        try { videoRef.current.currentTime = 0; } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted || !isActive;
  }, [isMuted, isActive]);

  return (
    <div ref={containerRef} className="w-full h-full snap-start flex items-center justify-end pr-2 shrink-0">
      <div className="relative w-full max-w-[500px] aspect-[9/16] max-h-[85vh] rounded-3xl overflow-hidden border border-white/10 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {(!video.videoUrl && !video.bitchuteUrl) ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">No video source</div>
        ) : (
          <>
            <video
              ref={videoRef}
              data-short-player
              src={shouldLoad ? (video.videoUrl || video.bitchuteUrl) : undefined}
              poster={video.posterUrl}
              loop
              playsInline
              muted={isMuted || !isActive}
              preload={shouldLoad ? "auto" : "none"}
              onLoadedMetadata={(e) => {
                const el = e.currentTarget;
                if (el.videoWidth && el.videoHeight) setIsLandscape(el.videoWidth > el.videoHeight);
                if (pendingInitialSeekRef.current) applyInitialSeekIfNeeded();
              }}
              onCanPlay={() => {
                if (pendingInitialSeekRef.current) applyInitialSeekIfNeeded();
                const v = videoRef.current;
                if (v && isActive && v.paused) v.play().catch(() => {});
              }}
              className={`w-full h-full ${isLandscape ? "object-contain bg-black" : "object-cover"} cursor-pointer`}
              onClick={handleVideoClick}
            />
            <AnimatePresence>
              {floatingHearts.map((h) => (
                <motion.div
                  key={h.id}
                  initial={{ scale: 0, opacity: 0, x: h.x - 45, y: h.y - 45, rotate: -15 }}
                  animate={{
                    scale: [0, 1.4, 1.1, 1],
                    opacity: [0, 1, 1, 0],
                    y: h.y - 120,
                    rotate: [-15, 0, 12],
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.85, ease: [0.175, 0.885, 0.32, 1.275] }}
                  className="absolute pointer-events-none z-50 flex items-center justify-center"
                  style={{ left: 0, top: 0 }}
                >
                  <Heart size={90} className="text-red-500 fill-red-500 filter drop-shadow-[0_0_25px_rgba(239,68,68,0.95)]" />
                </motion.div>
              ))}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

function MobileVideoShort({ video, creator, onViewCounted, isMuted, onToggleMute, onSetActive, shouldLoad = true, initialSeek = null, onInitialSeekApplied }: { video: Video, creator: Creator | null, onViewCounted: () => void, isMuted: boolean, onToggleMute: () => void, onSetActive: () => void, shouldLoad?: boolean, initialSeek?: { id: number; t: number; playing: boolean } | null, onInitialSeekApplied?: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const onSetActiveRef = useRef(onSetActive);
  const isMutedRef = useRef(isMuted);
  const initialSeekRef = useRef(initialSeek);
  const initialSeekAppliedRef = useRef(false);
  const pendingInitialSeekRef = useRef(false);
  onSetActiveRef.current = onSetActive;
  isMutedRef.current = isMuted;
  initialSeekRef.current = initialSeek;

  const applyInitialSeekIfNeeded = () => {
    const current = videoRef.current;
    const seek = initialSeekRef.current;
    if (!current || !seek || initialSeekAppliedRef.current) return false;
    const ready = current.readyState >= 1 && Number.isFinite(current.duration) && current.duration > 0;
    if (!ready) { pendingInitialSeekRef.current = true; return false; }
    try {
      const t = Math.max(0, Math.min(seek.t, Math.max(0, current.duration - 0.05)));
      current.currentTime = t;
    } catch {}
    pendingInitialSeekRef.current = false;
    initialSeekAppliedRef.current = true;
    onInitialSeekApplied?.();
    return true;
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [scrubX, setScrubX] = useState(0);
  const wasPlayingRef = useRef(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showError, setShowError] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSubmittingFollow, setIsSubmittingFollow] = useState(false);
  const [showReelActions, setShowReelActions] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const lastTapRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const diff = now - lastTapRef.current;
    if (diff < 320) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      lastTapRef.current = 0;
      externalLike(video.id, true);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const hId = Date.now() + Math.random();
      setFloatingHearts((prev) => [...prev.slice(-2), { id: hId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== hId));
      }, 900);
    } else {
      lastTapRef.current = now;
      clickTimeoutRef.current = setTimeout(() => {
        handleScreenClick();
      }, 260);
    }
  };

  useEffect(() => {
    getCachedUser().then((u: any) => {
      if (u) {
        setUser(u);
        (async () => {
          let checkId = Number(creator?.id ?? 0);
          if (!checkId || isNaN(checkId)) {
            const vidCreator = Number((video as any).creatorId);
            if ((video as any).creatorId && !isNaN(vidCreator)) {
              checkId = vidCreator;
            } else if ((video as any).uploaderUserId) {
              try {
                const r = await fetch("/api/creators");
                const list = await r.json();
                const match = (Array.isArray(list) ? list : []).find(
                  (c: any) => String(c.user_id) === String((video as any).uploaderUserId) || String(c.ownerUserId) === String((video as any).uploaderUserId)
                );
                if (match?.id) checkId = Number(match.id);
              } catch {}
            }
          }
          if (checkId && !isNaN(checkId)) {
            fetch(`/api/follows?creator_id=${checkId}&user_id=${u.id}`)
              .then(r => r.json())
              .then(d => setIsFollowing(d.isFollowing || false))
              .catch(() => {});
          }
        })();
      }
    });
  }, [creator?.id]);

  const resolveCreatorId = async (): Promise<number | null> => {
    if (creator?.id) return Number(creator.id);
    const vidCreator = Number((video as any).creatorId);
    if (video.creatorId && !isNaN(vidCreator)) return vidCreator;
    const uploaderUuid = (video as any).uploaderUserId;
    if (!uploaderUuid) return null;
    try {
      const res = await fetch("/api/creators");
      const list = await res.json();
      const match = (Array.isArray(list) ? list : []).find(
        (c: any) => String(c.user_id) === String(uploaderUuid) || String(c.ownerUserId) === String(uploaderUuid)
      );
      if (match?.id) return Number(match.id);
    } catch (err) {}
    return null;
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return alert("Please log in to follow creators.");
    if (isSubmittingFollow) return;
    setIsSubmittingFollow(true);
    try {
      const targetId = await resolveCreatorId();
      if (!targetId || isNaN(targetId)) return alert("This creator doesn't have a followable profile yet.");
      const newIsFollowing = !isFollowing;
      setIsFollowing(newIsFollowing);
      const res = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, creatorId: targetId })
      });
      if (!res.ok) throw new Error("Follow failed");
    } catch (err: any) {
      setIsFollowing(!isFollowing);
      alert("Follow failed: " + (err.message || "Unknown error"));
    } finally {
      setIsSubmittingFollow(false);
    }
  };

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";
  const hasLongDescription = (video.description || "").length > 65;

  const [fallbackPhoto, setFallbackPhoto] = useState("");
  const [fallbackName, setFallbackName] = useState("");
  const [fallbackSlug, setFallbackSlug] = useState("");

  useEffect(() => {
    if (creator?.photoUrl) return;
    const userId = (video as any).uploaderUserId || (video as any).creatorId;
    if (!userId) return;
    fetch(`/api/profile?user_id=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          if (d.profile.avatar_url) setFallbackPhoto(d.profile.avatar_url);
          if (d.profile.display_name || d.profile.username) setFallbackName(d.profile.display_name || d.profile.username);
          if (d.profile.username) setFallbackSlug(d.profile.username);
        }
      }).catch(() => {});
  }, [creator?.photoUrl, video]);

  const finalPhoto = creator?.photoUrl || fallbackPhoto;
  const finalName = creator?.name || fallbackName || "Creator";
  const finalSlug = creator?.slug || fallbackSlug;

  const hasTrackedViewRef = useRef(false);
  const onViewCountedRef = useRef(onViewCounted);
  onViewCountedRef.current = onViewCounted;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const current = videoRef.current;
        if (!current) return;
        if (entry.isIntersecting) {
          document.querySelectorAll<HTMLVideoElement>("video[data-short-player]").forEach((player) => {
            if (player !== current) {
              player.pause();
              player.muted = true;
              try { player.currentTime = 0; } catch {}
            }
          });
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          const seek = initialSeekRef.current;
          const shouldApplyInitial = !!seek && !initialSeekAppliedRef.current;
          if (shouldApplyInitial) {
            pendingInitialSeekRef.current = true;
          } else {
            try { current.currentTime = 0; } catch {}
          }
          current.muted = isMutedRef.current;
          setIsActive(true);
          if (shouldApplyInitial) applyInitialSeekIfNeeded();
          current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          onSetActiveRef.current();
          if (!hasTrackedViewRef.current) {
            hasTrackedViewRef.current = true;
            onViewCountedRef.current();
            fetch("/api/views", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId: video.id })
            }).catch(() => {});
          }
        } else {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          current.pause();
          current.muted = true;
          try { current.currentTime = 0; } catch {}
          setIsActive(false);
          setIsPlaying(false);
          setIsExpanded(false);
          setShowError(false);
        }
      },
      { threshold: 0.6 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      observer.disconnect();
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.muted = true;
        try { videoRef.current.currentTime = 0; } catch {}
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = isMuted || !isActive;
  }, [isMuted, isActive]);

  // When a nearby reel becomes loadable, start it if it's the active one.
  useEffect(() => {
    if (!shouldLoad || !isActive) return;
    const v = videoRef.current;
    if (v && v.paused) v.play().catch(() => {});
  }, [shouldLoad, isActive]);

  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      if (videoRef.current && !isDragging && !videoRef.current.paused) {
        const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p || 0);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isDragging]);

  const handleScreenClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      setShowPlayIcon(true);
      setTimeout(() => setShowPlayIcon(false), 800);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSeek = (e: React.PointerEvent) => {
    if (!videoRef.current || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setProgress(percentage);
    setScrubX(percentage);
    if (videoRef.current.duration) {
      const t = (percentage / 100) * videoRef.current.duration;
      setScrubTime(t);
      videoRef.current.currentTime = t;
      if (previewVideoRef.current) {
        try { previewVideoRef.current.currentTime = t; } catch {}
      }
    }
  };

  const handleDragStart = (e: React.PointerEvent) => {
    setIsDragging(true);
    if (videoRef.current) {
      wasPlayingRef.current = !videoRef.current.paused;
      videoRef.current.pause();
    }
    handleSeek(e);
  };

  const handleDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleSeek(e);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    if (videoRef.current && wasPlayingRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (isDragging && previewVideoRef.current && isFinite(scrubTime)) {
      try { previewVideoRef.current.currentTime = scrubTime; } catch {}
    }
  }, [isDragging, scrubTime]);

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      <video
        ref={videoRef}
        data-short-player
        src={shouldLoad ? videoSrc : undefined}
        poster={video.posterUrl}
        loop
        playsInline
        muted={isMuted || !isActive}
        preload={shouldLoad ? "auto" : "none"}
        onLoadStart={() => { if (isActive) setIsBuffering(true); }}
        onWaiting={() => { if (isActive) setIsBuffering(true); }}
        onLoadedData={() => {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          setIsBuffering(false);
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (el.videoWidth && el.videoHeight) setIsLandscape(el.videoWidth > el.videoHeight);
          if (pendingInitialSeekRef.current) applyInitialSeekIfNeeded();
        }}
        onCanPlay={() => {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          setIsBuffering(false);
          if (pendingInitialSeekRef.current) applyInitialSeekIfNeeded();
          const v = videoRef.current;
          if (v && isActive && v.paused) v.play().catch(() => {});
        }}
        onPlaying={() => {
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          setHasError(false);
          setShowError(false);
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onError={() => {
          const mediaError = videoRef.current?.error;
          if (!mediaError) return;
          setHasError(true);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(() => {
            const v = videoRef.current;
            if (!v) return;
            if (v.readyState >= 2 && !v.error) return;
            setShowError(true);
          }, 900);
        }}
        className={`w-full h-full ${isLandscape ? "object-contain bg-black" : "object-cover"} cursor-pointer`}
        onClick={handleVideoTap}
      />

      {isActive && isBuffering && !hasError && (
        <div className="absolute inset-0 z-[15] flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-[3px] border-white/25 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <AnimatePresence>
        {floatingHearts.map((h) => (
          <motion.div
            key={h.id}
            initial={{ scale: 0, opacity: 0, x: h.x - 48, y: h.y - 48, rotate: -15 }}
            animate={{
              scale: [0, 1.5, 1.15, 1],
              opacity: [0, 1, 1, 0],
              y: h.y - 130,
              rotate: [-15, 0, 14],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.85, ease: [0.175, 0.885, 0.32, 1.275] }}
            className="absolute pointer-events-none z-50 flex items-center justify-center"
            style={{ left: 0, top: 0 }}
          >
            <Heart size={96} className="text-red-500 fill-red-500 filter drop-shadow-[0_0_30px_rgba(239,68,68,0.95)]" />
          </motion.div>
        ))}
      </AnimatePresence>

      {showError && hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-10 px-6 text-center pointer-events-none">
          <p className="text-white font-bold mb-2">Video unavailable</p>
          <p className="text-white/50 text-sm">Please try again later.</p>
        </div>
      )}

      {showPlayIcon && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-black/50 rounded-full flex items-center justify-center">
            {isPlaying ? <Pause size={40} className="text-white" fill="currentColor" /> : <Play size={40} className="text-white ml-2" fill="currentColor" />}
          </div>
        </div>
      )}

      <div className={`absolute left-4 right-4 lg:right-[80px] bottom-[calc(env(safe-area-inset-bottom)+84px)] lg:bottom-[150px] z-30 flex flex-col items-start gap-3 pointer-events-none transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>
        <div 
          className="text-white text-[14px] drop-shadow-md leading-snug cursor-pointer pointer-events-auto max-w-[92%]"
          onClick={toggleExpand}
        >
          <span className={isExpanded ? "" : "line-clamp-2"}>
            {video.description || "Watch this exclusive clip on Trooflix."}
          </span>
          {!isExpanded && hasLongDescription && (
            <span className="text-white/60 font-bold ml-1.5 hover:text-white">... more</span>
          )}
        </div>

        {/* Avatar/creator kept out of bottom action tab */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <Link href={finalSlug ? `/profile/${finalSlug}` : "#"} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 bg-[#1c1c1e]">
              {finalPhoto ? (
                <img src={finalPhoto} alt={finalName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-black text-white bg-gradient-to-br from-[#E53945] to-[#8a1e26]">
                  {finalName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-white text-[14px] font-semibold drop-shadow-md group-hover:text-white/80 transition-colors">
              {finalName}
            </span>
          </Link>
          <button 
            onClick={handleFollow} 
            disabled={isSubmittingFollow}
            className={`ml-1 px-3 py-1 text-xs font-bold rounded-md transition border ${isFollowing ? "bg-white/10 border-white/20 text-white" : "bg-white/20 border-white/30 text-white hover:bg-white/30"} ${isSubmittingFollow ? "opacity-50 cursor-wait" : ""}`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>

      </div>

      <div className={`absolute left-0 right-0 bottom-[calc(env(safe-area-inset-bottom)+74px)] lg:bottom-[85px] z-[255] pointer-events-none px-0 lg:px-4 transition-opacity duration-150 ${isActive ? "opacity-100" : "opacity-0"}`}>
        <div 
          ref={progressBarRef}
          className="relative w-full h-[3px] bg-transparent cursor-pointer touch-none py-3 -my-3 pointer-events-auto"
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerCancel={handleDragEnd}
        >
          <div
            className={`absolute bottom-6 -translate-x-1/2 pointer-events-none z-[260] transition-opacity duration-75 ${isDragging ? "opacity-100" : "opacity-0"}`}
            style={{ left: `${Math.min(92, Math.max(8, scrubX))}%` }}
          >
            <div className="rounded-lg overflow-hidden border border-white/20 bg-black shadow-2xl w-[70px]">
              <div className="relative w-full aspect-[9/16] bg-black">
                <video
                  ref={previewVideoRef}
                  src={shouldLoad ? videoSrc : undefined}
                  muted
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
              <div className="text-[10px] font-semibold text-white text-center py-0.5 bg-black/90">
                {(() => { const s = Math.max(0, scrubTime || 0); const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${String(sec).padStart(2,'0')}`; })()}
              </div>
            </div>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] bg-white/30 pointer-events-none w-full rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 left-0 h-[3px] bg-white pointer-events-none rounded-full" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
