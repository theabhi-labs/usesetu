import crypto from 'crypto';
import QRCode from 'qrcode';

// Base32 alphabet as defined by RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string to Buffer
 */
export function base32Decode(input: string): Buffer {
  const cleanInput = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanInput.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanInput[i]);
    if (idx === -1) {
      continue; // Skip unrecognized characters
    }
    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a cryptographically secure random Base32 secret for TOTP (20 bytes = 160 bits)
 */
export function generateTotpSecret(length: number = 20): string {
  const randomBytes = crypto.randomBytes(length);
  return base32Encode(randomBytes);
}

/**
 * Generates a 6-digit TOTP token for a given secret at a specific counter/time step
 */
export function generateTotpToken(secret: string, timeStepWindow: number = 0, stepSeconds: number = 30): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const timeStep = Math.floor(epoch / stepSeconds) + timeStepWindow;

  // Counter buffer (8 bytes big-endian)
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const otp = binaryCode % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP token allowing a +/- 1 step window (60s drift tolerance)
 */
export function verifyTotpToken(secret: string, token: string, windowSteps: number = 1, stepSeconds: number = 30): boolean {
  if (!secret || !token || token.length !== 6) {
    return false;
  }

  const cleanToken = token.trim();
  for (let w = -windowSteps; w <= windowSteps; w++) {
    const expected = generateTotpToken(secret, w, stepSeconds);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Builds an otpauth:// URI for authenticator applications (Google Authenticator, Microsoft Authenticator)
 */
export function generateOtpAuthUri(label: string, secret: string, issuer: string = 'UseSetu'): string {
  const encodedLabel = encodeURIComponent(label);
  const encodedIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encodedIssuer}:${encodedLabel}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a QR Code Data URL from an otpauth URI
 */
export async function generateQrCodeDataUrl(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 256,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Generates emergency backup recovery codes (e.g. 8 codes formatted as XXXX-XXXX)
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
