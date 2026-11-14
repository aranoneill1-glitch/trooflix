"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Home, Play, ShoppingBag, Crown, MessageCircle, Wallet } from "lucide-react";
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
    { name: "Wallet", icon: Wallet, href: "/wallet" },
    { name: "Search", icon: Search, href: "/search" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav className="lg:hidden fixed inset-x-0 bottom-0 z-[250] border-t border-white/10 bg-[#070709]">
      <div className="flex items-center justify-around px-2 pt-1 pb-[max(6px,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-0.5"
            >
              {tab.name === "Trooflix" ? (
                <span className="text-[12px] font-black tracking-[-0.06em] leading-none">
                  <span className="text-white">TROO</span><span className="text-[#E53945]">FLIX</span>
                </span>
              ) : (
                <>
                  {tab.icon && (
                    <tab.icon
                      size={22}
                      className={active ? "text-white" : "text-white/45"}
                      fill={active && tab.name === "Shorts" ? "currentColor" : "none"}
                    />
                  )}
                  <span className={`text-[10px] font-medium ${active ? "text-white" : "text-white/45"}`}>
                    {tab.name}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
