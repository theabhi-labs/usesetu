import QRCode from 'qrcode';

/**
 * Generates a QR code as a base64 data URL for the given text (typically a
 * verification URL like `/track/{applicationNumber}` or a receipt number).
 * Generated on demand rather than persisted — keeps documents small and the
 * QR always reflects the current tracking URL even if the domain changes.
 */
export const generateQrDataUrl = async (text: string): Promise<string> => {
  return QRCode.toDataURL(text, { margin: 1, width: 300 });
};
