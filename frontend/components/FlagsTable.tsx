'use client'

import { useState } from 'react'
import type { Claim, FraudFlag } from '@/lib/api'
import { useLang } from '@/lib/lang-context'
import { formatCurrency } from '@/lib/utils'

interface FlagsTableProps {
  flags: FraudFlag[]
  claims?: Claim[]
  isLoading?: boolean
}

function ScoreBar({ value }: { value: number }) {
  const capped = Math.min(100, Math.max(0, value))
  const color = capped >= 30 ? '#D62839' : capped >= 15 ? '#E07B39' : '#2A9D5C'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${capped}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right">{value}</span>
    </div>
  )
}

function describeFlagDetails(rule: string, details: Record<string, unknown>, lang: 'fr' | 'en'): string {
  const fmt = formatCurrency
  if (rule === 'monthly_spike') {
    const { category, current_amount, median, ratio } = details as {
      category: string; current_amount: number; median: number; ratio: number
    }
    return lang === 'fr'
      ? `${category} : ${fmt(current_amount)} facturé — soit ${ratio}× la médiane des 6 derniers mois (${fmt(median)})`
      : `${category}: ${fmt(current_amount)} billed — ${ratio}× the 6-month rolling median (${fmt(median)})`
  }
  if (rule === 'dual_product') {
    const { member_id, lunettes_amount, lentilles_amount } = details as {
      member_id: string; lunettes_amount: number; lentilles_amount: number
    }
    return lang === 'fr'
      ? `Membre ${member_id} : Lunettes (${fmt(lunettes_amount)}) et Lentilles (${fmt(lentilles_amount)}) facturées le même mois`
      : `Member ${member_id}: glasses (${fmt(lunettes_amount)}) and contacts (${fmt(lentilles_amount)}) billed in the same month`
  }
  if (rule === 'repeated_amount') {
    const { category, amount, occurrences } = details as {
      category: string; amount: number; occurrences: number
    }
    return lang === 'fr'
      ? `${category} : ${fmt(amount)} facturé ${occurrences} fois sur une fenêtre de 12 mois`
      : `${category}: ${fmt(amount)} billed ${occurrences} times within a 12-month window`
  }
  return ''
}

/** Returns the subset of claims that directly triggered this flag. */
function getEvidenceClaims(flag: FraudFlag, claims: Claim[]): Claim[] {
  const d = flag.details

  if (flag.rule_triggered === 'monthly_spike') {
    const { category } = d as { category: string }
    return claims.filter(
      (c) => c.year === flag.year && c.month === flag.month && c.category === category,
    )
  }

  if (flag.rule_triggered === 'dual_product') {
    const { member_id } = flag.details as { member_id: string }
    return claims.filter(
      (c) => c.year === flag.year && c.month === flag.month && c.member_id === member_id,
    )
  }

  if (flag.rule_triggered === 'repeated_amount') {
    const { category, amount, months_seen } = d as {
      category: string
      amount: number
      months_seen: { year: number; month: number }[]
    }
    const seen = new Set(months_seen.map((m) => `${m.year}-${m.month}`))
    return claims.filter(
      (c) =>
        c.category === category &&
        Math.abs(c.amount - amount) < 0.01 &&
        seen.has(`${c.year}-${c.month}`),
    )
  }

  return []
}

