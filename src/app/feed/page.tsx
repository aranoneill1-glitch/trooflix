"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {Heart, MessageCircle, Send, Bookmark, Play, Pause, VolumeX, Volume2, Plus, Share, Repeat2, ChevronLeft, Maximize2} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileBottomNav from "@/components/MobileBottomNav";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import CommentDrawer from "@/components/CommentDrawer";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import ViewCount, { trackView } from "@/components/ViewCount";
import TextOverlayRenderer from "@/components/TextOverlay";
import { getCachedUser } from "@/lib/cache";
import PullToRefresh from "@/components/PullToRefresh";
import ReportModal from "@/components/ReportModal";

type Video = {
  id: number;
  title?: string;
  description?: string;
  type: string;                // "Reel" | "Image" | "Troo"
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl?: string;
  backdropUrl?: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  textOverlays?: any[];
  createdAt?: string;
  viewCount?: number;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  isVerified?: boolean;
};

type UploaderProfile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  tier?: "user" | "pro" | "podcaster";
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, UploaderProfile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reels" | "following">("all");
  const [userId, setUserId] = useState<string | null>(null);

  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [openVideoModal, setOpenVideoModal] = useState<Video | null>(null);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const postRefs = useRef<Map<number, HTMLElement>>(new Map());
  const trackedIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    getCachedUser().then((u) => setUserId(u?.id || null));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const url = userId && filter === "following"
        ? `/api/feed?filter=following&userId=${userId}`
        : `/api/feed?filter=all`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json();
      const list: Video[] = Array.isArray(d.posts) ? d.posts : [];

      let creatorsData: any[] = [];
      const profiles: Record<string, UploaderProfile> = {};

      try {
        const uploaderIds = Array.from(
          new Set(list.map((p: any) => p.uploaderUserId).filter(Boolean))
        ) as string[];

        await Promise.all([
          fetch("/api/creators")
            .then((r) => r.json())
            .then((c) => { if (Array.isArray(c)) creatorsData = c; })
            .catch(() => {}),
          ...uploaderIds.map(async (uid) => {
            try {
              const r = await fetch(`/api/profile?user_id=${uid}`);
              const pd = await r.json();
              if (pd.profile) profiles[uid] = pd.profile;
            } catch {}
          }),
        ]);
      } catch {}

      setPosts(list);
      setCreators(creatorsData);
      setUploaders(profiles);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId !== null || filter === "all") load();
  }, [userId, filter]);

  useEffect(() => {
    if (posts.length === 0) return;
    try {
      const dismissed = sessionStorage.getItem("trooflix:sound-prompt");
      if (!dismissed) setShowSoundPrompt(true);
    } catch {
      setShowSoundPrompt(true);
    }
  }, [posts.length]);

  useEffect(() => {
    if (posts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { id: number; ratio: number } | null = null;
        for (const entry of entries) {
          if (entry.intersectionRatio >= 0.6) {
            const id = Number((entry.target as HTMLElement).dataset.postId);
            if (!best || entry.intersectionRatio > best.ratio) {
              best = { id, ratio: entry.intersectionRatio };
            }
          }
        }
        if (best) setActivePlayingId(best.id);
      },
      { threshold: [0.25, 0.5, 0.75, 1.0] }
    );
    postRefs.current.forEach((el) => observer.observe(el));
  return () => observer.disconnect();
  }, [posts.length]);

  useEffect(() => {
    if (!activePlayingId) return;
    if (trackedIdsRef.current.has(activePlayingId)) return;
    trackedIdsRef.current.add(activePlayingId);
    trackView(activePlayingId);
  }, [activePlayingId]);

  const authorFor = (p: Video) => {
    if (p.uploaderUserId) {
      const profile = uploaders[p.uploaderUserId];
      if (profile) {
        const name =
          (profile.display_name && profile.display_name.trim()) ||
          (profile.username && profile.username.trim()) ||
          `User ${p.uploaderUserId.slice(0, 6)}`;
        return {
          name,
          handle: profile.username ? `@${profile.username}` : "",
          avatar: profile.avatar_url || "",
          verified: !!profile.is_verified,
          tier: profile.tier || "user",
          href: profile.username ? `/u/${profile.username}` : null,
        };
      }
      return { name: `User ${p.uploaderUserId.slice(0, 6)}`, handle: "", avatar: "", verified: false, tier: "user" as const, href: null };
    }
    const creator = creators.find((c) => c.id === p.creatorId);
    if (creator) {
      return {
        name: creator.name,
        handle: `@${creator.slug}`,
        avatar: creator.photoUrl || "",
        verified: !!creator.isVerified,
        tier: "podcaster" as const,
        href: `/podcaster/${creator.slug}`,
      };
    }
    return { name: "TROOFLIX", handle: "@trooflix", avatar: "", verified: true, tier: "podcaster" as const, href: null };
  };

  const displayedPosts = useMemo(() => {
    if (filter === "reels") {
      return posts.filter((p: any) => p.videoUrl || p.bitchuteUrl || p.type === "Reel");
    }
    return posts;
  }, [posts, filter]);

  return (
    <>
    <PullToRefresh onRefresh={async () => { await load(); }}>
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <div className="sticky top-0 z-40 bg-black border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center w-full">
          <Link
            href="/"
            className="hidden md:flex items-center justify-center w-16 h-full py-3 text-white/50 hover:text-white transition border-r border-white/5"
          >
            <ChevronLeft size={20} />
          </Link>

          <div className="flex flex-1 w-full">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
                filter === "all"
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("reels")}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
                filter === "reels"
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              Reels
            </button>
            <button
              onClick={() => setFilter("following")}
              className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
                filter === "following"
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              Following
            </button>
          </div>
        </div>
      </div>

      <div className="pt-0 space-y-0 max-w-[600px] mx-auto md:border-x border-white/10 bg-black min-h-screen">
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 px-4">
            <p className="text-white/60 mb-2">
              {filter === "following"
                ? "Nothing here yet. Follow people to see their posts."
                : "No posts yet. Be the first to post!"}
            </p>
          </div>
        )}

        {displayedPosts.map((post, idx) => { const activeIdx = displayedPosts.findIndex(p => p.id === activePlayingId); return (
          <PostCard
            key={post.id}
            post={post}
            userId={userId}
            author={authorFor(post)}
            onOpenComments={() => setCommentVideo(post)}
            onOpenFullScreen={() => setOpenVideoModal(post)}
            isActivePlaying={activePlayingId === post.id}
            showSoundPrompt={showSoundPrompt && activePlayingId === post.id}
            onDismissSoundPrompt={() => {
              setShowSoundPrompt(false);
              try { sessionStorage.setItem("trooflix:sound-prompt", "1"); } catch {}
            }}
            registerRef={(el) => {
              if (el) postRefs.current.set(post.id, el);
              else postRefs.current.delete(post.id);
            }}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ); })}
      </div>

      {commentVideo && (
        <CommentDrawer
          videoId={commentVideo.id}
          title={commentVideo.title || "Post"}
          onClose={() => setCommentVideo(null)}
        />
      )}

      <AnimatePresence>
        {openVideoModal && (
          <ProfileReelViewer
            videos={displayedPosts.filter(p => p.videoUrl || p.bitchuteUrl)}
            initialIndex={displayedPosts.findIndex(p => p.id === openVideoModal.id)}
            onClose={() => setOpenVideoModal(null)}
            author={{
              name: authorFor(openVideoModal).name,
              avatar: authorFor(openVideoModal).avatar,
              verified: authorFor(openVideoModal).verified,
              profileHref: authorFor(openVideoModal).href || "#"
            }}
          />
        )}
      </AnimatePresence>
    </main>
    </PullToRefresh>
    <MobileBottomNav />
    </>
  );
}

