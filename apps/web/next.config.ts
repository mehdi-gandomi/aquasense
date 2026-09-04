import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@aquasense/shared', 'react-leaflet', 'leaflet'],
  outputFileTracingRoot: __dirname + '/../../',
  async redirects() {
    return [
      { source: '/admin/buildings', destination: '/admin/plants', permanent: false },
      { source: '/admin/buildings/:id', destination: '/admin/plants/:id', permanent: false },
    ];
  },
};

export default nextConfig;
