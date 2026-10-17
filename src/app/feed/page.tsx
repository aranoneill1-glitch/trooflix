"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {Heart, MessageCircle, Send, Bookmark, Play, VolumeX, Volume2} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import MobileBottomNav from "@/components/MobileBottomNav";
import ReelModal from "@/components/ReelModal";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import CommentDrawer from "@/components/CommentDrawer";
import ViewCount from "@/components/ViewCount";
import TextOverlayRenderer from "@/components/TextOverlay";
import { getCachedUser } from "@/lib/cache";

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
  const [filter, setFilter] = useState<"all" | "following">("all");
  const [userId, setUserId] = useState<string | null>(null);

  // Reel modal
  const [openReel, setOpenReel] = useState<Video | null>(null);
  // Comment drawer
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  // Autoplay tracking
  const [activePlayingId, setActivePlayingId] = useState<number | null>(null);
  const [showSoundPrompt, setShowSoundPrompt] = useState(false);
  const postRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Get current user
  useEffect(() => {
    getCachedUser().then((u) => setUserId(u?.id || null));
  }, []);

  // Fetch feed
  const load = async () => {
    setLoading(true);
    try {
      const url = userId && filter === "following"
        ? `/api/feed?filter=following&userId=${userId}`
        : `/api/feed?filter=all`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json();
      const list: Video[] = Array.isArray(d.posts) ? d.posts : [];
      setPosts(list);

      // Fetch creators for podcaster display
      try {
        const cRes = await fetch("/api/creators");
        const cData = await cRes.json();
        setCreators(Array.isArray(cData) ? cData : []);
      } catch {}

      // Fetch uploader profiles (user-based posts)
      const uploaderIds = Array.from(
        new Set(list.map((p) => p.uploaderUserId).filter(Boolean))
      ) as string[];
      if (uploaderIds.length > 0) {
        const profiles: Record<string, UploaderProfile> = {};
        await Promise.all(
          uploaderIds.map(async (uid) => {
            try {
              const r = await fetch(`/api/profile?user_id=${uid}`);
              const pd = await r.json();
              if (pd.profile) profiles[uid] = pd.profile;
            } catch {}
          })
        );
        setUploaders(profiles);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId !== null || filter === "all") load();
  }, [userId, filter]);

  // Show "tap for sound" prompt on first feed visit in session
  useEffect(() => {
    if (posts.length === 0) return;
    try {
      const dismissed = sessionStorage.getItem("trooflix:sound-prompt");
      if (!dismissed) setShowSoundPrompt(true);
    } catch {
      setShowSoundPrompt(true);
    }
  }, [posts.length]);

  // IntersectionObserver — track which reel is most visible
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

  // Author resolver
  const authorFor = (p: Video) => {
    if (p.uploaderUserId) {
      const profile = uploaders[p.uploaderUserId];
      if (profile) {
        return {
          name: profile.display_name || profile.username || "User",
          handle: profile.username ? `@${profile.username}` : "",
          avatar: profile.avatar_url || "",
          verified: !!profile.is_verified,
          href: profile.username ? `/u/${profile.username}` : null,
        };
      }
      return { name: "User", handle: "", avatar: "", verified: false, href: null };
    }
    const creator = creators.find((c) => c.id === p.creatorId);
    if (creator) {
      return {
        name: creator.name,
        handle: `@${creator.slug}`,
        avatar: creator.photoUrl || "",
        verified: !!creator.isVerified,
        href: `/podcaster/${creator.slug}`,
      };
    }
    return { name: "TROOFLIX", handle: "@trooflix", avatar: "", verified: true, href: null };
  };

  return (
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">

      {/* Toggle */}
      <div className="sticky top-0 z-40 bg-black border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto flex">
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

      <div className="max-w-lg mx-auto pt-2 px-2 md:px-0 space-y-4">
        {loading && (
          <p className="text-center text-white/50 py-12">Loading…</p>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 px-4">
            <p className="text-white/60 mb-2">
              {filter === "following"
                ? "Nothing here yet. Follow people to see their posts."
                : "No posts yet. Be the first to post!"}
            </p>
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={authorFor(post)}
            onOpenReel={() => setOpenReel(post)}
            onOpenComments={() => setCommentVideo(post)}
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
          />
        ))}
      </div>

      <MobileBottomNav />

      {/* Reel modal */}
      <ReelModal open={!!openReel} onClose={() => setOpenReel(null)}>
        {openReel && <ReelPlayer video={openReel} onClose={() => setOpenReel(null)} onOpenComments={() => { setCommentVideo(openReel); setOpenReel(null); }} />}
      </ReelModal>

      {/* Comment drawer */}
      {commentVideo && (
        <CommentDrawer
          videoId={commentVideo.id}
          title={commentVideo.title || "Post"}
          onClose={() => setCommentVideo(null)}
        />
      )}
    </main>
  );
}

