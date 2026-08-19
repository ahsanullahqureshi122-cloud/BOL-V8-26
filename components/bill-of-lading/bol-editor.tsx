"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { A4Preview } from "./a4-preview"
import PrintSafeBOL from "./print-safe-bol"
import { BillOfLadingFormData, initialFormData, RouteStop, AFGHANISTAN_DOCUMENT_OPTIONS, DOCUMENT_CATEGORIES, AfghanistanDocumentDetail, type DocumentCategory, NOTE_THEMES, type NoteTheme } from "@/lib/types/bill-of-lading"
import consigneeSeedData from "@/lib/data/consignees-from-pdf.json"
import shipperSeedData from "@/lib/data/shippers-from-pdf.json"
import notifyPartySeedData from "@/lib/data/notify-parties-from-pdf.json"
import { Printer, Save, FileText, Eye, Plus, Loader2, Calendar, Truck, MapPin, Trash2, ArrowRight, Package, Edit3, ImageIcon, Upload, RotateCcw, ScrollText, Check, Download, Building2, Phone, Mail, Ship, Plane, Train, AlertCircle, User, Bell, Globe, Shield, Leaf, Heart, Scale, Bookmark, IdCard, Car, Landmark, ShieldCheck, Receipt, List, ChevronDown, ChevronUp, Info, CheckCircle2, Circle, Sparkles, Copy, Box } from "lucide-react"
import { formatPersianDate, getDualDates } from "@/lib/utils/persian-date"
import {
  generateBOLPDFBlob,
  uploadPDFToServer,
  savePDFToDevice,
  openPDFPrintWindow,
  printPDFBlobInWindow,
} from "@/lib/utils/pdf-upload"
import { SavedDocuments } from "./saved-documents"
import { LedgerView } from "@/components/ledger-view"
import { PrintOptionsDialog, type PrintOptions } from "@/components/print-options-dialog"

interface BOLEditorProps {
  onSave?: (data: BillOfLadingFormData) => void
  onRefreshDocuments?: () => void
  loadDocumentId?: string | null
  onDocumentLoaded?: () => void
  savedDocumentsPanel?: ReactNode
  accountLedgerPanel?: ReactNode
}

interface SavedParty {
  id: string
  name: string
  address: string
  contact: string
  email: string
  savedAt: string
}

function PrintPreviewPortal({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const existing = document.getElementById("bol-print-preview-root") as HTMLDivElement | null
    const root = existing || document.createElement("div")

    root.id = "bol-print-preview-root"
    root.dataset.printRoot = "true"
    root.style.position = "fixed"
    root.style.top = "0"
    root.style.left = "0"
    root.style.width = "100%"
    root.style.height = "100%"
    root.style.zIndex = "2147483646"
    root.style.pointerEvents = "none"
    document.body.appendChild(root)
    setContainer(root)

    return () => {
      if (!existing && root.parentElement === document.body) {
        document.body.removeChild(root)
      }
    }
  }, [])

  if (!container) return null
  return createPortal(children, container)
}

const SAVED_SHIPPERS_STORAGE_KEY = "sky-bol-saved-shippers"
const SAVED_CONSIGNEES_STORAGE_KEY = "sky-bol-saved-consignees"
const SAVED_NOTIFY_PARTIES_STORAGE_KEY = "sky-bol-saved-notify-parties"
const SAVED_NOTES_1_STORAGE_KEY = "sky-bol-saved-notes-1"
const SAVED_NOTES_2_STORAGE_KEY = "sky-bol-saved-notes-2"
const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"
const ACCOUNT_LEDGER_STORAGE_KEY = "sky-bol-company-ledgers"
const SHIPPER_SEED_LIST = shipperSeedData as SavedParty[]
const CONSIGNEE_SEED_LIST = consigneeSeedData as SavedParty[]
const NOTIFY_PARTY_SEED_LIST = notifyPartySeedData as SavedParty[]

interface SavedNoteOption {
  id: string
  label: string
  content: string
  theme?: "red" | "blue" | "green" | "purple" | "orange" | "gray"
  savedAt?: string
}

const NOTE_1_SEED_LIST: SavedNoteOption[] = [
  {
    id: "n1-yaramel",
    label: "دکندهار بارگیری مسؤول",
    content: "نظرمحمد (یارمل) - (+93) 0 700 203 307",
    theme: "red",
  },
  {
    id: "n1-loading-contact",
    label: "Loading Contact / مسئول بارگیری",
    content: "نظرمحمد (یارمل) - (+93) 0 700 203 307",
    theme: "blue",
  },
  {
    id: "n1-exporter-contact",
    label: "Exporter Contact / تماس صادرکننده",
    content: "+93 700 939 365 / +93 711 435 529",
    theme: "green",
  },
  {
    id: "n1-border-rep",
    label: "Border Representative / نماینده مرزی",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "purple",
  },
]

const NOTE_2_SEED_LIST: SavedNoteOption[] = [
  {
    id: "n2-border-rep",
    label: "Border Representative / نماینده مرزی",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "purple",
  },
  {
    id: "n2-representatives",
    label: "نماینده نمبرونه",
    content: "اسلام قلعه نمبرونه | نماینده دوغارون / شماره تماس\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "red",
  },
  {
    id: "n2-clearance",
    label: "Customs Clearance / امور گمرکی",
    content: "نماینده دوغارون و اسلام قلعه\nحاجی معلم صاحب : 0799007371 , عصمت الله : 0729807676 , حکمت الله :0794983011",
    theme: "blue",
  },
]

function mergeSavedNoteOptions(seedOptions: SavedNoteOption[], storedOptions: SavedNoteOption[]) {
  const byId = new Map<string, SavedNoteOption>()
  storedOptions.forEach((item) => byId.set(item.id, item))
  seedOptions.forEach((seed) => {
    const existing = byId.get(seed.id)
    if (!existing) {
      byId.set(seed.id, seed)
    } else {
      byId.set(seed.id, {
        ...existing,
        label: seed.label,
        content: seed.content,
        theme: seed.theme || existing.theme,
      })
    }
  })
  return Array.from(byId.values())
}

interface AccountLedgerEntry {
  id: string
  date: string
  description: string
  invoiceNo: string
  shipDate: string
  barnamehNo?: string
  bolNo: string
  truckNo?: string
  containerNo: string
  consignee: string
  quantity: string
  driverRent?: string
  driverFreight?: string
  debit: string
  credit: string
  pdfFile?: string
}

type AccountLedgerRecords = Record<string, AccountLedgerEntry[]>

const accountCompanyKey = (companyName: string) => companyName.trim().toLowerCase()
const getInvoiceNoFromDescription = (description?: string | null) => {
  const text = description || ""
  const match = text.match(/invoice\s*(?:no|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9/_-]*)/i)
  return match?.[1]?.trim() || ""
}

