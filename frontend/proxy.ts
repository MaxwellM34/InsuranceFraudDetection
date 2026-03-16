import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/providers(.*)',
  '/import(.*)',
])

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // Demo cookie bypasses Clerk entirely
  const demoCookie = request.cookies.get('demo_session')
  if (demoCookie?.value === 'alanadmin') {
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Protect routes — redirects to sign-in if not authenticated
  if (isProtectedRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL('/login', request.url).toString(),
    })
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
