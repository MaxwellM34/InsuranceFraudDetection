// Holds Clerk's getToken function — set by ClerkTokenSync on mount
let _getToken: (() => Promise<string | null>) | null = null

export function setGetTokenFn(fn: (() => Promise<string | null>) | null) {
  _getToken = fn
}

export function isDemoMode(): boolean {
  if (typeof document !== 'undefined') {
    return document.cookie.includes('demo_session=alanadmin')
  }
  return false
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  if (isDemoMode()) {
    return { 'X-Demo-Token': 'alanadmin' }
  }
  if (_getToken) {
    const token = await _getToken()
    if (token) return { 'Authorization': `Bearer ${token}` }
  }
  return {}
}
