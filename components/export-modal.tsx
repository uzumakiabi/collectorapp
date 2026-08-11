'use client';

import { useState } from 'react';
import { X, FileText, Sheet, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';

export function ExportModal({ categoryId, folderId, onClose }: { categoryId: string | null; folderId: string | null; onClose: () => void }) {
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf');
  const [includePhotos, setIncludePhotos] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const url = format === 'pdf' ? '/api/export/pdf' : '/api/export/excel';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId, folderId, includePhotos }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = format === 'pdf' ? 'collection-export.pdf' : 'collection-export.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      toast.success('Export downloaded');
      onClose();
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-display font-semibold">Export Collection</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFormat('pdf')}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm font-medium transition ${
                  format === 'pdf' ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-border hover:border-muted-foreground'
                }`}>
                <FileText className="w-5 h-5" /> PDF
              </button>
              <button onClick={() => setFormat('excel')}
                className={`flex items-center gap-2 px-3 py-3 rounded-lg border-2 text-sm font-medium transition ${
                  format === 'excel' ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400' : 'border-border hover:border-muted-foreground'
                }`}>
                <Sheet className="w-5 h-5" /> Excel
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Include photos</label>
            <button onClick={() => setIncludePhotos(!includePhotos)}
              className={`relative w-10 h-5 rounded-full transition ${includePhotos ? 'bg-teal-600' : 'bg-muted'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${includePhotos ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          {(categoryId || folderId) && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
              Exporting items from current view only
            </p>
          )}
          {!categoryId && !folderId && (
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
              Exporting all items in your collection
            </p>
          )}
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition">Cancel</button>
          <button onClick={handleExport} disabled={exporting}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? 'Exporting...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
