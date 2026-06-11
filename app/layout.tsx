import { Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TitleBar } from "@/components/title-bar"
import { cn } from "@/lib/utils"
import { FloatingLogo } from "@/components/ui/floating-logo"
import { PageTransition } from "@/components/page-loader"
import { TooltipProvider } from "@/components/tooltip"
import { QueueProvider } from "@/lib/queue-context"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        inter.variable
      )}
    >
      <head>
        <link
          rel="preload"
          href="https://static-cdn.tarteel.ai/qul/fonts/surah-names/v4/surah-name-v4.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        <meta
          name="theme-color"
          content="#ffffff"
          media="(prefers-color-scheme: light)"
        />
        <meta
          name="theme-color"
          content="#181818"
          media="(prefers-color-scheme: dark)"
        />
      </head>
      <body>
        <FloatingLogo />
        <ThemeProvider>
          <QueueProvider>
            <div className="fixed top-0 right-0 left-0 z-50">
              <TitleBar />
            </div>
            <main className="pt-9">
              <TooltipProvider>
                <PageTransition>{children}</PageTransition>
              </TooltipProvider>
            </main>
          </QueueProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
