'use client'

import { useEffect, useState, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { StatsCard } from '@/components/StatsCard'
import { ProvidersChart } from '@/components/ProvidersChart'
import { MonthlyChart } from '@/components/MonthlyChart'
import { getDashboardStats, getDashboardAlerts, getRecentReviews, getProviders } from '@/lib/api'
import type { DashboardStats, DashboardAlert, ReviewAction, Provider } from '@/lib/api'
import { formatCurrency, formatNumber, formatDateTime, getActionClass } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-5 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
          <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-32" />
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { t, lang } = useLang()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [reviews, setReviews] = useState<ReviewAction[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [statsData, alertsData, reviewsData, providersData] = await Promise.all([
        getDashboardStats(), getDashboardAlerts(), getRecentReviews(), getProviders(),
      ])
      setStats(statsData)
      setAlerts(alertsData)
      setReviews(reviewsData)
      setProviders(providersData)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.dashboard.apiError)
    } finally {
      setIsLoading(false)
    }
  }, [t.dashboard.apiError])

  useEffect(() => { loadData() }, [loadData])

  const heldProviders = alerts.filter((a) => a.status === 'auto_held')

  return (
    <Layout title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {error && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-[#D62839] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[#D62839]">{t.dashboard.apiError}</p>
            <p className="text-xs text-red-400 mt-0.5">{error}</p>
            <button onClick={loadData} className="text-xs text-[#D62839] underline mt-1 hover:no-underline">
              {t.dashboard.retry}
            </button>
          </div>
        </div>
      )}

      {!isLoading && heldProviders.length > 0 && (
        <div className="mb-6 bg-[#D62839]/10 border border-[#D62839]/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-[#D62839] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-semibold text-[#D62839]">
            {t.dashboard.heldAlert(heldProviders.length)}
          </p>
        </div>
      )}

      {isLoading ? <StatsSkeleton /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          <StatsCard title={t.dashboard.totalProviders} value={stats ? formatNumber(stats.total_providers) : '—'}
            subtitle={t.dashboard.totalProvidersSubtitle} accentColor="default"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
          />
          <StatsCard title={t.dashboard.flagged} value={stats ? formatNumber(stats.total_flagged) : '—'}
            subtitle={t.dashboard.flaggedSubtitle} accentColor="amber"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
          />
          <StatsCard title={t.dashboard.held} value={stats ? formatNumber(stats.total_held) : '—'}
            subtitle={t.dashboard.heldSubtitle} accentColor="red"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>}
          />
          <StatsCard title={t.dashboard.totalAmount} value={stats ? formatCurrency(stats.total_claims_amount) : '—'}
            subtitle={t.dashboard.totalAmountSubtitle} accentColor="green"
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
          <div className="bg-white rounded-xl border border-gray-100 h-64 animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          <ProvidersChart providers={providers} />
          <MonthlyChart data={stats?.monthly_totals ?? []} />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-sm font-semibold text-gray-900">{t.dashboard.recentActivity}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t.dashboard.recentActivitySubtitle}</p>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-48 mb-1.5" />
                  <div className="h-2.5 bg-gray-100 rounded w-32" />
                </div>
                <div className="h-5 w-20 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-400 text-sm">{t.dashboard.noActivity}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reviews.map((review) => (
              <div key={review.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#1A2440] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {review.reviewed_by.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{review.reviewed_by}</span>
                    {' '}{t.dashboard.decidedFor}{' '}
                    <span className="font-medium text-[#1A2440]">{review.provider_name ?? `#${review.provider_id}`}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDateTime(review.created_at, lang)}
                    {review.note && ` — "${review.note}"`}
                  </p>
                </div>
                <span className={`flex-shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionClass(review.action)}`}>
                  {t.actionLabels[review.action] ?? review.action}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
