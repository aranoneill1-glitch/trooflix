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
              className="flex-shrink-0 w-[110px] md:w-[130px] aspect-[3/2] md:aspect-[5/3] rounded-lg flex flex-col items-center justify-center gap-1.5 transition border bg-[#0d0d12] border-white/10 hover:border-white/40 hover:bg-[#141418]"
            >
              <Icon size={26} className="text-white" strokeWidth={1.5} />
              <span className="text-[10px] md:text-xs font-bold tracking-wider text-center px-2 leading-tight">
                {col.name.toUpperCase()}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
