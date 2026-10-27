"use client";

import { useState } from "react";
import { Search, Camera, X, MoreHorizontal, Plus, CheckCircle2 } from "lucide-react";
import TopBar from "@/components/TopBar";
import MobileBottomNav from "@/components/MobileBottomNav";

const MAIN_CATEGORIES = [
  { name: "Music", color: "bg-[#E13377]" },
  { name: "Podcasts", color: "bg-[#006450]" },
  { name: "Audiobooks", color: "bg-[#1e3264]" },
  { name: "Live Events", color: "bg-[#8400e7]" },
];

const DISCOVER_CATEGORIES = [
  { name: "#croatian pop", image: "https://images.unsplash.com/photo-1516280440502-861d6c619b6e?w=500&q=80" },
  { name: "#bosnian pop", image: "https://images.unsplash.com/photo-1493225457124-a1a2a5f5c918?w=500&q=80" },
  { name: "#proud", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80" },
];

const BROWSE_ALL = [
  { name: "Made For You", color: "bg-[#8b5cf6]" },
  { name: "Upcoming releases", color: "bg-[#006450]" },
  { name: "New Releases", color: "bg-[#e13377]" },
  { name: "Pop", color: "bg-[#1e3264]" },
  { name: "Hip-Hop", color: "bg-[#477d95]" },
  { name: "Rock", color: "bg-[#006450]" },
  { name: "Latin", color: "bg-[#1e3264]" },
  { name: "Charts", color: "bg-[#8b5cf6]" },
  { name: "Educational", color: "bg-[#477d95]" },
  { name: "Documentary", color: "bg-[#2a2a2a]" },
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

      <div className={`max-w-2xl mx-auto px-4 ${isSearching ? "pt-6" : "pt-4"}`}>
        
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
                placeholder="What do you want to listen to?"
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
            <h1 className="text-3xl font-bold mb-4">Search</h1>
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-black" />
              </div>
              <input
                type="text"
                className="w-full bg-white text-black font-medium placeholder:text-gray-500 rounded-lg py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
                placeholder="What do you want to listen to?"
                value={query}
                onClick={() => setIsSearching(true)}
                onChange={(e) => setQuery(e.target.value)}
                readOnly={!isSearching}
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <Camera className="h-6 w-6 text-black cursor-pointer hover:text-gray-600" />
              </div>
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
            {/* Top Main Categories Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {MAIN_CATEGORIES.map((cat) => (
                <div key={cat.name} className={`${cat.color} rounded-lg p-4 h-24 relative overflow-hidden cursor-pointer hover:brightness-110 transition`}>
                  <h2 className="text-xl font-bold relative z-10">{cat.name}</h2>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-black/20 rotate-25 transform shadow-lg rounded-md" />
                </div>
              ))}
            </div>

            {/* Discover something new */}
            <h2 className="text-2xl font-bold mb-4">Discover something new</h2>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide mb-8 pb-2">
              {DISCOVER_CATEGORIES.map((cat) => (
                <div key={cat.name} className="min-w-[160px] h-[200px] relative rounded-lg overflow-hidden cursor-pointer group">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <h3 className="absolute bottom-3 left-3 text-lg font-bold">{cat.name}</h3>
                </div>
              ))}
            </div>

            {/* Browse All Grid */}
            <div className="grid grid-cols-2 gap-4">
              {BROWSE_ALL.map((cat) => (
                <div key={cat.name} className={`${cat.color} rounded-lg p-4 h-24 relative overflow-hidden cursor-pointer hover:brightness-110 transition`}>
                  <h2 className="text-lg font-bold relative z-10">{cat.name}</h2>
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-black/20 -rotate-12 transform shadow-lg rounded-md" />
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
