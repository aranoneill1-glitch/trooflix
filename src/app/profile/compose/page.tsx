"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Image as ImageIcon, MessageSquare } from "lucide-react";

export default function ComposePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <div className="sticky top-0 z-30 bg-black border-b border-white/5 flex items-center px-4 py-3">
        <button
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
          aria-label="Back"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold">Create</h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl md:text-3xl font-black mb-2 text-center">What are you posting?</h2>
        <p className="text-white/50 text-sm mb-8 text-center">Choose your format</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
          <Link
            href="/profile/upload"
            className="group bg-[#141418] border border-white/10 hover:border-red-600/50 rounded-2xl p-6 flex flex-col items-center text-center transition"
          >
            <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-4 group-hover:bg-red-600/30 transition">
              <Play size={28} fill="currentColor" className="text-red-500 ml-1" />
            </div>
            <p className="text-lg font-bold mb-1">Reel</p>
            <p className="text-xs text-white/50">Short video, up to 90s</p>
          </Link>

          <Link
            href="/profile/compose/image"
            className="group bg-[#141418] border border-white/10 hover:border-red-600/50 rounded-2xl p-6 flex flex-col items-center text-center transition"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/30 transition">
              <ImageIcon size={28} className="text-blue-400" />
            </div>
            <p className="text-lg font-bold mb-1">Image</p>
            <p className="text-xs text-white/50">Photo with caption</p>
          </Link>

          <Link
            href="/profile/compose/troo"
            className="group bg-[#141418] border border-white/10 hover:border-red-600/50 rounded-2xl p-6 flex flex-col items-center text-center transition"
          >
            <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center mb-4 group-hover:bg-purple-600/30 transition">
              <MessageSquare size={28} className="text-purple-400" />
            </div>
            <p className="text-lg font-bold mb-1">Troo</p>
            <p className="text-xs text-white/50">Text post, up to 280 chars</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
