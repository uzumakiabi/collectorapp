export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { resetToken: token } });
    if (!user || !user.resetTokenExpiry) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }
    if (user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword, resetToken: null, resetTokenExpiry: null },
    });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
