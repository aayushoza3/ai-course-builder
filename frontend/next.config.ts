// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow production builds to complete even if there are ESLint or TS issues.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // If you use Next/Image with remote images, add patterns here later.
  images: { unoptimized: true },
};

export default nextConfig;
