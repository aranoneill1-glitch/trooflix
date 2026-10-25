"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {Heart, MessageCircle, Send, Play, Pause, VolumeX, Volume2, Share, Repeat2, ChevronLeft, Bookmark} from "lucide-react";
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
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl?: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  textOverlays?: any[];
  createdAt?: string;
};

type Creator = { id: number; name: string; slug: string; photoUrl?: string; isVerified?: boolean; };
type UploaderProfile = { display_name?: string | null; username?: string | null; avatar_url?: string | null; is_verified?: boolean; tier?: string; };

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
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

  const postRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    getCachedUser().then((u) => setUserId(u?.id || null));
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const url = userId && filter === "following" ? `/api/feed?filter=following&userId=${userId}` : `/api/feed?filter=all`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json();
      const list: Video[] = Array.isArray(d.posts) ? d.posts : [];

      let creatorsData: any[] = [];
      const profiles: Record<string, UploaderProfile> = {};

      try {
        const uploaderIds = Array.from(new Set(list.map((p: any) => p.uploaderUserId).filter(Boolean))) as string[];
        await Promise.all([
          fetch("/api/creators").then((r) => r.json()).then((c) => { if (Array.isArray(c)) creatorsData = c; }).catch(() => {}),
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
    if (posts.length > 0 && !activePlayingId) {
      setActivePlayingId(posts[0].id);
    }
  }, [posts, activePlayingId]);

  useEffect(() => {
    if (posts.length === 0) return;
    const handleScroll = () => {
      const viewportCenter = window.innerHeight / 2;
      let closestId: number | null = null;
      let minDistance = Infinity;

      postRefs.current.forEach((el: HTMLElement, id: number) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const elCenter = rect.top + rect.height / 2;
          const distance = Math.abs(viewportCenter - elCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestId = id;
          }
        }
      });
      if (closestId !== null) setActivePlayingId(closestId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [posts.length]);

  const authorFor = (p: Video) => {
    if (p.uploaderUserId && uploaders[p.uploaderUserId]) {
      const profile = uploaders[p.uploaderUserId];
      const name = profile.display_name || profile.username || `User ${p.uploaderUserId.slice(0, 6)}`;
      return { name, handle: profile.username ? `@${profile.username}` : "", avatar: profile.avatar_url || "", verified: !!profile.is_verified, tier: profile.tier || "user", href: profile.username ? `/u/${profile.username}` : null };
    }
    const creator = creators.find((c) => c.id === p.creatorId);
    if (creator) return { name: creator.name, handle: `@${creator.slug}`, avatar: creator.photoUrl || "", verified: !!creator.isVerified, tier: "podcaster", href: `/podcaster/${creator.slug}` };
    return { name: "TROOFLIX", handle: "@trooflix", avatar: "", verified: true, tier: "podcaster", href: null };
  };

  const displayedPosts = useMemo(() => {
    if (filter === "reels") return posts.filter((p: any) => p.videoUrl || p.bitchuteUrl || p.type === "Reel");
    return posts;
  }, [posts, filter]);

  const videosForModal = useMemo(() => displayedPosts.filter(p => p.videoUrl || p.bitchuteUrl), [displayedPosts]);
  const initialModalIndex = useMemo(() => videosForModal.findIndex(p => p.id === openVideoModal?.id), [videosForModal, openVideoModal]);

  return (
    <>
    <PullToRefresh onRefresh={async () => { await load(); }}>
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <div className="sticky top-0 z-40 bg-black border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center w-full">
          <Link href="/" className="hidden md:flex items-center justify-center w-16 h-full py-3 text-white/50 hover:text-white transition border-r border-white/5">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex flex-1 w-full">
            <button onClick={() => setFilter("all")} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${filter === "all" ? "border-white text-white" : "border-transparent text-white/50"}`}>All</button>
            <button onClick={() => setFilter("reels")} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${filter === "reels" ? "border-white text-white" : "border-transparent text-white/50"}`}>Reels</button>
            <button onClick={() => setFilter("following")} className={`flex-1 py-3 text-sm font-semibold border-b-2 ${filter === "following" ? "border-white text-white" : "border-transparent text-white/50"}`}>Following</button>
          </div>
        </div>
      </div>

      <div className="pt-0 max-w-[600px] mx-auto md:border-x border-white/10 bg-black min-h-screen">
        {!loading && posts.length === 0 && <div className="text-center py-16 px-4 text-white/60">No posts yet.</div>}

        {displayedPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={authorFor(post)}
            onOpenComments={() => setCommentVideo(post)}
            onOpenFullScreen={() => setOpenVideoModal(post)}
            isActivePlaying={activePlayingId === post.id && !openVideoModal}
            registerRef={(el: HTMLElement | null) => {
              if (el) postRefs.current.set(post.id, el);
              else postRefs.current.delete(post.id);
            }}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ))}
      </div>

      {commentVideo && <CommentDrawer videoId={commentVideo.id} title={commentVideo.title || "Post"} onClose={() => setCommentVideo(null)} />}

      <AnimatePresence>
        {openVideoModal && initialModalIndex !== -1 && (
          <ProfileReelViewer
            videos={videosForModal}
            initialIndex={initialModalIndex}
            onClose={() => setOpenVideoModal(null)}
            getAuthor={(v) => {
              const a = authorFor(v);
              return { name: a.name, avatar: a.avatar, verified: a.verified, profileHref: a.href || "#" };
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

function PostCard({ post, author, onOpenComments, onOpenFullScreen, isActivePlaying, registerRef, muted, onToggleMute }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActivePlaying) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [isActivePlaying]);

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenFullScreen();
  };

  return (
    <article ref={(el) => registerRef(el as HTMLElement | null)} className="bg-black border-b border-white/10">
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0">
          {author.href ? (
            <Link href={author.href}>
              {author.avatar ? <img src={author.avatar} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center font-bold">{author.name[0]?.toUpperCase()}</div>}
            </Link>
          ) : <div className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center font-bold">{author.name[0]?.toUpperCase()}</div>}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm truncate">
              <Link href={author.href || "#"} className="font-bold text-white hover:underline">{author.name}</Link>
              {author.verified && <VerifiedBadge size={14} variant="gold" />}
              <span className="text-white/50 ml-1">{timeAgo(post.createdAt)}</span>
            </div>
          </div>

          {post.description && <p className="text-[15px] text-white mt-1 mb-2 leading-relaxed">{post.description}</p>}

          <div className="mt-2 rounded-2xl overflow-hidden bg-black relative">
            {post.videoUrl && (
              <div className="relative bg-black w-full flex justify-center cursor-pointer" onClick={handleVideoClick}>
                {/* FIXED: h-auto and object-contain so the video is not cropped */}
                <video 
                  ref={videoRef} 
                  src={post.videoUrl || post.bitchuteUrl} 
                  poster={post.posterUrl}
                  className="w-full h-auto max-h-[75vh] object-contain pointer-events-none" 
                  muted={muted} 
                  loop 
                  playsInline 
                  preload="auto"
                />
                <TextOverlayRenderer overlays={post.textOverlays} />
                {!playing && isActivePlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"><Play size={32} fill="white" /></div>
                  </div>
                )}
                <div className="absolute bottom-3 right-3 flex items-center gap-2 z-30 pointer-events-auto">
                  <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white">
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                </div>
              </div>
            )}
            {post.type === "Image" && post.posterUrl && <img src={post.posterUrl} className="w-full max-h-[70vh] object-cover" />}
          </div>

          <div className="flex items-center justify-between mt-3 -ml-2 pr-2">
            <LikeButton videoId={post.id} size={20} showCount />
            <button onClick={onOpenComments} className="flex items-center gap-1 text-white/50 hover:text-blue-400"><MessageCircle size={20} /><span className="text-xs"><ViewCount videoId={post.id} showIcon={false} /></span></button>
            <ShareReelTrigger videoId={post.id} videoTitle={post.title || ""} />
            <SaveButton videoId={post.id} variant="icon" />
          </div>
        </div>
      </div>
      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} contentType="post" contentId={post.id} />
    </article>
  );
}

function ShareReelTrigger({ videoId, videoTitle }: any) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="p-2 text-white/80"><Send size={20} /></button>
      <ShareReelSheet open={open} onClose={() => setOpen(false)} videoId={videoId} videoTitle={videoTitle} />
    </>
  );
}
