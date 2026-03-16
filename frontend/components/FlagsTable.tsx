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

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const color = pct >= 50 ? '#D62839' : pct >= 25 ? '#E07B39' : '#2A9D5C'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right">{value}</span>
    </div>
  )
}

function describeGroup(rule: string, ruleFlags: FraudFlag[], lang: 'fr' | 'en'): string {
  const fmt = formatCurrency

  if (rule === 'monthly_spike') {
    const categories = [...new Set(ruleFlags.map((f) => (f.details as { category: string }).category))]
    const n = ruleFlags.length
    return lang === 'fr'
      ? `${n} pic${n > 1 ? 's' : ''} anormal${n > 1 ? 'aux' : ''} détecté${n > 1 ? 's' : ''} — catégorie${n > 1 ? 's' : ''} : ${categories.join(', ')}`
      : `${n} abnormal spike${n > 1 ? 's' : ''} detected — categor${n > 1 ? 'ies' : 'y'}: ${categories.join(', ')}`
  }

  if (rule === 'dual_product') {
    const { dual_ratio, dual_count, active_months } = ruleFlags[0].details as {
      dual_ratio: number; dual_count: number; active_months: number
    }
    const pct = Math.round(dual_ratio * 100)
    return lang === 'fr'
      ? `Co-facturation Lunettes + Lentilles systématique sur ${dual_count}/${active_months} mois (${pct}%)`
      : `Systematic glasses + contacts co-billing across ${dual_count}/${active_months} months (${pct}%)`
  }

  if (rule === 'repeated_amount') {
    const n = ruleFlags.length
    return lang === 'fr'
      ? `${n} montant${n > 1 ? 's' : ''} identique${n > 1 ? 's' : ''} répété${n > 1 ? 's' : ''} détecté${n > 1 ? 's' : ''}`
      : `${n} repeated identical amount${n > 1 ? 's' : ''} detected`
  }

  return ''
}

