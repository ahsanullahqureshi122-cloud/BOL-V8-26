"use client"

import type { CSSProperties } from "react"

type AccountRecord = {
  id: string
  companyName: string
  address: string
  contact: string
  type: "import" | "export" | "both"
}

type LedgerProfile = {
  shipperCustomerName: string
  shipperCustomerAddress?: string
  shipperCustomerContact?: string
  shipperCustomerEmail?: string
  officeAddress: string
  footerInfo: string
  logoDataUrl?: string
}

type LedgerPrintRow = {
  id: string
  sNo: number
  date: string
  description: string
  invoiceNo: string
  dateOfShip: string
  billOfLanding: string
  billOfLandingSurrendered?: boolean
  containerType?: string
  containerDetails?: string
  containerNo: string
  consignee: string
  quantity: string
  packing?: string
  debit: number
  credit: number
  balanceUsd: number
  pdfName?: string
  pdfUrl?: string
  pdfDataUrl?: string
  statusPdfName?: string
  statusPdfUrl?: string
  statusPdfDataUrl?: string
  mediaName?: string
  mediaUrl?: string
  mediaFiles?: { id: string; kind?: string; name?: string }[]
}

type LedgerTotals = {
  debit: number
  credit: number
  balance: number
}

const PRINT_ROWS_PER_PAGE = 13

const printColumns = [
  { key: "sNo", label: "S.NO", className: "col-sno text-center" },
  { key: "date", label: "DATE", className: "col-date" },
  { key: "description", label: "SHIPPER / DESCRIPTION", className: "col-description" },
  { key: "billOfLanding", label: "BILL OF LADING / B/L NO", className: "col-bol" },
  { key: "containerType", label: "CONTAINER TYPE", className: "col-container-type" },
  { key: "debit", label: "DEBIT / CREDIT", className: "col-money text-right" },
  { key: "balanceUsd", label: "BALANCE USD", className: "col-balance text-right" },
  { key: "media", label: "MEDIA", className: "col-media" },
] as const

function money(value: number) {
  return `$${Number(value || 0).toFixed(2)}`
}

function balanceClass(value: number) {
  if (value > 0) return "positive"
  if (value < 0) return "negative"
  return "neutral"
}

function splitQuantityPacking(quantity = "", packing = "") {
  const cleanedQuantity = String(quantity || "").trim()
  const cleanedPacking = String(packing || "").trim()

  if (cleanedPacking) return { quantity: cleanedQuantity || "-", packing: cleanedPacking }

  const splitMatch = cleanedQuantity.match(/^([\d,.\s]+)\s+(.+)$/)
  if (splitMatch) {
    return {
      quantity: splitMatch[1].trim() || "-",
      packing: splitMatch[2].trim() || "-",
    }
  }

  return { quantity: cleanedQuantity || "-", packing: "-" }
}

function chunkRows(rows: LedgerPrintRow[]) {
  if (!rows.length) return [[]] as LedgerPrintRow[][]
  const pages: LedgerPrintRow[][] = []
  for (let index = 0; index < rows.length; index += PRINT_ROWS_PER_PAGE) {
    pages.push(rows.slice(index, index + PRINT_ROWS_PER_PAGE))
  }
  return pages
}

