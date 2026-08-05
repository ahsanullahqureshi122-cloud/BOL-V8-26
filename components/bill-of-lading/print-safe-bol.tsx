"use client"

import type { ReactNode } from "react"

export default function PrintSafeBOL({ children }: { children: ReactNode }) {
  return (
    <div className="print-wrapper">
      <div className="print-page">{children}</div>
    </div>
  )
}
