'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { useLang } from '@/lib/lang-context'
import { clearAllData } from '@/lib/api'
import type { Lang } from '@/lib/i18n'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

function LangToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {(['fr', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            lang === l
              ? 'bg-[#1A2440] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function ClearDataButton() {
  const { t } = useLang()
  const [loading, setLoading] = useState(false)

  async function handleClear() {
    if (!window.confirm(t.clearData.confirm)) return
    setLoading(true)
    try {
      await clearAllData()
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClear}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      {loading ? '...' : t.clearData.button}
    </button>
  )
}

export function Layout({ children, title, subtitle, actions }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {actions}
              <ClearDataButton />
              <LangToggle />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
      </main>
    </div>
  )
}
