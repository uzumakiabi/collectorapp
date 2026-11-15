import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { processPhoto, toJpegBuffer } from '@/lib/photo-processing';

function dataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

function decode(dataUrlString: string): Buffer {
  return Buffer.from(dataUrlString.split(',')[1] ?? '', 'base64');
}

describe('processPhoto', () => {
  it('resizes a large PNG to WebP with a thumbnail', async () => {
    const input = await sharp({ create: { width: 2000, height: 1500, channels: 3, background: '#f00' } }).png().toBuffer();
    const source = dataUrl(input, 'image/png');

    const result = await processPhoto({ data: source, contentType: 'image/png' });

    expect(result.contentType).toBe('image/webp');
    expect(result.data.startsWith('data:image/webp;base64,')).toBe(true);
    expect(result.thumbnail?.startsWith('data:image/webp;base64,')).toBe(true);

    const full = await sharp(decode(result.data)).metadata();
    expect(full.format).toBe('webp');
    expect(Math.max(full.width ?? 0, full.height ?? 0)).toBeLessThanOrEqual(1000);

    const thumb = await sharp(decode(result.thumbnail ?? '')).metadata();
    expect(thumb.format).toBe('webp');
    expect(Math.max(thumb.width ?? 0, thumb.height ?? 0)).toBeLessThanOrEqual(300);

    expect(result.data.length).toBeLessThan(source.length);
  });

  it('keeps an already small WebP unchanged', async () => {
    const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#0f0' } }).webp({ quality: 75 }).toBuffer();
    const source = dataUrl(input, 'image/webp');

    const result = await processPhoto({ data: source, contentType: 'image/webp' });

    expect(result.data).toBe(source);
    expect(result.contentType).toBe('image/webp');
    expect(result.thumbnail).not.toBeNull();
  });

  it('returns the original data when the input cannot be decoded', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const source = 'data:image/png;base64,bm90LWFuLWltYWdl';

    const result = await processPhoto({ data: source, contentType: 'image/png' });

    expect(result.data).toBe(source);
    expect(result.contentType).toBe('image/png');
    expect(result.thumbnail).toBeNull();
    spy.mockRestore();
  });
});

describe('toJpegBuffer', () => {
  it('converts a WebP image to JPEG', async () => {
    const input = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#00f' } }).webp().toBuffer();

    const buffer = await toJpegBuffer(dataUrl(input, 'image/webp'), 200);

    expect(buffer).not.toBeNull();
    const meta = await sharp(buffer as Buffer).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(200);
  });

  it('returns null for undecodable input', async () => {
    expect(await toJpegBuffer('data:image/png;base64,bm90LWFuLWltYWdl', 200)).toBeNull();
  });
});
