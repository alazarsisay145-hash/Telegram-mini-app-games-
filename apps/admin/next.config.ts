import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexus/ui', '@nexus/shared'],
};

export default nextConfig;
