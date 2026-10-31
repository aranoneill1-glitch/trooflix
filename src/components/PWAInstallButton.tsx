"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Capture the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Hide button if app gets installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSHint(true);
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  // If already installed, hide the button completely
  if (isStandalone) return null;

  // If on Android and the prompt isn't ready, don't show the button
  if (!isIOS && !deferredPrompt) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
        title="Install App"
      >
        <Download size={18} />
      </button>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowIOSHint(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share size={32} className="text-[#E53945]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Install on iOS</h3>
              <p className="text-sm text-white/60 mb-6 leading-relaxed">
                Tap the <strong>Share</strong> icon (<Share size={12} className="inline mx-1"/>) at the bottom of Safari, then scroll down and tap <strong>"Add to Home Screen"</strong>.
              </p>
              <button
                onClick={() => setShowIOSHint(false)}
                className="w-full py-3 bg-[#E53945] hover:bg-[#d12e39] text-white font-bold rounded-xl transition"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
