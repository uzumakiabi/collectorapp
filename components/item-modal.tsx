'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Camera, Trash2, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ItemModalProps {
  item: any;
  categories: any[];
  folders: any[];
  onClose: () => void;
  onSaved: () => void;
  defaultCategoryId: string | null;
}

const CONDITIONS = ['Mint', 'Near Mint', 'Good', 'Fair', 'Poor'];

interface TempPhoto {
  file?: File;
  objectUrl?: string;
  cloud_storage_path?: string;
  contentType?: string;
  isPublic?: boolean;
  existingUrl?: string;
}

export function ItemModal({ item, categories, folders, onClose, onSaved, defaultCategoryId }: ItemModalProps) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [price, setPrice] = useState(item?.price != null ? String(item.price) : '');
  const [condition, setCondition] = useState(item?.condition ?? '');
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? defaultCategoryId ?? '');
  const [customValues, setCustomValues] = useState<Record<string, string>>(item?.customValues ?? {});
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(
    (item?.folderItems ?? []).filter((fi: any) => fi?.folder?.folderType === 'CUSTOM').map((fi: any) => fi?.folder?.id).filter(Boolean) ?? []
  );
  const [photos, setPhotos] = useState<TempPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load existing photos
  useEffect(() => {
    if (item?.photos?.length) {
      const loadPhotos = async () => {
        const loaded: TempPhoto[] = [];
        for (const p of (item.photos ?? [])) {
          try {
            const res = await fetch('/api/photos/url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cloud_storage_path: p.cloudStoragePath, contentType: p.contentType, isPublic: p.isPublic }),
            });
            const d = await res.json();
            loaded.push({ cloud_storage_path: p.cloudStoragePath, contentType: p.contentType, isPublic: p.isPublic, existingUrl: d?.url });
          } catch {
            loaded.push({ cloud_storage_path: p.cloudStoragePath, contentType: p.contentType, isPublic: p.isPublic });
          }
        }
        setPhotos(loaded);
      };
      loadPhotos();
    }
  }, [item]);

  // Get custom fields for selected category
  const selectedCategory = (categories ?? []).find((c: any) => c?.id === categoryId);
  const customFields = selectedCategory?.customFields ?? [];

  const handleAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const remaining = 3 - (photos?.length ?? 0);
    const newPhotos = Array.from(files).slice(0, remaining).map((file: File) => ({
      file,
      objectUrl: URL.createObjectURL(file),
      contentType: file.type || 'image/jpeg',
    }));
    setPhotos(prev => [...(prev ?? []), ...newPhotos]);
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      const updated = [...(prev ?? [])];
      const removed = updated.splice(idx, 1)[0];
      if (removed?.objectUrl) URL.revokeObjectURL(removed.objectUrl);
      return updated;
    });
  };

  const handleSave = async () => {
    if (!name?.trim()) { toast.error('Name is required'); return; }
    if (!categoryId) { toast.error('Category is required'); return; }
    setSaving(true);
    try {
      // Upload new photos to S3
      const uploadedPhotos: any[] = [];
      for (const photo of (photos ?? [])) {
        if (photo.cloud_storage_path) {
          // Already uploaded
          uploadedPhotos.push({ cloud_storage_path: photo.cloud_storage_path, contentType: photo.contentType, isPublic: photo.isPublic ?? false });
        } else if (photo.file) {
          // Upload new photo
          const presignRes = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: photo.file.name, contentType: photo.file.type || 'image/jpeg', isPublic: false }),
          });
          const { uploadUrl, cloud_storage_path } = await presignRes.json();
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': photo.file.type || 'image/jpeg' },
            body: photo.file,
          });
          uploadedPhotos.push({ cloud_storage_path, contentType: photo.file.type || 'image/jpeg', isPublic: false });
        }
      }

      const body = {
        name: name.trim(),
        description: description || null,
        price: price || null,
        condition: condition || null,
        categoryId,
        customValues,
        photos: uploadedPhotos,
        folderIds: selectedFolderIds,
      };

      const url = isEdit ? `/api/items/${item.id}` : '/api/items';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Failed to save');
        return;
      }
      toast.success(isEdit ? 'Item updated' : 'Item added');
      onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-display font-semibold">{isEdit ? 'Edit Item' : 'Add New Item'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photos */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Photos (max 3)</label>
            <div className="flex gap-2 flex-wrap">
              {(photos ?? []).map((p: TempPhoto, idx: number) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted group">
                  <img src={p.objectUrl ?? p.existingUrl ?? ''} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(photos?.length ?? 0) < 3 && (
                <button onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-teal-500 flex flex-col items-center justify-center text-muted-foreground hover:text-teal-600 transition">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] mt-0.5">Add</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={e => handleAddPhotos(e.target.files)} className="hidden" />
          </div>

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="Item name" />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Category *</label>
            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setCustomValues({}); }}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none">
              <option value="">Select category</option>
              {(categories ?? []).map((c: any) => <option key={c?.id} value={c?.id}>{c?.name ?? ''}</option>)}
            </select>
          </div>

          {/* Price & Condition row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Price</label>
              <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none" placeholder="0.00" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none">
                <option value="">Select</option>
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none" placeholder="Optional description" />
          </div>

          {/* Custom Fields */}
          {(customFields?.length ?? 0) > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">Category Fields</label>
              {(customFields ?? []).map((field: any) => (
                <div key={field?.id}>
                  <label className="text-xs text-muted-foreground block mb-0.5">{field?.name ?? ''}</label>
                  <input value={customValues?.[field?.name ?? ''] ?? ''}
                    onChange={e => setCustomValues(prev => ({ ...(prev ?? {}), [field?.name ?? '']: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    placeholder={field?.name ?? ''} />
                </div>
              ))}
            </div>
          )}

          {/* Folders */}
          {(folders?.length ?? 0) > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Custom Folders</label>
              <div className="flex flex-wrap gap-2">
                {(folders ?? []).map((f: any) => (
                  <button key={f?.id} onClick={() => {
                    setSelectedFolderIds(prev => {
                      const arr = prev ?? [];
                      return arr.includes(f?.id) ? arr.filter((id: string) => id !== f?.id) : [...arr, f?.id];
                    });
                  }}
                    className={`text-xs px-2.5 py-1 rounded-full transition ${
                      (selectedFolderIds ?? []).includes(f?.id)
                        ? 'bg-teal-600 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    {f?.name ?? ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium hover:bg-secondary/80 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
