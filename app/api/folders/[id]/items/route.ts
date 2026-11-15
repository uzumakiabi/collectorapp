export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const folder = await prisma.folder.findFirst({ where: { id: params.id, userId } });
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { itemId } = await request.json();
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    const item = await prisma.item.findFirst({ where: { id: itemId, userId } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const folderItem = await prisma.folderItem.upsert({
      where: { folderId_itemId: { folderId: folder.id, itemId: item.id } },
      update: {},
      create: { folderId: folder.id, itemId: item.id },
    });
    return NextResponse.json(folderItem);
  } catch (error: any) {
    console.error('Add to folder error:', error);
    return NextResponse.json({ error: 'Failed to add item to folder' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const folder = await prisma.folder.findFirst({ where: { id: params.id, userId } });
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { itemId } = await request.json();
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    await prisma.folderItem.deleteMany({ where: { folderId: folder.id, itemId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove from folder error:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
