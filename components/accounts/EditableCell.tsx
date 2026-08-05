import { ReactNode } from "react"

export interface EditableCellProps {
  label?: string
  value: string | number
  onChange: (value: string) => void
  isEditing: boolean
  type?: "text" | "number" | "date" | "textarea" | "email" | "tel" | "url"
  placeholder?: string
  children?: ReactNode
  dir?: "ltr" | "rtl"
  className?: string
  disabled?: boolean
  minHeight?: string
  required?: boolean
  step?: string
  min?: string
  max?: string
  pattern?: string
  list?: string
  autoComplete?: string
  rows?: number
  cols?: number
  maxLength?: number
}

/**
 * Editable cell component for ledger rows
 * Shows display mode by default, switches to input mode when editing
 * Supports inline editing with various input types
 */
export function EditableCell({
  label,
  value,
  onChange,
  isEditing,
  type = "text",
  placeholder,
  children,
  dir = "ltr",
  className = "",
  disabled = false,
  minHeight = "60px",
  required = false,
  step,
  min,
  max,
  pattern,
  list,
  autoComplete,
  rows = 3,
  cols = 40,
  maxLength,
}: EditableCellProps) {
  if (isEditing) {
    return (
      <div className={`ledger-cell-edit-mode ${className}`} dir={dir} style={{ minHeight }}>
        {label && (
          <label className="ledger-cell-label" dir={dir}>
            {label}
          </label>
        )}
        {type === "textarea" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="ledger-cell-edit-mode"
            style={{ minHeight: `${Math.max(60, rows * 20)}px` }}
            rows={rows}
            cols={cols}
            maxLength={maxLength}
            required={required}
            autoComplete={autoComplete}
            dir={dir}
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            step={step}
            min={min}
            max={max}
            pattern={pattern}
            list={list}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className="ledger-cell-edit-mode"
            dir={dir}
          />
        )}
        {children}
      </div>
    )
  }

  // Display mode
  let displayValue: string | number = "-"
  if (value !== undefined && value !== null && value !== "") {
    displayValue = typeof value === "number" && type === "number" ? value : String(value)
  }

  return (
    <div className={`ledger-cell ${className}`} dir={dir} style={{ minHeight }}>
      {label && (
        <p className="ledger-cell-label" dir={dir}>
          {label}
        </p>
      )}
      <div className="ledger-cell__content">
        {type === "number" ? (
          <span className="ledger-cell-value ledger-cell__money">{displayValue}</span>
        ) : (
          <span className="ledger-cell-value">{displayValue}</span>
        )}
        {children}
      </div>
    </div>
  )
}
