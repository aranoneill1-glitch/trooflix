"use client";

import Link from "next/link";
import {
  Landmark,
  Building2,
  Fingerprint,
  Atom,
  Cpu,
  Church,
  Pyramid,
  Eye,
} from "lucide-react";

const COLLECTIONS = [
  { name: "History", icon: Landmark, slug: "history" },
  { name: "Politics", icon: Building2, slug: "politics" },
  { name: "True Crime", icon: Fingerprint, slug: "true-crime" },
  { name: "Science & Health", icon: Atom, slug: "science-health" },
  { name: "Technology", icon: Cpu, slug: "technology" },
  { name: "Religion & Belief", icon: Church, slug: "religion-belief" },
  { name: "Ancient History", icon: Pyramid, slug: "ancient-history" },
  { name: "The Unknown", icon: Eye, slug: "the-unknown" },
];

export default function CollectionsRow() {
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
          return (
            <Link
              key={col.slug}
              href={`/collections/${col.slug}`}
              className="group flex-shrink-0 w-[180px] md:w-[240px] aspect-[2.6/1] rounded-2xl overflow-hidden relative transition-all duration-300 hover:scale-[1.04]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 60%, rgba(255,255,255,0.06) 100%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow:
                  "inset 0 1px 0 0 rgba(255,255,255,0.10), 0 4px 20px -8px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Subtle red glow ring on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{
                  boxShadow:
                    "inset 0 0 0 1px rgba(220,38,38,0.4), 0 0 30px -6px rgba(220,38,38,0.35)",
                }}
              />

              <div className="relative h-full w-full flex flex-col items-center justify-center gap-1.5 px-3">
                <Icon
                  size={22}
                  className="text-white/85 group-hover:text-white transition"
                  strokeWidth={1.5}
                />
                <span
                  className="text-[11px] md:text-[13px] font-black uppercase text-white/95 group-hover:text-white transition text-center leading-tight"
                  style={{
                    letterSpacing: "0.14em",
                    textShadow: "0 1px 12px rgba(255,255,255,0.15)",
                  }}
                >
                  {col.name}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
