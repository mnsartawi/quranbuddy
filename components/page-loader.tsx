"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { useContext, useState, useEffect, startTransition } from "react"
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { BarsSpinner } from "@/components/ui/spinner"

function FrozenRoute({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext)
  const [frozen] = useState(context)

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    startTransition(() => setLoading(true))
    const timer = setTimeout(
      () => startTransition(() => setLoading(false)),
      600
    )
    return () => clearTimeout(timer)
  }, [pathname])

  useEffect(() => {
    if (loading) {
      document.documentElement.style.overflow = "hidden"
      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.width = "100%"
    } else {
      document.documentElement.style.overflow = ""
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
    }
  }, [loading])
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <BarsSpinner size={26} />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{
          duration: 0.4,
          ease: "easeInOut",
        }}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <FrozenRoute>{children}</FrozenRoute>
      </motion.div>
    </AnimatePresence>
  )
}
