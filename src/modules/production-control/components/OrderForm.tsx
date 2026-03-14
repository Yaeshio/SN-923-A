'use client';

import { createOrderAction } from '../actions/orderAction';
import { useState } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

export function OrderForm() {
    const [status, setStatus] = useState<string>('');
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string>('');

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const input = {
            partId: formData.get('partId') as string,
            machineId: formData.get('machineId') as string,
            quantity: Number(formData.get('quantity')),
        };
        
        setIsPending(true);
        setStatus('Creating Order...');
        setError('');
        
        try {
            const result = await createOrderAction(input);
            if (result.success) {
                setStatus(`Successfully created ${result.data.length} items!`);
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
            <h2 className="text-2xl font-bold mb-6 tracking-tight">製造オーダー発行</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">部品ID (Part ID)</label>
                    <input 
                        name="partId" 
                        type="text" 
                        required 
                        disabled={isPending}
                        placeholder="Part IDを入力"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">製造機ID (Machine ID)</label>
                    <input 
                        name="machineId" 
                        type="text" 
                        required 
                        disabled={isPending}
                        placeholder="Machine IDを入力"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">個数 (Quantity)</label>
                    <input 
                        name="quantity" 
                        type="number" 
                        min="1"
                        required 
                        disabled={isPending}
                        defaultValue="1"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
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
                            発行中...
                        </>
                    ) : (
                        "オーダー発行"
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
