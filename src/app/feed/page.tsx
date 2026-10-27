"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Play, Pause, MoreVertical, VolumeX, Volume2, Plus, XCircle } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getCachedCreators, getCachedUser } from "@/lib/cache";
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

const TABS = ["All", "Podcasts", "Documentaries", "Following"];

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
  const [activeTab, setActiveTab] = useState("Podcasts");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCachedUser().then(setUser);
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

  // Filter videos based on tab
  const filteredVideos = activeTab === "All" || activeTab === "Podcasts" 
    ? videos 
    : videos.filter(v => v.type === activeTab);

  const featuredVideo = filteredVideos[0];
  const moreVideos = filteredVideos.slice(1);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      <TopBar />

      {/* STICKY TOP TABS */}
      <div className="sticky top-[60px] md:top-[72px] z-40 bg-[#0a0a0a]/95 backdrop-blur-xl pt-3 pb-3">
        <div className="max-w-2xl mx-auto px-4 md:px-6 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          
          {/* User Avatar Circle */}
          <Link href="/profile" className="w-9 h-9 rounded-full bg-[#1c1c1e] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden mr-2">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-[#E53945]">A</span>
            )}
          </Link>

          {/* Tabs */}
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors border ${
                activeTab === tab
                  ? "bg-[#E53945] text-white border-[#E53945] shadow-lg"
                  : "bg-[#1c1c1e] text-white/70 border-white/10 hover:bg-[#2c2c2e] hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col">
            
            {/* SECTION HEADER */}
            <h2 className="text-2xl font-bold px-4 mb-4">Episodes to try</h2>

            {/* FEATURED VIDEO CARD */}
            {featuredVideo && (
              <FeedVideoCard
                video={featuredVideo}
                creator={getCreator(featuredVideo.creatorId)}
                onFullScreen={() => setFullScreenVideo(featuredVideo)}
              />
            )}

            {/* SECOND SECTION HEADER (Matches your screenshot) */}
            <h2 className="text-2xl font-bold px-4 mt-2 mb-4">Episodes to try</h2>

            {/* HORIZONTAL LIST CARDS */}
            <div className="space-y-4 px-4">
              {moreVideos.map((v) => {
                const creator = getCreator(v.creatorId);
                return (
                  <div key={v.id} className="bg-gradient-to-r from-red-950/40 to-[#0a0a0a] border border-red-900/30 rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                        <img src={v.posterUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{v.title}</h3>
                        <p className="text-xs text-white/60 mt-1 flex items-center gap-1">
                          {creator?.name || "Creator"} 
                          {creator?.isVerified && <VerifiedBadge size={10} variant="gold" />}
                          • {timeAgo(v.createdAt)} • {v.duration || "34 min"}
                        </p>
                      </div>
                      <button className="text-white/40 hover:text-white h-fit">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    
                    {v.description && (
                      <p className="text-xs text-white/50 line-clamp-2">{v.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <button className="flex items-center gap-1.5 bg-black/40 hover:bg-black/60 px-3 py-1.5 rounded-full border border-white/5 transition">
                        <XCircle size={14} className="text-white/60" />
                        <span className="text-xs font-bold text-white/70">Preview episode</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:bg-white/10 transition">
                          <Plus size={16} />
                        </button>
                        <Link href={`/podcast/${v.id}`} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition">
                          <Play size={14} fill="black" className="ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
  const [error, setError] = useState(false);

  const videoSrc = video.videoUrl || video.bitchuteUrl || "";

  // Handle Auto-play on mount
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    
    // Attempt autoplay
    v.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Autoplay failed (likely because it's not muted)
      v.muted = true;
      setIsMuted(true);
      v.play().then(() => setIsPlaying(true)).catch(() => {});
    });
  }, []);

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v || !videoSrc) return;
    
    if (v.paused) {
      try {
        await v.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Playback failed:", err);
      }
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

  if (!videoSrc) return null;

  return (
    <div className="w-full mb-8">
      
      {/* VIDEO CONTAINER */}
      <div className="relative w-full aspect-video bg-black group overflow-hidden cursor-pointer" onClick={togglePlay}>
        
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-cover"
          playsInline
          muted={isMuted}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setError(true)}
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-white/50 text-sm">Video unavailable</p>
          </div>
        )}

        {/* Top Left Duration */}
        <div className="absolute top-4 left-4 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white z-10 pointer-events-none">
          {video.duration || "1:35:01"}
        </div>
        
        {/* Right Side Controls */}
        <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-4 z-20">
          <button 
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition"
          >
            <Plus size={20} />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; }} 
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-black/80 transition"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }} 
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 transition"
          >
            {isPlaying ? <Pause size={20} fill="black" /> : <Play size={20} fill="black" className="ml-1" />}
          </button>
        </div>
      </div>

      {/* RED STATUS BAR (Draggable) with Green Dot */}
      <div className="flex items-center gap-2 mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-[#1ed760] flex-shrink-0 ml-2" />
        <div 
          className="relative flex-1 h-1.5 bg-[#1c1c1e] cursor-pointer group z-30"
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
      </div>

      {/* INFO SECTION */}
      <div className="px-4 py-3">
        <div className="flex gap-3">
          
          {/* SQUARE AVATAR */}
          <Link href={`/podcaster/${creator?.slug || ''}`} className="w-11 h-11 rounded-md overflow-hidden bg-[#1c1c1e] flex-shrink-0 block">
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
      </div>
    </div>
  );
}
