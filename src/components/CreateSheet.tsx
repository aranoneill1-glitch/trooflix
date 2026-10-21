"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Image, MessageSquare, Mic, Video, ShoppingBag, X } from "lucide-react";
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            style={{ maxHeight: "90vh", overflowY: "auto" }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-[#121212] rounded-t-3xl border-t border-white/10 pb-[calc(2rem+env(safe-area-inset-bottom))]"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 pt-2">
              <h2 className="text-xl font-bold text-center text-white mb-6">Create</h2>

              <div className="space-y-2">
                <button onClick={() => handleAction("/profile/compose")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-white">
                  <Play size={24} className="text-white/70" />
                  <span className="text-lg font-medium">Reel</span>
                </button>

                <button onClick={() => handleAction("/profile/compose/image")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-white">
                  <Image size={24} className="text-white/70" />
                  <span className="text-lg font-medium">Photo</span>
                </button>

                <button onClick={() => handleAction("/profile/compose/troo")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-white">
                  <MessageSquare size={24} className="text-white/70" />
                  <span className="text-lg font-medium">Troo Post</span>
                </button>

                {isCreator && (
                  <>
                    <div className="h-px bg-white/10 my-2 mx-4" />
                    
                    <button onClick={() => handleAction("/studio/upload?type=Podcast")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-yellow-500">
                      <Mic size={24} className="text-yellow-500/70" />
                      <span className="text-lg font-medium">Podcast</span>
                    </button>

                    <button onClick={() => handleAction("/studio/upload?type=Documentary")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-yellow-500">
                      <Video size={24} className="text-yellow-500/70" />
                      <span className="text-lg font-medium">Documentary</span>
                    </button>

                    <button onClick={() => handleAction("/studio/shop")} className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition text-yellow-500">
                      <ShoppingBag size={24} className="text-yellow-500/70" />
                      <span className="text-lg font-medium">Store Item</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="px-6 mt-6">
              <button onClick={onClose} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white transition">
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
