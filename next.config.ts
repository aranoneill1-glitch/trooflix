import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "framer-motion",
    "lucide-react",
    "hls.js",
  ],
  experimental: {
    staleTimes: {
      dynamic: 30,   // Dynamic routes (e.g. /podcaster/[slug]) — 30s client cache
      static: 180,   // Static routes (e.g. /movies, /podcasts) — 3min client cache
    },
  },
};

export default nextConfig;
