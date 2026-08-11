'use client';

import { useState } from 'react';
import { Package, FolderOpen, FolderPlus, Trash2, ChevronDown, ChevronRight, Layers, X } from 'lucide-react';

interface SidebarProps {
  categories: any[];
  folders: any[];
  selectedCategoryId: string | null;
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null, categoryId?: string | null) => void;
  onSelectCategory: (catId: string | null) => void;
  onSelectAll: () => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
}

export function Sidebar({ categories, folders, selectedCategoryId, selectedFolderId, onSelectFolder, onSelectCategory, onSelectAll, onCreateFolder, onDeleteFolder }: SidebarProps) {
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [catOpen, setCatOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);

  const categoryFolders = (folders ?? []).filter((f: any) => f?.folderType === 'CATEGORY');
  const customFolders = (folders ?? []).filter((f: any) => f?.folderType === 'CUSTOM');

  const handleCreateFolder = () => {
    if (newFolderName?.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setShowNewFolder(false);
    }
  };

  return (
    <div className="h-full bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-teal-600" />
          <span className="font-display font-bold text-foreground">Collections</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All Items */}
        <button onClick={onSelectAll}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
            !selectedCategoryId && !selectedFolderId
              ? 'bg-teal-600/10 text-teal-700 dark:text-teal-400 font-medium'
              : 'text-foreground hover:bg-muted'
          }`}>
          <Layers className="w-4 h-4" />
          All Items
        </button>

        {/* Categories */}
        <div className="mt-3">
          <button onClick={() => setCatOpen(!catOpen)} className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {catOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Categories
          </button>
          {catOpen && (categories ?? []).map((cat: any) => {
            const folder = categoryFolders.find((f: any) => f?.categoryId === cat?.id);
            return (
              <button key={cat?.id} onClick={() => {
                if (folder) onSelectFolder(folder.id, cat.id);
                else onSelectCategory(cat.id);
              }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                  (selectedFolderId && folder?.id === selectedFolderId) || (!selectedFolderId && selectedCategoryId === cat?.id)
                    ? 'bg-teal-600/10 text-teal-700 dark:text-teal-400 font-medium'
                    : 'text-foreground hover:bg-muted'
                }`}>
                <span className="truncate">{cat?.name ?? ''}</span>
                <span className="text-xs text-muted-foreground">{cat?._count?.items ?? 0}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Folders */}
        <div className="mt-3">
          <button onClick={() => setFoldersOpen(!foldersOpen)} className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {foldersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Folders
          </button>
          {foldersOpen && (
            <>
              {(customFolders ?? []).map((folder: any) => (
                <div key={folder?.id} className="group flex items-center">
                  <button onClick={() => onSelectFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                      selectedFolderId === folder?.id
                        ? 'bg-teal-600/10 text-teal-700 dark:text-teal-400 font-medium'
                        : 'text-foreground hover:bg-muted'
                    }`}>
                    <FolderOpen className="w-4 h-4" />
                    <span className="truncate">{folder?.name ?? ''}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{folder?._count?.folderItems ?? 0}</span>
                  </button>
                  <button onClick={() => { if (confirm('Delete this folder?')) onDeleteFolder(folder.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {showNewFolder ? (
                <div className="px-3 py-1 flex items-center gap-1">
                  <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
                    placeholder="Folder name" autoFocus
                    className="flex-1 text-sm px-2 py-1 rounded border border-input bg-background outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={handleCreateFolder} className="text-teal-600 hover:text-teal-700 text-xs font-medium">Add</button>
                  <button onClick={() => setShowNewFolder(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowNewFolder(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition">
                  <FolderPlus className="w-4 h-4" /> New Folder
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
