import PushNotificationManager from "@/components/PushNotificationManager";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TVNavigation from "@/components/TVNavigation";
import { SearchProvider } from "@/context/SearchContext";
import CacheWarmer from "@/components/CacheWarmer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
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
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <PushNotificationManager />
        <body className={inter.className}>
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
                  window.addEventListener('load', function () {
                    navigator.serviceWorker.register('/sw.js').catch(function () {});
                  });
                }
              })();
            `,
          }}
        />
        <SearchProvider>
          <CacheWarmer />
          <TVNavigation />
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
