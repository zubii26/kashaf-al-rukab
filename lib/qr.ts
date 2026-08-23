import QRCode from 'qrcode'

/**
 * Resolves the correct public base URL for the app.
 *
 * Priority order:
 *  1. NEXT_PUBLIC_APP_URL  — explicit override (set in Vercel env vars or .env.local)
 *  2. VERCEL_URL           — Vercel injects this automatically on every deployment
 *                            (no https:// prefix, so we add it)
 *  3. localhost:3000       — local dev fallback only
 *
 * This ensures QR codes always encode the real production URL, not localhost,
 * so they work correctly when scanned from a printed PDF on any device.
 */
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

/**
 * Returns the full public URL for a trip's verification page.
 * Scanning this URL on any phone opens the trip details — no login required.
 */
export function getVerifyUrl(tripId: string): string {
  return `${getAppUrl()}/verify/${tripId}`
}

/**
 * Generates a QR code as an inline SVG string.
 * Safe to call in Next.js server components — runs only on the server.
 *
 * @param url  The URL to encode in the QR code.
 * @returns    An SVG string ready to be embedded via dangerouslySetInnerHTML.
 */
export async function generateQRSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#14213D',  // matches the brand dark-navy used throughout the print layout
      light: '#FFFFFF',
    },
  })
}