function mergeSavedParties(seedParties: SavedParty[], storedParties: SavedParty[]) {
  const byName = new Map<string, SavedParty>()

  for (const party of seedParties) {
    byName.set(party.name.trim().toLowerCase(), party)
  }

  for (const party of storedParties) {
    byName.set(party.name.trim().toLowerCase(), party)
  }

  const usedIds = new Map<string, number>()

  return Array.from(byName.values())
    .filter((party) => party.name.trim())
    .map((party) => {
      const baseId = party.id?.trim() || `saved-party-${party.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      const count = usedIds.get(baseId) || 0
      usedIds.set(baseId, count + 1)

      if (count === 0) {
        return { ...party, id: baseId }
      }

      return {
        ...party,
        id: `${baseId}-${count + 1}`,
      }
    })
}

function syncBolToAccountLedger(data: BillOfLadingFormData & { bol_number?: string }) {
  const shipperName = data.shipper_name?.trim()
  const bolNo = data.bol_number?.trim()

  if (!shipperName || !bolNo) return

  const companyKey = accountCompanyKey(shipperName)
  const storedCompanies = JSON.parse(
    window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY) ||
    window.localStorage.getItem("skybol:account-custom-companies") ||
    "[]"
  ) as string[]
  const hasCompany = storedCompanies.some((companyName) => accountCompanyKey(companyName) === companyKey)

  const updatedCompanies = hasCompany ? storedCompanies : [...storedCompanies, shipperName]
  if (!hasCompany) {
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify(updatedCompanies))
    window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(updatedCompanies))
    window.dispatchEvent(new CustomEvent("skybol:account-company-updated", { detail: { companyName: shipperName } }))
  }

  const rawRecords = window.localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY) || window.localStorage.getItem("skybol:account-ledgers") || "{}"
  const records = JSON.parse(rawRecords) as AccountLedgerRecords
  const existingRow = Object.values(records)
    .flat()
    .find((row) => (row.barnamehNo && row.barnamehNo.trim() === bolNo) || (row.bolNo && row.bolNo.trim() === bolNo))
  
  const driverRentVal = data.driver_rent?.trim() || ""
  const nextRow: AccountLedgerEntry = {
    id: existingRow?.id || crypto.randomUUID(),
    date: existingRow?.date || data.issue_date || new Date().toISOString().split("T")[0],
    description: shipperName,
    invoiceNo: getInvoiceNoFromDescription(data.cargo_description),
    shipDate: existingRow?.shipDate || data.issue_date || "",
    barnamehNo: bolNo,
    bolNo: bolNo,
    truckNo: data.truck_number || "",
    containerNo: data.container_numbers || "",
    consignee: data.consignee_name || "",
    quantity: data.number_of_packages || "",
    driverRent: driverRentVal,
    driverFreight: driverRentVal,
    debit: existingRow?.debit || "",
    credit: existingRow?.credit || "",
    pdfFile: existingRow?.pdfFile || "",
  }

  const nextRecords = Object.fromEntries(
    Object.entries(records).map(([key, rows]) => [
      key, 
      rows.filter((row) => (row.barnamehNo || row.bolNo || "").trim() !== bolNo)
    ])
  ) as AccountLedgerRecords

  const companyRows = nextRecords[companyKey] || []
  nextRecords[companyKey] = [nextRow, ...companyRows]

  window.localStorage.setItem(ACCOUNT_LEDGER_STORAGE_KEY, JSON.stringify(nextRecords))
  window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(nextRecords))

  // Sync to backend account ledgers API
  fetch("/api/account-ledgers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      accounts: updatedCompanies,
      ledgerEntries: nextRecords,
    }),
  }).catch((err) => console.warn("Background ledger sync to API:", err))

  window.dispatchEvent(
    new CustomEvent("skybol:account-ledger-updated", {
      detail: { companyName: shipperName, bolNo },
    })
  )
}

export function BOLEditor({ onSave, onRefreshDocuments, loadDocumentId, onDocumentLoaded, savedDocumentsPanel, accountLedgerPanel }: BOLEditorProps) {
  const [formData, setFormData] = useState<BillOfLadingFormData>(initialFormData)
  const [bolNumber, setBolNumber] = useState<string>("BOL-2026-NSA470")
  const [isEditingBolNumber, setIsEditingBolNumber] = useState(false)
  const [issueDate, setIssueDate] = useState<string>("")
  const [persianDate, setPersianDate] = useState<string>("")
  const [persianDateNumeric, setPersianDateNumeric] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("form")
  const [logoUrl, setLogoUrl] = useState<string>("/images/logo.png")
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [companyName, setCompanyName] = useState("SKY ARIANA & BALAM BAR BARAN")
  const [companyNamePersian, setCompanyNamePersian] = useState("شرکت حمل و نقل بین المللی")
  const [companySubtitle, setCompanySubtitle] = useState("Import & Export - International Transportation")
  const [companyPhone, setCompanyPhone] = useState("+93 700 939 365, +93 711 435 529")
  const [companyEmail, setCompanyEmail] = useState("info@skyariana.com, transport@skyariana.com")
  const [companyAddress, setCompanyAddress] = useState("2nd Floor, 16 No. Office, Shahidano, Chowk, Etimad Rahmi Market, Kandahar, Afghanistan")
  const [companyLicence, setCompanyLicence] = useState("2401-2198")
  const [bgImageUrl, setBgImageUrl] = useState<string>("/images/afghan_mountain_blueprint_bg.jpg")
  const [bgOpacity, setBgOpacity] = useState<number>(0.22)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null)
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null)
  const [showLocationDropdown, setShowLocationDropdown] = useState<number | null>(null)
  const [selectedCountryFilter, setSelectedCountryFilter] = useState("ALL")
  const [savedShippers, setSavedShippers] = useState<SavedParty[]>([])
  const [selectedShipperId, setSelectedShipperId] = useState<string>("")
  const [savedConsignees, setSavedConsignees] = useState<SavedParty[]>([])
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string>("")
  const [savedNotifyParties, setSavedNotifyParties] = useState<SavedParty[]>([])
  const [selectedNotifyPartyId, setSelectedNotifyPartyId] = useState<string>("")
  const [savedNotes1, setSavedNotes1] = useState<SavedNoteOption[]>([])
  const [selectedNote1Id, setSelectedNote1Id] = useState<string>("")
  const [savedNotes2, setSavedNotes2] = useState<SavedNoteOption[]>([])
  const [selectedNote2Id, setSelectedNote2Id] = useState<string>("")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [activePrintOptions, setActivePrintOptions] = useState<PrintOptions>({
    copies: 1,
    quality: "standard",
    includeColorStrip: true,
    fitToPage: true,
  })

  // Fetch next BOL number on mount and set dates
  useEffect(() => {
    fetchNextBolNumber()
    const today = new Date().toISOString().split("T")[0]
    setIssueDate(today)
    const dualDates = getDualDates(today)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
    }
  }, [])

  useEffect(() => {
    try {
      const storedShippers = JSON.parse(window.localStorage.getItem(SAVED_SHIPPERS_STORAGE_KEY) || "[]")
      const storedConsignees = JSON.parse(window.localStorage.getItem(SAVED_CONSIGNEES_STORAGE_KEY) || "[]")
      const storedNotifyParties = JSON.parse(window.localStorage.getItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY) || "[]")
      const storedNotes1 = JSON.parse(window.localStorage.getItem(SAVED_NOTES_1_STORAGE_KEY) || "[]")
      const storedNotes2 = JSON.parse(window.localStorage.getItem(SAVED_NOTES_2_STORAGE_KEY) || "[]")

      const mergedShippers = mergeSavedParties(SHIPPER_SEED_LIST, storedShippers)
      const mergedConsignees = mergeSavedParties(CONSIGNEE_SEED_LIST, storedConsignees)
      const mergedNotifyParties = mergeSavedParties(NOTIFY_PARTY_SEED_LIST, storedNotifyParties)
      const mergedNotes1 = mergeSavedNoteOptions(NOTE_1_SEED_LIST, storedNotes1)
      const mergedNotes2 = mergeSavedNoteOptions(NOTE_2_SEED_LIST, storedNotes2)

      setSavedShippers(mergedShippers)
      setSavedConsignees(mergedConsignees)
      setSavedNotifyParties(mergedNotifyParties)
      setSavedNotes1(mergedNotes1)
      setSavedNotes2(mergedNotes2)

      window.localStorage.setItem(SAVED_SHIPPERS_STORAGE_KEY, JSON.stringify(mergedShippers))
      window.localStorage.setItem(SAVED_CONSIGNEES_STORAGE_KEY, JSON.stringify(mergedConsignees))
      window.localStorage.setItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY, JSON.stringify(mergedNotifyParties))
      window.localStorage.setItem(SAVED_NOTES_1_STORAGE_KEY, JSON.stringify(mergedNotes1))
      window.localStorage.setItem(SAVED_NOTES_2_STORAGE_KEY, JSON.stringify(mergedNotes2))
    } catch (error) {
      console.error("[v0] Error loading saved parties:", error)
    }
  }, [])

  // Load document when loadDocumentId changes
  useEffect(() => {
    if (loadDocumentId) {
      loadDocument(loadDocumentId)
    }
  }, [loadDocumentId])

  const loadDocument = async (id: string) => {
    setIsLoading(true)
    try {
      let doc: any = null
      try {
        const response = await fetch(`/api/bol/${id}`)
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            doc = result.data
          }
        }
      } catch (err) {
        console.warn("Server document fetch failed, trying local storage fallback:", err)
      }

      if (!doc) {
        try {
          const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
          if (storedLocal) {
            const clientLocalDocs: any[] = JSON.parse(storedLocal)
            doc = clientLocalDocs.find((d) => d.id === id || d.bol_number === id)
          }
        } catch (e) {
          console.error("Error reading browser local document fallback:", e)
        }
      }

      if (doc) {
        setBolNumber(doc.bol_number || "")
        setIssueDate(doc.issue_date || new Date().toISOString().split("T")[0])
        setEditDocumentId(doc.id || id)
        setIsEditMode(true)
        const dualDates = getDualDates(doc.issue_date || new Date().toISOString().split("T")[0])
        if (dualDates) {
          setPersianDate(dualDates.persian)
          setPersianDateNumeric(formatPersianDate(doc.issue_date) ?? dualDates.persianNumeric)
        }
        setFormData({
          truck_number: doc.truck_number || "",
          driver_name: doc.driver_name || "",
          driver_father_name: doc.driver_father_name || "",
          driver_contact: doc.driver_contact || "",
          driver_rent: doc.driver_rent || "",
          routes: doc.routes || initialFormData.routes,
          container_type: doc.container_type || "",
          container_size: doc.container_size || "",
          container_numbers: doc.container_numbers || "",
          seal_numbers: doc.seal_numbers || "",
          shipper_name: doc.shipper_name || "",
          shipper_address: doc.shipper_address || "",
          shipper_contact: doc.shipper_contact || "",
          shipper_email: doc.shipper_email || "",
          consignee_name: doc.consignee_name || "",
          consignee_address: doc.consignee_address || "",
          consignee_contact: doc.consignee_contact || "",
          consignee_email: doc.consignee_email || "",
          notify_party: doc.notify_party || "",
          notify_party_address: doc.notify_party_address || "",
          vessel_name: doc.vessel_name || "",
          voyage_number: doc.voyage_number || "",
          port_of_loading: doc.port_of_loading || "",
          port_of_discharge: doc.port_of_discharge || "",
          place_of_delivery: doc.place_of_delivery || "",
          cargo_description: doc.cargo_description || initialFormData.cargo_description,
          net_weight: doc.net_weight || "",
          gross_weight: doc.gross_weight || "",
          measurement: doc.measurement || "",
          number_of_packages: doc.number_of_packages || "",
          kgs_per_carton: doc.kgs_per_carton || "",
          gross_weight_per_carton: doc.gross_weight_per_carton || "",
          rate_per_kgs: doc.rate_per_kgs || "",
          goods_value: doc.goods_value || "",
          freight_payable_at: doc.freight_payable_at || "",
          freight_terms: doc.freight_terms || "",
          remarks: doc.remarks || "",
          notes_1: doc.notes_1 || initialFormData.notes_1,
          notes_1_label: doc.notes_1_label || initialFormData.notes_1_label,
          notes_1_theme: doc.notes_1_theme || initialFormData.notes_1_theme,
          notes_2: doc.notes_2 || initialFormData.notes_2,
          notes_2_label: doc.notes_2_label || initialFormData.notes_2_label,
          notes_2_theme: doc.notes_2_theme || initialFormData.notes_2_theme,
          afghanistan_documents: doc.afghanistan_documents || [],
          afghanistan_document_details: doc.afghanistan_document_details || {},
        })
        onDocumentLoaded?.()
      } else {
        toast.error("Unable to load document data")
      }
    } catch (error) {
      console.error("[v0] Error loading document:", error)
      toast.error("Failed to load document")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNextBolNumber = async () => {
    setIsLoading(true)
    try {
      let maxLocalSuffix = 0
      try {
        const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
        const localDocs: any[] = storedLocal ? JSON.parse(storedLocal) : []
        for (const doc of localDocs) {
          const numStr = doc.bol_number || doc.id || ""
          const match = numStr.match(/NSA(\d+)/i) || numStr.match(/(\d+)\s*$/)
          if (match && match[1]) {
            const val = parseInt(match[1], 10)
            if (!isNaN(val) && val > maxLocalSuffix) maxLocalSuffix = val
          }
        }
      } catch (e) {
        console.error("Error reading browser docs for sequence:", e)
      }

      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      
      let serverSuffix = 0
      if (result.bolNumber) {
        const serverMatch = result.bolNumber.match(/NSA(\d+)/i) || result.bolNumber.match(/(\d+)\s*$/)
        if (serverMatch && serverMatch[1]) {
          serverSuffix = parseInt(serverMatch[1], 10) || 0
        }
      }

      const currentYear = new Date().getFullYear()
      const nextSeq = Math.max(470, maxLocalSuffix + 1, serverSuffix)
      const formattedNextBol = `BOL-${currentYear}-NSA${String(nextSeq).padStart(3, "0")}`
      setBolNumber(formattedNextBol)
    } catch (error) {
      console.error("Error fetching BOL number:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value }

      if (name === "number_of_packages" || name === "kgs_per_carton") {
        const packageCount = parseNumericValue(
          name === "number_of_packages" ? value : next.number_of_packages
        )
        const kgsPerCarton = parseNumericValue(
          name === "kgs_per_carton" ? value : next.kgs_per_carton
        )

        if (packageCount !== null && kgsPerCarton !== null) {
          next.net_weight = `${formatWeightValue(packageCount * kgsPerCarton)} KG`
        }
      }

      if (name === "number_of_packages" || name === "gross_weight_per_carton") {
        const packageCount = parseNumericValue(
          name === "number_of_packages" ? value : next.number_of_packages
        )
        const grossWeightPerCarton = parseNumericValue(
          name === "gross_weight_per_carton" ? value : next.gross_weight_per_carton
        )

        if (packageCount !== null && grossWeightPerCarton !== null) {
          next.gross_weight = `${formatWeightValue(packageCount * grossWeightPerCarton)} KG`
        }
      }

      if (name === "rate_per_kgs" || name === "net_weight" || name === "number_of_packages" || name === "kgs_per_carton") {
        const ratePerKgs = parseNumericValue(
          name === "rate_per_kgs" ? value : next.rate_per_kgs
        )
        const netWeight = parseNumericValue(
          name === "net_weight" ? value : next.net_weight
        )

        if (ratePerKgs !== null && netWeight !== null) {
          next.goods_value = formatUsdValue(ratePerKgs * netWeight)
        }
      }

      return next
    })
  }

  const parseNumericValue = (value: string): number | null => {
    const cleaned = value.replace(/,/g, "").match(/-?\d*\.?\d+/)?.[0]
    if (!cleaned) return null

    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }

  const formatWeightValue = (value: number): string => {
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toLocaleString("en-US", { maximumFractionDigits: 2 })
  }

  const formatUsdValue = (value: number): string => {
    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} USD`
  }

  const persistSavedParties = (
    storageKey: string,
    parties: SavedParty[],
    setParties: React.Dispatch<React.SetStateAction<SavedParty[]>>
  ) => {
    setParties(parties)
    window.localStorage.setItem(storageKey, JSON.stringify(parties))
  }

  const applySavedNote1 = (id: string) => {
    const found = savedNotes1.find((n) => n.id === id)
    if (!found) return
    setSelectedNote1Id(id)
    setFormData((prev) => ({
      ...prev,
      notes_1_label: found.label,
      notes_1: found.content,
      notes_1_theme: found.theme || prev.notes_1_theme || "red",
    }))
    toast.success("Applied saved option to Note 1")
  }

  const saveCurrentNote1 = () => {
    const label = (formData.notes_1_label || "").trim() || "Note 1"
    const content = (formData.notes_1 || "").trim()
    if (!content) {
      toast.error("Enter Note 1 content first")
      return
    }

    const existingMatch = savedNotes1.find((n) => n.id === selectedNote1Id || (n.label === label && n.content === content))
    const currentNote: SavedNoteOption = {
      id: existingMatch ? existingMatch.id : `n1-${Date.now()}`,
      label,
      content,
      theme: formData.notes_1_theme || "red",
      savedAt: new Date().toISOString(),
    }
    const nextList = [currentNote, ...savedNotes1.filter((n) => n.id !== currentNote.id)]
    setSavedNotes1(nextList)
    setSelectedNote1Id(currentNote.id)
    window.localStorage.setItem(SAVED_NOTES_1_STORAGE_KEY, JSON.stringify(nextList))
    toast.success("Saved Note 1 option", { description: `"${label}" added to options` })
  }

  const deleteSavedNote1 = () => {
    if (!selectedNote1Id) return
    const nextList = savedNotes1.filter((n) => n.id !== selectedNote1Id)
    setSavedNotes1(nextList)
    setSelectedNote1Id("")
    window.localStorage.setItem(SAVED_NOTES_1_STORAGE_KEY, JSON.stringify(nextList))
    toast.success("Saved Note 1 option deleted")
  }

  const applySavedNote2 = (id: string) => {
    const found = savedNotes2.find((n) => n.id === id)
    if (!found) return
    setSelectedNote2Id(id)
    setFormData((prev) => ({
      ...prev,
      notes_2_label: found.label,
      notes_2: found.content,
      notes_2_theme: found.theme || prev.notes_2_theme || "green",
    }))
    toast.success("Applied saved option to Note 2")
  }

  const saveCurrentNote2 = () => {
    const label = (formData.notes_2_label || "").trim() || "Note 2"
    const content = (formData.notes_2 || "").trim()
    if (!content) {
      toast.error("Enter Note 2 content first")
      return
    }

    const existingMatch = savedNotes2.find((n) => n.id === selectedNote2Id || (n.label === label && n.content === content))
    const currentNote: SavedNoteOption = {
      id: existingMatch ? existingMatch.id : `n2-${Date.now()}`,
      label,
      content,
      theme: formData.notes_2_theme || "green",
      savedAt: new Date().toISOString(),
    }
    const nextList = [currentNote, ...savedNotes2.filter((n) => n.id !== currentNote.id)]
    setSavedNotes2(nextList)
    setSelectedNote2Id(currentNote.id)
    window.localStorage.setItem(SAVED_NOTES_2_STORAGE_KEY, JSON.stringify(nextList))
    toast.success("Saved Note 2 option", { description: `"${label}" added to options` })
  }

  const deleteSavedNote2 = () => {
    if (!selectedNote2Id) return
    const nextList = savedNotes2.filter((n) => n.id !== selectedNote2Id)
    setSavedNotes2(nextList)
    setSelectedNote2Id("")
    window.localStorage.setItem(SAVED_NOTES_2_STORAGE_KEY, JSON.stringify(nextList))
    toast.success("Saved Note 2 option deleted")
  }

  const saveCurrentShipper = () => {
    const shipperName = formData.shipper_name.trim()
    if (!shipperName) {
      toast.error("Add shipper name first", {
        description: "Enter a shipper name before saving it.",
      })
      return
    }

    const existingMatch = savedShippers.find(
      (s) => s.name.trim().toLowerCase() === shipperName.toLowerCase() || (selectedShipperId && s.id === selectedShipperId && s.name.trim().toLowerCase() === shipperName.toLowerCase())
    )

    const currentShipper: SavedParty = {
      id: existingMatch ? existingMatch.id : crypto.randomUUID(),
      name: shipperName,
      address: (formData.shipper_address || "").trim(),
      contact: (formData.shipper_contact || "").trim(),
      email: (formData.shipper_email || "").trim(),
      savedAt: new Date().toISOString(),
    }

    const nextShippers = [
      currentShipper,
      ...savedShippers.filter((s) => s.id !== currentShipper.id && s.name.trim().toLowerCase() !== shipperName.toLowerCase()),
    ].slice(0, 100)

    persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, nextShippers, setSavedShippers)
    setSelectedShipperId(currentShipper.id)
    toast.success("Shipper saved successfully!", {
      description: `${currentShipper.name} is stored in saved shippers options.`,
    })
  }

  const applySavedShipper = (shipperId: string) => {
    const shipper = savedShippers.find((item) => item.id === shipperId)
    if (!shipper) return

    setSelectedShipperId(shipperId)
    setFormData((prev) => ({
      ...prev,
      shipper_name: shipper.name || prev.shipper_name,
      shipper_address: shipper.address || "",
      shipper_contact: shipper.contact || "",
      shipper_email: shipper.email || "",
    }))
    toast.success(`Loaded Shipper: ${shipper.name}`)
  }

  const deleteSavedShipper = () => {
    if (!selectedShipperId) return

    const shipper = savedShippers.find((item) => item.id === selectedShipperId)
    persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, savedShippers.filter((item) => item.id !== selectedShipperId), setSavedShippers)
    setSelectedShipperId("")
    toast.success("Saved shipper removed", {
      description: shipper?.name || "The shipper was removed from saved shippers.",
    })
  }

  const saveCurrentConsignee = () => {
    const consigneeName = formData.consignee_name.trim()
    if (!consigneeName) {
      toast.error("Add consignee name first", {
        description: "Enter a consignee name before saving it.",
      })
      return
    }

    const existingMatch = savedConsignees.find(
      (c) => c.name.trim().toLowerCase() === consigneeName.toLowerCase() || (selectedConsigneeId && c.id === selectedConsigneeId && c.name.trim().toLowerCase() === consigneeName.toLowerCase())
    )

    const currentConsignee: SavedParty = {
      id: existingMatch ? existingMatch.id : crypto.randomUUID(),
      name: consigneeName,
      address: (formData.consignee_address || "").trim(),
      contact: (formData.consignee_contact || "").trim(),
      email: (formData.consignee_email || "").trim(),
      savedAt: new Date().toISOString(),
    }

    const nextConsignees = [
      currentConsignee,
      ...savedConsignees.filter((c) => c.id !== currentConsignee.id && c.name.trim().toLowerCase() !== consigneeName.toLowerCase()),
    ].slice(0, 100)

    persistSavedParties(SAVED_CONSIGNEES_STORAGE_KEY, nextConsignees, setSavedConsignees)
    setSelectedConsigneeId(currentConsignee.id)
    toast.success("Consignee saved successfully!", {
      description: `${currentConsignee.name} is stored in saved consignees options.`,
    })
  }

  const applySavedConsignee = (consigneeId: string) => {
    const consignee = savedConsignees.find((item) => item.id === consigneeId)
    if (!consignee) return

    setSelectedConsigneeId(consigneeId)
    setFormData((prev) => ({
      ...prev,
      consignee_name: consignee.name || prev.consignee_name,
      consignee_address: consignee.address || "",
      consignee_contact: consignee.contact || "",
      consignee_email: consignee.email || "",
    }))
    toast.success(`Loaded Consignee: ${consignee.name}`)
  }

  const deleteSavedConsignee = () => {
    if (!selectedConsigneeId) return

    const consignee = savedConsignees.find((item) => item.id === selectedConsigneeId)
    persistSavedParties(
      SAVED_CONSIGNEES_STORAGE_KEY,
      savedConsignees.filter((item) => item.id !== selectedConsigneeId),
      setSavedConsignees
    )
    setSelectedConsigneeId("")
    toast.success("Saved consignee removed", {
      description: consignee?.name || "The consignee was removed from saved consignees.",
    })
  }

  const saveCurrentNotifyParty = () => {
    const notifyPartyName = formData.notify_party.trim()
    if (!notifyPartyName) {
      toast.error("Add notify party name first", {
        description: "Enter a notify party name before saving it.",
      })
      return
    }

    const currentNotifyParty: SavedParty = {
      id: selectedNotifyPartyId || crypto.randomUUID(),
      name: notifyPartyName,
      address: formData.notify_party_address || "",
      contact: "",
      email: "",
      savedAt: new Date().toISOString(),
    }

    const nextNotifyParties = [
      currentNotifyParty,
      ...savedNotifyParties.filter(
        (notifyParty) =>
          notifyParty.id !== currentNotifyParty.id &&
          notifyParty.name.trim().toLowerCase() !== notifyPartyName.toLowerCase()
      ),
    ].slice(0, 50)

    persistSavedParties(SAVED_NOTIFY_PARTIES_STORAGE_KEY, nextNotifyParties, setSavedNotifyParties)
    setSelectedNotifyPartyId(currentNotifyParty.id)
    toast.success("Notify party saved", {
      description: `${currentNotifyParty.name} is available for future BOLs.`,
    })
  }

  const applySavedNotifyParty = (notifyPartyId: string) => {
    const notifyParty = savedNotifyParties.find((item) => item.id === notifyPartyId)
    if (!notifyParty) return

    setSelectedNotifyPartyId(notifyPartyId)
    setFormData((prev) => ({
      ...prev,
      notify_party: notifyParty.name,
      notify_party_address: notifyParty.address,
    }))
  }

  const deleteSavedNotifyParty = () => {
    if (!selectedNotifyPartyId) return

    const notifyParty = savedNotifyParties.find((item) => item.id === selectedNotifyPartyId)
    persistSavedParties(
      SAVED_NOTIFY_PARTIES_STORAGE_KEY,
      savedNotifyParties.filter((item) => item.id !== selectedNotifyPartyId),
      setSavedNotifyParties
    )
    setSelectedNotifyPartyId("")
    toast.success("Saved notify party removed", {
      description: notifyParty?.name || "The notify party was removed from saved notify parties.",
    })
  }

  const NOTE_THEME_BUTTON_CLASSES: Record<string, string> = {
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    gray: 'bg-slate-500',
  }

  // Get theme styles for notes
  const getNoteThemeStyles = (theme: NoteTheme = 'red') => {
    const themes = {
      red: {
        container: 'bg-linear-to-br from-red-50/90 to-white/70 border-red-200/50',
        label: 'text-red-700',
        input: 'border-red-200/60 bg-white/70 focus:border-red-400 focus:ring-red-400/30',
        textarea: 'border-red-200/60 focus:border-red-400 focus:ring-red-400/30 bg-white/70 text-red-900',
      },
      blue: {
        container: 'bg-linear-to-br from-blue-50/90 to-white/70 border-blue-200/50',
        label: 'text-blue-700',
        input: 'border-blue-200/60 bg-white/70 focus:border-blue-400 focus:ring-blue-400/30',
        textarea: 'border-blue-200/60 focus:border-blue-400 focus:ring-blue-400/30 bg-white/70 text-blue-900',
      },
      green: {
        container: 'bg-linear-to-br from-green-50/90 to-white/70 border-green-200/50',
        label: 'text-green-700',
        input: 'border-green-200/60 bg-white/70 focus:border-green-400 focus:ring-green-400/30',
        textarea: 'border-green-200/60 focus:border-green-400 focus:ring-green-400/30 bg-white/70 text-green-900',
      },
      orange: {
        container: 'bg-linear-to-br from-orange-50/90 to-white/70 border-orange-200/50',
        label: 'text-orange-700',
        input: 'border-orange-200/60 bg-white/70 focus:border-orange-400 focus:ring-orange-400/30',
        textarea: 'border-orange-200/60 focus:border-orange-400 focus:ring-orange-400/30 bg-white/70 text-orange-900',
      },
      purple: {
        container: 'bg-linear-to-br from-purple-50/90 to-white/70 border-purple-200/50',
        label: 'text-purple-700',
        input: 'border-purple-200/60 bg-white/70 focus:border-purple-400 focus:ring-purple-400/30',
        textarea: 'border-purple-200/60 focus:border-purple-400 focus:ring-purple-400/30 bg-white/70 text-purple-900',
      },
      gray: {
        container: 'bg-linear-to-br from-gray-50/90 to-white/70 border-gray-200/50',
        label: 'text-gray-700',
        input: 'border-gray-200/60 bg-white/70 focus:border-gray-400 focus:ring-gray-400/30',
        textarea: 'border-gray-200/60 focus:border-gray-400 focus:ring-gray-400/30 bg-white/70 text-gray-900',
      },
    }
    return themes[theme]
  }

  const handleDateChange = (gregorianDate: string) => {
    setIssueDate(gregorianDate)
    const dualDates = getDualDates(gregorianDate)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(gregorianDate) ?? dualDates.persianNumeric)
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setLogoUrl(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetLogo = () => {
    setLogoUrl("/images/logo.png")
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }

  const toggleAfghanistanDocument = (docId: string) => {
    setFormData((prev) => {
      const docs = prev.afghanistan_documents || []
      if (docs.includes(docId)) {
        const newDetails = { ...prev.afghanistan_document_details }
        delete newDetails[docId]
        return { ...prev, afghanistan_documents: docs.filter((d) => d !== docId), afghanistan_document_details: newDetails }
      }
      return { 
        ...prev, 
        afghanistan_documents: [...docs, docId],
        afghanistan_document_details: {
          ...prev.afghanistan_document_details,
          [docId]: { documentNumber: "", dateIssued: "", issuingAuthority: "" }
        }
      }
    })
  }

  const handleDocumentDetailChange = (docId: string, field: keyof AfghanistanDocumentDetail, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      afghanistan_document_details: {
        ...prev.afghanistan_document_details,
        [docId]: {
          ...(prev.afghanistan_document_details?.[docId] || { documentNumber: "", dateIssued: "", issuingAuthority: "" }),
          [field]: value
        }
      }
    }))
  }

  const handleRouteChange = (index: number, field: keyof RouteStop, value: any) => {
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      newRoutes[index] = { ...newRoutes[index], [field]: value }
      return { ...prev, routes: newRoutes }
    })
  }

  const applyHeratIslamQalaDougharounPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        {
          id: crypto.randomUUID(),
          location: "Herat, AF",
          locationPersian: "هرات، افغانستان",
          stopOrder: 1,
          transportMode: "truck",
        },
        {
          id: crypto.randomUUID(),
          location: "Islam Qala, AF",
          locationPersian: "اسلام قلعه، افغانستان",
          stopOrder: 2,
          transportMode: "truck",
          customsSealRequired: true,
          customsSealNote: "📍 په ګمرک کې سیل غواړي / Customs Seal Required",
        },
        {
          id: crypto.randomUUID(),
          location: "Dougharoun, IR",
          locationPersian: "دوغارون، ایران",
          stopOrder: 3,
          transportMode: "truck",
        },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Truck Route Preset", {
      description: "هرات → اسلام قلعه → دوغارون مسیر اضافه شد",
    })
  }

  const applyKandaharNimrozBandarAbbasDubaiIndiaPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Kandahar, AF", locationPersian: "کندهار، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Nimroz, AF", locationPersian: "نیمروز / میلک", stopOrder: 2, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Bandar Abbas, IR", locationPersian: "بندرعباس، ایران", stopOrder: 3, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Nhava Sheva, IN", locationPersian: "نهاوا شوا، هند", stopOrder: 5, transportMode: "vessel" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Afghanistan-India Sea Route", {
      description: "کندهار → نیمروز → بندرعباس → دبی → نهاوا شوا هند مسیر اضافه شد",
    })
  }

  const applyKandaharChamanKarachiDubaiPreset = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        { id: crypto.randomUUID(), location: "Kandahar, AF", locationPersian: "کندهار، افغانستان", stopOrder: 1, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Chaman, PK", locationPersian: "چمن / کویته پاکستان", stopOrder: 2, transportMode: "truck" },
        { id: crypto.randomUUID(), location: "Karachi Port, PK", locationPersian: "بندر کراچی، پاکستان", stopOrder: 3, transportMode: "vessel" },
        { id: crypto.randomUUID(), location: "Dubai, AE", locationPersian: "دبی، امارات", stopOrder: 4, transportMode: "vessel" },
      ],
    }))
    setActiveRouteIndex(0)
    toast.success("Applied Pakistan Transit Route", {
      description: "کندهار → چمن → کراچی → دبی مسیر اضافه شد",
    })
  }

  const addRouteStop = () => {
    setFormData((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: crypto.randomUUID(),
          location: "",
          locationPersian: "",
          stopOrder: prev.routes.length + 1,
        },
      ],
    }))
  }

  const removeRouteStop = (index: number) => {
    if (formData.routes.length <= 2) return // Minimum 2 stops (origin and destination)
    setFormData((prev) => ({
      ...prev,
      routes: prev.routes
        .filter((_, i) => i !== index)
        .map((route, routeIndex) => ({ ...route, stopOrder: routeIndex + 1 })),
    }))
  }

  const getTransportIcon = (mode?: string) => {
    const base = "inline-flex items-center justify-center rounded-md p-1.5"
    switch (mode) {
      case "truck":
        return (
          <span className={`${base} bg-blue-50 text-blue-600`}>
            <Truck className="h-6 w-6" />
          </span>
        )
      case "vessel":
        return (
          <span className={`${base} bg-cyan-50 text-cyan-600`}>
            <Ship className="h-6 w-6" />
          </span>
        )
      case "airplane":
        return (
          <span className={`${base} bg-sky-50 text-sky-600`}>
            <Plane className="h-6 w-6" />
          </span>
        )
      case "train":
        return (
          <span className={`${base} bg-orange-50 text-orange-600`}>
            <Train className="h-6 w-6" />
          </span>
        )
      case "road":
        return (
          <span className={`${base} bg-amber-50 text-amber-600`}>
            <Car className="h-6 w-6" />
          </span>
        )
      default:
        return (
          <span className={`${base} bg-gray-50 text-gray-500`}>
            <MapPin className="h-6 w-6" />
          </span>
        )
    }
  }

  const getTransportLabel = (mode?: string) => {
    switch (mode) {
      case "truck":
        return "Truck / تراک"
      case "vessel":
        return "Vessel / کشتی"
      case "airplane":
        return "Airplane / هواپیما"
      case "train":
        return "Train / قطار"
      case "road":
        return "Road / جاده"
      default:
        return "Select Mode / حالت انتخاب کنید"
    }
  }

  const getRouteStopLabel = (index: number, total: number) => {
    if (index === 0) return "Origin"
    if (index === total - 1) return "Destination"
    return `Stop ${index}`
  }

  const getRouteStopLabelPersian = (index: number, total: number) => {
    if (index === 0) return "مبدا"
    if (index === total - 1) return "مقصد"
    return "توقف"
  }

  const getTransportDetails = (mode?: string) => {
    const details: Record<string, { duration: string; capacity: string; cost: string; notes: string; durationPersian: string; capacityPersian: string; costPersian: string; notesPersian: string }> = {
      truck: {
        duration: "1-3 Days",
        capacity: "20-25 Tons",
        cost: "Low-Medium",
        notes: "Direct, flexible timing",
        durationPersian: "1-3 روز",
        capacityPersian: "20-25 تن",
        costPersian: "پایین-متوسط",
        notesPersian: "مستقیم، زمان بندی انعطاف پذیر"
      },
      vessel: {
        duration: "7-14 Days",
        capacity: "1000+ Tons",
        cost: "Low (Bulk)",
        notes: "Cost-effective for large shipments",
        durationPersian: "7-14 روز",
        capacityPersian: "1000+ تن",
        costPersian: "پایین (بزرگ)",
        notesPersian: "صرفه‌جویی برای حمل‌ونقل بزرگ"
      },
      airplane: {
        duration: "1-2 Days",
        capacity: "50-100 Tons",
        cost: "High",
        notes: "Fastest, premium rates",
        durationPersian: "1-2 روز",
        capacityPersian: "50-100 تن",
        costPersian: "بالا",
        notesPersian: "سریع‌ترین، نرخ بالا"
      },
      train: {
        duration: "3-7 Days",
        capacity: "500+ Tons",
        cost: "Medium",
        notes: "Reliable on established routes",
        durationPersian: "3-7 روز",
        capacityPersian: "500+ تن",
        costPersian: "متوسط",
        notesPersian: "قابل اعتماد در مسیرهای منظم"
      },
      road: {
        duration: "2-5 Days",
        capacity: "15-20 Tons",
        cost: "Medium",
        notes: "Direct delivery by road",
        durationPersian: "2-5 روز",
        capacityPersian: "15-20 تن",
        costPersian: "متوسط",
        notesPersian: "تحویل مستقیم از طریق جاده"
      },
    }
    return details[mode || ""] || { 
      duration: "-", 
      capacity: "-", 
      cost: "-", 
      notes: "-",
      durationPersian: "-",
      capacityPersian: "-",
      costPersian: "-",
      notesPersian: "-"
    }
  }

  // Predefined locations for quick selection
  // Country flag mapping
  const countryFlags: Record<string, string> = {
    "Afghanistan": "🇦🇫",
    "Iran": "🇮🇷",
    "Pakistan": "🇵🇰",
    "UAE": "🇦🇪",
    "Qatar": "🇶🇦",
    "Saudi Arabia": "🇸🇦",
    "Bahrain": "🇧🇭",
    "Oman": "🇴🇲",
    "Kuwait": "🇰🇼",
    "Turkey": "🇹🇷",
    "Turkmenistan": "🇹🇲",
    "Uzbekistan": "🇺🇿",
    "Tajikistan": "🇹🇯",
    "Kyrgyzstan": "🇰🇬",
    "India": "🇮🇳",
    "China": "🇨🇳",
  }

  const predefinedLocations = [
    // Afghanistan - Major Cities & Borders
    { name: "Kandahar, AF", persian: "کندهار، افغانستان", country: "Afghanistan", code: "KDH" },
    { name: "Nimroz, AF", persian: "نیمروز، افغانستان", country: "Afghanistan", code: "NMZ" },
    { name: "Herat, AF", persian: "هرات، افغانستان", country: "Afghanistan", code: "HRA" },
    { name: "Kabul, AF", persian: "کابل، افغانستان", country: "Afghanistan", code: "KBL" },
    { name: "Islam Qala, AF", persian: "اسلام قلعه، افغانستان", country: "Afghanistan", code: "ISQ" },
    { name: "Zaranj, AF", persian: "زرنج، افغانستان", country: "Afghanistan", code: "ZRJ" },
    { name: "Jalalabad, AF", persian: "جلال‌آباد، افغانستان", country: "Afghanistan", code: "JBD" },
    { name: "Mazar-e Sharif, AF", persian: "مزارشریف، افغانستان", country: "Afghanistan", code: "MAZ" },
    { name: "Ghazni, AF", persian: "غزنی، افغانستان", country: "Afghanistan", code: "GHZ" },
    { name: "Kunduz, AF", persian: "کندوز، افغانستان", country: "Afghanistan", code: "KDZ" },
    { name: "Baghlan, AF", persian: "بغلان، افغانستان", country: "Afghanistan", code: "BGH" },
    { name: "Logar, AF", persian: "لوگر، افغانستان", country: "Afghanistan", code: "LOG" },
    { name: "Paktia, AF", persian: "پکتیا، افغانستان", country: "Afghanistan", code: "PKT" },
    { name: "Nangarhar, AF", persian: "ننگرهار، افغانستان", country: "Afghanistan", code: "NGR" },
    { name: "Spin Boldak, AF", persian: "سپین بولدک، افغانستان", country: "Afghanistan", code: "SPB" },
    { name: "Torkham, AF", persian: "تورخم، افغانستان", country: "Afghanistan", code: "THM" },
    { name: "Bamyan, AF", persian: "باميان، افغانستان", country: "Afghanistan", code: "BAM" },
    { name: "Faizabad, AF", persian: "فیض‌آباد، افغانستان", country: "Afghanistan", code: "FAZ" },
    { name: "Mahiroud, AF", persian: "ماهیرود، افغانستان", country: "Afghanistan", code: "MAH" },
    { name: "Taptan, AF", persian: "تپتن، افغانستان", country: "Afghanistan", code: "TAP" },
    
  // Iran - Ports & Major Cities
    { name: "Dougharoun, IR", persian: "دوغارون، ایران", country: "Iran", code: "DGH" },
    { name: "Chabahar, IR", persian: "چابهار، ایران", country: "Iran", code: "CHA" },
    { name: "Bandar Abbas, IR", persian: "بندرعباس، ایران", country: "Iran", code: "BND" },
    { name: "Bandar Lenguh, IR", persian: "بندر لنگه، ایران", country: "Iran", code: "BLG" },
    { name: "Tehran, IR", persian: "تهران، ایران", country: "Iran", code: "TEH" },
    { name: "Mashhad, IR", persian: "مشهد، ایران", country: "Iran", code: "MSH" },
    { name: "Zahedan, IR", persian: "زاهدان، ایران", country: "Iran", code: "ZAH" },
    { name: "Kerman, IR", persian: "کرمان، ایران", country: "Iran", code: "KRM" },
    { name: "Isfahan, IR", persian: "اصفهان، ایران", country: "Iran", code: "ISF" },
    { name: "Tabriz, IR", persian: "تبریز، ایران", country: "Iran", code: "TBZ" },
    { name: "Rasht, IR", persian: "رشت، ایران", country: "Iran", code: "RSH" },
    { name: "Qom, IR", persian: "قم، ایران", country: "Iran", code: "QOM" },
    { name: "Ahvaz, IR", persian: "اهواز، ایران", country: "Iran", code: "AHZ" },
    { name: "Shiraz, IR", persian: "شیراز، ایران", country: "Iran", code: "SHZ" },
    { name: "Hamedan, IR", persian: "همدان، ایران", country: "Iran", code: "HAM" },
    { name: "Ardabil, IR", persian: "اردبیل، ایران", country: "Iran", code: "ARD" },
    { name: "Yazd, IR", persian: "یزد، ایران", country: "Iran", code: "YZD" },
    { name: "Gorgan, IR", persian: "گرگان، ایران", country: "Iran", code: "GRG" },
    { name: "Sari, IR", persian: "ساری، ایران", country: "Iran", code: "SAR" },
    { name: "Abadan, IR", persian: "آبادان، ایران", country: "Iran", code: "ABD" },
    { name: "Bushehr, IR", persian: "بوشهر، ایران", country: "Iran", code: "BSH" },
    { name: "Qazvin, IR", persian: "قزوین، ایران", country: "Iran", code: "QZV" },
    { name: "Khorramshahr, IR", persian: "خرمشهر، ایران", country: "Iran", code: "KHR" },
    { name: "Arak, IR", persian: "اراک، ایران", country: "Iran", code: "ARK" },
    { name: "Urmia, IR", persian: "ارومیه، ایران", country: "Iran", code: "URM" },
    { name: "Sanandaj, IR", persian: "سنندج، ایران", country: "Iran", code: "SND" },
    { name: "Kermanshah, IR", persian: "کرمانشاه، ایران", country: "Iran", code: "KSH" },
    { name: "Karaj, IR", persian: "کرج، ایران", country: "Iran", code: "KRJ" },
    { name: "Birjand, IR", persian: "بیرجند، ایران", country: "Iran", code: "BRJ" },
    { name: "Bojnurd, IR", persian: "بجنورد، ایران", country: "Iran", code: "BJD" },
    { name: "Bandar Imam Khomeini, IR", persian: "بندر امام خمینی، ایران", country: "Iran", code: "BIK" },
    
    // Pakistan - Major Cities & Ports
    { name: "Peshawar, PK", persian: "پشاور، پاکستان", country: "Pakistan", code: "PSH" },
    { name: "Islamabad, PK", persian: "اسلام‌آباد، پاکستان", country: "Pakistan", code: "ISB" },
    { name: "Lahore, PK", persian: "لاهور، پاکستان", country: "Pakistan", code: "LHR" },
    { name: "Karachi, PK", persian: "کراچی، پاکستان", country: "Pakistan", code: "KRC" },
    { name: "Quetta, PK", persian: "کویتہ، پاکستان", country: "Pakistan", code: "QTA" },
    { name: "Torkham, PK", persian: "تورخم، پاکستان", country: "Pakistan", code: "TRK" },
    { name: "Chaman, PK", persian: "چمن، پاکستان", country: "Pakistan", code: "CHM" },
    { name: "Rawalpindi, PK", persian: "راولپندی، پاکستان", country: "Pakistan", code: "RWL" },
    { name: "Multan, PK", persian: "ملتان، پاکستان", country: "Pakistan", code: "MLT" },
    { name: "Faisalabad, PK", persian: "فیصل‌آباد، پاکستان", country: "Pakistan", code: "FSB" },
    { name: "Gwadar, PK", persian: "گوادر، پاکستان", country: "Pakistan", code: "GWD" },
    { name: "Port Qasim, PK", persian: "بندر قاسم، پاکستان", country: "Pakistan", code: "PQS" },
    
    // UAE & Gulf States
    { name: "Dubai, AE", persian: "دبی، امارات", country: "UAE", code: "DXB" },
    { name: "Abu Dhabi, AE", persian: "ابوظبی، امارات", country: "UAE", code: "AUH" },
    { name: "Sharjah, AE", persian: "شارجہ، امارات", country: "UAE", code: "SHJ" },
    { name: "Ajman, AE", persian: "عجمان، امارات", country: "UAE", code: "AJM" },
    { name: "Ras Al Khaimah, AE", persian: "رأس الخیمة، امارات", country: "UAE", code: "RAK" },
    { name: "Fujairah, AE", persian: "فجیرة، امارات", country: "UAE", code: "FJR" },
    { name: "Doha, QA", persian: "دوحه، قطر", country: "Qatar", code: "DOH" },
    { name: "Dammam, SA", persian: "مام، عربستان", country: "Saudi Arabia", code: "DMM" },
    { name: "Jeddah, SA", persian: "جده، عربستان", country: "Saudi Arabia", code: "JED" },
    { name: "Manama, BH", persian: "منامه، بحرین", country: "Bahrain", code: "BAH" },
    { name: "Muscat, OM", persian: "مسقط، عمان", country: "Oman", code: "MCT" },
    { name: "Salalah, OM", persian: "صلاله، عمان", country: "Oman", code: "SLL" },
    { name: "Kuwait City, KW", persian: "کویت سیتی، کویت", country: "Kuwait", code: "KWT" },
    
    // Turkey - Ports & Cities
    { name: "Istanbul, TR", persian: "استانبول، ترکیه", country: "Turkey", code: "IST" },
    { name: "Ankara, TR", persian: "آنکارا، ترکیه", country: "Turkey", code: "ANK" },
    { name: "Izmir, TR", persian: "ازمیر، ترکیه", country: "Turkey", code: "IZM" },
    { name: "Mersin, TR", persian: "مرسین، ترکیه", country: "Turkey", code: "MRS" },
    { name: "Antalya, TR", persian: "آنتالیا، ترکیه", country: "Turkey", code: "ANT" },
    { name: "Trabzon, TR", persian: "تراپزون، ترکیه", country: "Turkey", code: "TRB" },
    { name: "Bursa, TR", persian: "بورسا، ترکیه", country: "Turkey", code: "BRS" },
    { name: "Adana, TR", persian: "آدانا، ترکیه", country: "Turkey", code: "ADA" },
    { name: "Konya, TR", persian: "قونیه، ترکیه", country: "Turkey", code: "KYA" },
    { name: "Gaziantep, TR", persian: "غازی‌عینتاب، ترکیه", country: "Turkey", code: "GZT" },
    { name: "Samsun, TR", persian: "سامسون، ترکیه", country: "Turkey", code: "SAS" },
    { name: "Iskenderun, TR", persian: "اسکندرون، ترکیه", country: "Turkey", code: "ISK" },
    { name: "Kayseri, TR", persian: "قیصریه، ترکیه", country: "Turkey", code: "KAY" },
    { name: "Diyarbakir, TR", persian: "دیاربکر، ترکیه", country: "Turkey", code: "DIY" },
    { name: "Erzurum, TR", persian: "ارزروم، ترکیه", country: "Turkey", code: "ERZ" },
    { name: "Van, TR", persian: "وان، ترکیه", country: "Turkey", code: "VAN" },
    
    // Central Asia
    { name: "Ashgabat, TM", persian: "عشق‌آباد، تركمنستان", country: "Turkmenistan", code: "ASH" },
    { name: "Turkmenbashi, TM", persian: "ترکمن‌باشی، تركمنستان", country: "Turkmenistan", code: "TBH" },
    { name: "Tashkent, UZ", persian: "تاشکند، ازبکستان", country: "Uzbekistan", code: "TSH" },
    { name: "Bukhara, UZ", persian: "بخارا، ازبکستان", country: "Uzbekistan", code: "BKH" },
    { name: "Samarkand, UZ", persian: "سمرقند، ازبکستان", country: "Uzbekistan", code: "SMR" },
    { name: "Dushanbe, TJ", persian: "دوشنبه، تاجیکستان", country: "Tajikistan", code: "DSH" },
    { name: "Khujand, TJ", persian: "خجند، تاجیکستان", country: "Tajikistan", code: "KHJ" },
    { name: "Bishkek, KG", persian: "بیشکک، قرقیزستان", country: "Kyrgyzstan", code: "BSK" },
    
    // India
    { name: "Delhi, IN", persian: "دهلی، هند", country: "India", code: "DEL" },
    { name: "Mumbai, IN", persian: "ممبئی، هند", country: "India", code: "MUM" },
    { name: "Bangalore, IN", persian: "بنگلور، هند", country: "India", code: "BNG" },
    { name: "Chennai, IN", persian: "چنای، هند", country: "India", code: "CHN" },
    { name: "Kolkata, IN", persian: "کلکتہ، هند", country: "India", code: "KOL" },
    { name: "Amritsar, IN", persian: "امریتسر، هند", country: "India", code: "AMR" },
    { name: "Nhava Sheva, IN", persian: "نهاوا شوا، هند", country: "India", code: "NSA" },
    { name: "Hyderabad, IN", persian: "حیدرآباد، هند", country: "India", code: "HYD" },
    { name: "Ahmedabad, IN", persian: "احمدآباد، هند", country: "India", code: "AMD" },
    { name: "Pune, IN", persian: "پونه، هند", country: "India", code: "PNQ" },
    { name: "Surat, IN", persian: "سورت، هند", country: "India", code: "STV" },
    { name: "Jaipur, IN", persian: "جیپور، هند", country: "India", code: "JAI" },
    { name: "Lucknow, IN", persian: "لکھنؤ، هند", country: "India", code: "LKO" },
    { name: "Kandla, IN", persian: "کاندلا، هند", country: "India", code: "KDL" },
    { name: "Mundra, IN", persian: "موندرا، هند", country: "India", code: "MUN" },
    { name: "Visakhapatnam, IN", persian: "ویساکاپاتنام، هند", country: "India", code: "VTZ" },
    { name: "Cochin, IN", persian: "کوچین، هند", country: "India", code: "COK" },
    { name: "Tuticorin, IN", persian: "توتیکورین، هند", country: "India", code: "TUT" },
    { name: "Nagpur, IN", persian: "ناگپور، هند", country: "India", code: "NAG" },
    { name: "Indore, IN", persian: "ایندور، هند", country: "India", code: "IDR" },
    { name: "Bhopal, IN", persian: "بهوپال، هند", country: "India", code: "BHO" },
    { name: "Vadodara, IN", persian: "وادودارا، هند", country: "India", code: "VAD" },
    
    // China
    { name: "Beijing, CN", persian: "پکن، چین", country: "China", code: "PEK" },
    { name: "Shanghai, CN", persian: "شانگهای، چین", country: "China", code: "SHA" },
    { name: "Guangzhou, CN", persian: "گوانجو، چین", country: "China", code: "GZU" },
    { name: "Chongqing, CN", persian: "چونگچینگ، چین", country: "China", code: "CKG" },
    { name: "Xi'an, CN", persian: "کاشغر، چین", country: "China", code: "XIY" },
    { name: "Urumqi, CN", persian: "اورومچی، چین", country: "China", code: "URC" },
    
    // Southeast Asia
    { name: "Bangkok, TH", persian: "بانکوک، تایلند", country: "Thailand", code: "BKK" },
    { name: "Ho Chi Minh City, VN", persian: "هوشی‌مین، ویتنام", country: "Vietnam", code: "SGN" },
    { name: "Hanoi, VN", persian: "هانوی، ویتنام", country: "Vietnam", code: "HAN" },
    { name: "Singapore, SG", persian: "سنگاپور", country: "Singapore", code: "SIN" },
    { name: "Kuala Lumpur, MY", persian: "کوالالامپور، مالزی", country: "Malaysia", code: "KUL" },
    
    // Europe
    { name: "Rotterdam, NL", persian: "روتردام، هلند", country: "Netherlands", code: "RTM" },
    { name: "Hamburg, DE", persian: "هامبورگ، آلمان", country: "Germany", code: "HAM" },
    { name: "London, UK", persian: "لندن، انگریس", country: "United Kingdom", code: "LON" },
    { name: "Barcelona, ES", persian: "بارسلونا، اسپانیا", country: "Spain", code: "BCN" },
    { name: "Venice, IT", persian: "ونیز، ایتالیا", country: "Italy", code: "VCE" },
  ]

  const selectPredefinedLocation = (index: number, location: { name: string; persian: string }) => {
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      newRoutes[index] = { 
        ...newRoutes[index], 
        location: location.name, 
        locationPersian: location.persian 
      }
      return { ...prev, routes: newRoutes }
    })
  }

  const quickLocationQuery =
    activeRouteIndex !== null
      ? formData.routes[activeRouteIndex]?.location.trim().toLowerCase() || ""
      : ""

  const quickLocationMatches = predefinedLocations.filter((loc) => {
    if (selectedCountryFilter !== "ALL" && loc.country !== selectedCountryFilter) {
      return false
    }
    if (!quickLocationQuery) return true

    return [loc.name, loc.persian, loc.country, loc.code]
      .join(" ")
      .toLowerCase()
      .includes(quickLocationQuery)
  })

  const handleQuickLocationSelect = (loc: { name: string; persian: string }) => {
    const targetIndex =
      activeRouteIndex !== null
        ? activeRouteIndex
        : formData.routes.findIndex((route) => !route.location)

    if (targetIndex >= 0) {
      selectPredefinedLocation(targetIndex, loc)
      setActiveRouteIndex(targetIndex)
      return
    }

    setFormData((prev) => ({
      ...prev,
      routes: [
        ...prev.routes,
        {
          id: crypto.randomUUID(),
          location: loc.name,
          locationPersian: loc.persian,
          stopOrder: prev.routes.length + 1,
        },
      ],
    }))
    setActiveRouteIndex(formData.routes.length)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const validEditId = editDocumentId || formData.id || bolNumber
      const method = (isEditMode && validEditId) ? "PUT" : "POST"
      const url = (isEditMode && validEditId) ? `/api/bol/${encodeURIComponent(validEditId)}` : "/api/bol"
      
      // Include the BOL number in the request
      const dataToSend = {
        ...formData,
        bol_number: bolNumber,
        issue_date: issueDate,
      }

      if (!isEditMode) {
        delete dataToSend.id
      }
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      })
      
      if (!response.ok) {
        let errorMessage = "Failed to save document"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = `Server error: ${response.status}`
        }
        toast.error("Failed to save document", {
          description: errorMessage,
        })
        return
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        const savedId = result.data.id || result.data.bol_number || bolNumber
        const savedBolNumber = result.data.bol_number || bolNumber

        // Update form data and switch to edit mode so user keeps current document
        const updatedFormData = {
          ...formData,
          id: savedId,
          bol_number: savedBolNumber,
          issue_date: result.data.issue_date || issueDate,
        }
        setFormData(updatedFormData)
        setIsEditMode(true)
        setEditDocumentId(savedId)
        setBolNumber(savedBolNumber)

        // Save directly to browser local storage for 100% instant UI sync
        try {
          const storedLocal = window.localStorage.getItem("sky-bol-browser-documents")
          const currentList: any[] = storedLocal ? JSON.parse(storedLocal) : []
          const updatedList = [
            updatedFormData,
            ...currentList.filter((d) => (d.bol_number || d.id) !== (updatedFormData.bol_number || updatedFormData.id)),
          ]
          window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(updatedList))
          window.localStorage.setItem("skybol:saved-documents", JSON.stringify(updatedList))
        } catch (e) {
          console.error("Browser local storage error:", e)
        }

        // Auto-save shipper and consignee details into quick saved options
        try {
          if (updatedFormData.shipper_name?.trim()) {
            const sName = updatedFormData.shipper_name.trim()
            const matchS = savedShippers.find((s) => s.name.trim().toLowerCase() === sName.toLowerCase())
            const curS: SavedParty = {
              id: matchS ? matchS.id : crypto.randomUUID(),
              name: sName,
              address: updatedFormData.shipper_address || "",
              contact: updatedFormData.shipper_contact || "",
              email: updatedFormData.shipper_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextS = [curS, ...savedShippers.filter((s) => s.id !== curS.id)].slice(0, 100)
            persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, nextS, setSavedShippers)
          }

          if (updatedFormData.consignee_name?.trim()) {
            const cName = updatedFormData.consignee_name.trim()
            const matchC = savedConsignees.find((c) => c.name.trim().toLowerCase() === cName.toLowerCase())
            const curC: SavedParty = {
              id: matchC ? matchC.id : crypto.randomUUID(),
              name: cName,
              address: updatedFormData.consignee_address || "",
              contact: updatedFormData.consignee_contact || "",
              email: updatedFormData.consignee_email || "",
              savedAt: new Date().toISOString(),
            }
            const nextC = [curC, ...savedConsignees.filter((c) => c.id !== curC.id)].slice(0, 100)
            persistSavedParties(SAVED_CONSIGNEES_STORAGE_KEY, nextC, setSavedConsignees)
          }
        } catch (err) {
          console.error("Auto-save party error:", err)
        }

        syncBolToAccountLedger(updatedFormData)
        
        window.dispatchEvent(new CustomEvent("skybol:documents-updated", { detail: updatedFormData }))

        onSave?.(updatedFormData)
        onRefreshDocuments?.()
        
        // Show success toast with BOL number & 1-click action to View Saved BOLs
        const action = isEditMode ? "updated" : "saved"
        toast.success(`Document ${action} successfully!`, {
          description: `BOL ${savedBolNumber} ${action} in your documents library`,
          action: {
            label: "View Saved BOLs",
            onClick: () => setActiveTab("saved-documents"),
          },
        })
      } else if (result.error) {
        toast.error("Failed to save document", {
          description: result.error,
        })
      }
    } catch (error) {
      console.error("[v0] Error saving BOL:", error)
      toast.error("Error saving document", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleNewDocument = () => {
    setIsEditMode(false)
    setEditDocumentId(null)
    setFormData(initialFormData)
    setBolNumber("BOL-2026-NSA470")
    fetchNextBolNumber()
    const today = new Date().toISOString().split("T")[0]
    setIssueDate(today)
    const dualDates = getDualDates(today)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
    }
  }

  const handleDuplicateCurrent = async () => {
    setIsSaving(true)
    const toastId = toast.loading("Duplicating BOL...", {
      description: "Generating next sequence number...",
    })
    try {
      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      const newBolNumber = result.bolNumber || "BOL-2026-NSA471"

      setIsEditMode(false)
      setEditDocumentId(null)
      setBolNumber(newBolNumber)
      setFormData((prev) => ({ ...prev, id: "", bol_number: newBolNumber }))

      toast.success(`Cloned as ${newBolNumber}!`, {
        id: toastId,
        description: "Form pre-filled with party data. Click Save when ready.",
      })
    } catch (e) {
      toast.error("Failed to duplicate document", { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportPDF = async () => {
    try {
      if (!formData.id) {
        await handleSave()
      }

      setIsSaving(true)
      const toastId = toast.loading("Generating PDF...", {
        description: "Please wait, this may take a moment...",
      })

      const fileName = `${formData.bol_number || "BOL"}.pdf`
      const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
      const pdfBlob = await generateBOLPDFBlob({
        fileName,
        previewElement,
        modern: {
          bolNumber: bolNumber || "BOL",
          issueDate,
          persianDateNumeric,
          formData,
          logoUrl,
          companyName,
          companyNamePersian,
          companySubtitle,
          companyPhone,
          companyEmail,
          companyAddress,
          companyLicence,
          onProgress: (progress, message) => {
            toast.loading(`${message} (${Math.round(progress)}%)`, {
              id: toastId,
              description: "Generating premium print-ready PDF",
            })
          },
        },
        onFallback: (reason) => {
          toast.warning("Using compatibility PDF mode", {
            description: reason,
          })
        },
      })

      toast.loading("Uploading PDF to storage...", {
        id: toastId,
        description: "Saving to cloud storage...",
      })

      // Upload to server
      const uploadResult = await uploadPDFToServer(
        pdfBlob,
        formData.id || "",
        formData.bol_number || "BOL"
      )

      if (uploadResult.success && uploadResult.url) {
        toast.success("PDF saved successfully!", {
          id: toastId,
          description: "Your BOL PDF has been stored and is ready for download",
        })
        onRefreshDocuments?.()
      } else {
        toast.error("Failed to save PDF", {
          id: toastId,
          description: uploadResult.error || "Unknown error occurred",
        })
      }
    } catch (error) {
      console.error("Error exporting PDF:", error)
      toast.error("Error generating PDF", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePrint = async (options: PrintOptions) => {
    try {
      setIsSaving(true)
      setActivePrintOptions(options)

      const toastId = toast.loading("Opening print preview...", {
        description: `Preparing BOL layout (${options.quality} quality, ${options.copies} ${options.copies === 1 ? "copy" : "copies"})...`,
      })

      if (options.quality === "high-quality") {
        const fileName = `${bolNumber || "BOL"}.pdf`
        const printWindow = openPDFPrintWindow(fileName)

        const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
        const pdfBlob = await generateBOLPDFBlob({
          fileName,
          previewElement,
          modern: {
            bolNumber: bolNumber || "BOL",
            issueDate,
            persianDateNumeric,
            formData,
            logoUrl,
            companyName,
            companyNamePersian,
            companySubtitle,
            companyPhone,
            companyEmail,
            companyAddress,
            companyLicence,
            onProgress: (progress, message) => {
              toast.loading(`${message} (${Math.round(progress)}%)`, {
                id: toastId,
                description: `Building high-quality PDF print preview...`,
              })
            },
          },
          onFallback: (reason) => {
            toast.warning("Using compatibility PDF mode", {
              description: reason,
            })
          },
        })
        const printed = await printPDFBlobInWindow(pdfBlob, fileName, printWindow)

        if (printed) {
          toast.success("High-quality PDF print preview opened", {
            id: toastId,
            description: `Review and click Print in the preview window (${options.copies} ${options.copies === 1 ? "copy" : "copies"}).`,
          })
        } else {
          toast.error("Failed to open print PDF window", {
            id: toastId,
          })
        }
        setIsSaving(false)
        return
      }

      if (typeof window !== "undefined" && typeof window.print === "function") {
        const previewEl = document.getElementById("bol-print-preview")
        if (previewEl) {
          previewEl.setAttribute("data-print-quality", options.quality)
          previewEl.setAttribute("data-color-strip", options.includeColorStrip ? "true" : "false")
          previewEl.setAttribute("data-fit-to-page", options.fitToPage ? "true" : "false")
        }

        await new Promise((resolve) => setTimeout(resolve, 80))
        window.print()

        const copyText = options.copies > 1 ? ` (${options.copies} copies requested)` : ""
        toast.success("Print preview opened", {
          id: toastId,
          description: `Use your browser print dialog to complete printing${copyText}.`,
        })
        setIsSaving(false)
        return
      }
    } catch (error) {
      console.error("Error preparing print:", error)
      toast.error("Error preparing print", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setIsSaving(true)
      const toastId = toast.loading("Generating PDF...", {
        description: "Please wait, this may take a moment...",
      })

      const fileName = `${bolNumber || "BOL"}.pdf`
      const previewElement = document.querySelector('[data-pdf-export="true"]') as HTMLElement | null
      const pdfBlob = await generateBOLPDFBlob({
        fileName,
        previewElement,
        modern: {
          bolNumber: bolNumber || "BOL",
          issueDate,
          persianDateNumeric,
          formData,
          logoUrl,
          companyName,
          companyNamePersian,
          companySubtitle,
          companyPhone,
          companyEmail,
          companyAddress,
          companyLicence,
          onProgress: (progress, message) => {
            toast.loading(`${message} (${Math.round(progress)}%)`, {
              id: toastId,
              description: "Building sharp A4 export",
            })
          },
        },
        onFallback: (reason) => {
          toast.warning("Using compatibility PDF mode", {
            description: reason,
          })
        },
      })

      const saved = await savePDFToDevice(pdfBlob, fileName)
      if (saved.success) {
        toast.success("PDF saved locally", {
          id: toastId,
          description: saved.path || `${bolNumber}.pdf has been saved to your device`,
        })
      } else {
        toast.error("Failed to save PDF locally", {
          id: toastId,
          description: saved.error,
        })
      }
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast.error("Error generating PDF", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    const handleShellAction = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; tab?: string }>).detail

      if (detail?.tab) {
        setActiveTab(detail.tab)
      }

      switch (detail?.action) {
        case "form":
          setActiveTab("form")
          break
        case "new":
          handleNewDocument()
          setActiveTab("form")
          break
        case "print":
          setIsPrintDialogOpen(true)
          break
        case "download":
          void handleDownloadPDF()
          break
        case "save-pdf":
          void handleExportPDF()
          break
        case "preview":
          setActiveTab("preview")
          break
        case "saved-documents":
          setActiveTab("saved-documents")
          break
        case "account":
          setActiveTab("account")
          break
        case "pdf-settings":
          setActiveTab("pdf-settings")
          break
      }
    }

    window.addEventListener("skybol:editor-action", handleShellAction)

    return () => {
      window.removeEventListener("skybol:editor-action", handleShellAction)
    }
  })

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (bolNumber && !isSaving) {
          handleSave()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bolNumber, handleSave, isSaving])

  return (
    <div className="min-h-screen bg-transparent print:min-h-0 print:bg-white print:overflow-visible">
      {/* Action Bar - Mobile & Desktop sticky beneath header */}
      <div className="sticky top-[61px] z-30 border-b border-white/50/70 bg-white/90 px-3 py-2 shadow-md shadow-blue-900/5 backdrop-blur-xl md:px-4 md:py-2.5 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          {/* Header Info - Stacked on mobile */}
          <div className="flex items-start md:items-center gap-2 md:gap-4 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="rounded-2xl border border-blue-200 bg-white/80 p-2 shadow-lg shadow-blue-200/50">
                <FileText className="h-4 w-4 text-blue-700 shrink-0" />
              </div>
              <span className="font-semibold text-slate-950 text-sm md:text-base">Bill of Lading</span>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-2 py-1 md:px-3">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
              ) : (
                <span className="font-mono font-bold text-blue-700 text-xs md:text-sm">{bolNumber}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Calendar className="h-3.5 md:h-4 w-3.5 md:w-4 text-blue-500 shrink-0" />
              <span className="text-slate-600">{issueDate}</span>
            </div>
            {persianDateNumeric && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/50 bg-white/70 px-2 py-0.5 text-xs md:text-sm">
                <span className="text-slate-600 font-bold font-[vazirmatn]" dir="ltr" style={{ unicodeBidi: "isolate" }}>
                  {persianDateNumeric}
                </span>
              </div>
            )}
          </div>
          
          {/* Actions - Responsive button layout */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap md:flex-nowrap justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setActiveTab("saved-documents")}
              className="h-8 rounded-2xl border-emerald-200 bg-emerald-50/80 px-2 text-xs font-bold text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 md:h-9 md:px-3 md:text-sm shadow-2xs"
            >
              <FileText className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 text-emerald-600" />
              <span>Saved BOLs</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleNewDocument}
              className="h-8 rounded-2xl border-white/50 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
            >
              <Plus className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPrintDialogOpen(true)}
              disabled={isSaving}
              className="h-8 rounded-2xl border-white/50 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            {isEditMode && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNewDocument}
                className="h-8 rounded-2xl border-white/50 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
              >
                <Plus className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
                <span className="hidden md:inline">New Doc</span>
              </Button>
            )}
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving}
              className="h-8 rounded-2xl bg-linear-to-r from-blue-600 to-cyan-500 px-2 text-xs text-white shadow-lg shadow-blue-300/40 hover:shadow-blue-300/60 md:h-9 md:px-3 md:text-sm"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              )}
              {isEditMode ? "Update" : "Save"}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDuplicateCurrent} 
              disabled={isSaving}
              className="h-8 rounded-2xl border-purple-200 bg-purple-50/75 px-2 text-xs text-purple-700 hover:border-purple-300 hover:bg-purple-100 md:h-9 md:px-3 md:text-sm font-bold"
              title="Clone current document into a new BOL draft"
            >
              <Copy className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 text-purple-600" />
              <span className="hidden sm:inline">Duplicate</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDownloadPDF} 
              disabled={isSaving}
              className="h-8 rounded-2xl border-white/50 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
              title="Download PDF directly"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 text-blue-700" />
              )}
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportPDF} 
              disabled={isSaving}
              className="h-8 rounded-2xl border-white/50 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
              title="Save PDF to cloud storage"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              )}
              <span className="hidden sm:inline">Save PDF</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-0 py-4 md:py-5 print:max-w-none print:p-0 print:m-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden w-full">
          <TabsList className="mb-4 grid w-full grid-cols-5 rounded-[22px] border border-white/70 bg-white/60 p-1 shadow-xl shadow-blue-200/40 backdrop-blur-2xl">
            <TabsTrigger value="form" className="gap-1 rounded-[18px] text-xs md:gap-2 md:text-sm">
              <FileText className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Edit Form</span>
              <span className="sm:hidden">Edit</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1 rounded-[18px] text-xs md:gap-2 md:text-sm">
              <Eye className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">A4 Preview</span>
              <span className="sm:hidden">Preview</span>
            </TabsTrigger>
            <TabsTrigger value="saved-documents" className="gap-1 rounded-[18px] text-xs md:gap-2 md:text-sm">
              <FileText className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Saved PDF Documents</span>
              <span className="sm:hidden">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1 rounded-[18px] text-xs md:gap-2 md:text-sm">
              <Landmark className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">Account</span>
              <span className="sm:hidden">Acct</span>
            </TabsTrigger>
            <TabsTrigger value="pdf-settings" className="gap-1 rounded-[18px] text-xs md:gap-2 md:text-sm">
              <Download className="h-3.5 md:h-4 w-3.5 md:w-4" />
              <span className="hidden sm:inline">PDF Settings</span>
              <span className="sm:hidden">PDF</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="edit-form-panel space-y-4">
            {/* 01 Document Information Card */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-xs">
                      01
                    </span>
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs">
                      <Calendar className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Document Information</span>
                      <span className="text-[11px] text-blue-700 font-medium block">BOL Reference & Issue Dates</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-900 font-[vazirmatn] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    اطلاعات سند و تاریخ‌ها
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>BOL Number</span>
                      <span className="font-[vazirmatn] text-blue-800 font-bold text-[11px]">شماره بارنامه</span>
                    </label>
                    {isEditingBolNumber ? (
                      <div className="flex gap-2">
                        <Input
                          value={bolNumber}
                          onChange={(e) => setBolNumber(e.target.value)}
                          className="font-mono font-black text-sm text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner rounded-xl h-11"
                          placeholder="BOL-XXX"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingBolNumber(false)}
                          className="rounded-xl h-11 px-4 font-bold text-xs bg-blue-600 text-white hover:bg-blue-500"
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 px-4 py-2.5 bg-blue-50/70 rounded-xl font-mono font-black text-sm text-blue-800 border border-blue-200/80 shadow-2xs">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : bolNumber}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditingBolNumber(true)}
                          className="h-11 w-11 rounded-xl hover:bg-blue-50 border border-blue-200/60"
                        >
                          <Edit3 className="h-4 w-4 text-blue-700" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Issue Date (Gregorian)</span>
                      <span className="font-[vazirmatn] text-blue-800 font-bold text-[11px]">تاریخ میلادی</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <Input
                        type="date"
                        value={issueDate}
                        onChange={(e) => handleDateChange(e.target.value)}
                        className="pl-9 font-mono font-black text-sm text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner rounded-xl h-11 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Issue Date (Persian)</span>
                      <span className="font-[vazirmatn] text-blue-800 font-bold text-[11px]">تاریخ شمسی</span>
                    </label>
                    <div className="px-4 py-1.5 bg-blue-50/70 rounded-xl border border-blue-200/80 flex flex-col items-start justify-center h-11">
                      <p className="font-[vazirmatn] text-xs font-black text-slate-900 leading-tight" dir="ltr" style={{ unicodeBidi: "isolate" }}>{persianDate}</p>
                      <p className="font-[vazirmatn] text-[11px] font-extrabold text-blue-800 leading-tight" dir="ltr" style={{ unicodeBidi: "isolate" }}>{persianDateNumeric}</p>
                    </div>
                  </div>
                </div>
                
                {/* Notes Boxes */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Note 1 */}
                  <div className={`p-4 rounded-2xl backdrop-blur-xl border shadow-sm ${getNoteThemeStyles(formData.notes_1_theme).container}`}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <label className={`text-sm font-medium flex-1 ${getNoteThemeStyles(formData.notes_1_theme).label}`}>
                        <Input
                          type="text"
                          value={formData.notes_1_label || ""}
                          onChange={(e) => setFormData({ ...formData, notes_1_label: e.target.value })}
                          className={`h-7 p-2 text-xs font-medium backdrop-blur-sm rounded-lg ${getNoteThemeStyles(formData.notes_1_theme).input}`}
                        />
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        {NOTE_THEMES.map((theme) => (
                          <button
                            key={theme.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, notes_1_theme: theme.value })}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                              NOTE_THEME_BUTTON_CLASSES[theme.value] ?? ''
                            } ${
                              formData.notes_1_theme === theme.value 
                                ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' 
                                : 'border-white/60'
                            }`}
                            title={theme.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Saved Options Selector for Note 1 */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex-1">
                        <Select
                          value={selectedNote1Id || "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setSelectedNote1Id("")
                              return
                            }
                            applySavedNote1(value)
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs border-white/60 bg-white/70 backdrop-blur-sm rounded-lg">
                            <SelectValue placeholder="Saved options / گزینه‌های ذخیره شده" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Saved Note 1 Options...</SelectItem>
                            {savedNotes1.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-xs py-1.5">
                                <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                  <span className="font-bold text-slate-900 truncate">{opt.label}</span>
                                  <span className="text-[10px] text-slate-500 font-mono truncate">
                                    {opt.content.replace(/\s+/g, ' ')}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={saveCurrentNote1}
                        className="h-7 px-2 text-xs border-white/60 bg-white/70 hover:bg-white/90 text-blue-700 rounded-lg shrink-0"
                        title="Save current text as option"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      {selectedNote1Id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={deleteSavedNote1}
                          className="h-7 px-2 text-xs border-red-200 bg-white/70 hover:bg-red-50 text-red-600 rounded-lg shrink-0"
                          title="Delete saved option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <Textarea
                      value={formData.notes_1 || ""}
                      onChange={(e) => setFormData({ ...formData, notes_1: e.target.value })}
                      placeholder="Add important notes here..."
                      className={`backdrop-blur-sm rounded-xl ${getNoteThemeStyles(formData.notes_1_theme).textarea}`}
                      rows={4}
                    />
                  </div>

                  {/* Note 2 */}
                  <div className={`p-4 rounded-2xl backdrop-blur-xl border shadow-sm ${getNoteThemeStyles(formData.notes_2_theme).container}`}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <label className={`text-sm font-medium flex-1 ${getNoteThemeStyles(formData.notes_2_theme).label}`}>
                        <Input
                          type="text"
                          value={formData.notes_2_label || ""}
                          onChange={(e) => setFormData({ ...formData, notes_2_label: e.target.value })}
                          className={`h-7 p-2 text-xs font-medium backdrop-blur-sm rounded-lg ${getNoteThemeStyles(formData.notes_2_theme).input}`}
                        />
                      </label>
                      <div className="flex items-center gap-1 shrink-0">
                        {NOTE_THEMES.map((theme) => (
                          <button
                            key={theme.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, notes_2_theme: theme.value })}
                            className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                              NOTE_THEME_BUTTON_CLASSES[theme.value] ?? ''
                            } ${
                              formData.notes_2_theme === theme.value 
                                ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-400' 
                                : 'border-white/60'
                            }`}
                            title={theme.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Saved Options Selector for Note 2 */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="flex-1">
                        <Select
                          value={selectedNote2Id || "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setSelectedNote2Id("")
                              return
                            }
                            applySavedNote2(value)
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs border-white/60 bg-white/70 backdrop-blur-sm rounded-lg">
                            <SelectValue placeholder="Saved options / گزینه‌های ذخیره شده" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Saved Note 2 Options...</SelectItem>
                            {savedNotes2.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id} className="text-xs py-1.5">
                                <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                  <span className="font-bold text-slate-900 truncate">{opt.label}</span>
                                  <span className="text-[10px] text-slate-500 font-mono truncate">
                                    {opt.content.replace(/\s+/g, ' ')}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={saveCurrentNote2}
                        className="h-7 px-2 text-xs border-white/60 bg-white/70 hover:bg-white/90 text-blue-700 rounded-lg shrink-0"
                        title="Save current text as option"
                      >
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      {selectedNote2Id && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={deleteSavedNote2}
                          className="h-7 px-2 text-xs border-red-200 bg-white/70 hover:bg-red-50 text-red-600 rounded-lg shrink-0"
                          title="Delete saved option"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <Textarea
                      value={formData.notes_2 || ""}
                      onChange={(e) => setFormData({ ...formData, notes_2: e.target.value })}
                      placeholder="Add important notes here..."
                      className={`backdrop-blur-sm rounded-xl ${getNoteThemeStyles(formData.notes_2_theme).textarea}`}
                      rows={4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipper & Consignee */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* 02 Shipper Card */}
              <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-xs">
                        02
                      </span>
                      <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Shipper / Exporter</span>
                        <span className="text-[11px] text-blue-700 font-medium block">Origin Consignor Information</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-900 font-[vazirmatn] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      فرستنده / صادرکننده
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5 pb-6">
                  <div className="rounded-2xl border border-blue-200/80 bg-blue-50/60 p-3.5 shadow-2xs">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>Saved Shippers</span>
                          <span className="font-[vazirmatn] text-blue-900 font-bold text-[11px]">فرستنده‌های ذخیره شده</span>
                        </label>
                        <Select
                          value={selectedShipperId || "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setSelectedShipperId("")
                              return
                            }
                            applySavedShipper(value)
                          }}
                        >
                          <SelectTrigger className="h-11 text-xs font-bold text-slate-900 border-white bg-white/60 backdrop-blur-md shadow-inner rounded-xl shadow-2xs">
                            <SelectValue placeholder="Select saved shipper" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select saved shipper...</SelectItem>
                            {savedShippers.map((shipper, index) => (
                              <SelectItem key={`${shipper.id}-${index}`} value={shipper.id} className="text-xs py-2">
                                <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                  <span className="font-bold text-slate-900 truncate">{shipper.name}</span>
                                  {(shipper.address || shipper.contact || shipper.email) && (
                                    <span className="text-[10px] text-slate-500 font-mono truncate">
                                      {[shipper.address, shipper.contact, shipper.email].filter(Boolean).join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={saveCurrentShipper}
                          className="h-11 border-blue-300 bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-xs rounded-xl shadow-2xs"
                        >
                          <Save className="h-3.5 w-3.5 mr-1 text-blue-700" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={deleteSavedShipper}
                          disabled={!selectedShipperId}
                          className="h-11 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs disabled:opacity-40"
                          title="Delete saved shipper"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Shipper Name</span>
                      <span className="font-[vazirmatn] text-blue-900 font-bold text-[11px]">نام فرستنده</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        name="shipper_name"
                        value={formData.shipper_name}
                        onChange={handleInputChange}
                        placeholder="Enter shipper name"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Shipper Address</span>
                      <span className="font-[vazirmatn] text-blue-900 font-bold text-[11px]">آدرس فرستنده</span>
                    </label>
                    <Textarea
                      name="shipper_address"
                      value={formData.shipper_address}
                      onChange={handleInputChange}
                      placeholder="Enter shipper address"
                      rows={3}
                      className="rounded-xl p-3 text-sm font-medium text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs min-h-[76px] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Phone / Contact</span>
                        <span className="font-[vazirmatn] text-blue-900 font-bold text-[11px]">شماره تماس</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-blue-600 pointer-events-none">
                          <Phone className="w-4 h-4" />
                        </div>
                        <Input
                          name="shipper_contact"
                          value={formData.shipper_contact || ""}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          type="tel"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Email</span>
                        <span className="font-[vazirmatn] text-blue-900 font-bold text-[11px]">ایمیل</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-blue-600 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </div>
                        <Input
                          name="shipper_email"
                          value={formData.shipper_email || ""}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                          type="email"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 03 Consignee Card */}
              <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
                <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white text-[11px] font-black shadow-xs">
                        03
                      </span>
                      <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-2xs">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Consignee</span>
                        <span className="text-[11px] text-emerald-700 font-medium block">Destination Recipient Details</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-900 font-[vazirmatn] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      گیرنده / تحویل گیرنده
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-5 pb-6">
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 shadow-2xs">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                          <span>Saved Consignees</span>
                          <span className="font-[vazirmatn] text-emerald-900 font-bold text-[11px]">گیرنده‌های ذخیره شده</span>
                        </label>
                        <Select
                          value={selectedConsigneeId || "none"}
                          onValueChange={(value) => {
                            if (value === "none") {
                              setSelectedConsigneeId("")
                              return
                            }
                            applySavedConsignee(value)
                          }}
                        >
                          <SelectTrigger className="h-11 text-xs font-bold text-slate-900 border-white bg-white/60 backdrop-blur-md shadow-inner rounded-xl shadow-2xs">
                            <SelectValue placeholder="Select saved consignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select saved consignee...</SelectItem>
                            {savedConsignees.map((consignee, index) => (
                              <SelectItem key={`${consignee.id}-${index}`} value={consignee.id} className="text-xs py-2">
                                <div className="flex flex-col gap-0.5 text-left max-w-[280px]">
                                  <span className="font-bold text-slate-900 truncate">{consignee.name}</span>
                                  {(consignee.address || consignee.contact || consignee.email) && (
                                    <span className="text-[10px] text-slate-500 font-mono truncate">
                                      {[consignee.address, consignee.contact, consignee.email].filter(Boolean).join(" • ")}
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={saveCurrentConsignee}
                          className="h-11 border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold text-xs rounded-xl shadow-2xs"
                        >
                          <Save className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={deleteSavedConsignee}
                          disabled={!selectedConsigneeId}
                          className="h-11 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs disabled:opacity-40"
                          title="Delete saved consignee"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Consignee Name</span>
                      <span className="font-[vazirmatn] text-emerald-900 font-bold text-[11px]">نام گیرنده</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-emerald-600 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        name="consignee_name"
                        value={formData.consignee_name}
                        onChange={handleInputChange}
                        placeholder="Enter consignee name"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                        dir="auto"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Consignee Address</span>
                      <span className="font-[vazirmatn] text-emerald-900 font-bold text-[11px]">آدرس گیرنده</span>
                    </label>
                    <Textarea
                      name="consignee_address"
                      value={formData.consignee_address}
                      onChange={handleInputChange}
                      placeholder="Enter consignee address"
                      rows={3}
                      className="rounded-xl p-3 text-sm font-medium text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs min-h-[76px] transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Phone / Contact</span>
                        <span className="font-[vazirmatn] text-emerald-900 font-bold text-[11px]">شماره تماس</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 pointer-events-none">
                          <Phone className="w-4 h-4" />
                        </div>
                        <Input
                          name="consignee_contact"
                          value={formData.consignee_contact || ""}
                          onChange={handleInputChange}
                          placeholder="Enter phone number"
                          type="tel"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Email</span>
                        <span className="font-[vazirmatn] text-emerald-900 font-bold text-[11px]">ایمیل</span>
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 text-emerald-600 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </div>
                        <Input
                          name="consignee_email"
                          value={formData.consignee_email || ""}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                          type="email"
                          className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 04 Notify Party Card */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-600 text-white text-[11px] font-black shadow-xs">
                      04
                    </span>
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200 shadow-2xs">
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Notify Party</span>
                      <span className="text-[11px] text-amber-700 font-medium block">Secondary Contact on Arrival</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-900 font-[vazirmatn] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    طرف اطلاع‌رسانی
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 shadow-2xs">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="text-xs font-black text-slate-800 mb-1.5 flex items-center justify-between">
                        <span>Saved Notify Parties</span>
                        <span className="font-[vazirmatn] text-amber-900 font-bold text-[11px]">طرف‌های اطلاع ذخیره شده</span>
                      </label>
                      <Select
                        value={selectedNotifyPartyId || "none"}
                        onValueChange={(value) => {
                          if (value === "none") {
                            setSelectedNotifyPartyId("")
                            return
                          }
                          applySavedNotifyParty(value)
                        }}
                      >
                        <SelectTrigger className="h-11 text-xs font-bold text-slate-900 border-white bg-white/60 backdrop-blur-md shadow-inner rounded-xl shadow-2xs">
                          <SelectValue placeholder="Select saved notify party" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select saved notify party</SelectItem>
                          {savedNotifyParties.map((notifyParty, index) => (
                            <SelectItem key={`${notifyParty.id}-${index}`} value={notifyParty.id} className="text-xs font-medium">
                              {notifyParty.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={saveCurrentNotifyParty}
                        className="h-11 border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-extrabold text-xs rounded-xl shadow-2xs"
                      >
                        <Save className="h-3.5 w-3.5 mr-1 text-amber-700" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={deleteSavedNotifyParty}
                        disabled={!selectedNotifyPartyId}
                        className="h-10 border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl shadow-2xs disabled:opacity-40"
                        title="Delete saved notify party"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Notify Party Name</span>
                      <span className="font-[vazirmatn] text-amber-900 font-bold text-[11px]">نام طرف اطلاع</span>
                    </label>
                    <Input
                      name="notify_party"
                      value={formData.notify_party}
                      onChange={handleInputChange}
                      placeholder="Enter notify party name"
                      className="rounded-xl h-10 text-xs font-bold text-slate-950 bg-white/60 backdrop-blur-md border border-white shadow-inner focus:border-amber-500 shadow-2xs"
                      dir="auto"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                      <span>Address / Contact</span>
                      <span className="font-[vazirmatn] text-amber-900 font-bold text-[11px]">آدرس و تلفن</span>
                    </label>
                    <Input
                      name="notify_party_address"
                      value={formData.notify_party_address}
                      onChange={handleInputChange}
                      placeholder="Enter notify party address"
                      className="rounded-xl h-10 text-xs font-bold text-slate-950 bg-white/60 backdrop-blur-md border border-white shadow-inner focus:border-amber-500 shadow-2xs"
                      dir="auto"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 06 Cargo Details Card */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-600 text-white text-[11px] font-black shadow-xs">
                      06
                    </span>
                    <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Cargo Details & Specifications</span>
                      <span className="text-[11px] text-purple-700 font-medium block">Packages, Weights, Rates & Cargo Description</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-purple-900 font-[vazirmatn] bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                    مشخصات کالا و محموله
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {/* Container No */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Container No.</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">شماره کانتینر</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-500 pointer-events-none">
                        <Box className="w-4 h-4" />
                      </div>
                      <Input
                        name="container_numbers"
                        value={formData.container_numbers}
                        onChange={handleInputChange}
                        placeholder="Container numbers"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Seal No */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Seal No.</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">شماره پلمپ</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-500 pointer-events-none">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <Input
                        name="seal_numbers"
                        value={formData.seal_numbers}
                        onChange={handleInputChange}
                        placeholder="Seal numbers"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* No. of Packages */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>No. of Packages</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">تعداد بسته</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-500 pointer-events-none">
                        <Package className="w-4 h-4" />
                      </div>
                      <Input
                        name="number_of_packages"
                        value={formData.number_of_packages}
                        onChange={handleInputChange}
                        placeholder="Package count"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* KGS / Carton */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>KGS / Carton</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">کیلو فی کارتن</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-500 pointer-events-none">
                        <Scale className="w-4 h-4" />
                      </div>
                      <Input
                        name="kgs_per_carton"
                        value={formData.kgs_per_carton}
                        onChange={handleInputChange}
                        placeholder="e.g., 12.5"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Gross Wt. / Carton */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Gross Wt. / Carton</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-purple-800">وزن ناخالص کارتن</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-purple-500 pointer-events-none">
                        <Scale className="w-4 h-4" />
                      </div>
                      <Input
                        name="gross_weight_per_carton"
                        value={formData.gross_weight_per_carton}
                        onChange={handleInputChange}
                        placeholder="e.g., 13"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Rate per KGS */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-emerald-900 flex items-center justify-between gap-1">
                      <span>Rate per KGS</span>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-emerald-700">نرخ فی کیلو</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-emerald-600 pointer-events-none">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <Input
                        name="rate_per_kgs"
                        value={formData.rate_per_kgs}
                        onChange={handleInputChange}
                        placeholder="e.g., $1.20"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-emerald-950 bg-emerald-50/50 border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Goods Value */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-emerald-900 flex items-center justify-between gap-1">
                      <span>Goods Value</span>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-emerald-700">ارزش کالا</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-emerald-600 pointer-events-none">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <Input
                        name="goods_value"
                        value={formData.goods_value}
                        onChange={handleInputChange}
                        placeholder="e.g., $10,000"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-emerald-950 bg-emerald-50/50 border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Net Weight */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-blue-950 flex items-center justify-between gap-1">
                      <span>Net Weight</span>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-blue-700">وزن خالص</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <Scale className="w-4 h-4" />
                      </div>
                      <Input
                        name="net_weight"
                        value={formData.net_weight}
                        onChange={handleInputChange}
                        placeholder="e.g., 4,800 KG"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-blue-950 bg-blue-50/50 border-blue-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Gross Weight */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-blue-950 flex items-center justify-between gap-1">
                      <span>Gross Weight</span>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-blue-700">وزن ناخالص</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <Scale className="w-4 h-4" />
                      </div>
                      <Input
                        name="gross_weight"
                        value={formData.gross_weight}
                        onChange={handleInputChange}
                        placeholder="e.g., 5,000 KG"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-blue-950 bg-blue-50/50 border-blue-200 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Measurement */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Measurement</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-amber-800">حجم (CBM)</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-amber-600 pointer-events-none">
                        <FileText className="w-4 h-4" />
                      </div>
                      <Input
                        name="measurement"
                        value={formData.measurement}
                        onChange={handleInputChange}
                        placeholder="e.g., 25 CBM"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Cargo Description Field */}
                <div className="pt-1">
                  <label className="mb-2 text-xs font-black text-slate-900 flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span>Cargo Description / Specification Details</span>
                    </span>
                    <span className="font-[vazirmatn] text-[11px] font-extrabold text-purple-900">شرح کامل کالا و محموله</span>
                  </label>
                  <Textarea
                    name="cargo_description"
                    value={formData.cargo_description}
                    onChange={handleInputChange}
                    placeholder="Detailed cargo description..."
                    rows={4}
                    className="rounded-2xl p-4 text-sm font-semibold leading-relaxed text-slate-950 bg-white/60 backdrop-blur-md border border-white shadow-inner focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner transition-all min-h-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 07 Truck Information Card */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-blue-600 text-white text-[11px] font-black shadow-xs">
                      07
                    </span>
                    <div className="p-2 rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-2xs">
                      <Truck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-950 text-base tracking-tight select-none">Truck Information</span>
                      <span className="text-[11px] text-blue-700 font-medium block">Vehicle Registration, Driver Details & Freight Costs</span>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-blue-900 font-[vazirmatn] bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                    اطلاعات کامیون و راننده
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {/* Truck No */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Truck No.</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-blue-800">شماره کامیون</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <Truck className="w-4 h-4" />
                      </div>
                      <Input
                        name="truck_number"
                        value={formData.truck_number}
                        onChange={handleInputChange}
                        placeholder="e.g., AF-1234-KBL"
                        className="pl-9 rounded-xl h-11 font-mono text-sm font-black uppercase text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Driver Name */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Driver Name</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-blue-800">نام راننده</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        name="driver_name"
                        value={formData.driver_name}
                        onChange={handleInputChange}
                        placeholder="Enter driver name"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Father Name */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Father Name</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-blue-800">نام پدر</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-slate-500 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <Input
                        name="driver_father_name"
                        value={formData.driver_father_name}
                        onChange={handleInputChange}
                        placeholder="Father's name"
                        className="pl-9 rounded-xl h-11 text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Driver Contact */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-slate-800 flex items-center justify-between gap-1">
                      <span>Driver Contact</span>
                      <span className="font-[vazirmatn] text-[11px] font-bold text-blue-800">تماس راننده</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-blue-600 pointer-events-none">
                        <Phone className="w-4 h-4" />
                      </div>
                      <Input
                        name="driver_contact"
                        value={formData.driver_contact}
                        onChange={handleInputChange}
                        placeholder="Phone number"
                        className="pl-9 rounded-xl h-11 font-mono text-sm font-extrabold text-slate-950 bg-white/60 backdrop-blur-md border-white shadow-inner focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>

                  {/* Driver Rent */}
                  <div>
                    <label className="mb-1.5 text-xs font-black text-red-700 flex items-center justify-between gap-1">
                      <span>Driver Rent</span>
                      <span className="font-[vazirmatn] text-[11px] font-extrabold text-red-700">کرایه راننده</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-red-600 pointer-events-none">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <Input
                        name="driver_rent"
                        value={formData.driver_rent}
                        onChange={handleInputChange}
                        placeholder="e.g., $500"
                        className="pl-9 rounded-xl h-11 text-sm font-black text-red-700 bg-red-50/70 border-red-300 focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Routes - Multiple Stops */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-linear-to-br from-blue-600 via-indigo-600 to-cyan-500 shadow-lg shadow-blue-500/25 text-white">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-blue-950 text-lg tracking-tight">Route Stops</span>
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-[vazirmatn]">
                          مسیر حمل و نقل
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Define transport pathway origin, intermediate border transit stops, and final destination</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyKandaharNimrozBandarAbbasDubaiIndiaPreset}
                      className="h-9.5 rounded-xl border-emerald-200 bg-emerald-50/80 px-3 text-xs font-extrabold text-emerald-900 shadow-xs hover:bg-emerald-100 cursor-pointer transition-all"
                      title="Quick Preset: Kandahar → Nimroz → Bandar Abbas → Dubai → Nhava Sheva (India)"
                    >
                      <Ship className="h-4 w-4 mr-1.5 text-emerald-700" />
                      🇦🇫 → 🇮🇷 → 🇦🇪 → 🇮🇳 Kandahar to India Route
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applyHeratIslamQalaDougharounPreset}
                      className="h-9.5 rounded-xl border-blue-200 bg-blue-50/80 px-3 text-xs font-extrabold text-blue-900 shadow-xs hover:bg-blue-100 cursor-pointer transition-all"
                      title="Quick Preset: Herat → Islam Qala → Dougharoun (Afghanistan to Iran)"
                    >
                      <Truck className="h-4 w-4 mr-1.5 text-blue-700" />
                      🚛 Herat → Dougharoun Route
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={addRouteStop}
                      className="h-9.5 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 text-white px-3.5 text-xs font-extrabold shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-orange-600 cursor-pointer transition-all"
                    >
                      <Plus className="h-4 w-4 mr-1 text-white" />
                      Add Stop / افزودن توقفگاه
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-5 pb-6">
                {/* Visual Route Pathway Timeline */}
                <div className="rounded-2xl border border-blue-200/80 bg-linear-to-r from-blue-50/90 via-indigo-50/60 to-cyan-50/90 p-4 shadow-inner overflow-hidden">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                    {formData.routes.map((route, index) => {
                      const isOrigin = index === 0
                      const isDest = index === formData.routes.length - 1
                      const stopName = route.location || getRouteStopLabel(index, formData.routes.length)
                      
                      return (
                        <div key={route.id} className="flex items-center gap-3 shrink-0">
                          <div
                            onClick={() => setActiveRouteIndex(index)}
                            className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all duration-300 cursor-pointer ${
                              activeRouteIndex === index
                                ? "border-2 border-blue-600 bg-white shadow-xl shadow-blue-500/15 ring-4 ring-blue-500/10 scale-102"
                                : "border-slate-200/90 bg-white/95 hover:border-blue-300 hover:bg-white hover:shadow-md"
                            }`}
                          >
                            {/* Action Buttons (Hover) */}
                            <div className="absolute -top-3 -right-2 hidden group-hover:flex items-center gap-1 bg-white p-1 rounded-xl shadow-lg border border-slate-200 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveRouteIndex(index)
                                }}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                                title="Edit Stop"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              {formData.routes.length > 2 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeRouteStop(index)
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                                  title="Delete Stop"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold text-white text-base shadow-md ${
                                isOrigin
                                  ? "bg-linear-to-br from-emerald-500 to-teal-700 shadow-emerald-500/25"
                                  : isDest
                                  ? "bg-linear-to-br from-indigo-600 to-purple-700 shadow-indigo-500/25"
                                  : "bg-linear-to-br from-blue-600 to-cyan-600 shadow-blue-500/25"
                              }`}
                            >
                              {index + 1}
                            </div>
                            <div className="min-w-28 max-w-56">
                              <div className="flex items-center gap-1.5">
                                {getTransportIcon(route.transportMode)}
                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                                  isOrigin ? "text-emerald-700" : isDest ? "text-indigo-700" : "text-blue-700"
                                }`}>
                                  {getRouteStopLabel(index, formData.routes.length)}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-xs font-extrabold text-blue-950">{stopName}</p>
                              {route.locationPersian && (
                                <p className="truncate text-[11px] font-bold text-slate-500 font-[vazirmatn]" dir="rtl">{route.locationPersian}</p>
                              )}

                              {/* Truck Badge info if present */}
                              {route.plateNumber && (
                                <span className="mt-1 inline-block rounded-md bg-blue-100 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-900 border border-blue-200">
                                  Plate: {route.plateNumber}
                                </span>
                              )}
                              {route.customsSealRequired && (
                                <span className="mt-1 ml-1 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900 border border-amber-200" dir="rtl">
                                  📍 سیل غواړي
                                </span>
                              )}
                            </div>
                          </div>
                          {index < formData.routes.length - 1 && (
                            <div className="flex items-center gap-1.5 px-1 text-blue-500 shrink-0">
                              <span className="h-0.5 w-5 bg-linear-to-r from-blue-400 to-indigo-400 rounded-full" />
                              <ArrowRight className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Stop Cards List */}
                <div className="space-y-4">
                  {formData.routes.map((route, index) => {
                    const isOrigin = index === 0
                    const isDest = index === formData.routes.length - 1
                    const isSelected = activeRouteIndex === index

                    return (
                      <div
                        key={route.id}
                        className={`rounded-2xl border transition-all ${
                          isSelected
                            ? "border-2 border-blue-500 bg-white shadow-xl shadow-blue-500/10 ring-4 ring-blue-500/10"
                            : "border-slate-200/90 bg-white/95 hover:border-slate-300"
                        } p-4.5`}
                      >
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-base font-black text-white shadow-md ${
                              isOrigin
                                ? "bg-linear-to-br from-emerald-500 to-teal-700"
                                : isDest
                                ? "bg-linear-to-br from-indigo-600 to-purple-700"
                                : "bg-linear-to-br from-blue-600 to-cyan-600"
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-extrabold text-blue-950">{getRouteStopLabel(index, formData.routes.length)}</span>
                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                  isOrigin ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : isDest ? "bg-indigo-100 text-indigo-800 border border-indigo-200" : "bg-blue-100 text-blue-800 border border-blue-200"
                                }`}>
                                  {isOrigin ? "Origin Point" : isDest ? "Final Destination" : `Stop #${index}`}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-500 font-[vazirmatn] mt-0.5" dir="rtl">{getRouteStopLabelPersian(index, formData.routes.length)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 rounded-xl border border-red-200 bg-red-50/50 px-3 text-xs font-bold text-red-600 hover:bg-red-100 hover:text-red-700 disabled:opacity-40"
                            onClick={() => removeRouteStop(index)}
                            disabled={formData.routes.length <= 2}
                            title="Remove this route stop"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Stop
                          </Button>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
                          {/* English Location with Inline Quick Select Popover */}
                          <div className="relative">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                              <span>Location (English) / {getRouteStopLabel(index, formData.routes.length)}</span>
                              {route.location && (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Selected</span>
                              )}
                            </label>
                            <Input
                              value={route.location}
                              onFocus={() => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                              }}
                              onChange={(e) => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                                handleRouteChange(index, "location", e.target.value)
                              }}
                              placeholder={`e.g. ${isOrigin ? "Kandahar, AF" : isDest ? "Nhava Sheva, IN" : "Bandar Abbas, IR"}`}
                              className="h-11 rounded-xl border-slate-200 bg-white/90 font-semibold text-slate-900 focus:border-amber-400 focus:ring-amber-200"
                            />

                            {/* Floating Inline Recommendation Popover */}
                            {showLocationDropdown === index && (
                              <div className="absolute left-0 right-0 top-full z-40 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-amber-300/80 bg-white/95 p-3 shadow-2xl shadow-slate-900/20 backdrop-blur-xl">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-amber-900">Suggested Locations</span>
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                                      {quickLocationMatches.length}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowLocationDropdown(null)}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition"
                                  >
                                    ✕ Close
                                  </button>
                                </div>

                                {/* Quick Country Filter Chips */}
                                <div className="flex flex-wrap gap-1 mb-2.5 pb-1 border-b border-slate-100">
                                  {["ALL", "Afghanistan", "Iran", "Pakistan", "United Arab Emirates", "China", "India"].map((ctry) => (
                                    <button
                                      key={ctry}
                                      type="button"
                                      onClick={() => setSelectedCountryFilter(ctry)}
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                                        selectedCountryFilter === ctry
                                          ? "bg-amber-600 text-white shadow-sm"
                                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900"
                                      }`}
                                    >
                                      {ctry === "ALL" ? "🌍 All" : ctry === "Afghanistan" ? "🇦🇫 AF" : ctry === "Iran" ? "🇮🇷 IR" : ctry === "Pakistan" ? "🇵🇰 PK" : ctry === "United Arab Emirates" ? "🇦🇪 UAE" : ctry === "China" ? "🇨🇳 CN" : "🇮🇳 IN"}
                                    </button>
                                  ))}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {quickLocationMatches.slice(0, 18).map((loc) => (
                                    <button
                                      key={loc.name}
                                      type="button"
                                      onClick={() => {
                                        handleQuickLocationSelect(loc)
                                        setShowLocationDropdown(null)
                                      }}
                                      className="flex items-center justify-between rounded-xl p-2 text-left transition bg-slate-50/60 hover:bg-amber-50 border border-slate-100 hover:border-amber-300 cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-base shrink-0">{countryFlags[loc.country] || "🌍"}</span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-black text-slate-900 group-hover:text-amber-900 truncate">{loc.name}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 font-[vazirmatn] truncate" dir="rtl">{loc.persian}</p>
                                        </div>
                                      </div>
                                      <span className="rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-black text-amber-800 shrink-0 ml-1">{loc.code}</span>
                                    </button>
                                  ))}
                                  {quickLocationMatches.length === 0 && (
                                    <div className="col-span-2 p-4 text-center text-xs font-bold text-slate-400 bg-slate-50 rounded-xl">
                                      No locations found. Type to search or add custom location...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Persian Location */}
                          <div className="relative">
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 block">
                              Location (Persian) / موقعیت فارسی
                            </label>
                            <Input
                              value={route.locationPersian}
                              onFocus={() => {
                                setActiveRouteIndex(index)
                                setShowLocationDropdown(index)
                              }}
                              onChange={(e) => {
                                setActiveRouteIndex(index)
                                handleRouteChange(index, "locationPersian", e.target.value)
                              }}
                              placeholder="نام محل یا بند"
                              dir="rtl"
                              className="h-11 rounded-xl border-slate-200 bg-white/90 font-semibold text-slate-900 font-[vazirmatn] focus:border-amber-400 focus:ring-amber-200"
                            />
                          </div>

                          {/* Transport Mode Visual Selector */}
                          <div>
                            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2.5 block">
                              Transport Mode / حالت حمل و نقل
                            </label>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Option: Truck/Road */}
                              <button
                                type="button"
                                onClick={() => handleRouteChange(index, "transportMode", "truck")}
                                className={`flex flex-col items-center justify-center gap-2 h-20 w-[90px] rounded-2xl border transition-all cursor-pointer ${
                                  route.transportMode === "truck" || route.transportMode === "road"
                                    ? "border-blue-500 bg-blue-50 shadow-md shadow-blue-500/10 ring-2 ring-blue-500/20"
                                    : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
                                }`}
                              >
                                <Truck className={`h-6 w-6 ${route.transportMode === "truck" || route.transportMode === "road" ? "text-blue-600" : "text-slate-400"}`} />
                                <span className={`text-[10px] font-black uppercase ${route.transportMode === "truck" || route.transportMode === "road" ? "text-blue-900" : "text-slate-500"}`}>Truck</span>
                              </button>

                              {/* Option: Vessel/Sea */}
                              <button
                                type="button"
                                onClick={() => handleRouteChange(index, "transportMode", "vessel")}
                                className={`flex flex-col items-center justify-center gap-2 h-20 w-[90px] rounded-2xl border transition-all cursor-pointer ${
                                  route.transportMode === "vessel"
                                    ? "border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-500/10 ring-2 ring-cyan-500/20"
                                    : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50"
                                }`}
                              >
                                <Ship className={`h-6 w-6 ${route.transportMode === "vessel" ? "text-cyan-600" : "text-slate-400"}`} />
                                <span className={`text-[10px] font-black uppercase ${route.transportMode === "vessel" ? "text-cyan-900" : "text-slate-500"}`}>Vessel</span>
                              </button>

                              {/* Option: Plane/Air */}
                              <button
                                type="button"
                                onClick={() => handleRouteChange(index, "transportMode", "airplane")}
                                className={`flex flex-col items-center justify-center gap-2 h-20 w-[90px] rounded-2xl border transition-all cursor-pointer ${
                                  route.transportMode === "airplane"
                                    ? "border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10 ring-2 ring-sky-500/20"
                                    : "border-slate-200 bg-white hover:border-sky-300 hover:bg-slate-50"
                                }`}
                              >
                                <Plane className={`h-6 w-6 ${route.transportMode === "airplane" ? "text-sky-600" : "text-slate-400"}`} />
                                <span className={`text-[10px] font-black uppercase ${route.transportMode === "airplane" ? "text-sky-900" : "text-slate-500"}`}>Air</span>
                              </button>

                              {/* Option: Train/Rail */}
                              <button
                                type="button"
                                onClick={() => handleRouteChange(index, "transportMode", "train")}
                                className={`flex flex-col items-center justify-center gap-2 h-20 w-[90px] rounded-2xl border transition-all cursor-pointer ${
                                  route.transportMode === "train"
                                    ? "border-amber-500 bg-amber-50 shadow-md shadow-amber-500/10 ring-2 ring-amber-500/20"
                                    : "border-slate-200 bg-white hover:border-amber-300 hover:bg-slate-50"
                                }`}
                              >
                                <Train className={`h-6 w-6 ${route.transportMode === "train" ? "text-amber-600" : "text-slate-400"}`} />
                                <span className={`text-[10px] font-black uppercase ${route.transportMode === "train" ? "text-amber-900" : "text-slate-500"}`}>Rail</span>
                              </button>
                            </div>

                            {/* Details Overlay */}
                            {route.transportMode && (
                              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/40 backdrop-blur-md p-3.5 shadow-sm">
                                <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-800">
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Duration</span>
                                    <p className="font-extrabold text-slate-700">{getTransportDetails(route.transportMode).duration}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Capacity</span>
                                    <p className="font-extrabold text-slate-700">{getTransportDetails(route.transportMode).capacity}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Dedicated Truck Details Specifications Panel (When Truck/Road mode is selected) */}
                        {(route.transportMode === "truck" || route.transportMode === "road") && (
                          <div className="mt-4 rounded-2xl border border-white bg-linear-to-br from-blue-50/80 via-indigo-50/40 to-amber-50/40 p-4 shadow-sm space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 pb-2.5">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                                  <Truck className="h-4 w-4" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                                  Truck Details &amp; Customs Seal / مشخصات موتر و ګمرک
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-blue-800 font-[vazirmatn]" dir="rtl">
                                جزئیات پلیټ، شاسی و ټیلر مان
                              </span>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                              {/* Plate Number (پلیټ نمبر / ليټ نمبر) */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Plate No. / پلیټ نمبر / ليټ نمبر
                                </label>
                                <Input
                                  value={route.plateNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "plateNumber", e.target.value)}
                                  placeholder="مثلا: KBL-7842"
                                  className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>

                              {/* Chassis Number (شاسی نمبر) */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1">
                                  Chassis No. / شاسی نمبر
                                </label>
                                <Input
                                  value={route.chassisNumber || ""}
                                  onChange={(e) => handleRouteChange(index, "chassisNumber", e.target.value)}
                                  placeholder="CH-908712"
                                  className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>

                              {/* Trailer Man / Driver (ټیلر مان / ډریور) */}
                              <div>
                                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 block mb-1 font-[vazirmatn]">
                                  Trailer Man / ټیلر مان / ډریور
                                </label>
                                <Input
                                  value={route.trailerMan || ""}
                                  onChange={(e) => handleRouteChange(index, "trailerMan", e.target.value)}
                                  placeholder="نام دریور / ټیلر مان"
                                  className="h-10 rounded-xl border-slate-200 bg-white font-bold text-slate-900 text-xs font-[vazirmatn] focus:border-amber-400 focus:ring-amber-200"
                                />
                              </div>
                            </div>

                            {/* Customs Seal Requirement (📍 په ګمرک کې سیل غواړي) */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-blue-200/60">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={Boolean(route.customsSealRequired)}
                                  onChange={(e) => handleRouteChange(index, "customsSealRequired", e.target.checked)}
                                  className="h-4.5 w-4.5 rounded-md border-amber-400 text-amber-600 focus:ring-amber-400 cursor-pointer"
                                />
                                <span className="text-xs font-black text-slate-900 font-[vazirmatn]" dir="rtl">
                                  📍 په ګمرک کې سیل غواړي (Customs Seal Required)
                                </span>
                              </label>
                              {route.customsSealRequired && (
                                <Input
                                  value={route.customsSealNote || ""}
                                  onChange={(e) => handleRouteChange(index, "customsSealNote", e.target.value)}
                                  placeholder="Customs seal details / جزئیات سیل ګمرک"
                                  className="h-9 w-full sm:w-72 rounded-xl border-amber-400 bg-white text-xs font-bold text-slate-900 font-[vazirmatn] focus:border-amber-500"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Quick Select Locations Bar */}
                <div className="pt-4 border-t border-slate-200/80">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Quick Select Location / انتخاب سریع محل:
                      </p>
                      {activeRouteIndex !== null && (
                        <p className="text-xs font-bold text-amber-700">
                          Active Target: <span className="font-black text-slate-900">{getRouteStopLabel(activeRouteIndex, formData.routes.length)}</span>
                        </p>
                      )}
                    </div>

                    {/* Regional Country Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { label: "ALL", country: "ALL" },
                        { label: "🇦🇫 AFGHANISTAN", country: "Afghanistan" },
                        { label: "🇮🇷 IRAN", country: "Iran" },
                        { label: "🇦🇪 UAE", country: "UAE" },
                        { label: "🇮🇳 INDIA", country: "India" },
                        { label: "🇹🇷 TURKEY", country: "Turkey" },
                        { label: "🇨🇳 CHINA", country: "China" },
                      ].map((tab) => (
                        <button
                          key={tab.country}
                          type="button"
                          onClick={() => setSelectedCountryFilter(tab.country)}
                          className={`rounded-xl px-2.5 py-1 text-[11px] font-black transition-all cursor-pointer ${
                            selectedCountryFilter === tab.country
                              ? "bg-amber-500 text-slate-950 shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-amber-100 hover:text-amber-800"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {quickLocationMatches.map((loc) => (
                      <Button
                        key={loc.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-2 px-3 flex flex-col items-start rounded-xl border-slate-200 bg-white/90 hover:border-amber-400 hover:bg-amber-50/60 transition-all shadow-2xs cursor-pointer"
                        onClick={() => handleQuickLocationSelect(loc)}
                        title={`${loc.name} - ${loc.country} (${loc.code})`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-base shrink-0">{countryFlags[loc.country] || "🌍"}</span>
                          <span className="font-black text-slate-900 truncate">{loc.name}</span>
                          <span className="text-[10px] font-black bg-amber-100 text-amber-800 rounded-md px-1.5 py-0.5 ml-auto shrink-0">{loc.code}</span>
                        </div>
                        <span className="text-slate-500 font-[vazirmatn] text-[10px] font-bold truncate w-full text-right" dir="rtl">{loc.persian}</span>
                      </Button>
                    ))}
                    {quickLocationMatches.length === 0 && (
                      <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white/40 backdrop-blur-md px-3 py-5 text-center text-xs font-bold text-slate-500">
                        No matching locations / نتیجه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Container Details */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Container Details</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">جزئیات کانتینر</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container Type / نوع کانتینر</label>
                    <Select value={formData.container_type || "none"} onValueChange={(value) => setFormData((prev) => ({ ...prev, container_type: value === "none" ? "" : value }))}>
                      <SelectTrigger className="h-11 glass-input rounded-xl">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Type</SelectItem>
                        <SelectItem value="dry">Dry Container</SelectItem>
                        <SelectItem value="reefer">Refrigerated (Reefer)</SelectItem>
                        <SelectItem value="open_top">Open Top</SelectItem>
                        <SelectItem value="flat_rack">Flat Rack</SelectItem>
                        <SelectItem value="tank">Tank Container</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container Size / اندازه کانتینر</label>
                    <Select value={formData.container_size || "none"} onValueChange={(value) => setFormData((prev) => ({ ...prev, container_size: value === "none" ? "" : value }))}>
                      <SelectTrigger className="h-11 glass-input rounded-xl">
                        <SelectValue placeholder="Select Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Size</SelectItem>
                        <SelectItem value="20ft">20 ft (TEU)</SelectItem>
                        <SelectItem value="40ft">40 ft (FEU)</SelectItem>
                        <SelectItem value="40ft_hc">40 ft High Cube</SelectItem>
                        <SelectItem value="45ft_hc">45 ft High Cube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Container No. / شماره کانتینر</label>
                    <Input
                      name="container_numbers"
                      value={formData.container_numbers}
                      onChange={handleInputChange}
                      placeholder="e.g., MSCU1234567"
                      className="h-11 glass-input rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block font-medium">Seal No. / شماره سیل</label>
                    <Input
                      name="seal_numbers"
                      value={formData.seal_numbers}
                      onChange={handleInputChange}
                      placeholder="e.g., SL12345"
                      className="h-11 glass-input rounded-xl font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-cyan-500 to-cyan-600 shadow-md shadow-cyan-500/30">
                      <Ship className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Shipping Details</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">جزئیات حمل</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Vessel / کشتی</label>
                  <Input
                    name="vessel_name"
                    value={formData.vessel_name}
                    onChange={handleInputChange}
                    placeholder="Vessel name"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Voyage No. / سفر</label>
                  <Input
                    name="voyage_number"
                    value={formData.voyage_number}
                    onChange={handleInputChange}
                    placeholder="Voyage number"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Port of Loading / بندر بارگیری</label>
                  <Input
                    name="port_of_loading"
                    value={formData.port_of_loading}
                    onChange={handleInputChange}
                    placeholder="Loading port"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Port of Discharge / بندر تخلیه</label>
                  <Input
                    name="port_of_discharge"
                    value={formData.port_of_discharge}
                    onChange={handleInputChange}
                    placeholder="Discharge port"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div className="md:col-span-2 lg:col-span-4">
                  <label className="text-sm text-gray-600 mb-2 block">Place of Delivery / محل تحویل</label>
                  <Input
                    name="place_of_delivery"
                    value={formData.place_of_delivery}
                    onChange={handleInputChange}
                    placeholder="Final delivery location"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Freight Information */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30">
                      <ScrollText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Freight Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات حمل</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Freight Payable At / محل پرداخت کرایه</label>
                  <Input
                    name="freight_payable_at"
                    value={formData.freight_payable_at}
                    onChange={handleInputChange}
                    placeholder="Payment location"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Freight Terms / شرایط حمل</label>
                  <Input
                    name="freight_terms"
                    value={formData.freight_terms}
                    onChange={handleInputChange}
                    placeholder="e.g., Prepaid, Collect"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Remarks */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-gray-500 to-gray-600 shadow-md shadow-gray-500/30">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Remarks</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">توضیحات</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <Textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Additional notes or special instructions"
                  rows={3}
                  className="glass-input rounded-xl min-h-20"
                />
              </CardContent>
            </Card>

            {/* Afghanistan Documents */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-3 bg-linear-to-r from-green-500/12 via-green-400/6 to-transparent border-b border-green-200/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-green-600 to-green-700 shadow-lg shadow-green-500/25">
                      <ScrollText className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Afghanistan Documents</span>
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      {(formData.afghanistan_documents || []).length} selected
                    </span>
                  </div>
                  <span className="text-sm font-normal text-green-600/80 font-[vazirmatn]">اسناد افغانستان</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {/* Category Legend */}
                <div className="flex flex-wrap gap-2 p-3 bg-linear-to-br from-gray-50/80 to-white/60 backdrop-blur-sm rounded-xl border border-gray-100/50">
                  <span className="text-xs font-medium text-gray-500 mr-1">Categories:</span>
                  {Object.entries(DOCUMENT_CATEGORIES).map(([key, cat]) => (
                    <span 
                      key={key} 
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                        key === 'transport' ? 'bg-blue-100 text-blue-700' :
                        key === 'customs' ? 'bg-amber-100 text-amber-700' :
                        key === 'commercial' ? 'bg-emerald-100 text-emerald-700' :
                        key === 'health' ? 'bg-rose-100 text-rose-700' :
                        key === 'insurance' ? 'bg-purple-100 text-purple-700' :
                        key === 'driver' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-red-100 text-red-700'
                      }`}
                    >
                      {cat.label}
                    </span>
                  ))}
                </div>

                {/* Required Documents Alert */}
                <div className="flex items-start gap-3 p-3 bg-linear-to-br from-amber-50/80 to-white/60 backdrop-blur-sm rounded-xl border border-amber-200/50">
                  <div className="p-1.5 rounded-lg bg-amber-500 shadow-sm">
                    <AlertCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800">Required Documents</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Documents marked with <Sparkles className="h-3 w-3 inline text-amber-500" /> are typically required for Afghanistan transit
                    </p>
                  </div>
                </div>

                {/* Document Selection Grid - Grouped by Category */}
                <div className="space-y-4">
                  {Object.entries(DOCUMENT_CATEGORIES).map(([categoryKey, category]) => {
                    const categoryDocs = AFGHANISTAN_DOCUMENT_OPTIONS.filter(doc => doc.category === categoryKey)
                    if (categoryDocs.length === 0) return null
                    
                    const categoryColor = categoryKey === 'transport' ? 'blue' :
                      categoryKey === 'customs' ? 'amber' :
                      categoryKey === 'commercial' ? 'emerald' :
                      categoryKey === 'health' ? 'rose' :
                      categoryKey === 'insurance' ? 'purple' :
                      categoryKey === 'driver' ? 'cyan' : 'red'

                    return (
                      <div key={categoryKey} className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-${categoryColor}-100 text-${categoryColor}-700`}>
                            {category.label}
                          </span>
                          <span className="text-xs text-gray-500 font-[vazirmatn]">{category.labelPersian}</span>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {categoryDocs.map((doc) => {
                            const isSelected = (formData.afghanistan_documents || []).includes(doc.id)
                            const DocIcon = doc.icon === 'truck' ? Truck :
                              doc.icon === 'file-text' ? FileText :
                              doc.icon === 'receipt' ? Receipt :
                              doc.icon === 'list' ? List :
                              doc.icon === 'globe' ? Globe :
                              doc.icon === 'shield' ? Shield :
                              doc.icon === 'leaf' ? Leaf :
                              doc.icon === 'heart' ? Heart :
                              doc.icon === 'scale' ? Scale :
                              doc.icon === 'bookmark' ? Bookmark :
                              doc.icon === 'id-card' ? IdCard :
                              doc.icon === 'car' ? Car :
                              doc.icon === 'building' ? Building2 :
                              doc.icon === 'landmark' ? Landmark :
                              doc.icon === 'map-pin' ? MapPin :
                              doc.icon === 'user' ? User :
                              doc.icon === 'package' ? Package :
                              doc.icon === 'shield-check' ? ShieldCheck :
                              FileText
                            
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => toggleAfghanistanDocument(doc.id)}
                                className={`group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                                  isSelected
                                    ? `border-${categoryColor}-400 bg-linear-to-br from-${categoryColor}-50/80 to-white/60 ring-1 ring-${categoryColor}-200/50 shadow-md`
                                    : "border-gray-200/60 bg-white/60 backdrop-blur-sm hover:border-gray-300 hover:bg-white/80 hover:shadow-sm"
                                }`}
                              >
                                {/* Required badge */}
                                {doc.required && (
                                  <div className="absolute -top-1.5 -right-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-500" />
                                  </div>
                                )}
                                
                                {/* Checkbox */}
                                <div className={`flex items-center justify-center w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 transition-all ${
                                  isSelected
                                    ? `bg-${categoryColor}-600 border-${categoryColor}-600 text-white shadow-sm`
                                    : "border-gray-300 bg-white/80 group-hover:border-gray-400"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                
                                {/* Icon */}
                                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                  isSelected
                                    ? `bg-${categoryColor}-500/20`
                                    : "bg-gray-100 group-hover:bg-gray-200"
                                }`}>
                                  <DocIcon className={`h-4 w-4 ${isSelected ? `text-${categoryColor}-600` : "text-gray-500"}`} />
                                </div>
                                
                                {/* Content */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <p className={`text-sm font-medium truncate ${isSelected ? "text-gray-800" : "text-gray-600"}`}>
                                      {doc.label}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500 font-[vazirmatn] truncate" dir="rtl">
                                    {doc.labelPersian}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">
                                    {doc.description}
                                  </p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Document Details */}
                {(formData.afghanistan_documents || []).length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-green-100/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-semibold text-gray-800">
                          Document Details
                        </p>
                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                          {(formData.afghanistan_documents || []).length} documents
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-[vazirmatn]">جزئیات اسناد انتخاب شده</p>
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.afghanistan_documents || []).map((docId) => {
                        const doc = AFGHANISTAN_DOCUMENT_OPTIONS.find((d) => d.id === docId)
                        if (!doc) return null
                        const details = formData.afghanistan_document_details?.[docId] || { 
                          documentNumber: "", 
                          dateIssued: "", 
                          expiryDate: "",
                          issuingAuthority: "",
                          issuingLocation: "",
                          remarks: "",
                          verified: false
                        }
                        
                        const categoryColor = doc.category === 'transport' ? 'blue' :
                          doc.category === 'customs' ? 'amber' :
                          doc.category === 'commercial' ? 'emerald' :
                          doc.category === 'health' ? 'rose' :
                          doc.category === 'insurance' ? 'purple' :
                          doc.category === 'driver' ? 'cyan' : 'red'
                        
                        const DocIcon = doc.icon === 'truck' ? Truck :
                          doc.icon === 'file-text' ? FileText :
                          doc.icon === 'receipt' ? Receipt :
                          doc.icon === 'list' ? List :
                          doc.icon === 'globe' ? Globe :
                          doc.icon === 'shield' ? Shield :
                          doc.icon === 'leaf' ? Leaf :
                          doc.icon === 'heart' ? Heart :
                          doc.icon === 'scale' ? Scale :
                          doc.icon === 'bookmark' ? Bookmark :
                          doc.icon === 'id-card' ? IdCard :
                          doc.icon === 'car' ? Car :
                          doc.icon === 'building' ? Building2 :
                          doc.icon === 'landmark' ? Landmark :
                          doc.icon === 'map-pin' ? MapPin :
                          doc.icon === 'user' ? User :
                          doc.icon === 'package' ? Package :
                          doc.icon === 'shield-check' ? ShieldCheck :
                          FileText
                          
                        return (
                          <div key={docId} className={`p-4 bg-linear-to-br from-${categoryColor}-50/50 to-white/40 backdrop-blur-sm rounded-xl border border-${categoryColor}-100/40 shadow-sm`}>
                            {/* Document Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100/50">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-${categoryColor}-500/20`}>
                                  <DocIcon className={`h-4 w-4 text-${categoryColor}-600`} />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-800">{doc.label}</p>
                                  <p className="text-xs text-gray-500 font-[vazirmatn]" dir="rtl">{doc.labelPersian}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleDocumentDetailChange(docId, "verified", !details.verified)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                    details.verified
                                      ? "bg-green-100 text-green-700 border border-green-200"
                                      : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                                  }`}
                                >
                                  {details.verified ? (
                                    <>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Verified
                                    </>
                                  ) : (
                                    <>
                                      <Circle className="h-3.5 w-3.5" />
                                      Mark Verified
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleAfghanistanDocument(docId)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Delete document"
                                  aria-label="Delete document"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Document Fields */}
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Document Number / شماره سند</label>
                                <Input
                                  value={details.documentNumber}
                                  onChange={(e) => handleDocumentDetailChange(docId, "documentNumber", e.target.value)}
                                  placeholder="e.g., TR-2024-001"
                                  className={`font-mono text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Date Issued / تاریخ صدور</label>
                                <Input
                                  type="date"
                                  value={details.dateIssued}
                                  onChange={(e) => handleDocumentDetailChange(docId, "dateIssued", e.target.value)}
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Expiry Date / تاریخ انقضا</label>
                                <Input
                                  type="date"
                                  value={details.expiryDate || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "expiryDate", e.target.value)}
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Issuing Authority / مرجع صادرکننده</label>
                                <Input
                                  value={details.issuingAuthority}
                                  onChange={(e) => handleDocumentDetailChange(docId, "issuingAuthority", e.target.value)}
                                  placeholder="e.g., Ministry of Commerce"
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Issuing Location / محل صدور</label>
                                <Input
                                  value={details.issuingLocation || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "issuingLocation", e.target.value)}
                                  placeholder="e.g., Kabul, Afghanistan"
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Remarks / یادداشت</label>
                                <Input
                                  value={details.remarks || ""}
                                  onChange={(e) => handleDocumentDetailChange(docId, "remarks", e.target.value)}
                                  placeholder="Additional notes..."
                                  className={`text-sm border-${categoryColor}-100/60 bg-white/60 backdrop-blur-sm focus:border-${categoryColor}-400 focus:ring-${categoryColor}-400/30 focus:bg-white/80`}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {(formData.afghanistan_documents || []).length === 0 && (
                  <div className="text-center py-8 px-4 bg-linear-to-br from-gray-50/50 to-white/30 rounded-xl border border-dashed border-gray-200">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">No documents selected</p>
                    <p className="text-xs text-gray-400 mt-1 font-[vazirmatn]">هیچ سندی انتخاب نشده است</p>
                    <p className="text-xs text-gray-400 mt-2">Select documents from the categories above to add details</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {/* Quick Watermark Floating Control Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-blue-200/80 bg-white/90 shadow-xl shadow-blue-500/5 backdrop-blur-xl print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span className="p-1 rounded-md bg-amber-500 text-white">✨</span>
                  <span>Watermark Preset:</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "🏔️ Mountain", url: "/images/afghan_mountain_blueprint_bg.jpg", opacity: 0.22 },
                    { label: "🚚 Truck Fleet", url: "/images/afghan_cargo_fleet_pass.jpg", opacity: 0.22 },
                    { label: "🚢 Ocean Ship", url: "/images/maritime_port_cargo_ship.jpg", opacity: 0.20 },
                    { label: "✈️ Air Plane", url: "/images/sky_freight_cargo_plane.jpg", opacity: 0.22 },
                    { label: "📐 Truck Blueprint", url: "/images/overland_transit_blueprint.svg", opacity: 0.18 },
                    { label: "🌊 Ship Blueprint", url: "/images/maritime_shipping_blueprint.svg", opacity: 0.18 },
                    { label: "📄 Clean", url: "", opacity: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setBgImageUrl(preset.url)
                        setBgOpacity(preset.opacity)
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        bgImageUrl === preset.url
                          ? "bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/40"
                          : "bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Opacity Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600">Opacity:</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.80"
                  step="0.02"
                  value={bgOpacity}
                  onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                  className="w-28 sm:w-36 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="text-xs font-black font-mono text-amber-700 w-8">
                  {Math.round(bgOpacity * 100)}%
                </span>
                
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsPrintDialogOpen(true)}
                  className="h-8 rounded-xl bg-linear-to-r from-blue-600 to-cyan-500 text-white font-extrabold text-xs shadow-md shadow-blue-500/20 hover:scale-105 transition-all ml-2"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  Print / Save PDF
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto max-w-full flex justify-center rounded-2xl sm:rounded-[30px] border border-white/80 bg-linear-to-br from-white/70 via-blue-50/45 to-cyan-50/30 p-1 sm:p-6 shadow-2xl shadow-blue-200/45 backdrop-blur-2xl ring-1 ring-blue-100/60 print:hidden">
              <div className="w-full max-w-[210mm] min-w-[210mm] transform-gpu transition-all origin-top scale-[0.50] xs:scale-[0.62] sm:scale-[0.85] md:scale-100 mb-[-120mm] xs:mb-[-90mm] sm:mb-[-25mm] md:mb-0">
                <A4Preview
                  bolNumber={bolNumber}
                  issueDate={issueDate}
                  persianDate={persianDate}
                  persianDateNumeric={persianDateNumeric}
                  formData={formData}
                  logoUrl={logoUrl}
                  companyName={companyName}
                  companyNamePersian={companyNamePersian}
                  companySubtitle={companySubtitle}
                  companyPhone={companyPhone}
                  companyEmail={companyEmail}
                  companyAddress={companyAddress}
                  companyLicence={companyLicence}
                  backgroundImageUrl={bgImageUrl}
                  backgroundOpacity={bgOpacity}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="saved-documents">
            <section className="min-h-0 rounded-[30px] border border-white/70 bg-white/45 p-3 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl print:hidden">
              {savedDocumentsPanel || (
                <SavedDocuments
                  onLoadDocument={(id, targetTab) => {
                    loadDocument(id)
                    setActiveTab(targetTab || "form")
                  }}
                />
              )}
            </section>
          </TabsContent>

          <TabsContent value="account">
            <section className="min-h-0 w-full overflow-hidden rounded-[30px] border border-white/70 bg-white/45 p-1 sm:p-2 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl print:hidden">
              {accountLedgerPanel || <LedgerView />}
            </section>
          </TabsContent>

          {/* PDF Settings Tab */}
          <TabsContent value="pdf-settings">
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Download className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="block font-black text-slate-950">PDF Download Console</span>
                      <span className="text-xs font-medium text-slate-500">Export, save, print, and review A4 output</span>
                    </div>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">تنظیمات PDF</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pb-6 pt-5">
                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-linear-to-br from-blue-50/80 to-white/60 border border-blue-200/50">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Download className="h-4 w-4 text-blue-600" />
                      Download PDF
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Download the current Bill of Lading as a PDF file directly to your device.</p>
                    <Button 
                      onClick={handleDownloadPDF} 
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Download PDF
                    </Button>
                  </div>
                  <div className="p-4 rounded-xl bg-linear-to-br from-green-50/80 to-white/60 border border-green-200/50">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      Save to Cloud
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">Save the PDF to cloud storage for easy access and sharing later.</p>
                    <Button 
                      onClick={handleExportPDF} 
                      disabled={isSaving || !formData.id}
                      variant="outline"
                      className="w-full border-green-300 text-green-700 hover:bg-green-50"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Save to Cloud
                    </Button>
                    {!formData.id && (
                      <p className="text-xs text-amber-600 mt-2">Save document first to enable cloud storage</p>
                    )}
                  </div>
                </div>

                {/* Document Mountain Scenery & Watermark Background Controls */}
                <div className="p-4 rounded-2xl bg-linear-to-br from-amber-50/90 via-sky-50/50 to-white border border-amber-200 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-amber-600" />
                      Document Mountain Background & Scenery Watermark
                    </span>
                    <span className="text-xs font-bold text-amber-800 font-[vazirmatn]">پس‌زمینه کوهستانی و واترمارک</span>
                  </h3>
                  <p className="text-xs text-slate-600 mb-4">
                    Select a high-resolution mountain scenery image to apply as an elegant, subtle watermark background across your Bill of Lading document.
                  </p>

                  {/* Preset Background Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/afghan_mountain_blueprint_bg.jpg")
                        setBgOpacity(0.22)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/afghan_mountain_blueprint_bg.jpg"
                          ? "border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-400/40"
                          : "border-slate-200 bg-white hover:border-amber-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">🏔️ Hindu Kush Mountain</span>
                        {bgImageUrl === "/images/afghan_mountain_blueprint_bg.jpg" && (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Snow Peaks & Blue Technical Vector Grid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/afghan_cargo_fleet_pass.jpg")
                        setBgOpacity(0.22)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/afghan_cargo_fleet_pass.jpg"
                          ? "border-orange-500 bg-orange-50/80 shadow-md ring-2 ring-orange-400/40"
                          : "border-slate-200 bg-white hover:border-orange-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">🚚 Truck Fleet Pass</span>
                        {bgImageUrl === "/images/afghan_cargo_fleet_pass.jpg" && (
                          <span className="w-2 h-2 rounded-full bg-orange-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Afghan Cargo Truck Fleet in Mountain Pass</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/maritime_port_cargo_ship.jpg")
                        setBgOpacity(0.20)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/maritime_port_cargo_ship.jpg"
                          ? "border-cyan-500 bg-cyan-50/80 shadow-md ring-2 ring-cyan-400/40"
                          : "border-slate-200 bg-white hover:border-cyan-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">🚢 Ocean Cargo Vessel</span>
                        {bgImageUrl === "/images/maritime_port_cargo_ship.jpg" && (
                          <span className="w-2 h-2 rounded-full bg-cyan-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Container Cargo Ship & Sea Port Terminal</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/sky_freight_cargo_plane.jpg")
                        setBgOpacity(0.22)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/sky_freight_cargo_plane.jpg"
                          ? "border-sky-500 bg-sky-50/80 shadow-md ring-2 ring-sky-400/40"
                          : "border-slate-200 bg-white hover:border-sky-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">✈️ Air Freight Aircraft</span>
                        {bgImageUrl === "/images/sky_freight_cargo_plane.jpg" && (
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Commercial Cargo Plane Above Sunset Clouds</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/overland_transit_blueprint.svg")
                        setBgOpacity(0.18)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/overland_transit_blueprint.svg"
                          ? "border-indigo-500 bg-indigo-50/80 shadow-md ring-2 ring-indigo-400/40"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">📐 Truck Vector Blueprint</span>
                        {bgImageUrl === "/images/overland_transit_blueprint.svg" && (
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Heavy Transit Semi-Trailer Technical Drawing</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/maritime_shipping_blueprint.svg")
                        setBgOpacity(0.18)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/maritime_shipping_blueprint.svg"
                          ? "border-teal-500 bg-teal-50/80 shadow-md ring-2 ring-teal-400/40"
                          : "border-slate-200 bg-white hover:border-teal-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">🌊 Ship Vector Blueprint</span>
                        {bgImageUrl === "/images/maritime_shipping_blueprint.svg" && (
                          <span className="w-2 h-2 rounded-full bg-teal-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">Ocean Container Cargo Vessel Grid Schematic</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("/images/air_cargo_blueprint.svg")
                        setBgOpacity(0.18)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        bgImageUrl === "/images/air_cargo_blueprint.svg"
                          ? "border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-400/40"
                          : "border-slate-200 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">🛩️ Flight Route Blueprint</span>
                        {bgImageUrl === "/images/air_cargo_blueprint.svg" && (
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">International Aviation Flight Path Grid</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBgImageUrl("")
                        setBgOpacity(0)
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        !bgImageUrl
                          ? "border-slate-700 bg-slate-100 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-slate-900">📄 Clean Canvas (No Picture)</span>
                        {!bgImageUrl && <span className="w-2 h-2 rounded-full bg-slate-700" />}
                      </div>
                      <span className="text-[10px] text-slate-500">Standard Light Gradient Paper</span>
                    </button>
                  </div>

                  {/* Opacity Slider */}
                  {bgImageUrl && (
                    <div className="flex items-center gap-4 bg-white/80 p-3 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-700 shrink-0">Watermark Opacity:</label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.55"
                        step="0.01"
                        value={bgOpacity}
                        onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                        className="flex-1 accent-amber-600 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-amber-900 w-12 text-right">
                        {Math.round(bgOpacity * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* PDF Info */}
                <div className="p-4 rounded-xl bg-linear-to-br from-gray-50/80 to-white/60 border border-gray-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-600" />
                    PDF Information
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Format</p>
                      <p className="font-medium text-gray-800">A4 (210mm x 297mm)</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Orientation</p>
                      <p className="font-medium text-gray-800">Portrait</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Quality</p>
                      <p className="font-medium text-gray-800">High (2x scale)</p>
                    </div>
                  </div>
                </div>

                {/* Print Option */}
                <div className="p-4 rounded-xl bg-linear-to-br from-purple-50/80 to-white/60 border border-purple-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-purple-600" />
                    Print Document
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">Print the Bill of Lading directly using your browser&apos;s print dialog.</p>
                  <Button 
                    onClick={() => setIsPrintDialogOpen(true)}
                    disabled={isSaving}
                    variant="outline"
                    className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Document
                  </Button>
                </div>

                {/* Tips */}
                <div className="p-4 rounded-xl bg-linear-to-br from-amber-50/80 to-white/60 border border-amber-200/50">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Tips for Best Results
                  </h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Fill in all required fields before generating PDF</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Preview the document in the A4 Preview tab first</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Use high-resolution logos for better print quality</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>Save the document before using cloud storage</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Logo Editor */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-sm md:text-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <ImageIcon className="h-4 w-4 text-white shrink-0" />
                    </div>
                    <span className="font-semibold text-gray-800">Company Logo</span>
                  </div>
                  <span className="text-xs md:text-sm font-normal text-blue-600/80 font-[vazirmatn]">لوگوی شرکت</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 pb-6">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-blue-200/60 bg-linear-to-br from-white/80 to-blue-50/50 backdrop-blur-sm flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Company Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <p className="text-xs md:text-sm text-gray-600">Upload your company logo for the Bill of Lading</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload-settings"
                        title="Upload company logo"
                        aria-label="Upload company logo"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="text-xs md:text-sm h-8 md:h-9 border-blue-200/60 bg-white/50 hover:bg-blue-50/80 hover:border-blue-300 shadow-sm"
                      >
                        <Upload className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1 text-blue-600" />
                        Upload Logo
                      </Button>
                      {logoUrl !== "/images/logo.png" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetLogo}
                          className="text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 text-xs md:text-sm h-8 md:h-9"
                        >
                          <RotateCcw className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
                          Reset
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">Recommended: PNG or SVG, max 200x100px</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Company Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات شرکت</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block text-gray-700">Company Name (English)</label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="SKY ARIANA & BALAM BAR BARAN"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block font-[vazirmatn] text-gray-700" dir="rtl">نام شرکت (فارسی)</label>
                    <Input
                      value={companyNamePersian}
                      onChange={(e) => setCompanyNamePersian(e.target.value)}
                      placeholder="شرکت حمل و نقل بین المللی"
                      dir="rtl"
                      className="font-[vazirmatn] glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Subtitle / Description</label>
                  <Input
                    value={companySubtitle}
                    onChange={(e) => setCompanySubtitle(e.target.value)}
                    placeholder="Import & Export - International Transportation"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                      <Phone className="h-3.5 w-3.5 text-blue-500" />
                      Phone
                    </label>
                    <Input
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      placeholder="+93 700 000 000"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      Email
                    </label>
                    <Input
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Address</label>
                  <Input
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    placeholder="2nd Floor, 16 No. Office, Shahidano, Chowk..."
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Licence Number</label>
                  <Input
                    value={companyLicence}
                    onChange={(e) => setCompanyLicence(e.target.value)}
                    placeholder="2401-2198"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Iran Office Information */}
            <Card className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
              <CardHeader className="pb-4 border-b border-white/50 bg-white/40">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Iran Office Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات دفتر ایران</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Building / ساختمان</label>
                  <Input
                    value={formData.iran_office_building || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_building: e.target.value })}
                    placeholder="CUBIC BUILDING"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Location / موقعیت</label>
                  <Input
                    value={formData.iran_office_location || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_location: e.target.value })}
                    placeholder="BANDAR ABBASS - IRAN"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">P.O. Box / صندوق پستی</label>
                  <Input
                    value={formData.iran_office_pobox || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_pobox: e.target.value })}
                    placeholder="7913973295"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Telefax / تلفکس</label>
                  <Input
                    value={formData.iran_office_telefax || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_telefax: e.target.value })}
                    placeholder="+98 76 32226028"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Cell Phone / تلفن همراه</label>
                  <Input
                    value={formData.iran_office_cellphone || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_cellphone: e.target.value })}
                    placeholder="+98 09172325086"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-gray-700">Email / ایمیل</label>
                  <Input
                    value={formData.iran_office_email || ""}
                    onChange={(e) => setFormData({ ...formData, iran_office_email: e.target.value })}
                    placeholder="info@balambarbaran.com"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Print-only A4 Preview */}
        <PrintPreviewPortal>
          <div
            id="bol-print-preview"
            data-print-root="true"
            className="hidden print:block print:min-h-[297mm] print:w-[210mm] print:overflow-visible"
          >
            <PrintSafeBOL>
              <A4Preview
                bolNumber={bolNumber}
                issueDate={issueDate}
                persianDate={persianDate}
                persianDateNumeric={persianDateNumeric}
                formData={formData}
                logoUrl={logoUrl}
                companyName={companyName}
                companyNamePersian={companyNamePersian}
                companySubtitle={companySubtitle}
                companyPhone={companyPhone}
                companyEmail={companyEmail}
                companyAddress={companyAddress}
                companyLicence={companyLicence}
                includeColorStrip={activePrintOptions.includeColorStrip}
                backgroundImageUrl={bgImageUrl}
                backgroundOpacity={bgOpacity}
              />
            </PrintSafeBOL>
          </div>
        </PrintPreviewPortal>

        {/* Dedicated PDF export source. Keep it rendered, but outside the viewport. */}
        <div
          data-pdf-export="true"
          aria-hidden="true"
          className="fixed top-0 left-0 w-[210mm] min-h-[297mm] opacity-0 pointer-events-none z-[-9999] overflow-hidden print:hidden"
        >
          <A4Preview
            bolNumber={bolNumber}
            issueDate={issueDate}
            persianDate={persianDate}
            persianDateNumeric={persianDateNumeric}
            formData={formData}
            logoUrl={logoUrl}
            companyName={companyName}
            companyNamePersian={companyNamePersian}
            companySubtitle={companySubtitle}
            companyPhone={companyPhone}
            companyEmail={companyEmail}
            companyAddress={companyAddress}
            companyLicence={companyLicence}
            backgroundImageUrl={bgImageUrl}
            backgroundOpacity={bgOpacity}
            pdfExport
          />
        </div>
      </div>

      {/* Print Options Dialog */}
      <PrintOptionsDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        onPrint={handlePrint}
        isPrinting={isSaving}
      />
    </div>
  )
}
