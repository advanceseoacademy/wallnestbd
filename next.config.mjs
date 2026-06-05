/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['ejs'],
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async rewrites() {
    const adminApi =
      process.env.ADMIN_API_URL || 'http://localhost:3002';
    return [
      { source: '/admin/api/:path*', destination: `${adminApi}/api/admin/:path*` },
      { source: '/api/admin/:path*', destination: `${adminApi}/api/admin/:path*` },
    ];
  },
};

export default nextConfig;
