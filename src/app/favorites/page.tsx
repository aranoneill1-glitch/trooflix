"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FavoriteButton from "@/components/FavoriteButton";
import { getCachedUser, getCachedVideos, getCachedCreators } from "@/lib/cache";

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<"videos" | "creators">("videos");
  const [videos, setVideos] = useState<any[]>([]);
  const [creators, setCreators] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const user = await getCachedUser();
      setSignedIn(!!user);
      if (!user) { setLoading(false); return; }
      const [vidIdsRes, creatorIdsRes, allVideos, allCreators] = await Promise.all([
        fetch(`/api/my-list?user_id=${user.id}`).then(r => r.json()).catch(() => ({ ids: [] })),
        fetch(`/api/favorites/creators?user_id=${user.id}`).then(r => r.json()).catch(() => ({ ids: [] })),
        getCachedVideos().catch(() => []),
        getCachedCreators().catch(() => []),
      ]);
      const vidIds = new Set((vidIdsRes.ids || []).map(Number));
      const creatorIds = new Set((creatorIdsRes.ids || []).map(Number));
      setVideos((Array.isArray(allVideos) ? allVideos : []).filter((v: any) => vidIds.has(Number(v.id)) && v.type?.toLowerCase() !== "tweet"));
      setCreators((Array.isArray(allCreators) ? allCreators : []).filter((c: any) => creatorIds.has(Number(c.id))));
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white pb-20 lg:pb-0">
      <TopBar />
      <div className="pt-[calc(env(safe-area-inset-top)+5rem)] lg:pt-24 pb-16 max-w-6xl mx-auto px-4 md:px-8">
        <h1 className="text-3xl md:text-4xl font-black mb-1 flex items-center gap-2"><Heart className="text-red-500" fill="currentColor" /> Favorites</h1>
        <p className="text-white/50 mb-6">Your favorite videos and creators.</p>

        {!loading && !signedIn && (
          <div className="text-center py-16">
            <p className="text-white/70 mb-6 text-lg">Sign in to save favorites.</p>
            <Link href="/login" className="bg-red-600 hover:bg-red-500 font-semibold px-6 py-3 rounded transition">Sign In</Link>
          </div>
        )}

        {!loading && signedIn && (
          <>
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setTab("videos")} className={`px-4 py-2 rounded-full text-sm font-bold transition ${tab === "videos" ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>Videos ({videos.length})</button>
              <button onClick={() => setTab("creators")} className={`px-4 py-2 rounded-full text-sm font-bold transition ${tab === "creators" ? "bg-white text-black" : "bg-white/10 text-white/70 hover:bg-white/15"}`}>Creators ({creators.length})</button>
            </div>

            {tab === "videos" ? (
              videos.length === 0 ? (
                <p className="text-white/50 py-12 text-center">No favorite videos yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {videos.map((video) => (
                    <div key={video.id} className="group relative">
                      <Link href={String(video.type || "").toLowerCase() === "short" ? `/feed?reel=${video.id}` : `/podcast/${video.id}`} className="block">
                        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#141418] mb-2">
                          <img src={video.posterUrl || video.backdropUrl} alt={video.title || ""} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                        </div>
                        <p className="text-sm font-semibold line-clamp-2">{video.title}</p>
                      </Link>
                      <div className="absolute top-2 right-2 z-10"><FavoriteButton videoId={Number(video.id)} size={18} /></div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              creators.length === 0 ? (
                <p className="text-white/50 py-12 text-center">No favorite creators yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {creators.map((c) => (
                    <div key={c.id} className="bg-[#141418] border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center relative">
                      <div className="absolute top-3 right-3"><FavoriteButton creatorId={Number(c.id)} size={18} /></div>
                      <Link href={`/profile/${c.slug || c.id}`} className="flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 mb-3">
                          {c.photoUrl ? <img src={c.photoUrl} alt={c.name || ""} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-bold">{(c.name || "?")[0]}</div>}
                        </div>
                        <p className="font-bold text-sm line-clamp-1">{c.name}</p>
                        <p className="text-xs text-white/50 line-clamp-1">@{c.slug || "creator"}</p>
                      </Link>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
      <MobileBottomNav />
    </main>
  );
}
