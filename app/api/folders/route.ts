export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const folders = await prisma.folder.findMany({
      where: { userId },
      include: { _count: { select: { folderItems: true } } },
      orderBy: [{ folderType: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(folders ?? []);
  } catch (error: any) {
    console.error('Get folders error:', error);
    return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const folder = await prisma.folder.create({
      data: { name: name.trim(), folderType: 'CUSTOM', userId },
    });
    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
