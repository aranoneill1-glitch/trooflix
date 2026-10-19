"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ThumbsUp, Share, Bookmark, ChevronLeft } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FollowButton from "@/components/FollowButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import TextOverlayRenderer from "@/components/TextOverlay";
import LikeButton from "@/components/LikeButton";
import SaveButton from "@/components/SaveButton";
import ShareReelSheet from "@/components/ShareReelSheet";
import ViewCount from "@/components/ViewCount";
import { getCachedCreators } from "@/lib/cache";
import InlineComments from "@/components/InlineComments";
import PaywallGate from "@/components/PaywallGate";

type Video = {
  id: number;
  title: string;
  description: string;
  type: string;
  videoUrl?: string;
  bitchuteUrl?: string;
  textOverlays?: any[];
  posterUrl: string;
  creatorId?: number | null;
  uploaderUserId?: string | null;
  createdAt?: string;
  viewCount?: number;
};

type Creator = {
  id: number;
  name: string;
  slug: string;
  photoUrl: string;
  isVerified?: boolean;
};

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return new Date(iso).toLocaleDateString();
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = Number(params.videoId);

  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [followerCount, setFollowerCount] = useState<number | null>(null);

  useEffect(() => {
    getCachedCreators().then(async (creatorsList) => {
      const list: Creator[] = Array.isArray(creatorsList) ? creatorsList : [];
      
      // Fetch the video directly from the API
      const res = await fetch(`/api/videos`, { cache: "no-store" });
      const allVideos = await res.json();
      const found = allVideos.find((v: any) => v.id === videoId);

      if (found) {
        setVideo(found);
        const c = list.find((c) => c.id === found.creatorId || String(c.id) === String(found.creatorId));
        if (c) {
          setCreator(c);
          fetch(`/api/follow-count?creator_id=${c.id}`)
            .then((r) => r.json())
            .then((d) => setFollowerCount(d.count ?? 0));
        }
      }
      setLoading(false);
    });
  }, [videoId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-white/50">Loading…</p>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="min-h-screen bg-black text-white">
        <TopBar />
        <div className="pt-32 text-center">
          <p className="text-white/50 mb-4">Video not found</p>
          <Link href="/podcasts" className="text-red-500 hover:underline">Back to Podcasts</Link>
        </div>
        <MobileBottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24 lg:pb-0">
      <TopBar />

      <div className="pt-20 md:pt-24 max-w-7xl mx-auto px-0 md:px-8">
        
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-white/50 hover:text-white transition px-4 md:px-0 mb-4 text-sm"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Content (Left) */}
          <div className="flex-1 min-w-0">
            
            {/* Video Player — wrapped in PaywallGate */}
            <PaywallGate
              isPodcasterContent={!!(video.creatorId || video.uploaderUserId)}
              contentType={video.type}
              videoId={video.id}
            >
              {({ videoRef, onTimeUpdate, onContextMenu, onSeeking, onPlay }) => (
                <div className="relative w-full aspect-video bg-black md:rounded-xl overflow-hidden shadow-2xl">
                  <video
                    ref={videoRef}
                    src={video.videoUrl ?? video.bitchuteUrl ?? ""}
                    poster={video.posterUrl}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                    onTimeUpdate={onTimeUpdate}
                    onContextMenu={onContextMenu}
                    onSeeking={onSeeking}
                    onPlay={onPlay}
                    disablePictureInPicture
                    controlsList="nodownload noremoteplayback"
                  />
                  <TextOverlayRenderer overlays={video.textOverlays} />
                </div>
              )}
            </PaywallGate>

            {/* Title */}
            <h1 className="text-xl md:text-2xl font-bold mt-4 px-4 md:px-0">
              {video.title}
            </h1>

            {/* Channel Row (if creator exists) */}
            {creator && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-4 px-4 md:px-0">
                {/* Left: Channel Info */}
                <div className="flex items-center gap-3">
                  <Link href={`/podcaster/${creator.slug}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                    {creator.photoUrl ? (
                      <img src={creator.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-yellow-900 flex items-center justify-center font-bold">
                        {creator.name[0]}
                      </div>
                    )}
                  </Link>
                  <div>
                    <Link href={`/podcaster/${creator.slug}`} className="font-bold text-sm md:text-base hover:text-white/80 flex items-center gap-1">
                      {creator.name}
                      {creator.isVerified && <VerifiedBadge size={14} variant="gold" />}
                    </Link>
                    <p className="text-xs text-white/50">
                      {followerCount !== null ? `${followerCount.toLocaleString()} subscribers` : "Subscriber"}
                    </p>
                  </div>
                  <div className="ml-2 md:ml-4">
                    <FollowButton creatorId={creator.id} />
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar — always shows */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mt-4 px-4 md:px-0 scrollbar-hide">
              <div className="flex items-center bg-white/10 rounded-full overflow-hidden flex-shrink-0">
                <div className="px-4 py-2 hover:bg-white/20 transition cursor-pointer flex items-center gap-2">
                  <LikeButton videoId={video.id} size={18} showCount />
                </div>
              </div>
              
              <button
                onClick={() => setShowShare(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm font-semibold transition flex-shrink-0"
              >
                <Share size={18} /> Share
              </button>
              
              <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 text-sm font-semibold transition cursor-pointer flex-shrink-0">
                <SaveButton videoId={video.id} variant="labeled" size={18} />
              </div>
            </div>

            {/* Description Box */}
            <div className="mt-4 bg-[#141418] md:rounded-xl p-4 mx-4 md:mx-0">
              <p className="text-sm font-bold mb-1">
                <ViewCount videoId={video.id} /> · {timeAgo(video.createdAt)}
              </p>
              <p className="text-sm text-white/90 whitespace-pre-wrap mt-2">
                {video.description}
              </p>
            </div>

            {/* Comments Section */}
            <div className="px-4 md:px-0">
              <InlineComments videoId={video.id} />
            </div>
          </div>

          {/* Right Sidebar (Recommendations) - Optional, we can add later */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            {/* Placeholder for "Up Next" videos */}
          </div>

        </div>
      </div>

      <MobileBottomNav />
      
      <ShareReelSheet
        open={showShare}
        onClose={() => setShowShare(false)}
        videoId={video.id}
        videoTitle={video.title}
      />
    </main>
  );
}
