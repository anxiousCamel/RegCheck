'use client';

import Link from 'next/link';
import { Store, Map, Box } from 'lucide-react';

const items = [
  { href: '/cadastros/lojas', label: 'Lojas', description: 'Gerenciar lojas/filiais', icon: Store },
  { href: '/cadastros/setores', label: 'Setores', description: 'Gerenciar setores', icon: Map },
  { href: '/cadastros/tipos', label: 'Tipos de Equipamento', description: 'Gerenciar tipos de equipamento', icon: Box },
];

export default function CadastrosPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cadastros</h1>
        <p className="text-muted-foreground">Gerencie os dados base do sistema</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className="p-6 border rounded-lg hover:bg-muted/50 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4">
                <div className="p-2 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">{item.label}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
