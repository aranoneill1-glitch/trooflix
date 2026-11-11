"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Home, Play, ShoppingBag, Crown, MessageCircle } from "lucide-react";
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
    { name: "Trooflix", href: "/creator-dashboard" },
    { name: "Chat", icon: MessageCircle, href: "/messages" },
    { name: "Search", icon: Search, href: "/search" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-[250] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pointer-events-none">
      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-full bg-[#121214]/80 px-1.5 py-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl">
        {tabs.map((tab) => {
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center w-16 h-12 rounded-full group"
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 18 }}
                className={`flex items-center justify-center flex-col gap-0.5 w-full h-full rounded-full ${active ? "bg-white/10" : ""}`}
              >
                {tab.name === "Trooflix" ? (
                  <span className="text-[12px] font-semibold tracking-[-0.04em] leading-none">
                    <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                  </span>
                ) : (
                  <>
                    {tab.icon && (
                      <tab.icon
                        size={20}
                        className={active ? "text-white" : "text-white/45 group-hover:text-white/80 transition-colors"}
                        fill={active && tab.name === "Shorts" ? "currentColor" : "none"}
                      />
                    )}
                    <span className={`text-[9px] font-medium ${active ? "text-white" : "text-white/40"}`}>
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
