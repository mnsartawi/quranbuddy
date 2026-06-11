/* eslint-disable react-hooks/set-state-in-effect */
"use client"
import { motion } from "framer-motion"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { SiGithub } from "react-icons/si"
import { CogIcon, Globe, Headphones } from "lucide-react"
import { open } from "@tauri-apps/plugin-shell"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export default function Home() {
  const router = useRouter()
  const [commandOpen, setCommandOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const heroSrc = "/icon.ico"
  const prayerIconSrc =
    mounted && resolvedTheme === "dark" ? "/prayerwhite.png" : "/prayer.png"

  useEffect(() => {
    const style = document.body.style
    const htmlStyle = document.documentElement.style

    style.overflow = "hidden"
    htmlStyle.overflow = "hidden"
    htmlStyle.overscrollBehavior = "none"
    htmlStyle.touchAction = "none"

    return () => {
      style.overflow = "unset"
      htmlStyle.overflow = "unset"
      htmlStyle.overscrollBehavior = "auto"
      htmlStyle.touchAction = "auto"
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-2">
      <motion.div
        initial={{ y: "100vh", opacity: 0 }}
        animate={{ y: -100, opacity: 1 }}
        className="select-none"
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Image
          src={heroSrc}
          alt="QuranBuddy"
          draggable={false}
          width={250}
          height={250}
        />
      </motion.div>

      <motion.div
        initial={{ y: "100vh", opacity: 0 }}
        animate={{ y: -105, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <p className="mt-3 text-2xl font-bold">
          Quran<span className="text-[#b59043]">Buddy</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ y: "100vh", opacity: 0 }}
        animate={{ y: -110, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <Button
          onClick={() => setCommandOpen(true)}
          variant="default"
          size="wide"
          className="mt-6 bg-[#b59043] px-6 py-2 text-white hover:bg-[#a07c3d]"
        >
          Get Started
        </Button>
      </motion.div>

      <motion.div
        initial={{ y: "100vh", opacity: 0 }}
        animate={{ y: -95, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mt-4 flex space-x-4 text-sm text-gray-400"
      >
        <div
          className="group flex cursor-pointer items-center space-x-1"
          onClick={() => open("https://github.com/quranbuddy/quranbuddy")}
        >
          <SiGithub size={16} />
          <span className="relative">
            GitHub
            <span className="absolute bottom-0 left-0 h-px w-0 bg-gray-400 transition-all duration-200 group-hover:w-full" />
          </span>
        </div>

        <div
          className="group flex cursor-pointer items-center space-x-1"
          onClick={() => open("https://quranbuddy.com")}
        >
          <Globe size={16} />
          <span className="relative">
            Website
            <span className="absolute bottom-0 left-0 h-px w-0 bg-gray-400 transition-all duration-200 group-hover:w-full" />
          </span>
        </div>
      </motion.div>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        className="sm:max-w-xl"
      >
        <Command className="[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground **:[[cmdk-group]]:px-2 **:[[cmdk-input]]:h-12 **:[[cmdk-item]]:px-2 **:[[cmdk-item]]:py-3">
          <CommandInput placeholder="Search pages..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem redirect="/home">
                <Image
                  src="/quran.png"
                  alt="quran"
                  height={28}
                  draggable={false}
                  width={28}
                  className="mr-2 size-6"
                />
                Read
              </CommandItem>
              <CommandItem redirect="/home">
                <Headphones className="mr-2 size-4" />
                Listen
              </CommandItem>
              <CommandItem redirect="/ptimes">
                <Image
                  src={prayerIconSrc}
                  alt="ptimes"
                  height={28}
                  draggable={false}
                  width={28}
                  className="mr-2 size-6"
                />
                Prayer Times
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Links">
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false)
                  void open("https://github.com/quranbuddy/quranbuddy")
                }}
              >
                <SiGithub className="mr-2 size-5.5! shrink-0" />
                GitHub
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false)
                  router.push("/settings")
                }}
              >
                <CogIcon className="mr-2 size-5.5! shrink-0" />
                Settings
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setCommandOpen(false)
                  void open("https://quranbuddy.com")
                }}
              >
                <Image
                  className="mr-2 shrink-0 object-contain"
                  src="/icon.ico"
                  draggable={false}
                  width={24}
                  height={24}
                  style={{ width: "24px", height: "24px", minWidth: "24px" }}
                  alt="Website"
                />
                Website
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}
