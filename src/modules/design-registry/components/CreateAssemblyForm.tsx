'use client';

import { useState } from 'react';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { createAssemblyAction } from '../actions/assemblyActions';

export function CreateAssemblyForm() {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;

        setIsPending(true);
        setError('');
        try {
            const result = await createAssemblyAction(new FormData(form));
            if (result.success) {
                form.reset();
            } else {
                setError(result.fieldErrors?.name?.[0] ?? result.error);
            }
        } catch (e: any) {
            setError(e.message || 'An unexpected error occurred');
        } finally {
            setIsPending(false);
        }
    }

    return (
        <div className="w-full max-w-xs space-y-2">
            <form onSubmit={handleSubmit} className="flex gap-2 w-full">
                <input
                    name="name"
                    placeholder="アセンブリ名"
                    required
                    disabled={isPending}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                    作成
                </button>
            </form>
            {error && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {error}
                </p>
            )}
        </div>
    );
}
