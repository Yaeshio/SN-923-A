import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireUserOrRedirect } from "@/shared/auth/requireUser";
import { AssemblyService } from "@/modules/design-registry/services/AssemblyService";
import { ImportForm } from "@/modules/design-registry/components/ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const user = await requireUserOrRedirect();
    const assembly = await AssemblyService.getWithParts(user.id, id);

    if (!assembly) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/assemblies/${assembly.id}`}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                    title="アセンブリ詳細に戻る"
                >
                    <ChevronLeft className="h-6 w-6" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">設計データ登録</h1>
                    <p className="text-muted-foreground">
                        STLファイルを読み込み、パーツとして「{assembly.name}」へ登録します。
                    </p>
                </div>
            </div>
            <div className="grid gap-6">
                <ImportForm assembly={{ id: assembly.id, name: assembly.name }} />
            </div>
        </div>
    );
}
