import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Explicitly run on Edge runtime for lightweight, low-latency auth checks.
// In Next.js 16, proxy/middleware defaults to Node.js runtime — Edge is faster
// for this use case since we only use Web APIs (fetch, cookies, headers).
export const runtime = 'experimental-edge'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
