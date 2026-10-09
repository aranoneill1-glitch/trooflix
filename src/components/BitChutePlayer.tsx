"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function BitChutePlayer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
    >
      <button onClick={onClose} className="absolute top-6 left-6 z-10 text-white hover:text-white/70 transition bg-black/60 rounded-full p-2">
        <X size={28} />
      </button>
      <h3 className="absolute top-8 left-1/2 -translate-x-1/2 text-white font-semibold text-lg pointer-events-none">
        {title}
      </h3>
      <iframe
        src={src}
        allowFullScreen
        className="w-full h-full"
        style={{ border: "none" }}
      />
    </motion.div>
  );
}
