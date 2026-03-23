'use client';

import { updateStatusAction } from '../actions/statusAction';
import { downloadStlAction } from '@/modules/design-registry/actions/downloadAction';
import { ItemStatus } from '../types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Box, Cpu, History, Loader2, AlertCircle, CheckCircle2, 
  LayoutDashboard, Table as TableIcon, Filter, Search, 
  ChevronDown, ArrowUpDown, Trash2, Send, Check, X,
  ExternalLink, MoreHorizontal, CheckSquare, Square,
  Download
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '@/shared/lib/supabase';

const STATUS_COLUMNS = [
  { id: ItemStatus.READY, label: '準備完了', color: 'bg-slate-500' },
  { id: ItemStatus.PRINTING, label: '造形中', color: 'bg-blue-500' },
  { id: ItemStatus.CUTTING, label: '切断中', color: 'bg-indigo-500' },
  { id: ItemStatus.SANDING, label: '研磨中', color: 'bg-purple-500' },
  { id: ItemStatus.INSPECTION, label: '検査中', color: 'bg-amber-500' },
  { id: ItemStatus.COMPLETED, label: '完了', color: 'bg-emerald-500' },
  { id: ItemStatus.SHIPPED, label: '出荷済', color: 'bg-sky-500' },
  { id: ItemStatus.DISCARD, label: '破棄', color: 'bg-rose-500' }
];

import { useRouter } from 'next/navigation';

