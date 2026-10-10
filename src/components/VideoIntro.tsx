"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function VideoIntro({ onDone }: { onDone: () => void }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play the intro sound
    try {
      const audio = new Audio(
        "https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/sounds/545263__tairblenn__swish2.mp3"
      );
      audio.volume = 0.5;
      audioRef.current = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } catch (_) {}

    const t = setTimeout(onDone, 1500);
    return () => {
      clearTimeout(t);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
    >
      <div className="relative select-none">
        <span
          className="text-5xl md:text-7xl font-black tracking-tight"
          style={{
            WebkitTextStroke: "0px transparent",
            color: "transparent",
            letterSpacing: "-0.02em",
          }}
        >
          TROOFLIX
        </span>

        <motion.span
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
          className="absolute inset-0 text-5xl md:text-7xl font-black tracking-tight"
          style={{ letterSpacing: "-0.02em" }}
        >
          <span className="text-white">TROO</span>
          <span className="text-red-600">FLIX</span>
        </motion.span>
      </div>
    </motion.div>
  );
}
