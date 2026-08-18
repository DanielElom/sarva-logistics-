import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PREFIXES = [
  '/welcome',
  '/login',
  '/register',
  '/select-role',
  '/status',
  '/shared',
  '/dev-tools',
  '/_next',
  '/favicon',
  '/api',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic = PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
  if (isPublic) return NextResponse.next()

  // Root path is always accessible (handles its own redirect)
  if (pathname === '/') return NextResponse.next()

  const token = request.cookies.get('sarva-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/welcome', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|icons).*)'],
}
