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
    const cat = await prisma.category.findFirst({ where: { id: params.id, userId } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Delete auto-folder
    await prisma.folder.deleteMany({ where: { categoryId: cat.id, userId } });
    await prisma.category.delete({ where: { id: cat.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
