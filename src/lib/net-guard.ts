import { isIP } from 'node:net';

/**
 * Fetching a user-supplied URL from our server is an SSRF primitive: without a
 * guard, anyone with an account could make the server request internal hosts —
 * cloud metadata at 169.254.169.254, a database on a private subnet — and read
 * the reply back through the app. Resolve the hostname first and refuse
 * anything that isn't a public address.
 *
 * Kept free of framework imports so it can be unit-tested on its own.
 */
export function isBlockedAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6 === '::1' || v6 === '::') return true;

    // IPv4-mapped (::ffff:a.b.c.d) must be judged by its v4 rules, or
    // ::ffff:169.254.169.254 would sail straight through.
    const mapped = v6.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);

    if (v6.startsWith('fc') || v6.startsWith('fd')) return true; // unique local
    if (v6.startsWith('fe80')) return true;                      // link local
    return false;
  }

  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  if (a === 0 || a === 127) return true;                 // this host / loopback
  if (a === 10) return true;                             // private
  if (a === 172 && b >= 16 && b <= 31) return true;      // private
  if (a === 192 && b === 168) return true;               // private
  if (a === 169 && b === 254) return true;               // link local / metadata
  if (a === 100 && b >= 64 && b <= 127) return true;     // carrier-grade NAT
  if (a >= 224) return true;                             // multicast / reserved
  return false;
}
