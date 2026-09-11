import type { Metadata } from 'next';
import './globals.css';
import { PwaStatus } from '@/components/pwa/pwa-status';

export const metadata: Metadata = {
  title: 'Hooked — Crochet project tracker',
  description:
    'A private home for crochet projects, inspiration, finished work, and yarn inventory.',
  icons: {
    icon: '/hooked-icon-left-sketch.png',
    apple: '/hooked-icon-left-sketch.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Hooked',
    statusBarStyle: 'default',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PwaStatus />
        {children}
      </body>
    </html>
  );
}
