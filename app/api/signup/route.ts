export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DEFAULT_CATEGORIES = [
  'Funko', 'Sports Cards', 'Books', 'Keychains', 'Kinder Toy',
  'Movie Cups', 'Coca Cola', 'Autographs', 'Posters', 'Other',
  'Figurines', 'Lego', '3D Puzzles', 'Caps', 'Magazines', 'Albums'
];

const CATEGORY_CUSTOM_FIELDS: Record<string, { name: string; fieldType: string }[]> = {
  'Funko': [{ name: 'Number', fieldType: 'text' }],
  'Books': [{ name: 'Author', fieldType: 'text' }],
  'Sports Cards': [
    { name: 'Player Name', fieldType: 'text' },
    { name: 'Year', fieldType: 'text' },
    { name: 'Card Number', fieldType: 'text' },
    { name: 'Brand/Set', fieldType: 'text' },
  ],
};

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, hashedPassword, name: name ?? '', onboarded: false },
    });

    // Create default categories + auto-folders for new user
    for (const catName of DEFAULT_CATEGORIES) {
      const category = await prisma.category.create({
        data: { name: catName, isDefault: true, userId: user.id },
      });
      const fields = CATEGORY_CUSTOM_FIELDS[catName];
      if (fields) {
        for (const field of fields) {
          await prisma.customFieldDef.create({
            data: { name: field.name, fieldType: field.fieldType, categoryId: category.id },
          });
        }
      }
      await prisma.folder.create({
        data: { name: catName, folderType: 'CATEGORY', categoryId: category.id, userId: user.id },
      });
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
