export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    // Get photo URLs if needed
    let photoUrls: Record<string, string> = {};
    if (includePhotos) {
      for (const item of (items ?? [])) {
        for (const photo of (item?.photos ?? [])) {
          try {
            const url = await getFileUrl(photo.cloudStoragePath, photo.contentType, photo.isPublic);
            photoUrls[photo.id] = url;
          } catch { /* skip */ }
        }
      }
    }

    // Generate HTML for PDF
    const html = generatePdfHtml(items ?? [], includePhotos, photoUrls);

    // Call HTML2PDF API
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: { format: 'A4', landscape: false, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } },
        base_url: process.env.NEXTAUTH_URL ?? '',
      }),
    });

    if (!createResponse.ok) {
      return NextResponse.json({ error: 'Failed to initiate PDF generation' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'No request ID returned' }, { status: 500 });
    }

    // Poll for completion
    let attempts = 0;
    while (attempts < 120) {
      await new Promise(r => setTimeout(r, 1000));
      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
      });
      const statusResult = await statusResponse.json();
      const status = statusResult?.status ?? 'FAILED';
      if (status === 'SUCCESS') {
        if (statusResult?.result?.result) {
          const pdfBuffer = Buffer.from(statusResult.result.result, 'base64');
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': 'attachment; filename="collection-export.pdf"',
            },
          });
        }
        return NextResponse.json({ error: 'PDF empty' }, { status: 500 });
      } else if (status === 'FAILED') {
        return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
      }
      attempts++;
    }
    return NextResponse.json({ error: 'PDF generation timed out' }, { status: 500 });
  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 });
  }
}

function generatePdfHtml(items: any[], includePhotos: boolean, photoUrls: Record<string, string>): string {
  const rows = (items ?? []).map((item: any) => {
    const customVals = item?.customValues ?? {};
    const customStr = Object.entries(customVals ?? {})
      .filter(([, v]: any) => v)
      .map(([k, v]: any) => `<span style="color:#666;">${k}:</span> ${v}`)
      .join(' | ');

    let photoHtml = '';
    if (includePhotos && item?.photos?.length > 0) {
      photoHtml = (item.photos ?? []).slice(0, 3).map((p: any) => {
        const url = photoUrls[p.id];
        return url ? `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;margin-right:4px;" />` : '';
      }).join('');
    }

    return `<tr>
      ${includePhotos ? `<td style="padding:8px;">${photoHtml}</td>` : ''}
      <td style="padding:8px;font-weight:600;">${item?.name ?? ''}</td>
      <td style="padding:8px;">${item?.category?.name ?? ''}</td>
      <td style="padding:8px;">${item?.condition ?? '-'}</td>
      <td style="padding:8px;">${item?.price != null ? '$' + Number(item.price).toFixed(2) : '-'}</td>
      <td style="padding:8px;font-size:12px;">${item?.description ?? ''}</td>
      <td style="padding:8px;font-size:11px;">${customStr}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: 'Helvetica', sans-serif; margin: 0; padding: 20px; color: #333; }
  h1 { color: #0d9488; font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #0d9488; color: white; padding: 10px 8px; text-align: left; }
  tr:nth-child(even) { background: #f8fafa; }
  td { border-bottom: 1px solid #e5e7eb; vertical-align: top; }
</style></head><body>
  <h1>My Collection</h1>
  <p class="subtitle">Exported ${items?.length ?? 0} items</p>
  <table>
    <thead><tr>
      ${includePhotos ? '<th>Photos</th>' : ''}
      <th>Name</th><th>Category</th><th>Condition</th><th>Price</th><th>Description</th><th>Custom Fields</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body></html>`;
}