function EvidencePanel({
  flag,
  claims,
}: {
  flag: FraudFlag
  claims: Claim[]
}) {
  const { t, lang } = useLang()
  const evidence = getEvidenceClaims(flag, claims)

  if (evidence.length === 0) return null

  const rule = flag.rule_triggered
  const details = flag.details

  /* ---------- monthly_spike: show current claims + median context ---------- */
  if (rule === 'monthly_spike') {
    const { category, median, ratio, current_amount } = details as {
      category: string; current_amount: number; median: number; ratio: number
    }
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {lang === 'fr'
            ? `Réclamations ${category} — ${t.months[flag.month - 1]} ${flag.year}`
            : `${category} claims — ${t.months[flag.month - 1]} ${flag.year}`}
        </p>
        <ClaimsEvidenceTable claims={evidence} lang={lang} />
        <div className="flex items-center gap-6 pt-1 border-t border-gray-100">
          <Stat
            label={lang === 'fr' ? 'Total ce mois' : 'This month total'}
            value={formatCurrency(current_amount)}
            highlight
          />
          <Stat
            label={lang === 'fr' ? 'Médiane 6 mois' : '6-month median'}
            value={formatCurrency(median)}
          />
          <Stat
            label={lang === 'fr' ? 'Ratio' : 'Ratio'}
            value={`${ratio}×`}
            highlight
          />
        </div>
      </div>
    )
  }

  /* ---------- dual_product: same member, both categories ---------- */
  if (rule === 'dual_product') {
    const { member_id, lunettes_amount, lentilles_amount } = details as {
      member_id: string; lunettes_amount: number; lentilles_amount: number
    }
    const lunettes = evidence.filter((c) => c.category === 'Lunettes')
    const lentilles = evidence.filter((c) => c.category === 'Lentilles')
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {lang === 'fr'
            ? `Membre ${member_id} — deux catégories le même mois`
            : `Member ${member_id} — two categories in the same month`}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{lang === 'fr' ? 'Lunettes' : 'Glasses'}</p>
              <span className="text-xs font-bold text-gray-900">{formatCurrency(lunettes_amount)}</span>
            </div>
            <ClaimsEvidenceTable claims={lunettes} lang={lang} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">{lang === 'fr' ? 'Lentilles' : 'Contacts'}</p>
              <span className="text-xs font-bold text-gray-900">{formatCurrency(lentilles_amount)}</span>
            </div>
            <ClaimsEvidenceTable claims={lentilles} lang={lang} />
          </div>
        </div>
      </div>
    )
  }

  /* ---------- repeated_amount: show each occurrence ---------- */
  if (rule === 'repeated_amount') {
    const { category, amount, occurrences } = details as {
      category: string; amount: number; occurrences: number
    }
    const sorted = [...evidence].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {lang === 'fr'
              ? `${occurrences} réclamations ${category} à ${formatCurrency(amount)} exactement`
              : `${occurrences} ${category} claims at exactly ${formatCurrency(amount)}`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 pr-4 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Période' : 'Period'}
                </th>
                <th className="text-left py-1.5 pr-4 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Membre' : 'Member'}
                </th>
                <th className="text-right py-1.5 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Montant' : 'Amount'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 pr-4 text-gray-600">
                    {t.months[c.month - 1]} {c.year}
                  </td>
                  <td className="py-1.5 pr-4 font-mono text-gray-500">{c.member_id}</td>
                  <td className="py-1.5 text-right font-semibold text-[#D62839]">
                    {formatCurrency(c.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return null
}

function ClaimsEvidenceTable({ claims, lang }: { claims: Claim[]; lang: 'fr' | 'en' }) {
  const { t } = useLang()
  if (claims.length === 0) return <p className="text-xs text-gray-400 italic">—</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-1.5 pr-4 text-gray-400 font-semibold uppercase tracking-wide">
              {lang === 'fr' ? 'Membre' : 'Member'}
            </th>
            <th className="text-right py-1.5 text-gray-400 font-semibold uppercase tracking-wide">
              {lang === 'fr' ? 'Montant' : 'Amount'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {claims.map((c) => (
            <tr key={c.id}>
              <td className="py-1.5 pr-4 font-mono text-gray-500">{c.member_id}</td>
              <td className="py-1.5 text-right font-semibold text-gray-900">{formatCurrency(c.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-[#D62839]' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

const RULE_ICON: Record<string, React.ReactNode> = {
  monthly_spike: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  dual_product: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  repeated_amount: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
}

export function FlagsTable({ flags, claims = [], isLoading = false }: FlagsTableProps) {
  const { t, lang } = useLang()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded" />
        ))}
      </div>
    )
  }

  if (flags.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">{t.flags.noFlags}</p>
        <p className="text-gray-400 text-sm mt-1">{t.flags.noFlagsSubtitle}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.flags.colRule}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">
              {t.flags.colScore}
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
              {t.flags.colPeriod}
            </th>
          </tr>
        </thead>
        {flags.map((flag) => {
          const isOpen = expandedId === flag.id
          const title = t.flags.ruleLabels[flag.rule_triggered] ?? flag.rule_triggered
          const description = describeFlagDetails(flag.rule_triggered, flag.details, lang)
          const icon = RULE_ICON[flag.rule_triggered]
          const hasEvidence = getEvidenceClaims(flag, claims).length > 0

          return (
            <tbody key={flag.id} className="divide-y divide-gray-50">
              <tr className={`transition-colors ${isOpen ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-[#D62839]/10 flex items-center justify-center text-[#D62839]">
                      {icon ?? <span className="w-2 h-2 rounded-full bg-[#D62839]" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-md">{description}</p>
                      {hasEvidence && (
                        <button
                          onClick={() => setExpandedId(isOpen ? null : flag.id)}
                          className="mt-2 flex items-center gap-1 text-xs font-medium text-[#1A2440] hover:text-[#243255] transition-colors"
                        >
                          <svg
                            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          {isOpen
                            ? (lang === 'fr' ? 'Masquer les preuves' : 'Hide evidence')
                            : (lang === 'fr' ? 'Voir les réclamations impliquées' : 'View involved claims')}
                        </button>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ScoreBar value={flag.score_contribution} />
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm whitespace-nowrap">
                  {t.months[flag.month - 1]} {flag.year}
                </td>
              </tr>

              {isOpen && (
                <tr className="bg-red-50/30">
                  <td colSpan={3} className="px-4 py-4 border-t border-[#D62839]/10">
                    <div className="ml-10">
                      <EvidencePanel flag={flag} claims={claims} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
