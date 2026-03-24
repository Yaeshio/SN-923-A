import { ImportForm } from "@/modules/design-registry/components/ImportForm";
import { getProjectWithUnits } from "@/modules/design-registry/actions/projectActions";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
    const { projectId } = await searchParams;

    if (!projectId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <h1 className="text-2xl font-bold">プロジェクトが選択されていません</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    インポートを行うには、まずプロジェクト一覧から対象のプロジェクトを選択してください。
                </p>
                <Link 
                    href="/master?tab=projects"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    プロジェクト管理へ戻る
                </Link>
            </div>
        );
    }

    const { success, project, units, error } = await getProjectWithUnits(projectId);

    if (!success || !project || !units) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <h1 className="text-2xl font-bold text-destructive">プロジェクトの取得に失敗しました</h1>
                <p className="text-muted-foreground">{error || "対象のプロジェクトが見つかりませんでした。"}</p>
                <Link href="/master?tab=projects" className="text-sm text-primary hover:underline">プロジェクト管理へ戻る</Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">設計データ登録</h1>
                <p className="text-muted-foreground">
                    STLファイルを読み込み、部品情報をマスタへ登録します。
                </p>
            </div>
            <div className="grid gap-6">
                <ImportForm 
                    project={{ id: project.id, name: project.name }}
                    units={units.map(u => ({ id: u.id, name: u.name }))}
                />
            </div>
        </div>
    );
}
