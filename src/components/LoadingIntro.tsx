"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingIntro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Once per session
    const seen = sessionStorage.getItem("trooflix:intro-seen");
    if (seen) {
      setVisible(false);
      onDone();
      return;
    }

    // Try to play the sound. Browsers may block this until first interaction.
    try {
      const audio = new Audio(
        "https://pub-ce2ee455d2b04abc9964046e3ff970f0.r2.dev/sounds/545263__tairblenn__swish2.mp3"
      );
      audio.volume = 0.5;
      audioRef.current = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay blocked — silent intro. Fine.
        });
      }
    } catch (_) {}

    const t = setTimeout(() => {
      sessionStorage.setItem("trooflix:intro-seen", "1");
      setVisible(false);
      setTimeout(onDone, 400);
    }, 2500);

    return () => {
      clearTimeout(t);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[300] bg-black flex items-start justify-center pt-[18vh] md:items-center md:pt-0"
        >
          <div className="relative select-none">
            {/* Base layer: invisible */}
            <span
              className="text-6xl md:text-8xl font-black tracking-tight"
              style={{
                WebkitTextStroke: "0px transparent",
                color: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              TROOFLIX
            </span>

            {/* Filling layer: TROO white, FLIX red */}
            <motion.span
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
              className="absolute inset-0 text-6xl md:text-8xl font-black tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              <span className="text-white">TROO</span>
              <span className="text-red-600">FLIX</span>
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
