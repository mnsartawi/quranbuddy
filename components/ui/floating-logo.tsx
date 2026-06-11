"use client"
import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip"
import { Home } from "lucide-react"

export const FloatingLogo = () => {
  const router = useRouter()
  const pathname = usePathname()

  if (pathname === "/") return null

  return (
    <motion.div
      className="fixed bottom-4 left-5 z-50 cursor-pointer"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onClick={() => router.push("/")}
    >
      <Tooltip>
        <TooltipTrigger>
          <Image
            src="/icon.ico"
            alt="quranbuddy"
            draggable={false}
            width={30}
            height={30}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          sideOffset={10}
          className="translate-x-1.5"
        >
          <p className="flex items-center font-bold">
            <Home className="mr-2 size-4" />
            Home
          </p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  )
}
