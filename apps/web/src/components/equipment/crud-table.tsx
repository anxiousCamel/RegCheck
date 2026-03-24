'use client';

import { useState } from 'react';
import { Button, Input, Badge } from '@regcheck/ui';

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

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {/* Create form */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Nome</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nome do(a) ${title.toLowerCase().slice(0, -1)}`}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <Button onClick={handleCreate} disabled={!newName.trim() || isCreating}>
          Adicionar
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium w-24">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium w-48">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdate();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-8"
                          autoFocus
                        />
                        <Button size="sm" onClick={handleUpdate}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <span className={!item.ativo ? 'text-muted-foreground line-through' : ''}>
                        {item.nome}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={item.ativo ? 'default' : 'secondary'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(item)}
                        disabled={editingId === item.id}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggle(item.id)}
                      >
                        {item.ativo ? 'Inativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
