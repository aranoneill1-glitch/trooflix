"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingIntro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Once per session
    const seen = sessionStorage.getItem("trooflix:intro-seen");
    if (seen) {
      setVisible(false);
      onDone();
      return;
    }

    const t = setTimeout(() => {
      sessionStorage.setItem("trooflix:intro-seen", "1");
      setVisible(false);
      setTimeout(onDone, 400); // wait for fade-out
    }, 2500);

    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
        >
          <div className="relative select-none">
            {/* Base layer: white outline text */}
            <span
              className="text-6xl md:text-8xl font-black tracking-tight"
              style={{
                WebkitTextStroke: "2px rgba(255,255,255,0.35)",
                color: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              TROOFLIX
            </span>

            {/* Filling layer: solid red, clip-animated left to right */}
            <motion.span
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 2, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
              className="absolute inset-0 text-6xl md:text-8xl font-black tracking-tight text-red-600"
              style={{ letterSpacing: "-0.02em" }}
            >
              TROOFLIX
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
