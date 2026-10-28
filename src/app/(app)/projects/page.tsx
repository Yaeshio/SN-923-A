import { db } from "@/shared/db";
import { createProject } from "./actions";
import Link from "next/link";
import { PlusCircle, Folder } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const allProjects = await db.query.projects.findMany();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">プロジェクト管理</h1>
          <p className="text-muted-foreground mt-2">
            製造工程を管理するプロジェクトを選択、または新しく作成します。
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {allProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group block p-6 bg-card rounded-xl border border-border hover:border-primary transition-all hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Folder className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">{project.name}</h2>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              プロジェクトの詳細とユニット管理へ
            </p>
          </Link>
        ))}

        <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center">
            <h3 className="font-semibold mb-4">新規プロジェクト作成</h3>
            <form action={createProject} className="flex gap-2 w-full max-w-xs">
                <input 
                    name="name" 
                    placeholder="プロジェクト名" 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                />
                <button 
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    作成
                </button>
            </form>
        </div>
      </div>
    </div>
  );
}
