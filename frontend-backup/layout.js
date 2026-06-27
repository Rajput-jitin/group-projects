import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'SchemeSeva AI — Find Government Schemes You\'re Eligible For',
  description: 'AI-powered discovery & eligibility prediction for Indian government schemes, scholarships, subsidies, and welfare benefits.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}

