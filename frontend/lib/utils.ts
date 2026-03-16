export const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(dateStr: string, lang: 'fr' | 'en' = 'fr'): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function getMonthName(month: number): string {
  return FRENCH_MONTHS[month - 1] ?? `Mois ${month}`
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 30) return 'low'
  if (score < 70) return 'medium'
  return 'high'
}

export function getRiskColor(score: number): string {
  if (score < 30) return '#2A9D5C'
  if (score < 70) return '#E07B39'
  return '#D62839'
}

export function getRiskBgClass(score: number, isBlacklisted = false): string {
  if (isBlacklisted) return 'bg-gray-500 text-white'
  if (score < 30) return 'bg-green-100 text-green-800'
  if (score < 70) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'auto_approved': return 'Approuvé auto.'
    case 'needs_review': return 'À réviser'
    case 'auto_held': return 'Suspendu auto.'
    case 'blacklisted': return 'Liste noire'
    default: return status
  }
}

export function getStatusClass(status: string): string {
  switch (status) {
    case 'auto_approved': return 'bg-green-100 text-green-800'
    case 'needs_review': return 'bg-amber-100 text-amber-800'
    case 'auto_held': return 'bg-red-100 text-red-800'
    case 'blacklisted': return 'bg-gray-700 text-white'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function getActionLabel(action: string): string {
  switch (action) {
    case 'approved': return 'Approuvé'
    case 'flagged': return 'Signalé'
    case 'escalated': return 'Escaladé'
    case 'blacklisted': return 'Liste noire'
    default: return action
  }
}

export function getActionClass(action: string): string {
  switch (action) {
    case 'approved': return 'bg-green-100 text-green-800'
    case 'flagged': return 'bg-amber-100 text-amber-800'
    case 'escalated': return 'bg-orange-100 text-orange-800'
    case 'blacklisted': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
