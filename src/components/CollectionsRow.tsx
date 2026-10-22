"use client";

import Link from "next/link";
import {
  Landmark,
  Building2,
  Fingerprint,
  Atom,
  Church,
  Eye,
  Sword,
  Users,
  Briefcase,
  Leaf,
  Hourglass,
  Smile,
  Newspaper,
} from "lucide-react";

const COLLECTIONS = [
  { name: "History", icon: Landmark, slug: "history", image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=600&auto=format&fit=crop" },
  { name: "Politics & Geopolitics", icon: Building2, slug: "politics", image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?q=80&w=600&auto=format&fit=crop" },
  { name: "War & Conflict", icon: Sword, slug: "war", image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=600&auto=format&fit=crop" },
  { name: "True Crime & Justice", icon: Fingerprint, slug: "true-crime", image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop" },
  { name: "Conspiracy & Unsolved", icon: Eye, slug: "conspiracy", image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=600&auto=format&fit=crop" },
  { name: "Society & Culture", icon: Users, slug: "society", image: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=600&auto=format&fit=crop" },
  { name: "Business & Finance", icon: Briefcase, slug: "business", image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=600&auto=format&fit=crop" },
  { name: "Science & Technology", icon: Atom, slug: "science", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=600&auto=format&fit=crop" },
  { name: "Environment & Nature", icon: Leaf, slug: "environment", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop" },
  { name: "Religion & Spirituality", icon: Church, slug: "religion", image: "https://images.unsplash.com/photo-1548625149-fc4a29cf7092?q=80&w=600&auto=format&fit=crop" },
  { name: "Ancient History", icon: Hourglass, slug: "ancient", image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop" },
  { name: "Comedy", icon: Smile, slug: "comedy", image: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?q=80&w=600&auto=format&fit=crop" },
  { name: "News", icon: Newspaper, slug: "news", image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=600&auto=format&fit=crop" },
];

export default function CollectionsRow({
  onSelectCategory,
  activeCategory,
}: {
  onSelectCategory?: (category: string) => void;
  activeCategory?: string | null;
}) {
  return (
    <div className="relative">
      <div className="flex items-center justify-between px-4 md:px-12 mb-3">
        <div>
          <p className="text-[10px] md:text-xs tracking-[0.4em] text-white/50 font-semibold mb-1">
            EXPLORE OUR COLLECTIONS
          </p>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight">
            Discover Something <span className="text-red-600">Real</span>
          </h2>
        </div>
      </div>

      <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide px-4 md:px-12 pb-2">
        {COLLECTIONS.map((col) => {
          const Icon = col.icon;
          const isActive = activeCategory === col.name;
          return (
            <button
              key={col.slug}
              onClick={() => onSelectCategory?.(col.name)}
              className={`relative flex-shrink-0 w-[110px] md:w-[130px] aspect-[3/2] md:aspect-[5/3] rounded-xl overflow-hidden flex flex-col items-center justify-center gap-1.5 transition-all duration-300 border ${
                isActive
                  ? "border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-105"
                  : "border-white/10 hover:border-white/30"
              }`}
            >
              {/* Background Image */}
              <img
                src={col.image}
                alt={col.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-110"
              />
              
              {/* Gradient Overlay (Vibrant top, dark bottom for text) */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

              {/* Content (Above the image) */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 px-2">
                <Icon size={24} strokeWidth={1.5} className={`drop-shadow-md ${isActive ? "text-red-400" : "text-white"}`} />
                <span className={`text-[10px] md:text-xs font-bold tracking-wider text-center leading-tight drop-shadow-md ${isActive ? "text-white" : "text-white/95"}`}>
                  {col.name.toUpperCase()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
