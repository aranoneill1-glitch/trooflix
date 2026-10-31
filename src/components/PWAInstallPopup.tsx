"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCachedUser } from "@/lib/cache";

export default function PWAInstallPopup() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (standalone mode)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone;

    if (isStandalone) return;

    // 2. Check if user already dismissed it this session
    const isDismissed = sessionStorage.getItem("trooflix-pwa-dismissed");
    if (isDismissed) return;

    // 3. Detect mobile device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /iphone|ipad|ipod|android/i.test(userAgent);
    setIsMobile(isMobileDevice);
    
    if (!isMobileDevice) return; // Only show on phones/tablets

    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 4. Check if user is logged in
    getCachedUser().then((user) => {
      if (!user) {
        // If logged out, show the popup after a 1.5s delay
        setTimeout(() => setShowPopup(true), 1500);
      }
    });

    // 5. Capture the beforeinstallprompt event (Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // On iOS, we just keep the modal open but change the text to instructions
      // Or we can just leave it as is and the user reads the instructions below
      return; 
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPopup(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPopup(false);
    // Save to session storage so it doesn't pop up again until next visit
    sessionStorage.setItem("trooflix-pwa-dismissed", "true");
  };

  if (!isMobile || !showPopup) return null;

  return (
    <AnimatePresence>
      {showPopup && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-sm"
          />
          
          {/* Popup Box */}
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[501] bg-[#1c1c1e] border-t border-white/10 rounded-t-3xl p-6 pb-10 lg:max-w-md lg:mx-auto lg:rounded-3xl lg:bottom-10 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight">
                  <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                </span>
                <span className="bg-[#E53945] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">App</span>
              </div>
              <button onClick={handleDismiss} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition">
                <X size={18} className="text-white/70" />
              </button>
            </div>

            <h3 className="text-2xl font-black text-white mb-2">Get the best experience</h3>
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Install Trooflix on your phone for full-screen video, faster loading, and instant access to your favorite creators.
            </p>

            {isIOS ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <p className="text-sm text-white/80 flex flex-col items-center text-center gap-2">
                  <span className="font-bold text-white">How to install on iPhone:</span>
                  <span>Tap the <Share size={14} className="inline mx-1 text-[#E53945]"/> <strong>Share</strong> button below,</span>
                  <span>scroll down and select</span>
                  <span className="font-bold text-white">"Add to Home Screen"</span>
                </p>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-[#E53945]/20 mb-3"
              >
                <Download size={20} /> Install App
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="w-full py-3 text-white/50 hover:text-white text-sm font-semibold transition"
            >
              Maybe later
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
