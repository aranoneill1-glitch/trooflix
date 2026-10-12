import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "framer-motion",
    "lucide-react",
    "hls.js",
  ],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.trooflixtv.com" }],
        destination: "https://trooflixtv.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
