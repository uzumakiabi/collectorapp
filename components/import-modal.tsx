'use client';

import { useId, useRef, useState } from 'react';
import { X, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useModalA11y } from '@/hooks/use-modal-a11y';

interface ImportResult {
  created: number;
  skipped: { row: number; reason: string }[];
}

export function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  useModalA11y(panelRef, onClose);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setResult(null);
    try {
      const csv = await file.text();
      const res = await fetch('/api/import/csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Import failed');
        return;
      }
      setResult({ created: data?.created ?? 0, skipped: data?.skipped ?? [] });
      toast.success(`Imported ${data?.created ?? 0} items`);
      onDone();
    } catch {
      toast.error('Import failed. Please try again.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4">
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} className="bg-card w-full sm:max-w-sm sm:rounded-xl rounded-t-2xl shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 id={`${uid}-title`} className="text-lg font-display font-semibold">Import Collection</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
            CSV columns: Name and Category (required), Description, Condition, Current Value, Purchase Price, Purchase Date. Any other column is stored as a category field.
          </p>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="CSV file"
            onChange={e => handleFile(e.target.files?.[0])}
            disabled={importing}
            className="hidden"
          />
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="w-full py-3 rounded-lg border-2 border-dashed border-border hover:border-teal-500 text-sm font-medium text-muted-foreground hover:text-teal-600 transition inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {importing ? 'Importing...' : 'Choose CSV file'}
          </button>

          {result && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{result.created} items imported</p>
              {result.skipped.length > 0 && (
                <div className="bg-muted rounded-lg p-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{result.skipped.length} rows skipped</p>
                  {result.skipped.slice(0, 10).map((s, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {s.row}: {s.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition">Close</button>
        </div>
      </div>
    </div>
  );
}
