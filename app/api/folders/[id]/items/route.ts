export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { itemId } = await request.json();
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 });

    const folderItem = await prisma.folderItem.create({
      data: { folderId: params.id, itemId },
    }).catch(() => null);
    return NextResponse.json(folderItem ?? { success: true });
  } catch (error: any) {
    console.error('Add to folder error:', error);
    return NextResponse.json({ error: 'Failed to add item to folder' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { itemId } = await request.json();
    await prisma.folderItem.deleteMany({ where: { folderId: params.id, itemId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Remove from folder error:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}
