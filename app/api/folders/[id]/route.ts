export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const folder = await prisma.folder.findFirst({ where: { id: params.id, userId, folderType: 'CUSTOM' } });
    if (!folder) return NextResponse.json({ error: 'Not found or cannot delete category folders' }, { status: 404 });
    await prisma.folder.delete({ where: { id: folder.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
