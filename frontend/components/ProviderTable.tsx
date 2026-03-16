'use client'

import { useRouter } from 'next/navigation'
import type { Provider } from '@/lib/api'
import { RiskBadge } from './RiskBadge'
import { formatCurrency, getStatusClass } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface ProviderTableProps {
  providers: Provider[]
  isLoading?: boolean
}

export function ProviderTable({ providers, isLoading = false }: ProviderTableProps) {
  const router = useRouter()
  const { t } = useLang()

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50">
              <div className="h-4 bg-gray-200 rounded w-48" />
              <div className="h-4 bg-gray-200 rounded w-24 ml-auto" />
              <div className="h-6 bg-gray-200 rounded-full w-16" />
              <div className="h-6 bg-gray-200 rounded-full w-20" />
              <div className="h-8 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (providers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-gray-400 text-sm">{t.providerTable.noProviders}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.providerTable.colName}
            </th>
            <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.providerTable.colTotal}
            </th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.providerTable.colScore}
            </th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.providerTable.colStatus}
            </th>
            <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.providerTable.colActions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {providers.map((provider) => (
            <tr
              key={provider.id}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => router.push(`/providers/${provider.id}`)}
            >
              <td className="px-6 py-4">
                <div>
                  <p className="font-medium text-gray-900">{provider.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">ID: {provider.id}</p>
                </div>
              </td>
              <td className="px-6 py-4 text-right font-medium text-gray-700 tabular-nums">
                {provider.total_amount != null ? formatCurrency(provider.total_amount) : '—'}
              </td>
              <td className="px-6 py-4 text-center">
                <RiskBadge score={provider.risk_score} isBlacklisted={provider.is_blacklisted} />
              </td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClass(provider.status)}`}
                >
                  {t.statuses[provider.status] ?? provider.status}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/providers/${provider.id}`)
                  }}
                  className="text-xs font-medium text-[#1A2440] hover:text-[#243255] underline underline-offset-2 transition-colors"
                >
                  {t.providerTable.viewDetail}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
