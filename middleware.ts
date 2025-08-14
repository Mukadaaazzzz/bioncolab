import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const { pathname } = req.nextUrl

    // Define protected routes
    const protectedRoutes = ['/dashboard', '/profile', '/challenges', '/challenges/create', '/colab[slug]']
    const authRoutes = ['/signin', '/signup']

    // Check if the current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname.startsWith(route)
    )

    // Check if the current path is an auth route
    const isAuthRoute = authRoutes.some(route => 
      pathname.startsWith(route)
    )

    console.log('Middleware - Path:', pathname, 'Session exists:', !!session)

    // If user is not authenticated and trying to access protected route
    if (!session && isProtectedRoute) {
      console.log('Redirecting to signin - no session for protected route')
      const redirectUrl = new URL('/signin', req.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user is authenticated and trying to access auth routes
    if (session && isAuthRoute) {
      console.log('Redirecting authenticated user away from auth pages')
      const redirectTo = req.nextUrl.searchParams.get('redirectTo')
      const redirectUrl = new URL(redirectTo || '/dashboard', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}