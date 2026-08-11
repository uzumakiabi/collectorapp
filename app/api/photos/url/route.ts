export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFileUrl } from '@/lib/s3';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { cloud_storage_path, contentType, isPublic } = await request.json();
    if (!cloud_storage_path) {
      return NextResponse.json({ error: 'cloud_storage_path required' }, { status: 400 });
    }

    const url = await getFileUrl(cloud_storage_path, contentType ?? 'image/jpeg', isPublic ?? false);
    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Get photo URL error:', error);
    return NextResponse.json({ error: 'Failed to get photo URL' }, { status: 500 });
  }
}
