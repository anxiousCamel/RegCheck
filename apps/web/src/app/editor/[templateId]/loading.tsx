import { Spinner } from '@regcheck/ui';

export default function EditorLoading() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-8 w-8" />
        <span className="text-sm text-muted-foreground">Carregando editor...</span>
      </div>
    </div>
  );
}
