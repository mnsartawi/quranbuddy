"use client"

import { useEffect } from "react"
import Image from "next/image"

export default function Error({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] translate-y-15 flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="text-4xl">
        <Image
          src="/icon.ico"
          alt="quranbuddy"
          draggable={false}
          width={220}
          height={220}
        />
      </div>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        &quot;{error.message}&quot;
      </p>
      <p className="font-sans text-xs font-bold text-muted-foreground">
        Provide this error to the dev.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-foreground/10 px-4 py-2 text-sm font-medium hover:bg-foreground/20"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
