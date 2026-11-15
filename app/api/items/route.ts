export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validatePhotos } from '@/lib/validate-photos';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortDirParam = searchParams.get('sortDir') ?? 'desc';
    const sortDir = sortDirParam === 'asc' || sortDirParam === 'desc' ? sortDirParam : 'desc';
    const condition = searchParams.get('condition');
    const minPrice = parseFloat(searchParams.get('minPrice') ?? '');
    const maxPrice = parseFloat(searchParams.get('maxPrice') ?? '');
    const offsetRaw = parseInt(searchParams.get('offset') ?? '0', 10);
    const offset = Number.isNaN(offsetRaw) ? 0 : Math.max(0, offsetRaw);
    const limitRaw = parseInt(searchParams.get('limit') ?? '48', 10);
    const limit = Math.min(100, Math.max(1, Number.isNaN(limitRaw) ? 48 : limitRaw));

    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (condition) where.condition = condition;
    if (!Number.isNaN(minPrice) || !Number.isNaN(maxPrice)) {
      where.price = {};
      if (!Number.isNaN(minPrice)) where.price.gte = minPrice;
      if (!Number.isNaN(maxPrice)) where.price.lte = maxPrice;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'name') orderBy = { name: sortDir };
    else if (sortBy === 'price') orderBy = { price: sortDir };
    else orderBy = { createdAt: sortDir };

    if (folderId) {
      const folder = await prisma.folder.findFirst({ where: { id: folderId, userId } });
      if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      where.folderItems = { some: { folderId } };
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        include: { photos: { orderBy: { order: 'asc' }, take: 1 }, category: true },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.item.count({ where }),
    ]);

    const nextOffset = offset + items.length < total ? offset + items.length : null;
    return NextResponse.json({ items: items ?? [], total, nextOffset });
  } catch (error: any) {
    console.error('Get items error:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;
    const body = await request.json();
    const { name, description, price, purchasePrice, purchaseDate, condition, categoryId, customValues, photos, folderIds } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'Category required' }, { status: 400 });

    const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
    if (!category) return NextResponse.json({ error: 'Invalid category' }, { status: 400 });

    let customFolderIds: string[] = [];
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

    let purchaseDateValue: Date | null = null;
    if (purchaseDate !== undefined && purchaseDate !== null && purchaseDate !== '') {
      const parsedDate = new Date(purchaseDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid purchase date' }, { status: 400 });
      }
      purchaseDateValue = parsedDate;
    }

    const parsedPrice = price ? parseFloat(price) : null;

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({
        data: {
          name: name.trim(),
          description: description ?? null,
          price: parsedPrice,
          purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
          purchaseDate: purchaseDateValue,
          condition: condition ?? null,
          categoryId,
          userId,
          customValues: customValues ?? {},
          photos: {
            create: (photos ?? []).map((p: any, idx: number) => ({
              data: p.data ?? null,
              contentType: p.contentType ?? 'image/jpeg',
              order: idx,
            })),
          },
        },
        include: { photos: true, category: true },
      });

      if (parsedPrice != null) {
        await tx.priceHistory.create({ data: { price: parsedPrice, itemId: created.id } });
      }

      const autoFolder = await tx.folder.findFirst({
        where: { userId, categoryId, folderType: 'CATEGORY' },
      });
      const links = [
        ...(autoFolder ? [{ folderId: autoFolder.id, itemId: created.id }] : []),
        ...customFolderIds.map((fId) => ({ folderId: fId, itemId: created.id })),
      ];
      if (links.length > 0) {
        await tx.folderItem.createMany({ data: links, skipDuplicates: true });
      }

      return created;
    });

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Create item error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
