'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadStlAction } from '../actions/downloadAction';

interface DownloadButtonProps {
    kind: 'partInstance' | 'part';
    id: string;
    label?: string;
}

export function DownloadButton({ kind, id, label = 'ダウンロード' }: DownloadButtonProps) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    async function handleClick() {
        setIsPending(true);
        setError('');
        try {
            const result = await downloadStlAction({ kind, id });
            if (result.success) {
                // 署名付きURLは Content-Disposition: attachment のため、ページ遷移せずダウンロードされる
                window.location.href = result.data;
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
        <div className="inline-flex flex-col items-start gap-1">
            <button
                type="button"
                onClick={handleClick}
                disabled={isPending}
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {label}
            </button>
            {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
    );
}
