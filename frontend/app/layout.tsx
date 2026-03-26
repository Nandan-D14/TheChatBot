import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TheChatBot',
  description: 'Private ChatGPT-like chatbot powered by Qwen3.5-9B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark bg-[#0a0a0a]">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
