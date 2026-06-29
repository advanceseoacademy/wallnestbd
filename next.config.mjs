import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
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
