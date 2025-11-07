import QRCode from 'qrcode';
export async function generateQrDataUrl(text, opts = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    width: 256,
    margin: 1,
    ...opts,
  });
}
