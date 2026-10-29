import Link from "next/link";
import { Folder } from "lucide-react";
import { requireUserOrRedirect } from "@/shared/auth/requireUser";
import { AssemblyService } from "@/modules/design-registry/services/AssemblyService";
import { CreateAssemblyForm } from "@/modules/design-registry/components/CreateAssemblyForm";

export const dynamic = 'force-dynamic';

export default async function AssembliesPage() {
  const user = await requireUserOrRedirect();
  const assemblies = await AssemblyService.list(user.id);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">アセンブリ</h1>
          <p className="text-muted-foreground mt-2">
            CADから書き出したモデル（パーツ）をまとめるアセンブリを選択、または新しく作成します。
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {assemblies.map((assembly) => (
          <Link
            key={assembly.id}
            href={`/assemblies/${assembly.id}`}
            className="group block p-6 bg-card rounded-xl border border-border hover:border-primary transition-all hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Folder className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold">{assembly.name}</h2>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              パーツ {assembly.parts.length} 件
            </p>
          </Link>
        ))}

        <div className="p-6 bg-muted/30 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center">
          <h3 className="font-semibold mb-4">新規アセンブリ作成</h3>
          <CreateAssemblyForm />
        </div>
      </div>
    </div>
  );
}
