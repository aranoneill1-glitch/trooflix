"use client";

import { useState } from "react";
import { Search, Camera } from "lucide-react";
import Link from "next/link";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pb-24 font-sans">
      <TopBar />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Search Header */}
        <h1 className="text-3xl font-bold mb-4">Search</h1>

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-black" />
          </div>
          <input
            type="text"
            className="w-full bg-white text-black font-medium placeholder:text-gray-500 rounded-lg py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-white/50"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <Camera className="h-6 w-6 text-black cursor-pointer hover:text-gray-600" />
          </div>
        </div>

        {/* Top Main Categories Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {MAIN_CATEGORIES.map((cat) => (
            <div key={cat.name} className={`${cat.color} rounded-lg p-4 h-24 relative overflow-hidden cursor-pointer hover:brightness-110 transition`}>
              <h2 className="text-xl font-bold relative z-10">{cat.name}</h2>
              {/* Placeholder for the slanted image on the right */}
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
              {/* Placeholder for slanted images */}
              <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-black/20 -rotate-12 transform shadow-lg rounded-md" />
            </div>
          ))}
        </div>

      </div>

      <MobileBottomNav />
    </main>
  );
}
