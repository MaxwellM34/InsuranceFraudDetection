import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { LangProvider } from '@/lib/lang-context'
import { ClerkTokenSync } from '@/components/ClerkTokenSync'
import './globals.css'

export const metadata: Metadata = {
  title: 'Alan Fraud Detection',
  description: "Système de détection de fraude pour Alan assurance santé",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning>
        <ClerkProvider afterSignOutUrl="/login">
          <ClerkTokenSync />
          <LangProvider>
            {children}
          </LangProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
