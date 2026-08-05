export interface MoneyInputProps {
  value: string | number
  onChange: (value: string) => void
  isEditing: boolean
  label?: string
  variant?: "debit" | "credit" | "balance"
  disabled?: boolean
  placeholder?: string
}

/**
 * Formats number with commas and 2 decimals
 */
export function formatMoney(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "-"
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Currency input component with formatting
 */
export function MoneyInput({
  value,
  onChange,
  isEditing,
  label,
  variant = "balance",
  disabled = false,
  placeholder = "0.00",
}: MoneyInputProps) {
  const variantClass = `ledger-cell__${variant}`

  if (isEditing) {
    return (
      <div className="ledger-cell is-editable">
        {label && <p className="ledger-cell__label">{label}</p>}
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
    )
  }

  const formatted = typeof value === "string" || typeof value === "number" ? formatMoney(value) : "-"

  return (
    <div className="ledger-cell">
      {label && <p className="ledger-cell__label">{label}</p>}
      <span className={`ledger-cell__primary ledger-cell__money ${variantClass}`}>
        ${formatted}
      </span>
    </div>
  )
}
