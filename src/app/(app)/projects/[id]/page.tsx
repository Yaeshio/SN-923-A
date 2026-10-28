import { db } from "@/shared/db";
import { projects } from "@/shared/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  LayoutDashboard, 
  FileUp, 
  FilePlus, 
  Settings2, 
  ChevronLeft,
  Boxes
} from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProjectDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!project) {
    notFound();
  }

  const features = [
    {
      title: "工程管理ボード",
      description: "全部品の製造ステータスを可視化。ドラッグ＆ドロップで進捗を更新します。",
      href: `/board?projectId=${id}`,
      icon: LayoutDashboard,
      color: "bg-blue-500",
    },
    {
      title: "設計データ登録",
      description: "STLファイルをインポートし、プロジェクトに部品データを紐付けます。",
      href: `/import?projectId=${id}`,
      icon: FileUp,
      color: "bg-emerald-500",
    },
    {
      title: "製造指示",
      description: "部品から具体的な製造個体（PartItem）を生成し、製造を開始します。",
      href: `/order?projectId=${id}`,
      icon: FilePlus,
      color: "bg-amber-500",
    },
    {
        title: "ユニット管理",
        description: "プロジェクト内の各ユニット（サブセクション）を管理します。",
        href: `/projects/${id}/units`,
        icon: Boxes,
        color: "bg-purple-500",
      },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link 
          href="/projects" 
          className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          title="プロジェクト一覧に戻る"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {project.name} <span className="text-muted-foreground font-normal text-xl ml-2">詳細・管理</span>
          </h1>
          <p className="text-muted-foreground">
            このプロジェクトの進行管理とマスタ設定を行います。
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group flex flex-col p-6 bg-card rounded-2xl border border-border hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className={`p-3 rounded-xl ${feature.color} text-white w-fit mb-4 shadow-sm`}>
              <feature.icon className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
              {feature.title}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 flex-grow">
              {feature.description}
            </p>
            <div className="text-sm font-semibold flex items-center gap-1 group-hover:underline">
                今すぐアクセス
                <ChevronLeft className="h-4 w-4 rotate-180" />
            </div>
          </Link>
        ))}

        <div className="p-6 bg-muted/40 rounded-2xl border border-dotted border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gray-500 text-white">
                    <Settings2 className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold">プロジェクト設定</h3>
                    <p className="text-sm text-muted-foreground whitespace-nowrap">名称変更やアーカイブ等</p>
                </div>
            </div>
            <button className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50" disabled>
                設定（開発中）
            </button>
        </div>
      </div>
    </div>
  );
}
