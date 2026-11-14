"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CirclePlay, Eye, Film, Mic, Play, ShoppingBag, Star, UsersRound } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";


function VideoPreview({ src, poster, className }: { src: string, poster?: string, className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "120px 0px", threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) {
      setIsPlaying(false);
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch {}
        try { videoRef.current.removeAttribute("src"); videoRef.current.load(); } catch {}
      }
    }
  }, [inView]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration || 0;
      let seekTime = Math.min(30, duration * 0.1);
      if (duration < 15) seekTime = 0;
      
      startTimeRef.current = seekTime;
      try { videoRef.current.currentTime = seekTime; } catch {}
      videoRef.current.play().catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const current = videoRef.current.currentTime;
      const start = startTimeRef.current;
      if (current > start + 7) {
        try { videoRef.current.currentTime = start; } catch {}
      }
    }
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      {poster ? (
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}
      {inView && src ? (
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
          onPause={() => setIsPlaying(false)}
          className={`${className || ""} absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${isPlaying ? "opacity-100" : "opacity-0"}`}
        />
      ) : null}
    </div>
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
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.2" y="2.8" width="15.6" height="18.4" rx="5.2" transform="rotate(-10 12 12)" fill="#E53945" />
      <rect x="4.2" y="2.8" width="15.6" height="18.4" rx="5.2" transform="rotate(-10 12 12)" fill="url(#shortsMarkGrad)" opacity="0.95" />
      <path d="M10.2 8.7v6.6l5.7-3.3-5.7-3.3z" fill="white" />
      <defs>
        <linearGradient id="shortsMarkGrad" x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF6B6B" />
          <stop offset="1" stopColor="#C62828" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function SectionHead({ kicker, title, href, icon: Icon }: { kicker: string; title: string; href: string; icon: any }) {
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
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [hasFrame, setHasFrame] = useState(false);

  useEffect(() => {
    setHasFrame(false);
  }, [src]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px 0px", threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView && videoRef.current) {
      try { videoRef.current.pause(); } catch {}
      try { videoRef.current.removeAttribute("src"); videoRef.current.load(); } catch {}
      setHasFrame(false);
    }
  }, [inView]);

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
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <style>{panStyle}</style>
      {poster ? (
        <img
          src={poster}
          alt={alt}
          loading="eager"
          className={`absolute inset-0 h-full w-full object-cover ${hasFrame ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}
          style={{ animation: "hero-pan-lr 18s ease-in-out infinite alternate" }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#111114]" />
      )}
      {inView && src && (
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

export function FeaturedVideoHero({ videos, onSelect, className = "" }: { videos: any[]; onSelect: (video: any) => void; className?: string }) {
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
    <section aria-label="Featured videos" className={`relative isolate max-md:-mt-[env(safe-area-inset-top)] max-md:h-[calc(42vh+env(safe-area-inset-top))] max-md:min-h-[calc(240px+env(safe-area-inset-top))] max-md:max-h-[calc(420px+env(safe-area-inset-top))] h-[42vh] min-h-[240px] max-h-[420px] overflow-hidden bg-[#08090c] md:mt-0 md:h-[min(34vh,310px)] md:min-h-[220px] md:max-h-[310px] ${className || "-mx-4 md:-mx-10"}`}>
      <AnimatePresence mode="wait">
        <motion.div key={video.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 -z-20">
          <HeroPreviewFrame src={previewSrc} poster={image} alt={video.title || ""} />
        </motion.div>
      </AnimatePresence>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[#08090c] via-[#08090c]/25 to-transparent" />

      <div className="flex h-full max-w-7xl flex-col justify-end px-5 pb-6 pt-24 md:mx-auto md:px-12 md:pb-8 md:pt-28">
        <AnimatePresence mode="wait">
          <motion.div key={video.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="max-w-3xl">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/65 md:text-xs"><Star size={13} className="text-[#F06A72]" /> Featured</p>
            <h1 className="max-w-3xl text-2xl font-black leading-[0.98] tracking-[-0.055em] text-white drop-shadow-lg sm:text-3xl md:text-4xl">{video.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55 md:text-xs">
              {video.category && <span>{video.category}</span>}
              {video.year ? <span>{video.year}</span> : null}
              {video.duration && <span>{video.duration}</span>}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-4 flex items-center gap-6">
          <button onClick={() => onSelect(video)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/15 backdrop-blur-2xl backdrop-saturate-150 border border-white/25 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.18)]">
            <Play size={14} fill="currentColor" /> Play
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

  const latestVideos = videos.filter((v: any) => {
    const t = v.type?.toLowerCase();
    const hasVideo = !!(v.videoUrl || v.bitchuteUrl);
    return hasVideo && t !== "short" && t !== "tweet" && t !== "reel";
  }).slice(0, 8);
  const shortsVideos = videos.filter((v: any) => v.type?.toLowerCase() === "short" || v.type?.toLowerCase() === "reel").slice(0, 10);
  const podcastVideos = videos.filter((v: any) => v.type?.toLowerCase() === "podcast").slice(0, 8);
  const documentaryVideos = videos.filter((v: any) => v.type?.toLowerCase() === "documentary").slice(0, 8);

  const renderLongFormCard = (v: any) => {
    const creator = creators.find((c: any) =>
      (v.creatorId && c.id === v.creatorId) ||
      (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
      (v.uploaderUserId && c.user_id === v.uploaderUserId)
    );
    return (
      <Link key={v.id} href="/latest" className="flex flex-col w-[260px] md:w-[300px] shrink-0 group">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
          <VideoPreview
            src={v.videoUrl || v.bitchuteUrl}
            poster={v.posterUrl || v.backdropUrl}
            className="transition duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />
          <span className="absolute bottom-2.5 right-2.5 text-[11px] font-medium px-2 py-1 rounded-full bg-white/10 text-white/95 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            {timeAgo(v.createdAt)}
          </span>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10 shrink-0">
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/80">
                {(creator?.name || "T")[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition">{v.title}</h3>
            {creator?.name && <p className="mt-0.5 text-[13px] text-white/55 truncate">{creator.name}</p>}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className={`relative z-10 ${flushTop ? "pt-0" : "pt-0 md:pt-0"} pb-32 md:pb-16 max-w-[1600px] mx-auto px-4 md:px-10 space-y-8 md:space-y-10`}>

      <FeaturedVideoHero videos={featuredVideos} onSelect={onVideoSelect} />

      <section>
        <SectionHead kicker="Latest" title="Don't miss a thing" href="/latest" icon={CirclePlay} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {latestVideos.map(renderLongFormCard)}
        </div>
      </section>

      <section>
        <SectionHead kicker="Clips" title="Shorts" href="/feed" icon={ShortsMark} />
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {shortsVideos.map((v: any) => {
            const creator = creators.find((c: any) =>
              (v.creatorId && c.id === v.creatorId) ||
              (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
              (v.uploaderUserId && c.user_id === v.uploaderUserId)
            );
            return (
              <Link key={v.id} href={`/feed?reel=${v.id}`} className="flex flex-col w-[132px] md:w-[168px] shrink-0 group">
                <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
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
                </div>
                <div className="mt-2.5 flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10 shrink-0">
                    {creator?.photoUrl ? (
                      <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/80">
                        {(creator?.name || "T")[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-[12px] font-medium text-white/80 truncate group-hover:text-white transition">{creator?.name || "Creator"}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead kicker="Audio" title="Podcasts" href="/latest" icon={Mic} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {podcastVideos.map(renderLongFormCard)}
        </div>
      </section>

      <section>
        <SectionHead kicker="Films" title="Documentaries" href="/latest" icon={Film} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {documentaryVideos.map(renderLongFormCard)}
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
        <SectionHead kicker="Shop" title="Merchandise" href="/merchandise" icon={ShoppingBag} />
        <div className="grid grid-rows-2 grid-flow-col auto-cols-[89px] md:auto-cols-[108px] gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {shopProducts.slice(0, 20).map((p: any) => (
            <Link key={p.id} href="/merchandise" className="flex flex-col w-[89px] md:w-[108px] shrink-0 group">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141418] ring-1 ring-white/10">
                <img src={p.image_url} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
              </div>
              <p className="mt-1.5 text-[11px] font-semibold text-[#f3d7a1] tracking-tight">${(p.price_cents / 100).toFixed(2)}</p>
              <h3 className="mt-0.5 text-[11px] font-medium text-white/75 line-clamp-2 leading-snug group-hover:text-white transition">{p.name}</h3>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
