"use client"
import { motion } from "framer-motion"
import { Home } from "lucide-react"
import Image from "next/image"
import { redirect } from "next/navigation"

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex translate-y-20 flex-col items-center justify-center gap-4"
    >
      <Image
        src="/icon.ico"
        alt="quranbuddy"
        draggable={false}
        width={330}
        height={330}
      />
      <p className="text-4xl font-bold">How&apos;d you get here?</p>
      <p className="text-lg font-medium">
        jokes aside, here go back home brother you need it
      </p>
      <p className="text-xs font-bold text-foreground/60">
        i still don&apos;t know how you got here
      </p>
      <button
        onClick={() => redirect("/")}
        className="rounded-xl bg-foreground/10 px-7 py-3 text-sm font-medium hover:bg-foreground/20"
      >
        <p className="flex items-center gap-2">
          <Home className="size-5" />
          Go home
        </p>
      </button>
    </motion.div>
  )
}
