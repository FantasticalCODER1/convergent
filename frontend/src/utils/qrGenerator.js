/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Utility helper for generating QR code data URLs.
// TODO: Cache generated QR codes for offline verification workflows.

import QRCode from 'qrcode';

export async function generateQrDataUrl(text) {
  try {
    return await QRCode.toDataURL(text, { margin: 1, width: 256 });
  } catch (error) {
    console.error('Failed to generate QR code', error);
    return null;
  }
}