// ============================================================
// PostCard
// ============================================================
function PostCard({
  post,
  author,
  onOpenReel,
  onOpenComments,
  isActivePlaying,
  showSoundPrompt,
  onDismissSoundPrompt,
  registerRef,
}: {
  post: Video;
  author: { name: string; handle: string; avatar: string; verified: boolean; href: string | null };
  onOpenReel: () => void;
  onOpenComments: () => void;
  isActivePlaying: boolean;
  showSoundPrompt: boolean;
  onDismissSoundPrompt: () => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isReel = post.type === "Reel";
  const isImage = post.type === "Image";
  const isTroo = post.type === "Troo";

  // Play when active, pause when not
  useEffect(() => {
    if (!isReel) return;
    const v = videoRef.current;
    if (!v) return;
    if (isActivePlaying) {
      v.muted = true;
      v.play().catch(() => {});
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
    }
  }, [isActivePlaying, isReel]);

  return (
    <article
      ref={(el) => registerRef(el as HTMLElement | null)}
      data-post-id={post.id}
      className="bg-[#0f0f12] md:rounded-xl overflow-hidden border border-white/5"
    >
      {/* Author row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {author.avatar ? (
          <img src={author.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-xs font-bold">
            {author.name[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold inline-flex items-center gap-1 truncate">
            {author.href ? (
              <Link href={author.href} className="hover:underline truncate">
                {author.name}
              </Link>
            ) : (
              <span className="truncate">{author.name}</span>
            )}
            {author.verified && <VerifiedBadge size={12} />}
          </p>
          {author.handle && (
            <p className="text-xs text-white/50 truncate">{author.handle} · {timeAgo(post.createdAt)}</p>
          )}
        </div>
      </div>

      {/* Media */}
      {isReel && (
        <div className="relative w-full aspect-[4/5] bg-black overflow-hidden">
          <video
            ref={videoRef}
            src={post.videoUrl ?? post.bitchuteUrl ?? ""}
            poster={post.posterUrl}
            className="w-full h-full object-cover cursor-pointer"
            muted
            loop
            playsInline
            preload="metadata"
            onClick={onOpenReel}
          />
          <TextOverlayRenderer overlays={post.textOverlays} />

          {/* "Tap for sound" pill — first video only */}
          {showSoundPrompt && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismissSoundPrompt();
                onOpenReel();
              }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 backdrop-blur text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 hover:bg-black/85 transition z-10"
            >
              🔊 Tap for sound
            </button>
          )}
        </div>
      )}

      {isImage && post.posterUrl && (
        <img
          src={post.posterUrl}
          alt={post.title || ""}
          className="w-full h-auto object-contain bg-black"
          loading="lazy"
        />
      )}

      {isTroo && (
        <div className="px-4 py-5">
          <p className="text-base md:text-lg whitespace-pre-wrap leading-relaxed">
            {post.description}
          </p>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-white/5">
        <div className="flex items-center ml-1">
          <LikeButton videoId={post.id} size={22} />
        </div>
        <div className="flex items-center ml-2">
          <button
            onClick={onOpenComments}
            className="p-2 text-white/80 hover:text-white transition"
            aria-label="Comment"
          >
            <MessageCircle size={22} />
          </button>
        </div>
        <div className="ml-2">
          <ShareReelTrigger videoId={post.id} videoTitle={post.title || ""} />
        </div>
        <div className="ml-2 text-xs text-white/60 flex items-center">
          <ViewCount videoId={post.id} showIcon />
        </div>
        <div className="ml-auto">
          <SaveButton videoId={post.id} variant="icon" />
        </div>
      </div>

      {/* Caption */}
      {!isTroo && post.description && (
        <div className="px-3 pb-3">
          {post.title && (
            <p className="text-sm font-semibold mb-0.5">{post.title}</p>
          )}
          <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-3">
            {post.description}
          </p>
        </div>
      )}

      {isTroo && post.title && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-white/40">{timeAgo(post.createdAt)}</p>
        </div>
      )}
    </article>
  );
}

// Inline share trigger
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

// ============================================================
// ReelPlayer — full-screen reel (used inside ReelModal)
// Simple version for now: plays video, shows text overlays
// ============================================================
function ReelPlayer({ video, onClose, onOpenComments }: { video: Video; onClose: () => void; onOpenComments: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={video.videoUrl ?? video.bitchuteUrl ?? ""}
        className="w-full h-full object-contain"
        muted={muted}
        loop
        autoPlay
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          e.currentTarget.muted = muted;
        }}
      />
      <TextOverlayRenderer overlays={video.textOverlays} />
      {/* Right rail */}
      <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button
          onClick={() => setMuted((m) => !m)}
          className="flex flex-col items-center text-white"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
        </button>
        <LikeButton videoId={video.id} size={30} stacked />
        <button
          onClick={onOpenComments}
          className="flex flex-col items-center text-white"
          aria-label="Comment"
        >
          <MessageCircle size={30} />
        </button>
        <ShareReelTrigger videoId={video.id} videoTitle={video.title || ""} />
        <SaveButton videoId={video.id} variant="icon" />
      </div>

      {/* Caption overlay at bottom */}
      {video.description && (
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
          <div className="max-w-[80%] pointer-events-auto">
            {video.title && (
              <p className="text-sm font-semibold text-white leading-snug mb-1 line-clamp-2">
                {video.title}
              </p>
            )}
            <p className="text-xs text-white/80 whitespace-pre-wrap line-clamp-3">
              {video.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
