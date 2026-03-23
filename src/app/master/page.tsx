import { db } from "@/shared/db";
import { MasterTabs } from "@/modules/master/components/MasterTabs";
import { Settings } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function MasterPage() {
  const [projects, units, parts, machines, boxes] = await Promise.all([
    db.query.projects.findMany(),
    db.query.units.findMany(),
    db.query.parts.findMany(),
    db.query.machines.findMany(),
    db.query.boxes.findMany(),
  ]);

  const initialData = {
    projects,
    units,
    parts,
    machines,
    boxes,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">マスタ管理</h1>
            <p className="text-muted-foreground mt-1">
              プロジェクト、部品、製造機、保管BOXの基本情報を管理します。
            </p>
          </div>
        </div>
      </div>

      <MasterTabs initialData={initialData} />
    </div>
  );
}
