export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const cat = await prisma.category.findFirst({ where: { id: params.id, userId } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { name, fieldType } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Field name required' }, { status: 400 });

    const existing = await prisma.customFieldDef.findUnique({
      where: { categoryId_name: { categoryId: cat.id, name: name.trim() } },
    });
    if (existing) return NextResponse.json({ error: 'Field already exists' }, { status: 400 });

    const field = await prisma.customFieldDef.create({
      data: { name: name.trim(), fieldType: fieldType ?? 'text', categoryId: cat.id },
    });
    return NextResponse.json(field);
  } catch (error: any) {
    console.error('Add field error:', error);
    return NextResponse.json({ error: 'Failed to add field' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = (session.user as any).id;
    const cat = await prisma.category.findFirst({ where: { id: params.id, userId } });
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { fieldId } = await request.json();
    await prisma.customFieldDef.delete({ where: { id: fieldId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete field error:', error);
    return NextResponse.json({ error: 'Failed to delete field' }, { status: 500 });
  }
}
