import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isPublic = path.startsWith('/_next') || path.startsWith('/favicon.ico') || path.startsWith('/api/') || path.startsWith('/verify/')
  
  if (isPublic) {
    return supabaseResponse
  }

  // If no user and trying to access protected routes or the root page
  if (!user && (path.startsWith('/admin') || path.startsWith('/driver') || path === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user exists, fetch role
  let role: string | undefined
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const profile = data as any
    role = profile?.role
  }

  // If they are logged in but have no valid role, we can't let them access portals.
  // For safety, force them to stay on login or an error page.
  
  const isAuthRoute = path.startsWith('/login') || path === '/'

  if (user && role) {
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

  return supabaseResponse
}
