"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, MessageCircle, Share, Send, Eye } from "lucide-react";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import ViewCount, { trackView } from "@/components/ViewCount";
import CommentDrawer from "@/components/CommentDrawer";
import ShareReelSheet from "@/components/ShareReelSheet";
import VerifiedBadge from "@/components/VerifiedBadge";

type Video = {
  id: number;
  title?: string;
  description?: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  posterUrl?: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  textOverlays?: any[];
  viewCount?: number;
};

export default function ProfileReelViewer({
  videos,
  initialIndex,
  onClose,
}: {
  videos: Video[];
  initialIndex: number;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  
  // Modals/Drawers state
  const [commentVideo, setCommentVideo] = useState<Video | null>(null);
  const [shareVideo, setShareVideo] = useState<Video | null>(null);

  const trackedViews = useRef<Set<number>>(new Set());

  // Scroll to the initially clicked video on mount
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const child = container.children[initialIndex] as HTMLElement;
      if (child) {
        container.scrollTo({ top: child.offsetTop, behavior: "instant" });
      }
    }
  }, [initialIndex]);

  // Intersection Observer to detect which video is currently on screen
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActiveIndex(index);
            
            // Track view using the same function as the main feed
            const videoId = Number((entry.target as HTMLElement).dataset.videoId);
            if (!trackedViews.current.has(videoId)) {
              trackedViews.current.add(videoId);
              trackView(videoId);
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    Array.from(container.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 pt-[env(safe-area-inset-top)] bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
        <button onClick={onClose} className="p-2 bg-black/40 rounded-full text-white backdrop-blur">
          <X size={24} />
        </button>
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: "y mandatory" }}
      >
        {videos.map((v, i) => (
          <ReelItem
            key={v.id}
            video={v}
            index={i}
            isActive={activeIndex === i}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onOpenComments={() => setCommentVideo(v)}
            onOpenShare={() => setShareVideo(v)}
          />
        ))}
      </div>

      {/* Drawers / Modals */}
      {commentVideo && (
        <CommentDrawer
          videoId={commentVideo.id}
          title={commentVideo.title || "Comments"}
          onClose={() => setCommentVideo(null)}
        />
      )}

      {shareVideo && (
        <ShareReelSheet
          open={!!shareVideo}
          onClose={() => setShareVideo(null)}
          videoId={shareVideo.id}
          videoTitle={shareVideo.title || ""}
        />
      )}
    </div>
  );
}

function ReelItem({ video, index, isActive, muted, onToggleMute, onOpenComments, onOpenShare }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isActive) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      try { v.currentTime = 0; } catch {}
      setPlaying(false);
    }
  }, [isActive]);

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

  return (
    <div
      data-index={index}
      data-video-id={video.id}
      className="w-full h-full snap-start relative bg-black flex items-center justify-center"
    >
      <video
        ref={videoRef}
        src={video.videoUrl ?? video.bitchuteUrl ?? ""}
        poster={video.posterUrl}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={muted}
        onClick={togglePlay}
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 pb-24 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none">
        
        {/* RIGHT SIDE ACTION BAR (Matching Feed) */}
        <div className="absolute right-4 bottom-20 flex flex-col items-center gap-5 pointer-events-auto">
          
          {/* Like */}
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <LikeButton videoId={video.id} size={26} showCount={true} />
          </div>

          {/* Comments */}
          <button onClick={onOpenComments} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <MessageCircle size={26} />
          </button>

          {/* Views */}
          <div className="flex flex-col items-center gap-1 text-white/80 drop-shadow-md">
            <Eye size={24} />
            <span className="text-xs font-semibold"><ViewCount videoId={video.id} showIcon={false} /></span>
          </div>

          {/* Share */}
          <button onClick={onOpenShare} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <Send size={26} />
          </button>

          {/* External Share */}
          <button onClick={() => {
            const url = window.location.origin + `/feed?reel=${video.id}`;
            if (navigator.share) navigator.share({ url });
            else navigator.clipboard.writeText(url);
          }} className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <Share size={24} />
          </button>

          {/* Bookmark */}
          <div className="flex flex-col items-center gap-1 text-white drop-shadow-md">
            <SaveButton videoId={video.id} variant="icon" size={24} />
          </div>

        </div>

        {/* BOTTOM LEFT INFO */}
        <div className="flex-1 flex flex-col justify-end max-w-[75%] pointer-events-auto">
          {video.title && <h3 className="text-white font-bold text-lg mb-1 drop-shadow-md">{video.title}</h3>}
          {video.description && <p className="text-white/90 text-sm line-clamp-2 mb-2 drop-shadow-md">{video.description}</p>}
        </div>

        {/* PLAY/PAUSE CONTROL */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
             <div className="p-5 bg-black/50 rounded-full backdrop-blur text-white">
               <Play size={40} fill="white" />
             </div>
          </div>
        )}
        
        {/* MUTE CONTROL */}
        <div className="absolute left-4 top-16 pointer-events-auto">
           <button onClick={onToggleMute} className="p-2.5 bg-black/50 rounded-full backdrop-blur text-white">
             {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
           </button>
        </div>
      </div>
    </div>
  );
}
