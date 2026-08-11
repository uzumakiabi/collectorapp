export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import PDFDocument from 'pdfkit';

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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<void>((resolve) => doc.on('end', resolve));

    // Header
    doc.fillColor('#0d9488').fontSize(24).font('Helvetica-Bold').text('My Collection', { continued: false });
    doc.moveDown(0.2);
    doc.fillColor('#666666').fontSize(12).font('Helvetica').text(`Exported ${(items ?? []).length} items`);
    doc.moveDown(0.5);

    // Table header
    const startX = doc.page.margins.left;
    const colWidths = includePhotos ? [70, 110, 80, 60, 60, 120] : [110, 80, 60, 60, 120];
    const headers = includePhotos
      ? ['Photo', 'Name', 'Category', 'Condition', 'Price', 'Description']
      : ['Name', 'Category', 'Condition', 'Price', 'Description'];

    const drawRow = (cells: string[], isHeader: boolean) => {
      let x = startX;
      const rowHeight = 20;
      const y = doc.y;
      if (isHeader) {
        doc.rect(startX, y, doc.page.width - startX - doc.page.margins.right, rowHeight).fill('#0d9488');
      }
      cells.forEach((cell, i) => {
        const w = colWidths[i];
        doc.fillColor(isHeader ? '#ffffff' : '#333333')
          .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(9)
          .text(cell, x + 4, y + 6, { width: w - 8, height: rowHeight - 8, ellipsis: true });
        x += w;
      });
      doc.moveDown(0.1);
    };

    drawRow(headers, true);

    for (const item of (items ?? [])) {
      const customVals = item?.customValues ?? {};
      const customStr = Object.entries(customVals ?? {})
        .filter(([, v]: any) => v)
        .map(([k, v]: any) => `${k}: ${v}`)
        .join(' | ');

      const cells: string[] = [];
      if (includePhotos) {
        cells.push(item?.photos?.[0]?.data ? 'Photo' : '');
      }
      cells.push(
        item?.name ?? '',
        item?.category?.name ?? '',
        item?.condition ?? '-',
        item?.price != null ? '$' + Number(item.price).toFixed(2) : '-',
        (item?.description ?? '') + (customStr ? `\n${customStr}` : '')
      );
      const rowY = doc.y;
      drawRow(cells, false);
      if (includePhotos && item?.photos?.[0]?.data) {
        try {
          doc.image(item.photos[0].data, startX + 4, rowY + 2, { width: 60, height: 60 });
        } catch { /* skip invalid image */ }
      }
    }

    doc.end();
    await done;
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="collection-export.pdf"',
      },
    });
  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}
