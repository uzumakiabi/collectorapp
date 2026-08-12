'use client';

import { useState, useEffect } from 'react';
import { Package, DollarSign, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { getCurrencySymbol } from '@/lib/currency';

const PIE_COLORS = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#0f766e', '#115e59', '#134e4a', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6'];

interface DashboardData {
  totalItems: number;
  totalValue: number;
  recentAdditions: { id: string; name: string; price: number | null; category: string; createdAt: string }[];
  valueOverTime: { month: string; value: number }[];
  valueByCategory: { name: string; value: number }[];
  countByCategory: { name: string; count: number }[];
  mostValuable: { id: string; name: string; price: number | null; category: string }[];
}

export function DashboardWidget({ currency = 'USD' }: { currency?: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const symbol = getCurrencySymbol(currency);
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const axisColor = isDark ? '#94a3b8' : '#94a3b8';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    color: isDark ? '#f8fafc' : '#0f172a',
    fontSize: '12px',
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/dashboard');
        const d = await res.json();
        setData(d);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [currency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!data) return null;

  const fmt = (n: number) => `${symbol}${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
            <Package className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Items</p>
            <p className="text-2xl font-display font-bold text-foreground">{data.totalItems}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Collection Value</p>
            <p className="text-2xl font-display font-bold text-foreground">{fmt(data.totalValue)}</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs text-muted-foreground">Most Valuable Item</p>
            <p className="text-lg font-display font-bold text-foreground truncate">
              {data.mostValuable?.[0]?.name ?? '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Value over time */}
      <div className="bg-card rounded-xl p-4 border border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-teal-600" /> Collection Value Over Time
        </h3>
        {data.valueOverTime.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.valueOverTime} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke={axisColor} />
                <YAxis tick={{ fontSize: 11 }} stroke={axisColor} tickFormatter={(v) => `${symbol}${v}`} width={70} />
                <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Value']} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke="#0d9488" fill="url(#valueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
        )}
      </div>

      {/* Value by category + Item count by category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Value by Category</h3>
          {data.valueByCategory.length > 0 ? (
            <div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.valueByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                      {data.valueByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [fmt(Number(v)), 'Value']} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 justify-center">
                {data.valueByCategory.map((c, i) => (
                  <span key={c.name} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3">Item Count by Category</h3>
          {data.countByCategory.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.countByCategory} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={axisColor} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} stroke={axisColor} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
          )}
        </div>
      </div>

      {/* Recent additions + Most valuable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" /> Recent Additions
          </h3>
          {data.recentAdditions.length > 0 ? (
            <ul className="space-y-2">
              {data.recentAdditions.map(it => (
                <li key={it.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.category} · {new Date(it.createdAt).toLocaleDateString()}</p>
                  </div>
                  {it.price != null && <span className="text-sm font-mono text-foreground shrink-0 ml-2">{fmt(it.price)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No items yet</p>
          )}
        </div>
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-teal-600" /> Most Valuable Items
          </h3>
          {data.mostValuable.length > 0 ? (
            <ul className="space-y-2">
              {data.mostValuable.map((it, i) => (
                <li key={it.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs flex items-center justify-center font-medium shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{it.name}</p>
                      <p className="text-xs text-muted-foreground">{it.category}</p>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-foreground shrink-0 ml-2">{fmt(it.price ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No items yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
