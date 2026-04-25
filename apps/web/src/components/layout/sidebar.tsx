'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutTemplate, FileText, Monitor, Settings } from 'lucide-react';
import { cn } from '@regcheck/ui';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/documents', label: 'Documentos', icon: FileText },
  { href: '/equipamentos', label: 'Equipamentos', icon: Monitor },
  { href: '/cadastros', label: 'Cadastros', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-56 md:flex-col border-r bg-muted/30">
      <div className="p-4 border-b">
        <Link href="/" className="text-xl font-bold tracking-tight" prefetch={true}>
          RegCheck
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 transition-transform group-hover:scale-110',
                  isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t text-xs text-muted-foreground">v0.1.0</div>
    </aside>
  );
}
