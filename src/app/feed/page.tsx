"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import {Heart, MessageCircle, Send, Play, VolumeX, Volume2, ChevronLeft} from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import CommentDrawer from "@/components/CommentDrawer";
import ProfileReelViewer from "@/components/ProfileReelViewer";
import ViewCount from "@/components/ViewCount";
import TextOverlayRenderer from "@/components/TextOverlay";
import { getCachedUser } from "@/lib/cache";
import PullToRefresh from "@/components/PullToRefresh";
import ReportModal from "@/components/ReportModal";

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
  const [posts, setPosts] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "reels" | "following">("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [commentVideo, setCommentVideo] = useState<any>(null);
  const [openVideoModal, setOpenVideoModal] = useState<any>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => { getCachedUser().then((u) => setUserId(u?.id || null)); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const url = userId && filter === "following" ? `/api/feed?filter=following&userId=${userId}` : `/api/feed?filter=all`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json();
      const list = Array.isArray(d.posts) ? d.posts : [];

      let cData: any[] = [];
      const profiles: Record<string, any> = {};
      try {
        const uids = Array.from(new Set(list.map((p: any) => p.uploaderUserId).filter(Boolean))) as string[];
        await Promise.all([
          fetch("/api/creators").then((r) => r.json()).then((c) => { if (Array.isArray(c)) cData = c; }).catch(() => {}),
          ...uids.map(async (uid) => {
            const r = await fetch(`/api/profile?user_id=${uid}`);
            const pd = await r.json();
            if (pd.profile) profiles[uid] = pd.profile;
          }),
        ]);
      } catch {}
      setPosts(list); setCreators(cData); setUploaders(profiles);
    } catch { setPosts([]); } finally { setLoading(false); }
  };

  useEffect(() => { if (userId !== null || filter === "all") load(); }, [userId, filter]);

  const authorFor = (p: any) => {
    if (p.uploaderUserId && uploaders[p.uploaderUserId]) {
      const pr = uploaders[p.uploaderUserId];
      return { name: pr.display_name || pr.username || `User ${p.uploaderUserId.slice(0, 6)}`, avatar: pr.avatar_url || "", verified: !!pr.is_verified, href: pr.username ? `/u/${pr.username}` : null };
    }
    const cr = creators.find((c) => c.id === p.creatorId);
    if (cr) return { name: cr.name, avatar: cr.photoUrl || "", verified: !!cr.isVerified, href: `/podcaster/${cr.slug}` };
    return { name: "TROOFLIX", avatar: "", verified: true, href: null };
  };

  const displayedPosts = useMemo(() => {
    return filter === "reels" ? posts.filter((p) => p.videoUrl || p.bitchuteUrl || p.type === "Reel") : posts;
  }, [posts, filter]);

  const videosForModal = useMemo(() => displayedPosts.filter(p => p.videoUrl || p.bitchuteUrl), [displayedPosts]);
  const initialModalIndex = useMemo(() => videosForModal.findIndex(p => p.id === openVideoModal?.id), [videosForModal, openVideoModal]);

  return (
    <>
    <PullToRefresh onRefresh={load}>
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <div className="sticky top-0 z-40 bg-black border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center w-full">
          <Link href="/" className="hidden md:flex items-center justify-center w-16 h-full py-3 text-white/50 border-r border-white/5"><ChevronLeft size={20} /></Link>
          <div className="flex flex-1 w-full">
            {(["all", "reels", "following"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-3 text-sm font-semibold border-b-2 capitalize ${filter === f ? "border-white text-white" : "border-transparent text-white/50"}`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-0 max-w-[600px] mx-auto md:border-x border-white/10 bg-black min-h-screen">
        {!loading && posts.length === 0 && <div className="text-center py-16 text-white/60">No posts yet.</div>}
        {displayedPosts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            author={authorFor(post)}
            onOpenComments={() => setCommentVideo(post)}
            onOpenFullScreen={() => setOpenVideoModal(post)}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
          />
        ))}
      </div>

      {commentVideo && <CommentDrawer videoId={commentVideo.id} title={commentVideo.title || "Post"} onClose={() => setCommentVideo(null)} />}

      {openVideoModal && initialModalIndex !== -1 && (
        <ProfileReelViewer
          videos={videosForModal}
          initialIndex={initialModalIndex}
          onClose={() => setOpenVideoModal(null)}
          getAuthor={(v: any) => {
            const a = authorFor(v);
            return { name: a.name, avatar: a.avatar, verified: a.verified, profileHref: a.href || "#" };
          }}
        />
      )}
    </main>
    </PullToRefresh>
    <MobileBottomNav />
    </>
  );
}

function PostCard({ post, author, onOpenComments, onOpenFullScreen, muted, onToggleMute }: any) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <article className="bg-black border-b border-white/10">
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0">
          <Link href={author.href || "#"}>
            {author.avatar ? <img src={author.avatar} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-red-900 flex items-center justify-center font-bold">{author.name[0]?.toUpperCase()}</div>}
          </Link>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm truncate">
            <Link href={author.href || "#"} className="font-bold text-white hover:underline">{author.name}</Link>
            {author.verified && <VerifiedBadge size={14} variant="gold" />}
            <span className="text-white/50 ml-1">{timeAgo(post.createdAt)}</span>
          </div>

          {post.description && <p className="text-[15px] text-white mt-1 mb-2 leading-relaxed">{post.description}</p>}

          {/* THE VIDEO PREVIEW */}
          <div className="mt-2 rounded-2xl overflow-hidden bg-black relative cursor-pointer" onClick={onOpenFullScreen}>
            {post.videoUrl ? (
              <>
                <video 
                  src={post.videoUrl || post.bitchuteUrl} 
                  poster={post.posterUrl}
                  className="w-full h-auto max-h-[75vh] object-contain pointer-events-none" 
                  muted={true} 
                  loop 
                  playsInline 
                  preload="auto"
                />
                <TextOverlayRenderer overlays={post.textOverlays} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="w-14 h-14 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"><Play size={28} fill="white" /></div>
                </div>
              </>
            ) : post.type === "Image" && post.posterUrl ? (
              <img src={post.posterUrl} className="w-full max-h-[70vh] object-cover" />
            ) : null}
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
