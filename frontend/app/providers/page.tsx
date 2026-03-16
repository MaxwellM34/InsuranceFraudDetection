'use client'

import { useEffect, useState, useCallback } from 'react'
import { Layout } from '@/components/Layout'
import { ProviderTable } from '@/components/ProviderTable'
import { getProviders, runDetection } from '@/lib/api'
import { useLang } from '@/lib/lang-context'
import type { Provider } from '@/lib/api'

export default function ProvidersPage() {
  const { t } = useLang()
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRunningDetection, setIsRunningDetection] = useState(false)
  const [detectionResult, setDetectionResult] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const loadProviders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getProviders()
      setProviders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.providers.detectionError)
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  async function handleRunDetection() {
    setIsRunningDetection(true)
    setDetectionResult(null)
    try {
      const result = await runDetection()
      setDetectionResult(t.providers.detectionDone(result.providers_updated))
      await loadProviders()
    } catch (err) {
      setDetectionResult(err instanceof Error ? err.message : t.providers.detectionError)
    } finally {
      setIsRunningDetection(false)
    }
  }

  const filteredProviders = providers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const isError = detectionResult != null && !detectionResult.startsWith(t.providers.detectionDone(0).split(':')[0])

  return (
    <Layout
      title={t.providers.title}
      subtitle={t.providers.subtitle(providers.length)}
      actions={
        <button
          onClick={handleRunDetection}
          disabled={isRunningDetection}
          className="flex items-center gap-2 bg-[#1A2440] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#243255] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isRunningDetection ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t.providers.runningDetection}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {t.providers.runDetection}
            </>
          )}
        </button>
      }
    >
      {detectionResult && (
        <div className={`mb-5 rounded-xl p-4 flex items-center gap-3 border ${
          isError ? 'bg-red-50 border-red-100 text-[#D62839]' : 'bg-green-50 border-green-100 text-[#2A9D5C]'
        }`}>
          {isError ? (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <p className="text-sm font-medium">{detectionResult}</p>
          <button onClick={() => setDetectionResult(null)} className="ml-auto opacity-60 hover:opacity-100">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-sm text-[#D62839]">{error}</p>
          <button onClick={loadProviders} className="text-xs text-[#D62839] underline mt-1">
            {t.providerDetail.retry}
          </button>
        </div>
      )}

      <div className="mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.providers.search}
            className="w-full max-w-sm border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A2440] focus:border-transparent"
          />
        </div>
      </div>

      <ProviderTable providers={filteredProviders} isLoading={isLoading} />
    </Layout>
  )
}
