'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useClerk } from '@clerk/nextjs'
import { isDemoMode } from '@/lib/auth'
import { useLang } from '@/lib/lang-context'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const [demo, setDemo] = useState(false)
  useEffect(() => { setDemo(isDemoMode()) }, [])
  const { t } = useLang()
  const { signOut } = useClerk()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    signOut().catch(() => {}).finally(() => {
      window.location.href = '/login'
    })
  }

  const navItems = [
    {
      href: '/dashboard',
      label: t.nav.dashboard,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/providers',
      label: t.nav.providers,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      href: '/import',
      label: t.nav.import,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
  ]

  return (
    <aside
      className="flex flex-col h-full"
      style={{ backgroundColor: '#1A2440', width: '240px', minWidth: '240px' }}
    >
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-[#1A2440] font-black text-sm">A</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Alan</p>
            <p className="text-white/50 text-xs leading-tight">Fraud Detection</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-3 py-2">
          {t.nav.navigation}
        </p>
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8',
              )}
            >
              <span className={isActive ? 'text-white' : 'text-white/50'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="px-3 py-4 border-t border-white/10">
        {demo && (
          <div className="px-3 py-2 mb-3 bg-white/10 rounded-lg">
            <p className="text-white/50 text-xs">{t.nav.demoMode}</p>
            <p className="text-white text-sm font-medium">alanadmin</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t.nav.logout}
        </button>
      </div>
    </aside>
  )
}
