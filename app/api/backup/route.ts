export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, bio: true, avatar: true, currency: true },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const categories = await prisma.category.findMany({
      where: { userId },
      include: { customFields: true },
      orderBy: { name: 'asc' },
    });

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: { folderItems: { select: { itemId: true } } },
      orderBy: { name: 'asc' },
    });

    const items = await prisma.item.findMany({
      where: { userId },
      include: {
        photos: { orderBy: { order: 'asc' } },
        priceHistory: { orderBy: { recordedAt: 'asc' } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user,
      categories,
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        folderType: f.folderType,
        categoryId: f.categoryId,
        createdAt: f.createdAt,
        itemIds: f.folderItems.map((fi) => fi.itemId),
      })),
      items,
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="collection-backup-${date}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
