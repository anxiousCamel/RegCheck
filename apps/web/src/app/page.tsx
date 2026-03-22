import Link from 'next/link';
import { Button } from '@regcheck/ui';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">RegCheck</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Sistema de construção e preenchimento de templates de documentos PDF.
        </p>
      </div>

      <div className="flex gap-4">
        <Link href="/templates">
          <Button size="lg">Templates</Button>
        </Link>
        <Link href="/documents">
          <Button size="lg" variant="outline">
            Documentos
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mt-8">
        <div className="p-6 border rounded-lg space-y-2">
          <h3 className="font-semibold">1. Upload PDF</h3>
          <p className="text-sm text-muted-foreground">
            Envie um PDF base para criar um template.
          </p>
        </div>
        <div className="p-6 border rounded-lg space-y-2">
          <h3 className="font-semibold">2. Configure campos</h3>
          <p className="text-sm text-muted-foreground">
            Arraste e posicione campos sobre o PDF com o editor visual.
          </p>
        </div>
        <div className="p-6 border rounded-lg space-y-2">
          <h3 className="font-semibold">3. Gere documentos</h3>
          <p className="text-sm text-muted-foreground">
            Preencha os dados e gere PDFs finais com qualidade.
          </p>
        </div>
      </div>
    </div>
  );
}
