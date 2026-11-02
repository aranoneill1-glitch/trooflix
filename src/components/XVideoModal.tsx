"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import CustomVideoPlayer from "@/components/CustomVideoPlayer";

export default function XVideoModal({
  video,
  onClose,
}: {
  video: any;
  startTime?: number;
  author?: any;
  onClose: () => void;
  onOpenComments?: () => void;
}) {
  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[300] bg-black"
    >
      <CustomVideoPlayer 
        src={video.videoUrl ?? video.bitchuteUrl ?? ""} 
        onClose={onClose} 
      />
    </motion.div>
  );
}
