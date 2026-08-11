export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const folderId = searchParams.get('folderId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') ?? 'createdAt';
    const sortDir = searchParams.get('sortDir') ?? 'desc';

    const where: any = { userId };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'name') orderBy = { name: sortDir };
    else if (sortBy === 'price') orderBy = { price: sortDir };
    else orderBy = { createdAt: sortDir };

    if (folderId) {
      const folderItems = await prisma.folderItem.findMany({
        where: { folderId },
        include: {
          item: {
            include: { photos: { orderBy: { order: 'asc' } }, category: true },
          },
        },
      });
      let items = folderItems
        .map((fi: any) => fi.item)
        .filter((item: any) => item?.userId === userId);
      if (search) {
        const s = search.toLowerCase();
        items = items.filter((i: any) => i?.name?.toLowerCase()?.includes(s));
      }
      return NextResponse.json(items ?? []);
    }

    const items = await prisma.item.findMany({
      where,
      include: { photos: { orderBy: { order: 'asc' } }, category: true },
      orderBy,
    });
    return NextResponse.json(items ?? []);
  } catch (error: any) {
    console.error('Get items error:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, description, price, condition, categoryId, customValues, photos, folderIds } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    if (!categoryId) return NextResponse.json({ error: 'Category required' }, { status: 400 });

    const item = await prisma.item.create({
      data: {
        name: name.trim(),
        description: description ?? null,
        price: price ? parseFloat(price) : null,
        condition: condition ?? null,
        categoryId,
        userId,
        customValues: customValues ?? {},
        photos: {
          create: (photos ?? []).map((p: any, idx: number) => ({
            cloudStoragePath: p.cloud_storage_path,
            isPublic: p.isPublic ?? false,
            contentType: p.contentType ?? 'image/jpeg',
            order: idx,
          })),
        },
      },
      include: { photos: true, category: true },
    });

    // Add to category auto-folder
    const autoFolder = await prisma.folder.findFirst({
      where: { userId, categoryId, folderType: 'CATEGORY' },
    });
    if (autoFolder) {
      await prisma.folderItem.create({
        data: { folderId: autoFolder.id, itemId: item.id },
      }).catch(() => {});
    }

    // Add to custom folders if specified
    if (folderIds && Array.isArray(folderIds)) {
      for (const fId of folderIds) {
        await prisma.folderItem.create({
          data: { folderId: fId, itemId: item.id },
        }).catch(() => {});
      }
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Create item error:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}
