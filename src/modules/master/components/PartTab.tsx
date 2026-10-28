'use client';

import { createPartAction, deletePartAction, updatePartAction } from '../actions/masterActions';
import { PlusCircle, Trash2, Edit2, Check, X } from 'lucide-react';
import { useState } from 'react';

interface Part {
  id: string;
  unitId: string;
  partNumber: string;
  stlUrl: string | null;
  status: 'PENDING' | 'ACTIVE';
}

interface Unit {
  id: string;
  name: string;
  projectId: string;
}

interface PartTabProps {
  initialParts: Part[];
  units: Unit[];
}

export function PartTab({ initialParts, units }: PartTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: (val: any) => Promise<any>, val: any) => {
    setError(null);
    const result = await action(val);
    if (!result.success) {
      setError(result.error);
    } else {
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">部品管理</h3>
      </div>

      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await handleAction(createPartAction, { 
            unitId: formData.get('unitId'),
            partNumber: formData.get('partNumber'),
            stlUrl: formData.get('stlUrl')
          });
          (e.target as HTMLFormElement).reset();
        }}
        className="grid grid-cols-1 md:grid-cols-4 gap-2 bg-muted/30 p-4 rounded-lg border border-dashed"
      >
        <select 
          name="unitId" 
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          required
        >
          <option value="">ユニットを選択</option>
          {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input
          name="partNumber"
          placeholder="部品番号 (PN-001等)"
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          required
        />
        <input
          name="stlUrl"
          placeholder="STL URL (任意)"
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
        />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
          <PlusCircle className="h-4 w-4" /> 部品追加
        </button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">部品番号</th>
              <th className="px-4 py-2 text-left font-medium">所属ユニット</th>
              <th className="px-4 py-2 text-left font-medium">ステータス</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initialParts.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-2 font-mono">
                    {isEditing ? (
                      <input
                        id={`edit-pn-${p.id}`}
                        defaultValue={p.partNumber}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : p.partNumber}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {units.find(u => u.id === p.unitId)?.name || '不明'}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <select
                        id={`edit-status-${p.id}`}
                        defaultValue={p.status}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="ACTIVE">ACTIVE</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => {
                              const pn = (document.getElementById(`edit-pn-${p.id}`) as HTMLInputElement).value;
                              const st = (document.getElementById(`edit-status-${p.id}`) as HTMLSelectElement).value;
                              handleAction(updatePartAction, { id: p.id, partNumber: pn, status: st });
                            }}
                            className="text-green-600 hover:bg-green-100 p-1 rounded-md"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="text-muted-foreground hover:bg-muted p-1 rounded-md"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => setEditingId(p.id)}
                            className="text-blue-600 hover:bg-blue-100 p-1 rounded-md"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleAction(deletePartAction, { id: p.id })}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded-md"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          エラー: {error}
        </div>
      )}
    </div>
  );
}
