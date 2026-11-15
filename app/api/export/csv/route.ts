export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { toCsv } from '@/lib/csv';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const folderId = searchParams.get('folderId');

    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;

    let items: any[];
    if (folderId) {
      const folderItems = await prisma.folderItem.findMany({
        where: { folderId },
        include: {
          item: {
            include: { category: true },
          },
        },
      });
      items = folderItems.map((fi: any) => fi?.item).filter((i: any) => i?.userId === userId);
    } else {
      items = await prisma.item.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    const allCustomKeys = new Set<string>();
    for (const item of (items ?? [])) {
      const cv = item?.customValues ?? {};
      Object.keys(cv ?? {}).forEach((k: string) => allCustomKeys.add(k));
    }
    const customKeys = Array.from(allCustomKeys);

    const rows: (string | number | null | undefined)[][] = [
      ['Name', 'Category', 'Description', 'Condition', 'Current Value', 'Purchase Price', 'Gift', 'Purchase Date', 'Created', ...customKeys],
    ];

    for (const item of (items ?? [])) {
      const cv = item?.customValues ?? {};
      rows.push([
        item?.name ?? '',
        item?.category?.name ?? '',
        item?.description ?? '',
        item?.condition ?? '',
        item?.price != null ? item.price : '',
        item?.purchasePrice != null ? item.purchasePrice : '',
        item?.isGift ? 'Yes' : '',
        item?.purchaseDate ? new Date(item.purchaseDate).toISOString().slice(0, 10) : '',
        item?.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '',
        ...customKeys.map((ck) => cv[ck] ?? ''),
      ]);
    }

    return new NextResponse('\uFEFF' + toCsv(rows), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="collection.csv"',
      },
    });
  } catch (error: any) {
    console.error('CSV export error:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