function formatPrintDate(date = new Date()) {
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function renderCell(row: LedgerPrintRow, key: (typeof printColumns)[number]["key"]) {
  if (key === "sNo") {
    return <span>{row.sNo}</span>
  }
  if (key === "date") {
    return <span>{row.date || "-"}</span>
  }
  if (key === "description") {
    return (
      <div className="merged-print-cell description-lines">
        <span><strong>Shipper:</strong> {row.description || "-"}</span>
        {(row.quantity || row.packing) ? (
          <span><strong>Qty:</strong> {`${row.quantity || "-"}${row.packing ? ` / ${row.packing}` : ""}`}</span>
        ) : null}
      </div>
    )
  }
  if (key === "debit") {
    return (
      <div className="merged-print-cell money-lines">
        <span className="debit"><strong>Debit:</strong> {money(row.debit)}</span>
        <span className="credit"><strong>Credit:</strong> {money(row.credit)}</span>
      </div>
    )
  }
  if (key === "balanceUsd") {
    return money(row.balanceUsd)
  }
  if (key === "billOfLanding") {
    return (
      <div className="merged-print-cell">
        <span><strong>B/L No:</strong> {row.billOfLanding || "-"}</span>
        {row.consignee ? <span><strong>Consignee:</strong> {row.consignee}</span> : null}
      </div>
    )
  }
  if (key === "containerType") {
    return (
      <div className="merged-print-cell">
        <span><strong>Type:</strong> {row.containerType || "-"}</span>
        {row.containerNo ? <span><strong>Container No:</strong> {row.containerNo}</span> : null}
      </div>
    )
  }
  if (key === "media") {
    if (row.mediaFiles?.length) {
      return <span>{`${row.mediaFiles.length} file${row.mediaFiles.length === 1 ? "" : "s"}`}</span>
    }
    if (row.mediaName || row.mediaUrl) {
      return <span>{row.mediaName || "Attached"}</span>
    }
    return <span>No media</span>
  }
  const value = row[key as keyof LedgerPrintRow]
  return value ? String(value) : "-"
}

export function ExportAccountLedgerPrint({
  account,
  profile,
  rows,
  totals,
  zoom = 1,
  fitMode = "width",
}: {
  account: AccountRecord
  profile: LedgerProfile
  rows: LedgerPrintRow[]
  totals: LedgerTotals
  zoom?: number
  fitMode?: "width" | "page"
}) {
  const printedAt = formatPrintDate()
  const pages = chunkRows(rows)
  const customerName = profile.shipperCustomerName || account.companyName
  const customerAddress = profile.shipperCustomerAddress || account.address || "Not provided"
  const customerContact = [profile.shipperCustomerContact, profile.shipperCustomerEmail, account.contact].filter(Boolean).join(" | ") || "Not provided"
  const ledgerNumber = `LED-${account.id.slice(0, 8).toUpperCase()}`
  const scale = fitMode === "page" ? Math.min(zoom, 0.86) : zoom

  return (
    <div
      data-export-ledger-print-stage="true"
      className="export-ledger-print-stage"
      style={{ "--print-preview-scale": String(scale) } as CSSProperties}
    >
      {pages.map((pageRows, pageIndex) => {
        const isLastPage = pageIndex === pages.length - 1
        return (
          <article
            key={`ledger-page-${pageIndex}`}
            data-export-ledger-print-sheet="true"
            className="export-ledger-print-page"
          >
            <header className="export-ledger-print-header">
              <div className="company-block left">
                <img
                  src={profile.logoDataUrl || "/images/account-ledger-logo.png"}
                  alt="Company logo"
                  className="print-logo"
                />
                <div>
                  <p className="eyebrow">Export Ledger Statement</p>
                  <h1>SKY ARIANA & BALAM BAR BARAN</h1>
                  <p>Professional Logistics Account Ledger</p>
                </div>
              </div>
              <div className="company-block right">
                <p className="strong">Afghanistan Office</p>
                <p>{profile.officeAddress}</p>
                <p>License Number: 2401-2198</p>
                <p>info@skyariana.com | transport@skyariana.com</p>
                <p>www.skyariana.com</p>
              </div>
            </header>

            <section className="export-ledger-meta-grid">
              <div>
                <span>Customer Name</span>
                <strong>{customerName}</strong>
              </div>
              <div>
                <span>Customer Code</span>
                <strong>{account.id.slice(0, 10).toUpperCase()}</strong>
              </div>
              <div>
                <span>Contact Information</span>
                <strong>{customerContact}</strong>
              </div>
              <div>
                <span>Address</span>
                <strong>{customerAddress}</strong>
              </div>
              <div>
                <span>Opening Balance</span>
                <strong>$0.00</strong>
              </div>
              <div>
                <span>Currency</span>
                <strong>USD</strong>
              </div>
              <div>
                <span>Ledger Number</span>
                <strong>{ledgerNumber}</strong>
              </div>
              <div>
                <span>Printed Date & Time</span>
                <strong>{printedAt}</strong>
              </div>
            </section>

            <section className="export-ledger-summary-grid">
              <div className="export-ledger-summary-card">
                <span>Opening Balance</span>
                <strong>$0.00</strong>
              </div>
              <div className="export-ledger-summary-card">
                <span>Total Debit</span>
                <strong>{money(totals.debit)}</strong>
              </div>
              <div className="export-ledger-summary-card">
                <span>Total Credit</span>
                <strong>{money(totals.credit)}</strong>
              </div>
              <div className="export-ledger-summary-card">
                <span>Closing Balance</span>
                <strong>{money(totals.balance)}</strong>
              </div>
              <div className="export-ledger-summary-card">
                <span>Total Transactions</span>
                <strong>{rows.length}</strong>
              </div>
            </section>

            <table dir="rtl" className="export-ledger-print-table">
              <thead>
                <tr>
                  {printColumns.map((column) => {
                    const parts = String(column.label).split(/\s*\/\s*/)
                    const en = parts[0]
                    const ps = parts.slice(1).join(" / ")
                    return (
                      <th key={column.key} className={column.className}>
                        <div>
                          <p className="print-col-en">{en}</p>
                          {ps ? <p dir="rtl" lang="ps" className="print-col-ps">{ps}</p> : null}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.length ? (
                  pageRows.map((row) => (
                    <tr key={row.id}>
                      {printColumns.map((column) => (
                        <td
                          key={column.key}
                          className={`${column.className} ${column.key === "debit" ? "merged-money" : column.key === "balanceUsd" ? balanceClass(row.balanceUsd) : ""}`}
                        >
                          {renderCell(row, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={printColumns.length} className="empty-row">
                      No ledger rows yet.
                    </td>
                  </tr>
                )}
              </tbody>
              {isLastPage ? (
                <tfoot>
                  <tr>
                    <td colSpan={5}>
                      <strong>Totals</strong>
                      <span>{rows.length} transaction{rows.length === 1 ? "" : "s"} | Currency: USD</span>
                    </td>
                    <td className="text-right merged-money">
                      <span className="debit">Debit: {money(totals.debit)}</span>
                      <span className="credit">Credit: {money(totals.credit)}</span>
                    </td>
                    <td className={`text-right ${balanceClass(totals.balance)}`}>{money(totals.balance)}</td>

                  </tr>
                </tfoot>
              ) : null}
            </table>

            <footer className="export-ledger-page-footer">
              <span>Generated by BASAD Logistics System</span>
              <span>Page {pageIndex + 1} of {pages.length}</span>
              <span>Company Contact: {profile.officeAddress.split("|")[0] || account.contact}</span>
              <span>Confidential Business Document</span>
              <span>Printed: {printedAt}</span>
            </footer>
          </article>
        )
      })}
    </div>
  )
}
