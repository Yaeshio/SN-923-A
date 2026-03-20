import { ImportForm } from "@/modules/design-registry/components/ImportForm";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
    const { projectId } = await searchParams;
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">設計データ登録</h1>
                <p className="text-muted-foreground">
                    STLファイルを読み込み、部品情報をマスタへ登録します。
                </p>
            </div>
            <div className="grid gap-6">
                <ImportForm defaultProjectId={projectId} />
            </div>
        </div>
    );
}