function PostCard({
  post,
  userId,
  author,
  onOpenComments,
  onOpenFullScreen,
  isActivePlaying,
  isNext,
  showSoundPrompt,
  onDismissSoundPrompt,
  registerRef,
  muted,
  onToggleMute,
}: {
  post: Video;
  userId: string | null;
  author: { name: string; handle: string; avatar: string; verified: boolean; tier?: "user" | "pro" | "podcaster"; href: string | null };
  onOpenComments: () => void;
  onOpenFullScreen: () => void;
  isActivePlaying: boolean;
  isNext?: boolean;
  showSoundPrompt: boolean;
  onDismissSoundPrompt: () => void;
  registerRef: (el: HTMLElement | null) => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const hasVideo = !!(post.videoUrl || post.bitchuteUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const isImage = post.type === "Image";

  const pauseAllOthers = (thisVideo: HTMLVideoElement) => {
    const all = document.querySelectorAll<HTMLVideoElement>("video");
    all.forEach((el) => {
      if (el !== thisVideo && !el.paused) {
        el.pause();
      }
    });
  };

  useEffect(() => {
    if (!hasVideo) return;
    const v = videoRef.current;
    if (!v) return;
    
    if (isActivePlaying) {
      pauseAllOthers(v);
      v.muted = muted;
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
      setPlaying(false);
    }
  }, [isActivePlaying, hasVideo, muted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const handleExternalShare = async () => {
    const url = window.location.origin + '/feed?reel=' + post.id;
    if (navigator.share) {
      try { await navigator.share({ title: post.title || 'Trooflix Post', url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert('Link copied to clipboard!'); } catch {}
    }
  };

  return (
    <article
      ref={(el) => registerRef(el as HTMLElement | null)}
      data-post-id={post.id}
      className="bg-black border-b border-white/10"
    >
      <div className="flex gap-3 p-3">
        {/* Left Column - Avatar */}
        <div className="flex-shrink-0">
          {author.href ? (
            <Link href={author.href}>
              {author.avatar ? (
                <img src={author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold text-white">
                  {author.name[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Link>
          ) : (
            author.avatar ? (
              <img src={author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-sm font-bold text-white">
                {author.name[0]?.toUpperCase() || "?"}
              </div>
            )
          )}
        </div>

        {/* Right Column - Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm truncate">
              {author.href ? (
                <Link href={author.href} className="font-bold text-white truncate hover:underline">
                  {author.name}
                </Link>
              ) : (
                <span className="font-bold text-white truncate">{author.name}</span>
              )}
              {author.verified && <VerifiedBadge size={14} variant={author.tier === "podcaster" ? "gold" : "red"} />}
              <span className="text-white/50 truncate">{author.handle}</span>
              <span className="text-white/50">·</span>
              <span className="text-white/50">{timeAgo(post.createdAt)}</span>
            </div>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="text-white/50 hover:text-white p-1"
                aria-label="More"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-[300]" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-8 z-[301] bg-[#1a1a1f] border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[140px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setReportOpen(true); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition"
                    >
                      Report post
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Content Text */}
          {post.description && (
            <p className="text-[15px] text-white whitespace-pre-wrap mt-1 mb-2 leading-relaxed">
              {post.description}
            </p>
          )}

          {/* Media */}
          <div className="mt-2 rounded-2xl overflow-hidden bg-black relative">
            {hasVideo && (
              <div className="relative bg-black w-full flex justify-center">
                <video
                  ref={videoRef}
                  src={post.videoUrl ?? post.bitchuteUrl ?? ""}
                  className="w-full max-h-[75vh] object-cover cursor-pointer"
                  muted={muted}
                  loop
                  playsInline
                  preload={isActivePlaying || isNext ? "auto" : "metadata"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (muted) {
                      onToggleMute();
                    } else {
                      togglePlay();
                    }
                  }}
                />
                <TextOverlayRenderer overlays={post.textOverlays} />
                
                {/* Play/Pause overlay */}
                {!playing && isActivePlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Play size={32} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                )}

                {/* Bottom controls */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition"
                  >
                    {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition"
                  >
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>

                {/* Full Screen Button */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenFullScreen(); }}
                    className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 transition"
                    title="Full Screen"
                  >
                    <Maximize2 size={18} />
                  </button>
                </div>

                {/* Tap to Unmute overlay */}
                {muted && isActivePlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 flex items-center gap-2">
                      <VolumeX size={18} className="text-white" />
                      <span className="text-white font-bold text-sm">Tap to Unmute</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isImage && post.posterUrl && (
              <img
                src={post.posterUrl}
                alt={post.title || ""}
                className="w-full max-h-[70vh] object-cover bg-black"
                loading="lazy"
              />
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-3 -ml-2 pr-2">
            <div className="flex items-center text-white/50 hover:text-red-500 group transition">
              <LikeButton videoId={post.id} size={20} showCount />
            </div>

            <button onClick={onOpenComments} className="flex items-center gap-1 text-white/50 hover:text-blue-400 group transition">
              <div className="p-2 rounded-full group-hover:bg-blue-400/10"><MessageCircle size={20} /></div>
              <span className="text-xs font-medium"><CommentCountInline videoId={post.id} /></span>
            </button>

            <RepostButton postId={post.id} />

            <div className="flex items-center gap-1 text-white/50 hover:text-blue-400 group transition">
              <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h4l2-8 4 16 2-8h6" />
                </svg>
              </div>
              <span className="text-xs font-medium"><ViewCount videoId={post.id} showIcon={false} /></span>
            </div>

            <div className="flex items-center gap-1 text-white/50 hover:text-green-400 group transition">
              <ShareReelTrigger videoId={post.id} videoTitle={post.title || ""} />
            </div>

            <button onClick={handleExternalShare} className="flex items-center text-white/50 hover:text-blue-400 group transition">
              <div className="p-2 rounded-full group-hover:bg-blue-400/10"><Share size={20} /></div>
            </button>

            <div className="flex items-center text-white/50 hover:text-blue-400 group transition">
              <div className="p-2 rounded-full group-hover:bg-blue-400/10">
                <SaveButton videoId={post.id} variant="icon" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        contentType="post"
        contentId={post.id}
      />
    </article>
  );
}

function ShareReelTrigger({ videoId, videoTitle }: { videoId: number; videoTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-white/80 hover:text-white transition"
        aria-label="Share"
      >
        <Send size={22} />
      </button>
      <ShareReelSheet
        open={open}
        onClose={() => setOpen(false)}
        videoId={videoId}
        videoTitle={videoTitle}
      />
    </>
  );
}

function CommentCountInline({ videoId }: { videoId: number }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/comment-counts")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          const c = d.counts && typeof d.counts === "object" ? d.counts[videoId] || 0 : 0;
          setCount(c);
        }
      })
      .catch(() => { if (!cancelled) setCount(0); });
    return () => { cancelled = true; };
  }, [videoId]);

  if (count === null || count === 0) return null;
  return <>{count.toLocaleString()}</>;
}

function RepostButton({ postId }: { postId: number }) {
  const [reposted, setReposted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    import("@/lib/cache").then(({ getCachedUser }) =>
      getCachedUser().then(async (u) => {
        if (!u) return;
        setUserId(u.id);
        try {
          const r = await fetch(`/api/reposts?user_id=${u.id}`, { cache: "no-store" });
          const d = await r.json();
          if (Array.isArray(d.ids) && d.ids.includes(postId)) setReposted(true);
        } catch {}
      })
    );
  }, [postId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId || busy) return;
    setBusy(true);
    const next = !reposted;
    setReposted(next);
    try {
      const res = await fetch("/api/reposts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, postId }),
      });
      if (!res.ok) setReposted(!next);
    } catch {
      setReposted(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex items-center transition ${
        reposted ? "text-green-500" : "text-white/50 hover:text-green-400"
      } group`}
      aria-label={reposted ? "Undo repost" : "Repost"}
    >
      <div className={`p-2 rounded-full ${reposted ? "bg-green-500/10" : "group-hover:bg-green-400/10"}`}>
        <Repeat2 size={20} strokeWidth={1.8} />
      </div>
    </button>
  );
}
