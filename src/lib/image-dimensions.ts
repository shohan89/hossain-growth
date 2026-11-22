/**
 * Reads width/height straight from an image's header bytes — no image
 * library, no native deps (Workers has neither). Supports the formats
 * `ALLOWED_MIME_TYPES` in the media API actually accepts; anything else
 * (PDF, unrecognized) returns null and the caller just stores no
 * dimensions, which is a metadata gap, not an upload failure.
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

function readPng(view: DataView): ImageDimensions | null {
  // 8-byte PNG signature, then the IHDR chunk: length(4) "IHDR"(4) width(4) height(4).
  if (view.byteLength < 24) return null;
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}

function readGif(view: DataView): ImageDimensions | null {
  // "GIF87a"/"GIF89a" header, then little-endian width(2) height(2).
  if (view.byteLength < 10) return null;
  const width = view.getUint16(6, true);
  const height = view.getUint16(8, true);
  return { width, height };
}

function readWebp(view: DataView): ImageDimensions | null {
  // RIFF....WEBP, then a chunk: "VP8 " (lossy), "VP8L" (lossless), or "VP8X" (extended).
  if (view.byteLength < 30) return null;
  const chunk = String.fromCharCode(
    view.getUint8(12),
    view.getUint8(13),
    view.getUint8(14),
    view.getUint8(15),
  );

  if (chunk === 'VP8X') {
    // 24-bit little-endian width-1 / height-1 at bytes 24/27.
    const width = (view.getUint8(24) | (view.getUint8(25) << 8) | (view.getUint8(26) << 16)) + 1;
    const height = (view.getUint8(27) | (view.getUint8(28) << 8) | (view.getUint8(29) << 16)) + 1;
    return { width, height };
  }
  if (chunk === 'VP8 ') {
    // Lossy: 14-bit width/height (masking the 2 high scaling bits) at bytes 26/28.
    const width = view.getUint16(26, true) & 0x3fff;
    const height = view.getUint16(28, true) & 0x3fff;
    return { width, height };
  }
  if (chunk === 'VP8L') {
    // Lossless: a packed 28-bit value starting 3 bytes in.
    const b0 = view.getUint8(21);
    const b1 = view.getUint8(22);
    const b2 = view.getUint8(23);
    const b3 = view.getUint8(24);
    const width = 1 + (((b1 & 0x3f) << 8) | b0);
    const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width, height };
  }
  return null;
}

function readJpeg(view: DataView): ImageDimensions | null {
  let offset = 2; // Skip the 0xFFD8 SOI marker.
  while (offset < view.byteLength - 1) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = view.getUint8(offset + 1);
    // SOF0–SOF3, SOF5–SOF7, SOF9–SOF11, SOF13–SOF15 all carry frame dimensions.
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > view.byteLength) return null;
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      return { width, height };
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const segmentLength = view.getUint16(offset + 2, false);
    offset += 2 + segmentLength;
  }
  return null;
}

export function readImageDimensions(bytes: ArrayBuffer, mimeType: string): ImageDimensions | null {
  try {
    const view = new DataView(bytes);
    if (mimeType === 'image/png') return readPng(view);
    if (mimeType === 'image/gif') return readGif(view);
    if (mimeType === 'image/webp') return readWebp(view);
    if (mimeType === 'image/jpeg') return readJpeg(view);
    return null;
  } catch {
    return null;
  }
}
