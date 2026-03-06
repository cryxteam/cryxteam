import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable Vercel's image optimizer to avoid billed transformations; images are served as-is.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
