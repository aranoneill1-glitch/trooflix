"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingIntro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const seen = sessionStorage.getItem("trooflix:intro-seen");
    if (seen) {
      setVisible(false);
      onDone();
      return;
    }

    const t = setTimeout(() => {
      sessionStorage.setItem("trooflix:intro-seen", "1");
      setVisible(false);
      setTimeout(onDone, 400);
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
            {/* Base layer: invisible outline */}
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
              <span className="text-white">TROO</span><span className="text-red-600">FLIX</span>
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
