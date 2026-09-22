/* ==========================================================================
   Password hashing (PBKDF2-SHA256 via WebCrypto)
   This is a client-only reference implementation for the demo build: it keeps
   plaintext passwords out of storage and mirrors the shape a real server
   endpoint would use. Move verification server-side before real accounts.
   ========================================================================== */

const ITERATIONS = 150_000;
const KEY_LEN_BITS = 256;

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): ArrayBuffer {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out.buffer;
}

export function randomSalt(bytes = 16): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

export function randomToken(bytes = 24): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

/** Cheap fallback when WebCrypto's subtle API is unavailable (non-HTTPS origins). */
function fallbackHash(password: string, salt: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  const input = `${salt}:${password}:${salt}`;
  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < input.length; i++) {
      h1 ^= input.charCodeAt(i) + round;
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ h1, 2654435761) + i) >>> 0;
    }
  }
  return `fb$${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return fallbackHash(password, salt);
  try {
    const enc = new TextEncoder();
    const pwBytes = enc.encode(password);
    const key = await crypto.subtle.importKey(
      'raw',
      pwBytes.buffer.slice(0, pwBytes.byteLength),
      'PBKDF2',
      false,
      ['deriveBits'],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: fromHex(salt), iterations: ITERATIONS, hash: 'SHA-256' },
      key,
      KEY_LEN_BITS,
    );
    return `pbkdf2$${ITERATIONS}$${toHex(bits)}`;
  } catch {
    return fallbackHash(password, salt);
  }
}

/** Constant-time-ish comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
} {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Use at least 8 characters');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password)) issues.push('Mix upper and lower case');
  if (!/\d/.test(password)) issues.push('Add a number');
  if (/^(password|12345678|qwerty)/i.test(password)) issues.push('Avoid common passwords');
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) || /[^\w\s]/.test(password)) score++;
  if (issues.some((i) => i.startsWith('Avoid'))) score = Math.min(score, 1);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped], issues };
}
