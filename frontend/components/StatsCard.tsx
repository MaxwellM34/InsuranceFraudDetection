'use client'

import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  accentColor?: 'green' | 'amber' | 'red' | 'blue' | 'default'
  icon?: React.ReactNode
}

const accentStyles: Record<string, string> = {
  green: 'border-l-4 border-l-[#2A9D5C]',
  amber: 'border-l-4 border-l-[#E07B39]',
  red: 'border-l-4 border-l-[#D62839]',
  blue: 'border-l-4 border-l-blue-500',
  default: '',
}

const accentTextStyles: Record<string, string> = {
  green: 'text-[#2A9D5C]',
  amber: 'text-[#E07B39]',
  red: 'text-[#D62839]',
  blue: 'text-blue-600',
  default: 'text-gray-900',
}

export function StatsCard({
  title,
  value,
  subtitle,
  accentColor = 'default',
  icon,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2',
        accentStyles[accentColor],
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
      <p
        className={cn(
          'text-2xl font-bold tracking-tight',
          accentTextStyles[accentColor],
        )}
      >
        {value}
      </p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}
