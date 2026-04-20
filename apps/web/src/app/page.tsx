import Link from 'next/link';
import { Button } from '@regcheck/ui';
import { LayoutTemplate, FileText, UploadCloud, MousePointer2, FileCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">RegCheck</h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Sistema profissional para construção e preenchimento inteligente de templates PDF.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/templates">
          <Button size="lg" className="gap-2 px-8">
            <LayoutTemplate className="h-5 w-5" />
            Templates
          </Button>
        </Link>
        <Link href="/documents">
          <Button size="lg" variant="outline" className="gap-2 px-8">
            <FileText className="h-5 w-5" />
            Documentos
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mt-12">
        <div className="p-6 border rounded-xl space-y-3 bg-card hover:shadow-lg transition-all border-primary/10">
          <div className="p-3 rounded-full bg-primary/10 w-fit text-primary">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg">1. Upload PDF</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Envie seu PDF base para criar um novo template estruturado.
          </p>
        </div>
        <div className="p-6 border rounded-xl space-y-3 bg-card hover:shadow-lg transition-all border-primary/10">
          <div className="p-3 rounded-full bg-primary/10 w-fit text-primary">
            <MousePointer2 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg">2. Configure campos</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Arraste e posicione campos de texto e assinaturas com precisão.
          </p>
        </div>
        <div className="p-6 border rounded-xl space-y-3 bg-card hover:shadow-lg transition-all border-primary/10">
          <div className="p-3 rounded-full bg-primary/10 w-fit text-primary">
            <FileCheck className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-lg">3. Gere documentos</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Preenchimento rápido e automático para gerar PDFs profissionais.
          </p>
        </div>
      </div>
    </div>
  );
}
