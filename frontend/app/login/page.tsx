'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignIn } from '@clerk/nextjs'
import { isDemoMode } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClerk, setShowClerk] = useState(false)

  async function handleDemoLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        router.push('/dashboard')
      } else {
        setError(data.message || 'Identifiants incorrects')
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A2440] to-[#2d3d66] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white mb-4 shadow-lg">
            <span className="text-[#1A2440] font-black text-2xl">A</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Alan</h1>
          <p className="text-white/60 text-sm mt-1 font-medium tracking-wide uppercase">
            Fraud Detection System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setShowClerk(false)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                !showClerk
                  ? 'text-[#1A2440] border-b-2 border-[#1A2440]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Connexion démo
            </button>
            <button
              onClick={() => setShowClerk(true)}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                showClerk
                  ? 'text-[#1A2440] border-b-2 border-[#1A2440]'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Connexion Clerk
            </button>
          </div>

          <div className="p-8">
            {!showClerk ? (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Accès démonstration</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Utilisez les identifiants démo pour explorer le système
                  </p>
                </div>

                {/* Demo hint */}
                <div className="bg-[#1A2440]/5 border border-[#1A2440]/10 rounded-lg p-4 mb-6">
                  <p className="text-xs text-[#1A2440] font-semibold mb-1">Identifiants démo</p>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>
                      Utilisateur: <code className="bg-white px-1.5 py-0.5 rounded font-mono">alanadmin</code>
                    </span>
                    <span>
                      Mot de passe: <code className="bg-white px-1.5 py-0.5 rounded font-mono">alanadmin</code>
                    </span>
                  </div>
                </div>

                <form onSubmit={handleDemoLogin} className="space-y-4">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom d&apos;utilisateur
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alanadmin"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A2440] focus:border-transparent transition"
                      required
                      autoComplete="username"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Mot de passe
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1A2440] focus:border-transparent transition"
                      required
                      autoComplete="current-password"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#D62839] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-[#D62839]">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#1A2440] text-white rounded-lg py-3 text-sm font-semibold hover:bg-[#243255] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Connexion en cours...
                      </>
                    ) : (
                      'Se connecter'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900">Connexion avec Clerk</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Authentification sécurisée via Clerk
                  </p>
                </div>
                <div className="flex justify-center">
                  <SignIn
                    appearance={{
                      variables: {
                        colorPrimary: '#1A2440',
                      },
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          &copy; 2024 Alan Assurance — Système de détection de fraude
        </p>
      </div>
    </div>
  )
}
