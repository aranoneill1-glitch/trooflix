"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Camera, Share2, Image as ImageIcon } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAvatar: () => void;
  onBackdrop: () => void;
  onShare: () => void;
};

export default function ProfileMenu({ open, onClose, onEdit, onAvatar, onBackdrop, onShare }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-[110%] left-0 w-56 bg-[#1c1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
          >
            <div className="py-1">
              <button onClick={() => { onClose(); onEdit(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <Pencil size={18} className="text-white/80" />
                <span className="text-[15px] font-medium">Edit Details</span>
              </button>
              <button onClick={() => { onClose(); onAvatar(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <Camera size={18} className="text-white/80" />
                <span className="text-[15px] font-medium">Change Avatar</span>
              </button>
              <button onClick={() => { onClose(); onBackdrop(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <ImageIcon size={18} className="text-white/80" />
                <span className="text-[15px] font-medium">Change Backdrop</span>
              </button>
              <button onClick={() => { onClose(); onShare(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition text-white">
                <Share2 size={18} className="text-white/80" />
                <span className="text-[15px] font-medium">Share Profile</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
