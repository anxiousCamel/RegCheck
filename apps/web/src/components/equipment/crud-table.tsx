'use client';

import { useState } from 'react';
import { Button, Input, Badge, Spinner, cn } from '@regcheck/ui';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Check, X, Building2, Layers, Tag, AlertCircle } from 'lucide-react';

interface CrudItem {
  id: string;
  nome: string;
  ativo: boolean;
}

interface CrudTableProps {
  title: string;
  description: string;
  items: CrudItem[];
  isLoading: boolean;
  onCreate: (nome: string) => void;
  onUpdate: (id: string, nome: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  isCreating: boolean;
}

export function CrudTable({
  title,
  description,
  items,
  isLoading,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
  isCreating,
}: CrudTableProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreate(newName.trim());
    setNewName('');
  };

  const startEdit = (item: CrudItem) => {
    setEditingId(item.id);
    setEditingName(item.nome);
  };

  const handleUpdate = () => {
    if (!editingId || !editingName.trim()) return;
    onUpdate(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  const getIcon = () => {
    const t = title.toLowerCase();
    if (t.includes('loja')) return <Building2 className="h-6 w-6" />;
    if (t.includes('setor')) return <Layers className="h-6 w-6" />;
    if (t.includes('tipo')) return <Tag className="h-6 w-6" />;
    return <Layers className="h-6 w-6" />;
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-background/50 min-h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary hidden sm:block">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{title}</h1>
            <p className="text-sm text-muted-foreground font-medium">{description}</p>
          </div>
        </div>
      </div>

      {/* Premium Create form */}
      <div className="bg-card border-2 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
           <Plus className="h-4 w-4 text-primary" />
           <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Adicionar Novo Registro</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Digite o nome do(a) ${title.toLowerCase().slice(0, -1)}...`}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="h-12 rounded-xl border-2 font-bold px-4 focus:ring-primary/20"
            />
          </div>
          <Button 
            onClick={handleCreate} 
            disabled={!newName.trim() || isCreating} 
            className="w-full sm:w-auto h-12 px-8 font-black uppercase tracking-tight shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            {isCreating ? <Spinner className="h-5 w-5" /> : 'Confirmar'}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spinner className="h-10 w-10 text-primary" />
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sincronizando dados...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop table */}
          <div className="hidden lg:block border-2 rounded-3xl overflow-hidden bg-card shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground">Descrição do Item</th>
                  <th className="text-left px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground w-32 text-center">Status</th>
                  <th className="text-right px-6 py-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground w-64">Gestão</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-primary/[0.01] transition-colors group">
                    <td className="px-6 py-4">
                      {editingId === item.id ? (
                        <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdate();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="h-10 rounded-lg border-2 font-bold focus:ring-primary/20"
                            autoFocus
                          />
                          <Button size="sm" onClick={handleUpdate} className="font-bold px-4">Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="font-bold">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className={cn(
                             "w-2 h-2 rounded-full",
                             item.ativo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"
                          )} />
                          <span className={cn(
                            "text-sm font-bold uppercase tracking-tight",
                            !item.ativo ? 'text-muted-foreground line-through opacity-50' : 'text-foreground'
                          )}>
                            {item.nome}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={item.ativo ? 'default' : 'secondary'} className={cn(
                         "font-black text-[10px] uppercase border shadow-none",
                         item.ativo ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(item)}
                          disabled={editingId === item.id}
                          className="h-9 border-2 font-bold gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onToggle(item.id)}
                          className="h-9 border-2 font-bold gap-2"
                        >
                          {item.ativo ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                          {item.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirm('Excluir este item permanentemente?') && onDelete(item.id)}
                          className="h-9 font-bold px-3"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-4">
            {items.map((item) => (
              <div key={item.id} className={cn(
                 "border-2 rounded-2xl p-5 bg-card space-y-4 shadow-sm transition-all",
                 !item.ativo && "bg-muted/30 border-muted"
              )}>
                {editingId === item.id ? (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase text-muted-foreground px-1">Novo Nome</label>
                       <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-12 rounded-xl border-2 font-bold text-lg"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdate} className="flex-1 h-12 font-black uppercase tracking-tight">Salvar Alteração</Button>
                      <Button variant="outline" onClick={() => setEditingId(null)} className="h-12 border-2 px-4">
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-3">
                         <div className={cn(
                            "w-2 h-2 rounded-full",
                            item.ativo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-slate-300"
                         )} />
                         <span className={cn(
                           "font-black uppercase tracking-tight text-base",
                           !item.ativo ? 'text-muted-foreground line-through' : 'text-foreground'
                         )}>
                           {item.nome}
                         </span>
                      </div>
                      <Badge variant={item.ativo ? 'default' : 'secondary'} className={cn(
                         "font-black text-[10px] uppercase",
                         item.ativo ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {item.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => startEdit(item)}
                        className="flex-1 h-11 border-2 font-bold gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onToggle(item.id)}
                        className="flex-1 h-11 border-2 font-bold gap-2"
                      >
                        {item.ativo ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                        {item.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => confirm('Excluir este item?') && onDelete(item.id)}
                        className="h-11 px-4"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border-2 border-dashed rounded-3xl bg-muted/20">
              <div className="p-4 rounded-full bg-muted text-muted-foreground">
                 <AlertCircle className="h-10 w-10" />
              </div>
              <p className="font-bold text-muted-foreground uppercase tracking-widest text-sm">Nenhum registro encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
