import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js "N" / turbopack badge in local/dev.
  devIndicators: false,
};

export default nextConfig;
