"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Home, Play, ShoppingBag, Crown } from "lucide-react";
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
    { name: "Search", icon: Search, href: "/search" },
    { name: "Shop", icon: ShoppingBag, href: "/merchandise" },
    { name: "Trooflix", href: "/plus" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[250] bg-black/90 backdrop-blur-xl border-t border-white/5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
      
      <div className="flex items-center justify-around w-full px-2 max-w-md mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          
          return (
            <Link 
              key={tab.name}
              href={tab.href} 
              className="flex flex-col items-center justify-center w-16 h-10 rounded-xl group"
            >
              <motion.div 
                whileTap={{ scale: 0.82 }} 
                transition={{ type: "spring", stiffness: 400, damping: 15 }} 
                className="flex items-center justify-center flex-col gap-1 w-full"
              >
                {tab.name === "Trooflix" ? (
                  <>
                    <div className={`h-[22px] flex flex-col items-center justify-center pointer-events-none transition-opacity ${active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}>
                      <span className="text-[15px] font-black tracking-tighter leading-none">
                        <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-transparent">.</span>
                  </>
                ) : (
                  <>
                    {tab.icon && (
                      <tab.icon 
                        size={22} 
                        className={active ? "text-white" : "text-white/50 group-hover:text-white/80 transition-colors"} 
                        fill={active && tab.name === "Shorts" ? "currentColor" : "none"} 
                      />
                    )}
                    <span className={`text-[9px] font-bold ${active ? "text-white" : "text-transparent"}`}>
                      {tab.name}
                    </span>
                  </>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
      
    </nav>
  );
}
