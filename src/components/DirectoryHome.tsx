"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BookOpen, Eye, Play, ShoppingBag, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";


function VideoPreview({ src, poster, className, playable = false, showMute = false }: { src?: string; poster?: string; className?: string; playable?: boolean; showMute?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!playable || !containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px", threshold: 0.15 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [playable]);

  useEffect(() => {
    if (!playable || !inView) return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.play().then(() => setIsPlaying(true)).catch(() => {});
    return () => { v.pause(); setIsPlaying(false); };
  }, [playable, inView, muted]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {poster ? (
        <img src={poster} alt="" className={`absolute inset-0 w-full h-full object-cover ${className || ""}`} loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-white/5" />
      )}
      {playable && src && inView && (
        <video
          ref={videoRef}
          src={src}
          muted={muted}
          playsInline
          loop
          preload="metadata"
          onPlaying={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className={`${className || ""} absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isPlaying ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {showMute && src && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
          aria-label={muted ? "Unmute preview" : "Mute preview"}
          className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur-sm transition hover:bg-black/80"
        >
          {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      )}
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

function SectionHead({ title, href, onTitleClick }: { title: string; href: string; onTitleClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <button
        type="button"
        onClick={onTitleClick}
        className="flex min-w-0 items-center text-left"
      >
        <h2 className="text-[21px] font-black tracking-tighter text-white md:text-[28px]">{title}</h2>
      </button>
      <Link href={href} onClick={onTitleClick} className="text-[13px] font-medium text-white/45 hover:text-white transition mb-1">
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

export function FeaturedVideoHero({ videos, className = "", activeIndex: controlledIndex, onActiveIndexChange }: { videos: any[]; className?: string; activeIndex?: number; onActiveIndexChange?: (index: number) => void }) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex ?? internalIndex;
  const setActiveIndex = (next: number) => {
    if (onActiveIndexChange) onActiveIndexChange(next);
    else setInternalIndex(next);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setMuted(true);
    setRemaining(0);
    const el = videoRef.current;
    if (el) { try { el.pause(); } catch {} }
  }, [videoId(videos, activeIndex)]);

  useEffect(() => {
    if (videos.length < 2 || playing) return;
    const timer = window.setInterval(() => {
      setActiveIndex((activeIndex + 1) % videos.length);
    }, 9000);
    return () => window.clearInterval(timer);
  }, [videos.length, activeIndex, playing]);

  if (!videos.length) return null;
  const video = videos[activeIndex % videos.length];
  const image = video.posterUrl || video.backdropUrl;
  const previewSrc = video.videoUrl || video.bitchuteUrl;
  const canPlay = !!previewSrc;

  const startPlayback = () => {
    if (!canPlay) return;
    const el = videoRef.current;
    setPlaying(true);
    if (!el) return;
    el.muted = muted;
    try {
      const attempt = el.play();
      if (attempt && typeof attempt.catch === "function") {
        attempt.catch(() => {
          // Autoplay may still be blocked — retry silently muted.
          el.muted = true;
          setMuted(true);
          el.play().catch(() => {});
        });
      }
    } catch {}
  };

  return (
    <section
      aria-label="Featured videos"
      onClick={playing ? undefined : startPlayback}
      className={`relative isolate w-screen left-1/2 -translate-x-1/2 aspect-video overflow-hidden bg-[#08090c] md:mt-0 ${canPlay && !playing ? "cursor-pointer" : ""} ${className}`}
    >
      <img
        src={image}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-0" : "opacity-100"}`}
      />
      <video
        ref={videoRef}
        src={previewSrc}
        poster={image}
        muted={muted}
        playsInline
        preload="none"
        onLoadedMetadata={(e) => setRemaining(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setRemaining(Math.max(0, Math.floor((el.duration || 0) - el.currentTime)));
        }}
        onEnded={() => setPlaying(false)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-100" : "opacity-0"}`}
      />

      {playing && (
        <>
          <span className="absolute bottom-3 left-4 z-10 text-xs font-bold tabular-nums text-white drop-shadow-md md:bottom-5 md:left-8 md:text-sm">
            {formatCountdown(remaining)}
          </span>

          <div className="absolute bottom-3 right-4 z-10 flex flex-col items-end gap-2 md:bottom-5 md:right-8">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMuted((m) => {
                  const next = !m;
                  if (videoRef.current) videoRef.current.muted = next;
                  return next;
                });
              }}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const el = videoRef.current;
                if (!el) return;
                const webkitEl = el as any;
                if (typeof webkitEl.webkitEnterFullscreen === "function") {
                  webkitEl.webkitEnterFullscreen();
                  return;
                }
                if (typeof el.requestFullscreen === "function") {
                  el.requestFullscreen().catch(() => {});
                }
              }}
              aria-label="Fullscreen"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
            >
              <Maximize2 size={17} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function videoId(videos: any[], index: number) {
  return videos.length ? videos[index % videos.length]?.id : null;
}

function formatCountdown(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DirectoryHome({ videos, creators, featuredVideos, onVideoSelect, continueWatching = [], flushTop = false }: { videos: any[], creators: any[], featuredVideos: any[], onVideoSelect: (video: any) => void, continueWatching?: any[], flushTop?: boolean }) {
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  
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

  const featuredVideo = featuredVideos[featuredIndex % Math.max(featuredVideos.length, 1)];
  const featuredCreator = featuredVideo ? creators.find((c: any) =>
    (featuredVideo.creatorId && c.id === featuredVideo.creatorId) ||
    (featuredVideo.uploaderUserId && c.ownerUserId === featuredVideo.uploaderUserId) ||
    (featuredVideo.uploaderUserId && c.user_id === featuredVideo.uploaderUserId)
  ) : null;
  const featuredCreatorHref = featuredCreator?.slug || featuredCreator?.username
    ? `/profile/${featuredCreator.slug || featuredCreator.username}`
    : "#";

  const renderLongFormCard = (v: any) => {
    const creator = creators.find((c: any) =>
      (v.creatorId && c.id === v.creatorId) ||
      (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
      (v.uploaderUserId && c.user_id === v.uploaderUserId)
    );
    return (
      <button key={v.id} type="button" onClick={() => onVideoSelect(v)} className="flex flex-col w-[260px] md:w-[300px] shrink-0 group text-left">
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
          <VideoPreview
            src={v.videoUrl || v.bitchuteUrl}
            poster={v.posterUrl || v.backdropUrl}
            className="transition duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />
          <span className="absolute bottom-2.5 right-2.5 text-[11px] font-medium px-2 py-1 rounded-full bg-black/55 text-white/95 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
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
      </button>
    );
  };

  return (
    <div className={`relative z-10 ${flushTop ? "pt-0" : "pt-0 md:pt-0"} pb-32 md:pb-16`}>

      <section className="pt-[calc(env(safe-area-inset-top)+5.5rem)] md:pt-[calc(env(safe-area-inset-top)+7rem)]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-10">
          <SectionHead title="Shorts" href="/feed" />
          <div className="flex overflow-x-auto gap-2 pb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {shortsVideos.map((v: any) => (
              <Link key={v.id} href={`/feed?reel=${v.id}`} className="block w-[86px] md:w-[110px] shrink-0 group">
                <div className="relative w-full aspect-[9/16] rounded-md overflow-hidden ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                  {(v.videoUrl || v.bitchuteUrl) ? (
                    <VideoPreview
                      src={v.videoUrl || v.bitchuteUrl}
                      poster={v.posterUrl || v.backdropUrl}
                      className="transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <img src={v.posterUrl || v.backdropUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-[1600px] mx-auto px-4 md:px-10">
          <SectionHead title="Featured" href="/latest" />
        </div>
        <FeaturedVideoHero
          videos={featuredVideos}
          activeIndex={featuredIndex}
          onActiveIndexChange={setFeaturedIndex}
        />

        {featuredVideos.length > 0 && (
          <div className="max-w-[1600px] mx-auto px-4 md:px-10 mt-3 md:mt-4">
            <div className="mb-2 flex items-center gap-3">
              <Link href={featuredCreatorHref} className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15 transition hover:ring-white/40 md:h-11 md:w-11">
                {featuredCreator?.photoUrl ? (
                  <img src={featuredCreator.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/80">
                    {(featuredCreator?.name || featuredVideo?.title || "T")[0]}
                  </div>
                )}
              </Link>
              <div className="min-w-0">
                <h2 className="text-base font-bold tracking-tight text-white md:text-lg">
                  {featuredVideo?.title}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-white/45 md:text-sm">
                  {featuredVideo?.category && <span>{featuredVideo.category}</span>}
                  {featuredCreator?.name && (
                    <>
                      {featuredVideo?.category && <span className="text-white/20">·</span>}
                      <Link href={featuredCreatorHref} className="transition hover:text-white">{featuredCreator.name}</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide px-1.5 pt-1.5 pb-3">
              {featuredVideos.map((v: any, i: number) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setFeaturedIndex(i)}
                  aria-label={`Show featured: ${v.title}`}
                  className={`relative shrink-0 w-[150px] md:w-[220px] aspect-video overflow-hidden rounded-xl ring-1 transition-all ${
                    i === featuredIndex
                      ? "ring-1 ring-white opacity-100"
                      : "ring-white/10 opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={v.posterUrl || v.backdropUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="max-w-[1600px] mx-auto px-4 md:px-10 space-y-8 md:space-y-10">
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-2.5">
            <h2 className="text-[21px] font-black tracking-tighter text-white md:text-[28px]">Continue Watching</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {continueWatching.map((v: any) => {
              const progress = v.progressSeconds && v.progressDuration ? Math.min((v.progressSeconds / v.progressDuration) * 100, 100) : 0;
              const creator = creators.find((c: any) =>
                (v.creatorId && c.id === v.creatorId) ||
                (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
                (v.uploaderUserId && c.user_id === v.uploaderUserId)
              );
              return (
                <button key={v.id} type="button" onClick={() => onVideoSelect(v)} className="flex flex-col w-[260px] md:w-[300px] shrink-0 group text-left">
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                    <img
                      src={v.posterUrl || v.backdropUrl}
                      alt={v.title || ""}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />
                    <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/10">
                      <Play size={12} fill="currentColor" /> Resume
                    </div>
                    {progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-white/20">
                        <div className="h-full bg-[#E53945]" style={{ width: `${progress}%` }} />
                      </div>
                    )}
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
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <SectionHead
          title="Don't miss a thing"
          href="/latest"
          onTitleClick={(e) => {
            if (typeof window !== "undefined" && window.innerWidth < 1024 && latestVideos[0]) {
              e.preventDefault();
              onVideoSelect(latestVideos[0]);
            }
          }}
        />
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {latestVideos.map((v: any) => (
            <div
              key={v.id}
              role="button"
              tabIndex={0}
              onClick={() => onVideoSelect(v)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onVideoSelect(v); } }}
              className="block w-[130px] md:w-[160px] shrink-0 group text-left cursor-pointer"
            >
              <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
                <VideoPreview
                  src={v.videoUrl || v.bitchuteUrl}
                  poster={v.posterUrl || v.backdropUrl}
                  className="transition duration-700 ease-out group-hover:scale-[1.04]"
                  playable
                  showMute
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHead title="Podcasts" href="/latest" />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {podcastVideos.map(renderLongFormCard)}
        </div>
      </section>

      <section>
        <SectionHead title="Documentaries" href="/latest" />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {documentaryVideos.map(renderLongFormCard)}
        </div>
      </section>

      <section>
        <SectionHead title="Discover creators" href="/creators" />
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
        <div className="flex items-end justify-between mb-5">
          <Link href="/merchandise" className="text-[21px] font-black tracking-tighter text-[#E53945] md:text-[28px] hover:opacity-90 transition">Store</Link>
          <Link href="/merchandise" className="text-[13px] font-medium text-white/45 hover:text-white transition mb-1">View all</Link>
        </div>
        {(() => {
          const merchItems = shopProducts.filter((p: any) => p.type?.toLowerCase() !== "book");
          const bookItems = shopProducts.filter((p: any) => p.type?.toLowerCase() === "book");
          return (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center text-[#E53945]"><ShoppingBag size={16} /></span>
                  <h3 className="text-sm font-bold text-white tracking-tight">Merchandise</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  {merchItems.slice(0, 20).map((p: any) => (
                    <Link key={p.id} href="/merchandise" className="flex flex-col w-[89px] md:w-[108px] shrink-0 group">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141418] ring-1 ring-white/10">
                        <img src={p.image_url} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex h-6 w-6 items-center justify-center text-[#E53945]"><BookOpen size={16} /></span>
                  <h3 className="text-sm font-bold text-white tracking-tight">Books</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
                  {bookItems.slice(0, 20).map((p: any) => (
                    <Link key={p.id} href="/merchandise" className="flex flex-col w-[89px] md:w-[108px] shrink-0 group">
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-[#141418] ring-1 ring-white/10">
                        <img src={p.image_url} alt="" className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.04]" />
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-white/80 line-clamp-2 leading-snug group-hover:text-white transition">{p.name}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </section>
      </div>

    </div>
  );
}
