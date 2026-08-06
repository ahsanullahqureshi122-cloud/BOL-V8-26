"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trash2,
  Loader2,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
} from "lucide-react"

const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"
const ACCOUNT_LEDGER_STORAGE_KEY = "sky-bol-company-ledgers"
const COMPANY_LOGO_URL = "/images/logo.png"
const LEDGER_BACKGROUND_URL = "/images/ledger-background.png"
const COMPANY_ADDRESS = "2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan"
const COMPANY_CONTACT = "info@skyariana.com, transport@skyariana.com | +93 700 939 365, +93 711 435 529"
const COMPANY_LICENCE = "2401-2198"

interface SavedDocument {
  id: string
  bol_number?: string
  issue_date?: string
  shipper_name?: string
  consignee_name?: string
  bolNumber?: string
  date?: string
  shipper?: string
  consignee?: string
  truck_number?: string | null
  driver_rent?: string | null
  container_numbers?: string | null
  container_type?: string | null
  containerType?: string | null
  cargo_description?: string | null
  number_of_packages?: string | null
  truck?: string | null
  driverRent?: string | null
  containerNumbers?: string | null
  description?: string | null
  packages?: string | number | null
}

interface LedgerEntry {
  id: string
  date: string
  description: string
  invoiceNo: string
  shipDate: string
  bolNo: string
  truckNo?: string
  containerNo: string
  containerType: string
  consignee: string
  quantity: string
  driverRent?: string
  debit: string
  credit: string
  pdfFile?: string
}

type LedgerRecords = Record<string, LedgerEntry[]>

const emptyEntry = (): LedgerEntry => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split("T")[0],
  description: "",
  invoiceNo: "",
  shipDate: "",
  bolNo: "",
  truckNo: "",
  containerNo: "",
  containerType: "",
  consignee: "",
  quantity: "",
  driverRent: "",
  debit: "",
  credit: "",
  pdfFile: "",
})

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0)

const numberValue = (value: string) => {
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)
  const parsed = match ? Number(match[0]) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

