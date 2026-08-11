'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, ImageIcon, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';

const CONDITIONS: Record<string, string> = {
  'Mint': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Near Mint': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Good': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Fair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Poor': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface ItemGridProps {
  items: any[];
  loading: boolean;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
}

export function ItemGrid({ items, loading, onEdit, onDelete }: ItemGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-square bg-muted" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if ((items?.length ?? 0) === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground">No items yet</h3>
        <p className="text-muted-foreground text-sm mt-1">Add your first collection item to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {(items ?? []).map((item: any, idx: number) => (
        <ItemCard key={item?.id ?? idx} item={item} index={idx} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function ItemCard({ item, index, onEdit, onDelete }: { item: any; index: number; onEdit: (item: any) => void; onDelete: (id: string) => void }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const firstPhoto = item?.photos?.[0];
    if (firstPhoto) {
      fetch('/api/photos/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloud_storage_path: firstPhoto.cloudStoragePath,
          contentType: firstPhoto.contentType ?? 'image/jpeg',
          isPublic: firstPhoto.isPublic ?? false,
        }),
      })
        .then(r => r.json())
        .then(d => setPhotoUrl(d?.url ?? null))
        .catch(() => {});
    }
  }, [item?.photos]);

  const condClass = CONDITIONS[item?.condition ?? ''] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-border/50"
    >
      {/* Photo */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {photoUrl ? (
          <img src={photoUrl} alt={item?.name ?? 'Item'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
          <button onClick={() => onEdit(item)} className="p-2 bg-white rounded-full shadow hover:bg-gray-100 transition">
            <Edit className="w-4 h-4 text-gray-700" />
          </button>
          <button onClick={() => onDelete(item?.id)} className="p-2 bg-white rounded-full shadow hover:bg-red-50 transition">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-medium text-sm text-foreground truncate">{item?.name ?? 'Untitled'}</h3>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 truncate max-w-[80px]">
            {item?.category?.name ?? ''}
          </span>
          {item?.condition && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${condClass}`}>
              {item.condition}
            </span>
          )}
        </div>
        {item?.price != null && (
          <div className="flex items-center gap-1 mt-1.5 text-sm font-mono font-medium text-foreground">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            {Number(item.price).toFixed(2)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
