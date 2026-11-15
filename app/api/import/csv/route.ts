export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseCsv } from '@/lib/csv';
import { rateLimit } from '@/lib/rate-limit';

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 1000;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    if (!rateLimit('import:' + userId, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many imports, try again later' }, { status: 429 });
    }

    const body = await request.json();
    const csv = body?.csv;
    if (typeof csv !== 'string' || !csv.trim()) {
      return NextResponse.json({ error: 'CSV required' }, { status: 400 });
    }
    if (csv.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'CSV exceeds 2 MB' }, { status: 400 });
    }

    const rows = parseCsv(csv);
    if (rows.length < 2) return NextResponse.json({ error: 'CSV has no data rows' }, { status: 400 });
    if (rows.length - 1 > MAX_ROWS) {
      return NextResponse.json({ error: 'CSV exceeds 1000 rows' }, { status: 400 });
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const categoryIdx = header.indexOf('category');
    if (nameIdx === -1 || categoryIdx === -1) {
      return NextResponse.json({ error: 'Name and Category columns are required' }, { status: 400 });
    }

    const descriptionIdx = header.indexOf('description');
    const conditionIdx = header.indexOf('condition');
    let priceIdx = header.indexOf('current value');
    if (priceIdx === -1) priceIdx = header.indexOf('price');
    const purchasePriceIdx = header.indexOf('purchase price');
    const purchaseDateIdx = header.indexOf('purchase date');

    const knownIndexes = new Set([nameIdx, categoryIdx, descriptionIdx, conditionIdx, priceIdx, purchasePriceIdx, purchaseDateIdx]);
    const customColumns = rows[0]
      .map((label, idx) => ({ label: label.trim(), idx }))
      .filter(({ label, idx }) => label.length > 0 && !knownIndexes.has(idx));

    const existingCategories = await prisma.category.findMany({
      where: { userId },
      select: { id: true, name: true },
    });
    const categoryIds = new Map<string, string>(
      existingCategories.map((c) => [c.name.toLowerCase(), c.id])
    );

    const skipped: { row: number; reason: string }[] = [];
    const valid: {
      name: string;
      categoryName: string;
      description: string | null;
      condition: string | null;
      price: number | null;
      purchasePrice: number | null;
      purchaseDate: Date | null;
      customValues: Record<string, string>;
    }[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      if (row.every((cell) => !cell.trim())) continue;

      const name = (row[nameIdx] ?? '').trim();
      const categoryName = (row[categoryIdx] ?? '').trim();
      if (!name) {
        skipped.push({ row: rowNumber, reason: 'Missing name' });
        continue;
      }
      if (!categoryName) {
        skipped.push({ row: rowNumber, reason: 'Missing category' });
        continue;
      }

      const priceRaw = priceIdx >= 0 ? (row[priceIdx] ?? '').trim() : '';
      let price: number | null = null;
      if (priceRaw) {
        price = parseFloat(priceRaw);
        if (Number.isNaN(price)) {
          skipped.push({ row: rowNumber, reason: 'Invalid current value' });
          continue;
        }
      }

      const purchasePriceRaw = purchasePriceIdx >= 0 ? (row[purchasePriceIdx] ?? '').trim() : '';
      let purchasePrice: number | null = null;
      if (purchasePriceRaw) {
        purchasePrice = parseFloat(purchasePriceRaw);
        if (Number.isNaN(purchasePrice)) {
          skipped.push({ row: rowNumber, reason: 'Invalid purchase price' });
          continue;
        }
      }

      const purchaseDateRaw = purchaseDateIdx >= 0 ? (row[purchaseDateIdx] ?? '').trim() : '';
      let purchaseDate: Date | null = null;
      if (purchaseDateRaw) {
        const parsedDate = new Date(purchaseDateRaw);
        if (Number.isNaN(parsedDate.getTime())) {
          skipped.push({ row: rowNumber, reason: 'Invalid purchase date' });
          continue;
        }
        purchaseDate = parsedDate;
      }

      const customValues: Record<string, string> = {};
      for (const column of customColumns) {
        const value = (row[column.idx] ?? '').trim();
        if (value) customValues[column.label] = value;
      }

      valid.push({
        name,
        categoryName,
        description: (descriptionIdx >= 0 ? (row[descriptionIdx] ?? '').trim() : '') || null,
        condition: (conditionIdx >= 0 ? (row[conditionIdx] ?? '').trim() : '') || null,
        price,
        purchasePrice,
        purchaseDate,
        customValues,
      });
    }

    const autoFolderIds = new Map<string, string | null>();
    const created = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const entry of valid) {
        const key = entry.categoryName.toLowerCase();
        let categoryId = categoryIds.get(key);
        if (!categoryId) {
          const category = await tx.category.create({
            data: { name: entry.categoryName, userId, isDefault: false },
          });
          await tx.folder.create({
            data: { name: entry.categoryName, folderType: 'CATEGORY', categoryId: category.id, userId },
          });
          categoryId = category.id;
          categoryIds.set(key, categoryId);
        }

        const item = await tx.item.create({
          data: {
            name: entry.name,
            description: entry.description,
            price: entry.price,
            purchasePrice: entry.purchasePrice,
            purchaseDate: entry.purchaseDate,
            condition: entry.condition,
            categoryId,
            userId,
            customValues: entry.customValues,
          },
        });

        if (!autoFolderIds.has(categoryId)) {
          const autoFolder = await tx.folder.findFirst({
            where: { userId, categoryId, folderType: 'CATEGORY' },
          });
          autoFolderIds.set(categoryId, autoFolder?.id ?? null);
        }
        const autoFolderId = autoFolderIds.get(categoryId);
        if (autoFolderId) {
          await tx.folderItem.createMany({
            data: [{ folderId: autoFolderId, itemId: item.id }],
            skipDuplicates: true,
          });
        }

        if (entry.price != null) {
          await tx.priceHistory.create({ data: { price: entry.price, itemId: item.id } });
        }

        count += 1;
      }
      return count;
    }, { timeout: 120000, maxWait: 10000 });

    return NextResponse.json({ created, skipped });
  } catch (error: any) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 });
  }
}