const cleanKey = (companyName: string) => companyName.trim().toLowerCase()
const docBolNumber = (doc: SavedDocument) => (doc.bol_number || doc.bolNumber || "").trim()
const docIssueDate = (doc: SavedDocument) => doc.issue_date || doc.date || ""
const docShipperName = (doc: SavedDocument) => (doc.shipper_name || doc.shipper || "Unnamed Shipper Company").trim()
const docConsigneeName = (doc: SavedDocument) => doc.consignee_name || doc.consignee || ""
const docTruckNumber = (doc: SavedDocument) => doc.truck_number || doc.truck || ""
const docDriverRent = (doc: SavedDocument) => doc.driver_rent || doc.driverRent || ""
const docContainerNumbers = (doc: SavedDocument) => doc.container_numbers || doc.containerNumbers || ""
const docCargoDescription = (doc: SavedDocument) => doc.cargo_description || doc.description || ""
const docPackageCount = (doc: SavedDocument) => (doc.number_of_packages || doc.packages || "").toString()
const docContainerType = (doc: SavedDocument) => (doc.container_type || doc.containerType || "").trim()
const getInvoiceNoFromDescription = (description?: string | null) => {
  const text = description || ""
  const match = text.match(/invoice\s*(?:no|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i)
  return match?.[1]?.trim() || ""
}
const ledgerRowFromDocument = (doc: SavedDocument, companyName: string, existingRow?: LedgerEntry): LedgerEntry => ({
  ...emptyEntry(),
  ...existingRow,
  id: existingRow?.id || crypto.randomUUID(),
  date: existingRow?.date || docIssueDate(doc) || new Date().toISOString().split("T")[0],
  description: existingRow?.description || companyName,
  invoiceNo: existingRow?.invoiceNo || getInvoiceNoFromDescription(docCargoDescription(doc)),
  shipDate: existingRow?.shipDate || docIssueDate(doc) || "",
  bolNo: docBolNumber(doc) || existingRow?.bolNo || "",
  truckNo: docTruckNumber(doc) || existingRow?.truckNo || "",
  containerNo: docContainerNumbers(doc) || existingRow?.containerNo || "",
  containerType: docContainerType(doc) || existingRow?.containerType || "",
  consignee: docConsigneeName(doc) || existingRow?.consignee || "",
  quantity: docPackageCount(doc) || existingRow?.quantity || "",
  driverRent: docDriverRent(doc) || existingRow?.driverRent || "",
  debit: existingRow?.debit || "",
  credit: existingRow?.credit || "",
  pdfFile: existingRow?.pdfFile || "",
})
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")

export function AccountLedger() {
  const [documents, setDocuments] = useState<SavedDocument[]>([])
  const [customCompanies, setCustomCompanies] = useState<string[]>([])
  const [ledgerRecords, setLedgerRecords] = useState<LedgerRecords>({})
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)
  const [newCompanyName, setNewCompanyName] = useState("")
  const [query, setQuery] = useState("")
  const [draft, setDraft] = useState<LedgerEntry>(() => emptyEntry())
  const [isLedgerLoading, setIsLedgerLoading] = useState(true)
  const [ledgerStorageError, setLedgerStorageError] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [addCompanyError, setAddCompanyError] = useState("")
  const [recentlyAddedCompanyName, setRecentlyAddedCompanyName] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const newCompanyInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])
  const lastSavedSnapshotRef = useRef("")

  useEffect(() => {
    const readBrowserSnapshot = () => {
      try {
        const [storedCompanies, storedLedgers] = [
          window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY),
          window.localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY),
        ]

        return {
          customCompanies: storedCompanies ? (JSON.parse(storedCompanies) as string[]) : [],
          ledgerRecords: storedLedgers ? (JSON.parse(storedLedgers) as LedgerRecords) : {},
        }
      } catch (error) {
        console.warn("Could not load account ledger settings:", error)
        return { customCompanies: [], ledgerRecords: {} }
      }
    }

    const saveBackendSnapshot = async (customCompaniesToSave: string[], recordsToSave: LedgerRecords) => {
      const snapshot = { customCompanies: customCompaniesToSave, ledgerRecords: recordsToSave }
      const snapshotJson = JSON.stringify(snapshot)

      const response = await fetch("/api/bol-account-ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: snapshotJson,
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.error || "Could not save account ledger data")
      lastSavedSnapshotRef.current = snapshotJson
    }

    const loadSavedAccountData = async () => {
      setIsLedgerLoading(true)
      setLedgerStorageError("")

      try {
        const response = await fetch("/api/bol-account-ledgers")
        const result = await response.json()
        if (!response.ok || !result.success) throw new Error(result.error || "Could not load account ledger data")

        const browserSnapshot = readBrowserSnapshot()
        const serverCompanies = Array.isArray(result.data?.customCompanies) ? result.data.customCompanies : []
        const serverRecords =
          result.data?.ledgerRecords && typeof result.data.ledgerRecords === "object"
            ? (result.data.ledgerRecords as LedgerRecords)
            : {}
        const mergedCompanies = Array.from(new Set([...serverCompanies, ...browserSnapshot.customCompanies].filter(Boolean)))
        const mergedRecords = { ...serverRecords, ...browserSnapshot.ledgerRecords }
        const mergedSnapshot = { customCompanies: mergedCompanies, ledgerRecords: mergedRecords }

        setCustomCompanies(mergedCompanies)
        setLedgerRecords(mergedRecords)
        lastSavedSnapshotRef.current = JSON.stringify(mergedSnapshot)

        if (browserSnapshot.customCompanies.length || Object.keys(browserSnapshot.ledgerRecords).length) {
          await saveBackendSnapshot(mergedCompanies, mergedRecords)
        }
      } catch (error) {
        const browserSnapshot = readBrowserSnapshot()
        setCustomCompanies(browserSnapshot.customCompanies)
        setLedgerRecords(browserSnapshot.ledgerRecords)
        lastSavedSnapshotRef.current = JSON.stringify(browserSnapshot)
        setLedgerStorageError(error instanceof Error ? error.message : "Could not load account ledger data")
      } finally {
        setIsLedgerLoading(false)
      }
    }

    const loadDocuments = async () => {
      try {
        const response = await fetch("/api/bol")
        if (!response.ok) throw new Error(`BOL request failed (${response.status})`)
        const result = await response.json()
        if (Array.isArray(result.data)) {
          setDocuments(result.data)
        }
      } catch (error) {
        console.warn("Could not load account BOL rows:", error)
      }
    }

    const refreshAccount = () => {
      loadSavedAccountData()
      void loadDocuments()
    }

    void refreshAccount()
    window.addEventListener("skybol:account-ledger-updated", refreshAccount)

    return () => {
      window.removeEventListener("skybol:account-ledger-updated", refreshAccount)
    }
  }, [])

  const companies = useMemo(() => {
    const byName = new Map<string, { companyName: string; docs: SavedDocument[]; ledgerRows: number }>()

    for (const companyName of customCompanies) {
      const cleanName = companyName.trim()
      if (cleanName) {
        byName.set(cleanKey(cleanName), { companyName: cleanName, docs: [], ledgerRows: 0 })
      }
    }

    for (const doc of documents) {
      const companyName = docShipperName(doc)
      const key = cleanKey(companyName)
      const existing = byName.get(key) || { companyName, docs: [], ledgerRows: 0 }
      existing.docs.push(doc)
      byName.set(key, existing)
    }

    for (const [key, rows] of Object.entries(ledgerRecords)) {
      const existing = byName.get(key)
      if (existing) {
        existing.ledgerRows = rows.length
      }
    }

    return Array.from(byName.values())
      .filter((company) => company.companyName.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
  }, [customCompanies, documents, ledgerRecords, query])

  const selectedCompany = selectedCompanyName
    ? companies.find((company) => company.companyName === selectedCompanyName) || null
    : null

  useEffect(() => {
    if (documents.length === 0) return

    const docsByBolNumber = new Map(documents.filter((doc) => docBolNumber(doc)).map((doc) => [docBolNumber(doc), doc]))
    let changed = false
    const nextRecords: LedgerRecords = Object.fromEntries(Object.entries(ledgerRecords).map(([key, rows]) => [key, [...rows]]))

    for (const doc of documents) {
      const bolNo = docBolNumber(doc)
      if (!bolNo) continue

      const companyName = docShipperName(doc)
      const companyKey = cleanKey(companyName)
      const rows = nextRecords[companyKey] || []
      const existingRow = rows.find((row) => row.bolNo.trim() === bolNo)
      const nextRow = ledgerRowFromDocument(doc, companyName, existingRow)

      if (existingRow) {
        const nextRows = rows.map((row) => (row.id === existingRow.id ? nextRow : row))
        nextRecords[companyKey] = nextRows

        if (JSON.stringify(nextRow) !== JSON.stringify(existingRow)) {
          changed = true
        }
      } else {
        nextRecords[companyKey] = [...rows, nextRow]
        changed = true
      }
    }

    for (const [companyKey, rows] of Object.entries(nextRecords)) {
      nextRecords[companyKey] = rows.map((row) => {
          const doc = docsByBolNumber.get(row.bolNo.trim())
          if (!doc) return row

          const nextRow = ledgerRowFromDocument(doc, row.description || docShipperName(doc), row)

          if (
            nextRow.invoiceNo !== row.invoiceNo ||
            nextRow.shipDate !== row.shipDate ||
            nextRow.truckNo !== row.truckNo ||
            nextRow.containerNo !== row.containerNo ||
            nextRow.consignee !== row.consignee ||
            nextRow.quantity !== row.quantity ||
            nextRow.driverRent !== row.driverRent
          ) {
            changed = true
          }

          return nextRow
        })
    }

    if (changed) {
      persistLedger(nextRecords)
    }
  }, [documents, ledgerRecords])

  const selectedKey = selectedCompanyName ? cleanKey(selectedCompanyName) : ""
  const selectedRows = selectedKey ? ledgerRecords[selectedKey] || [] : []

  const totals = selectedRows.reduce(
    (sum, row) => {
      sum.debit += numberValue(row.debit)
      sum.credit += numberValue(row.credit)
      sum.driverRent += numberValue(row.driverRent || "")
      return sum
    },
    { debit: 0, credit: 0, driverRent: 0 }
  )
  const afghani = (value: number) => `${new Intl.NumberFormat("en-US").format(value || 0)} - AFN`
  const driverRentTotalText = afghani(totals.driverRent)

  const rowsWithBalance = selectedRows.map((row, index) => {
    const balance = selectedRows
      .slice(0, index + 1)
      .reduce((sum, item) => sum + numberValue(item.debit) - numberValue(item.credit), 0)

    return { row, balance }
  })

  const persistSnapshotToBackend = async (companiesToSave: string[], recordsToSave: LedgerRecords) => {
    const snapshot = { customCompanies: companiesToSave, ledgerRecords: recordsToSave }
    const snapshotJson = JSON.stringify(snapshot)
    if (snapshotJson === lastSavedSnapshotRef.current) return

    try {
      setLedgerStorageError("")
      const response = await fetch("/api/bol-account-ledgers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: snapshotJson,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not save account ledger data")
      }

      lastSavedSnapshotRef.current = snapshotJson
    } catch (error) {
      setLedgerStorageError(error instanceof Error ? error.message : "Could not save account ledger data")
    }
  }

  const persistCompanies = (companiesToSave: string[]) => {
    setCustomCompanies(companiesToSave)
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify(companiesToSave))
    void persistSnapshotToBackend(companiesToSave, ledgerRecords)
  }

  const persistLedger = (records: LedgerRecords) => {
    setLedgerRecords(records)
    window.localStorage.setItem(ACCOUNT_LEDGER_STORAGE_KEY, JSON.stringify(records))
    void persistSnapshotToBackend(customCompanies, records)
  }

  const addCompany = async () => {
    const companyName = newCompanyName.trim()
    setAddCompanyError("")
    if (!companyName) {
      setAddCompanyError("Enter company name first")
      return
    }

    const exists = companies.some((company) => cleanKey(company.companyName) === cleanKey(companyName))
    if (exists) {
      setSelectedCompanyName(companyName)
      setNewCompanyName("")
      toast.info("Company already exists")
      setTimeout(() => {
        const el = document.querySelector(`[data-company-name="${companyName}"]`) as HTMLElement | null
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        el?.focus()
      }, 50)
      return
    }

    setIsAddingCompany(true)
    try {
      persistCompanies([...customCompanies, companyName])
      try {
        await persistSnapshotToBackend([...customCompanies, companyName], ledgerRecords)
      } catch (err) {
        // backend save failed but we already persisted to local storage
      }
      setSelectedCompanyName(companyName)
      setNewCompanyName("")
      setRecentlyAddedCompanyName(companyName)
      toast.success("Company added to Account")

      setTimeout(() => {
        const el = document.querySelector(`[data-company-name="${companyName}"]`) as HTMLElement | null
        el?.scrollIntoView({ behavior: "smooth", block: "center" })
        el?.focus()
      }, 120)

      setTimeout(() => setRecentlyAddedCompanyName(null), 3000)
      newCompanyInputRef.current?.focus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not add company"
      setAddCompanyError(msg)
      toast.error(msg)
    } finally {
      setIsAddingCompany(false)
    }
  }

  const addLedgerRow = () => {
    if (!selectedCompanyName) return

    const hasAnyValue = Object.entries(draft).some(([key, value]) => key !== "id" && value.trim())
    if (!hasAnyValue) {
      toast.error("Enter ledger row details first")
      return
    }

    const row = {
      ...draft,
      description: draft.description || selectedCompanyName,
    }
    const next = {
      ...ledgerRecords,
      [selectedKey]: [...selectedRows, row],
    }
    persistLedger(next)
    setDraft(emptyEntry())
    toast.success("Ledger row added")
  }

  const updateLedgerRow = (rowId: string, field: keyof LedgerEntry, value: string) => {
    const nextRows = selectedRows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    persistLedger({
      ...ledgerRecords,
      [selectedKey]: nextRows,
    })
  }

  const deleteLedgerRow = (rowId: string) => {
    persistLedger({
      ...ledgerRecords,
      [selectedKey]: selectedRows.filter((row) => row.id !== rowId),
    })
  }

  const printLedger = () => {
    if (!selectedCompany) {
      toast.error("Open a company ledger first")
      return
    }

    const logoUrl = `${window.location.origin}${COMPANY_LOGO_URL}`
    const backgroundUrl = `${window.location.origin}${LEDGER_BACKGROUND_URL}`
    const rows = rowsWithBalance.length
      ? rowsWithBalance
          .map(({ row, balance }, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${escapeHtml(row.date || "")}</td>
              <td>${escapeHtml(row.description || "")}</td>
              <td>${escapeHtml(row.invoiceNo || "")}</td>
              <td>${escapeHtml(row.shipDate || "")}</td>
              <td>${escapeHtml(row.bolNo || "")}</td>
              <td>${escapeHtml(row.truckNo || "")}</td>
              <td>${escapeHtml(row.containerNo || "")}</td>
              <td>${escapeHtml(row.containerType || "")}</td>
              <td>${escapeHtml(row.consignee || "")}</td>
              <td>${escapeHtml(row.quantity || "")}</td>
              <td>${escapeHtml(row.driverRent || "")}</td>
              <td>${escapeHtml(row.debit || "")}</td>
              <td>${escapeHtml(row.credit || "")}</td>
              <td>${money(balance)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="15" class="empty">No ledger rows yet.</td></tr>`

    const printWindow = window.open("", "_blank", "width=1400,height=900")
    if (!printWindow) {
      toast.error("Allow popups to print the ledger")
      return
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(selectedCompany.companyName)} Ledger</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body {
              counter-reset: page;
              margin: 0;
              color: #1f2937;
              font-family: Arial, Helvetica, sans-serif;
              background:
                linear-gradient(rgba(255, 255, 255, 0.72), rgba(255, 255, 255, 0.72)),
                url("${backgroundUrl}") center / cover no-repeat,
                radial-gradient(circle at top left, rgba(245, 158, 11, 0.20), transparent 32%),
                radial-gradient(circle at bottom right, rgba(217, 119, 6, 0.16), transparent 34%),
                linear-gradient(135deg, #fffbeb 0%, #ffffff 48%, #fef3c7 100%);
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .preview-shell {
              min-height: 100vh;
              padding: 28px;
            }
            .preview-toolbar {
              position: sticky;
              top: 16px;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              max-width: 1180px;
              margin: 0 auto 20px;
              border: 1px solid rgba(214, 168, 61, 0.42);
              border-radius: 24px;
              background:
                linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(255, 248, 229, 0.78));
              box-shadow: 0 22px 60px rgba(146, 64, 14, 0.18);
              padding: 14px 16px;
              backdrop-filter: blur(22px);
              -webkit-backdrop-filter: blur(22px);
            }
            .toolbar-brand {
              display: flex;
              align-items: center;
              gap: 12px;
              min-width: 0;
            }
            .toolbar-mark {
              display: grid;
              place-items: center;
              width: 42px;
              height: 42px;
              border: 1px solid rgba(214, 168, 61, 0.52);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.74);
              color: #92400e;
              font-size: 15px;
              font-weight: 950;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.9);
            }
            .toolbar-copy {
              min-width: 0;
            }
            .toolbar-title {
              color: #111827;
              font-size: 16px;
              font-weight: 900;
            }
            .toolbar-subtitle {
              margin-top: 2px;
              color: #92400e;
              font-size: 12px;
              font-weight: 800;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .toolbar-summary {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              justify-content: flex-end;
              gap: 8px;
            }
            .summary-chip {
              min-width: 112px;
              border: 1px solid rgba(214, 168, 61, 0.38);
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.72);
              padding: 8px 10px;
              box-shadow: 0 8px 22px rgba(146, 64, 14, 0.08);
            }
            .summary-label {
              color: #9a6a05;
              font-size: 8px;
              font-weight: 950;
              letter-spacing: 0.7px;
              text-transform: uppercase;
            }
            .summary-value {
              margin-top: 3px;
              color: #111827;
              font-size: 12px;
              font-weight: 950;
              line-height: 1.1;
            }
            .toolbar-actions {
              display: flex;
              gap: 8px;
              flex-shrink: 0;
            }
            .toolbar-button {
              border: 1px solid #b45309;
              border-radius: 14px;
              background: #d97706;
              color: #ffffff;
              cursor: pointer;
              font-size: 12px;
              font-weight: 900;
              min-height: 44px;
              padding: 10px 16px;
              box-shadow: 0 10px 22px rgba(217, 119, 6, 0.25);
            }
            .toolbar-button:hover {
              transform: translateY(-1px);
              box-shadow: 0 14px 28px rgba(217, 119, 6, 0.30);
            }
            .toolbar-button.secondary {
              background: rgba(255, 255, 255, 0.74);
              color: #92400e;
              border-color: rgba(217, 119, 6, 0.34);
            }
            @page {
              size: landscape;
              margin: 8mm;
            }
            .page {
              max-width: 100%;
              margin: 0 auto;
              min-height: 190mm;
              border: 3px solid #d6a83d;
              padding: 6mm;
              background:
                linear-gradient(rgba(255, 250, 240, 0.86), rgba(255, 250, 240, 0.86)),
                url("${backgroundUrl}") center / cover no-repeat;
              border-radius: 22px;
              box-shadow:
                0 34px 90px rgba(120, 53, 15, 0.24),
                inset 0 1px 0 rgba(255, 255, 255, 0.88);
              backdrop-filter: blur(14px);
              -webkit-backdrop-filter: blur(14px);
            }
            .header {
              display: grid;
              grid-template-columns: 1fr auto 1fr;
              align-items: start;
              gap: 18px;
              border-bottom: 2px solid #d6a83d;
              padding: 12px 12px 14px;
              margin-bottom: 14px;
              border-radius: 16px 16px 0 0;
              background: linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,247,224,0.42));
            }
            .shipper-block,
            .address-block {
              border: 1px solid #f0d38a;
              border-radius: 14px;
              background: rgba(255, 255, 255, 0.80);
              box-shadow: 0 14px 34px rgba(180, 83, 9, 0.10);
              backdrop-filter: blur(12px);
              -webkit-backdrop-filter: blur(12px);
              padding: 12px;
              min-height: 82px;
            }
            .address-block {
              text-align: right;
            }
            .brand {
              min-width: 240px;
              text-align: center;
            }
            .logo {
              display: block;
              height: 78px;
              width: auto;
              max-width: 240px;
              margin: 0 auto 6px;
              object-fit: contain;
            }
            .eyebrow {
              color: #9a6a05;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            h1 {
              margin: 4px 0 0;
              color: #111827;
              font-size: 20px;
              line-height: 1.1;
            }
            .date {
              margin-top: 4px;
              text-align: center;
              color: #4b5563;
              font-size: 12px;
              font-weight: 700;
            }
            .block-label {
              color: #9a6a05;
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 0.8px;
              text-transform: uppercase;
            }
            .block-title {
              margin-top: 5px;
              color: #111827;
              font-size: 18px;
              font-weight: 900;
              line-height: 1.15;
            }
            .block-text {
              margin-top: 5px;
              color: #374151;
              font-size: 10px;
              font-weight: 700;
              line-height: 1.35;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              font-size: 8.5px;
              background: rgba(255, 255, 255, 0.94);
            }
            .ledger-table-card {
              overflow: hidden;
              border: 1px solid rgba(154, 106, 5, 0.52);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.78);
              box-shadow: 0 16px 38px rgba(120, 53, 15, 0.12);
            }
            col.serial { width: 4%; }
            col.date { width: 7%; }
            col.description { width: 14%; }
            col.invoice { width: 7%; }
            col.ship-date { width: 7%; }
            col.bol { width: 9%; }
            col.truck { width: 8%; }
            col.container { width: 9%; }
            col.container-type { width: 8%; }
            col.consignee { width: 12%; }
            col.quantity { width: 5%; }
            col.driver-rent { width: 7%; }
            col.money { width: 6%; }
            th {
              border: 1px solid #9a6a05;
              background: linear-gradient(180deg, #f8db86 0%, #efc65f 100%);
              color: #111827;
              padding: 6px 4px;
              text-align: center;
              font-weight: 900;
              line-height: 1.15;
              overflow-wrap: normal;
              word-break: normal;
              white-space: nowrap;
              text-transform: uppercase;
              font-size: 9.5px;
            }
            td {
              border: 1px solid #d7b867;
              padding: 5px 4px;
              vertical-align: middle;
              overflow-wrap: break-word;
              line-height: 1.2;
              white-space: normal;
            }
            tbody tr:nth-child(even) td { background: #fff7df; }
            tfoot td {
              background: #111827;
              color: white;
              border-color: #111827;
              font-weight: 900;
              font-size: 10.5px;
              padding: 8px 6px;
            }
            .grand-total td {
              background: linear-gradient(90deg, #7c2d12 0%, #b45309 46%, #d97706 100%);
              border-color: #92400e;
              color: #fff7ed;
              font-size: 11px;
              letter-spacing: 0.2px;
            }
            .empty {
              text-align: center;
              padding: 22px;
              color: #6b7280;
              font-size: 10px;
              font-weight: 800;
            }
            .footer {
              display: grid;
              grid-template-columns: 1.4fr 0.7fr 1.3fr;
              gap: 10px;
              margin-top: 12px;
              color: #4b5563;
              font-size: 9px;
              font-weight: 700;
              line-height: 1.25;
            }
            .footer p {
              margin: 0;
              border: 1px solid rgba(214, 168, 61, 0.18);
              border-radius: 10px;
              background: rgba(255, 255, 255, 0.54);
              padding: 8px;
            }
            .summary-cards {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin: 18px 0;
            }
            .summary-card {
              border: 1px solid rgba(214, 168, 61, 0.35);
              border-radius: 16px;
              padding: 12px 14px;
              background: rgba(255, 255, 255, 0.92);
              box-shadow: 0 12px 28px rgba(146, 64, 14, 0.08);
            }
            .summary-card strong {
              display: block;
              font-size: 11px;
              letter-spacing: 0.08em;
              color: #92400e;
              text-transform: uppercase;
              font-weight: 900;
              margin-bottom: 6px;
            }
            .summary-card span {
              display: block;
              font-size: 18px;
              font-weight: 900;
              color: #111827;
            }
            .page-number {
              justify-self: end;
              text-align: right;
              font-size: 10px;
              color: #6b7280;
            }
            .page-number span::after {
              content: counter(page);
            }
            @media (max-width: 980px) {
              .preview-toolbar {
                align-items: stretch;
                flex-direction: column;
              }
              .toolbar-summary {
                justify-content: flex-start;
              }
              .toolbar-actions {
                justify-content: flex-end;
              }
            }
            @media print {
              body {
                background:
                  linear-gradient(rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.58)),
                  url("${backgroundUrl}") center / cover no-repeat !important;
              }
              .preview-shell {
                min-height: 0;
                padding: 0;
              }
              .preview-toolbar {
                display: none !important;
              }
              .page {
                max-width: none;
                margin: 0;
                border-radius: 0;
                box-shadow: none;
                background:
                  linear-gradient(rgba(255, 250, 240, 0.74), rgba(255, 250, 240, 0.74)),
                  url("${backgroundUrl}") center / cover no-repeat !important;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
              }
              .header {
                background: transparent !important;
              }
              .shipper-block,
              .address-block {
                box-shadow: none;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
                background: #ffffff !important;
              }
              .ledger-table-card {
                border-radius: 0;
                box-shadow: none;
                background: transparent;
              }
              .footer p {
                border: 0;
                background: transparent;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="preview-shell">
            <div class="preview-toolbar">
              <div class="toolbar-brand">
                <div class="toolbar-mark">SKY</div>
                <div class="toolbar-copy">
                  <div class="toolbar-title">Ledger Print Preview</div>
                  <div class="toolbar-subtitle">${escapeHtml(selectedCompany.companyName)}</div>
                </div>
              </div>
              <div class="toolbar-summary">
                <div class="summary-chip">
                  <div class="summary-label">Rows</div>
                  <div class="summary-value">${selectedRows.length}</div>
                </div>
                <div class="summary-chip">
                  <div class="summary-label">Driver Rent</div>
                  <div class="summary-value">${driverRentTotalText}</div>
                </div>
                <div class="summary-chip">
                  <div class="summary-label">Balance</div>
                  <div class="summary-value">${money(totals.debit - totals.credit)}</div>
                </div>
              </div>
              <div class="toolbar-actions">
                <button class="toolbar-button secondary" onclick="window.close()">Close</button>
                <button class="toolbar-button" onclick="window.print()">Print Ledger</button>
              </div>
            </div>
            <main class="page">
              <header class="header">
                <div class="shipper-block">
                  <div class="block-label">Shipper Name</div>
                  <div class="block-title">${escapeHtml(selectedCompany.companyName)}</div>
                  <div class="block-text">Company BOL account ledger entries</div>
                </div>
                <div class="brand">
                  <img class="logo" src="${logoUrl}" alt="Company logo" />
                  <div class="eyebrow">Company BOL Account Ledger</div>
                  <h1>BOL Account Ledger</h1>
                  <div class="date">${new Date().toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}</div>
                </div>
                <div class="address-block">
                  <div class="block-label">Company Address</div>
                  <div class="block-text">${COMPANY_ADDRESS}</div>
                  <div class="block-text">Licence: ${COMPANY_LICENCE}</div>
                  <div class="block-text">${COMPANY_CONTACT}</div>
                </div>
              </header>
              <section class="summary-cards">
                <div class="summary-card">
                  <strong>Rows</strong>
                  <span>${selectedRows.length}</span>
                </div>
                <div class="summary-card">
                  <strong>Driver Rent</strong>
                  <span>${driverRentTotalText}</span>
                </div>
                <div class="summary-card">
                  <strong>Balance USD</strong>
                  <span>${money(totals.debit - totals.credit)}</span>
                </div>
              </section>
            <section class="ledger-table-card">
            <table>
              <colgroup>
                <col class="serial" />
                <col class="date" />
                <col class="description" />
                <col class="invoice" />
                <col class="ship-date" />
                <col class="bol" />
                <col class="truck" />
                <col class="container" />
                <col class="container-type" />
                <col class="consignee" />
                <col class="quantity" />
                <col class="driver-rent" />
                <col class="money" />
                <col class="money" />
                <col class="money" />
              </colgroup>
              <thead>
                <tr>
                  <th>S.NO</th>
                  <th>DATE</th>
                  <th>SHIPPER /<br />DESCRIPTION</th>
                  <th>INVOICE<br />NO</th>
                  <th>DATE OF<br />SHIP</th>
                  <th>BILL OF<br />LADING</th>
                  <th>TRUCK NO.<br />/ شماره کامیون</th>
                  <th>CONTAINER<br />NO</th>
                  <th>CONTAINER<br />TYPE</th>
                  <th>CONSIGNEE<br />NAME</th>
                  <th>QUANTITY</th>
                  <th>DRIVER<br />RENT</th>
                  <th>DEBIT</th>
                  <th>CREDIT</th>
                  <th>BALANCE<br />USD</th>
                </tr>
              </thead>
                <tbody>${rows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="11">TOTAL</td>
                  <td>${driverRentTotalText}</td>
                  <td>${money(totals.debit)}</td>
                  <td>${money(totals.credit)}</td>
                  <td>${money(totals.debit - totals.credit)}</td>
                </tr>
                <tr class="grand-total">
                  <td colspan="11">GRAND TOTAL DRIVER RENTS</td>
                  <td colspan="4">${driverRentTotalText}</td>
                </tr>
              </tfoot>
            </table>
            </section>
              <footer class="footer">
                <p>AFGHANISTAN OFFICE: ${COMPANY_ADDRESS}</p>
                <p>LICENCE NUMBER: ${COMPANY_LICENCE}</p>
                <p>${COMPANY_CONTACT}</p>
                <p class="page-number">Page <span></span></p>
              </footer>
            </main>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const ledgerCard = (
    <Card className={`min-h-[720px] overflow-hidden rounded-[28px] border-amber-200/80 bg-white/80 shadow-2xl shadow-amber-100/80 backdrop-blur-2xl transition-all ${isFullScreen ? "h-full w-full rounded-2xl border-2 border-[#D4AF37] bg-white shadow-2xl" : ""}`}>
      <CardHeader className="border-b border-amber-200/80 bg-linear-to-r from-white via-amber-50/90 to-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white/80 text-amber-700 shadow-lg shadow-amber-100">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              BOL Account Ledger
            </CardTitle>
            <p className="mt-1 text-sm font-semibold text-amber-800/80">
              Company folders with ledger rows using the same columns as your ledger design.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="h-10 rounded-xl border-amber-300 bg-white/90 font-black text-amber-800 shadow-sm transition hover:bg-amber-100 flex items-center gap-1.5"
            >
              {isHeaderCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {isHeaderCollapsed ? "Show Full Header" : "Compact View"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="h-10 rounded-xl border-amber-300 bg-white/90 font-black text-amber-800 shadow-sm transition hover:bg-amber-100 flex items-center gap-1.5"
            >
              {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {isFullScreen ? "Exit Full Screen" : "Fit Full Screen"}
            </Button>
            <Input
              ref={newCompanyInputRef}
              value={newCompanyName}
              onChange={(event) => setNewCompanyName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void addCompany()
              }}
              placeholder="Add company name"
              disabled={isAddingCompany}
              aria-invalid={!!addCompanyError}
              aria-describedby="add-company-help"
              className="h-10 rounded-xl border-amber-200 bg-white/90 shadow-inner shadow-amber-50 focus:border-amber-400 focus:ring-amber-200"
            />
            <Button type="button" onClick={() => void addCompany()} disabled={isAddingCompany} className="h-10 rounded-xl bg-amber-600 text-white shadow-lg shadow-amber-200 hover:bg-amber-700">
              {isAddingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isAddingCompany ? "Adding..." : "Add Company"}
            </Button>
            <div id="add-company-help" className="mt-2 text-sm">
              {addCompanyError ? (
                <span className="text-red-600 font-semibold">{addCompanyError}</span>
              ) : recentlyAddedCompanyName ? (
                <span className="text-emerald-700 font-semibold">Added {recentlyAddedCompanyName}</span>
              ) : (
                <span className="text-slate-500">Press Enter to add</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className="grid min-h-[640px] gap-4 bg-cover bg-center bg-no-repeat p-4 xl:grid-cols-[320px_1fr]"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.78), rgba(255, 251, 235, 0.78)), url(${LEDGER_BACKGROUND_URL})`,
        }}
      >
        {isLedgerLoading || ledgerStorageError ? (
          <div
            className={`rounded-2xl border p-3 text-sm font-black shadow-sm xl:col-span-2 ${
              ledgerStorageError
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {ledgerStorageError
              ? `${ledgerStorageError}. Existing browser data is still shown as a backup.`
              : "Loading saved account ledger data from local backend storage..."}
          </div>
        ) : null}

        <aside className="rounded-2xl border border-amber-200/80 bg-white/70 p-3 shadow-xl shadow-amber-100/60 backdrop-blur-xl">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company"
              className="h-10 rounded-xl border-amber-200 bg-white/80 pl-9 shadow-inner shadow-amber-50 focus:border-amber-400 focus:ring-amber-200"
            />
          </div>

          <div className="space-y-2">
            {companies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                Add a company name to create its BOL account ledger.
              </div>
            ) : (
              companies.map((company) => (
                <button
                  key={company.companyName}
                  type="button"
                  data-company-name={company.companyName}
                  onClick={() => setSelectedCompanyName(company.companyName)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedCompanyName === company.companyName
                      ? "border-amber-500 bg-linear-to-r from-amber-600 to-yellow-500 text-white shadow-lg shadow-amber-200"
                      : "border-amber-100 bg-white/75 text-slate-800 shadow-sm hover:border-amber-300 hover:bg-amber-50"
                  } ${recentlyAddedCompanyName === company.companyName ? "ring-2 ring-emerald-400" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        selectedCompanyName === company.companyName ? "bg-white/20" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{company.companyName}</p>
                      <p className={`mt-1 text-xs font-semibold ${
                        selectedCompanyName === company.companyName ? "text-white/80" : "text-slate-500"
                      }`}>
                        {company.ledgerRows} ledger row{company.ledgerRows === 1 ? "" : "s"} - {company.docs.length} BOL
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="min-w-0">
          {!selectedCompany ? (
            <div className="flex min-h-[560px] items-center justify-center rounded-2xl border border-dashed border-amber-300 bg-white/60 p-8 text-center backdrop-blur">
              <div>
                <Building2 className="mx-auto h-12 w-12 text-amber-600" />
                <p className="mt-3 text-lg font-black text-slate-950">Open a company account</p>
                <p className="mt-1 text-sm font-semibold text-amber-800/80">
                  Select a company on the left to add and edit its ledger.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border-[3px] border-[#D4AF37] bg-white/80 p-5 shadow-2xl shadow-amber-100/80 backdrop-blur-2xl">
              <div
                className="overflow-hidden rounded-2xl border border-amber-200/90 bg-white/82 shadow-2xl shadow-amber-100/70 backdrop-blur-2xl"
                style={{
                  backgroundImage: `linear-gradient(rgba(255, 250, 240, 0.86), rgba(255, 250, 240, 0.86)), url(${LEDGER_BACKGROUND_URL})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="border-b-2 border-[#D4AF37] bg-white/35 p-4 text-slate-950">
                  {!isHeaderCollapsed ? (
                    <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start mb-4">
                      <div className="min-h-24 rounded-2xl border border-amber-200/80 bg-white/75 p-4 shadow-sm backdrop-blur-xl">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Shipper Name</p>
                        <h3 className="mt-2 text-2xl font-black leading-tight text-slate-950">{selectedCompany.companyName}</h3>
                        <p className="mt-2 text-sm font-semibold text-slate-600">Company BOL account ledger entries</p>
                      </div>

                      <div className="flex min-w-60 flex-col items-center rounded-2xl border border-amber-200/80 bg-white/75 p-4 text-center shadow-lg shadow-amber-100/70 backdrop-blur-xl">
                        <img src={COMPANY_LOGO_URL} alt="Company logo" className="h-20 w-auto max-w-56 object-contain" />
                        <p className="mt-2 text-xs font-black uppercase tracking-wide text-amber-700">Company BOL Account Ledger</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">BOL Account Ledger</h3>
                        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>

                      <div className="min-h-24 rounded-2xl border border-amber-200/80 bg-white/75 p-4 text-left shadow-sm backdrop-blur-xl md:text-right">
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Company Address</p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-slate-700">{COMPANY_ADDRESS}</p>
                        <p className="mt-2 text-xs font-black text-slate-600">Licence: {COMPANY_LICENCE}</p>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">{COMPANY_CONTACT}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 flex items-center justify-between rounded-xl border border-amber-200/90 bg-white/80 px-4 py-2.5 shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="h-5 w-5 text-amber-700" />
                        <span className="text-base font-black text-slate-950">{selectedCompany.companyName}</span>
                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          Licence: {COMPANY_LICENCE}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="text-xs font-bold text-slate-600">
                      Rows: <span className="font-black text-slate-950">{selectedRows.length}</span> | USD Balance: <span className="font-black text-amber-700">{money(totals.debit - totals.credit)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={printLedger}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-700 bg-amber-600 px-4 text-sm font-black text-white shadow-lg shadow-amber-200 transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        title="Print ledger"
                        aria-label="Print ledger"
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 border-b border-amber-100 bg-white/45 p-3 md:grid-cols-2 xl:grid-cols-6">
                  <Input value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} type="date" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.invoiceNo} onChange={(event) => setDraft({ ...draft, invoiceNo: event.target.value })} placeholder="Invoice.No" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.shipDate} onChange={(event) => setDraft({ ...draft, shipDate: event.target.value })} type="date" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.bolNo} onChange={(event) => setDraft({ ...draft, bolNo: event.target.value })} placeholder="B/L No / بی ال" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.containerNo} onChange={(event) => setDraft({ ...draft, containerNo: event.target.value })} placeholder="Container No / د کانټینر شمېره" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.containerType} onChange={(event) => setDraft({ ...draft, containerType: event.target.value })} placeholder="Container Type / د کانټینر ډول" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.consignee} onChange={(event) => setDraft({ ...draft, consignee: event.target.value })} placeholder="Consignee Name / د مال وصول کوونکی" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Shipper / Description" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200 xl:col-span-2" />
                  <Input value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} placeholder="Quantity" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.driverRent || ""} onChange={(event) => setDraft({ ...draft, driverRent: event.target.value })} placeholder="Driver Rent" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.debit} onChange={(event) => setDraft({ ...draft, debit: event.target.value })} placeholder="Debit USD" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Input value={draft.credit} onChange={(event) => setDraft({ ...draft, credit: event.target.value })} placeholder="Credit USD" className="h-10 rounded-xl border-amber-200 bg-white/80 focus:border-amber-400 focus:ring-amber-200" />
                  <Button type="button" onClick={addLedgerRow} className="h-10 rounded-xl bg-slate-950 text-white shadow-lg shadow-amber-100 hover:bg-slate-800">
                    <Plus className="h-4 w-4" />
                    Add Row
                  </Button>
                </div>

                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] min-h-[400px] rounded-[24px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/10">
                  <table className="w-full min-w-[1600px] table-fixed border-separate border-spacing-0 text-[11px] sm:text-xs">
                    <colgroup>
                      <col className="w-[8%]" />
                      <col className="w-[7%]" />
                      <col className="w-[14%]" />
                      <col className="w-[8%]" />
                      <col className="w-[9%]" />
                      <col className="w-[8%]" />
                      <col className="w-[16%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[4%]" />
                      <col className="w-[7%]" />
                      <col className="w-[5%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[4%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-950/95 text-slate-100 backdrop-blur-md">
                      <tr>
                        {[
                          ["BALANCE", "USD"],
                          ["DEBIT"],
                          ["CONSIGNEE", "NAME / د مال وصول کوونکی"],
                          ["B/L", "NO / بی ال"],
                          ["CONTAINER", "NO / د کانټینر شمېره"],
                          ["CONTAINER", "TYPE / د کانټینر ډول"],
                          ["SHIPPER /", "DESCRIPTION"],
                          ["DATE"],
                          ["INVOICE", "NO"],
                          ["S.NO"],
                          ["TRUCK", "NO.", "/ شماره کامیون"],
                          ["QUANTITY"],
                          ["DRIVER", "RENT"],
                          ["CREDIT"],
                          ["ACTION"],
                        ].map((heading) => (
                          <th key={heading.join(" ")} className="whitespace-normal border-slate-800 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-100">
                            {heading.map((line) => (
                              <span key={line} className="block leading-tight">
                                {line}
                              </span>
                            ))}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRows.length === 0 ? (
                        <tr>
                          <td colSpan={15} className="border border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                            No ledger rows yet. Add a row above to get started.
                          </td>
                        </tr>
                      ) : (
                        rowsWithBalance.map(({ row, balance }, index) => {
                          return (
                            <tr key={row.id} className="bg-white/90 transition hover:bg-slate-50">
                              <td className="border border-slate-200/80 bg-emerald-50 px-3 py-2 text-right font-black text-emerald-700">
                                {money(balance)}
                              </td>
                              <LedgerCell
                                value={row.debit}
                                onChange={(value) => updateLedgerRow(row.id, "debit", value)}
                                className="font-black text-red-700"
                              />
                              <LedgerCell value={row.consignee} onChange={(value) => updateLedgerRow(row.id, "consignee", value)} className="whitespace-normal text-left" />
                              <LedgerCell value={row.bolNo} onChange={(value) => updateLedgerRow(row.id, "bolNo", value)} className="font-black text-slate-900" />
                              <LedgerCell value={row.containerNo} onChange={(value) => updateLedgerRow(row.id, "containerNo", value)} className="font-black text-slate-900" />
                              <LedgerCell value={row.containerType} onChange={(value) => updateLedgerRow(row.id, "containerType", value)} className="font-black text-slate-900" />
                              <LedgerCell value={row.description} onChange={(value) => updateLedgerRow(row.id, "description", value)} className="whitespace-normal text-left" />
                              <LedgerCell value={row.date} onChange={(value) => updateLedgerRow(row.id, "date", value)} type="date" />
                              <LedgerCell value={row.invoiceNo} onChange={(value) => updateLedgerRow(row.id, "invoiceNo", value)} />
                              <td className="border border-slate-200/80 px-3 py-2 text-center font-black text-slate-700">
                                {index + 1}
                              </td>
                              <LedgerCell value={row.truckNo || ""} onChange={(value) => updateLedgerRow(row.id, "truckNo", value)} />
                              <LedgerCell value={row.quantity} onChange={(value) => updateLedgerRow(row.id, "quantity", value)} />
                              <LedgerCell value={row.driverRent || ""} onChange={(value) => updateLedgerRow(row.id, "driverRent", value)} />
                              <LedgerCell value={row.credit} onChange={(value) => updateLedgerRow(row.id, "credit", value)} className="font-black text-emerald-700" />
                              <td className="border border-slate-200/80 px-2 py-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => deleteLedgerRow(row.id)}
                                  className="h-8 w-8 rounded-lg p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Delete row"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950 text-white">
                        <td colSpan={15} className="border border-slate-700 px-3 py-3 text-right text-sm font-black">
                          TOTALS — Driver Rent: {driverRentTotalText} · Debit: {money(totals.debit)} · Credit: {money(totals.credit)} · Balance: {money(totals.debit - totals.credit)}
                        </td>
                      </tr>
                      <tr className="bg-amber-600 text-white">
                        <td colSpan={15} className="border border-amber-700 px-3 py-3 text-right text-sm font-black">
                          GRAND TOTAL DRIVER RENTS — {driverRentTotalText}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid gap-3 border-t border-amber-100 bg-amber-50/60 p-4 text-xs font-semibold text-slate-700 md:grid-cols-3">
                  <p>AFGHANISTAN OFFICE: 2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan.</p>
                  <p>LICENCE NUMBER: 2401-2198</p>
                  <p>EMAIL: info@skyariana.com, transport@skyariana.com - MOB: +93 700 939 365, +93 711 435 529</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  )

  if (isFullScreen && mounted) {
    return createPortal(
      <div className="fixed inset-0 z-[9999999] flex flex-col h-screen w-screen bg-slate-950/70 backdrop-blur-2xl p-2 sm:p-4 overflow-hidden">
        <div className="flex-1 w-full h-full min-h-0 overflow-auto rounded-2xl shadow-2xl">
          {ledgerCard}
        </div>
      </div>,
      document.body
    )
  }

  return ledgerCard
}

function LedgerCell({
  value,
  onChange,
  type = "text",
  className = "",
}: {
  value: string
  onChange: (value: string) => void
  type?: "text" | "date"
  className?: string
}) {
  return (
    <td className="border border-amber-200 p-1">
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-8 w-full min-w-20 rounded-xl border border-blue-100/70 bg-white/70 px-2 text-xs font-semibold text-slate-800 shadow-sm outline-none transition focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${className}`}
      />
    </td>
  )
}
