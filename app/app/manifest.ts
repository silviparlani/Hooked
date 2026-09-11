import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hooked — Crochet project tracker',
    short_name: 'Hooked',
    description:
      'A private home for crochet projects, inspiration, finished work, and yarn inventory.',
    start_url: '/',
    id: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f2e8',
    theme_color: '#31594a',
    categories: ['lifestyle', 'productivity'],
    icons: [
      {
        src: '/hooked-icon-left-sketch.png',
        sizes: '1254x1254',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
