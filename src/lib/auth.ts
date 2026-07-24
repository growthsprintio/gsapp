// Shared helpers for the site-password gate (server-side).
export const AUTH_COOKIE = 'gs_auth';

export async function authToken(password: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || 'growthsprint-default-secret';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${password}:${secret}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
