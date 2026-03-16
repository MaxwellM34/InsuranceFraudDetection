'use client'

import { useState } from 'react'
import type { ReviewAction } from '@/lib/api'
import { submitReview } from '@/lib/api'
import { formatDateTime, getActionClass } from '@/lib/utils'
import { useLang } from '@/lib/lang-context'

interface ReviewPanelProps {
  providerId: string
  reviews: ReviewAction[]
  onReviewSubmitted?: () => void
}

type ActionType = 'approved' | 'flagged' | 'escalated' | 'blacklisted'

const actionStyles: Record<ActionType, string> = {
  approved: 'border-[#2A9D5C] text-[#2A9D5C] hover:bg-[#2A9D5C] hover:text-white data-[selected=true]:bg-[#2A9D5C] data-[selected=true]:text-white',
  flagged: 'border-[#E07B39] text-[#E07B39] hover:bg-[#E07B39] hover:text-white data-[selected=true]:bg-[#E07B39] data-[selected=true]:text-white',
  escalated: 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white data-[selected=true]:bg-orange-500 data-[selected=true]:text-white',
  blacklisted: 'border-[#D62839] text-[#D62839] hover:bg-[#D62839] hover:text-white data-[selected=true]:bg-[#D62839] data-[selected=true]:text-white',
}

export function ReviewPanel({ providerId, reviews, onReviewSubmitted }: ReviewPanelProps) {
  const { t, lang } = useLang()
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [note, setNote] = useState('')
  const [reviewedBy, setReviewedBy] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const actionKeys: ActionType[] = ['approved', 'flagged', 'escalated', 'blacklisted']

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAction) { setError(t.review.selectAction); return }
    if (!reviewedBy.trim()) { setError(t.review.enterName); return }

    setIsSubmitting(true)
    setError(null)
    try {
      await submitReview(providerId, selectedAction, note, reviewedBy)
      setSuccess(true)
      setSelectedAction(null)
      setNote('')
      setTimeout(() => { setSuccess(false); onReviewSubmitted?.() }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.review.selectAction)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-5">{t.review.newDecision}</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">{t.review.action}</label>
            <div className="grid grid-cols-2 gap-3">
              {actionKeys.map((key) => {
                const action = t.review.actions[key]
                return (
                  <button
                    key={key}
                    type="button"
                    data-selected={selectedAction === key}
                    onClick={() => setSelectedAction(key)}
                    className={`border-2 rounded-lg px-4 py-3 text-left transition-all ${actionStyles[key]}`}
                  >
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs mt-0.5 opacity-80">{action.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.review.note}
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={t.review.notePlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A2440] focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label htmlFor="reviewedBy" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t.review.reviewedBy} <span className="text-[#D62839]">*</span>
            </label>
            <input
              id="reviewedBy"
              type="text"
              value={reviewedBy}
              onChange={(e) => setReviewedBy(e.target.value)}
              placeholder={t.review.reviewedByPlaceholder}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A2440] focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-sm text-[#D62839]">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2A9D5C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-[#2A9D5C] font-medium">{t.review.success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedAction}
            className="w-full bg-[#1A2440] text-white rounded-lg py-3 text-sm font-semibold hover:bg-[#243255] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t.review.saving}
              </span>
            ) : t.review.submit}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-4">{t.review.historyTitle}</h3>
        {reviews.length === 0 ? (
          <p className="text-gray-400 text-sm">{t.review.noHistory}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[t.review.colDate, t.review.colAction, t.review.colNote, t.review.colReviewedBy].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDateTime(review.created_at, lang)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getActionClass(review.action)}`}>
                        {t.actionLabels[review.action] ?? review.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="truncate">{review.note || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{review.reviewed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
