'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="text-xs">
          {entry.name}: <span className="font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
    </div>
  )
}

interface MonthlyChartProps {
  data: { month: string; amount: number }[]
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const { t } = useLang()
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t.charts.monthlyTitle}</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          {t.charts.noData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k€`} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="amount" name={t.charts.amount}
              stroke="#1A2440" strokeWidth={2.5} dot={{ r: 3, fill: '#1A2440' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

interface ProviderMonthlyChartProps {
  data: { month: string; lunettes: number; lentilles: number }[]
}

export function ProviderMonthlyChart({ data }: ProviderMonthlyChartProps) {
  const { t } = useLang()
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{t.charts.providerMonthlyTitle}</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          {t.charts.noData}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k€`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
            <Line type="monotone" dataKey="lunettes" name={t.charts.lunettes}
              stroke="#1A2440" strokeWidth={2.5} dot={{ r: 3, fill: '#1A2440' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="lentilles" name={t.charts.lentilles}
              stroke="#2A9D5C" strokeWidth={2.5} dot={{ r: 3, fill: '#2A9D5C' }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
