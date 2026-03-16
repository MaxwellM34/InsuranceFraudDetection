'use client'

import { Sidebar } from './Sidebar'
import { useLang } from '@/lib/lang-context'
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
              <LangToggle />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
      </main>
    </div>
  )
}
