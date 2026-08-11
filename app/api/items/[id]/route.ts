export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFile } from '@/lib/s3';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const item = await prisma.item.findFirst({
      where: { id: params.id, userId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        category: { include: { customFields: true } },
        folderItems: { include: { folder: true } },
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
    const userId = (session.user as any).id;
    const existing = await prisma.item.findFirst({ where: { id: params.id, userId } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { name, description, price, condition, categoryId, customValues, photos, folderIds } = body;

    // Delete removed photos from S3
    if (photos) {
      const currentPhotos = await prisma.itemPhoto.findMany({ where: { itemId: params.id } });
      const newPaths = (photos ?? []).map((p: any) => p.cloud_storage_path);
      for (const cp of currentPhotos) {
        if (!newPaths.includes(cp.cloudStoragePath)) {
          await deleteFile(cp.cloudStoragePath).catch(() => {});
        }
      }
      await prisma.itemPhoto.deleteMany({ where: { itemId: params.id } });
    }

    const item = await prisma.item.update({
      where: { id: params.id },
      data: {
        name: name?.trim() ?? existing.name,
        description: description ?? existing.description,
        price: price !== undefined ? (price ? parseFloat(price) : null) : existing.price,
        condition: condition ?? existing.condition,
        categoryId: categoryId ?? existing.categoryId,
        customValues: customValues ?? existing.customValues,
        ...(photos ? {
          photos: {
            create: (photos ?? []).map((p: any, idx: number) => ({
              cloudStoragePath: p.cloud_storage_path,
              isPublic: p.isPublic ?? false,
              contentType: p.contentType ?? 'image/jpeg',
              order: idx,
            })),
          },
        } : {}),
      },
      include: { photos: true, category: true },
    });

    // Update category folder
    if (categoryId && categoryId !== existing.categoryId) {
      // Remove from old category folder
      const oldFolder = await prisma.folder.findFirst({
        where: { userId, categoryId: existing.categoryId, folderType: 'CATEGORY' },
      });
      if (oldFolder) {
        await prisma.folderItem.deleteMany({ where: { folderId: oldFolder.id, itemId: params.id } });
      }
      // Add to new category folder
      const newFolder = await prisma.folder.findFirst({
        where: { userId, categoryId, folderType: 'CATEGORY' },
      });
      if (newFolder) {
        await prisma.folderItem.create({
          data: { folderId: newFolder.id, itemId: params.id },
        }).catch(() => {});
      }
    }

    // Update custom folder assignments
    if (folderIds !== undefined) {
      await prisma.folderItem.deleteMany({
        where: { itemId: params.id, folder: { folderType: 'CUSTOM' } },
      });
      for (const fId of (folderIds ?? [])) {
        await prisma.folderItem.create({
          data: { folderId: fId, itemId: params.id },
        }).catch(() => {});
      }
    }

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
    const userId = (session.user as any).id;
    const item = await prisma.item.findFirst({
      where: { id: params.id, userId },
      include: { photos: true },
    });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Delete photos from S3
    for (const photo of (item.photos ?? [])) {
      await deleteFile(photo.cloudStoragePath).catch(() => {});
    }

    await prisma.item.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
