import QRCode from 'qrcode'

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
