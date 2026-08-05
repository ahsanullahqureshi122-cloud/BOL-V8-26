import { ReactNode } from "react"

export interface BadgeProps {
  variant?: "gold" | "gray" | "blue" | "green" | "red"
  children: ReactNode
  className?: string
}

/**
 * Reusable badge component for ledger cells
 */
export function Badge({ variant = "blue", children, className = "" }: BadgeProps) {
  const baseClass = "ledger-badge"
  const variantClass = `ledger-badge--${variant}`
  
  return (
    <span className={`${baseClass} ${variantClass} ${className}`}>
      {children}
    </span>
  )
}
