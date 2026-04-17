'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@regcheck/ui';
import { Home, FileText, Files, Monitor, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/documents', label: 'Docs', icon: Files },
  { href: '/equipamentos', label: 'Equip.', icon: Monitor },
  { href: '/cadastros', label: 'Cadastros', icon: Settings },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 h-14 border-t bg-background md:hidden">
      <div className="flex h-full items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
