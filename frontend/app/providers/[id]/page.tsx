'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Layout } from '@/components/Layout'
import { RiskBadge } from '@/components/RiskBadge'
import { StatsCard } from '@/components/StatsCard'
import { ClaimsTable } from '@/components/ClaimsTable'
import { FlagsTable } from '@/components/FlagsTable'
import { ReviewPanel } from '@/components/ReviewPanel'
import { ProviderMonthlyChart } from '@/components/MonthlyChart'
import { getProviderDetail } from '@/lib/api'
import { useLang } from '@/lib/lang-context'
import { formatCurrency, getStatusClass } from '@/lib/utils'
import type { ProviderDetail, Claim } from '@/lib/api'

type Tab = 'overview' | 'claims' | 'flags' | 'review'

export default function ProviderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLang()
  const id = params.id as string

  const [detail, setDetail] = useState<ProviderDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: t.providerDetail.tabOverview },
    { id: 'claims',   label: t.providerDetail.tabClaims },
    { id: 'flags',    label: t.providerDetail.tabFlags },
    { id: 'review',   label: t.providerDetail.tabReview },
  ]

  const loadDetail = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getProviderDetail(id)
      setDetail(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.providerDetail.notFound)
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    loadDetail()
  }, [loadDetail])

  const provider = detail?.provider
  const claims   = detail?.claims  ?? []
  const flags    = detail?.flags   ?? []
  const reviews  = detail?.reviews ?? []

  const totalAmount    = claims.reduce((sum, c) => sum + c.amount, 0)
  const lunettesTotal  = claims.filter((c) => c.category === 'Lunettes').reduce((sum, c) => sum + c.amount, 0)
  const lentillesTotal = claims.filter((c) => c.category === 'Lentilles').reduce((sum, c) => sum + c.amount, 0)

  const monthTotals: Record<string, number> = {}
  for (const claim of claims) {
    const key = `${t.months[claim.month - 1]} ${claim.year}`
    monthTotals[key] = (monthTotals[key] ?? 0) + claim.amount
  }
  const topMonth = Object.entries(monthTotals).sort(([, a], [, b]) => b - a)[0]

  function buildChartData(claims: Claim[]) {
    const map: Record<string, { lunettes: number; lentilles: number }> = {}
    for (const claim of claims) {
      const key = `${claim.year}-${String(claim.month).padStart(2, '0')}`
      if (!map[key]) map[key] = { lunettes: 0, lentilles: 0 }
      if (claim.category === 'Lunettes') map[key].lunettes += claim.amount
      else map[key].lentilles += claim.amount
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => {
        const [year, monthNum] = key.split('-')
        const name = t.months[parseInt(monthNum) - 1]
        return { month: `${name?.substring(0, 3) ?? monthNum} ${year}`, ...values }
      })
  }

  const monthlyChartData = buildChartData(claims)

  if (isLoading) {
    return (
      <Layout title="..." subtitle={t.providerDetail.loading}>
        <div className="space-y-5 animate-pulse">
          <div className="h-24 bg-white rounded-xl border border-gray-100" />
          <div className="grid grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-gray-100" />
            ))}
          </div>
          <div className="h-64 bg-white rounded-xl border border-gray-100" />
        </div>
      </Layout>
    )
  }

  if (error || !provider) {
    return (
      <Layout title={t.providerDetail.notFound}>
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
          <p className="text-[#D62839] font-medium mb-2">{error ?? t.providerDetail.notFound}</p>
          <div className="flex justify-center gap-3 mt-4">
            <button onClick={loadDetail} className="text-sm bg-[#1A2440] text-white px-4 py-2 rounded-lg hover:bg-[#243255] transition-colors">
              {t.providerDetail.retry}
            </button>
            <button onClick={() => router.back()} className="text-sm border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              {t.providerDetail.goBack}
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.providerDetail.back}
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#1A2440] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">{provider.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{provider.name}</h1>
                <p className="text-sm text-gray-400 mt-0.5">ID: {provider.id}</p>
                {provider.last_flagged && (
                  <p className="text-xs text-[#E07B39] mt-1">
                    {t.providerDetail.lastFlagged} {provider.last_flagged}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusClass(provider.status)}`}>
                {t.statuses[provider.status] ?? provider.status}
              </span>
              <RiskBadge score={provider.risk_score} isBlacklisted={provider.is_blacklisted} size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white rounded-t-xl px-4 pt-4 shadow-sm border border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-semibold transition-colors -mb-px ${
              activeTab === tab.id ? 'text-[#1A2440] border-b-2 border-[#1A2440]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.id === 'flags' && flags.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-[#D62839] text-white">
                {flags.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title={t.providerDetail.totalAmount}
              value={formatCurrency(totalAmount)}
              subtitle={t.providerDetail.claimsCount(claims.length)}
              accentColor="blue"
            />
            <StatsCard
              title={t.providerDetail.topMonth}
              value={topMonth ? formatCurrency(topMonth[1]) : '—'}
              subtitle={topMonth ? topMonth[0] : t.providerDetail.noData}
              accentColor="amber"
            />
            <StatsCard
              title={t.providerDetail.lentilles}
              value={formatCurrency(lentillesTotal)}
              subtitle={t.providerDetail.claimsCount(claims.filter((c) => c.category === 'Lentilles').length)}
              accentColor="default"
            />
            <StatsCard
              title={t.providerDetail.lunettes}
              value={formatCurrency(lunettesTotal)}
              subtitle={t.providerDetail.claimsCount(claims.filter((c) => c.category === 'Lunettes').length)}
              accentColor="green"
            />
          </div>
          <ProviderMonthlyChart data={monthlyChartData} />
        </div>
      )}

      {activeTab === 'claims' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">{t.providerDetail.claimsTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t.providerDetail.claimsSubtitle(claims.length)}</p>
          </div>
          <div className="p-4"><ClaimsTable claims={claims} /></div>
        </div>
      )}

      {activeTab === 'flags' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">{t.providerDetail.flagsTitle}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{t.providerDetail.flagsSubtitle(flags.length)}</p>
          </div>
          <div className="p-4"><FlagsTable flags={flags} claims={claims} /></div>
        </div>
      )}

      {activeTab === 'review' && (
        <ReviewPanel providerId={id} reviews={reviews} onReviewSubmitted={loadDetail} />
      )}
    </Layout>
  )
}
