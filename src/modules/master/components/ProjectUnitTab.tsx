'use client';

import { createProjectAction, deleteProjectAction, createUnitAction, deleteUnitAction } from '../actions/masterActions';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Project {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  projectId: string;
  name: string;
}

interface ProjectUnitTabProps {
  projects: Project[];
  units: Unit[];
}

export function ProjectUnitTab({ projects, units }: ProjectUnitTabProps) {
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (action: (val: any) => Promise<any>, val: any) => {
    setError(null);
    const result = await action(val);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Projects Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          プロジェクト管理
        </h3>
        
        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await handleAction(createProjectAction, { name: formData.get('name') });
            (e.target as HTMLFormElement).reset();
          }}
          className="flex gap-2"
        >
          <input
            name="name"
            placeholder="新規プロジェクト名"
            className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          />
          <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
            <PlusCircle className="h-4 w-4" /> 追加
          </button>
        </form>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium">名前</th>
                <th className="px-4 py-2 text-right w-16">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => handleAction(deleteProjectAction, { id: p.id })}
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
      </div>

      {/* Units Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">ユニット管理</h3>

        <form 
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            await handleAction(createUnitAction, { 
              projectId: formData.get('projectId'),
              name: formData.get('name') 
            });
            (e.target as HTMLFormElement).reset();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          <select 
            name="projectId" 
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
            required
          >
            <option value="">プロジェクトを選択</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              name="name"
              placeholder="新規ユニット名"
              className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
              required
            />
            <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> 追加
            </button>
          </div>
        </form>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-medium">名前</th>
                <th className="px-4 py-2 text-left font-medium">プロジェクト</th>
                <th className="px-4 py-2 text-right w-16">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {projects.find(p => p.id === u.projectId)?.name || '不明'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button 
                      onClick={() => handleAction(deleteUnitAction, { id: u.id })}
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
      </div>

      {error && (
        <div className="lg:col-span-2 p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          エラー: {error}
        </div>
      )}
    </div>
  );
}
