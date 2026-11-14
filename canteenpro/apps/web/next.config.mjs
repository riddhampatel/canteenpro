/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  async redirects() {
    return [{ source: '/login', destination: process.env.NEXT_PUBLIC_CONSOLE_URL || 'http://localhost:5173/login', permanent: false }];
  },
};
export default nextConfig;
