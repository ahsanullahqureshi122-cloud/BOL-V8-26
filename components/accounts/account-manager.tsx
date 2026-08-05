"use client"

import { Fragment, useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent, ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  HardDrive,
  Heart,
  Images,
  Info,
  MapPin,
  Maximize2,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Settings,
  Share2,
  Tags,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import {
  DEFAULT_ACCOUNT_LEDGER_SETTINGS,
  DEFAULT_FOOTER_INFO,
  DEFAULT_OFFICE_ADDRESS,
  readAccountLedgerSettings,
  type AccountLedgerDefaults,
} from "@/components/accounts/account-ledger-settings"
import { ExportAccountLedgerPrint } from "@/components/accounts/ExportAccountLedgerPrint"
import shipperSeedData from "@/lib/data/shippers-from-pdf.json"
import consigneeSeedData from "@/lib/data/consignees-from-pdf.json"
import "@/styles/ledger-grid.css"
import { EditableCell } from "@/components/accounts/EditableCell"
import { Badge } from "@/components/accounts/Badge"
import { LedgerRow } from "@/components/accounts/LedgerRow"
import { MediaGrid } from "@/components/accounts/MediaGrid"
import { MoneyInput, formatMoney } from "@/components/accounts/MoneyInput"

type StrictAccountType = "import" | "export"
type AccountType = StrictAccountType | "both"
type AccountStatus = "active" | "inactive"

type AccountRecord = {
  id: string
  companyName: string
  address: string
  contact: string
  type: AccountType
  accountType?: AccountType
  email?: string
  licenceNo?: string
  openingBalance?: number
  currency?: string
  notes?: string
  status?: AccountStatus
  createdAt?: string
  updatedAt?: string
}

type MediaKind = "image" | "video" | "audio" | "document"

type MediaAttachment = {
  id: string
  name: string
  originalName: string
  url: string
  type: string
  kind: MediaKind
  size?: number
  uploadedAt: string
  storagePath?: string
  favorite?: boolean
}

type LedgerEntry = {
  id: string
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
  pdfName?: string
  pdfDataUrl?: string
  pdfUrl?: string
  statusPdfName?: string
  statusPdfDataUrl?: string
  statusPdfUrl?: string
  mediaName?: string
  mediaUrl?: string
  mediaType?: string
  mediaFiles?: MediaAttachment[]
  receiptId?: string
  receiptNo?: string
}

type BalanceMethod = "debitMinusCredit" | "creditMinusDebit"

type ReceiptRecord = {
  id: string
  receiptNo: string
  ledgerRowId: string
  accountId: string
  accountName: string
  date: string
  receivedFrom: string
  amount: number
  currency: string
  paymentMethod: string
  description: string
  blNo?: string
  containerNo?: string
  consignee?: string
  createdAt: string
  updatedAt: string
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

type SavedParty = {
  id?: string
  name: string
  address?: string
  contact?: string
  email?: string
}

type AccountLedgerSnapshot = {
  accounts: AccountRecord[]
  ledgerEntries: Record<string, LedgerEntry[]>
  ledgerProfiles: Record<string, LedgerProfile>
  receipts: Record<string, import("@/lib/ledger-types").ReceiptRecord>
}

// Account ledger table columns — must match grid template in ledger-grid.css
const ledgerColumns = [
  { id: "sNo", en: "S.NO", ps: "مسلسل" },
  { id: "date", en: "DATE", ps: "تاریخ" },
  { id: "description", en: "SHIPPER / DESCRIPTION", ps: "لېږدونکی / تفصیل" },
  { id: "billOfLanding", en: "B/L NO", ps: "بی ال" },
  { id: "containerType", en: "CONTAINER", ps: "کانټینر" },
  { id: "quantity", en: "QTY / PKG", ps: "مقدار" },
  { id: "debit", en: "DEBIT", ps: "ډیبت" },
  { id: "credit", en: "CREDIT", ps: "کریډیټ" },
  { id: "balanceUsd", en: "BALANCE USD", ps: "بیلانس" },
  { id: "media", en: "MEDIA", ps: "مېډیا" },
  { id: "actions", en: "", ps: "" },
] as const

const CONTAINER_TYPE_OPTIONS = [
  "20FT Standard / 20GP",
  "40FT Standard / 40GP",
  "40FT High Cube / 40HC",
  "45FT High Cube / 45HC",
  "20FT Reefer / 20RF",
  "40FT Reefer / 40RF",
  "40FT High Cube Reefer / 40RH",
  "20FT Open Top / 20OT",
  "40FT Open Top / 40OT",
  "20FT Flat Rack / 20FR",
  "40FT Flat Rack / 40FR",
  "20FT Tank / 20TK",
  "40FT Tank",
  "20FT Platform",
  "40FT Platform",
  "Curtain Side / Chadhari",
  "Bulk Cargo",
  "LCL",
  "FCL",
  "Truck",
  "Trailer",
  "20FT Standard",
  "40FT Standard",
  "40FT High Cube",
  "45FT High Cube",
  "Reefer",
  "Open Top",
  "Flat Rack",
  "Tank",
  "Chadori",
  "Other",
]

const ACCOUNTS_STORAGE_KEY = "sky_accounts_manager_accounts"
const LEDGER_STORAGE_KEY = "sky_accounts_manager_ledgers"
const LEDGER_PROFILE_STORAGE_KEY = "sky_accounts_manager_profiles"
const RECEIPTS_STORAGE_KEY = "sky_accounts_manager_receipts"
const MEDIA_STORAGE_LABEL = "Local PC Storage: public/uploads/account-ledger-media"
const csvEscape = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`

const accountTypeLabels: Record<StrictAccountType, { title: string; badge: string; workspace: string; success: string }> = {
  export: {
    title: "Export Accounts",
    badge: "EXPORT",
    workspace: "Export Accounts Workspace",
    success: "Export account created successfully",
  },
  import: {
    title: "Import Accounts",
    badge: "IMPORT",
    workspace: "Import Accounts Workspace",
    success: "Import account created successfully",
  },
}

function resolveAccountType(account: Partial<AccountRecord>): AccountType {
  const value = String(account.accountType || account.type || "").toLowerCase()
  if (value === "import" || value === "export" || value === "both") return value
  return "both"
}

function isStrictAccountType(value: AccountType): value is StrictAccountType {
  return value === "import" || value === "export"
}

function normalizeAccountRecord(account: Partial<AccountRecord>): AccountRecord {
  const type = resolveAccountType(account)
  const createdAt = account.createdAt || new Date().toISOString()

  return {
    id: account.id || crypto.randomUUID(),
    companyName: String(account.companyName || "").trim(),
    address: String(account.address || "").trim(),
    contact: String(account.contact || "").trim(),
    type,
    accountType: type,
    email: String(account.email || "").trim(),
    licenceNo: String(account.licenceNo || "").trim(),
    openingBalance: Number(account.openingBalance || 0),
    currency: String(account.currency || "USD").trim() || "USD",
    notes: String(account.notes || "").trim(),
    status: account.status === "inactive" ? "inactive" : "active",
    createdAt,
    updatedAt: account.updatedAt || createdAt,
  }
}

function accountBelongsToMode(account: AccountRecord, mode: StrictAccountType) {
  return resolveAccountType(account) === mode
}

function getAccountSearchText(account: AccountRecord) {
  return [
    account.companyName,
    account.address,
    account.contact,
    account.email,
    account.licenceNo,
    account.currency,
    account.notes,
    resolveAccountType(account),
    account.status || "active",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
}

function balanceToneClass(value: number) {
  if (value > 0) return "text-emerald-700"
  if (value < 0) return "text-red-700"
  return "text-slate-950"
}

function balanceBadgeClass(value: number) {
  if (value > 0) return "ledger-finance-badge--credit"
  if (value < 0) return "ledger-finance-badge--debit"
  return "ledger-finance-badge--balance"
}

function formatLedgerMoney(value: number) {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

function formatMergedDate(entry: Pick<LedgerEntry, "date" | "dateOfShip" | "invoiceNo">) {
  return [`Date: ${entry.date || "-"}`, `Ship Date: ${entry.dateOfShip || "-"}`, `Invoice No: ${entry.invoiceNo || "-"}`].join("\n")
}

function formatMergedDescription(entry: Pick<LedgerEntry, "description" | "quantity" | "packing">) {
  const quantityPacking = splitQuantityPacking(entry.quantity, entry.packing)
  return [
    `Shipper/Description: ${entry.description || "-"}`,
    `Quantity: ${quantityPacking.quantity}`,
    `Packing: ${quantityPacking.packing}`,
  ].join("\n")
}

function formatMergedDebit(entry: Pick<LedgerEntry, "debit" | "credit">) {
  return [`Debit: $${formatLedgerMoney(Number(entry.debit || 0))}`, `Credit: $${formatLedgerMoney(Number(entry.credit || 0))}`].join("\n")
}

function getDisplayQuantity(entry: Pick<LedgerEntry, "quantity" | "packing">) {
  const quantityPacking = splitQuantityPacking(entry.quantity, entry.packing)
  return quantityPacking.quantity === "-" ? "" : quantityPacking.quantity
}

function getDisplayPacking(entry: Pick<LedgerEntry, "quantity" | "packing">) {
  const quantityPacking = splitQuantityPacking(entry.quantity, entry.packing)
  return quantityPacking.packing === "-" ? "" : quantityPacking.packing
}

function updateQuantityPreservingPacking(entry: Pick<LedgerEntry, "quantity" | "packing">, quantity: string) {
  const currentPacking = getDisplayPacking(entry)
  return {
    quantity,
    packing: entry.packing || currentPacking,
  }
}

function stripPdfDataForLocalStorage(entries: Record<string, LedgerEntry[]>) {
  return Object.fromEntries(
    Object.entries(entries).map(([accountId, rows]) => [
      accountId,
      rows.map(({ pdfDataUrl: _pdfDataUrl, statusPdfDataUrl: _statusPdfDataUrl, ...row }) => row),
    ])
  )
}

function downloadCsv(filename: string, lines: string[]) {
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === delimiter && !quoted) {
      row.push(cell.trim())
      cell = ""
      continue
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1
      row.push(cell.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      cell = ""
      continue
    }

    cell += char
  }

  row.push(cell.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function normalizeImportHeader(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function getMappedImportCell(cells: string[], headerMap: Map<string, number>, aliases: string[], fallbackIndex: number) {
  for (const alias of aliases) {
    const index = headerMap.get(normalizeImportHeader(alias))
    if (typeof index === "number") return cells[index] || ""
  }
  return cells[fallbackIndex] || ""
}

const accountImportAliases = {
  companyName: [
    "Company Name",
    "Company",
    "Customer Name",
    "Customer",
    "Account Name",
    "Name",
    "Shipper",
    "Shipper Name",
    "Consignee",
    "Consignee Name",
    "SHIPPER/DESCRIPTION",
    "SHIPPER / DESCRIPTION",
  ],
  address: ["Address", "Company Address", "Customer Address", "Shipper Address", "Consignee Address", "Location"],
  phone: ["Contact", "Phone", "Phone No", "Phone Number", "Mobile", "Mob", "CONTACT NO", "Customer Phone"],
  email: ["Email", "Email Address", "Mail", "Customer Email"],
  type: ["Type", "Account Type", "Mode", "Account Mode"],
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, base64Data] = dataUrl.split(",")
  const mime = meta.match(/data:([^;]+)/)?.[1] || "application/pdf"
  const binary = window.atob(base64Data || "")
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mime })
}

function detectMediaKind(fileType = "", fileName = ""): MediaKind {
  const lowerName = fileName.toLowerCase()
  if (fileType.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(lowerName)) return "image"
  if (fileType.startsWith("video/") || /\.(mp4|mov|avi|webm)$/i.test(lowerName)) return "video"
  if (fileType.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(lowerName)) return "audio"
  return "document"
}

function isAllowedMediaFile(file: File) {
  return ["image", "video", "audio"].includes(detectMediaKind(file.type, file.name))
}

function formatFileSize(bytes = 0) {
  if (!bytes) return "0 KB"
  const units = ["B", "KB", "MB", "GB"]
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function legacyMediaAsAttachment(entry: LedgerEntry): MediaAttachment[] {
  if (!entry.mediaUrl) return []
  return [
    {
      id: `${entry.id}-legacy-media`,
      name: entry.mediaName || "Ledger media",
      originalName: entry.mediaName || "Ledger media",
      url: entry.mediaUrl,
      type: entry.mediaType || "",
      kind: detectMediaKind(entry.mediaType, entry.mediaName),
      uploadedAt: new Date().toISOString(),
    },
  ]
}

function getEntryMediaFiles(entry: LedgerEntry) {
  return entry.mediaFiles?.length ? entry.mediaFiles : legacyMediaAsAttachment(entry)
}

const savedPartySuggestions = [
  ...(shipperSeedData as SavedParty[]).map((party) => ({ ...party, source: "Shipper" })),
  ...(consigneeSeedData as SavedParty[]).map((party) => ({ ...party, source: "Consignee" })),
].filter((party) => party.name?.trim())

const createEmptyAccount = (type: StrictAccountType = "import") => ({
  companyName: "",
  address: "",
  contact: "",
  type,
  accountType: type,
  email: "",
  licenceNo: "",
  openingBalance: "",
  currency: "USD",
  notes: "",
  status: "active" as AccountStatus,
})

const emptyAccount = createEmptyAccount("import")

const emptyLedgerEntry = {
  date: new Date().toISOString().slice(0, 10),
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
  debit: "",
  credit: "",
}

export function AccountManager({
  mode = "import",
  onClose,
  onOpenSettings,
}: {
  mode?: "import" | "export"
  onClose?: () => void
  onOpenSettings?: () => void
}) {
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LedgerEntry[]>>({})
  const [ledgerProfiles, setLedgerProfiles] = useState<Record<string, LedgerProfile>>({})
  const [receipts, setReceipts] = useState<Record<string, import("@/lib/ledger-types").ReceiptRecord>>({})
  const [ledgerDefaults, setLedgerDefaults] = useState<AccountLedgerDefaults>(DEFAULT_ACCOUNT_LEDGER_SETTINGS)
  const [isStorageReady, setIsStorageReady] = useState(false)
  const [isLedgerLoading, setIsLedgerLoading] = useState(true)
  const [isLedgerSaving, setIsLedgerSaving] = useState(false)
  const [ledgerStorageError, setLedgerStorageError] = useState("")
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [detailsAccountId, setDetailsAccountId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newAccount, setNewAccount] = useState(() => createEmptyAccount(mode))
  const [searchQuery, setSearchQuery] = useState("")
  const [accountToast, setAccountToast] = useState("")
  const lastSavedSnapshotRef = useRef("")

  useEffect(() => {
    if (typeof window === "undefined") return

    let isMounted = true

    const readBrowserSnapshot = (): AccountLedgerSnapshot => {
      try {
        const savedAccounts = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY)
        const savedLedgers = window.localStorage.getItem(LEDGER_STORAGE_KEY)
        const savedProfiles = window.localStorage.getItem(LEDGER_PROFILE_STORAGE_KEY)
        const savedReceipts = window.localStorage.getItem(RECEIPTS_STORAGE_KEY)

        return {
          accounts: savedAccounts ? (JSON.parse(savedAccounts) as AccountRecord[]) : [],
          ledgerEntries: savedLedgers ? (JSON.parse(savedLedgers) as Record<string, LedgerEntry[]>) : {},
          ledgerProfiles: savedProfiles ? (JSON.parse(savedProfiles) as Record<string, LedgerProfile>) : {},
          receipts: savedReceipts ? (JSON.parse(savedReceipts) as Record<string, import("@/lib/ledger-types").ReceiptRecord>) : {},
        }
      } catch {
        return { accounts: [], ledgerEntries: {}, ledgerProfiles: {}, receipts: {} }
      }
    }

    const loadLedgerData = async () => {
      setIsLedgerLoading(true)
      setLedgerStorageError("")

      try {
        const response = await fetch("/api/account-ledgers")
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Could not load account ledger data")
        }

        const serverSnapshot: AccountLedgerSnapshot = {
          accounts: Array.isArray(result.data?.accounts) ? result.data.accounts : [],
          ledgerEntries: result.data?.ledgerEntries && typeof result.data.ledgerEntries === "object" ? result.data.ledgerEntries : {},
          ledgerProfiles: result.data?.ledgerProfiles && typeof result.data.ledgerProfiles === "object" ? result.data.ledgerProfiles : {},
          receipts: result.data?.receipts && typeof result.data.receipts === "object" ? result.data.receipts : {},
        }
        const browserSnapshot = readBrowserSnapshot()
        const serverHasData =
          serverSnapshot.accounts.length ||
          Object.keys(serverSnapshot.ledgerEntries).length ||
          Object.keys(serverSnapshot.ledgerProfiles).length
        const browserHasData =
          browserSnapshot.accounts.length ||
          Object.keys(browserSnapshot.ledgerEntries).length ||
          Object.keys(browserSnapshot.ledgerProfiles).length
        const nextSnapshot = serverHasData ? serverSnapshot : browserSnapshot

        if (!isMounted) return

        setAccounts(nextSnapshot.accounts.map((account) => normalizeAccountRecord(account)))
        setLedgerEntries(nextSnapshot.ledgerEntries)
        setLedgerProfiles(nextSnapshot.ledgerProfiles)
        setReceipts(nextSnapshot.receipts || {})
        setLedgerDefaults(readAccountLedgerSettings())
        lastSavedSnapshotRef.current = JSON.stringify(nextSnapshot)
        setIsStorageReady(true)

        if (!serverHasData && browserHasData) {
          await fetch("/api/account-ledgers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(nextSnapshot),
          })
        }
      } catch (error) {
        const browserSnapshot = readBrowserSnapshot()

        if (!isMounted) return

        setAccounts(browserSnapshot.accounts.map((account) => normalizeAccountRecord(account)))
        setLedgerEntries(browserSnapshot.ledgerEntries)
        setLedgerProfiles(browserSnapshot.ledgerProfiles)
        setReceipts(browserSnapshot.receipts || {})
        setLedgerDefaults(readAccountLedgerSettings())
        lastSavedSnapshotRef.current = JSON.stringify(browserSnapshot)
        setLedgerStorageError(error instanceof Error ? error.message : "Could not load account ledger data")
        setIsStorageReady(true)
      } finally {
        if (isMounted) setIsLedgerLoading(false)
      }
    }

    loadLedgerData()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const refreshSettings = () => setLedgerDefaults(readAccountLedgerSettings())
    window.addEventListener("account-ledger-settings-updated", refreshSettings)
    window.addEventListener("storage", refreshSettings)
    return () => {
      window.removeEventListener("account-ledger-settings-updated", refreshSettings)
      window.removeEventListener("storage", refreshSettings)
    }
  }, [])

  useEffect(() => {
    if (!isStorageReady || typeof window === "undefined") return

    const snapshot: AccountLedgerSnapshot = {
      accounts,
      ledgerEntries: stripPdfDataForLocalStorage(ledgerEntries) as Record<string, LedgerEntry[]>,
      ledgerProfiles,
      receipts,
    }
    const snapshotJson = JSON.stringify(snapshot)

    if (snapshotJson === lastSavedSnapshotRef.current) return

    try {
      window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
      window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(snapshot.ledgerEntries))
      window.localStorage.setItem(LEDGER_PROFILE_STORAGE_KEY, JSON.stringify(ledgerProfiles))
      window.localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(receipts))
    } catch (error) {
      console.warn("Account ledger storage is full. Saved lightweight ledger data only.", error)
      try {
        window.localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(snapshot.ledgerEntries))
      } catch {
        // Keep the UI running even when browser storage is exhausted.
      }
    }

    const timeoutId = window.setTimeout(async () => {
      setIsLedgerSaving(true)
      setLedgerStorageError("")

      try {
        const response = await fetch("/api/account-ledgers", {
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
      } finally {
        setIsLedgerSaving(false)
      }
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [accounts, ledgerEntries, ledgerProfiles, isStorageReady])

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || null
  const detailsAccount = accounts.find((account) => account.id === detailsAccountId) || null

  const visibleAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return accounts
      .filter((account) => accountBelongsToMode(account, mode))
      .filter((account) => {
        if (!query) return true
        return getAccountSearchText(account).includes(query)
      })
  }, [accounts, mode, searchQuery])

  const unassignedAccounts = useMemo(
    () => accounts.filter((account) => !isStrictAccountType(resolveAccountType(account))),
    [accounts]
  )

  const accountStats = useMemo(() => {
    const totalLedgerRows = visibleAccounts.reduce((sum, account) => sum + (ledgerEntries[account.id]?.length || 0), 0)
    const exportCount = accounts.filter((account) => resolveAccountType(account) === "export").length
    const importCount = accounts.filter((account) => resolveAccountType(account) === "import").length
    const totals = visibleAccounts.reduce(
      (sum, account) => {
        const rows = ledgerEntries[account.id] || []
        rows.forEach((row) => {
          sum.debit += Number(row.debit || 0)
          sum.credit += Number(row.credit || 0)
        })
        return sum
      },
      { debit: 0, credit: 0 }
    )
    return {
      total: visibleAccounts.length,
      totalLedgerRows,
      exportCount,
      importCount,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      balance: totals.debit - totals.credit,
    }
  }, [accounts, visibleAccounts, ledgerEntries])

  const exportCsv = () => {
    const rows = [
      ["Company Name", "Address", "Contact", "Email", "Licence No", "Type", "Status", "Opening Balance", "Currency", "Total Ledger Entries"],
      ...visibleAccounts.map((account) => [
        account.companyName,
        account.address,
        account.contact,
        account.email || "",
        account.licenceNo || "",
        resolveAccountType(account),
        account.status || "active",
        account.openingBalance || 0,
        account.currency || "USD",
        ledgerEntries[account.id]?.length || 0,
      ]),
    ]
    downloadCsv(`${mode}_accounts_summary.csv`, [`${accountTypeLabels[mode].title} Registry Index`, "", ...rows.map((row) => row.map(csvEscape).join(","))])
  }

  const importAccountsFile = (file: File | undefined) => {
    if (!file) return
    const lowerName = file.name.toLowerCase()

    if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".tsv") && !lowerName.endsWith(".txt")) {
      alert("CSV and text account imports are ready. For Excel/PDF, export the file to CSV first so the rows can be read safely.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || "")
      const delimiter = lowerName.endsWith(".tsv") ? "\t" : ","
      const rows = parseDelimitedRows(text, delimiter)
      const headerCells = rows[0] || []
      const hasHeader = headerCells.some((cell) => /company|customer|account|address|contact|phone|email|type/i.test(cell))
      const headerMap = new Map<string, number>()

      if (hasHeader) {
        headerCells.forEach((header, index) => headerMap.set(normalizeImportHeader(header), index))
      }

      const imported = (hasHeader ? rows.slice(1) : rows)
        .map((cells) => {
          const companyName = getMappedImportCell(cells, headerMap, accountImportAliases.companyName, 0)
          const address = getMappedImportCell(cells, headerMap, accountImportAliases.address, 1)
          const phone = getMappedImportCell(cells, headerMap, accountImportAliases.phone, 2)
          const email = getMappedImportCell(cells, headerMap, accountImportAliases.email, 3)
          const typeValue = getMappedImportCell(cells, headerMap, accountImportAliases.type, hasHeader ? 4 : 3).toLowerCase()
          const type = (typeValue === "import" || typeValue === "export" ? typeValue : mode) as StrictAccountType

          return normalizeAccountRecord({
            id: crypto.randomUUID(),
            companyName: companyName.trim(),
            address: address.trim(),
            contact: [phone, email].filter(Boolean).join(" | ").trim(),
            email: email.trim(),
            type,
            accountType: type,
            status: "active",
          })
        })
        .filter((account) => account.companyName)

      if (!imported.length) {
        alert("No account rows found in this file.")
        return
      }

      setAccounts((current) => {
        const accountKey = (account: AccountRecord) => `${resolveAccountType(account)}::${account.companyName.trim().toLowerCase()}`
        const byName = new Map(current.map((account) => [accountKey(account), account]))
        imported.forEach((account) => byName.set(accountKey(account), account))
        return Array.from(byName.values())
      })
      setLedgerEntries((current) => ({
        ...current,
        ...Object.fromEntries(imported.map((account) => [account.id, current[account.id] || []])),
      }))
      alert(`Imported ${imported.length} account rows.`)
    }
    reader.readAsText(file)
  }

  const addAccount = () => {
    if (!newAccount.companyName.trim()) return

    // Account state is local to this module, so adding a row immediately updates the table without a page refresh.
    const accountType = isStrictAccountType(newAccount.type) ? newAccount.type : mode
    const account: AccountRecord = normalizeAccountRecord({
      id: crypto.randomUUID(),
      companyName: newAccount.companyName.trim(),
      address: newAccount.address.trim(),
      contact: newAccount.contact.trim(),
      type: accountType,
      accountType,
      email: newAccount.email.trim(),
      licenceNo: newAccount.licenceNo.trim(),
      openingBalance: Number(newAccount.openingBalance || 0),
      currency: newAccount.currency.trim() || "USD",
      notes: newAccount.notes.trim(),
      status: newAccount.status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    setAccounts((current) => [account, ...current])
    setLedgerEntries((current) => ({ ...current, [account.id]: [] }))
    setNewAccount(createEmptyAccount(mode))
    setIsModalOpen(false)
    setAccountToast(accountTypeLabels[accountType].success)
    window.setTimeout(() => setAccountToast(""), 2800)
  }

  if (selectedAccount) {
    return (
      <AccountLedger
        account={selectedAccount}
        entries={ledgerEntries[selectedAccount.id] || []}
        profile={
          ledgerProfiles[selectedAccount.id] || {
            shipperCustomerName: selectedAccount.companyName,
            shipperCustomerAddress: selectedAccount.address,
            shipperCustomerContact: selectedAccount.contact,
            shipperCustomerEmail: "",
            officeAddress: ledgerDefaults.officeAddress,
            footerInfo: ledgerDefaults.footerInfo,
            logoDataUrl: ledgerDefaults.logoDataUrl,
          }
        }
        onBack={() => setSelectedAccountId(null)}
        onOpenSettings={onOpenSettings}
        ledgerDefaults={ledgerDefaults}
        onAddEntry={(entry) =>
          setLedgerEntries((current) => ({
            ...current,
            [selectedAccount.id]: [...(current[selectedAccount.id] || []), entry],
          }))
        }
        onUpdateEntry={(entryId, patch) =>
          setLedgerEntries((current) => ({
            ...current,
            [selectedAccount.id]: (current[selectedAccount.id] || []).map((entry) =>
              entry.id === entryId ? { ...entry, ...patch } : entry
            ),
          }))
        }
        onUpdateProfile={(patch) =>
          setLedgerProfiles((current) => ({
            ...current,
            [selectedAccount.id]: {
              ...{
                shipperCustomerName: selectedAccount.companyName,
                shipperCustomerAddress: selectedAccount.address,
                shipperCustomerContact: selectedAccount.contact,
                shipperCustomerEmail: "",
                officeAddress: ledgerDefaults.officeAddress,
                footerInfo: ledgerDefaults.footerInfo,
                logoDataUrl: ledgerDefaults.logoDataUrl,
              },
              ...(current[selectedAccount.id] || {}),
              ...patch,
            },
          }))
        }
        onDeleteEntry={(entryId) => {
          const row = (ledgerEntries[selectedAccount.id] || []).find((e) => e.id === entryId)
          if (row?.receiptId) {
            const linked = (receipts as Record<string, ReceiptRecord>)[row.receiptId]
            if (linked && !confirm(`This row has a linked receipt (${linked.receiptNo}). Delete row AND receipt?`)) return
            setReceipts((prev) => { const next = { ...prev }; delete next[row.receiptId!]; return next })
          } else if (!confirm("Delete this ledger row? This cannot be undone.")) return
          setLedgerEntries((current) => ({
            ...current,
            [selectedAccount.id]: (current[selectedAccount.id] || []).filter((e) => e.id !== entryId),
          }))
        }}
        onMoveEntry={(entryId, direction) =>
          setLedgerEntries((current) => {
            const rows = [...(current[selectedAccount.id] || [])]
            const idx = rows.findIndex((e) => e.id === entryId)
            if (idx < 0) return current
            const swapIdx = idx + direction
            if (swapIdx < 0 || swapIdx >= rows.length) return current
            ;[rows[idx], rows[swapIdx]] = [rows[swapIdx], rows[idx]]
            return { ...current, [selectedAccount.id]: rows }
          })
        }
        receipts={receipts as Record<string, ReceiptRecord>}
        onUpsertReceipt={(receipt) => setReceipts((prev) => ({ ...prev, [receipt.id]: receipt as any }))}
        onDeleteReceipt={(receiptId) => setReceipts((prev) => { const next = { ...prev }; delete next[receiptId]; return next })}
      />
    )
  }

  return (
    <section className="fixed inset-0 z-40 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_10%_10%,rgba(37,99,235,.15),transparent_32%),radial-gradient(circle_at_88%_86%,rgba(212,175,55,.20),transparent_34%),linear-gradient(135deg,#eef6ff,#ffffff_52%,#fff9e8)] text-slate-950">
      <header className="shrink-0 border-b border-blue-100/80 bg-white/82 px-4 py-4 shadow-xl shadow-blue-100/40 backdrop-blur-2xl md:px-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-lg shadow-blue-100">
              <FileSpreadsheet className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Account Management</p>
              <h2 className="truncate text-3xl font-black text-slate-950 md:text-4xl">{accountTypeLabels[mode].title}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Strict {mode} accounts, saved ledger rows, PDF records, and export tools.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            {isLedgerLoading || isLedgerSaving || ledgerStorageError ? (
              <div
                className={`inline-flex h-12 items-center rounded-2xl border px-4 text-xs font-black shadow-sm ${
                  ledgerStorageError
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {ledgerStorageError ? `Storage error: ${ledgerStorageError}` : isLedgerLoading ? "Loading saved ledgers..." : "Saving ledger data..."}
              </div>
            ) : null}
            <label className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-5 text-sm font-black text-blue-700 shadow-lg shadow-blue-100/50 transition hover:-translate-y-0.5">
              <Upload className="h-4 w-4" />
              Import {accountTypeLabels[mode].badge} CSV
              <input
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(event) => importAccountsFile(event.target.files?.[0])}
              />
            </label>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] px-5 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            {onOpenSettings ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-5 text-sm font-black text-blue-700 shadow-lg shadow-blue-100/50 transition hover:-translate-y-0.5"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setNewAccount(createEmptyAccount(mode))
                setIsModalOpen(true)
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Add {accountTypeLabels[mode].badge} Account
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {isLedgerLoading ? (
          <div className="mb-5 rounded-[28px] border border-blue-100 bg-white/82 p-5 text-sm font-black text-blue-700 shadow-xl shadow-blue-100/50 backdrop-blur-2xl">
            Loading saved account ledger data from local backend storage...
          </div>
        ) : ledgerStorageError ? (
          <div className="mb-5 rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm font-black text-red-700 shadow-xl shadow-red-100/50 backdrop-blur-2xl">
            {ledgerStorageError}. The page will keep working, but please refresh after the save issue is fixed.
          </div>
        ) : null}

        {unassignedAccounts.length ? (
          <div className="mb-5 rounded-[28px] border border-amber-200 bg-amber-50/90 p-4 text-sm font-black text-amber-800 shadow-xl shadow-amber-100/50 backdrop-blur-2xl">
            {unassignedAccounts.length} old account{unassignedAccounts.length === 1 ? "" : "s"} are marked Both/Unassigned, so they are hidden from Import and Export until assigned to one account type.
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          <AccountStat title={accountTypeLabels[mode].title} value={accountStats.total} tone={mode === "export" ? "gold" : "blue"} subtitle="Visible in this workspace" />
          <AccountStat title="Ledger Rows" value={accountStats.totalLedgerRows} tone="blue" subtitle="Saved transactions" />
          <AccountStat title="Total Debit" value={`$${formatLedgerMoney(accountStats.totalDebit)}`} tone="danger" subtitle="Debit total" />
          <AccountStat title="Total Credit" value={`$${formatLedgerMoney(accountStats.totalCredit)}`} tone="success" subtitle="Credit total" />
          <AccountStat title="Balance" value={`$${formatLedgerMoney(accountStats.balance)}`} tone={accountStats.balance >= 0 ? "success" : "danger"} subtitle="Debit minus credit" />
          <AccountStat title="Import Accounts" value={accountStats.importCount} tone="blue" subtitle="Strict import only" />
          <AccountStat title="Export Accounts" value={accountStats.exportCount} tone="gold" subtitle="Strict export only" />
        </div>

        <div className="mt-5 rounded-[34px] border border-white/80 bg-white/78 p-4 shadow-2xl shadow-blue-100/60 backdrop-blur-2xl md:p-5">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="inline-flex rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#a27300]">
                {accountTypeLabels[mode].workspace}
              </div>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Company Account Registry</h3>
              <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                Showing only {mode} accounts. Search includes company, address, phone, email, licence number, status, and notes.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 lg:flex-row xl:max-w-3xl">
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search company, address, contact, licence no..."
                  className="h-[52px] w-full rounded-[22px] border border-blue-100 bg-white/92 pl-12 pr-4 text-sm font-black text-slate-950 shadow-[0_10px_30px_rgba(37,99,235,.10)] outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <span className="inline-flex h-[52px] items-center justify-center rounded-[22px] border border-blue-100 bg-white/80 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500 shadow-sm">
                  Status: Active
                </span>
                <span className="inline-flex h-[52px] items-center justify-center rounded-[22px] border border-[#D4AF37]/35 bg-[#fff8df]/80 px-4 text-xs font-black uppercase tracking-[0.12em] text-[#8a6200] shadow-sm">
                  {accountTypeLabels[mode].badge} only
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-blue-100 bg-white/88 shadow-xl shadow-blue-100/60 backdrop-blur-xl">
            <div className="max-h-[calc(100vh-360px)] min-h-[calc(100vh-390px)] overflow-auto">
              <table className="w-full min-w-[1060px] border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-700 text-white shadow-sm">
                  <tr>
                    <th className="w-[31%] p-4 text-left text-xs font-black uppercase tracking-[0.14em]">Company Profile</th>
                    <th className="w-[27%] p-4 text-left text-xs font-black uppercase tracking-[0.14em]">Address</th>
                    <th className="w-[18%] p-4 text-left text-xs font-black uppercase tracking-[0.14em]">Contact</th>
                    <th className="w-[10%] p-4 text-left text-xs font-black uppercase tracking-[0.14em]">Type</th>
                    <th className="w-[8%] p-4 text-center text-xs font-black uppercase tracking-[0.14em]">Rows</th>
                    <th className="w-[14%] p-4 text-right text-xs font-black uppercase tracking-[0.14em]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12">
                        <div className="mx-auto max-w-xl rounded-[28px] border border-dashed border-blue-200 bg-blue-50/55 p-8 text-center shadow-inner">
                          <Building2 className="mx-auto h-10 w-10 text-blue-600" />
                          <h4 className="mt-4 text-xl font-black text-slate-950">No {mode} accounts yet.</h4>
                          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                            Add a {mode} company account to open its ledger and keep it separated from the other workspace.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    visibleAccounts.map((account) => {
                      const rows = ledgerEntries[account.id] || []
                      const accountSummary = rows.reduce(
                        (sum, row) => {
                          sum.debit += Number(row.debit || 0)
                          sum.credit += Number(row.credit || 0)
                          return sum
                        },
                        { debit: 0, credit: 0 }
                      )
                      const balance = accountSummary.debit - accountSummary.credit
                      const type = resolveAccountType(account)

                      return (
                        <tr
                          key={account.id}
                          onClick={() => setSelectedAccountId(account.id)}
                          className="group cursor-pointer border-t border-blue-100 transition hover:bg-blue-50/70"
                        >
                          <td className="border-t border-blue-100 p-4 align-top">
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                <Building2 className="h-5 w-5" />
                              </span>
                              <div className="min-w-0">
                                <p className="whitespace-normal break-words text-base font-black leading-6 text-slate-950">
                                  {account.companyName}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                                    {account.status || "active"}
                                  </span>
                                  {account.licenceNo ? (
                                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                                      LIC {account.licenceNo}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border-t border-blue-100 p-4 align-top text-sm font-semibold leading-6 text-slate-600">
                            <p className="max-w-xl whitespace-pre-wrap break-words">{account.address || "-"}</p>
                          </td>
                          <td className="border-t border-blue-100 p-4 align-top text-sm font-bold leading-6 text-slate-600">
                            <p className="whitespace-pre-wrap break-words">{account.contact || "-"}</p>
                            {account.email ? <p className="mt-1 break-words text-xs font-black text-blue-600">{account.email}</p> : null}
                          </td>
                          <td className="border-t border-blue-100 p-4 align-top">
                            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${
                              type === "export"
                                ? "border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#8a6200]"
                                : "border-blue-100 bg-blue-50 text-blue-700"
                            }`}>
                              {isStrictAccountType(type) ? accountTypeLabels[type].badge : "UNASSIGNED"}
                            </span>
                          </td>
                          <td className="border-t border-blue-100 p-4 text-center align-top">
                            <p className="text-lg font-black text-slate-950">{rows.length}</p>
                            <p className={`text-xs font-black ${balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                              ${formatLedgerMoney(balance)}
                            </p>
                          </td>
                          <td className="border-t border-blue-100 p-4 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDetailsAccountId(account.id)
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-blue-700"
                              >
                                <Info className="h-4 w-4" />
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setSelectedAccountId(account.id)
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-700"
                              >
                                <Eye className="h-4 w-4" />
                                Ledger
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <AddAccountModal
          value={newAccount}
          mode={mode}
          onChange={setNewAccount}
          onClose={() => setIsModalOpen(false)}
          onSubmit={addAccount}
        />
      ) : null}
      {detailsAccount ? (
        <AccountDetailsModal
          account={detailsAccount}
          entries={ledgerEntries[detailsAccount.id] || []}
          onClose={() => setDetailsAccountId(null)}
          onOpenLedger={() => {
            setDetailsAccountId(null)
            setSelectedAccountId(detailsAccount.id)
          }}
        />
      ) : null}
      {accountToast ? (
        <div className="pointer-events-none fixed right-6 top-24 z-[2147483646] rounded-2xl border border-emerald-100 bg-emerald-50/95 px-5 py-3 text-sm font-black text-emerald-700 shadow-2xl shadow-emerald-100 backdrop-blur-xl">
          {accountToast}
        </div>
      ) : null}
    </section>
  )
}

function AccountStat({
  title,
  value,
  tone,
  subtitle,
}: {
  title: string
  value: number | string
  tone: "blue" | "gold" | "success" | "danger"
  subtitle?: string
}) {
  const toneClass = {
    blue: "border-blue-100 bg-white/82 text-blue-700 shadow-blue-100/60",
    gold: "border-[#D4AF37]/40 bg-[#D4AF37]/15 text-slate-950 shadow-amber-100/70",
    success: "border-emerald-100 bg-emerald-50/82 text-emerald-700 shadow-emerald-100/60",
    danger: "border-red-100 bg-red-50/82 text-red-700 shadow-red-100/60",
  }[tone]

  return (
    <div className={`rounded-[28px] border p-5 shadow-xl backdrop-blur-2xl transition hover:-translate-y-0.5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
      {subtitle ? <p className="mt-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{subtitle}</p> : null}
    </div>
  )
}

function AccountDetailsModal({
  account,
  entries,
  onClose,
  onOpenLedger,
}: {
  account: AccountRecord
  entries: LedgerEntry[]
  onClose: () => void
  onOpenLedger: () => void
}) {
  const accountType = resolveAccountType(account)
  const totals = entries.reduce(
    (sum, row) => {
      sum.debit += Number(row.debit || 0)
      sum.credit += Number(row.credit || 0)
      return sum
    },
    { debit: 0, credit: 0 }
  )
  const balance = totals.debit - totals.credit

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.18 }}
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/80 bg-white/92 shadow-[0_32px_120px_rgba(15,23,42,.25)] backdrop-blur-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-white via-blue-50/80 to-amber-50/70 p-5 md:p-7">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">Account Details</p>
            <h3 className="mt-2 break-words text-2xl font-black text-slate-950 md:text-4xl">{account.companyName}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                accountType === "export"
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#8a6200]"
                  : accountType === "import"
                    ? "border-blue-100 bg-blue-50 text-blue-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
              }`}>
                {isStrictAccountType(accountType) ? accountTypeLabels[accountType].badge : "UNASSIGNED"}
              </span>
              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                {account.status || "active"}
              </span>
              <span className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                {entries.length} rows
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-600"
            aria-label="Close account details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(88vh-150px)] overflow-y-auto p-5 md:p-7">
          <div className="grid gap-4 lg:grid-cols-3">
            <AccountDetailCard title="Total Debit" value={`$${formatLedgerMoney(totals.debit)}`} tone="danger" />
            <AccountDetailCard title="Total Credit" value={`$${formatLedgerMoney(totals.credit)}`} tone="success" />
            <AccountDetailCard title="Current Balance" value={`$${formatLedgerMoney(balance)}`} tone={balance >= 0 ? "success" : "danger"} />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[26px] border border-blue-100 bg-white/78 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Company Information</p>
              <div className="mt-4 grid gap-3 text-sm font-bold leading-6 text-slate-600">
                <p><span className="font-black text-slate-950">Address:</span> {account.address || "-"}</p>
                <p><span className="font-black text-slate-950">Contact:</span> {account.contact || "-"}</p>
                <p><span className="font-black text-slate-950">Email:</span> {account.email || "-"}</p>
                <p><span className="font-black text-slate-950">Licence:</span> {account.licenceNo || "-"}</p>
              </div>
            </div>
            <div className="rounded-[26px] border border-[#D4AF37]/35 bg-[#fff8df]/60 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9a6b00]">Account Setup</p>
              <div className="mt-4 grid gap-3 text-sm font-bold leading-6 text-slate-600">
                <p><span className="font-black text-slate-950">Opening Balance:</span> {formatLedgerMoney(Number(account.openingBalance || 0))} {account.currency || "USD"}</p>
                <p><span className="font-black text-slate-950">Currency:</span> {account.currency || "USD"}</p>
                <p><span className="font-black text-slate-950">Created:</span> {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "-"}</p>
                <p><span className="font-black text-slate-950">Notes:</span> {account.notes || "-"}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-[26px] border border-blue-100 bg-white/82 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/70 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Recent Ledger Rows</p>
              <button
                type="button"
                onClick={onOpenLedger}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
              >
                <Eye className="h-4 w-4" />
                Open Ledger
              </button>
            </div>
            {entries.length ? (
              <div className="divide-y divide-blue-100">
                {entries.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="grid gap-3 p-4 text-sm font-bold text-slate-600 md:grid-cols-[56px_1fr_130px_130px]">
                    <span className="font-black text-slate-950">#{index + 1}</span>
                    <span className="break-words">{entry.description || entry.billOfLanding || "Ledger row"}</span>
                    <span className="text-red-700">${formatLedgerMoney(Number(entry.debit || 0))}</span>
                    <span className="text-emerald-700">${formatLedgerMoney(Number(entry.credit || 0))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm font-black text-slate-500">No ledger rows yet.</div>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

function AccountDetailCard({ title, value, tone }: { title: string; value: string; tone: "success" | "danger" }) {
  const toneClass = tone === "success" ? "text-emerald-700 bg-emerald-50/82 border-emerald-100" : "text-red-700 bg-red-50/82 border-red-100"
  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}

function AddAccountModal({
  value,
  mode,
  onChange,
  onClose,
  onSubmit,
}: {
  value: typeof emptyAccount
  mode: StrictAccountType
  onChange: (value: typeof emptyAccount) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const [mounted, setMounted] = useState(false)
  const savedBolShippers = useMemo(
    () => (shipperSeedData as SavedParty[]).filter((shipper) => shipper.name?.trim()),
    []
  )

  const applySavedBolShipper = (shipperName: string) => {
    const match = savedBolShippers.find(
      (shipper) => shipper.name.trim().toLowerCase() === shipperName.trim().toLowerCase()
    )

    if (!match) {
      onChange({ ...value, companyName: shipperName })
      return
    }

    onChange({
      ...value,
      companyName: match.name || "",
      address: match.address || "",
      contact: match.contact || "",
      email: match.email || "",
    })
  }

  useEffect(() => {
    setMounted(true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[2147483647] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(37,99,235,.16),transparent_34%),radial-gradient(circle_at_86%_88%,rgba(212,175,55,.20),transparent_34%),linear-gradient(135deg,#eef6ff,#ffffff_48%,#fff9e8)] text-slate-950">
      <div className="shrink-0 border-b border-blue-100/80 bg-white/82 px-4 py-5 shadow-sm backdrop-blur-2xl md:px-8">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[24px] border border-blue-100 bg-white text-blue-600 shadow-lg shadow-blue-100">
              <Building2 className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">New {accountTypeLabels[mode].badge} Account</p>
              <h3 className="mt-1 truncate text-3xl font-black text-slate-950 md:text-5xl">Add {accountTypeLabels[mode].title}</h3>
              <p className="mt-1 hidden text-sm font-semibold text-slate-500 sm:block">
                Create a strict {mode} company profile and open its ledger.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-600"
            aria-label="Close add account screen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="grid min-h-full w-full gap-6 xl:grid-cols-[1fr_380px]">
          <div className="flex min-h-full flex-col rounded-[34px] border border-white/80 bg-white/86 p-4 shadow-[0_30px_90px_rgba(37,99,235,.16)] backdrop-blur-2xl md:p-8">
            <div className="mb-6 rounded-[28px] border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-amber-50/60 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">Company Setup</p>
              <h4 className="mt-2 text-xl font-black text-slate-950 md:text-2xl">Enter account details</h4>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                This account will appear in Import/Export Accounts and can open a full ledger.
              </p>
            </div>

            <div className="grid flex-1 content-start gap-5 rounded-[28px] border border-blue-100 bg-white/78 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl md:grid-cols-2 md:p-7">
              <label className="grid gap-2 rounded-[24px] border border-[#D4AF37]/35 bg-gradient-to-r from-[#D4AF37]/10 via-white to-blue-50/80 p-4 text-sm font-black text-slate-700 md:col-span-2">
                Saved BOL Shipper
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#D4AF37]" />
                  <input
                    list="new-account-bol-shippers"
                    value={value.companyName}
                    placeholder="Select or type a saved BOL shipper"
                    onChange={(event) => applySavedBolShipper(event.target.value)}
                    className="h-14 w-full rounded-2xl border border-[#D4AF37]/35 bg-white/90 pl-12 pr-4 text-sm font-black text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/20"
                  />
                  <datalist id="new-account-bol-shippers">
                    {savedBolShippers.map((shipper, index) => (
                      <option key={shipper.id || `${shipper.name}-${index}`} value={shipper.name}>
                        {shipper.address || shipper.contact || "Saved BOL shipper"}
                      </option>
                    ))}
                  </datalist>
                </div>
                <span className="text-xs font-bold leading-relaxed text-slate-500">
                  Choose a saved BOL shipper to fill company name, address, phone, and email automatically.
                </span>
              </label>
              <div className="md:col-span-2">
                <AccountField
                  icon={<Building2 className="h-5 w-5" />}
                  label="Company Name"
                  placeholder="Enter company name"
                  value={value.companyName}
                  onChange={applySavedBolShipper}
                />
              </div>
              <AccountField
                icon={<MapPin className="h-5 w-5" />}
                label="Address"
                placeholder="Company address"
                value={value.address}
                onChange={(address) => onChange({ ...value, address })}
              />
              <AccountField
                icon={<Phone className="h-5 w-5" />}
                label="Contact"
                placeholder="Phone number"
                value={value.contact}
                onChange={(contact) => onChange({ ...value, contact })}
              />
              <AccountField
                icon={<FileText className="h-5 w-5" />}
                label="Email"
                placeholder="Email address"
                value={value.email}
                onChange={(email) => onChange({ ...value, email })}
              />
              <AccountField
                icon={<FileText className="h-5 w-5" />}
                label="Licence / Registration No"
                placeholder="Licence or registration number"
                value={value.licenceNo}
                onChange={(licenceNo) => onChange({ ...value, licenceNo })}
              />
              <AccountField
                icon={<Tags className="h-5 w-5" />}
                label="Opening Balance"
                placeholder="0.00"
                value={value.openingBalance}
                onChange={(openingBalance) => onChange({ ...value, openingBalance })}
              />
              <AccountField
                icon={<Tags className="h-5 w-5" />}
                label="Currency"
                placeholder="USD"
                value={value.currency}
                onChange={(currency) => onChange({ ...value, currency })}
              />
              <label className="grid gap-2 text-sm font-black text-slate-700">
                Status
                <select
                  value={value.status}
                  onChange={(event) => onChange({ ...value, status: event.target.value as AccountStatus })}
                  className="h-14 w-full rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-950 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="grid gap-2 rounded-[24px] border border-blue-100 bg-white/78 p-4 text-sm font-black text-slate-700 md:col-span-2">
                Account Type
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["export", "import"] as StrictAccountType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onChange({ ...value, type, accountType: type })}
                      className={`h-14 rounded-2xl border px-4 text-sm font-black uppercase tracking-[0.12em] shadow-sm transition hover:-translate-y-0.5 ${
                        value.type === type
                          ? "border-blue-600 bg-blue-600 text-white shadow-blue-100"
                          : "border-blue-100 bg-white text-slate-600 hover:bg-blue-50"
                      }`}
                    >
                      {accountTypeLabels[type].badge}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-bold leading-relaxed text-slate-500">
                  Current screen default: {accountTypeLabels[mode].badge}. Export accounts stay out of Import, and Import accounts stay out of Export.
                </span>
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                Notes
                <textarea
                  value={value.notes}
                  placeholder="Account notes, payment terms, or internal remarks"
                  onChange={(event) => onChange({ ...value, notes: event.target.value })}
                  className="min-h-24 w-full resize-y rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
          </div>

          <aside className="rounded-[34px] border border-white/80 bg-white/76 p-5 shadow-[0_24px_70px_rgba(15,23,42,.12)] backdrop-blur-2xl">
            <div className="rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-white shadow-xl shadow-blue-200">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-100">Account Preview</p>
              <h4 className="mt-4 break-words text-2xl font-black">{value.companyName || "Company Name"}</h4>
              <p className="mt-2 text-sm font-semibold text-blue-100">{isStrictAccountType(value.type) ? accountTypeLabels[value.type].badge : "UNASSIGNED"}</p>
            </div>
            <div className="mt-4 space-y-3 text-sm font-bold text-slate-600">
              <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Address</p>
                <p className="mt-1 break-words text-slate-800">{value.address || "Company address"}</p>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Contact</p>
                <p className="mt-1 break-words text-slate-800">{value.contact || "Phone or email"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Currency</p>
                  <p className="mt-1 break-words text-slate-800">{value.currency || "USD"}</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white/78 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-1 break-words text-slate-800">{value.status}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#D4AF37]/35 bg-[#fff8df]/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9a6b00]">Opening Balance</p>
                <p className="mt-1 break-words text-xl font-black text-slate-950">{value.openingBalance || "0.00"} {value.currency || "USD"}</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="shrink-0 border-t border-blue-100/80 bg-white/86 px-4 py-4 shadow-[0_-18px_55px_rgba(37,99,235,.12)] backdrop-blur-2xl md:px-8">
        <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl border border-blue-100 bg-white px-6 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-8 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            Add {accountTypeLabels[mode].badge} Account
          </button>
        </div>
      </div>
    </div>
    ,
    document.body
  )
}

function AccountField({
  icon,
  label,
  placeholder,
  value,
  onChange,
}: {
  icon: ReactNode
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">{icon}</span>
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 w-full rounded-2xl border border-blue-100 bg-white pl-12 pr-4 text-sm font-black text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
        />
      </div>
    </label>
  )
}

function AccountLedger({
  account,
  entries,
  profile,
  onBack,
  onOpenSettings,
  ledgerDefaults,
  onAddEntry,
  onUpdateEntry,
  onUpdateProfile,
  onDeleteEntry,
  onMoveEntry,
  receipts,
  onUpsertReceipt,
  onDeleteReceipt,
}: {
  account: AccountRecord
  entries: LedgerEntry[]
  profile: LedgerProfile
  onBack: () => void
  onOpenSettings?: () => void
  ledgerDefaults: AccountLedgerDefaults
  onAddEntry: (entry: LedgerEntry) => void
  onUpdateEntry: (entryId: string, patch: Partial<LedgerEntry>) => void
  onUpdateProfile: (patch: Partial<LedgerProfile>) => void
  onDeleteEntry?: (entryId: string) => void
  onMoveEntry?: (entryId: string, direction: -1 | 1) => void
  receipts: Record<string, ReceiptRecord>
  onUpsertReceipt: (receipt: ReceiptRecord) => void
  onDeleteReceipt: (receiptId: string) => void
}) {
  const [draft, setDraft] = useState(emptyLedgerEntry)
  const [balanceMethod, setBalanceMethod] = useState<BalanceMethod>("debitMinusCredit")
  const [viewingPdf, setViewingPdf] = useState<{ title: string; dataUrl: string } | null>(null)
  const [mediaViewer, setMediaViewer] = useState<{ items: MediaAttachment[]; index: number; rowId: string } | null>(null)
  const [mediaFilter, setMediaFilter] = useState<"all" | MediaKind | "favorites">("all")
  const [mediaSearch, setMediaSearch] = useState("")
  const [mediaDetailsOpen, setMediaDetailsOpen] = useState(false)
  const [rowDetails, setRowDetails] = useState<(LedgerEntry & { sNo: number; balanceUsd: number }) | null>(null)
  const [rowDensity, setRowDensity] = useState<"compact" | "medium" | "comfortable">("medium")
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<Partial<LedgerEntry>>({})
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [pdfViewerUrl, setPdfViewerUrl] = useState("")
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [printZoom, setPrintZoom] = useState(0.92)
  const [printFitMode, setPrintFitMode] = useState<"width" | "page">("width")
  const [profileSavedFlash, setProfileSavedFlash] = useState(false)
  const [ledgerToast, setLedgerToast] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ rowId: string; x: number; y: number } | null>(null)

  const startEditingRow = (row: LedgerEntry & { sNo: number; balanceUsd: number }) => {
    setEditingRowId(row.id)
    setEditingDraft({
      billOfLanding: row.billOfLanding,
      billOfLandingSurrendered: row.billOfLandingSurrendered,
      containerType: row.containerType,
      containerNo: row.containerNo,
      consignee: row.consignee,
      description: row.description,
      date: row.date,
      dateOfShip: row.dateOfShip,
      invoiceNo: row.invoiceNo,
      quantity: row.quantity,
      packing: row.packing,
      debit: row.debit,
      credit: row.credit,
    })
  }

  function updateRowDraft<K extends keyof LedgerEntry>(field: K, value: LedgerEntry[K]) {
    setEditingDraft((current) => ({ ...current, [field]: value }))
  }

  const cancelRowEdit = () => {
    setEditingRowId(null)
    setEditingDraft({})
  }

  const saveRowEdit = (entryId: string) => {
    const row = entries.find((e) => e.id === entryId)
    const creditValue = Number(editingDraft.credit ?? row?.credit ?? 0)
    const existingReceiptId = row?.receiptId
    let receiptPatch: Partial<LedgerEntry> = {}

    if (creditValue > 0 && !existingReceiptId) {
      // Auto-generate a new receipt linked to this row
      const year = new Date().getFullYear()
      const existingCount = Object.keys(receipts).length
      const receiptNo = `RCP-${year}-${String(existingCount + 1).padStart(4, "0")}`
      const newReceipt: ReceiptRecord = {
        id: crypto.randomUUID(),
        receiptNo,
        ledgerRowId: entryId,
        accountId: account.id,
        accountName: account.companyName,
        date: String(editingDraft.date ?? row?.date ?? new Date().toISOString().slice(0, 10)),
        receivedFrom: String(editingDraft.description ?? row?.description ?? ""),
        amount: creditValue,
        currency: account.currency || "USD",
        paymentMethod: "Bank Transfer",
        description: String(editingDraft.description ?? row?.description ?? ""),
        blNo: String(editingDraft.billOfLanding ?? row?.billOfLanding ?? ""),
        containerNo: String(editingDraft.containerNo ?? row?.containerNo ?? ""),
        consignee: String(editingDraft.consignee ?? row?.consignee ?? ""),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      onUpsertReceipt(newReceipt)
      receiptPatch = { receiptId: newReceipt.id, receiptNo: newReceipt.receiptNo }
      showLedgerToast(`Receipt ${receiptNo} generated ✓`)
    } else if (creditValue > 0 && existingReceiptId) {
      // Update existing receipt with new amount
      const existing = receipts[existingReceiptId]
      if (existing) {
        onUpsertReceipt({ ...existing, amount: creditValue, updatedAt: new Date().toISOString() })
      }
    } else if (creditValue === 0 && existingReceiptId) {
      const linked = receipts[existingReceiptId]
      if (linked && confirm(`Credit removed. Delete linked receipt ${linked.receiptNo}?`)) {
        onDeleteReceipt(existingReceiptId)
        receiptPatch = { receiptId: undefined, receiptNo: undefined }
      }
    }

    onUpdateEntry(entryId, { ...editingDraft, ...receiptPatch })
    setEditingRowId(null)
    setEditingDraft({})
    if (!receiptPatch.receiptNo) showLedgerToast("Row saved successfully")
  }

  useEffect(() => {
    if (!isPrintPreviewOpen) return
    document.body.classList.add("export-ledger-print-active")
    return () => {
      document.body.classList.remove("export-ledger-print-active")
    }
  }, [isPrintPreviewOpen])

  useEffect(() => {
    if (!viewingPdf?.dataUrl) {
      setPdfViewerUrl("")
      return
    }

    if (/^(blob:|https?:|\/)/.test(viewingPdf.dataUrl)) {
      setPdfViewerUrl(viewingPdf.dataUrl)
      return
    }

    const objectUrl = URL.createObjectURL(dataUrlToBlob(viewingPdf.dataUrl))
    setPdfViewerUrl(objectUrl)

    return () => {
      URL.revokeObjectURL(objectUrl)
    }
  }, [viewingPdf])

  const rowsWithBalance = useMemo(() => {
    let runningBalance = 0
    return entries.map((entry, index) => {
      // Assets/receivables use debit-minus-credit. Liabilities/payables use credit-minus-debit.
      if (balanceMethod === "debitMinusCredit") {
        runningBalance += Number(entry.debit || 0) - Number(entry.credit || 0)
      } else {
        runningBalance += Number(entry.credit || 0) - Number(entry.debit || 0)
      }
      return { ...entry, sNo: index + 1, balanceUsd: runningBalance }
    })
  }, [entries, balanceMethod])

  const activeRowDetails = useMemo(
    () => (rowDetails ? rowsWithBalance.find((row) => row.id === rowDetails.id) || rowDetails : null),
    [rowDetails, rowsWithBalance]
  )

  const ledgerTotals = useMemo(() => {
    const debit = entries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0)
    const credit = entries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0)
    const balance = rowsWithBalance.at(-1)?.balanceUsd || 0
    return { debit, credit, balance }
  }, [entries, rowsWithBalance])
  const printPageCount = Math.max(1, Math.ceil(rowsWithBalance.length / 13))

  const closeContextMenu = () => setContextMenu(null)

  const handleRowContextMenu = (rowId: string, event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setSelectedRowId(rowId)
    setContextMenu({ rowId, x: event.clientX, y: event.clientY })
  }

  const moveEntry = (entryId: string, direction: -1 | 1) => {
    if (!onMoveEntry) return
    onMoveEntry(entryId, direction)
    closeContextMenu()
  }

  const deleteEntry = (entryId: string) => {
    if (!onDeleteEntry) return
    if (confirm("Delete this ledger row? This cannot be undone.")) {
      onDeleteEntry(entryId)
      closeContextMenu()
      if (selectedRowId === entryId) setSelectedRowId(null)
    }
  }

  const showLedgerToast = (message: string, type: "success" | "error" = "success") => {
    setLedgerToast({ type, message })
    window.setTimeout(() => setLedgerToast(null), 2600)
  }

  const exportLedgerCsv = () => {
    const headers = ledgerColumns.map((column) => `${column.en}${column.ps ? ` / ${column.ps}` : ""}`)
    const ruleLabel = balanceMethod === "debitMinusCredit" ? "Debit (+) / Credit (-)" : "Credit (+) / Debit (-)"
    const dataRows = rowsWithBalance.map((entry) => [
      entry.sNo,
      formatMergedDate(entry),
      formatMergedDescription(entry),
      `${entry.billOfLanding}${entry.billOfLandingSurrendered ? " - SURRENDERED" : ""}`,
      `${entry.containerType || ""}${entry.containerDetails ? ` - ${entry.containerDetails}` : ""}`,
      entry.containerNo,
      entry.consignee,
      formatMergedDebit(entry),
      entry.balanceUsd.toFixed(2),
    ])

    downloadCsv(`${account.companyName.replace(/[\\/:*?"<>|]/g, "-")}_ledger.csv`, [
      `Account Ledger: ${account.companyName}`,
      `Calculation Rules: ${ruleLabel}`,
      "",
      headers.map(csvEscape).join(","),
      ...dataRows.map((row) => row.map(csvEscape).join(",")),
    ])
  }

  const addEntry = () => {
    if (!draft.description.trim() && !draft.invoiceNo.trim() && !draft.billOfLanding.trim()) return

    onAddEntry({
      id: crypto.randomUUID(),
      date: draft.date,
      description: draft.description,
      invoiceNo: draft.invoiceNo,
      dateOfShip: draft.dateOfShip,
      billOfLanding: draft.billOfLanding,
      containerType: draft.containerType,
      containerDetails: draft.containerDetails,
      containerNo: draft.containerNo,
      consignee: draft.consignee,
      quantity: draft.quantity,
      packing: draft.packing,
      debit: Number(draft.debit || 0),
      credit: Number(draft.credit || 0),
      billOfLandingSurrendered: false,
    })
    setDraft(emptyLedgerEntry)
  }

  const uploadPdf = async (entryId: string, file: File | undefined, kind: "bol" | "status" = "bol") => {
    if (!file || file.type !== "application/pdf") return

    const formData = new FormData()
    formData.append("file", file)
    formData.append("kind", "pdf")
    formData.append("rowId", entryId)
    formData.append("role", kind === "status" ? "status-pdf" : "bl-pdf")

    const response = await fetch("/api/account-ledger-files", { method: "POST", body: formData })
    const result = await response.json()

    if (response.ok && result.success && result.url) {
      if (kind === "status") {
        onUpdateEntry(entryId, { statusPdfName: result.name || file.name, statusPdfUrl: result.url, statusPdfDataUrl: "" })
      } else {
        onUpdateEntry(entryId, { pdfName: result.name || file.name, pdfUrl: result.url, pdfDataUrl: "" })
      }
      showLedgerToast(`${kind === "status" ? "Status" : "B/L"} PDF uploaded`)
      return
    }

    showLedgerToast(result.error || "PDF upload failed", "error")
  }

  const uploadMediaFiles = async (entry: LedgerEntry, files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter(isAllowedMediaFile)
    if (!selectedFiles.length) {
      showLedgerToast("Please upload images, videos, or voice messages only.", "error")
      return
    }

    const currentMedia = getEntryMediaFiles(entry)
    const uploadedMedia: MediaAttachment[] = []

    for (const file of selectedFiles) {
      const progressKey = `${entry.id}-${file.name}-${file.size}`
      setUploadProgress((current) => ({ ...current, [progressKey]: 20 }))

      const formData = new FormData()
      formData.append("file", file)
      formData.append("kind", "media")
      formData.append("rowId", entry.id)
      formData.append("role", detectMediaKind(file.type, file.name))

      const response = await fetch("/api/account-ledger-files", { method: "POST", body: formData })
      setUploadProgress((current) => ({ ...current, [progressKey]: 82 }))
      const result = await response.json()

      if (response.ok && result.success && result.url) {
        uploadedMedia.push({
          id: crypto.randomUUID(),
          name: result.name || file.name,
          originalName: file.name,
          url: result.url,
          type: result.type || file.type,
          kind: result.mediaKind || detectMediaKind(file.type, file.name),
          size: result.size || file.size,
          uploadedAt: result.uploadedAt || new Date().toISOString(),
          storagePath: result.localPath || result.storageFolder,
        })
        setUploadProgress((current) => ({ ...current, [progressKey]: 100 }))
      } else {
        showLedgerToast(result.error || `Media upload failed: ${file.name}`, "error")
      }

      window.setTimeout(() => {
        setUploadProgress((current) => {
          const next = { ...current }
          delete next[progressKey]
          return next
        })
      }, 800)
    }

    if (uploadedMedia.length) {
      onUpdateEntry(entry.id, {
        mediaFiles: [...currentMedia, ...uploadedMedia],
        mediaName: "",
        mediaUrl: "",
        mediaType: "",
      })
      showLedgerToast(`${uploadedMedia.length} media file${uploadedMedia.length === 1 ? "" : "s"} added`)
    }
  }

  const updateMediaFiles = (entryId: string, nextMedia: MediaAttachment[]) => {
    onUpdateEntry(entryId, {
      mediaFiles: nextMedia,
      mediaName: "",
      mediaUrl: "",
      mediaType: "",
    })
  }

  const renameMedia = (entry: LedgerEntry, mediaId: string) => {
    const media = getEntryMediaFiles(entry).find((item) => item.id === mediaId)
    const nextName = window.prompt("Rename media file", media?.name || "")
    if (!nextName?.trim()) return
    updateMediaFiles(
      entry.id,
      getEntryMediaFiles(entry).map((item) => (item.id === mediaId ? { ...item, name: nextName.trim() } : item))
    )
  }

  const deleteMedia = (entry: LedgerEntry, mediaId: string) => {
    const permanent = window.confirm("Delete media from gallery? Press OK to remove it from this ledger row. The file remains in local storage.")
    if (!permanent) return
    updateMediaFiles(entry.id, getEntryMediaFiles(entry).filter((item) => item.id !== mediaId))
    showLedgerToast("Media removed from this row")
  }

  const moveMedia = (entry: LedgerEntry, mediaId: string, direction: -1 | 1) => {
    const media = [...getEntryMediaFiles(entry)]
    const index = media.findIndex((item) => item.id === mediaId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= media.length) return
    const [item] = media.splice(index, 1)
    media.splice(nextIndex, 0, item)
    updateMediaFiles(entry.id, media)
  }

  const toggleMediaFavorite = (entry: LedgerEntry, mediaId: string) => {
    updateMediaFiles(
      entry.id,
      getEntryMediaFiles(entry).map((item) => (item.id === mediaId ? { ...item, favorite: !item.favorite } : item))
    )
  }

  const updateViewerMediaFiles = (rowId: string, nextMedia: MediaAttachment[]) => {
    updateMediaFiles(rowId, nextMedia)
    setMediaViewer((current) => {
      if (!current || current.rowId !== rowId) return current
      if (!nextMedia.length) return null
      return { ...current, items: nextMedia, index: Math.min(current.index, nextMedia.length - 1) }
    })
  }

  const toggleViewerFavorite = (mediaId: string) => {
    if (!mediaViewer) return
    updateViewerMediaFiles(
      mediaViewer.rowId,
      mediaViewer.items.map((item) => (item.id === mediaId ? { ...item, favorite: !item.favorite } : item))
    )
  }

  const deleteViewerMedia = (mediaId: string) => {
    if (!mediaViewer) return
    const confirmed = window.confirm("Delete media from gallery? The file remains in local storage.")
    if (!confirmed) return
    updateViewerMediaFiles(mediaViewer.rowId, mediaViewer.items.filter((item) => item.id !== mediaId))
    showLedgerToast("Media removed from gallery")
  }

  const openPdf = (row: LedgerEntry, kind: "bol" | "status" = "bol") => {
    const dataUrl = kind === "status" ? row.statusPdfUrl || row.statusPdfDataUrl : row.pdfUrl || row.pdfDataUrl
    if (!dataUrl) return
    setViewingPdf({
      title: (kind === "status" ? row.statusPdfName : row.pdfName) || row.billOfLanding || "Ledger PDF",
      dataUrl,
    })
  }

  const downloadPdf = () => {
    if (!viewingPdf?.dataUrl) return
    const link = document.createElement("a")
    link.href = viewingPdf.dataUrl
    link.download = viewingPdf.title || "ledger-pdf.pdf"
    link.click()
  }

  const openPdfInNewTab = () => {
    if (!pdfViewerUrl) return
    window.open(pdfViewerUrl, "_blank", "noopener,noreferrer")
  }

  const uploadLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => onUpdateProfile({ logoDataUrl: String(reader.result || "") })
    reader.readAsDataURL(file)
  }

  const saveLedgerProfile = () => {
    onUpdateProfile({
      shipperCustomerName: profile.shipperCustomerName,
      shipperCustomerAddress: profile.shipperCustomerAddress || "",
      shipperCustomerContact: profile.shipperCustomerContact || "",
      shipperCustomerEmail: profile.shipperCustomerEmail || "",
    })
    setProfileSavedFlash(true)
    window.setTimeout(() => setProfileSavedFlash(false), 1500)
  }

  const waitForLedgerPrintAssets = async () => {
    await document.fonts?.ready
    const images = Array.from(document.querySelectorAll("[data-export-ledger-print-preview='true'] img")) as HTMLImageElement[]
    await Promise.all(
      images.map(
        (image) =>
          new Promise<void>((resolve) => {
            if (image.complete) {
              resolve()
              return
            }
            image.onload = () => resolve()
            image.onerror = () => resolve()
          })
      )
    )
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }

  const handlePreviewPrint = async () => {
    await waitForLedgerPrintAssets()
    window.print()
  }

  const applySavedParty = (partyName: string) => {
    const party = savedPartySuggestions.find((item) => item.name.trim().toLowerCase() === partyName.trim().toLowerCase())
    if (!party) {
      onUpdateProfile({ shipperCustomerName: partyName })
      return
    }

    onUpdateProfile({
      shipperCustomerName: party.name,
      shipperCustomerAddress: party.address || "",
      shipperCustomerContact: party.contact || "",
      shipperCustomerEmail: party.email || "",
    })
  }

  const printLedger = async () => {
    setIsPrintPreviewOpen(true)
    window.setTimeout(() => {
      void handlePreviewPrint()
    }, 80)
  }

  const saveLedgerPdfLocally = async () => {
    // @ts-ignore - jsPDF ships this browser bundle without a separate declaration file.
    const { jsPDF } = await import("jspdf/dist/jspdf.es.min.js")
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const title = `${account.companyName} Account Ledger`

    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, 210, 297, "F")
    doc.setDrawColor(212, 175, 55)
    doc.rect(8, 8, 194, 281)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text(title, 105, 22, { align: "center" })
    doc.setFontSize(9)
    doc.text(profile.shipperCustomerName || account.companyName, 14, 34)
    doc.setFont("helvetica", "normal")
    doc.text(profile.officeAddress.split("\n").slice(0, 4), 128, 34, { maxWidth: 66 })

    let y = 58
    doc.setFillColor(248, 214, 120)
    doc.rect(12, y, 186, 8, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7)
    const pdfColumns = [
      { header: "S.NO", x: 14, width: 10 },
      { header: "DATE / SHIP / INV", x: 25, width: 31 },
      { header: "SHIPPER / QTY / PACK", x: 58, width: 42 },
      { header: "B/L / CONSIGNEE", x: 102, width: 42 },
      { header: "CONTAINER / TYPE", x: 146, width: 36 },
      { header: "DEBIT / CREDIT", x: 184, width: 23 },
    ]
    pdfColumns.forEach((column) => {
      doc.text(column.header, column.x, y + 5, { maxWidth: column.width })
    })
    y += 12
    doc.setFont("helvetica", "normal")
    rowsWithBalance.forEach((row) => {
      if (y > 270) {
        doc.addPage()
        y = 18
      }
      const values = [
        String(row.sNo),
        formatMergedDate(row),
        formatMergedDescription(row),
        `${row.billOfLanding || "-"}${row.billOfLandingSurrendered ? "\nSURRENDERED" : ""}\n${row.consignee || "-"}`,
        `${row.containerType || "-"}${row.containerDetails ? `\n${row.containerDetails}` : ""}\n${row.containerNo || "-"}`,
        `${formatMergedDebit(row)}\nBalance: $${formatLedgerMoney(row.balanceUsd)}`,
      ]
      values.forEach((value, index) => doc.text(String(value || ""), pdfColumns[index].x, y, { maxWidth: pdfColumns[index].width }))
      y += 18
    })
    doc.setFont("helvetica", "bold")
    doc.text(`TOTAL DEBIT: $${ledgerTotals.debit.toFixed(2)}`, 14, y + 8)
    doc.text(`TOTAL CREDIT: $${ledgerTotals.credit.toFixed(2)}`, 72, y + 8)
    doc.text(`BALANCE: $${ledgerTotals.balance.toFixed(2)}`, 134, y + 8)

    const blob = doc.output("blob") as Blob
    const formData = new FormData()
    formData.append("file", blob, `${account.companyName.replace(/[\\/:*?"<>|]/g, "-")}-ledger.pdf`)
    formData.append("kind", "pdf")
    formData.append("rowId", account.id)
    formData.append("role", "saved-ledger")

    const response = await fetch("/api/account-ledger-files", { method: "POST", body: formData })
    const result = await response.json()
    alert(response.ok && result.success ? `Saved ledger PDF: ${result.localPath}` : result.error || "Could not save ledger PDF")
  }

  return (
    <section
      className="fixed inset-0 z-50 flex max-w-full flex-col overflow-x-hidden bg-white bg-cover bg-center text-slate-950"
      style={{
        backgroundImage:
          "linear-gradient(180deg,rgba(255,255,255,.72),rgba(255,255,255,.82)), url('/images/account-ledger-background.png')",
      }}
    >
      <header
        data-export-ledger-screen-content="true"
        className="shrink-0 border-b border-blue-100/80 bg-white/86 px-2.5 py-2 shadow-md shadow-blue-100/30 backdrop-blur-2xl md:px-3"
      >
        <div className="flex max-w-full flex-col gap-2 min-[1180px]:flex-row min-[1180px]:items-center min-[1180px]:justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-md shadow-blue-100 transition hover:-translate-y-0.5">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Account Ledger</p>
              <h2 className="max-w-[72vw] truncate text-lg font-black leading-tight text-slate-950 md:text-xl min-[1180px]:max-w-[34vw]">{account.companyName}</h2>
            </div>
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-1.5 overflow-hidden">
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-2xl border border-blue-100 bg-white/80 px-2.5 text-[10px] font-black text-slate-600 shadow-md shadow-blue-100/40">
              Rules
              <select
                value={balanceMethod}
                onChange={(event) => setBalanceMethod(event.target.value as BalanceMethod)}
                className="max-w-40 rounded-xl border border-blue-100 bg-white px-2 py-1 text-[11px] font-black text-slate-950 outline-none focus:border-blue-300"
              >
                <option value="debitMinusCredit">Debit (+) / Credit (-)</option>
                <option value="creditMinusDebit">Credit (+) / Debit (-)</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setIsPrintPreviewOpen(true)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white/86 px-3 text-[11px] font-black text-blue-700 shadow-md shadow-blue-100/40 transition hover:-translate-y-0.5 hover:bg-blue-50"
            >
              <Eye className="h-4 w-4" />
              Print Preview
            </button>
            <button
              type="button"
              onClick={printLedger}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white/86 px-3 text-[11px] font-black text-slate-800 shadow-md shadow-blue-100/40 transition hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button
              type="button"
              onClick={saveLedgerPdfLocally}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-black text-emerald-700 shadow-md shadow-emerald-100/40 transition hover:-translate-y-0.5 hover:bg-emerald-100"
            >
              <HardDrive className="h-4 w-4" />
              Save Ledger PDF
            </button>
            <button
              type="button"
              onClick={exportLedgerCsv}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-[#D4AF37] to-[#F4D03F] px-3 text-[11px] font-black text-slate-950 shadow-md shadow-amber-100 transition hover:-translate-y-0.5"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <div data-export-ledger-screen-content="true" className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-2 md:p-2.5">
        <div className="grid max-w-full gap-2 rounded-[20px] border border-blue-100 bg-white/78 p-2 shadow-lg shadow-blue-100/35 backdrop-blur-xl xl:grid-cols-[minmax(0,1fr)_190px_minmax(0,1fr)]">
          <div className="rounded-[18px] border border-blue-100 bg-white/75 p-2">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Shipper / Customer Name</label>
            <input
              value={profile.shipperCustomerName}
              list="ledger-party-suggestions"
              onChange={(event) => applySavedParty(event.target.value)}
              className="mt-1 h-8 w-full rounded-xl border border-blue-100 bg-white px-3 text-xs font-black text-slate-950 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <datalist id="ledger-party-suggestions">
              {savedPartySuggestions.map((party, index) => (
                <option key={party.id || `${party.source}-${party.name}-${index}`} value={party.name}>
                  {party.source}
                </option>
              ))}
            </datalist>
            <textarea
              value={profile.shipperCustomerAddress || ""}
              onChange={(event) => onUpdateProfile({ shipperCustomerAddress: event.target.value })}
              placeholder="Shipper / customer address"
              className="mt-1.5 min-h-11 w-full resize-y rounded-xl border border-blue-100 bg-white p-2 text-xs font-bold leading-4 text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
              <input
                value={profile.shipperCustomerContact || ""}
                onChange={(event) => onUpdateProfile({ shipperCustomerContact: event.target.value })}
                placeholder="Phone number"
                className="h-8 rounded-xl border border-blue-100 bg-white px-3 text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
              <input
                value={profile.shipperCustomerEmail || ""}
                onChange={(event) => onUpdateProfile({ shipperCustomerEmail: event.target.value })}
                placeholder="Email address"
                className="h-8 rounded-xl border border-blue-100 bg-white px-3 text-xs font-bold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-sm text-xs font-bold text-slate-500">
                Saved BOL shippers and consignees are available. Start typing to add them.
              </p>
              <button
                type="button"
                onClick={saveLedgerProfile}
                className="h-8 rounded-xl bg-linear-to-r from-[#2563EB] to-[#1D4ED8] px-3 text-xs font-black text-white shadow-md shadow-blue-100 transition hover:-translate-y-0.5"
              >
                {profileSavedFlash ? "Saved" : "Save Name"}
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center rounded-[18px] border border-[#D4AF37]/40 bg-white/75 p-2 text-center">
            <img
              src={profile.logoDataUrl || "/images/account-ledger-logo.png"}
              alt="Company logo"
              className="h-16 w-36 object-contain md:h-20 md:w-44"
            />
            <label className="mt-1.5 inline-flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-blue-100 bg-white px-2.5 text-[10px] font-black text-blue-700">
              <Upload className="h-3.5 w-3.5" />
              Update Logo
              <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
            </label>
          </div>

          <div className="rounded-[18px] border border-blue-100 bg-white/75 p-2">
            <label className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Company Address</label>
            <textarea
              value={profile.officeAddress}
              onChange={(event) => onUpdateProfile({ officeAddress: event.target.value })}
              className="mt-1 min-h-20 w-full resize-y rounded-xl border border-blue-100 bg-white p-2 text-xs font-bold leading-4 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-[18px] border border-blue-100 bg-white/78 p-2 shadow-md shadow-blue-100/30 backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Total Debit</p>
            <p className="mt-0.5 text-lg font-black text-red-700">${formatLedgerMoney(ledgerTotals.debit)}</p>
          </div>
          <div className="rounded-[18px] border border-blue-100 bg-white/78 p-2 shadow-md shadow-blue-100/30 backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Total Credit</p>
            <p className="mt-0.5 text-lg font-black text-emerald-700">${formatLedgerMoney(ledgerTotals.credit)}</p>
          </div>
          <div className="rounded-[18px] border border-[#D4AF37]/40 bg-[#D4AF37]/15 p-2 shadow-md shadow-amber-100/50 backdrop-blur-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Balance USD</p>
            <p className={`mt-0.5 text-lg font-black ${balanceToneClass(ledgerTotals.balance)}`}>${formatLedgerMoney(ledgerTotals.balance)}</p>
          </div>
        </div>

        <div className="rounded-[22px] border border-blue-100 bg-white/86 p-4 shadow-xl shadow-blue-100/30 backdrop-blur-xl">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-[.9fr_1.45fr_.85fr_.85fr_.9fr_.95fr_.95fr_.95fr_.95fr_.85fr_.8fr_.8fr_auto]">
            {[
              ["date", "Date", "date", ""],
              ["description", "Shipper / Description", "text", ""],
              ["invoiceNo", "Invoice No", "text", ""],
              ["dateOfShip", "Date of Ship", "date", ""],
              ["billOfLanding", "B/L No", "text", ""],
              ["containerType", "Container Type", "text", "ledger-container-type-options"],
              ["containerDetails", draft.containerType === "Other" ? "Custom Container Type" : "Container Details", "text", ""],
              ["containerNo", "Container No", "text", ""],
              ["consignee", "Consignee", "text", "ledger-consignee-suggestions"],
              ["quantity", "Quantity", "text", ""],
              ["packing", "Packing", "text", ""],
              ["debit", "Debit", "number", ""],
              ["credit", "Credit", "number", ""],
            ].map(([key, label, type, list]) => {
              const moneyClass = key === "debit" ? "text-red-700" : key === "credit" ? "text-emerald-700" : "text-slate-950"
              return (
                <input
                  key={key}
                  type={type}
                  list={list || undefined}
                  value={String(draft[key as keyof typeof draft])}
                  onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                  placeholder={label}
                  className={`h-8 rounded-xl border border-blue-100 bg-white px-2.5 text-[11px] font-black shadow-sm outline-none transition placeholder:text-slate-500 focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${moneyClass}`}
                />
              )
            })}
            <datalist id="ledger-container-type-options">
              {CONTAINER_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="ledger-consignee-suggestions">
              {(consigneeSeedData as SavedParty[])
                .filter((party) => party.name?.trim())
                .map((party) => (
                  <option key={party.id || party.name} value={party.name}>
                    {party.address || party.contact || "Consignee"}
                  </option>
                ))}
            </datalist>
            <button type="button" onClick={addEntry} className="h-8 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 text-xs font-black text-white shadow-md shadow-blue-100 transition hover:-translate-y-0.5">
              Add Row
            </button>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-500">
            When adding a consignee, type the consignee name and select it from saved BOL consignee information.
          </p>
        </div>

        <div className="min-h-[calc(100vh-238px)] max-w-full overflow-hidden rounded-[24px] border border-blue-100 bg-white/82 shadow-xl shadow-blue-100/50 backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-white/78 px-3 py-2 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">Row spacing</span>
              {(["compact", "medium", "comfortable"] as const).map((density) => (
                <button
                  key={density}
                  type="button"
                  onClick={() => setRowDensity(density)}
                  className={`h-8 rounded-xl border px-3 text-[11px] font-black capitalize transition ${
                    rowDensity === density
                      ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-100"
                      : "border-blue-100 bg-white/80 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  {density}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-500">Header, S.NO, and row cells are aligned in one RTL ledger grid.</p>
          </div>
          <div className="ledger-scroll h-full max-h-[calc(100vh-280px)] max-w-full overflow-y-auto overflow-x-auto overscroll-contain scroll-smooth">
            <div className="relative min-w-[1500px]">
              <div className="ledger-table-grid">
                <div className="ledger-table-grid-header-row">
                  {ledgerColumns.map((column) => (
                    <div key={column.id} className="ledger-table-grid-header-cell">
                      <span className="ledger-table-grid-header-en">{column.en}</span>
                      {column.ps ? <span dir="rtl" className="ledger-table-grid-header-ps">{column.ps}</span> : null}
                    </div>
                  ))}
                </div>
                <div className="ledger-table-grid-body">
                  {rowsWithBalance.length === 0 ? (
                    <div className="ledger-table-grid-row">
                      <div className="ledger-table-grid-cell col-span-full p-8 text-center text-sm font-black text-slate-500">
                        No ledger rows yet.
                      </div>
                    </div>
                  ) : (
                    rowsWithBalance.map((row) => (
                      <LedgerRow
                        key={row.id}
                        row={row}
                        sNo={row.sNo}
                        isEditing={row.id === editingRowId}
                        isSelected={row.id === selectedRowId}
                        editingDraft={row.id === editingRowId ? editingDraft : undefined}
                        density={rowDensity}
                        onSelect={() => setSelectedRowId(row.id)}
                        onContextMenu={(event) => handleRowContextMenu(row.id, event)}
                        onEdit={() => startEditingRow(row)}
                        onSave={() => saveRowEdit(row.id)}
                        onCancel={cancelRowEdit}
                        onDelete={() => deleteEntry(row.id)}
                        onMoveUp={() => moveEntry(row.id, -1)}
                        onMoveDown={() => moveEntry(row.id, 1)}
                        onEditChange={(field, value) => updateRowDraft(field, value)}
                        onMediaAdd={(files) => uploadMediaFiles(row, files)}
                        onMediaDelete={(mediaId) => deleteMedia(row, mediaId)}
                        getMediaFiles={getEntryMediaFiles}
                        onViewReceipt={(receiptId) => {
                          const receipt = receipts[receiptId]
                          if (receipt) {
                            alert(
                              `Receipt: ${receipt.receiptNo}\nDate: ${receipt.date}\nAccount: ${receipt.accountName}\nAmount: ${receipt.currency} ${receipt.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}\nB/L: ${receipt.blNo || "—"}\nConsignee: ${receipt.consignee || "—"}`
                            )
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {contextMenu ? (
                <div className="fixed inset-0 z-50" onClick={closeContextMenu}>
                  <div
                    className="absolute z-50 w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl backdrop-blur-xl"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    {(() => {
                      const index = rowsWithBalance.findIndex((row) => row.id === contextMenu.rowId)
                      const canMoveUp = index > 0
                      const canMoveDown = index !== -1 && index < rowsWithBalance.length - 1
                      const row = rowsWithBalance[index]
                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              if (row) startEditingRow(row)
                              closeContextMenu()
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:bg-slate-100"
                          >
                            Edit row
                          </button>
                          <button
                            type="button"
                            onClick={() => moveEntry(contextMenu.rowId, -1)}
                            disabled={!canMoveUp}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveEntry(contextMenu.rowId, 1)}
                            disabled={!canMoveDown}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (row) setRowDetails(row)
                              closeContextMenu()
                            }}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-slate-900 transition hover:bg-slate-100"
                          >
                            View details
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteEntry(contextMenu.rowId)}
                            className="w-full rounded-xl px-3 py-2 text-left text-sm font-black text-red-600 transition hover:bg-red-50"
                          >
                            Delete row
                          </button>
                        </>
                      )
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isPrintPreviewOpen ? (
        <div
          data-export-ledger-print-preview="true"
          className="fixed inset-0 z-[59] overflow-y-auto bg-slate-950/72 p-3 backdrop-blur-xl md:p-4"
        >
          <div className="mx-auto flex w-full max-w-[1660px] flex-col gap-3">
            <div
              data-export-ledger-print-hidden="true"
              className="sticky top-3 z-10 flex flex-col gap-3 rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-2xl shadow-slate-950/20 backdrop-blur-2xl md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.20em] text-[#D4AF37]">Ledger Print Preview</p>
                <h3 className="text-xl font-black text-slate-950 md:text-2xl">{account.companyName}</h3>
                <p className="text-xs font-bold text-slate-500">
                  {printPageCount} page{printPageCount === 1 ? "" : "s"} ready for print
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPrintZoom((value) => Math.max(0.55, Number((value - 0.08).toFixed(2))))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <ZoomOut className="h-4 w-4" />
                  Zoom
                </button>
                <span className="inline-flex h-11 min-w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 px-3 text-sm font-black text-blue-700">
                  {Math.round(printZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPrintZoom((value) => Math.min(1.2, Number((value + 0.08).toFixed(2))))}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
                >
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintFitMode("width")
                    setPrintZoom(0.92)
                  }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
                    printFitMode === "width" ? "border-blue-200 bg-blue-600 text-white" : "border-blue-100 bg-white text-blue-700"
                  }`}
                >
                  <Maximize2 className="h-4 w-4" />
                  Fit Width
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrintFitMode("page")
                    setPrintZoom(0.86)
                  }}
                  className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm transition hover:-translate-y-0.5 ${
                    printFitMode === "page" ? "border-blue-200 bg-blue-600 text-white" : "border-blue-100 bg-white text-blue-700"
                  }`}
                >
                  Fit Page
                </button>
                <button
                  type="button"
                  onClick={saveLedgerPdfLocally}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPrint}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-5 text-sm font-black text-white shadow-lg shadow-blue-100"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-5 text-sm font-black text-slate-700 shadow-sm"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </div>
            <ExportAccountLedgerPrint
              account={account}
              profile={profile}
              rows={rowsWithBalance}
              totals={ledgerTotals}
              zoom={printZoom}
              fitMode={printFitMode}
            />
          </div>
        </div>
      ) : null}

      {mediaViewer ? (
        <MediaGalleryModal
          viewer={mediaViewer}
          filter={mediaFilter}
          search={mediaSearch}
          detailsOpen={mediaDetailsOpen}
          onFilterChange={setMediaFilter}
          onSearchChange={setMediaSearch}
          onDetailsToggle={() => setMediaDetailsOpen((value) => !value)}
          onClose={() => setMediaViewer(null)}
          onIndexChange={(index) => setMediaViewer((current) => (current ? { ...current, index } : current))}
          onFavorite={toggleViewerFavorite}
          onDelete={deleteViewerMedia}
        />
      ) : null}

      {activeRowDetails ? (
        <LedgerRowDetailsModal
          row={activeRowDetails}
          progress={uploadProgress}
          onClose={() => setRowDetails(null)}
          onOpenPdf={openPdf}
          onUploadPdf={uploadPdf}
          onUploadMedia={(files) => uploadMediaFiles(activeRowDetails, files)}
          onOpenMedia={(index) => {
            setMediaFilter("all")
            setMediaSearch("")
            setMediaDetailsOpen(false)
            setMediaViewer({ items: getEntryMediaFiles(activeRowDetails), index, rowId: activeRowDetails.id })
          }}
          onRenameMedia={(mediaId) => renameMedia(activeRowDetails, mediaId)}
          onDeleteMedia={(mediaId) => deleteMedia(activeRowDetails, mediaId)}
        />
      ) : null}

      {ledgerToast ? (
        <div
          className={`fixed bottom-6 right-6 z-[80] rounded-2xl border px-4 py-3 text-sm font-black shadow-2xl backdrop-blur-xl ${
            ledgerToast.type === "success"
              ? "border-emerald-200 bg-emerald-50/95 text-emerald-800 shadow-emerald-100"
              : "border-red-200 bg-red-50/95 text-red-800 shadow-red-100"
          }`}
        >
          {ledgerToast.message}
        </div>
      ) : null}

      {viewingPdf ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className="flex h-[92vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-blue-100 bg-white p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">PDF Attachment</p>
                <h3 className="text-lg font-black text-slate-950">{viewingPdf.title}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 shadow-sm transition hover:bg-amber-100"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={openPdfInNewTab}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-100"
                >
                  <Eye className="h-4 w-4" />
                  New Tab
                </button>
                <button type="button" onClick={() => setViewingPdf(null)} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-100 bg-white text-slate-700">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-slate-200 p-3">
              {pdfViewerUrl ? (
                <iframe
                  key={pdfViewerUrl}
                  src={`${pdfViewerUrl}#toolbar=1&navpanes=0&scrollbar=1`}
                  title={viewingPdf.title}
                  className="h-full w-full rounded-2xl bg-white shadow-inner"
                />
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-500">
                  Loading PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function RowMediaManager({
  entry,
  progress,
  onUpload,
  onOpen,
  onRename,
  onDelete,
  onMove,
  onFavorite,
}: {
  entry: LedgerEntry
  progress: Record<string, number>
  onUpload: (files: FileList | File[]) => void
  onOpen: (index: number) => void
  onRename: (mediaId: string) => void
  onDelete: (mediaId: string) => void
  onMove: (mediaId: string, direction: -1 | 1) => void
  onFavorite: (mediaId: string) => void
}) {
  const media = getEntryMediaFiles(entry)
  const counts = {
    images: media.filter((item) => item.kind === "image").length,
    videos: media.filter((item) => item.kind === "video").length,
    audio: media.filter((item) => item.kind === "audio").length,
  }
  const totalStorage = media.reduce((sum, item) => sum + Number(item.size || 0), 0)
  const activeProgress = Object.entries(progress).filter(([key]) => key.startsWith(`${entry.id}-`))

  return (
    <div
      className="ledger-media-card max-w-full rounded-[16px] border border-sky-100 bg-white/90 p-2 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-200"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onUpload(event.dataTransfer.files)
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-700">Media</p>
          <p className="text-[9px] font-bold text-slate-600">
            {media.length} files â€¢ {formatFileSize(totalStorage)}
          </p>
        </div>
        <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-1 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-2.5 text-[9px] font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5 hover:shadow-blue-500/30">
          <Upload className="h-3.5 w-3.5" />
          Add
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) onUpload(event.target.files)
              event.currentTarget.value = ""
            }}
          />
        </label>
      </div>

      {media.length ? (
        <>
          <div className="mb-2 grid grid-cols-3 gap-1 text-[8px] font-black">
            <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-100 bg-sky-50/90 px-1.5 py-1 text-sky-700">
              <FileImage className="h-3 w-3" /> {counts.images}
            </span>
            <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50/90 px-1.5 py-1 text-blue-700">
              <FileVideo className="h-3 w-3" /> {counts.videos}
            </span>
            <span className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50/90 px-1.5 py-1 text-emerald-700">
              <FileAudio className="h-3 w-3" /> {counts.audio}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 overflow-hidden pb-1">
            {media.slice(0, 3).map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(index)}
                title={item.name}
                className="ledger-media-thumb group relative overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-11 w-full overflow-hidden rounded-[12px] bg-slate-100">
                  <MediaThumb item={item} />
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-white/85 px-1 py-0.5 text-[7px] font-black text-slate-700 line-clamp-1">
                  {item.name}
                </div>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onOpen(0)}
            className="mt-1 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 px-2 text-[9px] font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
          >
            <Images className="h-3.5 w-3.5" />
            View Media
          </button>
        </>
      ) : (
        <label className="flex min-h-[74px] cursor-pointer flex-col items-center justify-center rounded-[16px] border border-dashed border-blue-200 bg-blue-50/60 p-2 text-center text-[9px] font-black text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-100/70">
          <Images className="mb-1 h-4 w-4 text-blue-500" />
          No media
          <span className="mt-0.5 text-[8px] font-bold text-slate-500">Drop or add</span>
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) onUpload(event.target.files)
              event.currentTarget.value = ""
            }}
          />
        </label>
      )}

      {activeProgress.length ? (
        <div className="mt-2 space-y-1">
          {activeProgress.map(([key, value]) => (
            <div key={key} className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-sky-600 transition-all" style={{ width: `${value}%` }} />
            </div>
          ))}
        </div>
      ) : null}
      <p className="mt-1 hidden truncate rounded-2xl bg-slate-50 px-2 py-1 text-[7px] font-bold text-slate-500 xl:block">Storage: {MEDIA_STORAGE_LABEL}</p>
    </div>
  )
}

function MediaThumb({ item }: { item: MediaAttachment }) {
  if (item.kind === "image") {
    return <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
  }

  if (item.kind === "video") {
    return (
      <div className="relative h-full w-full bg-slate-950">
        <video src={item.url} preload="metadata" className="h-full w-full object-cover opacity-75" />
        <span className="absolute inset-0 flex items-center justify-center text-white">
          <FileVideo className="h-5 w-5" />
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-blue-50 text-emerald-700">
      <FileAudio className="h-5 w-5" />
      <span className="mt-0.5 text-[7px] font-black">Voice</span>
    </div>
  )
}

function MediaGalleryModal({
  viewer,
  filter,
  search,
  detailsOpen,
  onFilterChange,
  onSearchChange,
  onDetailsToggle,
  onClose,
  onIndexChange,
  onFavorite,
  onDelete,
}: {
  viewer: { items: MediaAttachment[]; index: number; rowId: string }
  filter: "all" | MediaKind | "favorites"
  search: string
  detailsOpen: boolean
  onFilterChange: (filter: "all" | MediaKind | "favorites") => void
  onSearchChange: (value: string) => void
  onDetailsToggle: () => void
  onClose: () => void
  onIndexChange: (index: number) => void
  onFavorite: (mediaId: string) => void
  onDelete: (mediaId: string) => void
}) {
  const [zoom, setZoom] = useState(1)
  const currentItem = viewer.items[viewer.index] || viewer.items[0]
  const visibleItems = viewer.items.filter((item) => {
    const matchesFilter = filter === "all" || filter === "favorites" ? (filter === "all" ? true : item.favorite) : item.kind === filter
    const matchesSearch = !search.trim() || [item.name, item.originalName, item.kind, item.storagePath].join(" ").toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })
  const counts = {
    all: viewer.items.length,
    image: viewer.items.filter((item) => item.kind === "image").length,
    video: viewer.items.filter((item) => item.kind === "video").length,
    audio: viewer.items.filter((item) => item.kind === "audio").length,
    favorites: viewer.items.filter((item) => item.favorite).length,
  }
  const totalStorage = viewer.items.reduce((sum, item) => sum + Number(item.size || 0), 0)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowLeft") onIndexChange(Math.max(0, viewer.index - 1))
      if (event.key === "ArrowRight") onIndexChange(Math.min(viewer.items.length - 1, viewer.index + 1))
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose, onIndexChange, viewer.index, viewer.items.length])

  useEffect(() => {
    setZoom(1)
  }, [currentItem?.id])

  const downloadCurrent = () => {
    if (!currentItem) return
    const link = document.createElement("a")
    link.href = currentItem.url
    link.download = currentItem.name
    link.click()
  }

  const copyPath = async () => {
    if (!currentItem) return
    await navigator.clipboard?.writeText(currentItem.storagePath || currentItem.url)
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-slate-950/58 p-2 backdrop-blur-2xl sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="flex h-[96vh] w-full max-w-[1680px] flex-col overflow-hidden rounded-[34px] border border-white/55 bg-white/70 shadow-[0_30px_100px_rgba(15,23,42,0.34)] backdrop-blur-3xl"
      >
        <header className="flex shrink-0 flex-col gap-3 border-b border-white/65 bg-white/76 px-4 py-3 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onClose}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/82 text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.14)] backdrop-blur-xl"
              aria-label="Back to ledger"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D4AF37]">Apple Style Media Gallery</p>
              <h3 className="truncate text-xl font-black leading-tight text-slate-950 md:text-2xl">{currentItem?.name || "Media Gallery"}</h3>
              <p className="truncate text-[11px] font-bold text-slate-500">
                {viewer.items.length} files | {formatFileSize(totalStorage)} | {MEDIA_STORAGE_LABEL}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={downloadCurrent} className="inline-flex h-11 items-center gap-2 rounded-full border border-blue-100 bg-white/82 px-4 text-xs font-black text-blue-700 shadow-[0_12px_35px_rgba(37,99,235,0.14)] backdrop-blur-xl">
              <Download className="h-4 w-4" /> Download
            </motion.button>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={copyPath} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/82 px-4 text-xs font-black text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.1)] backdrop-blur-xl">
              <Copy className="h-4 w-4" /> Copy Path
            </motion.button>
            <motion.a href={currentItem?.url || "#"} target="_blank" rel="noreferrer" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white/82 px-4 text-xs font-black text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.1)] backdrop-blur-xl">
              <FolderOpen className="h-4 w-4" /> Open
            </motion.a>
            <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={onDetailsToggle} className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-black shadow-[0_12px_35px_rgba(15,23,42,0.1)] backdrop-blur-xl ${detailsOpen ? "border-blue-200 bg-blue-50/90 text-blue-700" : "border-slate-200 bg-white/82 text-slate-700"}`}>
              <Info className="h-4 w-4" /> Details
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white/82 text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.1)] backdrop-blur-xl" aria-label="More actions">
              <MoreHorizontal className="h-5 w-5" />
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onClose} className="flex size-11 items-center justify-center rounded-full border border-slate-200 bg-white/82 text-slate-700 shadow-[0_12px_35px_rgba(15,23,42,0.1)] backdrop-blur-xl" aria-label="Close media gallery">
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b border-white/60 bg-white/48 p-3 backdrop-blur-xl lg:border-b-0 lg:border-r lg:p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search media"
                className="h-12 w-full rounded-2xl border border-blue-100 bg-white/82 pl-10 pr-3 text-sm font-bold text-slate-800 outline-none shadow-inner backdrop-blur-xl transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {[
                ["all", `All Media (${counts.all})`],
                ["image", `Images (${counts.image})`],
                ["video", `Videos (${counts.video})`],
                ["audio", `Voice Messages (${counts.audio})`],
                ["favorites", `Favorites (${counts.favorites})`],
              ].map(([key, label]) => (
                <motion.button
                  key={key}
                  type="button"
                  whileHover={{ x: filter === key ? 0 : 3 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onFilterChange(key as "all" | MediaKind | "favorites")}
                  className={`rounded-2xl border px-4 py-3 text-left text-xs font-black transition ${
                    filter === key
                      ? "border-blue-500 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-blue-500/20"
                      : "border-white/70 bg-white/70 text-slate-700 shadow-sm hover:border-blue-100 hover:bg-blue-50"
                  }`}
                >
                  {label}
                </motion.button>
              ))}
            </div>
            <div className="mt-4 rounded-3xl border border-blue-100 bg-white/70 p-4 text-xs font-bold text-slate-600 shadow-[0_18px_50px_rgba(37,99,235,0.08)] backdrop-blur-xl">
              <p className="font-black uppercase tracking-[0.16em] text-[#D4AF37]">Storage Summary</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="rounded-2xl bg-blue-50 p-2 text-blue-700">Files<br />{viewer.items.length}</span>
                <span className="rounded-2xl bg-sky-50 p-2 text-sky-700">Images<br />{counts.image}</span>
                <span className="rounded-2xl bg-indigo-50 p-2 text-indigo-700">Videos<br />{counts.video}</span>
                <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-700">Voice<br />{counts.audio}</span>
              </div>
              <p className="mt-3 rounded-2xl bg-white/78 p-3">Total Storage: {formatFileSize(totalStorage)}</p>
              <p className="mt-2 truncate rounded-2xl bg-white/78 p-3">Mode: Local PC Storage</p>
            </div>
          </aside>

          <main className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] bg-gradient-to-br from-white/20 via-blue-50/30 to-slate-100/50">
            <div className="relative flex min-h-0 items-center justify-center overflow-hidden p-3 sm:p-5">
              <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }} onClick={() => onIndexChange(Math.max(0, viewer.index - 1))} className="absolute left-4 z-10 flex size-12 items-center justify-center rounded-full border border-white/70 bg-white/76 text-slate-800 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl disabled:opacity-40" disabled={viewer.index <= 0} aria-label="Previous media">
                <ChevronLeft className="h-6 w-6" />
              </motion.button>
              <div
                className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[32px] border border-white/70 bg-white/52 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_22px_70px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:p-5"
                onWheel={(event) => {
                  if (currentItem?.kind !== "image") return
                  setZoom((value) => Math.max(0.5, Math.min(3, value + (event.deltaY > 0 ? -0.08 : 0.08))))
                }}
                onDoubleClick={() => setZoom((value) => (value > 1 ? 1 : 2))}
              >
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/70 bg-white/74 p-1 shadow-lg backdrop-blur-xl">
                  <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.15))} className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-blue-50" aria-label="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setZoom(1)} className="h-9 rounded-full px-3 text-[11px] font-black text-slate-700 hover:bg-blue-50">Fit</button>
                  <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 0.15))} className="flex size-9 items-center justify-center rounded-full text-slate-700 hover:bg-blue-50" aria-label="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentItem?.id || "empty-media"}
                    initial={{ opacity: 0, scale: 0.985, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.985, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-full w-full items-center justify-center"
                  >
                    {currentItem?.kind === "image" ? (
                      <img
                        src={currentItem.url}
                        alt={currentItem.name}
                        loading="lazy"
                        className="max-h-full max-w-full cursor-grab rounded-2xl object-contain shadow-[0_20px_70px_rgba(15,23,42,0.18)] transition-transform duration-200"
                        style={{ transform: `scale(${zoom})` }}
                      />
                    ) : currentItem?.kind === "video" ? (
                      <div className="flex h-full w-full items-center justify-center">
                        <video src={currentItem.url} controls className="max-h-full max-w-full rounded-[28px] bg-black shadow-2xl" />
                      </div>
                    ) : currentItem?.kind === "audio" ? (
                      <div className="w-full max-w-2xl rounded-[34px] border border-white/75 bg-white/80 p-8 text-center shadow-[0_26px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
                        <div className="mx-auto flex size-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-emerald-50 to-blue-50 text-emerald-600 shadow-inner">
                          <FileAudio className="h-14 w-14" />
                        </div>
                        <h4 className="mt-5 text-2xl font-black text-slate-950">Voice Message</h4>
                        <p className="mt-2 break-words text-sm font-bold text-slate-500">{currentItem.name}</p>
                        <div className="mt-6 flex h-20 items-center justify-center gap-1.5 rounded-3xl bg-emerald-50/90 px-5 shadow-inner">
                          {Array.from({ length: 42 }).map((_, index) => (
                            <span key={index} className="w-1.5 rounded-full bg-gradient-to-t from-emerald-600 to-sky-400" style={{ height: `${14 + ((index * 7) % 42)}px` }} />
                          ))}
                        </div>
                        <audio src={currentItem.url} controls className="mt-6 w-full" />
                      </div>
                    ) : (
                      <div className="rounded-[30px] border border-white/70 bg-white/80 p-8 text-center shadow-xl">
                        <FileImage className="mx-auto h-16 w-16 text-blue-600" />
                        <p className="mt-4 text-sm font-black text-slate-700">Select a media file</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }} onClick={() => onIndexChange(Math.min(viewer.items.length - 1, viewer.index + 1))} className="absolute right-4 z-10 flex size-12 items-center justify-center rounded-full border border-white/70 bg-white/76 text-slate-800 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl disabled:opacity-40" disabled={viewer.index >= viewer.items.length - 1} aria-label="Next media">
                <ChevronRight className="h-6 w-6" />
              </motion.button>

              <AnimatePresence>
                {detailsOpen && currentItem ? (
                  <motion.aside
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 24 }}
                    className="absolute right-5 top-5 max-h-[calc(100%-40px)] w-[min(340px,calc(100%-40px))] overflow-auto rounded-[30px] border border-white/75 bg-white/82 p-5 text-xs font-bold text-slate-600 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Details</p>
                    <h4 className="mt-2 break-words text-lg font-black text-slate-950">{currentItem.name}</h4>
                    <div className="mt-4 grid gap-2">
                      <p className="rounded-2xl bg-slate-50 p-3">Original: {currentItem.originalName}</p>
                      <p className="rounded-2xl bg-slate-50 p-3">Type: {currentItem.kind}</p>
                      <p className="rounded-2xl bg-slate-50 p-3">Size: {formatFileSize(currentItem.size)}</p>
                      <p className="rounded-2xl bg-slate-50 p-3">Uploaded: {new Date(currentItem.uploadedAt).toLocaleString()}</p>
                      <p className="break-words rounded-2xl bg-slate-50 p-3">Storage: {currentItem.storagePath || currentItem.url}</p>
                      <p className="rounded-2xl bg-slate-50 p-3">Shipment Reference: {viewer.rowId}</p>
                    </div>
                  </motion.aside>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="shrink-0 border-t border-white/65 bg-white/66 p-3 backdrop-blur-2xl">
              <div className="mb-3 flex gap-3 overflow-x-auto pb-2">
                {visibleItems.slice(0, 18).map((item) => {
                  const originalIndex = viewer.items.findIndex((candidate) => candidate.id === item.id)
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onIndexChange(originalIndex)}
                      className={`relative h-24 w-36 shrink-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
                        originalIndex === viewer.index ? "border-blue-500 ring-4 ring-blue-200 shadow-blue-200" : "border-white/70 hover:border-blue-200"
                      }`}
                    >
                      <MediaThumb item={item} />
                      <span className="absolute bottom-1 left-1 rounded-full bg-white/86 px-2 py-0.5 text-[9px] font-black text-slate-700 backdrop-blur-xl">
                        {item.kind === "image" ? "IMG" : item.kind === "video" ? "VIDEO" : item.kind === "audio" ? "VOICE" : "FILE"}
                      </span>
                    </motion.button>
                  )
                })}
                {!visibleItems.length ? (
                  <div className="flex h-24 w-full items-center justify-center rounded-2xl border border-dashed border-blue-100 bg-white/62 text-xs font-black text-slate-500">
                    No media matches this filter.
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => currentItem && onFavorite(currentItem.id)} className={`inline-flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-black shadow-sm backdrop-blur-xl ${currentItem?.favorite ? "border-rose-200 bg-rose-50 text-rose-700" : "border-white/70 bg-white/78 text-rose-600"}`}>
                  <Heart className={`h-4 w-4 ${currentItem?.favorite ? "fill-current" : ""}`} /> Favorite
                </motion.button>
                <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={downloadCurrent} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 text-xs font-black text-blue-700 shadow-sm backdrop-blur-xl">
                  <Download className="h-4 w-4" /> Download
                </motion.button>
                <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/78 px-4 text-xs font-black text-slate-700 shadow-sm backdrop-blur-xl">
                  <Share2 className="h-4 w-4" /> Share
                </motion.button>
                <motion.button type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => currentItem && onDelete(currentItem.id)} className="inline-flex h-11 items-center gap-2 rounded-full border border-red-100 bg-red-50/90 px-4 text-xs font-black text-red-600 shadow-sm backdrop-blur-xl">
                  <Trash2 className="h-4 w-4" /> Delete
                </motion.button>
              </div>
            </div>
          </main>
        </div>
      </motion.div>
    </div>
  )
}

function LedgerPrintPreview({
  account,
  profile,
  rows,
  totals,
}: {
  account: AccountRecord
  profile: LedgerProfile
  rows: Array<LedgerEntry & { sNo: number; balanceUsd: number }>
  totals: { debit: number; credit: number; balance: number }
}) {
  return (
    <div
      data-ledger-print-sheet="true"
      className="min-h-[980px] rounded-[28px] border-2 border-[#D4AF37] bg-white bg-cover bg-center p-7 text-slate-950 shadow-2xl"
      style={{
        backgroundImage:
          "linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,255,255,.88)), url('/images/account-ledger-background.png')",
      }}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_360px_1fr]">
        <div className="rounded-2xl border border-[#D4AF37]/45 bg-white/70 p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9a6a00]">Shipper / Customer</p>
          <h2 className="mt-2 text-2xl font-black uppercase leading-tight">{profile.shipperCustomerName || account.companyName}</h2>
          {profile.shipperCustomerAddress ? <p className="mt-2 text-xs font-bold leading-5 text-slate-700">{profile.shipperCustomerAddress}</p> : null}
          <p className="mt-2 text-xs font-bold text-slate-700">
            {[profile.shipperCustomerContact, profile.shipperCustomerEmail].filter(Boolean).join(" | ")}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={profile.logoDataUrl || "/images/account-ledger-logo.png"}
            alt="Company logo"
            className="h-36 w-80 object-contain"
          />
          <p className="mt-1 text-xs font-black uppercase tracking-[0.22em] text-[#9a6a00]">Company Account Ledger</p>
          <h1 className="text-3xl font-black">Account Ledger</h1>
          <p className="text-sm font-bold text-slate-600">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/45 bg-white/70 p-4 text-right">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#9a6a00]">Company Address</p>
          <p className="mt-2 whitespace-pre-line text-xs font-bold leading-5 text-slate-700">{profile.officeAddress}</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden border border-[#D4AF37]">
        <table className="w-full table-fixed text-[10px]">
          <thead className="bg-[#f8d678] text-left text-slate-950">
            <tr>
              {["S.NO", "DATE / SHIP / INVOICE", "SHIPPER / DESCRIPTION / QTY / PACKING", "BILL OF LADING", "CONTAINER TYPE", "DEBIT / CREDIT", "BALANCE USD"].map((header) => (
                <th key={header} className="border-r border-[#b4810b] p-2 align-top font-black last:border-r-0">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="h-24 p-4 text-center font-black text-slate-500">
                  No ledger rows yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-[#D4AF37]/50 bg-white/72">
                  <td className="border-r border-[#D4AF37]/50 p-2">{row.sNo}</td>
                  <td className="border-r border-[#D4AF37]/50 p-2 whitespace-pre-line">{formatMergedDate(row)}</td>
                  <td className="border-r border-[#D4AF37]/50 p-2 whitespace-pre-line">{formatMergedDescription(row)}</td>
                  <td className={`border-r border-[#D4AF37]/50 p-2 ${row.billOfLandingSurrendered ? "bg-sky-100 font-black text-sky-900" : ""}`}>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">B/L No</span>
                        <span className="block text-sm font-black text-slate-900">{row.billOfLanding || "-"}</span>
                        {row.billOfLandingSurrendered ? <span className="mt-1 block text-[9px] uppercase">Surrendered</span> : null}
                      </div>
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Consignee</span>
                        <span className="block text-sm text-slate-700">{row.consignee || "-"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-[#D4AF37]/50 p-2">
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Type</span>
                        <span className="block text-sm font-black text-slate-900">{row.containerType || "-"}</span>
                        {row.containerDetails ? <span className="mt-1 block text-[9px] text-slate-600">{row.containerDetails}</span> : null}
                      </div>
                      <div>
                        <span className="block text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">Container No</span>
                        <span className="block text-sm text-slate-700">{row.containerNo || "-"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="border-r border-[#D4AF37]/50 p-2 whitespace-pre-line font-black">
                    <span className="text-red-700">Debit: ${row.debit.toFixed(2)}</span>
                    <span className="block text-emerald-700">Credit: ${row.credit.toFixed(2)}</span>
                  </td>
                  <td className={`p-2 font-black ${balanceToneClass(row.balanceUsd)}`}>${row.balanceUsd.toFixed(2)}</td>
                </tr>
              ))
            )}
            <tr className="bg-slate-950 text-white">
              <td colSpan={5} className="p-2 text-sm font-black">TOTAL</td>
              <td className="p-2 font-black">
                <span className="text-red-200">Debit: ${totals.debit.toFixed(2)}</span>
                <span className="block text-emerald-200">Credit: ${totals.credit.toFixed(2)}</span>
              </td>
              <td className="p-2 font-black">${totals.balance.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function copyText(value: string) {
  if (!value) return
  navigator.clipboard?.writeText(value).catch(() => {})
}

function LedgerCell({
  value,
  onChange,
  type = "text",
  className = "",
  multiline = false,
  list,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  type?: string
  className?: string
  multiline?: boolean
  list?: string
  placeholder?: string
}) {
  const inputDir = type === "date" || type === "number" ? "ltr" : "auto"
  const sharedClasses = `w-full min-w-0 rounded-[14px] border border-blue-100 bg-white/78 px-3 text-[13px] font-black text-slate-900 shadow-[0_8px_22px_rgba(30,60,100,.08)] outline-none backdrop-blur-xl transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${className}`

  if (multiline) {
    return (
      <textarea
        dir={inputDir}
        value={value}
        placeholder={placeholder}
        rows={2}
        title={value || placeholder}
        onChange={(event) => {
          event.currentTarget.style.height = "auto"
          event.currentTarget.style.height = `${Math.min(Math.max(event.currentTarget.scrollHeight, 44), 120)}px`
          onChange(event.target.value)
        }}
        className={`ledger-textarea min-h-[50px] resize-none leading-5 ${sharedClasses}`}
      />
    )
  }

  return (
    <input
      dir={inputDir}
      type={type}
      list={list}
      value={value}
      placeholder={placeholder}
      title={value || placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`ledger-text-input h-10 ${sharedClasses}`}
    />
  )
}

function ContainerTypeSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full min-w-0 rounded-[14px] border border-blue-100 bg-white/78 px-3 text-[13px] font-black text-slate-950 shadow-[0_8px_22px_rgba(30,60,100,.08)] outline-none backdrop-blur-xl transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    >
      <option value="">Container type</option>
      {CONTAINER_TYPE_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  )
}

function LedgerFieldLabel({ children }: { children: ReactNode }) {
  return <span className="hidden text-[10px] font-black uppercase tracking-[0.12em] text-slate-500 max-lg:block">{children}</span>
}

function MergedCellLabel({ label, tone = "slate" }: { label: string; tone?: "slate" | "blue" | "gold" | "red" | "green" }) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "gold"
        ? "bg-amber-50 text-amber-700"
        : tone === "red"
          ? "bg-red-50 text-red-700"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-50 text-slate-600"

  return <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.10em] ${toneClass}`}>{label}</span>
}

function buildLedgerDetailSections(row: LedgerEntry & { sNo: number; balanceUsd: number }) {
  const media = getEntryMediaFiles(row)
  const quantityPacking = splitQuantityPacking(row.quantity, row.packing)
  return [
    {
      title: "Shipment Details",
      fields: [
        ["S.NO", row.sNo],
        ["Date", row.date],
        ["Shipper / Description", row.description],
        ["Quantity", quantityPacking.quantity],
        ["Packing", quantityPacking.packing],
      ],
    },
    {
      title: "Invoice / B.L Details",
      fields: [
        ["Invoice No", row.invoiceNo],
        ["Date of Ship", row.dateOfShip],
        ["Bill of Lading", `${row.billOfLanding || "-"}${row.billOfLandingSurrendered ? " - Surrendered" : ""}`],
        ["B/L Status", row.billOfLandingSurrendered ? "Surrendered" : "Active"],
      ],
    },
    {
      title: "Container Details",
      fields: [
        ["Container Type", row.containerType || "-"],
        ["Container Details", row.containerDetails || "-"],
        ["Container No", row.containerNo || "-"],
      ],
    },
    {
      title: "Consignee Details",
      fields: [["Consignee", row.consignee || "-"]],
    },
    {
      title: "Debit / Credit / Balance",
      fields: [
        ["Debit", `$${formatLedgerMoney(Number(row.debit || 0))}`],
        ["Credit", `$${formatLedgerMoney(Number(row.credit || 0))}`],
        ["Balance USD", `$${formatLedgerMoney(Number(row.balanceUsd || 0))}`],
      ],
    },
    {
      title: "Attached Media / PDF Files",
      fields: [
        ["B/L PDF", row.pdfName || (row.pdfUrl || row.pdfDataUrl ? "Uploaded" : "Not uploaded")],
        ["Status PDF", row.statusPdfName || (row.statusPdfUrl || row.statusPdfDataUrl ? "Uploaded" : "Not uploaded")],
        ["Media", `${media.length} file${media.length === 1 ? "" : "s"}`],
      ],
    },
  ] as const
}

function LedgerInlineDetailsPanel({
  row,
  onClose,
}: {
  row: LedgerEntry & { sNo: number; balanceUsd: number }
  onClose: () => void
}) {
  const sections = buildLedgerDetailSections(row)

  return (
    <section dir="ltr" className="rounded-[26px] border border-blue-100 bg-white/84 p-4 shadow-xl shadow-blue-100/60 backdrop-blur-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Expanded Row Details</p>
          <h4 className="mt-1 text-xl font-black text-slate-950">Ledger Row {row.sNo}</h4>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50"
        >
          <X className="h-4 w-4" />
          Close
        </button>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="rounded-[22px] border border-blue-100 bg-white/78 p-3 shadow-sm">
            <h5 className="text-[11px] font-black uppercase tracking-[0.18em] text-[#D4AF37]">{section.title}</h5>
            <div className="mt-3 grid gap-2">
              {section.fields.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-blue-50 bg-blue-50/35 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    {String(value || "").trim() && String(value) !== "-" ? (
                      <button
                        type="button"
                        onClick={() => copyText(String(value))}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-blue-100 bg-white text-blue-700"
                        aria-label={`Copy ${label}`}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    ) : null}
                  </div>
                  <p dir="auto" className="mt-1 whitespace-pre-wrap break-words text-xs font-black leading-5 text-slate-950">
                    {value || "-"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function LedgerRowDetailsModal({
  row,
  progress,
  onClose,
  onOpenPdf,
  onUploadPdf,
  onUploadMedia,
  onOpenMedia,
  onRenameMedia,
  onDeleteMedia,
}: {
  row: LedgerEntry & { sNo: number; balanceUsd: number }
  progress: Record<string, number>
  onClose: () => void
  onOpenPdf: (row: LedgerEntry, kind?: "bol" | "status") => void
  onUploadPdf: (entryId: string, file: File | undefined, kind?: "bol" | "status") => void
  onUploadMedia: (files: FileList | File[]) => void
  onOpenMedia: (index: number) => void
  onRenameMedia: (mediaId: string) => void
  onDeleteMedia: (mediaId: string) => void
}) {
  const sections = buildLedgerDetailSections(row)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[61] flex items-center justify-center bg-slate-950/62 p-3 backdrop-blur-xl md:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Ledger row ${row.sNo} details`}
          className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/75 bg-white/92 shadow-[0_34px_110px_rgba(15,23,42,.34)] backdrop-blur-2xl"
          initial={{ opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
        >
          <header className="shrink-0 border-b border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-amber-50/70 p-4 md:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Ledger Row Details</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black leading-tight text-slate-950 md:text-3xl">Row {row.sNo}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${row.billOfLandingSurrendered ? "bg-sky-100 text-sky-800" : "bg-emerald-50 text-emerald-700"}`}>
                    {row.billOfLandingSurrendered ? "Surrendered B/L" : "Active B/L"}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${balanceToneClass(row.balanceUsd)} bg-white/80 shadow-sm`}>
                    Balance ${formatLedgerMoney(row.balanceUsd)}
                  </span>
                </div>
                <p dir="auto" className="mt-2 line-clamp-2 max-w-4xl text-sm font-bold leading-6 text-slate-600">
                  {row.description || "No shipper / description entered yet."}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white/88 text-slate-700 shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600"
                aria-label="Close ledger row details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_420px]">
              <div className="min-w-0 space-y-4">
                <section className="rounded-[26px] border border-blue-100 bg-white/78 p-4 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.20em] text-[#D4AF37]">Complete Information</p>
                      <h4 className="text-xl font-black text-slate-950">Shipment and account row</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText([row.date, row.invoiceNo, row.billOfLanding, row.containerNo, row.consignee].filter(Boolean).join(" | "))}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-100"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Summary
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {sections.flatMap((section) =>
                      section.fields.map(([label, value]) => (
                        <div key={`${section.title}-${label}`} className={`rounded-[20px] border border-blue-100 bg-white/86 p-3 shadow-sm ${label === "Shipper / Description" ? "md:col-span-2" : ""}`}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
                            {String(value || "").trim() && String(value) !== "-" ? (
                              <button
                                type="button"
                                onClick={() => copyText(String(value))}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                aria-label={`Copy ${label}`}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <p dir="auto" className="mt-2 whitespace-pre-wrap break-words text-sm font-black leading-6 text-slate-950">
                            {value || "-"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-[26px] border border-blue-100 bg-white/78 p-4 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.20em] text-[#D4AF37]">PDF Attachments</p>
                      <h4 className="text-xl font-black text-slate-950">B/L and status files</h4>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <LedgerPdfCard
                      title="B/L PDF"
                      fileName={row.pdfName}
                      uploaded={Boolean(row.pdfUrl || row.pdfDataUrl)}
                      onOpen={() => onOpenPdf(row, "bol")}
                      onUpload={(file) => onUploadPdf(row.id, file, "bol")}
                    />
                    <LedgerPdfCard
                      title="Status PDF"
                      fileName={row.statusPdfName}
                      uploaded={Boolean(row.statusPdfUrl || row.statusPdfDataUrl)}
                      onOpen={() => onOpenPdf(row, "status")}
                      onUpload={(file) => onUploadPdf(row.id, file, "status")}
                    />
                  </div>
                </section>
              </div>

              <aside className="min-w-0 space-y-4">
                <RowMediaGallery
                  row={row}
                  progress={progress}
                  onUpload={onUploadMedia}
                  onOpen={onOpenMedia}
                  onRename={onRenameMedia}
                  onDelete={onDeleteMedia}
                />
              </aside>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

function LedgerPdfCard({
  title,
  fileName,
  uploaded,
  onOpen,
  onUpload,
}: {
  title: string
  fileName?: string
  uploaded: boolean
  onOpen: () => void
  onUpload: (file: File | undefined) => void
}) {
  return (
    <div className="rounded-[22px] border border-blue-100 bg-white/86 p-3 shadow-sm shadow-blue-100/50 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#D4AF37]">{title}</p>
          <p className="mt-1 truncate text-sm font-black text-slate-950">
            {uploaded ? fileName || "PDF uploaded" : "No PDF attached"}
          </p>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${uploaded ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
            {uploaded ? "Ready to view" : "Upload required"}
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
          <FileText className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!uploaded}
          onClick={onOpen}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </button>
        <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-white px-3 text-xs font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50">
          <Upload className="h-3.5 w-3.5" />
          {uploaded ? "Replace" : "Upload"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              onUpload(event.target.files?.[0])
              event.currentTarget.value = ""
            }}
          />
        </label>
      </div>
    </div>
  )
}

function RowMediaGallery({
  row,
  progress,
  onUpload,
  onOpen,
  onRename,
  onDelete,
}: {
  row: LedgerEntry
  progress: Record<string, number>
  onUpload: (files: FileList | File[]) => void
  onOpen: (index: number) => void
  onRename: (mediaId: string) => void
  onDelete: (mediaId: string) => void
}) {
  const media = getEntryMediaFiles(row)
  const activeProgress = Object.entries(progress).filter(([key]) => key.startsWith(`${row.id}-`))
  const totalStorage = media.reduce((sum, item) => sum + Number(item.size || 0), 0)

  return (
    <section className="rounded-[28px] border border-blue-100 bg-white/78 p-4 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.20em] text-[#D4AF37]">Row Gallery</p>
          <h4 className="text-xl font-black text-slate-950">Media for this row</h4>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {media.length} file{media.length === 1 ? "" : "s"} | {formatFileSize(totalStorage)}
          </p>
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-3 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition hover:-translate-y-0.5">
          <Upload className="h-4 w-4" />
          Add Media
          <input
            type="file"
            multiple
            accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a"
            className="hidden"
            onChange={(event) => {
              if (event.target.files) onUpload(event.target.files)
              event.currentTarget.value = ""
            }}
          />
        </label>
      </div>

      <MediaUploadBox onUpload={onUpload} />

      {activeProgress.length ? (
        <div className="mt-3 space-y-2">
          {activeProgress.map(([key, value]) => (
            <div key={key} className="rounded-2xl border border-blue-100 bg-blue-50/70 p-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-black text-blue-700">
                <span>Uploading</span>
                <span>{value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-sky-400 transition-all" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {media.length ? (
        <div className="mt-4 grid max-h-[46vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {media.map((item, index) => (
            <article key={item.id} className="group overflow-hidden rounded-[22px] border border-blue-100 bg-white/90 shadow-sm shadow-blue-100/50 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-100">
              <button
                type="button"
                onClick={() => onOpen(index)}
                className="block h-32 w-full overflow-hidden bg-slate-100 text-left"
              >
                <MediaThumb item={item} />
              </button>
              <div className="space-y-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-950" title={item.name}>
                    {item.name}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                    {item.kind.toUpperCase()} | {formatFileSize(item.size || 0)} | {new Date(item.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onOpen(index)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50 text-[10px] font-black text-blue-700 transition hover:bg-blue-100"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => onRename(item.id)}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Delete this media file from the row gallery?")) onDelete(item.id)
                    }}
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-xl border border-red-100 bg-red-50 text-[10px] font-black text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] border border-dashed border-blue-200 bg-blue-50/60 p-6 text-center">
          <Images className="mx-auto h-9 w-9 text-blue-500" />
          <p className="mt-3 text-sm font-black text-slate-950">No media uploaded for this row yet.</p>
          <p className="mt-1 text-xs font-bold text-slate-500">Drop images, videos, or voice messages here, or use Add Media.</p>
        </div>
      )}
    </section>
  )
}

function MediaUploadBox({ onUpload }: { onUpload: (files: FileList | File[]) => void }) {
  return (
    <label
      className="flex min-h-[96px] cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 via-white/70 to-amber-50/70 p-4 text-center shadow-inner transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onUpload(event.dataTransfer.files)
      }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
        <Upload className="h-5 w-5" />
      </div>
      <p className="mt-2 text-sm font-black text-slate-950">Drag and drop row media</p>
      <p className="text-xs font-bold text-slate-500">Images, videos, and voice messages</p>
      <input
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg,.m4a"
        className="hidden"
        onChange={(event) => {
          if (event.target.files) onUpload(event.target.files)
          event.currentTarget.value = ""
        }}
      />
    </label>
  )
}


