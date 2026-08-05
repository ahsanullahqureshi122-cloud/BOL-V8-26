"use client"

import { useState } from "react"
import type { MouseEvent } from "react"
import type { LedgerEntry, MediaAttachment } from "./account-manager"
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Pencil,
  Receipt,
  Trash2,
  X,
} from "lucide-react"
import { LedgerGalleryModal } from "./LedgerGalleryModal"
import { MediaGrid } from "./MediaGrid"

export interface LedgerRowProps {
  row: LedgerEntry & { sNo: number; balanceUsd: number }
  sNo: number
  isEditing: boolean
  isSelected: boolean
  editingDraft?: Partial<LedgerEntry>
  density?: "compact" | "medium" | "comfortable"
  onSelect: () => void
  onContextMenu?: (event: MouseEvent<HTMLDivElement>) => void
  onEdit: () => void
  onSave?: () => void
  onCancel?: () => void
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onEditChange?: (field: keyof LedgerEntry, value: any) => void
  onMediaAdd?: (files: FileList) => void
  onMediaDelete?: (fileId: string) => void
  getMediaFiles?: (row: LedgerEntry) => MediaAttachment[]
  onViewReceipt?: (receiptId: string) => void
}

const CONTAINER_TYPES = [
  "20FT Standard / 20GP",
  "40FT Standard / 40GP",
  "40FT High Cube / 40HC",
  "45FT High Cube / 45HC",
  "20FT Reefer / 20RF",
  "40FT Reefer / 40RF",
  "Curtain Side / Chadhari",
  "Bulk Cargo",
  "Truck",
  "Trailer",
  "Other",
]

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function detectRTL(text: string): boolean {
  return /[\u0590-\u08FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(text)
}

export function LedgerRow({
  row,
  sNo,
  isEditing,
  isSelected,
  editingDraft,
  density = "medium",
  onSelect,
  onContextMenu,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  onEditChange,
  onMediaAdd,
  onMediaDelete,
  getMediaFiles,
  onViewReceipt,
}: LedgerRowProps) {
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  const current = isEditing && editingDraft ? { ...row, ...editingDraft } : row
  const mediaFiles = getMediaFiles ? getMediaFiles(row) : row.mediaFiles || []

  const creditValue = Number(current.credit || 0)
  const debitValue = Number(current.debit || 0)
  const balanceValue = Number(row.balanceUsd || 0)

  const isCredit = creditValue > 0
  const isDebit = debitValue > 0 && !isCredit

  const rowClass = [
    "ledger-table-grid-row",
    isSelected ? "is-selected" : "",
    isEditing ? "is-editing" : "",
    isCredit ? "ledger-row-credit" : "",
    isDebit ? "ledger-row-debit" : "",
  ]
    .filter(Boolean)
    .join(" ")

  const mediaCellAttr = mediaFiles.length
    ? { "data-media-count": `Media: ${mediaFiles.length} file${mediaFiles.length > 1 ? "s" : ""}` }
    : { "data-media-count": "No media" }

  return (
    <>
      <div
        className={rowClass}
        onClick={onSelect}
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu?.(e)
        }}
        role="row"
      >
        {/* S.NO */}
        <div className="ledger-table-grid-cell" style={{ justifyContent: "center", alignItems: "center" }}>
          <div className="ledger-cell-sno-wrapper">
            <div className="ledger-cell-sno">{sNo}</div>
          </div>
        </div>

        {/* DATE */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <input
                type="date"
                value={current.date || ""}
                onChange={(e) => onEditChange?.("date", e.target.value)}
                title="Entry date"
              />
              <input
                type="date"
                value={current.dateOfShip || ""}
                onChange={(e) => onEditChange?.("dateOfShip", e.target.value)}
                placeholder="Ship date"
                title="Ship date"
              />
            </div>
          ) : (
            <>
              <span className="ledger-cell-date-main">{current.date || "—"}</span>
              {current.dateOfShip && (
                <span className="ledger-cell-date-meta">Ship: {current.dateOfShip}</span>
              )}
              {current.invoiceNo && (
                <span className="ledger-cell-date-meta">Inv: {current.invoiceNo}</span>
              )}
            </>
          )}
        </div>

        {/* DESCRIPTION / SHIPPER */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <textarea
                value={current.description || ""}
                onChange={(e) => onEditChange?.("description", e.target.value)}
                placeholder="Shipper / Description (Pashto or English)"
                dir="auto"
              />
              <input
                type="text"
                value={current.invoiceNo || ""}
                onChange={(e) => onEditChange?.("invoiceNo", e.target.value)}
                placeholder="Invoice No"
              />
            </div>
          ) : (
            <>
              <span
                className="ledger-cell-desc-main"
                dir={detectRTL(current.description || "") ? "rtl" : "ltr"}
                title={current.description}
              >
                {current.description || "—"}
              </span>
            </>
          )}
        </div>

        {/* B/L NO */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <input
                type="text"
                value={current.billOfLanding || ""}
                onChange={(e) => onEditChange?.("billOfLanding", e.target.value)}
                placeholder="B/L Number"
              />
              <input
                type="text"
                value={current.consignee || ""}
                onChange={(e) => onEditChange?.("consignee", e.target.value)}
                placeholder="Consignee"
              />
            </div>
          ) : (
            <>
              <span className="ledger-cell-bol-number" title={current.billOfLanding}>
                {current.billOfLanding || "—"}
              </span>
              {current.consignee && (
                <span className="ledger-cell-bol-consignee" title={current.consignee}>
                  {current.consignee}
                </span>
              )}
            </>
          )}
        </div>

        {/* CONTAINER TYPE */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <select
                value={current.containerType || ""}
                onChange={(e) => onEditChange?.("containerType", e.target.value)}
              >
                <option value="">Select type</option>
                {CONTAINER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={current.containerNo || ""}
                onChange={(e) => onEditChange?.("containerNo", e.target.value)}
                placeholder="Container No"
              />
            </div>
          ) : (
            <>
              <span className="ledger-cell-container-type" title={current.containerType}>
                {current.containerType || "—"}
              </span>
              {current.containerNo && (
                <span className="ledger-cell-container-number">#{current.containerNo}</span>
              )}
            </>
          )}
        </div>

        {/* QTY / PACKING */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <input
                type="text"
                value={current.quantity || ""}
                onChange={(e) => onEditChange?.("quantity", e.target.value)}
                placeholder="Quantity"
              />
              <input
                type="text"
                value={current.packing || ""}
                onChange={(e) => onEditChange?.("packing", e.target.value)}
                placeholder="Packing"
              />
            </div>
          ) : (
            <>
              <span className="ledger-cell-qty-value">{current.quantity || "—"}</span>
              {current.packing && (
                <span className="ledger-cell-qty-packing">{current.packing}</span>
              )}
            </>
          )}
        </div>

        {/* DEBIT */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <input
                type="number"
                step="0.01"
                min="0"
                value={current.debit || ""}
                onChange={(e) => onEditChange?.("debit", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          ) : (
            <>
              {debitValue > 0 && (
                <>
                  <span className="ledger-cell-debit-label">Debit</span>
                  <span className="ledger-cell-debit-amount">${formatMoney(debitValue)}</span>
                </>
              )}
              {debitValue === 0 && (
                <span style={{ fontSize: 10, color: "#cbd5e1" }}>—</span>
              )}
            </>
          )}
        </div>

        {/* CREDIT */}
        <div className="ledger-table-grid-cell">
          {isEditing ? (
            <div className="ledger-cell-edit-mode">
              <input
                type="number"
                step="0.01"
                min="0"
                value={current.credit || ""}
                onChange={(e) => onEditChange?.("credit", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          ) : (
            <>
              {creditValue > 0 && (
                <>
                  <span className="ledger-cell-credit-label">✓ Received</span>
                  <span className="ledger-cell-credit-amount">${formatMoney(creditValue)}</span>
                  {current.receiptNo && (
                    <button
                      className="ledger-receipt-badge"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (current.receiptId) onViewReceipt?.(current.receiptId)
                      }}
                      title="View Receipt"
                    >
                      <Receipt className="w-2.5 h-2.5" />
                      {current.receiptNo}
                    </button>
                  )}
                </>
              )}
              {creditValue === 0 && (
                <span style={{ fontSize: 10, color: "#cbd5e1" }}>—</span>
              )}
            </>
          )}
        </div>

        {/* BALANCE USD */}
        <div className="ledger-table-grid-cell ledger-cell-balance">
          <span
            className={`ledger-cell-balance-value ${
              balanceValue > 0 ? "positive" : balanceValue < 0 ? "negative" : "zero"
            }`}
          >
            ${formatMoney(Math.abs(balanceValue))}
            {balanceValue < 0 ? " CR" : ""}
          </span>
        </div>

        {/* MEDIA */}
        <div className="ledger-table-grid-cell ledger-cell-media" {...mediaCellAttr}>
          <MediaGrid
            media={mediaFiles}
            rowId={row.id}
            density={density}
            onView={(index) => {
              setGalleryIndex(index)
              setGalleryOpen(true)
            }}
            onAdd={onMediaAdd || (() => {})}
            onDelete={onMediaDelete || (() => {})}
            maxVisible={4}
          />
        </div>

        {/* ACTIONS */}
        <div className="ledger-table-grid-cell ledger-row-actions-panel">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onSave?.() }}
                className="ledger-row-action-btn save"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCancel?.() }}
                className="ledger-row-action-btn cancel"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="ledger-row-action-btn"
                title="Edit row"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMoveUp?.() }}
                className="ledger-row-action-btn"
                title="Move up"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMoveDown?.() }}
                className="ledger-row-action-btn"
                title="Move down"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              {current.receiptNo && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (current.receiptId) onViewReceipt?.(current.receiptId)
                  }}
                  className="ledger-row-action-btn"
                  title="View receipt"
                  style={{ color: "#16a34a", borderColor: "#bbf7d0" }}
                >
                  <Receipt className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete?.() }}
                className="ledger-row-action-btn delete"
                title="Delete row"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gallery Modal — only mounted when open */}
      {galleryOpen && mediaFiles.length > 0 && (
        <LedgerGalleryModal
          files={mediaFiles}
          currentIndex={galleryIndex}
          isOpen={galleryOpen}
          onClose={() => setGalleryOpen(false)}
          onDelete={onMediaDelete}
          rowId={row.id}
        />
      )}
    </>
  )
}
