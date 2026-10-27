"use client";

import { useState } from "react";
import { Search, X, MoreHorizontal, Plus, CheckCircle2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

const MAIN_CATEGORIES = [
  { name: "Documentaries", color: "bg-[#E13377]", image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=300&auto=format&fit=crop" },
  { name: "Podcasts", color: "bg-[#1DB954]", image: "https://unsplash.com/photos/Qruwi3Ur3Ak/download?force=true&w=300" },
  { name: "Films", color: "bg-[#2E77D0]", image: "https://unsplash.com/photos/mVv8igQaWoI/download?force=true&w=300" },
  { name: "Book Store", color: "bg-[#8400e7]", image: "https://unsplash.com/photos/_nm_mZ4Cs2I/download?force=true&w=300" },
];

const BROWSE_ALL = [
  { name: "History", color: "bg-[#8b5cf6]", image: "https://unsplash.com/photos/JioCsloIYro/download?force=true&w=300" },
  { name: "Politics & Geopolitics", color: "bg-[#006450]", image: "https://unsplash.com/photos/2J5-T03yGQU/download?force=true&w=300" },
  { name: "War & Conflict", color: "bg-[#E53945]", image: "https://unsplash.com/photos/IdtzzG9oxHo/download?force=true&w=300" },
  { name: "True Crime & Justice", color: "bg-[#1e3264]", image: "https://unsplash.com/photos/yYpmCA32U_M/download?force=true&w=300" },
  { name: "Conspiracy & Unsolved", color: "bg-[#7d4b96]", image: "https://unsplash.com/photos/BxELNNMN88Y/download?force=true&w=300" },
  { name: "Society & Culture", color: "bg-[#e86f2c]", image: "https://unsplash.com/photos/ehdsg7SHm6A/download?force=true&w=300" },
  { name: "Business & Finance", color: "bg-[#b28b00]", image: "https://unsplash.com/photos/8lnbXtxFGZw/download?force=true&w=300" },
  { name: "Science & Technology", color: "bg-[#0d73ec]", image: "https://unsplash.com/photos/gMpwyM4Lyuw/download?force=true&w=300" },
  { name: "Environment & Nature", color: "bg-[#00897b]", image: "https://unsplash.com/photos/1Z2niiBPg5A/download?force=true&w=300" },
  { name: "Religion & Spirituality", color: "bg-[#4527A0]", image: "https://unsplash.com/photos/UVssyWRCB24/download?force=true&w=300" },
  { name: "Ancient History", color: "bg-[#bf360c]", image: "https://unsplash.com/photos/4Wue5DQnxSw/download?force=true&w=300" },
  { name: "Comedy", color: "bg-[#ff9800]", image: "https://unsplash.com/photos/jvNoSUrQkgU/download?force=true&w=300" },
  { name: "News", color: "bg-[#c62828]", image: "https://unsplash.com/photos/hWJsOnaWTqs/download?force=true&w=300" },
  { name: "Gaming", color: "bg-[#673ab7]", image: "https://unsplash.com/photos/lTQKvoDQd2A/download?force=true&w=300" },
];

// Mock data to match your screenshot exactly
const MOCK_RESULTS = [
  { id: 1, type: "artist", title: "Dr. Dre", subtitle: "Artist", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80", verified: true },
  { id: 2, type: "artist", title: "Dreletronic", subtitle: "Artist", image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80", verified: false },
  { id: 3, type: "song", title: "Still D.R.E.", subtitle: "Song • Dr. Dre, Snoop Dogg", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80", explicit: true },
  { id: 4, type: "song", title: "Dream Come True", subtitle: "Song • Freya Skye, Malachi Barton, Z...", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&q=80", explicit: false },
  { id: 5, type: "song", title: "Dreiton", subtitle: "Song • C418", image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&q=80", explicit: false },
  { id: 6, type: "artist", title: "Dregermajster Crew", subtitle: "Artist", image: "https://images.unsplash.com/photo-1520872024865-3ff2805d8bb3?w=200&q=80", verified: false },
  { id: 7, type: "song", title: "(dream)", subtitle: "Song • salvia palth", image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&q=80", explicit: false },
  { id: 8, type: "artist", title: "Drake", subtitle: "Artist", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", verified: true },
  { id: 9, type: "album", title: "2001", subtitle: "Album • Dr. Dre", image: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=200&q=80", explicit: true },
];

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleCancel = () => {
    setQuery("");
    setIsSearching(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      {!isSearching && <TopBar />}

      <div className={`max-w-2xl mx-auto px-4 ${isSearching ? "pt-6" : "pt-20"}`}>
        
        {/* Header Area */}
        {isSearching ? (
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                autoFocus
                className="w-full bg-[#242424] text-white placeholder:text-gray-400 rounded-md py-2.5 pl-10 pr-10 focus:outline-none"
                placeholder="What are you looking for?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button 
                  onClick={() => setQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <div className="bg-gray-400 rounded-full p-0.5">
                    <X className="h-4 w-4 text-black" />
                  </div>
                </button>
              )}
            </div>
            <button onClick={handleCancel} className="text-white font-medium text-base hover:text-gray-300">
              Cancel
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-black" />
              </div>
              <input
                type="text"
                className="w-full bg-white text-black font-medium placeholder:text-gray-500 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                placeholder="What are you looking for?"
                value={query}
                onClick={() => setIsSearching(true)}
                onChange={(e) => setQuery(e.target.value)}
                readOnly={!isSearching}
              />
            </div>
          </>
        )}

        {/* Conditional Content: Search Results vs Browse Categories */}
        {isSearching ? (
          <div className="flex flex-col space-y-4 pb-10">
            {MOCK_RESULTS.map((item) => (
              <div key={item.id} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-1 -mx-1 rounded-md transition">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {item.type === "artist" ? (
                    <img src={item.image} alt={item.title} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <img src={item.image} alt={item.title} className="w-12 h-12 rounded-sm object-cover shrink-0" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.explicit && (
                        <span className="bg-gray-500 text-black text-[10px] font-bold px-1 rounded-sm flex items-center justify-center">E</span>
                      )}
                      <span className="text-white font-semibold text-base truncate">{item.title}</span>
                      {item.verified && <CheckCircle2 size={16} className="text-[#1ed760] shrink-0" fill="currentColor" />}
                    </div>
                    <span className="text-sm text-gray-400 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 pl-2 shrink-0">
                  {item.type !== "artist" && (
                    <MoreHorizontal size={20} className="text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                  )}
                  <Plus size={24} className="text-gray-400 hover:text-white transition" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Top Main Categories Grid - Spotify Tilt Style */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {MAIN_CATEGORIES.map((cat) => (
                <div key={cat.name} className={`${cat.color} rounded-lg p-4 h-24 relative overflow-hidden cursor-pointer group shadow-lg`}>
                  <h2 className="text-xl font-bold relative z-10 text-white drop-shadow-md">{cat.name}</h2>
                  {/* Tilted Image */}
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="absolute -right-2 -bottom-2 w-20 h-20 object-cover rotate-[25deg] shadow-2xl rounded-sm group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ))}
            </div>

            {/* New Explore Collections Header */}
            <div className="mb-4 mt-2">
              <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1">
                EXPLORE OUR COLLECTIONS
              </p>
              <h2 className="text-2xl md:text-4xl font-black tracking-tight">
                Discover Something <span className="text-red-600">Real</span>
              </h2>
            </div>

            {/* Browse All Grid - Spotify Tilt Style */}
            <div className="grid grid-cols-2 gap-4">
              {BROWSE_ALL.map((cat) => (
                <div key={cat.name} className={`${cat.color} rounded-lg p-4 h-24 relative overflow-hidden cursor-pointer group shadow-lg`}>
                  <h2 className="text-lg font-bold relative z-10 text-white drop-shadow-md leading-tight">{cat.name}</h2>
                  {/* Tilted Image */}
                  <img 
                    src={cat.image} 
                    alt={cat.name} 
                    className="absolute -right-2 -bottom-2 w-16 h-16 md:w-20 md:h-20 object-cover rotate-[25deg] shadow-2xl rounded-sm group-hover:scale-105 transition-transform duration-500" 
                  />
                </div>
              ))}
            </div>
          </>
        )}

      </div>

      <MobileBottomNav />
    </main>
  );
}
