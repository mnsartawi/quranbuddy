"use client"

import { useEffect } from "react"

export default function SurahError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">!</div>
      <h1 className="text-xl font-semibold">Could not load surah</h1>
      <p className="max-w-md text-muted-foreground">
        Something went wrong while loading this surah.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-foreground/10 px-4 py-2 text-sm font-medium hover:bg-foreground/20"
        >
          Reload page
        </button>
      </div>
    </div>
  )
}
