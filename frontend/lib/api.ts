import { getAuthHeaders } from './auth'

const BASE_URL = '/api/backend'

export interface Provider {
  id: string
  name: string
  risk_score: number
  status: 'auto_approved' | 'needs_review' | 'auto_held' | 'blacklisted'
  is_blacklisted: boolean
  created_at: string
  total_amount?: number
  last_flagged?: string
}

export interface Claim {
  id: string
  provider_id: string
  member_id: string
  month: number
  year: number
  category: 'Lunettes' | 'Lentilles'
  amount: number
  created_at: string
}

export interface FraudFlag {
  id: string
  provider_id: string
  rule_triggered: string
  score_contribution: number
  month: number
  year: number
  details: Record<string, unknown>
  created_at: string
}

export interface ReviewAction {
  id: string
  provider_id: string
  provider_name?: string
  action: 'approved' | 'flagged' | 'escalated' | 'blacklisted'
  note: string
  reviewed_by: string
  created_at: string
}

export interface DashboardStats {
  total_providers: number
  total_flagged: number
  total_held: number
  total_claims_amount: number
  monthly_totals: { month: string; amount: number }[]
}

export interface DashboardAlert {
  id: string
  name: string
  risk_score: number
  status: string
  is_blacklisted: boolean
  created_at: string
  flag_count: number
  flags: FraudFlag[]
}

export interface ProviderDetail {
  provider: Provider
  claims: Claim[]
  flags: FraudFlag[]
  reviews: ReviewAction[]
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options?.headers,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`API error ${response.status}: ${errorText}`)
  }

  return response.json()
}

export async function getProviders(): Promise<Provider[]> {
  return apiFetch<Provider[]>('/api/providers')
}

export async function getProvider(id: string): Promise<Provider> {
  return apiFetch<Provider>(`/api/providers/${id}`)
}

// Backend GET /api/providers/{id} returns provider + claims + flags + review_actions all-in-one
interface BackendProviderDetail {
  id: string
  name: string
  risk_score: number
  status: string
  is_blacklisted: boolean
  created_at: string
  claims: Array<Omit<Claim, 'provider_id'>>
  flags: Array<Omit<FraudFlag, 'provider_id'>>
  review_actions: Array<Omit<ReviewAction, 'provider_id'>>
}

export async function getProviderDetail(id: string): Promise<ProviderDetail> {
  const data = await apiFetch<BackendProviderDetail>(`/api/providers/${id}`)
  const provider: Provider = {
    id: data.id,
    name: data.name,
    risk_score: data.risk_score,
    status: data.status as Provider['status'],
    is_blacklisted: data.is_blacklisted,
    created_at: data.created_at,
  }
  const claims: Claim[] = data.claims.map((c) => ({ ...c, provider_id: id }))
  const flags: FraudFlag[] = data.flags.map((f) => ({ ...f, provider_id: id }))
  const reviews: ReviewAction[] = data.review_actions.map((r) => ({
    ...r,
    provider_id: id,
    action: r.action as ReviewAction['action'],
  }))
  return { provider, claims, flags, reviews }
}

export async function getClaims(filters?: {
  provider_id?: string
  month?: number
  year?: number
  category?: string
}): Promise<Claim[]> {
  const params = new URLSearchParams()
  if (filters?.provider_id) params.append('provider_id', filters.provider_id)
  if (filters?.month) params.append('month', String(filters.month))
  if (filters?.year) params.append('year', String(filters.year))
  if (filters?.category) params.append('category', filters.category)

  const query = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<Claim[]>(`/api/claims/${query}`)
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/api/dashboard/stats')
}

export async function getDashboardAlerts(): Promise<DashboardAlert[]> {
  return apiFetch<DashboardAlert[]>('/api/dashboard/alerts')
}

export async function getRecentReviews(): Promise<ReviewAction[]> {
  return apiFetch<ReviewAction[]>('/api/reviews?limit=10')
}

export async function submitReview(
  providerId: string,
  action: 'approved' | 'flagged' | 'escalated' | 'blacklisted',
  note: string,
  reviewedBy: string,
): Promise<ReviewAction> {
  return apiFetch<ReviewAction>(`/api/providers/${providerId}/review`, {
    method: 'POST',
    body: JSON.stringify({ action, note, reviewed_by: reviewedBy }),
  })
}

export async function runDetection(): Promise<{ message: string; providers_updated: number }> {
  return apiFetch('/api/detection/run', { method: 'POST' })
}

export async function clearAllData(): Promise<{ message: string }> {
  return apiFetch('/api/claims/clear', { method: 'DELETE' })
}

export async function importCSV(file: File): Promise<{ message: string; rows_imported: number }> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/api/claims/import`, {
    method: 'POST',
    headers: headers as Record<string, string>,
    body: formData,
    credentials: 'include',
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`Import error ${response.status}: ${errorText}`)
  }

  return response.json()
}
