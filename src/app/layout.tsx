import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trooflix",
  description: "Documentaries, films, and podcasts. Uncensored.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Script id="vconsole-loader" strategy="afterInteractive">
          {`
            (function() {
              try {
                var ua = navigator.userAgent || "";
                var isTV = /AFT|Silk|Android TV|BRAVIA|HbbTV/i.test(ua);
                var isOld = (function() {
                  var m = ua.match(/Chrome\\/(\\d+)/);
                  return m && parseInt(m[1]) < 111;
                })();
                if (isTV || isOld) {
                  var s = document.createElement('script');
                  s.src = 'https://unpkg.com/vconsole@latest/dist/vconsole.min.js';
                  s.onload = function() {
                    try { new window.VConsole({ theme: 'dark' }); } catch(e) {}
                  };
                  document.body.appendChild(s);
                }
              } catch (e) {}
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
