import { describe, expect, it } from 'vitest';
import { validatePhotos } from '@/lib/validate-photos';

const SMALL_PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('validatePhotos', () => {
  it('accepts a valid data URL', () => {
    expect(validatePhotos([{ data: SMALL_PNG, contentType: 'image/png' }])).toBeNull();
  });

  it('accepts raw base64 without a data URL prefix', () => {
    expect(validatePhotos([{ data: 'iVBORw0KGgo=' }])).toBeNull();
  });

  it('accepts undefined and null', () => {
    expect(validatePhotos(undefined)).toBeNull();
    expect(validatePhotos(null)).toBeNull();
  });

  it('rejects more than 3 photos', () => {
    const photos = Array.from({ length: 4 }, () => ({ data: 'AAAA' }));
    expect(validatePhotos(photos)).toBe('At most 3 photos are allowed');
  });

  it('rejects a non-image content type', () => {
    expect(validatePhotos([{ data: 'AAAA', contentType: 'text/plain' }])).toBe('Unsupported photo type');
  });

  it('rejects a non-image data URL mime type', () => {
    expect(validatePhotos([{ data: 'data:text/plain;base64,AAAA' }])).toBe('Unsupported photo type');
  });

  it('rejects an oversized payload', () => {
    const oversized = 'A'.repeat(7 * 1024 * 1024);
    expect(validatePhotos([{ data: oversized }])).toBe('Photo is too large');
  });

  it('rejects a null data field', () => {
    expect(validatePhotos([{ data: null }])).toBe('Invalid photo data');
  });
});
