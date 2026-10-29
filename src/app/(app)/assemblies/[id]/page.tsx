import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileUp } from "lucide-react";
import { requireUserOrRedirect } from "@/shared/auth/requireUser";
import { AssemblyService } from "@/modules/design-registry/services/AssemblyService";
import { DownloadButton } from "@/modules/design-registry/components/DownloadButton";

export const dynamic = 'force-dynamic';

export default async function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserOrRedirect();
  // 他人のアセンブリは RLS により見えないため、存在しない場合と同じ 404 になる
  const assembly = await AssemblyService.getWithParts(user.id, id);

  if (!assembly) {
    notFound();
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/assemblies"
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
            title="アセンブリ一覧に戻る"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{assembly.name}</h1>
            <p className="text-muted-foreground">パーツ {assembly.parts.length} 件</p>
          </div>
        </div>
        <Link
          href={`/assemblies/${assembly.id}/import`}
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <FileUp className="h-4 w-4" />
          インポート
        </Link>
      </div>

      {assembly.parts.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl">
          パーツがまだ登録されていません。「インポート」からSTLファイルを登録してください。
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">モデル名</th>
                <th className="text-right font-medium px-4 py-3">必要数</th>
                <th className="text-left font-medium px-4 py-3">最新改訂</th>
                <th className="text-right font-medium px-4 py-3">改訂数</th>
                <th className="text-left font-medium px-4 py-3">登録日時</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {assembly.parts.map((part) => {
                // instances は改訂の新しい順
                const latest = part.instances[0];
                return (
                  <tr key={part.id}>
                    <td className="px-4 py-3 font-medium">{part.modelName}</td>
                    <td className="px-4 py-3 text-right">{part.partsQuantity}</td>
                    <td className="px-4 py-3">{latest ? `${latest.instanceName} rev.${latest.revision}` : "-"}</td>
                    <td className="px-4 py-3 text-right">{part.instances.length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{part.createdAt.toLocaleString("ja-JP")}</td>
                    <td className="px-4 py-3 text-right">
                      {latest && <DownloadButton kind="part" id={part.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
