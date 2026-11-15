'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X, ImageIcon, ChevronLeft, ChevronRight, Tag, Calendar, DollarSign, Wallet, Gift, TrendingUp, TrendingDown } from 'lucide-react';
import { DISPLAY_CURRENCIES, convertWithRates, getCurrencySymbol } from '@/lib/currency';
import { useModalA11y } from '@/hooks/use-modal-a11y';
import { useRates } from '@/hooks/use-rates';
import type { Item } from '@/types/collection';

const CONDITION_STYLES: Record<string, string> = {
  'Mint': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Near Mint': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Good': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Fair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Poor': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface ItemViewModalProps {
  item: Item;
  currency?: string;
  onClose: () => void;
}

export function ItemViewModal({ item, currency = 'USD', onClose }: ItemViewModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  useModalA11y(panelRef, onClose);
  const rates = useRates();
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const photoCount = item?.photos?.length ?? 0;

  const prev = useCallback(() => setCurrent(c => (c - 1 + photoCount) % Math.max(photoCount, 1)), [photoCount]);
  const next = useCallback(() => setCurrent(c => (c + 1) % Math.max(photoCount, 1)), [photoCount]);

  useEffect(() => {
    setCurrent(0);
    setFullscreen(false);
  }, [item?.id]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (fullscreen && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setFullscreen(false);
        return;
      }
      if (photoCount < 2) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); prev(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); next(); }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [fullscreen, photoCount, prev, next]);

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current == null || photoCount < 2) return;
    const dx = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx > 0) prev(); else next();
  };

  if (!item) return null;
  const baseCurrency = currency ?? 'USD';
  const symbol = getCurrencySymbol(baseCurrency);
  const otherCurrencies = DISPLAY_CURRENCIES.filter((code) => code !== baseCurrency);
  const equivalents = (value: number) =>
    otherCurrencies
      .map((code) => `${getCurrencySymbol(code)}${convertWithRates(value, baseCurrency, code, rates ?? {}).toFixed(2)}`)
      .join(' · ');
  const photos = item?.photos ?? [];
  const activePhoto = photos[Math.min(current, Math.max(photos.length - 1, 0))];
  const mainPhotoUrl = activePhoto?.id ? `/api/photos/${activePhoto.id}` : activePhoto?.data ?? null;
  const customValues = item?.customValues ?? {};
  const customEntries = Object.entries(customValues ?? {}).filter(([, v]: any) => v);
  const condClass = CONDITION_STYLES[item?.condition ?? ''] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  const gain = item?.price != null && item?.purchasePrice != null ? item.price - item.purchasePrice : null;
  const gainPercent = gain != null && item?.purchasePrice ? (gain / item.purchasePrice) * 100 : null;
  const gainClass = (gain ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600';
  const priceHistory = item?.priceHistory ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} className="bg-card w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 id={`${uid}-title`} className="text-lg font-display font-semibold text-foreground truncate">{item?.name ?? 'Item'}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1 hover:bg-muted rounded-lg shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo */}
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center"
            onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            {mainPhotoUrl ? (
              <button type="button" onClick={() => setFullscreen(true)} aria-label="Open photo full screen" className="w-full h-full cursor-zoom-in">
                <img src={mainPhotoUrl} alt={`${item?.name ?? 'Item'} photo ${current + 1} of ${photoCount}`} loading="eager" className="w-full h-full object-cover" />
              </button>
            ) : (
              <ImageIcon className="w-16 h-16 text-muted-foreground/40" />
            )}
            {photoCount > 1 && (
              <>
                <button type="button" onClick={prev} aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/65 transition">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button type="button" onClick={next} aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/45 text-white hover:bg-black/65 transition">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full bg-black/55 text-white">{current + 1} / {photoCount}</span>
              </>
            )}
          </div>

          {/* Multiple photos */}
          {photoCount > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i: number) => (
                <button key={p?.id ?? i} type="button" onClick={() => setCurrent(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === current}
                  className={`w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0 border-2 transition ${
                    i === current ? 'border-teal-600' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}>
                  {p?.id || p?.data ? <img src={p?.id ? `/api/photos/${p.id}?size=thumb` : p.data ?? ''} alt="" className="w-full h-full object-cover" /> : null}
                </button>
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
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="text-sm font-medium text-foreground ml-auto font-mono">{symbol}{Number(item.price).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">{equivalents(Number(item.price))}</p>
              </div>
            )}

            {item?.condition && (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4" />
                <span className="text-sm text-muted-foreground">Condition</span>
                <span className={`text-xs px-2 py-0.5 rounded ml-auto ${condClass}`}>{item.condition}</span>
              </div>
            )}

            {item?.isGift ? (
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-muted-foreground">Purchase Price</span>
                <span className="text-xs px-2 py-0.5 rounded ml-auto bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">Gift</span>
              </div>
            ) : item?.purchasePrice != null && (
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-600" />
                  <span className="text-sm text-muted-foreground">Purchase Price</span>
                  <span className="text-sm font-medium text-foreground ml-auto font-mono">{symbol}{Number(item.purchasePrice).toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground text-right">{equivalents(Number(item.purchasePrice))}</p>
              </div>
            )}

            {item?.purchaseDate && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span className="text-sm text-muted-foreground">Purchase Date</span>
                <span className="text-sm font-medium text-foreground ml-auto">{new Date(item.purchaseDate).toLocaleDateString()}</span>
              </div>
            )}

            {gain != null && (
              <div>
                <div className="flex items-center gap-2">
                  {gain >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                  <span className="text-sm text-muted-foreground">Gain/Loss</span>
                  <span className={`text-sm font-medium ml-auto font-mono ${gainClass}`}>
                    {gain >= 0 ? '+' : '-'}{symbol}{Math.abs(gain).toFixed(2)}
                    {gainPercent != null && ` (${gainPercent >= 0 ? '+' : ''}${gainPercent.toFixed(1)}%)`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-right">{equivalents(gain)}</p>
              </div>
            )}

            {priceHistory.length > 1 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Price History</p>
                <div className="space-y-1">
                  {priceHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-muted-foreground">{new Date(h.recordedAt).toLocaleDateString()}</span>
                      <span className="text-xs font-mono font-medium text-foreground">{symbol}{Number(h.price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
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
                  {customEntries.map(([key, val]) => (
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

      {fullscreen && mainPhotoUrl && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
          role="dialog" aria-modal="true" aria-label="Photo viewer"
          onClick={e => { e.stopPropagation(); setFullscreen(false); }}
          onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <img src={mainPhotoUrl} alt={`${item?.name ?? 'Item'} photo ${current + 1} of ${photoCount}`}
            className="max-w-full max-h-full object-contain select-none" onClick={e => e.stopPropagation()} />
          <button type="button" onClick={e => { e.stopPropagation(); setFullscreen(false); }} aria-label="Close photo viewer"
            className="absolute top-3 right-3 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <X className="w-6 h-6" />
          </button>
          {photoCount > 1 && (
            <>
              <button type="button" onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronLeft className="w-7 h-7" />
              </button>
              <button type="button" onClick={e => { e.stopPropagation(); next(); }} aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
                <ChevronRight className="w-7 h-7" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm px-3 py-1 rounded-full bg-white/10 text-white">{current + 1} / {photoCount}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
