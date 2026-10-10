import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TVNavigation from "@/components/TVNavigation";

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
        <TVNavigation />
        {children}
      </body>
    </html>
  );
}
