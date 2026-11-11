"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";


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

function SectionHead({ kicker, title, href }: { kicker: string; title: string; href: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E53945] mb-1">{kicker}</p>
        <h2 className="text-[22px] md:text-[28px] font-semibold tracking-[-0.03em] text-white">{title}</h2>
      </div>
      <Link href={href} className="text-[13px] font-medium text-white/45 hover:text-white transition mb-1">
        View all
      </Link>
    </div>
  );
}

export default function DirectoryHome({ videos, creators, flushTop = false }: { videos: any[], creators: any[], flushTop?: boolean }) {
  const [shopProducts, setShopProducts] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/products/global")
      .then(r => r.json())
      .then(d => setShopProducts(d.products || []))
      .catch(() => {});
  }, []);

  return (
    <div className={`relative z-10 ${flushTop ? "pt-8" : "pt-20 md:pt-24"} pb-32 md:pb-16 max-w-[1600px] mx-auto px-4 md:px-10 space-y-14`}>

      <section>
        <SectionHead kicker="Latest" title="Don't miss a thing" href="/latest" />
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
        <SectionHead kicker="People" title="Discover creators" href="/creators" />
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
        <SectionHead kicker="Clips" title="Shorts" href="/feed" />
        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {videos.filter((v: any) => v.type?.toLowerCase() === "short" || v.type?.toLowerCase() === "reel").slice(0, 10).map((v: any) => (
            <Link key={v.id} href="/feed" className="relative w-[132px] md:w-[168px] aspect-[9/16] shrink-0 rounded-2xl overflow-hidden ring-1 ring-white/10 group shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]">
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
                <h3 className="text-white text-[12px] font-medium leading-snug line-clamp-2">{v.title}</h3>
                <p className="text-white/55 text-[11px] mt-1">{v.views || 0} views</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHead kicker="Shop" title="Merchandise" href="/merchandise" />
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
