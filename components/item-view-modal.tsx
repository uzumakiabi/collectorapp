'use client';

import { X, ImageIcon, Tag, Calendar, DollarSign } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/currency';

const CONDITION_STYLES: Record<string, string> = {
  'Mint': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Near Mint': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Good': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Fair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Poor': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface ItemViewModalProps {
  item: any;
  currency?: string;
  onClose: () => void;
}

export function ItemViewModal({ item, currency = 'USD', onClose }: ItemViewModalProps) {
  if (!item) return null;
  const symbol = getCurrencySymbol(currency ?? 'USD');
  const photos = item?.photos ?? [];
  const customValues = item?.customValues ?? {};
  const customEntries = Object.entries(customValues ?? {}).filter(([, v]: any) => v);
  const condClass = CONDITION_STYLES[item?.condition ?? ''] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-display font-semibold text-foreground truncate">{item?.name ?? 'Item'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {photos?.[0]?.data ? (
              <img src={photos[0].data} alt={item?.name ?? 'Item'} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
            )}
          </div>

          {/* Multiple photos */}
          {photos?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p: any, i: number) => (
                <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
                  {p?.data ? <img src={p.data} alt="" className="w-full h-full object-cover" /> : null}
                </div>
              ))}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-teal-600" />
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-sm font-medium text-foreground ml-auto">{item?.category?.name ?? '-'}</span>
            </div>

            {item?.price != null && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-sm font-medium text-foreground ml-auto font-mono">{symbol}{Number(item.price).toFixed(2)}</span>
              </div>
            )}

            {item?.condition && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Condition</span>
                <span className={`text-xs px-2 py-0.5 rounded ml-auto ${condClass}`}>{item.condition}</span>
              </div>
            )}

            {item?.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3">{item.description}</p>
              </div>
            )}

            {customEntries.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Category Fields</p>
                <div className="space-y-2">
                  {customEntries.map(([key, val]: any) => (
                    <div key={key} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-medium text-foreground">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item?.createdAt && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Added {new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