export function StatusBoard({ initialItems }: { initialItems: any[] }) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>(initialItems);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Sync state when initialItems change (prop synchronization)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  // Modal State
  const [showReasonModal, setShowReasonModal] = useState<{
    itemId: string;
    newStatus: ItemStatus;
    show: boolean;
  } | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [comment, setComment] = useState('');

  // Realtime Sync
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'part_items' },
        (payload) => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.part?.partNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.machine?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.includes(searchQuery)
    );
  }, [items, searchQuery]);

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as ItemStatus;
    
    // Check if it's a critical change
    if (newStatus === ItemStatus.DISCARD || newStatus === ItemStatus.SHIPPED) {
      setShowReasonModal({ itemId: draggableId, newStatus, show: true });
      return;
    }

    await performStatusUpdate(draggableId, newStatus);
  };

  const performStatusUpdate = async (itemId: string, newStatus: ItemStatus, code?: string, note?: string) => {
    setLoading(itemId);
    try {
      const result = await updateStatusAction({ 
        itemId, 
        newStatus, 
        reason_code: code, 
        comment: note 
      });
      if (result.success) {
        setItems(prev => prev.map(item => item.id === itemId ? { ...item, ...result.data, status: newStatus } : item));
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(null);
      setShowReasonModal(null);
      setReasonCode('');
      setComment('');
    }
  };

  const handleDownload = async (partId: string) => {
    if (!partId) return;
    setDownloadingId(partId);
    try {
      const result = await downloadStlAction({ partId });
      if (result.success) {
        window.open(result.data, '_blank');
      } else {
        alert(result.error || 'ダウンロードURLの取得に失敗しました。');
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Controls */}
      <div className="bg-white/40 backdrop-blur-md rounded-3xl p-4 border border-white/20 shadow-xl flex flex-wrap gap-4 items-center justify-between">
        <div className="flex bg-gray-100/50 p-1 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setViewMode('kanban')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>カンバン</span>
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-md' : 'text-gray-500 hover:text-indigo-600'}`}
          >
            <TableIcon className="h-4 w-4" />
            <span>テーブル</span>
          </button>
        </div>

        <div className="flex-1 min-w-[300px] relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text"
            placeholder="部品番号、製造機、IDで検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/50 border border-indigo-100 rounded-2xl pl-11 pr-4 py-2.5 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-4">
             <span className="text-xs font-bold text-indigo-600 mr-2">{selectedIds.size}件選択中</span>
             <div className="flex bg-indigo-50 rounded-xl p-1">
                <button className="px-3 py-1.5 rounded-lg text-xs font-black uppercase text-indigo-600 hover:bg-white transition-all flex items-center gap-2">
                   <Send className="h-3 w-3" /> 一括移動
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[600px]">
            {STATUS_COLUMNS.map((col) => (
              <div key={col.id} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                    <h3 className="font-black uppercase tracking-widest text-xs text-gray-500">{col.label}</h3>
                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">
                      {filteredItems.filter(i => i.status === col.id).length}
                    </span>
                  </div>
                  <button className="p-1 text-gray-300 hover:text-gray-900 transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`
                        flex-1 rounded-3xl p-3 flex flex-col gap-3 transition-all
                        ${snapshot.isDraggingOver ? 'bg-indigo-50/50 border-2 border-dashed border-indigo-200' : 'bg-gray-50/30'}
                      `}
                    >
                      {filteredItems
                        .filter(item => item.status === col.id)
                        .map((item, index) => (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`
                                  bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm transition-all
                                  ${snapshot.isDragging ? 'shadow-2xl scale-105 z-50 border-indigo-400 ring-4 ring-indigo-500/10' : 'hover:shadow-lg hover:border-indigo-200'}
                                `}
                              >
                                {loading === item.id && (
                                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-20">
                                    <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                                  </div>
                                )}
                                
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start">
                                    <div className="space-y-0.5">
                                      <p className="text-[9px] font-black uppercase text-indigo-400 tracking-tighter">ID: ...{item.id.slice(-6)}</p>
                                      <h4 className="font-bold text-gray-900 leading-tight truncate max-w-[180px]">
                                        {item.part?.partNumber || 'N/A'}
                                      </h4>
                                    </div>
                                    <button className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-300 hover:text-indigo-600 transition-colors">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                      <div className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 mb-1">
                                        <Cpu className="h-2.5 w-2.5" /> Machine
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-700 truncate">{item.machine?.name || '--'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                                      <div className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 mb-1">
                                        <Box className="h-2.5 w-2.5" /> Location
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-700 truncate">{item.box?.name || '--'}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 pt-1 border-t border-gray-50">
                                    <div className="flex items-center gap-3">
                                      <span suppressHydrationWarning>{new Date(item.updatedAt).toLocaleTimeString('ja-JP')}</span>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDownload(item.partId);
                                        }}
                                        disabled={downloadingId === item.partId}
                                        className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-50"
                                      >
                                        {downloadingId === item.partId ? (
                                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        ) : (
                                          <Download className="h-2.5 w-2.5" />
                                        )}
                                        <span>STL DL</span>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <History className="h-2.5 w-2.5" />
                                      <span>履歴</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-600/5 border-b border-indigo-100">
                  <th className="p-5 w-14">
                    <button onClick={toggleSelectAll} className="p-1 rounded-lg text-indigo-400 hover:text-indigo-600 transition-colors">
                      {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                    </button>
                  </th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900 border-r border-indigo-50/50">ID</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900 border-r border-indigo-50/50">部品番号</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900 border-r border-indigo-50/50">現在の状態</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900 border-r border-indigo-50/50">製造機</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900 border-r border-indigo-50/50">保管場所</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-indigo-900">最終更新</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {filteredItems.map(item => (
                  <tr 
                    key={item.id} 
                    className={`
                      group transition-all hover:bg-white/80
                      ${selectedIds.has(item.id) ? 'bg-indigo-50/50' : ''}
                    `}
                  >
                    <td className="p-5">
                      <button onClick={() => toggleSelect(item.id)} className={`p-1 rounded-lg transition-colors ${selectedIds.has(item.id) ? 'text-indigo-600' : 'text-gray-300 group-hover:text-indigo-400'}`}>
                        {selectedIds.has(item.id) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="p-5 font-mono text-[10px] text-gray-400">...{item.id.slice(-8)}</td>
                    <td className="p-5 font-bold text-gray-900">{item.part?.partNumber}</td>
                    <td className="p-5">
                      <div className={`
                        inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border
                        ${STATUS_COLUMNS.find(c => c.id === item.status)?.color.replace('bg-', 'text-').replace('-500', '-600')}
                        ${STATUS_COLUMNS.find(c => c.id === item.status)?.color.replace('bg-', 'bg-').replace('-500', '-50')}
                        ${STATUS_COLUMNS.find(c => c.id === item.status)?.color.replace('bg-', 'border-').replace('-500', '-100')}
                      `}>
                        {STATUS_COLUMNS.find(c => c.id === item.status)?.label}
                      </div>
                    </td>
                    <td className="p-5 text-sm text-gray-600 font-medium">{item.machine?.name}</td>
                    <td className="p-5 text-sm text-gray-600 font-medium">{item.box?.name || '--'}</td>
                    <td className="p-5 text-sm text-gray-400" suppressHydrationWarning>{new Date(item.updatedAt).toLocaleString('ja-JP')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {showReasonModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowReasonModal(null)} />
          <div className="relative bg-white rounded-[2.5rem] p-10 shadow-2xl border border-indigo-100 w-full max-w-lg animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 overflow-hidden">
             {/* Decor */}
             <div className="absolute -top-10 -right-10 bg-indigo-600/5 h-40 w-40 rounded-full" />
             
             <div className="relative space-y-8">
                <div className="flex items-center gap-5">
                   <div className={`p-5 rounded-3xl text-white shadow-2xl ${showReasonModal.newStatus === ItemStatus.DISCARD ? 'bg-rose-500 shadow-rose-200' : 'bg-sky-500 shadow-sky-200'}`}>
                      {showReasonModal.newStatus === ItemStatus.DISCARD ? <Trash2 className="h-8 w-8" /> : <Send className="h-8 w-8" />}
                   </div>
                   <div>
                      <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                         {showReasonModal.newStatus === ItemStatus.DISCARD ? '破棄の確認' : '出荷の確認'}
                      </h3>
                      <p className="text-gray-500 font-medium mt-1">状態を変更する理由を入力してください。</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-indigo-900 ml-1">理由コード (Reason Code)</label>
                      <select 
                        value={reasonCode}
                        onChange={(e) => setReasonCode(e.target.value)}
                        className="w-full bg-slate-50 border border-indigo-100 rounded-2xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                      >
                         <option value="">コードを選択...</option>
                         <option value="QUALITY_ISSUE">品質不良 (Quality Issue)</option>
                         <option value="OPERATIONAL_ERROR">操作ミス (Operational Error)</option>
                         <option value="EQUIPMENT_FAILURE">装置故障 (Equipment Failure)</option>
                         <option value="ORDER_CANCEL">指示取消 (Order Cancel)</option>
                         <option value="OTHER">その他 (Other)</option>
                      </select>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-indigo-900 ml-1">詳細コメント (Optional)</label>
                      <textarea 
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="詳細な理由を入力してください..."
                        rows={4}
                        className="w-full bg-slate-50 border border-indigo-100 rounded-3xl px-5 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium resize-none"
                      />
                   </div>
                </div>

                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowReasonModal(null)}
                     className="flex-1 px-8 py-5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-all font-bold text-gray-400 active:scale-95"
                   >
                      キャンセル
                   </button>
                   <button 
                     onClick={() => performStatusUpdate(showReasonModal.itemId, showReasonModal.newStatus, reasonCode, comment)}
                     className={`
                        flex-1 px-8 py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95
                        ${showReasonModal.newStatus === ItemStatus.DISCARD ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-200'}
                     `}
                   >
                      確定する
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
