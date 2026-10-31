"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Home, Play, Star, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [isTVApp, setIsTVApp] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsPlayerOpen(true);
    const handleClose = () => setIsPlayerOpen(false);
    document.addEventListener("player-open", handleOpen);
    document.addEventListener("player-close", handleClose);
    return () => {
      document.removeEventListener("player-open", handleOpen);
      document.removeEventListener("player-close", handleClose);
    };
  }, []);

  useEffect(() => {
    // Check if running in native TV app environment
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      if (/AFT|Silk|Android TV|BRAVIA|HbbTV|SmartTV|Tizen|Web0S|FireTV/i.test(ua)) {
        setIsTVApp(true);
      }
    }
  }, []);

  if (isTVApp || isPlayerOpen) return null;

  const tabs = [
    { name: "Home", icon: Home, href: "/" },
    { name: "Shorts", icon: Play, href: "/feed" },
    { name: "Plus", icon: Star, href: "/plus" },
    { name: "Shop", icon: ShoppingBag, href: "/merchandise" },
    { name: "Search", icon: Search, href: "/search" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[250] flex justify-center pb-[env(safe-area-inset-bottom)] pointer-events-none">
      
      {/* THE RAINDROP / LIQUID GLASS TAB BAR */}
      <div className="pointer-events-auto flex items-center justify-around w-[92%] max-w-[360px] mb-8 px-2 py-1.5 bg-gradient-to-b from-white/10 to-white/[0.02] backdrop-blur-[40px] backdrop-saturate-[180%] backdrop-brightness-[1.2] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-1px_1px_rgba(255,255,255,0.1)]">
        
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link 
              key={tab.name}
              href={tab.href} 
              className="flex items-center justify-center w-14 h-10 rounded-full"
            >
              <motion.div 
                whileTap={{ scale: 0.82 }} 
                transition={{ type: "spring", stiffness: 400, damping: 15 }} 
                className="flex items-center justify-center flex-col gap-0.5"
              >
                <tab.icon 
                  size={22} 
                  className={active ? "text-white" : "text-white/60 hover:text-white/80"} 
                  fill={active && tab.name === "Shorts" ? "currentColor" : "none"} 
                />
              </motion.div>
            </Link>
          );
        })}
        
      </div>
    </nav>
  );
}
