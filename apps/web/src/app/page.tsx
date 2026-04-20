import Link from 'next/link';
import { Button } from '@regcheck/ui';
import { LayoutTemplate, FileText, UploadCloud, MousePointer2, FileCheck, Check } from 'lucide-react';

export const metadata = {
  title: 'RegCheck ✓ | Preenchimento Inteligente',
  description: 'Sistema profissional para preenchimento de documentos técnicos.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%2322c55e%22/><path d=%22M30 50l15 15l25-25%22 fill=%22none%22 stroke=%22white%22 stroke-width=%2210%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>',
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-full bg-background p-4 sm:p-8">
      {/* Welcome Section */}
      <div className="flex flex-col items-center text-center space-y-4 py-8 sm:py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-2 border border-primary/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          v0.1.0 Alpha
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter text-foreground leading-tight flex items-center gap-1 sm:gap-3">
            Reg<span className="text-primary italic">Check</span>
            <div className="p-1 sm:p-2 bg-green-500 rounded-2xl shadow-lg shadow-green-500/20 rotate-3">
               <Check className="h-8 w-8 sm:h-12 sm:w-12 text-white stroke-[4px]" />
            </div>
          </h1>
        </div>
        <p className="text-sm sm:text-lg text-muted-foreground max-w-[280px] sm:max-w-md font-medium leading-relaxed mt-2">
          Sistema profissional para preenchimento inteligente de documentos técnicos.
        </p>
      </div>

      {/* Main Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mx-auto sm:max-w-none sm:justify-center">
        <Link href="/templates" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:px-10 h-14 sm:h-12 text-base font-bold shadow-lg shadow-primary/20 gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Templates
          </Button>
        </Link>
        <Link href="/documents" className="w-full sm:w-auto">
          <Button size="lg" variant="outline" className="w-full sm:px-10 h-14 sm:h-12 text-base font-bold border-2 gap-2 bg-background">
            <FileText className="h-5 w-5" />
            Documentos
          </Button>
        </Link>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto mt-12 mb-12">
        <div className="group p-6 border-2 border-border/50 rounded-2xl space-y-4 bg-card/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all">
          <div className="p-4 rounded-xl bg-blue-500/10 text-blue-600 w-fit group-hover:scale-110 transition-transform">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-lg uppercase tracking-tight">1. Importar PDF</h3>
            <p className="text-sm text-muted-foreground font-medium leading-snug">
              Envie sua base técnica em PDF para iniciar a digitalização.
            </p>
          </div>
        </div>

        <div className="group p-6 border-2 border-border/50 rounded-2xl space-y-4 bg-card/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all">
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-600 w-fit group-hover:scale-110 transition-transform">
            <MousePointer2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-lg uppercase tracking-tight">2. Mapear Campos</h3>
            <p className="text-sm text-muted-foreground font-medium leading-snug">
              Arraste assinaturas e campos de texto diretamente sobre o PDF.
            </p>
          </div>
        </div>

        <div className="group p-6 border-2 border-border/50 rounded-2xl space-y-4 bg-card/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all sm:col-span-2 lg:col-span-1">
          <div className="p-4 rounded-xl bg-green-500/10 text-green-600 w-fit group-hover:scale-110 transition-transform">
            <FileCheck className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-black text-lg uppercase tracking-tight">3. Gerar Final</h3>
            <p className="text-sm text-muted-foreground font-medium leading-snug">
              Preencha via celular e gere o arquivo final assinado em segundos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
