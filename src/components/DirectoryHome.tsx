"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CirclePlay, Eye, Play, ShoppingBag, Star, UsersRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";


function VideoPreview({ src, poster, className }: { src: string, poster?: string, className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration || 0;
      let seekTime = Math.min(30, duration * 0.1);
      if (duration < 15) seekTime = 0;
      
      startTimeRef.current = seekTime;
      videoRef.current.currentTime = seekTime;
      videoRef.current.play().catch(() => {}); // Force play
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = startTimeRef.current;
      if (current > start + 7) {
        videoRef.current.currentTime = start;
      }
    }
  };

  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <>
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlaying={() => setIsPlaying(true)}
        className={`${className} absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isPlaying ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}


function timeAgo(dateString: string) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function ShortsMark({ size = 22 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="#FF0033">
      <path d="m18.931 9.99-1.441-.601 1.717-.913a4.48 4.48 0 0 0 1.874-6.078 4.506 4.506 0 0 0-6.09-1.874L4.792 5.929a4.504 4.504 0 0 0-2.402 4.193 4.521 4.521 0 0 0 2.666 3.904c.036.012 1.442.6 1.442.6l-1.706.901a4.51 4.51 0 0 0-2.369 3.967A4.528 4.528 0 0 0 6.93 24c.725 0 1.437-.174 2.08-.508l10.21-5.406a4.494 4.494 0 0 0 2.39-4.192 4.525 4.525 0 0 0-2.678-3.904ZM9.597 15.19V8.824l6.007 3.184z" />
    </svg>
  );
}

function SectionHead({ kicker, title, href, icon: Icon }: { kicker: string; title: string; href: string; icon: typeof CirclePlay | typeof UsersRound | typeof ShoppingBag | typeof ShortsMark }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[#E53945]">
          <Icon size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E53945] md:text-[11px]">{kicker}</p>
          <h2 className="text-[21px] font-black tracking-tighter text-white md:text-[28px]">{title}</h2>
        </div>
      </div>
      <Link href={href} className="text-[13px] font-medium text-white/45 hover:text-white transition mb-1">
        View all
      </Link>
    </div>
  );
}

function HeroPreviewFrame({ src, poster, alt }: { src?: string; poster?: string; alt: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    setHasFrame(false);
  }, [src]);

  const seekToPreviewFrame = (video: HTMLVideoElement) => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const frameTime = Math.min(1, Math.max(0.2, video.duration * 0.08));
    try {
      video.currentTime = frameTime;
    } catch {}
  };

  const panStyle = `
    @keyframes hero-pan-lr {
      0% { transform: scale(1.08) translateX(-3%); }
      100% { transform: scale(1.08) translateX(3%); }
    }
  `;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <style>{panStyle}</style>
      {poster ? (
        <img
          src={poster}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover ${hasFrame ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
          style={{ animation: "hero-pan-lr 18s ease-in-out infinite alternate" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#111114]" />
      )}
      {src && (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onLoadedMetadata={(e) => seekToPreviewFrame(e.currentTarget)}
          onSeeked={(e) => {
            e.currentTarget.pause();
            setHasFrame(true);
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${hasFrame ? "opacity-100" : "opacity-0"}`}
          style={{ animation: "hero-pan-lr 18s ease-in-out infinite alternate" }}
        />
      )}
    </div>
  );
}

