'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Sidebar } from './sidebar';
import { ItemGrid } from './item-grid';
import { ItemModal } from './item-modal';
import { BatchUploadModal } from './batch-upload-modal';
import { ExportModal } from './export-modal';
import { CategoryManager } from './category-manager';
import {
  Package, Plus, Upload, Download, Search, SortAsc, SortDesc, LogOut, Menu, X, Settings, LayoutGrid, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function DashboardLayout() {
  const { data: session, status } = useSession() || {};
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, folderRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/folders'),
      ]);
      const cats = await catRes.json();
      const folds = await folderRes.json();
      setCategories(Array.isArray(cats) ? cats : []);
      setFolders(Array.isArray(folds) ? folds : []);
    } catch { /* silent */ }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
      if (selectedFolderId) params.set('folderId', selectedFolderId);
      if (search) params.set('search', search);
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId, selectedFolderId, search, sortBy, sortDir]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      toast.success('Item deleted');
      fetchItems();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleSaved = () => {
    setShowItemModal(false);
    setEditingItem(null);
    fetchItems();
    fetchData();
  };

  const handleBatchDone = () => {
    setShowBatchUpload(false);
    fetchItems();
    fetchData();
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const handleSelectFolder = (folderId: string | null, categoryId?: string | null) => {
    setSelectedFolderId(folderId);
    setSelectedCategoryId(categoryId ?? null);
    setSidebarOpen(false);
  };

  const currentTitle = selectedFolderId
    ? (folders ?? []).find((f: any) => f?.id === selectedFolderId)?.name ?? 'Folder'
    : selectedCategoryId
      ? (categories ?? []).find((c: any) => c?.id === selectedCategoryId)?.name ?? 'Category'
      : 'All Items';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          categories={categories}
          folders={folders}
          selectedCategoryId={selectedCategoryId}
          selectedFolderId={selectedFolderId}
          onSelectFolder={handleSelectFolder}
          onSelectCategory={(catId: string | null) => { setSelectedCategoryId(catId); setSelectedFolderId(null); setSidebarOpen(false); }}
          onSelectAll={() => { setSelectedCategoryId(null); setSelectedFolderId(null); setSidebarOpen(false); }}
          onCreateFolder={async (name: string) => {
            await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
            fetchData();
          }}
          onDeleteFolder={async (id: string) => {
            await fetch(`/api/folders/${id}`, { method: 'DELETE' });
            if (selectedFolderId === id) { setSelectedFolderId(null); }
            fetchData();
          }}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-4 py-3 max-w-[1200px] mx-auto w-full">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-muted rounded-lg">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-600" />
                <h1 className="text-lg font-display font-bold tracking-tight hidden sm:block">Collection Manager</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowCategories(true)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition" title="Manage Categories">
                <Settings className="w-5 h-5" />
              </button>
              <Link href="/change-password" className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition" title="Change Password">
                <KeyRound className="w-5 h-5" />
              </Link>
              <button onClick={() => signOut()} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition" title="Sign Out">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-border bg-background">
          <div className="max-w-[1200px] mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-teal-600" />
                <h2 className="text-xl font-display font-semibold tracking-tight">{currentTitle}</h2>
                <span className="text-sm text-muted-foreground">({items?.length ?? 0} items)</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => { setEditingItem(null); setShowItemModal(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition">
                  <Plus className="w-4 h-4" /> Add Item
                </button>
                <button onClick={() => setShowBatchUpload(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition">
                  <Upload className="w-4 h-4" /> Batch Add
                </button>
                <button onClick={() => setShowExport(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition">
                  <Download className="w-4 h-4" /> Export
                </button>
              </div>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-3">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                />
              </div>
              <div className="flex items-center gap-1">
                {[{ key: 'name', label: 'Name' }, { key: 'price', label: 'Price' }, { key: 'createdAt', label: 'Date' }].map(s => (
                  <button key={s.key} onClick={() => toggleSort(s.key)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${
                      sortBy === s.key ? 'bg-teal-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}>
                    {s.label}
                    {sortBy === s.key && (sortDir === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 px-4 py-4">
          <div className="max-w-[1200px] mx-auto w-full">
            <ItemGrid items={items} loading={loading} onEdit={handleEditItem} onDelete={handleDeleteItem} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showItemModal && (
        <ItemModal
          item={editingItem}
          categories={categories}
          folders={folders?.filter?.((f: any) => f?.folderType === 'CUSTOM') ?? []}
          onClose={() => { setShowItemModal(false); setEditingItem(null); }}
          onSaved={handleSaved}
          defaultCategoryId={selectedCategoryId}
        />
      )}
      {showBatchUpload && (
        <BatchUploadModal
          categories={categories}
          onClose={() => setShowBatchUpload(false)}
          onDone={handleBatchDone}
        />
      )}
      {showExport && (
        <ExportModal
          categoryId={selectedCategoryId}
          folderId={selectedFolderId}
          onClose={() => setShowExport(false)}
        />
      )}
      {showCategories && (
        <CategoryManager
          categories={categories}
          onClose={() => { setShowCategories(false); fetchData(); }}
        />
      )}
    </div>
  );
}
