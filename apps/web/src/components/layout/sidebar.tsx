'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@regcheck/ui';

const navItems = [
  { href: '/', label: 'Inicio' },
  { href: '/templates', label: 'Templates' },
  { href: '/documents', label: 'Documentos' },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <Link href="/" className="text-xl font-bold tracking-tight">
          RegCheck
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname === item.href
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}
