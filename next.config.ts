import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "framer-motion",
    "lucide-react",
    "hls.js",
  ],
};

export default nextConfig;
