import { describe, expect, it } from 'vitest';
import { readImageDimensions } from '../src/lib/image-dimensions';

function buffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('readImageDimensions', () => {
  it('reads PNG width/height from the IHDR chunk', () => {
    const bytes = [
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // signature
      0x00,
      0x00,
      0x00,
      0x0d, // chunk length (13)
      0x49,
      0x48,
      0x44,
      0x52, // "IHDR"
      0x00,
      0x00,
      0x01,
      0x90, // width = 400
      0x00,
      0x00,
      0x00,
      0xc8, // height = 200
    ];
    expect(readImageDimensions(buffer(bytes), 'image/png')).toEqual({ width: 400, height: 200 });
  });

  it('reads GIF width/height (little-endian) after the header', () => {
    const bytes = [
      0x47,
      0x49,
      0x46,
      0x38,
      0x39,
      0x61, // "GIF89a"
      0x64,
      0x00, // width = 100 (LE)
      0x32,
      0x00, // height = 50 (LE)
    ];
    expect(readImageDimensions(buffer(bytes), 'image/gif')).toEqual({ width: 100, height: 50 });
  });

  it('reads JPEG width/height from an SOF0 segment', () => {
    const bytes = [
      0xff,
      0xd8, // SOI
      0xff,
      0xc0, // SOF0
      0x00,
      0x11, // segment length
      0x08, // precision
      0x00,
      0x64, // height = 100
      0x00,
      0xc8, // width = 200
    ];
    expect(readImageDimensions(buffer(bytes), 'image/jpeg')).toEqual({ width: 200, height: 100 });
  });

  it('reads WebP VP8X extended-format width/height', () => {
    const bytes = [
      0x52,
      0x49,
      0x46,
      0x46, // "RIFF"
      0,
      0,
      0,
      0, // size (unused)
      0x57,
      0x45,
      0x42,
      0x50, // "WEBP"
      0x56,
      0x50,
      0x38,
      0x58, // "VP8X"
      0,
      0,
      0,
      0, // chunk size (unused)
      0x00, // flags
      0,
      0,
      0, // reserved
      0x1f,
      0x00,
      0x00, // width - 1 = 31 -> width 32 (LE, 24-bit)
      0x0f,
      0x00,
      0x00, // height - 1 = 15 -> height 16 (LE, 24-bit)
    ];
    expect(readImageDimensions(buffer(bytes), 'image/webp')).toEqual({ width: 32, height: 16 });
  });

  it('returns null for unsupported or truncated input instead of throwing', () => {
    expect(readImageDimensions(buffer([1, 2, 3]), 'image/png')).toBeNull();
    expect(
      readImageDimensions(buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 'application/pdf'),
    ).toBeNull();
  });
});
