"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Play, Pause, MoreVertical, VolumeX, Volume2, Maximize } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators } from "@/lib/cache";
import VerifiedBadge from "@/components/VerifiedBadge";
import AppleVideoPlayer from "@/components/AppleVideoPlayer";

type Video = {
  id: number;
  title: string;
  description?: string;
  type: string;
  posterUrl: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  creatorId?: number | null;
  createdAt?: string;
  duration?: string;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl?: string;
  isVerified?: boolean;
};

function timeAgo(iso?: string): string {
  if (!iso) return "Just now";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullScreenVideo, setFullScreenVideo] = useState<Video | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/videos", { cache: "no-store" }).then(r => r.json()),
      getCachedCreators()
    ])
      .then(([vData, cData]) => {
        const allVids = Array.isArray(vData) ? vData : [];
        allVids.sort((a: any, b: any) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return bt - at;
        });
        setVideos(allVids);
        setCreators(Array.isArray(cData) ? cData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getCreator = (id?: number | null) => {
    if (!id) return null;
    return creators.find(c => c.id === id);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">
            {videos.map((v) => (
              <FeedVideoCard
                key={v.id}
                video={v}
                creator={getCreator(v.creatorId)}
                onFullScreen={() => setFullScreenVideo(v)}
              />
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />

      {fullScreenVideo && (
        <AppleVideoPlayer
          src={fullScreenVideo.videoUrl ?? fullScreenVideo.bitchuteUrl ?? ""}
          title={fullScreenVideo.title}
          onClose={() => setFullScreenVideo(null)}
        />
      )}
    </main>
  );
}

function FeedVideoCard({ video, creator, onFullScreen }: { video: Video, creator: any, onFullScreen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Format the URL to force the browser to load the first frame
  const videoSrc = `${video.videoUrl ?? video.bitchuteUrl ?? ""}#t=0.1`;

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || isSeeking || !v.duration) return;
    setProgress(v.currentTime / v.duration);
  };

  const handlePointerSeek = (e: React.PointerEvent) => {
    const bar = progressBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    
    setProgress(percentage);
    v.currentTime = percentage * v.duration;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsSeeking(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointerSeek(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isSeeking) handlePointerSeek(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsSeeking(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full mb-10">
      
      {/* VIDEO CONTAINER */}
      <div className="relative w-full aspect-video bg-black group overflow-hidden cursor-pointer" onClick={togglePlay}>
        
        {/* The actual video element, no poster, ready to play from the first frame */}
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          playsInline
          muted={isMuted}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Top Overlays */}
        <div className="absolute top-4 left-4 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white z-10 pointer-events-none">
          {video.duration || "1:34:29"}
        </div>
        
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; }} 
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          {/* Full Screen Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); onFullScreen(); }} 
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition"
          >
            <Maximize size={20} />
          </button>
        </div>

        {/* Center Play Icon (Only shows when paused) */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-white/90 text-black flex items-center justify-center shadow-2xl backdrop-blur-sm">
              <Play size={28} fill="black" className="ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* RED STATUS BAR (Draggable) */}
      <div 
        className="relative w-full h-1.5 bg-[#1c1c1e] cursor-pointer group z-30"
        style={{ touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          ref={progressBarRef}
          className="absolute inset-0 w-full h-full flex items-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="w-full h-full bg-[#1c1c1e] group-hover:h-2 transition-all relative overflow-hidden">
            <div 
              className="h-full bg-[#E53945]" 
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          
          <div 
            className={`absolute h-3 w-3 bg-[#E53945] rounded-full shadow-md transition-opacity pointer-events-none ${isSeeking ? 'opacity-100 scale-125' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `calc(${progress * 100}% - 6px)` }}
          />
        </div>
      </div>

      {/* INFO SECTION */}
      <div className="px-4 py-3">
        <div className="flex gap-3">
          
          {/* SQUARE AVATAR */}
          <Link href={`/podcaster/${creator?.slug || ''}`} className="w-10 h-10 rounded-md overflow-hidden bg-[#1c1c1e] flex-shrink-0 block">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#E53945] flex items-center justify-center font-bold text-sm text-white">
                {creator?.name?.[0] || "?"}
              </div>
            )}
          </Link>

          {/* TITLE & CREATOR */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white leading-tight mb-1">
              {video.title}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-white/60">
              <Link href={`/podcaster/${creator?.slug || ''}`} className="truncate hover:text-white transition">
                {creator?.name || "Creator"}
              </Link>
              {creator?.isVerified && <VerifiedBadge size={14} variant="gold" />}
              <span>•</span>
              <span>{timeAgo(video.createdAt)}</span>
            </div>
          </div>

          {/* THREE DOTS */}
          <button className="p-1 text-white/50 hover:text-white h-fit">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* DESCRIPTION */}
        {video.description && (
          <p className="mt-3 text-sm text-white/70 line-clamp-2 leading-relaxed pl-[52px]">
            {video.description}
          </p>
        )}
      </div>
    </div>
  );
}
