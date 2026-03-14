import { ImportForm } from "@/modules/design-registry/components/ImportForm";

export default function ImportPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">設計データ登録</h1>
                <p className="text-muted-foreground">
                    STLファイルを読み込み、部品情報をマスタへ登録します。
                </p>
            </div>
            <div className="grid gap-6">
                <ImportForm />
            </div>
        </div>
    );
}
