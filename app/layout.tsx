import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Roboto_Mono, Roboto } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import Script from "next/script" 

const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "700"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-code",
})

export const metadata: Metadata = {
  title: "AnswerGit - AI-Powered GitHub Repository Explorer",
  description: "Understand GitHub repositories with AI-powered insights and analysis",
  generator: 'v0.dev',
    icons: {
      icon: '/logo.png',  
    },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* ✅ Rybbit Tracking Script */}
        <Script
          src="https://app.rybbit.io/api/script.js"
          data-site-id="283"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${roboto.variable} ${robotoMono.variable} ${jetbrainsMono.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}