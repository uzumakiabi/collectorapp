import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prismaMock } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prismaMock: {
    folder: { findFirst: vi.fn(), findMany: vi.fn() },
    folderItem: { upsert: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    item: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn() },
    category: { findFirst: vi.fn() },
    customFieldDef: { deleteMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    priceHistory: { create: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));
vi.mock('@/lib/currency', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/currency')>();
  return {
    ...actual,
    getLiveRates: vi.fn().mockResolvedValue({ USD: 1, EUR: 0.92, GBP: 0.79, MKD: 57.5 }),
  };
});

import { POST as addItemToFolder } from '@/app/api/folders/[id]/items/route';
import { DELETE as deleteCategoryField } from '@/app/api/categories/[id]/fields/route';
import { POST as createItem } from '@/app/api/items/route';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function jsonRequest(url: string, method: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { ...JSON_HEADERS, ...headers },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue({ currency: 'USD' });
});

describe('POST /api/folders/[id]/items', () => {
  it('returns 401 without a session', async () => {
    getServerSession.mockResolvedValue(null);

    const response = await addItemToFolder(
      jsonRequest('http://localhost/api/folders/folder-1/items', 'POST', { itemId: 'item-1' }),
      { params: { id: 'folder-1' } }
    );

    expect(response.status).toBe(401);
    expect(prismaMock.folder.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when the folder belongs to another user', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.folder.findFirst.mockResolvedValue(null);

    const response = await addItemToFolder(
      jsonRequest('http://localhost/api/folders/folder-1/items', 'POST', { itemId: 'item-1' }),
      { params: { id: 'folder-1' } }
    );

    expect(response.status).toBe(404);
    expect(prismaMock.folder.findFirst).toHaveBeenCalledWith({ where: { id: 'folder-1', userId: 'user-1' } });
    expect(prismaMock.folderItem.upsert).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/categories/[id]/fields', () => {
  it('scopes the delete to the category', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.category.findFirst.mockResolvedValue({ id: 'category-1' });
    prismaMock.customFieldDef.deleteMany.mockResolvedValue({ count: 1 });

    const response = await deleteCategoryField(
      jsonRequest('http://localhost/api/categories/category-1/fields', 'DELETE', { fieldId: 'field-1' }),
      { params: { id: 'category-1' } }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.customFieldDef.deleteMany).toHaveBeenCalledWith({
      where: { id: 'field-1', categoryId: 'category-1' },
    });
  });

  it('returns 404 when nothing was deleted', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.category.findFirst.mockResolvedValue({ id: 'category-1' });
    prismaMock.customFieldDef.deleteMany.mockResolvedValue({ count: 0 });

    const response = await deleteCategoryField(
      jsonRequest('http://localhost/api/categories/category-1/fields', 'DELETE', { fieldId: 'field-1' }),
      { params: { id: 'category-1' } }
    );

    expect(response.status).toBe(404);
  });
});

describe('POST /api/items', () => {
  it('returns 400 Invalid category when the category is not owned', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.category.findFirst.mockResolvedValue(null);

    const response = await createItem(
      jsonRequest('http://localhost/api/items', 'POST', { name: 'Widget', categoryId: 'category-1' })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid category' });
    expect(prismaMock.category.findFirst).toHaveBeenCalledWith({ where: { id: 'category-1', userId: 'user-1' } });
  });

  it('converts the price from the input currency to the base currency', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'user-1' } });
    prismaMock.category.findFirst.mockResolvedValue({ id: 'category-1' });
    prismaMock.user.findUnique.mockResolvedValue({ currency: 'USD' });

    const tx = {
      item: { create: vi.fn().mockResolvedValue({ id: 'item-1' }) },
      priceHistory: { create: vi.fn() },
      folder: { findFirst: vi.fn().mockResolvedValue(null) },
      folderItem: { createMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const response = await createItem(
      jsonRequest('http://localhost/api/items', 'POST', {
        name: 'Widget',
        categoryId: 'category-1',
        price: '92',
        inputCurrency: 'EUR',
      })
    );

    expect(response.status).toBe(200);
    expect(tx.item.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ price: 100 }) })
    );
    expect(tx.priceHistory.create).toHaveBeenCalledWith({ data: { price: 100, itemId: 'item-1' } });
  });
});

describe('POST /api/auth/forgot-password', () => {
  it('returns identical bodies for existing and non-existing emails without leaking the token', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const missing = await forgotPassword(
      jsonRequest(
        'http://localhost/api/auth/forgot-password',
        'POST',
        { email: 'missing-owner@example.com' },
        { 'x-forwarded-for': '203.0.113.11' }
      )
    );

    prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'existing-owner@example.com' });
    prismaMock.user.update.mockResolvedValue({ id: 'user-1' });

    const existing = await forgotPassword(
      jsonRequest(
        'http://localhost/api/auth/forgot-password',
        'POST',
        { email: 'existing-owner@example.com' },
        { 'x-forwarded-for': '203.0.113.12' }
      )
    );

    expect(missing.status).toBe(200);
    expect(existing.status).toBe(200);

    const missingBody = await missing.json();
    const existingBody = await existing.json();

    expect(existingBody).toEqual(missingBody);

    const serialized = JSON.stringify(existingBody);
    expect(serialized).not.toContain('resetUrl');
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('resetToken');
  });
});
