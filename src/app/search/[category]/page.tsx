"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import MobileBottomNav from "@/components/MobileBottomNav";

// Re-define categories here so we can pull the correct image and title
const CATEGORY_DATA: Record<string, { title: string, image: string }> = {
  "documentaries": { title: "Documentaries", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200&auto=format&fit=crop" },
  "podcasts": { title: "Podcasts", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=1200" },
  "independent-films": { title: "Independent Films", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=1200" },
  "books": { title: "Books", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=1200" },
  "history": { title: "History", image: "https://unsplash.com/photos/JioCsloIYro/download?force=true&w=1200" },
  "politics-geopolitics": { title: "Politics & Geopolitics", image: "https://unsplash.com/photos/2J5-T03yGQU/download?force=true&w=1200" },
  "war-conflict": { title: "War & Conflict", image: "https://images.unsplash.com/photo-1579912205439-4cef16dc975e?q=80&w=1200&auto=format&fit=crop" },
  "true-crime-justice": { title: "True Crime & Justice", image: "https://unsplash.com/photos/yYpmCA32U_M/download?force=true&w=1200" },
  "conspiracy-mystery": { title: "Conspiracy & Mystery", image: "https://unsplash.com/photos/BxELNNMN88Y/download?force=true&w=1200" },
  "society-culture": { title: "Society & Culture", image: "https://unsplash.com/photos/ehdsg7SHm6A/download?force=true&w=1200" },
  "business-finance": { title: "Business & Finance", image: "https://unsplash.com/photos/8lnbXtxFGZw/download?force=true&w=1200" },
  "science-technology": { title: "Science & Technology", image: "https://unsplash.com/photos/gMpwyM4Lyuw/download?force=true&w=1200" },
  "environment-nature": { title: "Environment & Nature", image: "https://unsplash.com/photos/1Z2niiBPg5A/download?force=true&w=1200" },
  "religion-spirituality": { title: "Religion & Spirituality", image: "https://unsplash.com/photos/UVssyWRCB24/download?force=true&w=1200" },
  "ancient-civilisation": { title: "Ancient Civilisation", image: "https://unsplash.com/photos/4Wue5DQnxSw/download?force=true&w=1200" },
  "comedy": { title: "Comedy", image: "https://unsplash.com/photos/jvNoSUrQkgU/download?force=true&w=1200" },
  "news": { title: "News", image: "https://unsplash.com/photos/hWJsOnaWTqs/download?force=true&w=1200" },
  "gaming": { title: "Gaming", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" },
};

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categorySlug = params.category as string;
  
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categoryInfo = CATEGORY_DATA[categorySlug] || { 
    title: categorySlug.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()), 
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1200&auto=format&fit=crop" 
  };

  useEffect(() => {
    // Fetch videos (mocking the API call to your existing /api/videos endpoint)
    fetch("/api/videos")
      .then(r => r.json())
      .then(data => {
        // Filter videos based on the category name matching the video type or category field
        // Adjust this logic once we know exactly how your videos are tagged in the DB
        const filtered = Array.isArray(data) ? data.filter(v => 
          v.category?.toLowerCase().includes(categoryInfo.title.toLowerCase()) || 
          v.type?.toLowerCase().includes(categoryInfo.title.toLowerCase())
        ) : [];
        
        // If no filtered videos, just show all for the demo
        setVideos(filtered.length > 0 ? filtered : (Array.isArray(data) ? data.slice(0, 10) : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [categoryInfo.title]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      
      {/* CINEMATIC HERO HEADER */}
      <div className="relative w-full h-[40vh] md:h-[50vh]">
        <img 
          src={categoryInfo.image} 
          alt={categoryInfo.title} 
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark Gradients for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-black/60" />
        
        {/* Back Button */}
        <button 
          onClick={() => router.back()} 
          className="absolute top-6 left-6 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition border border-white/10"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Title Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
          <p className="text-[10px] md:text-xs tracking-[0.4em] text-[#E53945] font-semibold mb-2 uppercase">
            Explore Category
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-2xl">
            {categoryInfo.title}
          </h1>
        </div>
      </div>

      {/* VIDEO GRID */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#E53945]/30 border-t-[#E53945] rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E53945]"></span> 
              Latest in {categoryInfo.title}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {videos.map((video) => (
                <Link key={video.id} href={`/watch/${video.id}`} className="group cursor-pointer">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1c1c1e] mb-2">
                    <img 
                      src={video.posterUrl || video.backdropUrl} 
                      alt={video.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                        <Play size={16} fill="white" className="ml-1 text-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 group-hover:text-[#E53945] transition-colors">{video.title}</h3>
                  <p className="text-xs text-white/50 mt-1">{video.duration || "Recently added"}</p>
                </Link>
              ))}
            </div>
            
            {videos.length === 0 && (
              <div className="text-center py-20 text-white/50">
                No videos found in this category yet.
              </div>
            )}
          </>
        )}
      </div>

      <MobileBottomNav />
    </main>
  );
}
