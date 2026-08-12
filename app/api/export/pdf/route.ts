export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrencySymbol } from '@/lib/currency';
import PDFDocument from 'pdfkit';

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return Buffer.from(match[2], 'base64');
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { categoryId, folderId, includePhotos } = await request.json();

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const symbol = getCurrencySymbol(user?.currency ?? 'USD');

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

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidths = includePhotos ? [70, 120, 80, 60, 60, pageWidth - 390] : [120, 80, 60, 60, pageWidth - 320];
    const headers = includePhotos
      ? ['Photo', 'Name', 'Category', 'Condition', 'Price', 'Description']
      : ['Name', 'Category', 'Condition', 'Price', 'Description'];

    // Header
    doc.fillColor('#0d9488').fontSize(24).font('Helvetica-Bold').text('My Collection', { continued: false });
    doc.moveDown(0.2);
    doc.fillColor('#666666').fontSize(12).font('Helvetica').text(`Exported ${(items ?? []).length} items`);
    doc.moveDown(0.5);

    const rowHeight = 24;
    const startX = doc.page.margins.left;

    const drawHeader = () => {
      const y = doc.y;
      doc.rect(startX, y, pageWidth, rowHeight).fill('#0d9488');
      let x = startX;
      headers.forEach((h, i) => {
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9)
          .text(h, x + 4, y + 8, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });
      doc.y = y + rowHeight;
    };

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawHeader();
      }
    };

    drawHeader();

    for (const item of (items ?? [])) {
      const customVals = item?.customValues ?? {};
      const customStr = Object.entries(customVals ?? {})
        .filter(([, v]: any) => v)
        .map(([k, v]: any) => `${k}: ${v}`)
        .join(' | ');
      const description = ((item?.description ?? '') + (customStr ? `\n${customStr}` : '')).trim();

      const photoBuf = includePhotos && item?.photos?.[0]?.data
        ? dataUrlToBuffer(item.photos[0].data)
        : null;

      // Estimate row height based on description length
      const descLines = Math.max(1, Math.ceil(description.length / 40));
      const rowH = Math.max(rowHeight, 20 + descLines * 10, photoBuf ? 64 : rowHeight);

      ensureSpace(rowH);
      const y = doc.y;

      // Row background
      doc.rect(startX, y, pageWidth, rowH).fill('#f8fafc');

      let x = startX;
      const cells = [
        photoBuf ? '' : '',
        item?.name ?? '',
        item?.category?.name ?? '',
        item?.condition ?? '-',
        item?.price != null ? symbol + Number(item.price).toFixed(2) : '-',
        description,
      ];
      cells.forEach((cell, i) => {
        doc.fillColor('#333333').font('Helvetica').fontSize(9)
          .text(cell, x + 4, y + 6, { width: colWidths[i] - 8 });
        x += colWidths[i];
      });

      if (photoBuf) {
        try {
          doc.image(photoBuf, startX + 4, y + 2, { width: 60, height: 60, fit: [60, 60] });
        } catch { /* skip invalid image */ }
      }

      doc.y = y + rowH;
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
