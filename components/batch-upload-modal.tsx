'use client';

import { useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Camera, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { fileToBase64 } from '@/lib/image';

const CONDITIONS = ['Mint', 'Near Mint', 'Good', 'Fair', 'Poor'];

interface BatchItem {
  file: File;
  objectUrl: string;
  data?: string;
  name: string;
  description: string;
  price: string;
  condition: string;
  categoryId: string;
  customValues: Record<string, string>;
  saved: boolean;
}

export function BatchUploadModal({ categories, onClose, onDone }: { categories: any[]; onClose: () => void; onDone: () => void }) {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [started, setStarted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelectFiles = async (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 30);
    const arr: BatchItem[] = [];
    for (const file of selected) {
      const objectUrl = URL.createObjectURL(file);
      let data: string | undefined;
      try {
        data = await fileToBase64(file);
      } catch { /* keep data undefined */ }
      arr.push({
        file,
        objectUrl,
        data,
        name: '',
        description: '',
        price: '',
        condition: '',
        categoryId: '',
        customValues: {},
        saved: false,
      });
    }
    setItems(arr);
    setCurrentIdx(0);
    setStarted(true);
  };

  const current = items?.[currentIdx];
  const selectedCat = (categories ?? []).find((c: any) => c?.id === current?.categoryId);
  const customFields = selectedCat?.customFields ?? [];

  const updateField = (field: string, value: any) => {
    setItems(prev => {
      const updated = [...(prev ?? [])];
      if (updated[currentIdx]) {
        (updated[currentIdx] as any)[field] = value;
      }
      return updated;
    });
  };

  const handleSaveCurrent = async () => {
    if (!current?.name?.trim()) { toast.error('Name is required'); return; }
    if (!current?.categoryId) { toast.error('Category is required'); return; }
    setSaving(true);
    try {
      // Create item
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: current.name.trim(),
          description: current.description || null,
          price: current.price || null,
          condition: current.condition || null,
          categoryId: current.categoryId,
          customValues: current.customValues ?? {},
          photos: [{ data: current.data ?? null, contentType: current.file.type || 'image/jpeg' }],
        }),
      });

      if (!res.ok) throw new Error('Failed');
      setItems(prev => {
        const updated = [...(prev ?? [])];
        if (updated[currentIdx]) updated[currentIdx].saved = true;
        return updated;
      });
      toast.success(`Item ${currentIdx + 1} saved`);

      // Auto-advance
      if (currentIdx < (items?.length ?? 1) - 1) {
        setCurrentIdx(prev => prev + 1);
      }
    } catch {
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const savedCount = (items ?? []).filter((i: BatchItem) => i?.saved).length;

  const handleFinish = () => {
    // Revoke all object URLs
    (items ?? []).forEach((i: BatchItem) => { if (i?.objectUrl) URL.revokeObjectURL(i.objectUrl); });
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-display font-semibold">Batch Add Items</h2>
          <button onClick={() => { if (savedCount > 0) handleFinish(); else onClose(); }} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {!started ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground">Select Photos</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Choose up to 30 photos to add as collection items</p>
            <button onClick={() => fileRef.current?.click()}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition inline-flex items-center gap-2">
              <Camera className="w-4 h-4" /> Choose Photos
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e => handleSelectFiles(e.target.files)} className="hidden" />
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="px-4 pt-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Item {currentIdx + 1} of {items?.length ?? 0}</span>
                <span className="text-teal-600 font-medium">{savedCount} saved</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 transition-all rounded-full" style={{ width: `${((savedCount) / (items?.length || 1)) * 100}%` }} />
              </div>
            </div>

            {current && (
              <div className="p-4">
                <div className="flex gap-4 flex-col sm:flex-row">
                  {/* Photo preview */}
                  <div className="w-full sm:w-48 flex-shrink-0">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted relative">
                      <img src={current.objectUrl} alt="" className="w-full h-full object-cover" />
                      {current.saved && (
                        <div className="absolute inset-0 bg-green-500/30 flex items-center justify-center">
                          <span className="bg-green-500 text-white text-sm px-3 py-1 rounded-full font-medium">Saved ✓</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-0.5">Name *</label>
                      <input value={current.name} onChange={e => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Item name" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-0.5">Category *</label>
                      <select value={current.categoryId} onChange={e => { updateField('categoryId', e.target.value); updateField('customValues', {}); }}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none">
                        <option value="">Select</option>
                        {(categories ?? []).map((c: any) => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-foreground block mb-0.5">Price</label>
                        <input type="number" step="0.01" value={current.price} onChange={e => updateField('price', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-foreground block mb-0.5">Condition</label>
                        <select value={current.condition} onChange={e => updateField('condition', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none">
                          <option value="">Select</option>
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-0.5">Description</label>
                      <textarea value={current.description} onChange={e => updateField('description', e.target.value)} rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none" />
                    </div>
                    {/* Custom fields */}
                    {(customFields ?? []).map((field: any) => (
                      <div key={field?.id}>
                        <label className="text-xs font-medium text-muted-foreground block mb-0.5">{field?.name ?? ''}</label>
                        <input value={current?.customValues?.[field?.name ?? ''] ?? ''}
                          onChange={e => updateField('customValues', { ...(current?.customValues ?? {}), [field?.name ?? '']: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                          placeholder={field?.name ?? ''} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="p-4 border-t border-border flex items-center justify-between sticky bottom-0 bg-card">
              <button onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))} disabled={currentIdx === 0}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm disabled:opacity-30 hover:bg-secondary/80 transition">
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <div className="flex items-center gap-2">
                {!current?.saved && (
                  <button onClick={handleSaveCurrent} disabled={saving}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Item
                  </button>
                )}
                {savedCount === (items?.length ?? 0) && savedCount > 0 && (
                  <button onClick={handleFinish}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                    Done ({savedCount} items)
                  </button>
                )}
              </div>
              <button onClick={() => setCurrentIdx(prev => Math.min((items?.length ?? 1) - 1, prev + 1))} disabled={currentIdx >= (items?.length ?? 1) - 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm disabled:opacity-30 hover:bg-secondary/80 transition">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
