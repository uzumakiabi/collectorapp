export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CURRENCIES, convertWithRates, getLiveRates } from '@/lib/currency';
import { validatePhotos } from '@/lib/validate-photos';
import { processPhoto } from '@/lib/photo-processing';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const item = await prisma.item.findFirst({
      where: { id: params.id, userId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        category: { include: { customFields: true } },
        folderItems: { include: { folder: true } },
        priceHistory: { orderBy: { recordedAt: 'asc' } },
      },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Get item error:', error);
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const existing = await prisma.item.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { name, description, price, purchasePrice, purchaseDate, isGift, condition, categoryId, customValues, photos, folderIds, inputCurrency } = body;

    if (inputCurrency !== undefined && inputCurrency !== null && !CURRENCIES[inputCurrency]) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    if (categoryId) {
      const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
      if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    let customFolderIds: string[] | undefined;
    if (folderIds !== undefined) {
      if (!Array.isArray(folderIds) || folderIds.some((fId: any) => typeof fId !== 'string')) {
        return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
      }
      customFolderIds = Array.from(new Set(folderIds));
      if (customFolderIds.length > 0) {
        const folders = await prisma.folder.findMany({
          where: { id: { in: customFolderIds }, userId, folderType: 'CUSTOM' },
          select: { id: true },
        });
        if (folders.length !== customFolderIds.length) {
          return NextResponse.json({ error: 'Invalid folder' }, { status: 400 });
        }
      }
    }

    const photoError = validatePhotos(photos);
    if (photoError) return NextResponse.json({ error: photoError }, { status: 400 });

    const processedPhotos = photos
      ? await Promise.all((photos ?? []).map((p: any) => processPhoto({ data: p.data, contentType: p.contentType })))
      : null;

    let purchaseDateValue: Date | null | undefined = undefined;
    if (purchaseDate !== undefined) {
      if (purchaseDate === null || purchaseDate === '') {
        purchaseDateValue = null;
      } else {
        const parsedDate = new Date(purchaseDate);
        if (Number.isNaN(parsedDate.getTime())) {
          return NextResponse.json({ error: 'Invalid purchase date' }, { status: 400 });
        }
        purchaseDateValue = parsedDate;
      }
    }

    const parsedPrice = price !== undefined ? (price ? parseFloat(price) : null) : existing.price;

    const nextIsGift = typeof isGift === 'boolean' ? isGift : existing.isGift;

    const parsedPurchasePrice = purchasePrice !== undefined
      ? (purchasePrice != null && purchasePrice !== '' ? parseFloat(purchasePrice) : null)
      : undefined;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const baseCurrency = user?.currency ?? 'USD';
    const rates = inputCurrency && inputCurrency !== baseCurrency ? await getLiveRates() : null;
    const convert = (value: number | null) =>
      rates && value != null ? convertWithRates(value, inputCurrency, baseCurrency, rates) : value;
    const finalPrice = price !== undefined ? convert(parsedPrice) : parsedPrice;
    const finalPurchasePrice = nextIsGift ? 0 : parsedPurchasePrice !== undefined ? convert(parsedPurchasePrice) : existing.purchasePrice;

    const item = await prisma.$transaction(async (tx) => {
      if (photos) {
        await tx.itemPhoto.deleteMany({ where: { itemId: params.id } });
      }

      const updated = await tx.item.update({
        where: { id: params.id },
        data: {
          name: name?.trim() ?? existing.name,
          description: description ?? existing.description,
          price: finalPrice,
          purchasePrice: finalPurchasePrice,
          isGift: nextIsGift,
          purchaseDate: purchaseDateValue !== undefined ? purchaseDateValue : existing.purchaseDate,
          condition: condition ?? existing.condition,
          categoryId: categoryId ?? existing.categoryId,
          customValues: customValues ?? existing.customValues,
          ...(photos ? {
            photos: {
              create: (processedPhotos ?? []).map((p, idx: number) => ({
                data: p.data,
                contentType: p.contentType,
                thumbnail: p.thumbnail,
                order: idx,
              })),
            },
          } : {}),
        },
        include: { photos: true, category: true },
      });

      if (finalPrice != null && finalPrice !== existing.price) {
        await tx.priceHistory.create({ data: { price: finalPrice, itemId: params.id } });
      }

      if (categoryId && categoryId !== existing.categoryId) {
        const oldFolder = await tx.folder.findFirst({
          where: { userId, categoryId: existing.categoryId, folderType: 'CATEGORY' },
        });
        if (oldFolder) {
          await tx.folderItem.deleteMany({ where: { folderId: oldFolder.id, itemId: params.id } });
        }
        const newFolder = await tx.folder.findFirst({
          where: { userId, categoryId, folderType: 'CATEGORY' },
        });
        if (newFolder) {
          await tx.folderItem.createMany({
            data: [{ folderId: newFolder.id, itemId: params.id }],
            skipDuplicates: true,
          });
        }
      }

      if (customFolderIds !== undefined) {
        await tx.folderItem.deleteMany({
          where: { itemId: params.id, folder: { folderType: 'CUSTOM' } },
        });
        if (customFolderIds.length > 0) {
          await tx.folderItem.createMany({
            data: customFolderIds.map((fId) => ({ folderId: fId, itemId: params.id })),
            skipDuplicates: true,
          });
        }
      }

      return updated;
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Update item error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const item = await prisma.item.findFirst({
      where: { id: params.id, userId },
      include: { photos: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
