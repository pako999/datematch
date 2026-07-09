import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Photo uploads go through server actions (5 MB file limit + overhead).
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
