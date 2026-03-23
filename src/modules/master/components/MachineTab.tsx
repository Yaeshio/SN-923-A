'use client';

import { createMachineAction, forceSetMachineStatusAction } from '../actions/masterActions';
import { PlusCircle, Cpu, Settings2 } from 'lucide-react';
import { useState } from 'react';

interface Machine {
  id: string;
  name: string;
  type: string;
  status: 'READY' | 'RUNNING' | 'MAINTENANCE';
}

interface MachineTabProps {
  initialMachines: Machine[];
}

export function MachineTab({ initialMachines }: MachineTabProps) {
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: (val: any) => Promise<any>, val: any) => {
    setError(null);
    const result = await action(val);
    if (!result.success) {
      setError(result.error);
    }
  };

  const statusColors = {
    READY: 'bg-green-100 text-green-700',
    RUNNING: 'bg-blue-100 text-blue-700',
    MAINTENANCE: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
           製造機管理
        </h3>
      </div>

      <form 
        onSubmit={async (e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          await handleAction(createMachineAction, { 
            name: formData.get('name'),
            type: formData.get('type')
          });
          (e.target as HTMLFormElement).reset();
        }}
        className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-muted/30 p-4 rounded-lg border border-dashed"
      >
        <input
          name="name"
          placeholder="製造機名 (Printer A等)"
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          required
        />
        <input
          name="type"
          placeholder="タイプ (FDM, SLA等)"
          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          required
        />
        <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2">
          <PlusCircle className="h-4 w-4" /> 製造機追加
        </button>
      </form>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-medium">名前</th>
              <th className="px-4 py-2 text-left font-medium">タイプ</th>
              <th className="px-4 py-2 text-left font-medium">ステータス</th>
              <th className="px-4 py-2 text-right">強制ステータス変更</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initialMachines.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  {m.name}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{m.type}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[m.status]}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <select
                    className="text-xs border rounded px-2 py-1 bg-background"
                    value={m.status}
                    onChange={(e) => handleAction(forceSetMachineStatusAction, { 
                      id: m.id, 
                      status: e.target.value 
                    })}
                  >
                    <option value="READY">READY</option>
                    <option value="RUNNING">RUNNING</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
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
