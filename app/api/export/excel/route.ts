export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';
import { getFileUrl } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { categoryId, folderId, includePhotos } = await request.json();

    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;

    let items: any[];
    if (folderId) {
      const folderItems = await prisma.folderItem.findMany({
        where: { folderId },
        include: {
          item: {
            include: { photos: { orderBy: { order: 'asc' } }, category: true },
          },
        },
      });
      items = folderItems.map((fi: any) => fi?.item).filter((i: any) => i?.userId === userId);
    } else {
      items = await prisma.item.findMany({
        where,
        include: { photos: { orderBy: { order: 'asc' } }, category: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Collect all custom field names
    const allCustomKeys = new Set<string>();
    for (const item of (items ?? [])) {
      const cv = item?.customValues ?? {};
      Object.keys(cv ?? {}).forEach((k: string) => allCustomKeys.add(k));
    }
    const customKeys = Array.from(allCustomKeys);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Collection');

    const columns: any[] = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Condition', key: 'condition', width: 12 },
      { header: 'Price', key: 'price', width: 10 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Date Added', key: 'dateAdded', width: 15 },
    ];
    for (const ck of customKeys) {
      columns.push({ header: ck, key: `custom_${ck}`, width: 15 });
    }
    if (includePhotos) {
      columns.push({ header: 'Photo URLs', key: 'photoUrls', width: 40 });
    }
    sheet.columns = columns;

    // Style header
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };

    for (const item of (items ?? [])) {
      const cv = item?.customValues ?? {};
      const row: any = {
        name: item?.name ?? '',
        category: item?.category?.name ?? '',
        condition: item?.condition ?? '',
        price: item?.price != null ? Number(item.price) : '',
        description: item?.description ?? '',
        dateAdded: item?.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' }) : '',
      };
      for (const ck of customKeys) {
        row[`custom_${ck}`] = cv[ck] ?? '';
      }
      if (includePhotos && item?.photos?.length > 0) {
        const urls: string[] = [];
        for (const photo of (item.photos ?? [])) {
          try {
            const url = await getFileUrl(photo.cloudStoragePath, photo.contentType, photo.isPublic);
            urls.push(url);
          } catch { /* skip */ }
        }
        row.photoUrls = urls.join('\n');
      }
      sheet.addRow(row);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as Buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="collection-export.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: 'Failed to export Excel' }, { status: 500 });
  }
}
