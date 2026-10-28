'use client';

import { createBoxAction, deleteBoxAction, forceSetBoxStatusAction } from '../actions/masterActions';
import { PlusCircle, Trash2, Box } from 'lucide-react';
import { useState } from 'react';

interface StorageBox {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'OCCUPIED';
}

interface BoxTabProps {
  initialBoxes: StorageBox[];
}

export function BoxTab({ initialBoxes }: BoxTabProps) {
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: (val: any) => Promise<any>, val: any) => {
    setError(null);
    const result = await action(val);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          保管BOX管理
        </h3>
      </div>

      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await handleAction(createBoxAction, { 
            name: formData.get('name')
          });
          (e.target as HTMLFormElement).reset();
        }}
        className="flex gap-2 bg-muted/30 p-4 rounded-lg border border-dashed"
      >
        <input
          name="name"
          placeholder="BOX名 (Shelf-01等)"
          className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
          required
        />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> BOX追加
        </button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">名前</th>
              <th className="px-4 py-2 text-left font-medium">ステータス</th>
              <th className="px-4 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initialBoxes.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-2 font-medium flex items-center gap-2">
                  <Box className="h-4 w-4 text-muted-foreground" />
                  {b.name}
                </td>
                <td className="px-4 py-2">
                  <select
                    className={`text-[10px] font-bold border rounded px-2 py-0.5 ${
                        b.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                    value={b.status}
                    onChange={(e) => handleAction(forceSetBoxStatusAction, { 
                      id: b.id, 
                      status: e.target.value 
                    })}
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="OCCUPIED">OCCUPIED</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <button 
                    onClick={() => handleAction(deleteBoxAction, { id: b.id })}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded-md"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
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
