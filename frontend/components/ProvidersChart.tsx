'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import type { Provider } from '@/lib/api'
import { getRiskColor } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface ProvidersChartProps {
  providers: Provider[]
}

function CustomTooltip({ active, payload, t }: {
  active?: boolean
  payload?: { payload: Provider; value: number }[]
  t: { riskScore: string; noData: string }
}) {
  if (!active || !payload?.length) return null
  const provider = payload[0].payload
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold text-gray-800 truncate mb-1">{provider.name}</p>
      <p className="text-xs text-gray-500">
        {t.riskScore}:{' '}
        <span className="font-bold" style={{ color: getRiskColor(provider.risk_score) }}>
          {provider.risk_score}/100
        </span>
      </p>
    </div>
  )
}

export function ProvidersChart({ providers }: ProvidersChartProps) {
  const { t } = useLang()
  const top10 = [...providers].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t.charts.providersTitle}</h3>
      {top10.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          {t.charts.noData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={top10} margin={{ top: 5, right: 10, left: -10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false}
              tickLine={false} angle={-35} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip t={t.charts} />} cursor={{ fill: '#f9fafb' }} />
            <Bar dataKey="risk_score" name={t.charts.riskScore} radius={[4, 4, 0, 0]}>
              {top10.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getRiskColor(entry.risk_score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
