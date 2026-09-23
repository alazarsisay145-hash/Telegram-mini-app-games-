import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXUS GAMES',
    short_name: 'NEXUS GAMES',
    description: 'Telegram Mini App gaming platform with virtual credits.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    icons: [],
  };
}
