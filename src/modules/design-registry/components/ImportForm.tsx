'use client';

import { importPartsAction } from '../actions/importAction';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Check, AlertCircle } from 'lucide-react';

// next.config.ts の serverActions.bodySizeLimit と合わせる
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

interface ImportFormProps {
    assembly: {
        id: string;
        name: string;
    };
}

export function ImportForm({ assembly }: ImportFormProps) {
    const [status, setStatus] = useState<string>('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string>('');
    const [totalBytes, setTotalBytes] = useState(0);

    const isOverLimit = totalBytes > MAX_TOTAL_BYTES;

    function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []);
        setTotalBytes(files.reduce((sum, file) => sum + file.size, 0));
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsPending(true);
        setStatus('');
        setError('');

        try {
            const result = await importPartsAction(formData);
            if (result.success) {
                setStatus(`${result.data.length}件のパーツを登録しました。各パーツの初期インスタンス（改訂1）を自動作成しています。`);
                form.reset();
                setTotalBytes(0);
            } else {
                setError(result.error);
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="max-w-md mx-auto p-8 bg-card text-card-foreground rounded-xl border shadow-lg">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">STLファイルをインポート</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <input type="hidden" name="assemblyId" value={assembly.id} />

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">アセンブリ</label>
                    <div className="flex h-10 w-full rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground ring-offset-background cursor-not-allowed">
                        {assembly.name}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="files">STLファイル</label>
                    <input
                        id="files"
                        name="files"
                        type="file"
                        accept=".stl"
                        multiple
                        required
                        disabled={isPending}
                        onChange={handleFilesChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className={`text-xs ${isOverLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {isOverLimit
                            ? `合計サイズが上限（10MB）を超えています（${(totalBytes / 1024 / 1024).toFixed(1)}MB）。分けてインポートしてください。`
                            : 'ファイル名（拡張子を除く）がモデル名になります。合計10MBまで。'}
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="partsQuantity">必要数（アセンブリ1つあたり）</label>
                    <input
                        id="partsQuantity"
                        name="partsQuantity"
                        type="number"
                        min={1}
                        step={1}
                        defaultValue={1}
                        required
                        disabled={isPending}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">選択したすべてのファイルに同じ値が設定されます。</p>
                </div>

                <button
                    type="submit"
                    disabled={isPending || isOverLimit}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            処理中...
                        </>
                    ) : (
                        "インポート開始"
                    )}
                </button>
            </form>
            {status && (
                <div className="mt-6 p-4 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0" />
                        {status}
                    </div>
                    <Link href={`/assemblies/${assembly.id}`} className="underline text-emerald-800">
                        アセンブリ詳細で確認する
                    </Link>
                </div>
            )}
            {error && (
                <div className="mt-6 p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}
        </div>
    );
}
