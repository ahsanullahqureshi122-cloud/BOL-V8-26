"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Building2,
  Calendar,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Eye,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
  Loader2,
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
  const [viewerRowId, setViewerRowId] = useState<string | null>(null)
  const [pdfZoom, setPdfZoom] = useState(1)
  const [isLedgerLoading, setIsLedgerLoading] = useState(true)
  const [ledgerStorageError, setLedgerStorageError] = useState("")
  const [isAddingCompany, setIsAddingCompany] = useState(false)
  const [addCompanyError, setAddCompanyError] = useState("")
  const [recentlyAddedCompanyName, setRecentlyAddedCompanyName] = useState<string | null>(null)
  const newCompanyInputRef = useRef<HTMLInputElement | null>(null)
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
  const viewerRow = viewerRowId ? selectedRows.find((row) => row.id === viewerRowId) || null : null
  const viewerPdfUrl = viewerRow?.pdfFile
    ? `/ledger/${encodeURIComponent(viewerRow.id)}/pdf?path=${encodeURIComponent(viewerRow.pdfFile)}`
    : ""

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

  const uploadLedgerPdf = (row: LedgerEntry) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf,.pdf"

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed")
        return
      }

      const formData = new FormData()
      formData.append("pdf", file)
      if (row.pdfFile) {
        formData.append("oldPath", row.pdfFile)
      }

      try {
        const response = await fetch(`/ledger/${encodeURIComponent(row.id)}/upload-pdf`, {
          method: "POST",
          body: formData,
        })
        const result = await response.json()

        if (!response.ok || !result.pdf_file) {
          throw new Error(result.error || "Could not upload PDF")
        }

        updateLedgerRow(row.id, "pdfFile", result.pdf_file)
        toast.success(row.pdfFile ? "Ledger PDF replaced" : "Ledger PDF uploaded")
      } catch (error) {
        toast.error("PDF upload failed", {
          description: error instanceof Error ? error.message : "Please choose a valid PDF file.",
        })
      }
    }

    input.click()
  }

  const openPdfViewer = (row: LedgerEntry) => {
    setViewerRowId(row.id)
    setPdfZoom(1)
  }

  const closePdfViewer = () => {
    setViewerRowId(null)
    setPdfZoom(1)
  }

  const deleteLedgerPdf = async (row: LedgerEntry) => {
    if (!row.pdfFile) return

    try {
      const response = await fetch(`/ledger/${encodeURIComponent(row.id)}/pdf`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: row.pdfFile }),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || "Could not delete PDF")
      }

      updateLedgerRow(row.id, "pdfFile", "")
      closePdfViewer()
      toast.success("Ledger PDF deleted")
    } catch (error) {
      toast.error("PDF delete failed", {
        description: error instanceof Error ? error.message : "Could not delete this PDF.",
      })
    }
  }

  const deleteLedgerRow = (rowId: string) => {
    persistLedger({
      ...ledgerRecords,
      [selectedKey]: selectedRows.filter((row) => row.id !== rowId),
    })
  }

  const addBolRowsToLedger = () => {
    if (!selectedCompany || selectedCompany.docs.length === 0) return

    const existingBolNumbers = new Set(selectedRows.map((row) => row.bolNo.trim()).filter(Boolean))
    const rows = selectedCompany.docs
      .filter((doc) => docBolNumber(doc) && !existingBolNumbers.has(docBolNumber(doc)))
      .map((doc) => ledgerRowFromDocument(doc, selectedCompany.companyName))

    if (rows.length === 0) {
      toast.info("All BOL rows are already in this ledger")
      return
    }

    persistLedger({
      ...ledgerRecords,
      [selectedKey]: [...selectedRows, ...rows],
    })
    toast.success(`${rows.length} BOL row${rows.length === 1 ? "" : "s"} added to ledger`)
  }

  const exportCsv = () => {
    if (!selectedCompany) return

    const headers = [
      "S.NO",
      "DATE",
      "SHIPPER/DESCRIPTION",
      "INVOICE.NO",
      "DATE-OF-SHIP",
      "BILL OF LANDING",
      "TRUCK NO",
      "CONTAINER.NO",
      "CONTAINER TYPE",
      "CONSIGNEE NAME",
      "QUANTITY",
      "DRIVER RENT",
      "DEBIT",
      "CREDIT",
      "BALANCE USD",
      "PDF ATTACHMENT",
    ]
    let balance = 0
    const lines = selectedRows.map((row, index) => {
      balance += numberValue(row.debit) - numberValue(row.credit)
      return [
        index + 1,
        row.date,
        row.description,
        row.invoiceNo,
        row.shipDate,
        row.bolNo,
        row.truckNo || "",
        row.containerNo,
        row.containerType || "",
        row.consignee,
        row.quantity,
        row.driverRent || "",
        row.debit,
        row.credit,
        balance.toFixed(2),
        row.pdfFile || "",
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    })

    const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${selectedCompany.companyName.replace(/[^a-z0-9]+/gi, "-")}-ledger.csv`
    link.click()
    URL.revokeObjectURL(url)
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
            .page {
              max-width: 1180px;
              margin: 0 auto;
              min-height: 190mm;
              border: 3px solid #d6a83d;
              padding: 8mm;
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
              font-size: 8.2px;
              background: rgba(255, 255, 255, 0.94);
            }
            .ledger-table-card {
              overflow: hidden;
              border: 1px solid rgba(154, 106, 5, 0.52);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.78);
              box-shadow: 0 16px 38px rgba(120, 53, 15, 0.12);
            }
            col.serial { width: 5%; }
            col.date { width: 8%; }
            col.description { width: 13%; }
            col.invoice { width: 8%; }
            col.ship-date { width: 8%; }
            col.bol { width: 8%; }
            col.truck { width: 8%; }
            col.container { width: 8%; }
            col.consignee { width: 9%; }
            col.quantity { width: 6%; }
            col.driver-rent { width: 7%; }
            col.money { width: 6%; }
            th {
              border: 1px solid #9a6a05;
              background: linear-gradient(180deg, #f8db86 0%, #efc65f 100%);
              color: #111827;
              padding: 6px 5px;
              text-align: left;
              font-weight: 900;
              line-height: 1.12;
              overflow-wrap: anywhere;
              white-space: normal;
              text-transform: uppercase;
            }
            td {
              border: 1px solid #d7b867;
              padding: 6px 5px;
              vertical-align: top;
              overflow-wrap: anywhere;
              line-height: 1.2;
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

  return (
    <>
    <Card className="min-h-[720px] overflow-hidden rounded-[28px] border-amber-200/80 bg-white/80 shadow-2xl shadow-amber-100/80 backdrop-blur-2xl">
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

          <div className="flex flex-col gap-2 sm:flex-row">
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
                  <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
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

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addBolRowsToLedger}
                      className="h-10 rounded-xl border-amber-200 bg-white/80 text-amber-800 shadow-sm hover:bg-amber-50"
                    >
                      <Plus className="h-4 w-4" />
                      Add BOL Rows
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={exportCsv}
                      className="h-10 rounded-xl border-amber-200 bg-white/80 text-amber-800 shadow-sm hover:bg-amber-50"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
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

                <div className="overflow-x-auto rounded-[24px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/10">
                  <table className="w-full min-w-[1840px] table-fixed border-separate border-spacing-0 text-[11px] sm:text-xs">
                    <colgroup>
                      <col className="w-[5%]" />
                      <col className="w-[7%]" />
                      <col className="w-[8%]" />
                      <col className="w-[7%]" />
                      <col className="w-[14%]" />
                      <col className="w-[10%]" />
                      <col className="w-[9%]" />
                      <col className="w-[9%]" />
                      <col className="w-[18%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[4%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                    </colgroup>
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-950/95 text-slate-100 backdrop-blur-md">
                      <tr>
                        {[
                          ["MEDIA"],
                          ["PDF", "STATUS"],
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
                          <td colSpan={17} className="border border-slate-200 p-8 text-center text-sm font-semibold text-slate-500">
                            No ledger rows yet. Add a row above or add saved BOL rows.
                          </td>
                        </tr>
                      ) : (
                        rowsWithBalance.map(({ row, balance }, index) => {
                          return (
                            <tr key={row.id} className="bg-white/90 transition hover:bg-slate-50">
                              <td className="border border-slate-200/80 bg-slate-50 px-3 py-2 text-center text-[11px] font-black text-slate-700">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                  <FileText className="h-4 w-4" />
                                </span>
                              </td>
                              <td className="border border-slate-200/80 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${row.pdfFile ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                                  {row.pdfFile ? "Attached" : "Missing"}
                                </span>
                              </td>
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
                                {row.pdfFile ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openPdfViewer(row)}
                                    className="h-8 w-full rounded-lg border-emerald-200 bg-emerald-50 px-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
                                    title="View attached PDF"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    View
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => uploadLedgerPdf(row)}
                                    className="h-8 w-full rounded-lg border-amber-200 bg-white px-2 text-xs font-black text-amber-800 hover:bg-amber-50"
                                    title="Upload PDF attachment"
                                  >
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-950 text-white">
                        <td colSpan={17} className="border border-slate-700 px-3 py-3 text-right text-sm font-black">
                          TOTALS — Driver Rent: {driverRentTotalText} · Debit: {money(totals.debit)} · Credit: {money(totals.credit)} · Balance: {money(totals.debit - totals.credit)}
                        </td>
                      </tr>
                      <tr className="bg-amber-600 text-white">
                        <td colSpan={17} className="border border-amber-700 px-3 py-3 text-right text-sm font-black">
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
    {viewerRow && viewerPdfUrl ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-md">
        <div className="flex h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-amber-200/70 bg-white/82 shadow-2xl shadow-slate-950/30 backdrop-blur-2xl">
          <div className="flex flex-col gap-3 border-b border-amber-200/80 bg-linear-to-r from-white via-amber-50 to-yellow-100 p-3 text-slate-950 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">Ledger PDF Attachment</p>
                <p className="truncate text-xs font-semibold text-amber-800">{viewerRow.bolNo || viewerRow.invoiceNo || viewerRow.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPdfZoom((value) => Math.max(0.5, Number((value - 0.1).toFixed(2))))}
                className="h-9 rounded-xl border-amber-200 bg-white/80 text-slate-800 hover:bg-amber-50"
                title="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="min-w-14 rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-center text-xs font-black text-slate-700">
                {Math.round(pdfZoom * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPdfZoom((value) => Math.min(2, Number((value + 0.1).toFixed(2))))}
                className="h-9 rounded-xl border-amber-200 bg-white/80 text-slate-800 hover:bg-amber-50"
                title="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <a
                href={viewerPdfUrl}
                download
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 text-xs font-black text-amber-800 shadow-sm transition hover:bg-amber-50"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <a
                href={viewerPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-3 text-xs font-black text-amber-800 shadow-sm transition hover:bg-amber-50"
              >
                <ExternalLink className="h-4 w-4" />
                New Tab
              </a>
              <Button
                type="button"
                variant="outline"
                onClick={() => uploadLedgerPdf(viewerRow)}
                className="h-9 rounded-xl border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 hover:bg-emerald-100"
              >
                <Upload className="h-4 w-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => deleteLedgerPdf(viewerRow)}
                className="h-9 rounded-xl border-red-200 bg-red-50 text-xs font-black text-red-700 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closePdfViewer}
                className="h-9 rounded-xl border-slate-200 bg-white/80 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>

          <PdfCanvasViewer pdfUrl={viewerPdfUrl} zoom={pdfZoom} />
        </div>
      </div>
    ) : null}
    </>
  )
}

const PDFJS_SCRIPT_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"

declare global {
  interface Window {
    pdfjsLib?: any
    __ledgerPdfJsLoading?: Promise<any>
  }
}

function loadPdfJs() {
  if (typeof window === "undefined") return Promise.reject(new Error("PDF viewer is only available in the browser"))
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib)
  if (window.__ledgerPdfJsLoading) return window.__ledgerPdfJsLoading

  window.__ledgerPdfJsLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = PDFJS_SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (!window.pdfjsLib) {
        reject(new Error("PDF.js did not load"))
        return
      }
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error("Could not load PDF.js viewer"))
    document.head.appendChild(script)
  })

  return window.__ledgerPdfJsLoading
}

function PdfCanvasViewer({ pdfUrl, zoom }: { pdfUrl: string; zoom: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const renderRunRef = useRef(0)
  const [status, setStatus] = useState("Loading PDF...")
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    const runId = renderRunRef.current + 1
    renderRunRef.current = runId

    const renderPdf = async () => {
      const container = containerRef.current
      if (!container) return

      container.innerHTML = ""
      setError("")
      setStatus("Loading PDF...")

      try {
        const pdfjsLib = await loadPdfJs()
        if (cancelled || runId !== renderRunRef.current) return

        const response = await fetch(pdfUrl, { cache: "no-store" })
        if (!response.ok) throw new Error(`PDF request failed (${response.status})`)

        const contentType = response.headers.get("content-type") || ""
        if (!contentType.includes("application/pdf")) {
          throw new Error(`Server returned ${contentType || "unknown file type"} instead of application/pdf`)
        }

        const data = await response.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data }).promise
        if (cancelled || runId !== renderRunRef.current) return

        setStatus(`Rendering ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"}...`)
        container.innerHTML = ""

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || runId !== renderRunRef.current) return

          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: Math.max(0.5, Math.min(2.5, zoom)) })
          const canvas = document.createElement("canvas")
          const context = canvas.getContext("2d")
          if (!context) throw new Error("Canvas rendering is not available")

          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = "mx-auto mb-5 block max-w-full rounded-lg bg-white shadow-xl shadow-slate-300"

          const pageShell = document.createElement("div")
          pageShell.className = "mx-auto mb-4 w-fit max-w-full rounded-xl border border-slate-200 bg-white p-3"
          pageShell.appendChild(canvas)
          container.appendChild(pageShell)

          await page.render({ canvasContext: context, viewport }).promise
        }

        setStatus("")
      } catch (viewerError) {
        const message = viewerError instanceof Error ? viewerError.message : "Could not render this PDF"
        setError(message)
        setStatus("")
      }
    }

    void renderPdf()

    return () => {
      cancelled = true
    }
  }, [pdfUrl, zoom])

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-slate-100/80 p-4">
      {status ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-white/80 px-4 py-3 text-sm font-black text-amber-800 shadow-sm">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="flex min-h-[62vh] flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-white/85 p-8 text-center shadow-xl shadow-slate-200">
          <FileText className="h-10 w-10 text-amber-700" />
          <p className="text-sm font-black text-slate-900">PDF preview could not render inside this window.</p>
          <p className="max-w-xl text-xs font-semibold text-slate-500">{error}</p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white shadow-lg shadow-amber-100"
          >
            <ExternalLink className="h-4 w-4" />
            Open PDF
          </a>
        </div>
      ) : null}
      <div ref={containerRef} className="mx-auto max-w-6xl pb-8" />
    </div>
  )
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
