'use client'

import type { Claim } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface ClaimsTableProps {
  claims: Claim[]
  isLoading?: boolean
}

function getAmountColor(amount: number, avg: number): string {
  const ratio = avg > 0 ? amount / avg : 1
  if (ratio > 1.5) return 'text-[#D62839] font-semibold'
  if (ratio > 1.2) return 'text-[#E07B39] font-medium'
  return 'text-gray-700'
}

export function ClaimsTable({ claims, isLoading = false }: ClaimsTableProps) {
  const { t } = useLang()

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    )
  }

  if (claims.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-sm">{t.claims.noResults}</p>
      </div>
    )
  }

  const avgAmount = claims.reduce((sum, c) => sum + c.amount, 0) / claims.length

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.claims.colPeriod}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.claims.colCategory}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.claims.colMemberId}
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.claims.colAmount}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {claims.map((claim) => (
            <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 text-gray-700">
                {t.months[claim.month - 1]} {claim.year}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    claim.category === 'Lunettes'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {claim.category}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{claim.member_id}</td>
              <td className={`px-4 py-3 text-right tabular-nums ${getAmountColor(claim.amount, avgAmount)}`}>
                {formatCurrency(claim.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50">
            <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-600">
              {t.claims.total(claims.length)}
            </td>
            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 tabular-nums">
              {formatCurrency(claims.reduce((sum, c) => sum + c.amount, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
