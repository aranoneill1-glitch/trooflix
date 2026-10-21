"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Image as ImageIcon, MessageSquare, Mic, Video, ShoppingBag } from "lucide-react";
import { getCachedUser } from "@/lib/cache";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function CreateSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [tier, setTier] = useState<string>("user");

  useEffect(() => {
    if (open) {
      getCachedUser().then((u) => {
        if (u) {
          fetch(`/api/profile?user_id=${u.id}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.profile?.tier) setTier(d.profile.tier);
            });
        }
      });
    }
  }, [open]);

  const handleAction = (path: string) => {
    onClose();
    router.push(path);
  };

  const isCreator = tier === "podcaster";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Invisible backdrop to close menu when clicking outside */}
          <div className="fixed inset-0 z-[90]" onClick={onClose} />

          {/* Dropdown Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-[110%] left-0 w-60 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            <div className="py-1">
              <button onClick={() => handleAction("/profile/upload")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <Play size={20} className="text-white/80" />
                <span className="text-[15px] font-medium">Reel</span>
              </button>

              <button onClick={() => handleAction("/profile/compose/image")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <ImageIcon size={20} className="text-white/80" />
                <span className="text-[15px] font-medium">Photo</span>
              </button>

              <button onClick={() => handleAction("/profile/compose/troo")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <MessageSquare size={20} className="text-white/80" />
                <span className="text-[15px] font-medium">Troo Post</span>
              </button>

              {isCreator && (
                <>
                  <div className="h-px bg-white/10 my-1 mx-2" />
                  
                  <button onClick={() => handleAction("/studio/upload?type=Podcast")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-yellow-500">
                    <Mic size={20} className="text-yellow-500/80" />
                    <span className="text-[15px] font-medium">Podcast</span>
                  </button>

                  <button onClick={() => handleAction("/studio/upload?type=Documentary")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-yellow-500">
                    <Video size={20} className="text-yellow-500/80" />
                    <span className="text-[15px] font-medium">Documentary</span>
                  </button>

                  <button onClick={() => handleAction("/studio/shop")} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-yellow-500">
                    <ShoppingBag size={20} className="text-yellow-500/80" />
                    <span className="text-[15px] font-medium">Store Item</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