function describeSingleFlag(rule: string, details: Record<string, unknown>, lang: 'fr' | 'en'): string {
  const fmt = formatCurrency
  if (rule === 'monthly_spike') {
    const { category, current_amount, median, ratio } = details as {
      category: string; current_amount: number; median: number; ratio: number
    }
    return lang === 'fr'
      ? `${category} : ${fmt(current_amount)} ce mois — ${ratio}× la médiane 6 mois (${fmt(median)})`
      : `${category}: ${fmt(current_amount)} this month — ${ratio}× the 6-month median (${fmt(median)})`
  }
  if (rule === 'repeated_amount') {
    const { category, amount, occurrences } = details as {
      category: string; amount: number; occurrences: number
    }
    return lang === 'fr'
      ? `${category} : ${fmt(amount)} × ${occurrences} fois sur 12 mois`
      : `${category}: ${fmt(amount)} × ${occurrences} times in 12 months`
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
    const { months } = flag.details as { months: { year: number; month: number }[] }
    const monthSet = new Set(months.map((m) => `${m.year}-${m.month}`))
    return claims.filter((c) => monthSet.has(`${c.year}-${c.month}`))
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

function EvidencePanel({ flag, claims }: { flag: FraudFlag; claims: Claim[] }) {
  const { t, lang } = useLang()
  const evidence = getEvidenceClaims(flag, claims)
  const rule = flag.rule_triggered
  const details = flag.details

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
        {evidence.length > 0 && <ClaimsEvidenceTable claims={evidence} lang={lang} />}
        <div className="flex items-center gap-6 pt-1 border-t border-gray-100">
          <Stat label={lang === 'fr' ? 'Total ce mois' : 'This month total'} value={formatCurrency(current_amount)} highlight />
          <Stat label={lang === 'fr' ? 'Médiane 6 mois' : '6-month median'} value={formatCurrency(median)} />
          <Stat label="Ratio" value={`${ratio}×`} highlight />
        </div>
      </div>
    )
  }

  if (rule === 'dual_product') {
    const { dual_ratio, dual_count, active_months, months } = details as {
      dual_ratio: number
      dual_count: number
      active_months: number
      months: { year: number; month: number; lunettes: number; lentilles: number }[]
    }
    const pct = Math.round(dual_ratio * 100)
    const totalLunettes = months.reduce((s, m) => s + m.lunettes, 0)
    const totalLentilles = months.reduce((s, m) => s + m.lentilles, 0)
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-6 pb-2 border-b border-gray-100">
          <Stat
            label={lang === 'fr' ? 'Taux de co-facturation' : 'Co-billing rate'}
            value={`${dual_count}/${active_months} ${lang === 'fr' ? 'mois' : 'months'} (${pct}%)`}
            highlight
          />
          <Stat label={lang === 'fr' ? 'Total Lunettes' : 'Total glasses'} value={formatCurrency(totalLunettes)} />
          <Stat label={lang === 'fr' ? 'Total Lentilles' : 'Total contacts'} value={formatCurrency(totalLentilles)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-1.5 pr-6 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Période' : 'Period'}
                </th>
                <th className="text-right py-1.5 pr-6 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Lunettes' : 'Glasses'}
                </th>
                <th className="text-right py-1.5 pr-6 text-gray-400 font-semibold uppercase tracking-wide">
                  {lang === 'fr' ? 'Lentilles' : 'Contacts'}
                </th>
                <th className="text-right py-1.5 text-gray-400 font-semibold uppercase tracking-wide">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {months.map((m) => (
                <tr key={`${m.year}-${m.month}`} className="hover:bg-gray-50">
                  <td className="py-1.5 pr-6 text-gray-600 font-medium">{t.months[m.month - 1]} {m.year}</td>
                  <td className="py-1.5 pr-6 text-right text-gray-700">{formatCurrency(m.lunettes)}</td>
                  <td className="py-1.5 pr-6 text-right text-gray-700">{formatCurrency(m.lentilles)}</td>
                  <td className="py-1.5 text-right font-semibold text-[#D62839]">
                    {formatCurrency(m.lunettes + m.lentilles)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (rule === 'repeated_amount') {
    const { category, amount, occurrences } = details as {
      category: string; amount: number; occurrences: number
    }
    const sorted = [...evidence].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    return (
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {lang === 'fr'
            ? `${occurrences} réclamations ${category} à ${formatCurrency(amount)} exactement`
            : `${occurrences} ${category} claims at exactly ${formatCurrency(amount)}`}
        </p>
        {sorted.length > 0 && (
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
                    <td className="py-1.5 pr-4 text-gray-600">{t.months[c.month - 1]} {c.year}</td>
                    <td className="py-1.5 pr-4 font-mono text-gray-500">{c.member_id}</td>
                    <td className="py-1.5 text-right font-semibold text-[#D62839]">{formatCurrency(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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

const RULE_ORDER = ['monthly_spike', 'dual_product', 'repeated_amount']

export function FlagsTable({ flags, claims = [], isLoading = false }: FlagsTableProps) {
  const { t, lang } = useLang()
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  // For multi-flag rules, track which sub-flag is expanded
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
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

  // Group flags by rule type
  const groupMap = flags.reduce<Record<string, FraudFlag[]>>((acc, flag) => {
    ;(acc[flag.rule_triggered] ??= []).push(flag)
    return acc
  }, {})

  const groups = RULE_ORDER
    .filter((r) => r in groupMap)
    .concat(Object.keys(groupMap).filter((r) => !RULE_ORDER.includes(r)))
    .map((rule) => ({ rule, ruleFlags: groupMap[rule] }))

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

        {groups.map(({ rule, ruleFlags }) => {
          const isGroupOpen = expandedRule === rule
          const title = t.flags.ruleLabels[rule] ?? rule
          const icon = RULE_ICON[rule]
          const totalScore = ruleFlags.reduce((s, f) => s + f.score_contribution, 0)
          const groupDescription = describeGroup(rule, ruleFlags, lang)

          // Period: range from first to last flag
          const sorted = [...ruleFlags].sort((a, b) =>
            a.year !== b.year ? a.year - b.year : a.month - b.month,
          )
          const first = sorted[0]
          const last = sorted[sorted.length - 1]
          const periodLabel =
            first === last || (first.year === last.year && first.month === last.month)
              ? `${t.months[first.month - 1]} ${first.year}`
              : `${t.months[first.month - 1]} ${first.year} – ${t.months[last.month - 1]} ${last.year}`

          return (
            <tbody key={rule} className="divide-y divide-gray-50">
              {/* ── Group header row ── */}
              <tr
                className={`cursor-pointer transition-colors ${
                  isGroupOpen ? 'bg-red-50/40' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setExpandedRule(isGroupOpen ? null : rule)
                  setExpandedSubId(null)
                }}
              >
                <td className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-[#D62839]/10 flex items-center justify-center text-[#D62839]">
                      {icon ?? <span className="w-2 h-2 rounded-full bg-[#D62839]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 text-sm">{title}</p>
                        {ruleFlags.length > 1 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-full bg-[#D62839]/10 text-[#D62839]">
                            {ruleFlags.length}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 max-w-md">{groupDescription}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <ScoreBar value={Math.round(totalScore)} />
                </td>
                <td className="px-4 py-4 text-gray-600 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {periodLabel}
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isGroupOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </td>
              </tr>

              {/* ── Expanded group body ── */}
              {isGroupOpen && (
                <tr>
                  <td colSpan={3} className="px-4 pb-1 bg-red-50/20 border-t border-[#D62839]/10">
                    <div className="ml-10 space-y-4 py-3">

                      {/* For dual_product (single consolidated flag) — show evidence directly */}
                      {rule === 'dual_product' && (
                        <EvidencePanel flag={ruleFlags[0]} claims={claims} />
                      )}

                      {/* For multi-flag rules — show each sub-flag as a nested expandable */}
                      {rule !== 'dual_product' &&
                        ruleFlags.map((flag) => {
                          const subOpen = expandedSubId === flag.id
                          const subDesc = describeSingleFlag(rule, flag.details, lang)
                          const hasEvidence = getEvidenceClaims(flag, claims).length > 0

                          return (
                            <div
                              key={flag.id}
                              className="border border-gray-100 rounded-lg overflow-hidden"
                            >
                              <button
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors ${
                                  subOpen ? 'bg-gray-50' : 'hover:bg-gray-50/70'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedSubId(subOpen ? null : flag.id)
                                }}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                    {t.months[flag.month - 1]} {flag.year}
                                  </span>
                                  <span className="text-xs text-gray-600 truncate">{subDesc}</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                  <span className="text-xs font-semibold text-[#D62839]">
                                    +{flag.score_contribution}
                                  </span>
                                  {hasEvidence && (
                                    <svg
                                      className={`w-3.5 h-3.5 text-gray-400 transition-transform ${subOpen ? 'rotate-180' : ''}`}
                                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )}
                                </div>
                              </button>

                              {subOpen && (
                                <div className="px-4 py-3 border-t border-gray-100 bg-white">
                                  <EvidencePanel flag={flag} claims={claims} />
                                </div>
                              )}
                            </div>
                          )
                        })}
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
