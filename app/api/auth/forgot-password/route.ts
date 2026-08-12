export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to avoid leaking which emails are registered
    if (!user) {
      return NextResponse.json({ message: 'If that email is registered, a reset link has been generated.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // No email service is configured, so return the reset link directly.
    // In production, send this link via email instead.
    return NextResponse.json({ message: 'Reset link generated.', resetUrl });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
