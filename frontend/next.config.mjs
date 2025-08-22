/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        { protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' },
        { protocol: 'https', hostname: 'img.youtube.com', pathname: '/vi/**' },
        { protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons/**' },
      ],
    },
  };
  
  export default nextConfig;
  