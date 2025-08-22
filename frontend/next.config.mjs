/** @type {import('next').NextConfig} */
const nextConfig = {
    // Allow production builds to complete even if ESLint/TS have issues.
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
  
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
        { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
        { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons/**' },
      ],
      // If you run into image build issues on Vercel, you can fallback to:
      // unoptimized: true,
    },
  };
  
  export default nextConfig;
  