'use client';

import { importPartsAction } from '../actions/importAction';
import { useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export function ImportForm() {
    const [status, setStatus] = useState<string>('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string>('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        setIsPending(true);
        setStatus('Importing...');
        setError('');
        
        try {
            const result = await importPartsAction(formData);
            if (result.success) {
                setStatus('Import successful!');
            } else {
                setError(result.error);
                setStatus('');
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
            setStatus('');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="max-w-md mx-auto p-8 bg-card text-card-foreground rounded-xl border shadow-lg">
            <h2 className="text-2xl font-bold mb-6 tracking-tight">STLファイルをインポート</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">プロジェクトID</label>
                    <input 
                        name="projectId" 
                        type="text" 
                        required 
                        disabled={isPending}
                        placeholder="Project IDを入力"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">ユニットID</label>
                    <input 
                        name="unitId" 
                        type="text" 
                        required 
                        disabled={isPending}
                        placeholder="Unit IDを入力"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">STLファイル</label>
                    <input 
                        name="files" 
                        type="file" 
                        multiple 
                        required 
                        disabled={isPending}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={isPending}
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
                <div className="mt-6 p-4 rounded-md bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200 flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    {status}
                </div>
            )}
            {error && (
                <div className="mt-6 p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
        </div>
    );
}
