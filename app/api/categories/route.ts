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
    const categories = await prisma.category.findMany({
      where: { userId },
      include: { customFields: true, _count: { select: { items: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const existing = await prisma.category.findUnique({
      where: { userId_name: { userId, name: name.trim() } },
    });
    if (existing) return NextResponse.json({ error: 'Category already exists' }, { status: 400 });

    const category = await prisma.category.create({
      data: { name: name.trim(), userId, isDefault: false },
    });
    // Auto-folder
    await prisma.folder.create({
      data: { name: name.trim(), folderType: 'CATEGORY', categoryId: category.id, userId },
    });
    return NextResponse.json(category);
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