function FeaturedVideoHero({ videos, onSelect }: { videos: any[]; onSelect: (video: any) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (videos.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % videos.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [videos.length]);

  if (!videos.length) return null;
  const video = videos[activeIndex % videos.length];
  const image = video.posterUrl || video.backdropUrl;
  const previewSrc = video.videoUrl || video.bitchuteUrl;

  return (
    <section aria-label="Featured videos" className="relative isolate -mx-4 h-[min(31vh,290px)] min-h-[180px] max-h-[310px] overflow-hidden bg-[#08090c] md:-mx-10 md:h-[min(34vh,310px)] md:min-h-[220px]">
      <AnimatePresence mode="wait">
        <motion.div key={video.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 -z-20">
          <HeroPreviewFrame src={previewSrc} poster={image} alt={video.title || ""} />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08090c] via-[#08090c]/75 to-transparent md:via-[#08090c]/50" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08090c] via-[#08090c]/20 to-transparent" />

      <div className="flex h-full max-w-7xl flex-col justify-end px-5 pb-10 pt-20 md:mx-auto md:px-12 md:pb-12">
        <AnimatePresence mode="wait">
          <motion.div key={video.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="max-w-3xl">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/65 md:text-xs"><Star size={13} className="text-[#F06A72]" /> Featured</p>
            <h1 className="max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg sm:text-4xl md:text-5xl">{video.title}</h1>
            {video.description && <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-white/75 md:text-base md:leading-7">{video.description}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 md:text-xs">
              {video.category && <span>{video.category}</span>}
              {video.year ? <span>{video.year}</span> : null}
              {video.duration && <span>{video.duration}</span>}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex items-center gap-6">
          <button onClick={() => onSelect(video)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 backdrop-blur-xl border border-white/30 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.25)]">
            <Play size={17} fill="currentColor" /> Play
          </button>
        </div>
      </div>

      {videos.length > 1 && (
        <div className="absolute bottom-4 right-5 flex items-center gap-4 md:bottom-6 md:right-12">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{activeIndex + 1} <span className="mx-1 text-white/25">/</span> {videos.length}</span>
          <button aria-label="Previous featured video" onClick={() => setActiveIndex((index) => (index - 1 + videos.length) % videos.length)} className="p-1 text-white/55 transition hover:text-white">
            <ChevronLeft size={18} />
          </button>
          <button aria-label="Next featured video" onClick={() => setActiveIndex((index) => (index + 1) % videos.length)} className="p-1 text-white/55 transition hover:text-white">
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}

export default function DirectoryHome({ videos, creators, featuredVideos, onVideoSelect, flushTop = false }: { videos: any[], creators: any[], featuredVideos: any[], onVideoSelect: (video: any) => void, flushTop?: boolean }) {
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/products/global")
      .then(r => r.json())
      .then(d => setShopProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className={`relative z-10 ${flushTop ? "pt-8" : "pt-20 md:pt-24"} pb-32 md:pb-16 max-w-[1600px] mx-auto px-4 md:px-10 space-y-8 md:space-y-10`}>

      <FeaturedVideoHero videos={featuredVideos} onSelect={onVideoSelect} />

      <section>
        <SectionHead kicker="Clips" title="Shorts" href="/feed" icon={ShortsMark} />
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {videos.filter((v: any) => v.type?.toLowerCase() === "short" || v.type?.toLowerCase() === "reel").slice(0, 10).map((v: any) => (
            <Link key={v.id} href={`/feed?reel=${v.id}`} className="relative w-[132px] md:w-[168px] aspect-[9/16] shrink-0 rounded-2xl overflow-hidden ring-1 ring-white/10 group shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
              {(v.videoUrl || v.bitchuteUrl) ? (
                <VideoPreview
                  src={v.videoUrl || v.bitchuteUrl}
                  poster={v.posterUrl || v.backdropUrl}
                  className="transition duration-700 ease-out group-hover:scale-[1.04]"
                />
              ) : (
                <img src={v.posterUrl || v.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="flex items-center gap-1 text-[11px] font-medium text-white/80"><Eye size={13} strokeWidth={2} />{v.views || 0}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHead kicker="People" title="Discover creators" href="/creators" icon={UsersRound} />
        <div className="flex overflow-x-auto gap-5 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {creators.slice(0, 15).map((c: any) => (
            <Link key={c.id} href={`/profile/${c.slug}`} className="flex flex-col items-center shrink-0 w-[104px] md:w-[120px] group">
              <div className="p-[2px] rounded-full bg-gradient-to-b from-white/40 to-white/5 group-hover:from-[#E53945] group-hover:to-orange-400 transition duration-300">
                <div className="w-[92px] h-[92px] md:w-[108px] md:h-[108px] rounded-full overflow-hidden bg-[#141418] ring-4 ring-[#070709]">
                  {c.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-white/70">{c.name?.[0]}</div>}
                </div>
              </div>
              <span className="mt-3 text-[13px] font-medium text-white/80 truncate w-full text-center group-hover:text-white transition">{c.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHead kicker="Latest" title="Don't miss a thing" href="/latest" icon={CirclePlay} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {videos.filter((v: any) => {
            const t = v.type?.toLowerCase();
            const hasVideo = !!(v.videoUrl || v.bitchuteUrl);
            return hasVideo && t !== "short" && t !== "tweet" && t !== "reel";
          }).slice(0, 8).map((v: any) => (
            <Link key={v.id} href="/latest" className="flex flex-col w-[260px] md:w-[300px] shrink-0 group">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                <VideoPreview
                  src={v.videoUrl || v.bitchuteUrl}
                  poster={v.posterUrl || v.backdropUrl}
                  className="transition duration-700 ease-out group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />
                <span className="absolute bottom-2.5 right-2.5 text-[11px] font-medium px-2 py-1 rounded-full bg-black/55 text-white/90 backdrop-blur-md ring-1 ring-white/10">
                  {timeAgo(v.createdAt)}
                </span>
              </div>
              <h3 className="mt-3 text-[15px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition">{v.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHead kicker="Shop" title="Merchandise" href="/merchandise" icon={ShoppingBag} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {shopProducts.slice(0, 10).map((p: any) => (
            <Link key={p.id} href="/merchandise" className="flex flex-col w-[148px] md:w-[180px] shrink-0 group">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10">
                <img src={p.image_url} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </div>
              <p className="mt-3 text-[13px] font-semibold text-[#f3d7a1] tracking-tight">${(p.price_cents / 100).toFixed(2)}</p>
              <h3 className="mt-0.5 text-[13px] font-medium text-white/75 line-clamp-2 leading-snug group-hover:text-white transition">{p.name}</h3>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
