import TipModal from "@/components/TipModal";
import PushNotificationManager from "@/components/PushNotificationManager";
import GlobalIncomingCall from "@/components/GlobalIncomingCall";
import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import TVNavigation from "@/components/TVNavigation";
import { SearchProvider } from "@/context/SearchContext";
import CacheWarmer from "@/components/CacheWarmer";
import DesktopSidebar from "@/components/DesktopSidebar";
import PWAInstallPopup from "@/components/PWAInstallPopup"; // <-- Import

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  title: "Trooflix",
  description: "Documentaries, films, and podcasts. Uncensored.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trooflix",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#dc2626",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function applyViewportMode() {
                  var meta = document.querySelector('meta[name="viewport"]');
                  if (!meta) return;
                  if (window.Capacitor && window.Capacitor.getPlatform() === 'android') {
                    meta.setAttribute('content', 'width=1920, initial-scale=1, maximum-scale=1, user-scalable=no');
                    return;
                  }
                  try {
                    if (localStorage.getItem('trooflix:force-desktop') === '1') {
                      meta.setAttribute('content', 'width=1280, initial-scale=0.3, minimum-scale=0.1, maximum-scale=5, user-scalable=yes');
                      return;
                    }
                  } catch (e) {}
                  meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
                }
                applyViewportMode();
                document.addEventListener('DOMContentLoaded', applyViewportMode);
                setTimeout(applyViewportMode, 100);
              })();
            `,
          }}
        />
      </head>
      <PushNotificationManager />
      <body className={`${geist.className} antialiased`}>
        
        <GlobalIncomingCall />
        <TipModal />{typeof window !== "undefined" && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ("serviceWorker" in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                });
                caches.keys().then(function(names) {
                  for (var i = 0; i < names.length; i++) { caches.delete(names[i]); }
                });
              }
            `,
          }}
        />
      )}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Block iOS Safari pinch-zoom via gesture events
                ['gesturestart', 'gesturechange', 'gestureend'].forEach(function(evt) {
                  document.addEventListener(evt, function(e) { e.preventDefault(); }, { passive: false });
                });
                // Block double-tap zoom
                var lastTouch = 0;
                document.addEventListener('touchend', function(e) {
                  var now = Date.now();
                  if (now - lastTouch <= 300) { e.preventDefault(); }
                  lastTouch = now;
                }, { passive: false });
                // Register PWA service worker
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function (err) {
                      console.warn('SW registration failed: ', err);
                    });
                  });
                }
              })();
            `,
          }}
        />
        <SearchProvider>
          <CacheWarmer />
          <TVNavigation />
          <DesktopSidebar />
          <div className="lg:pl-[72px] w-full min-h-screen">
            {children}
          </div>
          <PWAInstallPopup /> {/* <-- ADDED HERE */}
        </SearchProvider>
      </body>
    </html>
  );
}
