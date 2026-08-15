import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'
import { logPerf, startTimer } from '@/lib/utils/perf-logger'

export async function updateSession(request: NextRequest) {
  const totalEnd = startTimer()

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Single auth call — this is the ONLY network round trip in the proxy
  const getUserEnd = startTimer()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  logPerf('proxy.getUser', getUserEnd())

  const path = request.nextUrl.pathname
  const isPublic = path.startsWith('/_next') || path.startsWith('/favicon.ico') || path.startsWith('/api/') || path.startsWith('/verify/')
  
  if (isPublic) {
    return supabaseResponse
  }

  // If no user and trying to access protected routes or the root page
  if (!user && (path.startsWith('/admin') || path.startsWith('/driver') || path === '/')) {
    const url = request.nextUrl.clone()
    // Send drivers to the driver-specific login, others to the main login
    url.pathname = path.startsWith('/driver') ? '/driver-login' : '/login'
    return NextResponse.redirect(url)
  }

  // Read role directly from JWT app_metadata — NO database query needed
  // The custom_access_token_hook injects user_role into app_metadata on every token issue/refresh
  const role = user?.app_metadata?.user_role as string | undefined

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/driver-login') || path === '/'

  if (user && role) {
    // Set headers so downstream server components can read user info
    // without calling getUser() again
    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-role', role)

    if (isAuthRoute) {
      // Redirect logged-in users away from auth pages to their respective portals
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin/dashboard' : '/driver/trips'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/admin') && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/driver/trips'
      return NextResponse.redirect(url)
    }

    if (path.startsWith('/driver') && role !== 'driver') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/dashboard'
      return NextResponse.redirect(url)
    }
  }

  logPerf('proxy.total', totalEnd())
  return supabaseResponse
}
