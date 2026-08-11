'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Tag, PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function CategoryManager({ categories, onClose }: { categories: any[]; onClose: () => void }) {
  const [newCatName, setNewCatName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [newFieldName, setNewFieldName] = useState('');
  const [addingField, setAddingField] = useState(false);
  const [localCategories, setLocalCategories] = useState(categories ?? []);

  const handleCreateCategory = async () => {
    if (!newCatName?.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Failed');
        return;
      }
      toast.success('Category created');
      setNewCatName('');
      // Refresh categories
      const catRes = await fetch('/api/categories');
      const cats = await catRes.json();
      setLocalCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast.error('Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and all its items?')) return;
    try {
      await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      setLocalCategories(prev => (prev ?? []).filter((c: any) => c?.id !== id));
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleAddField = async (catId: string) => {
    if (!newFieldName?.trim()) return;
    setAddingField(true);
    try {
      const res = await fetch(`/api/categories/${catId}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFieldName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Failed');
        return;
      }
      toast.success('Field added');
      setNewFieldName('');
      // Refresh
      const catRes = await fetch('/api/categories');
      const cats = await catRes.json();
      setLocalCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast.error('Failed to add field');
    } finally {
      setAddingField(false);
    }
  };

  const handleDeleteField = async (catId: string, fieldId: string) => {
    try {
      await fetch(`/api/categories/${catId}/fields`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldId }),
      });
      toast.success('Field removed');
      const catRes = await fetch('/api/categories');
      const cats = await catRes.json();
      setLocalCategories(Array.isArray(cats) ? cats : []);
    } catch {
      toast.error('Failed to delete field');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-display font-semibold">Manage Categories</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-2">
          {/* Add new category */}
          <div className="flex items-center gap-2 mb-4">
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateCategory()}
              placeholder="New category name"
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
            <button onClick={handleCreateCategory} disabled={creating}
              className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </button>
          </div>

          {(localCategories ?? []).map((cat: any) => (
            <div key={cat?.id} className="border border-border rounded-lg">
              <div className="flex items-center justify-between p-3">
                <button onClick={() => setExpandedCatId(expandedCatId === cat?.id ? null : cat?.id)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-teal-600 transition">
                  <Tag className="w-4 h-4" />
                  {cat?.name ?? ''}
                  <span className="text-xs text-muted-foreground">({cat?._count?.items ?? 0} items)</span>
                </button>
                {!cat?.isDefault && (
                  <button onClick={() => handleDeleteCategory(cat?.id)}
                    className="p-1 text-muted-foreground hover:text-red-500 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {expandedCatId === cat?.id && (
                <div className="px-3 pb-3 border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Custom Fields</p>
                  {(cat?.customFields ?? []).map((field: any) => (
                    <div key={field?.id} className="flex items-center justify-between py-1">
                      <span className="text-sm text-foreground">{field?.name ?? ''}</span>
                      <button onClick={() => handleDeleteField(cat.id, field.id)}
                        className="p-0.5 text-muted-foreground hover:text-red-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center gap-1 mt-2">
                    <input value={expandedCatId === cat?.id ? newFieldName : ''}
                      onChange={e => setNewFieldName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddField(cat.id)}
                      placeholder="Field name"
                      className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm outline-none focus:ring-1 focus:ring-primary" />
                    <button onClick={() => handleAddField(cat.id)} disabled={addingField}
                      className="p-1 text-teal-600 hover:text-teal-700 transition">
                      <PlusCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
