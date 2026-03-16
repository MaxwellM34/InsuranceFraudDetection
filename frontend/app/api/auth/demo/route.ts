import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (username === 'alanadmin' && password === 'alanadmin') {
      const response = NextResponse.json({ success: true, message: 'Demo login successful' })
      response.cookies.set('demo_session', 'alanadmin', {
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
      })
      return response
    }

    return NextResponse.json(
      { success: false, message: 'Identifiants incorrects' },
      { status: 401 },
    )
  } catch {
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 },
    )
  }
}
