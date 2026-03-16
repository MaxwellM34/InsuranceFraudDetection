'use client'

import { cn } from '@/lib/utils'

interface RiskBadgeProps {
  score: number
  isBlacklisted?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function RiskBadge({ score, isBlacklisted = false, size = 'md' }: RiskBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  let colorClass: string
  let label: string

  if (isBlacklisted) {
    colorClass = 'bg-gray-700 text-white'
    label = 'Liste noire'
  } else if (score < 30) {
    colorClass = 'bg-green-100 text-green-800 border border-green-200'
    label = `${score}`
  } else if (score < 70) {
    colorClass = 'bg-amber-100 text-amber-800 border border-amber-200'
    label = `${score}`
  } else {
    colorClass = 'bg-red-100 text-red-800 border border-red-200'
    label = `${score}`
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold tabular-nums',
        sizeClasses[size],
        colorClass,
      )}
      title={`Score de risque: ${score}/100`}
    >
      {isBlacklisted ? label : `${score}/100`}
    </span>
  )
}
