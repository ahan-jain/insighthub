import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'InsightHub - Field Intelligence Platform',
  description: 'AI-powered computer vision detection for field inspections',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'InsightHub'
  }
}

export const viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}