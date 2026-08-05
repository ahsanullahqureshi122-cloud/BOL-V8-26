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
import { Printer, Save, FileText, Eye, Plus, Loader2, Calendar, Truck, MapPin, Trash2, ArrowRight, Package, Edit3, ImageIcon, Upload, RotateCcw, ScrollText, Check, Download, Building2, Phone, Mail, Ship, Plane, Train, AlertCircle, User, Bell, Globe, Shield, Leaf, Heart, Scale, Bookmark, IdCard, Car, Landmark, ShieldCheck, Receipt, List, ChevronDown, ChevronUp, Info, CheckCircle2, Circle, Sparkles } from "lucide-react"
import { formatPersianDate, getDualDates } from "@/lib/utils/persian-date"
import {
  generateBOLPDFBlob,
  uploadPDFToServer,
  savePDFToDevice,
  openPDFPrintWindow,
  printPDFBlobInWindow,
} from "@/lib/utils/pdf-upload"
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
const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"
const ACCOUNT_LEDGER_STORAGE_KEY = "sky-bol-company-ledgers"
const SHIPPER_SEED_LIST = shipperSeedData as SavedParty[]
const CONSIGNEE_SEED_LIST = consigneeSeedData as SavedParty[]
const NOTIFY_PARTY_SEED_LIST = notifyPartySeedData as SavedParty[]

interface AccountLedgerEntry {
  id: string
  date: string
  description: string
  invoiceNo: string
  shipDate: string
  bolNo: string
  truckNo?: string
  containerNo: string
  consignee: string
  quantity: string
  driverRent?: string
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
  const storedCompanies = JSON.parse(window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY) || "[]") as string[]
  const hasCompany = storedCompanies.some((companyName) => accountCompanyKey(companyName) === companyKey)

  if (!hasCompany) {
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify([...storedCompanies, shipperName]))
  }

  const records = JSON.parse(window.localStorage.getItem(ACCOUNT_LEDGER_STORAGE_KEY) || "{}") as AccountLedgerRecords
  const existingRow = Object.values(records)
    .flat()
    .find((row) => row.bolNo.trim() === bolNo)
  const nextRow: AccountLedgerEntry = {
    id: existingRow?.id || crypto.randomUUID(),
    date: existingRow?.date || data.issue_date || new Date().toISOString().split("T")[0],
    description: shipperName,
    invoiceNo: getInvoiceNoFromDescription(data.cargo_description),
    shipDate: existingRow?.shipDate || data.issue_date || "",
    bolNo,
    truckNo: data.truck_number || "",
    containerNo: data.container_numbers || "",
    consignee: data.consignee_name || "",
    quantity: data.number_of_packages || "",
    driverRent: data.driver_rent || "",
    debit: existingRow?.debit || "",
    credit: existingRow?.credit || "",
    pdfFile: existingRow?.pdfFile || "",
  }

  const nextRecords = Object.fromEntries(
    Object.entries(records).map(([key, rows]) => [key, rows.filter((row) => row.bolNo.trim() !== bolNo)])
  ) as AccountLedgerRecords

  const companyRows = nextRecords[companyKey] || []
  nextRecords[companyKey] = [...companyRows, nextRow]

  window.localStorage.setItem(ACCOUNT_LEDGER_STORAGE_KEY, JSON.stringify(nextRecords))
  window.dispatchEvent(
    new CustomEvent("skybol:account-ledger-updated", {
      detail: { companyName: shipperName, bolNo },
    })
  )
}

