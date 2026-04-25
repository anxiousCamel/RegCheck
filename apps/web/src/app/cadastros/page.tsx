'use client';

import Link from 'next/link';
import { Store, Map, Box, Laptop, ArrowRight } from 'lucide-react';
import { cn } from '@regcheck/ui';

const items = [
  {
    href: '/cadastros/lojas',
    label: 'Lojas',
    description: 'Gerenciar lojas e filiais da rede',
    icon: Store,
    color: 'text-blue-500 bg-blue-50',
  },
  {
    href: '/cadastros/setores',
    label: 'Setores',
    description: 'Configurar setores e departamentos',
    icon: Map,
    color: 'text-indigo-500 bg-indigo-50',
  },
  {
    href: '/cadastros/tipos',
    label: 'Tipos',
    description: 'Definir categorias de hardware',
    icon: Box,
    color: 'text-amber-500 bg-amber-50',
  },
  {
    href: '/equipamentos',
    label: 'Equipamentos',
    description: 'Inventário completo de ativos',
    icon: Laptop,
    color: 'text-emerald-500 bg-emerald-50',
  },
];

export default function CadastrosPage() {
  return (
    <div className="p-4 sm:p-8 space-y-10 bg-background/50 min-h-full">
      <div className="border-b pb-6">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase">
          Painel de Cadastros
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
          Configure a infraestrutura base e o inventário do sistema
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <div className="relative p-8 h-full border-2 rounded-[2rem] bg-card hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col items-start gap-6 overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                  <Icon className="h-32 w-32 -mr-10 -mt-10" />
                </div>

                <div
                  className={cn(
                    'p-4 rounded-2xl transition-all duration-300 group-hover:scale-110',
                    item.color,
                  )}
                >
                  <Icon className="h-8 w-8" />
                </div>

                <div className="space-y-2 flex-1">
                  <h2 className="font-black text-xl uppercase tracking-tight">{item.label}</h2>
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-black uppercase text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                  <span>Acessar</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
