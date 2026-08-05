/**
 * Ledger helper functions and utilities
 * Used across ledger components for consistent formatting and processing
 */

import type { LedgerEntry, MediaAttachment, SavedParty } from "./account-manager"

/**
 * Format money values with commas and 2 decimals
 */
export function formatLedgerMoney(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) || 0 : value || 0
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num))
}

/**
 * Get balance color class
 */
export function balanceToneClass(balance: number): string {
  if (balance > 0) return "text-emerald-700"
  if (balance < 0) return "text-red-700"
  return "text-slate-700"
}

/**
 * Format date for display
 */
export function formatMergedDate(row: LedgerEntry): string {
  if (!row.date) return "-"
  const dates = []
  dates.push(row.date)
  if (row.dateOfShip) dates.push(`Ship: ${row.dateOfShip}`)
  if (row.invoiceNo) dates.push(`Inv: ${row.invoiceNo}`)
  return dates.join(" | ")
}

/**
 * Format description/shipper for display
 */
export function formatMergedDescription(row: LedgerEntry): string {
  const parts = []
  if (row.description) parts.push(row.description)
  if (row.quantity) parts.push(`Qty: ${row.quantity}`)
  if (row.packing) parts.push(`Packing: ${row.packing}`)
  return parts.join(" | ") || "-"
}

/**
 * Format debit/credit for display
 */
export function formatMergedDebit(row: LedgerEntry): string {
  const debit = Number(row.debit || 0)
  const credit = Number(row.credit || 0)
  return `D: $${formatLedgerMoney(debit)} | C: $${formatLedgerMoney(credit)}`
}

/**
 * Detect media file kind from MIME type and filename
 */
export function detectMediaKind(
  mimeType: string,
  fileName: string
): "image" | "video" | "audio" | "document" {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return "document"
  if (fileName.endsWith(".doc") || fileName.endsWith(".docx")) return "document"
  if (fileName.endsWith(".xls") || fileName.endsWith(".xlsx")) return "document"
  return "document"
}

/**
 * Check if file is allowed for media upload
 */
export function isAllowedMediaFile(file: File): boolean {
  const allowedTypes = ["image/", "video/", "audio/", "application/pdf"]
  return allowedTypes.some((type) => file.type.startsWith(type)) ||
    /\.(jpg|jpeg|png|gif|webp|mp4|webm|avi|mov|mp3|wav|pdf)$/i.test(file.name)
}

/**
 * Convert data URL to Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",")
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream"
  const bstr = atob(parts[1])
  const n = bstr.length
  const u8arr = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Get media files from ledger entry
 */
export function getEntryMediaFiles(entry: LedgerEntry): MediaAttachment[] {
  return entry.mediaFiles || []
}

/**
 * Download CSV file
 */
export function downloadCsv(filename: string, lines: string[]): void {
  const csv = lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Parse delimited rows (CSV/TSV)
 */
export function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ""
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim())
        if (currentRow.some((cell) => cell)) {
          rows.push(currentRow)
        }
        currentRow = []
        currentCell = ""
        if (char === "\r" && nextChar === "\n") i++
      }
    } else {
      currentCell += char
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((cell) => cell)) {
      rows.push(currentRow)
    }
  }

  return rows
}

/**
 * Normalize import header names
 */
export function normalizeImportHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 20)
}

/**
 * Get mapped import cell value
 */
export function getMappedImportCell(
  cells: string[],
  headerMap: Map<string, number>,
  aliases: string[],
  fallbackIndex: number
): string {
  for (const alias of aliases) {
    const normalized = normalizeImportHeader(alias)
    const index = headerMap.get(normalized)
    if (index !== undefined && index < cells.length) {
      return cells[index] || ""
    }
  }
  return cells[fallbackIndex] || ""
}

/**
 * CSV escape function for proper CSV formatting
 */
export function csvEscape(value: string | number): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return `"${str}"`
}

/**
 * Container type label getter
 */
export function getContainerTypeLabel(type?: string): string {
  if (!type) return "No container"
  if (type.includes("40FT") && type.includes("HC")) return "40FT High Cube (40HC)"
  if (type.includes("40FT") && type.includes("RF")) return "40FT Reefer (40RF)"
  if (type.includes("20FT") && type.includes("RF")) return "20FT Reefer (20RF)"
  if (type.includes("20FT")) return "20FT Standard (20GP)"
  if (type.includes("40FT")) return "40FT Standard (40GP)"
  if (type.includes("Chadori")) return "Curtain Side (Chadori)"
  return type
}

/**
 * Empty ledger entry template
 */
export function createEmptyLedgerEntry(): Partial<LedgerEntry> {
  return {
    date: "",
    description: "",
    invoiceNo: "",
    dateOfShip: "",
    billOfLanding: "",
    containerType: "",
    containerDetails: "",
    containerNo: "",
    consignee: "",
    quantity: "",
    packing: "",
    debit: 0,
    credit: 0,
    billOfLandingSurrendered: false,
  }
}

/**
 * Parse Pashto text direction
 */
export function isPashtoText(text: string): boolean {
  const pashtoRegex = /[\u0600-\u06FF]/g
  return (text.match(pashtoRegex) || []).length > 0
}

/**
 * Get text direction (LTR/RTL) based on content
 */
export function getTextDirection(text: string): "ltr" | "rtl" {
  return isPashtoText(text) ? "rtl" : "ltr"
}
