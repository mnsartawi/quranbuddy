"use client"
import * as React from "react"
import { Minus, Square, Copy, X } from "lucide-react"
import Image from "next/image"

let windowApi: Promise<typeof import("@tauri-apps/api/window")> | null = null

function getWindowApi() {
  if (!windowApi) windowApi = import("@tauri-apps/api/window")
  return windowApi
}

async function getCurrentWin() {
  const { getCurrentWindow } = await getWindowApi()
  return getCurrentWindow()
}

function TitleBar() {
  const [maximized, setMaximized] = React.useState(false)
  const [isTauri, setIsTauri] = React.useState(false)

  React.useEffect(() => {
    import("@tauri-apps/api/core")
      .then(() => setIsTauri(true))
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!isTauri) return
    let unlisten: (() => void) | undefined
    let cancelled = false
    getCurrentWin()
      .then(async (win) => {
        if (cancelled) return
        setMaximized(await win.isMaximized())
        const fn = await win.listen("tauri://resize", async () => {
          if (!cancelled) setMaximized(await win.isMaximized())
        })
        unlisten = fn
      })
      .catch(() => {})
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [isTauri])

  async function callTauri(method: string) {
    try {
      const win = await getCurrentWin()
      if (method === "minimize") await win.minimize()
      else if (method === "toggleMaximize") await win.toggleMaximize()
      else if (method === "close") await win.close()
    } catch {}
  }

  return (
    <header
      style={{ background: "var(--titlebar-bg)", position: "relative" }}
      className="flex h-9 shrink-0 items-center select-none"
    >
      <div
        data-tauri-drag-region
        className="flex flex-1 items-center gap-2 self-stretch pr-2 pl-3"
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm">
          <Image
            src="/icon.ico"
            draggable={false}
            alt="logo"
            width={50}
            height={50}
          />
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            letterSpacing: "0.01em",
            color: "var(--titlebar-title)",
          }}
        >
          quranbuddy
        </span>
      </div>

      {isTauri && (
        <nav className="flex h-full">
          <WindowBtn
            onClick={() => callTauri("minimize")}
            aria-label="Minimize"
          >
            <Minus style={{ width: 12, height: 12 }} />
          </WindowBtn>
          <WindowBtn
            onClick={() => callTauri("toggleMaximize")}
            aria-label={maximized ? "Restore" : "Maximize"}
          >
            {maximized ? (
              <Square style={{ width: 11, height: 11 }} />
            ) : (
              <Copy style={{ width: 11, height: 11 }} />
            )}
          </WindowBtn>
          <WindowBtn
            onClick={() => callTauri("close")}
            aria-label="Close"
            isClose
          >
            <X style={{ width: 13, height: 13 }} />
          </WindowBtn>
        </nav>
      )}
    </header>
  )
}

function WindowBtn({
  onClick,
  children,
  isClose,
  "aria-label": ariaLabel,
}: {
  onClick: () => void
  children: React.ReactNode
  isClose?: boolean
  "aria-label"?: string
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: 40,
        border: "none",
        cursor: "default",
        transition: "color 0.1s",
        background: "transparent",
        color: hovered
          ? isClose
            ? "var(--titlebar-close-hover)"
            : "var(--titlebar-btn-hover)"
          : "var(--titlebar-btn)",
      }}
    >
      {children}
    </button>
  )
}

export { TitleBar }