export function BOLEditor({ onSave, onRefreshDocuments, loadDocumentId, onDocumentLoaded, savedDocumentsPanel, accountLedgerPanel }: BOLEditorProps) {
  const [formData, setFormData] = useState<BillOfLadingFormData>(initialFormData)
  const [bolNumber, setBolNumber] = useState<string>("BOL-001")
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
  const [isEditMode, setIsEditMode] = useState(false)
  const [editDocumentId, setEditDocumentId] = useState<string | null>(null)
  const [activeRouteIndex, setActiveRouteIndex] = useState<number | null>(null)
  const [savedShippers, setSavedShippers] = useState<SavedParty[]>([])
  const [selectedShipperId, setSelectedShipperId] = useState<string>("")
  const [savedConsignees, setSavedConsignees] = useState<SavedParty[]>([])
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string>("")
  const [savedNotifyParties, setSavedNotifyParties] = useState<SavedParty[]>([])
  const [selectedNotifyPartyId, setSelectedNotifyPartyId] = useState<string>("")
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

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
      const mergedShippers = mergeSavedParties(SHIPPER_SEED_LIST, storedShippers)
      const mergedConsignees = mergeSavedParties(CONSIGNEE_SEED_LIST, storedConsignees)
      const mergedNotifyParties = mergeSavedParties(NOTIFY_PARTY_SEED_LIST, storedNotifyParties)

      setSavedShippers(mergedShippers)
      setSavedConsignees(mergedConsignees)
      setSavedNotifyParties(mergedNotifyParties)
      window.localStorage.setItem(SAVED_SHIPPERS_STORAGE_KEY, JSON.stringify(mergedShippers))
      window.localStorage.setItem(SAVED_CONSIGNEES_STORAGE_KEY, JSON.stringify(mergedConsignees))
      window.localStorage.setItem(SAVED_NOTIFY_PARTIES_STORAGE_KEY, JSON.stringify(mergedNotifyParties))
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
      const response = await fetch(`/api/bol/${id}`)
      const result = await response.json()
      if (result.data) {
        const doc = result.data
        setBolNumber(doc.bol_number)
        setIssueDate(doc.issue_date)
        setEditDocumentId(id)
        setIsEditMode(true)
        const dualDates = getDualDates(doc.issue_date)
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
      }
    } catch (error) {
      console.error("[v0] Error loading document:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNextBolNumber = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/bol?action=next-number")
      const result = await response.json()
      if (result.bolNumber) {
        setBolNumber(result.bolNumber)
      }
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

  const saveCurrentShipper = () => {
    const shipperName = formData.shipper_name.trim()
    if (!shipperName) {
      toast.error("Add shipper name first", {
        description: "Enter a shipper name before saving it.",
      })
      return
    }

    const currentShipper: SavedParty = {
      id: selectedShipperId || crypto.randomUUID(),
      name: shipperName,
      address: formData.shipper_address || "",
      contact: formData.shipper_contact || "",
      email: formData.shipper_email || "",
      savedAt: new Date().toISOString(),
    }

    const nextShippers = [
      currentShipper,
      ...savedShippers.filter(
        (shipper) =>
          shipper.id !== currentShipper.id &&
          shipper.name.trim().toLowerCase() !== shipperName.toLowerCase()
      ),
    ].slice(0, 50)

    persistSavedParties(SAVED_SHIPPERS_STORAGE_KEY, nextShippers, setSavedShippers)
    setSelectedShipperId(currentShipper.id)
    toast.success("Shipper saved", {
      description: `${currentShipper.name} is available for future BOLs.`,
    })
  }

  const applySavedShipper = (shipperId: string) => {
    const shipper = savedShippers.find((item) => item.id === shipperId)
    if (!shipper) return

    setSelectedShipperId(shipperId)
    setFormData((prev) => ({
      ...prev,
      shipper_name: shipper.name,
      shipper_address: shipper.address,
      shipper_contact: shipper.contact,
      shipper_email: shipper.email,
    }))
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

    const currentConsignee: SavedParty = {
      id: selectedConsigneeId || crypto.randomUUID(),
      name: consigneeName,
      address: formData.consignee_address || "",
      contact: formData.consignee_contact || "",
      email: formData.consignee_email || "",
      savedAt: new Date().toISOString(),
    }

    const nextConsignees = [
      currentConsignee,
      ...savedConsignees.filter(
        (consignee) =>
          consignee.id !== currentConsignee.id &&
          consignee.name.trim().toLowerCase() !== consigneeName.toLowerCase()
      ),
    ].slice(0, 50)

    persistSavedParties(SAVED_CONSIGNEES_STORAGE_KEY, nextConsignees, setSavedConsignees)
    setSelectedConsigneeId(currentConsignee.id)
    toast.success("Consignee saved", {
      description: `${currentConsignee.name} is available for future BOLs.`,
    })
  }

  const applySavedConsignee = (consigneeId: string) => {
    const consignee = savedConsignees.find((item) => item.id === consigneeId)
    if (!consignee) return

    setSelectedConsigneeId(consigneeId)
    setFormData((prev) => ({
      ...prev,
      consignee_name: consignee.name,
      consignee_address: consignee.address,
      consignee_contact: consignee.contact,
      consignee_email: consignee.email,
    }))
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

  const handleRouteChange = (index: number, field: keyof RouteStop, value: string) => {
    setFormData((prev) => {
      const newRoutes = [...prev.routes]
      newRoutes[index] = { ...newRoutes[index], [field]: value }
      return { ...prev, routes: newRoutes }
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
      const method = isEditMode ? "PUT" : "POST"
      const url = isEditMode ? `/api/bol/${editDocumentId}` : "/api/bol"
      
      // Include the BOL number in the request
      const dataToSend = {
        ...formData,
        bol_number: bolNumber,
        issue_date: issueDate,
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
        // Update form data with saved IDs for PDF storage linking
        const updatedFormData = {
          ...formData,
          id: result.data.id,
          bol_number: result.data.bol_number,
          issue_date: result.data.issue_date || issueDate,
        }
        setFormData(updatedFormData)
        syncBolToAccountLedger(updatedFormData)
        
        onSave?.(updatedFormData)
        onRefreshDocuments?.()
        
        // Show success toast with BOL number
        const action = isEditMode ? "updated" : "saved"
        toast.success(`Document ${action} successfully!`, {
          description: `BOL ${result.data.bol_number} ${action} in your documents library`,
        })
        
        // If creating new, reset form and get next number
        if (!isEditMode) {
          setFormData(initialFormData)
          setIsEditMode(false)
          setEditDocumentId(null)
          await fetchNextBolNumber()
          const today = new Date().toISOString().split("T")[0]
          setIssueDate(today)
          const dualDates = getDualDates(today)
          if (dualDates) {
            setPersianDate(dualDates.persian)
            setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
          }
        }
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
    setBolNumber("BOL-001")
    fetchNextBolNumber()
    const today = new Date().toISOString().split("T")[0]
    setIssueDate(today)
    const dualDates = getDualDates(today)
    if (dualDates) {
      setPersianDate(dualDates.persian)
      setPersianDateNumeric(formatPersianDate(today) ?? dualDates.persianNumeric)
    }
  }

  const handleExportPDF = async () => {
    try {
      if (!formData.id) {
        toast.error("Document not saved", {
          description: "Please save the document first before exporting to PDF",
        })
        return
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
        formData.id,
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
      const toastId = toast.loading("Opening print preview...", {
        description: "Preparing the BOL print layout. Use your browser print dialog to print or save as PDF.",
      })

      if (typeof window !== "undefined" && typeof window.print === "function") {
        window.print()
        toast.success("Print preview opened", {
          id: toastId,
          description: "Use the browser print dialog to print the document or save it as PDF.",
        })
        setIsSaving(false)
        return
      }

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
              description: `Quality: ${options.quality}`,
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
        const copyText = options.copies > 1 ? `(${options.copies} copies)` : ""
        toast.success("PDF preview opened", {
          id: toastId,
          description: `${options.quality} quality. Review and use the Print button in the preview window ${copyText}`,
        })
      } else {
        toast.error("Failed to open print PDF", {
          id: toastId,
        })
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

  return (
    <div className="min-h-screen bg-transparent print:min-h-0 print:bg-white print:overflow-visible">
      {/* Action Bar - Mobile optimized */}
      <div className="sticky top-0 z-20 rounded-3xl border border-white/70 bg-white/60 px-3 py-2 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl md:px-4 md:py-3 print:hidden">
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
              <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-blue-100 bg-white/70 px-2 py-0.5 text-xs md:text-sm">
                <span className="text-slate-600 font-[vazirmatn]" dir="rtl">
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
              onClick={handleNewDocument}
              className="h-8 rounded-2xl border-blue-100 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
            >
              <Plus className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              <span className="hidden sm:inline">New</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPrintDialogOpen(true)}
              disabled={isSaving}
              className="h-8 rounded-2xl border-blue-100 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer className="h-3.5 md:h-4 w-3.5 md:w-4 mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            {isEditMode && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleNewDocument}
                className="h-8 rounded-2xl border-blue-100 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
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
              onClick={handleDownloadPDF} 
              disabled={isSaving}
              className="h-8 rounded-2xl border-blue-100 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
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
              className="h-8 rounded-2xl border-blue-100 bg-white/75 px-2 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-50 md:h-9 md:px-3 md:text-sm"
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
            {/* Document Info - Editable Dates */}
            <Card className="glass-card overflow-hidden rounded-[28px] border-white/70 bg-white/55 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl">
              <CardHeader className="glass-header pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 p-2 shadow-lg shadow-blue-300/50">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Document Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات سند</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">BOL Number / شماره بارنامه</label>
                    {isEditingBolNumber ? (
                      <div className="flex gap-2">
                        <Input
                          value={bolNumber}
                          onChange={(e) => setBolNumber(e.target.value)}
                          className="font-mono font-bold glass-input rounded-xl h-11"
                          placeholder="BOL-XXX"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingBolNumber(false)}
                          className="glass-input rounded-xl"
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 px-4 py-2.5 bg-linear-to-br from-blue-50/80 to-white/60 backdrop-blur-sm rounded-xl font-mono font-bold text-blue-700 border border-blue-100/50">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : bolNumber}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setIsEditingBolNumber(true)}
                          className="h-10 w-10 rounded-xl hover:bg-blue-50/50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Issue Date (Gregorian) / تاریخ میلادی</label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="font-mono glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Issue Date (Persian) / تاریخ شمسی</label>
                    <div className="px-4 py-2.5 bg-linear-to-br from-blue-50/80 to-white/60 backdrop-blur-sm rounded-xl border border-blue-100/50">
                      <p className="font-[vazirmatn] text-sm text-gray-800" dir="rtl">{persianDate}</p>
                      <p className="font-[vazirmatn] text-xs text-gray-500" dir="rtl">{persianDateNumeric}</p>
                    </div>
                  </div>
                </div>
                
                {/* Notes Boxes */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Note 1 */}
                  <div className={`p-4 rounded-2xl backdrop-blur-xl border shadow-sm ${getNoteThemeStyles(formData.notes_1_theme).container}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${getNoteThemeStyles(formData.notes_1_theme).label}`}>
                        <Input
                          type="text"
                          value={formData.notes_1_label || ""}
                          onChange={(e) => setFormData({ ...formData, notes_1_label: e.target.value })}
                          className={`h-7 p-2 text-xs font-medium backdrop-blur-sm rounded-lg ${getNoteThemeStyles(formData.notes_1_theme).input}`}
                        />
                      </label>
                      <div className="flex items-center gap-1">
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
                    <div className="flex items-center justify-between mb-2">
                      <label className={`text-sm font-medium ${getNoteThemeStyles(formData.notes_2_theme).label}`}>
                        <Input
                          type="text"
                          value={formData.notes_2_label || ""}
                          onChange={(e) => setFormData({ ...formData, notes_2_label: e.target.value })}
                          className={`h-7 p-2 text-xs font-medium backdrop-blur-sm rounded-lg ${getNoteThemeStyles(formData.notes_2_theme).input}`}
                        />
                      </label>
                      <div className="flex items-center gap-1">
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
              <Card className="glass-card rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 glass-header">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800">Shipper</span>
                    </div>
                    <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">فرستنده</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-5 pb-6">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="text-sm text-gray-600 mb-2 block">Saved Shippers / فرستنده‌های ذخیره شده</label>
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
                          <SelectTrigger className="h-11 glass-input rounded-xl bg-white/90">
                            <SelectValue placeholder="Select saved shipper" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select saved shipper</SelectItem>
                            {savedShippers.map((shipper, index) => (
                              <SelectItem key={`${shipper.id}-${index}`} value={shipper.id}>
                                {shipper.name}
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
                          className="h-11 border-blue-200 bg-white/80 px-3 text-blue-700 hover:bg-blue-50"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={deleteSavedShipper}
                          disabled={!selectedShipperId}
                          className="h-11 border-red-100 bg-white/80 px-3 text-red-600 hover:bg-red-50 disabled:text-slate-300"
                          aria-label="Delete saved shipper"
                          title="Delete saved shipper"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Name / نام</label>
                    <Input
                      name="shipper_name"
                      value={formData.shipper_name}
                      onChange={handleInputChange}
                      placeholder="Enter shipper name"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Address / آدرس</label>
                    <Textarea
                      name="shipper_address"
                      value={formData.shipper_address}
                      onChange={handleInputChange}
                      placeholder="Enter shipper address"
                      rows={3}
                      className="glass-input rounded-xl min-h-20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Phone / تلفن</label>
                    <Input
                      name="shipper_contact"
                      value={formData.shipper_contact || ""}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      type="tel"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Email / ایمیل</label>
                    <Input
                      name="shipper_email"
                      value={formData.shipper_email || ""}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      type="email"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 glass-header">
                  <CardTitle className="text-base flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-linear-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/25">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-gray-800">Consignee</span>
                    </div>
                    <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">گیرنده</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-5 pb-6">
                  <div className="rounded-xl border border-green-100 bg-green-50/40 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="text-sm text-gray-900 mb-2 block">Saved Consignees / گیرنده‌های ذخیره شده</label>
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
                          <SelectTrigger className="h-11 glass-input rounded-xl bg-white/90">
                            <SelectValue placeholder="Select saved consignee" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select saved consignee</SelectItem>
                            {savedConsignees.map((consignee, index) => (
                              <SelectItem key={`${consignee.id}-${index}`} value={consignee.id}>
                                {consignee.name}
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
                          className="h-11 border-green-200 bg-white/80 px-3 text-green-700 hover:bg-green-50"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={deleteSavedConsignee}
                          disabled={!selectedConsigneeId}
                          className="h-11 border-red-100 bg-white/80 px-3 text-red-600 hover:bg-red-50 disabled:text-slate-300"
                          aria-label="Delete saved consignee"
                          title="Delete saved consignee"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Name / نام</label>
                    <Input
                      name="consignee_name"
                      value={formData.consignee_name}
                      onChange={handleInputChange}
                      placeholder="Enter consignee name"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Address / آدرس</label>
                    <Textarea
                      name="consignee_address"
                      value={formData.consignee_address}
                      onChange={handleInputChange}
                      placeholder="Enter consignee address"
                      rows={3}
                      className="glass-input rounded-xl min-h-20"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Phone / تلفن</label>
                    <Input
                      name="consignee_contact"
                      value={formData.consignee_contact || ""}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      type="tel"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Email / ایمیل</label>
                    <Input
                      name="consignee_email"
                      value={formData.consignee_email || ""}
                      onChange={handleInputChange}
                      placeholder="Enter email address"
                      type="email"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notify Party */}
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-amber-500 to-amber-600 shadow-md shadow-amber-500/30">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Notify Party</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">طرف اطلاع رسانی</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="text-sm text-gray-600 mb-2 block">Saved Notify Parties / طرف‌های اطلاع ذخیره شده</label>
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
                        <SelectTrigger className="h-11 glass-input rounded-xl bg-white/90">
                          <SelectValue placeholder="Select saved notify party" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Select saved notify party</SelectItem>
                          {savedNotifyParties.map((notifyParty, index) => (
                            <SelectItem key={`${notifyParty.id}-${index}`} value={notifyParty.id}>
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
                        className="h-11 border-amber-200 bg-white/80 px-3 text-amber-700 hover:bg-amber-50"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={deleteSavedNotifyParty}
                        disabled={!selectedNotifyPartyId}
                        className="h-11 border-red-100 bg-white/80 px-3 text-red-600 hover:bg-red-50 disabled:text-slate-300"
                        aria-label="Delete saved notify party"
                        title="Delete saved notify party"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Name / نام</label>
                    <Input
                      name="notify_party"
                      value={formData.notify_party}
                      onChange={handleInputChange}
                      placeholder="Enter notify party name"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Address / آدرس</label>
                    <Input
                      name="notify_party_address"
                      value={formData.notify_party_address}
                      onChange={handleInputChange}
                      placeholder="Enter notify party address"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cargo Details */}
            <Card className="glass-card overflow-hidden rounded-[28px] border-white/70 bg-white/55 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl">
              <CardHeader className="pb-3 glass-header">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-linear-to-br from-purple-500 to-purple-600 shadow-md shadow-purple-500/30">
                      <Package className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Cargo Details</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">جزئیات محموله</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-5 pb-6">
                <div className="grid md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Container No. / شماره کانتینر</label>
                    <Input
                      name="container_numbers"
                      value={formData.container_numbers}
                      onChange={handleInputChange}
                      placeholder="Container numbers"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Seal No. / شماره پلمپ</label>
                    <Input
                      name="seal_numbers"
                      value={formData.seal_numbers}
                      onChange={handleInputChange}
                      placeholder="Seal numbers"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">No. of Packages / تعداد بسته</label>
                    <Input
                      name="number_of_packages"
                      value={formData.number_of_packages}
                      onChange={handleInputChange}
                      placeholder="Package count"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">KGS per Carton / کیلو فی کارتن</label>
                    <Input
                      name="kgs_per_carton"
                      value={formData.kgs_per_carton}
                      onChange={handleInputChange}
                      placeholder="e.g., 12.5"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Gross Weight per Carton KGS / وزن ناخالص فی کارتن</label>
                    <Input
                      name="gross_weight_per_carton"
                      value={formData.gross_weight_per_carton}
                      onChange={handleInputChange}
                      placeholder="e.g., 13"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Rate per KGS / نرخ فی کیلو</label>
                    <Input
                      name="rate_per_kgs"
                      value={formData.rate_per_kgs}
                      onChange={handleInputChange}
                      placeholder="e.g., $1.20"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-900 mb-2 block">Goods Value / ارزش کالا</label>
                    <Input
                      name="goods_value"
                      value={formData.goods_value}
                      onChange={handleInputChange}
                      placeholder="e.g., 1000"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Net Weight / وزن خالص</label>
                    <Input
                      name="net_weight"
                      value={formData.net_weight}
                      onChange={handleInputChange}
                      placeholder="e.g., 4,800 KG"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Gross Weight / وزن ناخالص</label>
                    <Input
                      name="gross_weight"
                      value={formData.gross_weight}
                      onChange={handleInputChange}
                      placeholder="e.g., 5,000 KG"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Description / شرح کالا</label>
                  <Textarea
                    name="cargo_description"
                    value={formData.cargo_description}
                    onChange={handleInputChange}
                    placeholder="Detailed cargo description"
                    rows={4}
                    className="glass-input rounded-xl min-h-25"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 mb-2 block">Measurement / حجم</label>
                    <Input
                      name="measurement"
                      value={formData.measurement}
                      onChange={handleInputChange}
                      placeholder="e.g., 25 CBM"
                      className="glass-input rounded-xl h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Truck Information */}
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
                      <Truck className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-800">Truck Information</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">اطلاعات کامیون</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 pt-5 pb-6">
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Truck No. / شماره کامیون</label>
                  <Input
                    name="truck_number"
                    value={formData.truck_number}
                    onChange={handleInputChange}
                    placeholder="e.g., AF-1234-KBL"
                    className="font-mono glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Driver Name / نام راننده</label>
                  <Input
                    name="driver_name"
                    value={formData.driver_name}
                    onChange={handleInputChange}
                    placeholder="Enter driver name"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Father Name / نام پدر</label>
                  <Input
                    name="driver_father_name"
                    value={formData.driver_father_name}
                    onChange={handleInputChange}
                    placeholder="Father's name"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-2 block">Driver Contact / تماس راننده</label>
                  <Input
                    name="driver_contact"
                    value={formData.driver_contact}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                    className="glass-input rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm text-red-600 mb-2 block font-medium">Driver Rent / کرایه راننده</label>
                  <Input
                    name="driver_rent"
                    value={formData.driver_rent}
                    onChange={handleInputChange}
                    placeholder="e.g., $500"
                    className="border-red-200/60 bg-red-50/60 backdrop-blur-sm focus-visible:ring-red-400/30 text-red-600 rounded-xl h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Routes - Multiple Stops */}
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                      <div className="p-3 rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                    <span className="font-semibold text-gray-800">Route Stops</span>
                  </div>
                  <span className="text-sm font-normal text-blue-600/80 font-[vazirmatn]">مسیر حمل</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-5 pb-6">
                <div className="rounded-xl border border-blue-100/70 bg-white/70 px-3 py-3 shadow-sm">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {formData.routes.map((route, index) => (
                      <div key={route.id} className="flex items-center gap-2 shrink-0">
                        <div className="min-w-36 rounded-lg border border-blue-100 bg-linear-to-br from-blue-50/80 to-white px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
                              {index + 1}
                            </span>
                            {getTransportIcon(route.transportMode)}
                            <span className="text-[12px] font-semibold uppercase tracking-wide text-blue-600">
                              {getRouteStopLabel(index, formData.routes.length)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-semibold text-gray-800">
                            {route.location || getRouteStopLabel(index, formData.routes.length)}
                          </p>
                          {route.locationPersian && (
                            <p className="truncate text-xs text-gray-500 font-[vazirmatn]" dir="rtl">{route.locationPersian}</p>
                          )}
                        </div>
                        {index < formData.routes.length - 1 && (
                          <ArrowRight className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.routes.map((route, index) => (
                    <div key={route.id} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-linear-to-br from-blue-600 to-cyan-500 text-lg font-semibold text-white shadow-md shadow-blue-500/20">
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{getRouteStopLabel(index, formData.routes.length)}</p>
                            <p className="text-xs text-gray-500 font-[vazirmatn]" dir="rtl">{getRouteStopLabelPersian(index, formData.routes.length)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 border border-red-100 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 disabled:border-slate-100 disabled:text-slate-300"
                          onClick={() => removeRouteStop(index)}
                          disabled={formData.routes.length <= 2}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.35fr]">
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">
                            Location (English) / {getRouteStopLabelPersian(index, formData.routes.length)}
                          </label>
                          <Input
                            value={route.location}
                            onFocus={() => setActiveRouteIndex(index)}
                            onChange={(e) => {
                              setActiveRouteIndex(index)
                              handleRouteChange(index, "location", e.target.value)
                            }}
                            placeholder={getRouteStopLabel(index, formData.routes.length)}
                            className="glass-input rounded-xl h-11"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Location (Persian) / موقعیت فارسی</label>
                          <Input
                            value={route.locationPersian}
                            onChange={(e) => handleRouteChange(index, "locationPersian", e.target.value)}
                            placeholder="نام محل"
                            dir="rtl"
                            className="font-[vazirmatn] border-blue-100/60 bg-white/60 backdrop-blur-sm focus:border-blue-400 focus:ring-blue-400/30 focus:bg-white/80"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 mb-1 block">Transport Mode / حالت حمل</label>
                          <Select value={route.transportMode || "none"} onValueChange={(value) => handleRouteChange(index, "transportMode", value === "none" ? undefined : (value as any))}>
                            <SelectTrigger className="h-auto py-2.5 glass-input rounded-xl">
                              <SelectValue placeholder="Select mode">
                                <div className="flex items-center gap-2.5">
                                  {getTransportIcon(route.transportMode)}
                                  <div className="text-left">
                                    <span className="font-medium text-sm">{getTransportLabel(route.transportMode)}</span>
                                  </div>
                                </div>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="w-full">
                              <SelectItem value="none">
                                <div className="flex items-center gap-2.5">
                                  <MapPin className="h-6 w-6 text-gray-500" />
                                  <span>None / انتخاب نکنید</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="truck">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <Truck className="h-6 w-6 text-blue-600" />
                                    <span className="font-medium">Truck / تراک</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-6 space-y-0.5">
                                    <p>Duration: 1-3 Days / مدت: 1-3 روز</p>
                                    <p>Capacity: 20-25 Tons / ظرفیت: 20-25 تن</p>
                                    <p>Cost: Low-Medium / هزینه: پایین-متوسط</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="vessel">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <Ship className="h-6 w-6 text-cyan-600" />
                                    <span className="font-medium">Vessel / کشتی</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-6 space-y-0.5">
                                    <p>Duration: 7-14 Days / مدت: 7-14 روز</p>
                                    <p>Capacity: 1000+ Tons / ظرفیت: 1000+ تن</p>
                                    <p>Cost: Low (Bulk) / هزینه: پایین</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="airplane">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <Plane className="h-6 w-6 text-sky-600" />
                                    <span className="font-medium">Airplane / هواپیما</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-6 space-y-0.5">
                                    <p>Duration: 1-2 Days / مدت: 1-2 روز</p>
                                    <p>Capacity: 50-100 Tons / ظرفیت: 50-100 تن</p>
                                    <p>Cost: High / هزینه: بالا</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="train">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <Train className="h-6 w-6 text-orange-600" />
                                    <span className="font-medium">Train / قطار</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-6 space-y-0.5">
                                    <p>Duration: 3-7 Days / مدت: 3-7 روز</p>
                                    <p>Capacity: 500+ Tons / ظرفیت: 500+ تن</p>
                                    <p>Cost: Medium / هزینه: متوسط</p>
                                  </div>
                                </div>
                              </SelectItem>
                              <SelectItem value="road">
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2.5">
                                    <AlertCircle className="h-6 w-6 text-amber-600" />
                                    <span className="font-medium">Road / جاده</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground ml-6 space-y-0.5">
                                    <p>Duration: 2-5 Days / مدت: 2-5 روز</p>
                                    <p>Capacity: 15-20 Tons / ظرفیت: 15-20 تن</p>
                                    <p>Cost: Medium / هزینه: متوسط</p>
                                  </div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {route.transportMode && (
                            <div className="mt-2 p-2 bg-linear-to-br from-blue-50/80 to-white/60 backdrop-blur-sm rounded-lg border border-blue-100/40">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-500 font-medium">Duration</p>
                                  <p className="font-semibold text-gray-800">{getTransportDetails(route.transportMode).duration}</p>
                                  <p className="text-gray-500 font-[vazirmatn]">{getTransportDetails(route.transportMode).durationPersian}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Capacity</p>
                                  <p className="font-semibold text-gray-800">{getTransportDetails(route.transportMode).capacity}</p>
                                  <p className="text-gray-500 font-[vazirmatn]">{getTransportDetails(route.transportMode).capacityPersian}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Cost</p>
                                  <p className="font-semibold text-gray-800">{getTransportDetails(route.transportMode).cost}</p>
                                  <p className="text-gray-500 font-[vazirmatn]">{getTransportDetails(route.transportMode).costPersian}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Notes</p>
                                  <p className="font-semibold text-gray-800 text-[11px]">{getTransportDetails(route.transportMode).notes}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick location buttons */}
                <div className="pt-3 border-t border-blue-100/30">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Quick Select Locations / انتخاب سریع:</p>
                      {activeRouteIndex !== null && (
                        <p className="text-xs text-gray-500">
                          Showing matches for {getRouteStopLabel(activeRouteIndex, formData.routes.length)}
                          {quickLocationQuery && <span>: "{formData.routes[activeRouteIndex]?.location}"</span>}
                        </p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={addRouteStop} className="h-8 border-blue-200 bg-white/70 text-blue-700 hover:bg-blue-50">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Stop
                    </Button>
                  </div>
                  <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {quickLocationMatches.map((loc) => (
                      <Button
                        key={loc.name}
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-2 px-3 flex flex-col items-start border-blue-100/60 bg-linear-to-br from-white/80 to-blue-50/30 hover:from-blue-50 hover:to-blue-100/50 hover:border-blue-300 transition-all shadow-sm"
                        onClick={() => handleQuickLocationSelect(loc)}
                        title={`${loc.name} - ${loc.country} (${loc.code})`}
                      >
                        <div className="flex items-center gap-1.5 w-full">
                          <span className="text-base shrink-0">{countryFlags[loc.country] || "🌍"}</span>
                          <span className="font-medium text-gray-700 truncate">{loc.name}</span>
                          <span className="text-[10px] bg-blue-100/80 text-blue-600 rounded px-1.5 py-0.5 ml-auto shrink-0">{loc.code}</span>
                        </div>
                        <span className="text-gray-500 font-[vazirmatn] text-[10px] truncate w-full text-right" dir="rtl">{loc.persian}</span>
                      </Button>
                    ))}
                    {quickLocationMatches.length === 0 && (
                      <div className="col-span-full rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-5 text-center text-sm text-slate-500">
                        No matching locations / نتیجه‌ای یافت نشد
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Container Details */}
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
            <Card className="glass-card rounded-2xl overflow-hidden ring-1 ring-green-100/50">
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
            {/* Iran Office Information */}
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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

            {/* Logo Editor */}
            <Card className="mb-4 md:mb-6 glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
                        id="logo-upload"
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

            {/* Company Details */}
<Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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

          </TabsContent>

          <TabsContent value="preview">
            <div className="overflow-auto flex justify-center rounded-[30px] border border-white/80 bg-linear-to-br from-white/70 via-blue-50/45 to-cyan-50/30 p-6 shadow-2xl shadow-blue-200/45 backdrop-blur-2xl ring-1 ring-blue-100/60 print:hidden">
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
              />
            </div>
          </TabsContent>

          {savedDocumentsPanel && (
            <TabsContent value="saved-documents">
              <section className="min-h-0 rounded-[30px] border border-white/70 bg-white/45 p-3 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl print:hidden">
                {savedDocumentsPanel}
              </section>
            </TabsContent>
          )}

          {accountLedgerPanel && (
            <TabsContent value="account">
              <section className="min-h-0 rounded-[30px] border border-white/70 bg-white/45 p-3 shadow-2xl shadow-blue-200/40 backdrop-blur-2xl print:hidden">
                {accountLedgerPanel}
              </section>
            </TabsContent>
          )}

          {/* PDF Settings Tab */}
          <TabsContent value="pdf-settings">
            <Card className="glass-card rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 glass-header">
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
              />
            </PrintSafeBOL>
          </div>
        </PrintPreviewPortal>

        {/* Dedicated PDF export source. Keep it rendered, but outside the viewport. */}
        <div
          data-pdf-export="true"
          aria-hidden="true"
          className="fixed top-0 -left-625 w-[210mm] overflow-visible pointer-events-none z-[-1] print:hidden"
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
