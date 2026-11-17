"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Eye, Play, ArrowRight, Volume2, VolumeX, Maximize2, Sparkles, Clapperboard, Headphones, Film, History, ShoppingBag } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ShortPreviewFrame from "@/components/ShortPreviewFrame";


function VideoPreview({ src, poster, className, playable = false, showMute = false }: { src?: string; poster?: string; className?: string; playable?: boolean; showMute?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  // A generated /api/poster SVG is not a real thumbnail. When that's the only
  // poster, show the video's own first frame instead so a card never looks empty.
  const isPlaceholder = !poster || poster.includes("/api/poster");
  const needsObserver = playable || isPlaceholder;

  useEffect(() => {
    if (!needsObserver || !containerRef.current) return;
    if (typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "100px", threshold: 0.15 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [needsObserver]);

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
      {poster && !isPlaceholder ? (
        <img src={poster} alt="" className={`absolute inset-0 w-full h-full object-cover ${className || ""}`} loading="lazy" />
      ) : (
        <div className="absolute inset-0 bg-[#141418]" />
      )}

      {/* Fallback: render the video's first frame as the card preview. */}
      {isPlaceholder && src && inView && (
        <video
          src={`${src}#t=0.1`}
          muted
          playsInline
          preload="metadata"
          className={`${className || ""} absolute inset-0 h-full w-full object-cover`}
        />
      )}

      {playable && src && inView && !isPlaceholder && (
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
      {showMute && src && !isPlaceholder && (
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

function SectionHead({ title, href, icon: Icon, onTitleClick }: { title: string; href: string; icon: any; onTitleClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex items-end justify-between mb-2.5">
      <button
        type="button"
        onClick={onTitleClick}
        className="flex min-w-0 items-center gap-2.5 text-left"
      >
        <Icon className="h-[21px] w-[21px] shrink-0 text-white/90 md:h-7 md:w-7" strokeWidth={1.5} />
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
      className={`relative isolate left-1/2 -translate-x-1/2 w-[92vw] h-[56.25vw] max-h-[240px] rounded-2xl overflow-hidden bg-[#08090c] ring-1 ring-white/10 md:mt-0 md:w-screen md:h-auto md:aspect-video md:max-h-none md:rounded-none md:ring-0 ${canPlay && !playing ? "cursor-pointer" : ""} ${className}`}
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
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const latestVideos = videos.filter((v: any) => {
    const t = v.type?.toLowerCase();
    const hasVideo = !!(v.videoUrl || v.bitchuteUrl);
    return hasVideo && t !== "short" && t !== "tweet" && t !== "reel";
  }).slice(0, 50);
  const shortsVideos = videos.filter((v: any) => v.type?.toLowerCase() === "short" || v.type?.toLowerCase() === "reel").slice(0, 50);
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

  const renderLongFormCard = (v: any, compact = false) => {
    const creator = creators.find((c: any) =>
      (v.creatorId && c.id === v.creatorId) ||
      (v.uploaderUserId && c.ownerUserId === v.uploaderUserId) ||
      (v.uploaderUserId && c.user_id === v.uploaderUserId)
    );
    return (
      <button key={v.id} type="button" onClick={() => onVideoSelect(v)} className={`flex flex-col shrink-0 group text-left ${compact ? "w-[187px] md:w-[216px]" : "w-[260px] md:w-[300px]"}`}>
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#141418] ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
          <VideoPreview
            src={v.videoUrl || v.bitchuteUrl}
            poster={v.posterUrl || v.backdropUrl}
            className="transition duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10 pointer-events-none" />
          <span className={`absolute font-medium rounded-full bg-black/55 text-white/95 border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] ${compact ? "bottom-2 right-2 text-[10px] px-1.5 py-0.5" : "bottom-2.5 right-2.5 text-[11px] px-2 py-1"}`}>
            {timeAgo(v.createdAt)}
          </span>
        </div>
        <div className={`flex items-start gap-3 ${compact ? "mt-2 gap-2" : "mt-3"}`}>
          <div className={`rounded-full overflow-hidden bg-white/10 ring-1 ring-white/10 shrink-0 ${compact ? "w-7 h-7" : "w-9 h-9"}`}>
            {creator?.photoUrl ? (
              <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className={`w-full h-full flex items-center justify-center font-bold text-white/80 ${compact ? "text-[10px]" : "text-xs"}`}>
                {(creator?.name || "T")[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className={`font-medium text-white/90 leading-snug line-clamp-2 group-hover:text-white transition ${compact ? "text-[12px]" : "text-[15px]"}`}>{v.title}</h3>
            {creator?.name && <p className={`mt-0.5 text-white/55 truncate ${compact ? "text-[11px]" : "text-[13px]"}`}>{creator.name}</p>}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={`relative z-10 ${flushTop ? "pt-0" : "pt-0 md:pt-0"} pb-32 md:pb-16`}>

      <section className="pt-[calc(env(safe-area-inset-top)+5.5rem)] md:pt-[calc(env(safe-area-inset-top)+7rem)]">
        <div className="max-w-[1600px] mx-auto px-4 md:px-10">
          <div className="flex overflow-x-auto gap-3 pb-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            {creators.slice(0, 15).map((c: any) => (
              <Link key={c.id} href={`/profile/${c.slug}`} aria-label={c.name} className="shrink-0 group">
                <div className="p-[2px] rounded-full bg-gradient-to-b from-white/40 to-white/5 group-hover:from-[#E53945] group-hover:to-orange-400 transition duration-300">
                  <div className="w-[55px] h-[55px] md:w-[65px] md:h-[65px] rounded-full overflow-hidden bg-[#141418] ring-2 ring-[#070709]">
                    {c.photoUrl ? <img src={c.photoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-base font-semibold text-white/70">{c.name?.[0]}</div>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <SectionHead
            title="Don't miss a thing"
            href="/latest"
            icon={Play}
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
                className="block w-[190px] md:w-[240px] shrink-0 group text-left cursor-pointer"
              >
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
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
        </div>
      </section>

      <section>
        <div className="max-w-[1600px] mx-auto px-4 md:px-10">
          <SectionHead title="Featured" href="/latest" icon={Sparkles} />
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

      <section>
        <div className="max-w-[1600px] mx-auto px-4 md:px-10">
          <SectionHead title="Shorts" href="/feed" icon={Clapperboard} />
          <div className="overflow-x-auto scrollbar-hide pb-3 -mx-4 px-4 md:mx-0 md:px-0">
            <div className="inline-flex gap-1.5 md:gap-2">
              {Array.from({ length: Math.ceil(shortsVideos.length / 3) }, (_, col) => (
                <div key={col} className="flex flex-col gap-1.5 md:gap-2 shrink-0">
                  {shortsVideos.slice(col * 3, col * 3 + 3).map((v: any) => (
                    <Link key={v.id} href={`/feed?reel=${v.id}`} className="relative block w-[86px] h-[115px] md:w-[110px] md:h-[147px] overflow-hidden bg-[#111114] group">
                      <ShortPreviewFrame
                        src={v.videoUrl || v.bitchuteUrl}
                        poster={v.posterUrl || v.backdropUrl}
                        alt=""
                        autoplay={v.id % 3 === 0}
                      />
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 md:px-10 space-y-8 md:space-y-10">
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <History className="h-[21px] w-[21px] shrink-0 text-white/90 md:h-7 md:w-7" strokeWidth={1.5} />
              <h2 className="text-[21px] font-black tracking-tighter text-white md:text-[28px]">Continue Watching</h2>
            </div>
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
        <SectionHead title="Podcasts" href="/latest" icon={Headphones} />
        {podcastVideos[0] && (
          <button
            type="button"
            onClick={() => onVideoSelect(podcastVideos[0])}
            className="relative mb-4 block w-full aspect-[21/9] overflow-hidden rounded-2xl bg-[#141418] text-left ring-1 ring-white/10 group"
          >
            <img
              src={podcastVideos[0].posterUrl || podcastVideos[0].backdropUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-7">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60 md:text-xs">
                Latest podcast
              </p>
              <h3 className="max-w-2xl text-xl font-black tracking-tight text-white md:text-3xl">
                {podcastVideos[0].title}
              </h3>
            </div>
            <span className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg transition group-hover:scale-105 md:right-7 md:h-14 md:w-14">
              <Play size={18} fill="currentColor" />
            </span>
          </button>
        )}
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {podcastVideos.map((v) => renderLongFormCard(v, true))}
        </div>
      </section>

      <section>
        <SectionHead title="Documentaries" href="/latest" icon={Film} />
        <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {documentaryVideos.map((v) => renderLongFormCard(v))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-2.5">
          <Link href="/merchandise" className="flex items-center gap-2.5 text-[21px] font-black tracking-tighter text-white hover:opacity-90 transition md:text-[28px]">
            <ShoppingBag className="h-[21px] w-[21px] shrink-0 text-white/90 md:h-7 md:w-7" strokeWidth={1.5} /> Store
          </Link>
          <Link href="/merchandise" className="text-[13px] font-medium text-white/45 hover:text-white transition mb-1">View all</Link>
        </div>
        <Link href="/merchandise" className="relative block w-full aspect-[21/9] overflow-hidden rounded-2xl ring-1 ring-white/10 group">
          <img
            src="https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=2000&auto=format&fit=crop"
            alt="Creator merchandise and apparel"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/15" />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/15 px-7 py-3 text-sm font-bold text-white backdrop-blur-md shadow-xl transition group-hover:bg-white group-hover:text-black">
              Explore the store <ArrowRight size={16} />
            </span>
          </div>
        </Link>
      </section>
      </div>

    </div>
  );
}
