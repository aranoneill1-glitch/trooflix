"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function IntroAnimation() {
  const [showIntro, setShowIntro] = useState(true);
  const [stage, setStage] = useState<"idle" | "reveal" | "done">("idle");

  useEffect(() => {
    // Prevent scrolling while the intro is playing
    document.body.style.overflow = "hidden";

    // 1. Wait for the T and F to fade in (0.8s), then pause (0.4s)
    const fadeTimer = setTimeout(() => {
      setStage("reveal");
    }, 1200);

    // 2. Wait for the reveal animation to finish, then fade out the whole screen
    const doneTimer = setTimeout(() => {
      setStage("done");
    }, 2600);

    // 3. Completely remove the overlay from the DOM
    const hideTimer = setTimeout(() => {
      setShowIntro(false);
      document.body.style.overflow = "auto";
    }, 3200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = "auto";
    };
  }, []);

  if (!showIntro) return null;

  return (
    <AnimatePresence>
      {stage !== "done" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden"
        >
          {/* The T (White) - Slides Left */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: stage === "reveal" ? -65 : 0 }}
            transition={{
              opacity: { duration: 0.8, ease: "easeOut" },
              x: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }, // Smooth custom bezier curve
            }}
            className="absolute text-[90px] md:text-[120px] font-black text-white tracking-tighter"
            style={{ paddingRight: "130px" }} // Adjust this to center the T properly
          >
            T
          </motion.div>

          {/* The F (Red) - Slides Right */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: stage === "reveal" ? 65 : 0 }}
            transition={{
              opacity: { duration: 0.8, ease: "easeOut" },
              x: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
            }}
            className="absolute text-[90px] md:text-[120px] font-black text-[#E53945] tracking-tighter"
            style={{ paddingLeft: "130px" }} // Adjust this to center the F properly
          >
            F
          </motion.div>

          {/* The Revealed Letters (ROO and LIX) - Sit behind the T and F */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: stage === "reveal" ? 1 : 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="absolute text-[90px] md:text-[120px] font-black tracking-tighter flex"
          >
            <span className="text-white">ROO</span>
            <span className="text-white">FLI</span>
            <span className="text-white">X</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
