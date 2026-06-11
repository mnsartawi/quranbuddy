"use client"

import dynamic from "next/dynamic"

const SurahPage = dynamic(() => import("./surah-page"), { ssr: false })

export default function PageClient() {
  return <SurahPage />
}
