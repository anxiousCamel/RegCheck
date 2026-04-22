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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-primary/5 bg-background/80 backdrop-blur-xl md:hidden pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_15px_rgba(0,0,0,0.05)]">
      <div className="flex h-16 items-center justify-around px-2">
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
                'relative flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 active:scale-90',
                isActive ? 'text-primary' : 'text-muted-foreground/70 hover:text-muted-foreground'
              )}
            >
              {/* Active Indicator Pill */}
              {isActive && (
                <div className="absolute top-1 h-1 w-8 bg-primary rounded-full animate-in fade-in slide-in-from-top-1 duration-500" />
              )}

              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10" : "bg-transparent"
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tight transition-all duration-300",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
