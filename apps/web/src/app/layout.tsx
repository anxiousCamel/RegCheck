import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppSidebar } from '@/components/layout/sidebar';
import { MobileBottomNav } from '@/components/layout/mobile-nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RegCheck - Document Template Builder',
  description: 'Build, fill, and generate PDF documents from templates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-dvh overflow-hidden bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-auto pb-16 md:pb-0">{children}</main>
            <MobileBottomNav />
          </div>
        </Providers>
      </body>
    </html>
  );
}
