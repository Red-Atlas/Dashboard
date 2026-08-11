/**
 * Session handling for the dashboard.
 *
 * The password used to live in NEXT_PUBLIC_DASHBOARD_PASSWORD, which meant it
 * was inlined into the JavaScript bundle every visitor downloads. It now lives
 * in DASHBOARD_PASSWORD (server only) and is exchanged for a signed, httpOnly
 * cookie that the proxy verifies on every request.
 *
 * Uses Web Crypto rather than node:crypto so the same code runs unchanged in
 * route handlers and in proxy.ts.
 */

export const SESSION_COOKIE = "atlas_dashboard_session";

/** How long a login lasts. Long-lived on purpose: this runs on office TVs. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const encoder = new TextEncoder();

function getSecret(): string {
  const secret = process.env.DASHBOARD_AUTH_SECRET;
  if (secret) return secret;

  // Fall back to deriving the signing key from the password. Not ideal, but it
  // keeps the app bootable with a single env var, and rotating the password
  // then also invalidates every outstanding session.
  const password = process.env.DASHBOARD_PASSWORD;
  if (password) return `derived:${password}`;

  throw new Error(
    "Neither DASHBOARD_AUTH_SECRET nor DASHBOARD_PASSWORD is configured"
  );
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  // base64url so the value is cookie-safe without escaping.
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Comparison that doesn't leak the answer through timing. */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // Always compare the same number of bytes so length isn't a side channel.
  const length = Math.max(aBytes.length, bBytes.length);
  let mismatch = aBytes.length === bBytes.length ? 0 : 1;
  for (let i = 0; i < length; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

export function isPasswordCorrect(candidate: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(candidate, expected);
}

/** Builds a `<expiry>.<signature>` token. */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(payload)}`;
}

export async function isSessionTokenValid(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;

  try {
    return timingSafeEqual(signature, await hmac(payload));
  } catch {
    // Missing secret — treat as unauthenticated rather than crashing.
    return false;
  }
}
