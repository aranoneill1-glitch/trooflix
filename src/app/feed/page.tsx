"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Volume2, VolumeX, Plus, Send, Play, Pause, ChevronLeft } from "lucide-react";
import MobileBottomNav from "@/components/MobileBottomNav";
import TopBar from "@/components/TopBar";

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
};

export default function ShortsFeedPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutedVideos, setMutedVideos] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch("/api/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const all = Array.isArray(data) ? data : [];
        // You can filter here if you only want specific "Shorts" (e.g., v.type === 'Reel')
        setVideos(all);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleMute = (id: number, currentMuted: boolean) => {
    setMutedVideos(prev => ({ ...prev, [id]: !currentMuted }));
  };

  if (loading) {
    return (
      <main className="h-[100dvh] bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="h-[100dvh] w-full bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide pb-16">
      
      {/* HEADER (Fixed top, transparent) */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/" className="text-2xl font-black tracking-tight drop-shadow-md">
            <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
          </Link>
        </div>
        <div className="text-white font-bold text-sm drop-shadow-md tracking-widest uppercase">
          Clips
        </div>
        <div className="w-8" /> {/* Spacer */}
      </header>

      {videos.map((video) => (
        <VideoShort 
          key={video.id} 
          video={video} 
          isMuted={mutedVideos[video.id] ?? true} 
          onToggleMute={() => toggleMute(video.id, mutedVideos[video.id] ?? true)} 
        />
      ))}

      {videos.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center text-white/50">
          <Play size={48} className="mb-4 opacity-50" />
          <p>No clips available yet.</p>
        </div>
      )}

      <MobileBottomNav />
    </main>
  );
}

function VideoShort({ video, isMuted, onToggleMute }: { video: Video, isMuted: boolean, onToggleMute: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";

  // Intersection Observer to auto-play the video when it's in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          videoRef.current?.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

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

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always bg-black flex items-center justify-center overflow-hidden">
      
      {/* 
        CRITICAL FIX: 
        object-contain ensures landscape videos get black bars above/below, 
        while portrait videos fill the height.
      */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={video.posterUrl}
        loop
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleScreenClick}
      />

      {/* Play/Pause visual feedback overlay */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
            {isPlaying ? <Pause size={40} className="text-white" fill="currentColor" /> : <Play size={40} className="text-white ml-2" fill="currentColor" />}
          </div>
        </div>
      )}

      {/* GRADIENTS for Text Readability */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

      {/* RIGHT SIDE ACTION BUTTONS */}
      <div className="absolute right-4 bottom-28 flex flex-col items-center gap-5 z-30">
        
        {/* Mute/Unmute */}
        <button onClick={onToggleMute} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>

        {/* Add to List */}
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition">
          <Plus size={26} />
        </button>

        {/* Share */}
        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition">
          <Send size={22} className="-ml-1 mt-1" />
        </button>

        {/* Creator Avatar / Poster Avatar */}
        <Link href={`/profile/${video.uploaderUserId || "creator"}`} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg mt-2">
          <img src={video.posterUrl || video.backdropUrl} alt="Creator" className="w-full h-full object-cover" />
        </Link>

      </div>

      {/* BOTTOM TEXT INFO */}
      <div className="absolute left-4 right-20 bottom-24 z-30 flex flex-col items-start pointer-events-none">
        <h2 className="text-white text-2xl font-bold leading-tight mb-2 drop-shadow-lg line-clamp-2">
          {video.title}
        </h2>
        <p className="text-white/80 text-sm font-semibold mb-1 drop-shadow-md">
          {video.type || "Clip"} • {video.category || "Trending"}
        </p>
        <p className="text-white/70 text-sm drop-shadow-md line-clamp-2">
          {video.description || "Watch this exclusive clip on Trooflix."}
        </p>
      </div>

      {/* PROGRESS BAR */}
      <div className="absolute left-4 right-4 bottom-16 z-30 flex items-center gap-3">
        <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-[#E53945] transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-white/80 text-xs font-bold tabular-nums">
          {videoRef.current ? formatTime(videoRef.current.currentTime) : "0:00"}
        </span>
      </div>

    </div>
  );
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
