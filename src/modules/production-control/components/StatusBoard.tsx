'use client';

import { updateStatusAction } from '../actions/statusAction';
import { ItemStatus, PartItem } from '../types';
import { useState } from 'react';

// Client-side PartItem might have updatedAt as string
type ClientPartItem = Omit<PartItem, 'updatedAt'> & { updatedAt: any };

import { Box, Cpu, History, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function StatusBoard({ initialItems }: { initialItems: any[] }) {
    const [items, setItems] = useState<ClientPartItem[]>(initialItems);
    const [loading, setLoading] = useState<string | null>(null);

    async function handleStatusUpdate(itemId: string, newStatus: ItemStatus) {
        setLoading(itemId);
        try {
            const result = await updateStatusAction({ itemId, newStatus });
            if (result.success) {
                setItems(prev => prev.map(item => item.id === itemId ? (result.data as any) : item));
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setLoading(null);
        }
    }

    const statusList = Object.values(ItemStatus);

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.length === 0 && (
                    <div className="col-span-full p-20 text-center border-2 border-dashed rounded-2xl bg-muted/30">
                        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">個体データがありません</h3>
                        <p className="text-muted-foreground">製造指示画面から新しい個体を作成してください。</p>
                    </div>
                )}
                {items.map((item) => (
                    <div key={item.id} className="group relative overflow-hidden bg-card text-card-foreground rounded-2xl border shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                        <div className="p-5 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                                        <History className="h-3 w-3" />
                                        <span>{item.id.slice(0, 8)}</span>
                                    </div>
                                    <h3 className="font-bold text-xl tracking-tight">Part {item.partId.slice(0, 8)}</h3>
                                </div>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                    item.status === ItemStatus.COMPLETED ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    item.status === ItemStatus.SHIPPED ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    item.status === ItemStatus.DISCARD ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-secondary text-secondary-foreground border-transparent'
                                }`}>
                                    {item.status}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Cpu className="h-3 w-3" />
                                        <span className="text-[10px] font-bold uppercase">Machine</span>
                                    </div>
                                    <span className="text-sm font-medium block truncate">{item.machineId.slice(0, 8)}</span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1 text-muted-foreground">
                                        <Box className="h-3 w-3" />
                                        <span className="text-[10px] font-bold uppercase">Box</span>
                                    </div>
                                    <span className="text-sm font-medium block truncate">{item.boxId ? item.boxId.slice(0, 8) : '--'}</span>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    ステータス変更
                                </label>
                                <div className="relative">
                                    <select 
                                        value={item.status}
                                        disabled={loading === item.id}
                                        onChange={(e) => handleStatusUpdate(item.id, e.target.value as ItemStatus)}
                                        className="w-full h-9 rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 hover:bg-background disabled:opacity-50 appearance-none cursor-pointer"
                                    >
                                        {statusList.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {loading === item.id && (
                                        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="px-5 py-3 bg-muted/20 border-t flex justify-between items-center text-[10px] text-muted-foreground">
                            <span>最終更新: {new Date(item.updatedAt).toLocaleString('ja-JP')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
