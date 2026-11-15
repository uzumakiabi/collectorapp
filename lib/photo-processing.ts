import sharp from 'sharp';

const FULL_MAX = 1000;
const THUMB_MAX = 300;
const QUALITY = 75;

export function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; mime: string | null } {
  const match = dataUrl.match(/^data:([^;,]+)[^,]*,/);
  if (!match) return { buffer: Buffer.from(dataUrl, 'base64'), mime: null };
  return { buffer: Buffer.from(dataUrl.slice(match[0].length), 'base64'), mime: match[1] };
}

export async function processPhoto(input: { data: string; contentType?: string }): Promise<{ data: string; contentType: string; thumbnail: string | null }> {
  const fallback = { data: input.data, contentType: input.contentType ?? 'image/jpeg', thumbnail: null };
  try {
    const { buffer, mime } = dataUrlToBuffer(input.data);
    const sourceMime = mime ?? input.contentType ?? null;
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    const keepOriginal = sourceMime === 'image/webp' && width <= FULL_MAX && height <= FULL_MAX;

    let fullData = input.data;
    if (!keepOriginal) {
      const full = await sharp(buffer)
        .rotate()
        .resize({ width: FULL_MAX, height: FULL_MAX, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      fullData = `data:image/webp;base64,${full.toString('base64')}`;
    }

    const thumb = await sharp(buffer)
      .rotate()
      .resize({ width: THUMB_MAX, height: THUMB_MAX, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    return {
      data: fullData,
      contentType: 'image/webp',
      thumbnail: `data:image/webp;base64,${thumb.toString('base64')}`,
    };
  } catch (error) {
    console.error('Photo processing error:', error);
    return fallback;
  }
}

export async function toJpegBuffer(dataUrl: string, maxDim: number): Promise<Buffer | null> {
  try {
    const { buffer } = dataUrlToBuffer(dataUrl);
    return await sharp(buffer)
      .rotate()
      .resize({ width: maxDim, height: maxDim, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch {
    return null;
  }
}
