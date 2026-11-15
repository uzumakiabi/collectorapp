export interface CustomFieldDef {
  id: string;
  name: string;
  fieldType: string;
  categoryId: string;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault?: boolean;
  userId?: string;
  createdAt?: string;
  customFields?: CustomFieldDef[];
  _count?: { items?: number };
}

export interface Folder {
  id: string;
  name: string;
  folderType: string;
  categoryId?: string | null;
  userId?: string;
  createdAt?: string;
  _count?: { folderItems?: number };
}

export interface ItemPhoto {
  id?: string;
  data?: string | null;
  contentType?: string;
  order?: number;
  itemId?: string;
}

export interface PriceHistoryEntry {
  id: string;
  price: number;
  recordedAt: string;
  itemId?: string;
}

export interface Item {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  isGift?: boolean;
  condition?: string | null;
  categoryId: string;
  userId?: string;
  customValues?: Record<string, string> | null;
  createdAt?: string;
  updatedAt?: string;
  category?: Category | null;
  photos?: ItemPhoto[];
  folderItems?: { folder?: Folder | null }[];
  priceHistory?: PriceHistoryEntry[];
}
