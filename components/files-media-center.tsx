"use client"

import { KeyboardEvent, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from "react"
import {
  Archive,
  BadgeCheck,
  Boxes,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Cloud,
  Columns3,
  Command,
  Copy,
  Database,
  DollarSign,
  Download,
  Eye,
  FileArchive,
  FileCheck,
  FileCog,
  FileInput,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Grid2X2,
  HardDrive,
  History,
  ImageIcon,
  Images,
  Import,
  Inbox,
  Info,
  Languages,
  Layers,
  ListFilter,
  Lock,
  MessageCircle,
  PackageCheck,
  PanelRightOpen,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Tags,
  Trash2,
  UploadCloud,
  UserRound,
  Video,
  Volume2,
  Wand2,
  X,
} from "lucide-react"
import { pythonBackend } from "@/lib/python-api"
import DraggableWindow from "@/components/draggable-window"

type FileKind = "image" | "video" | "audio" | "document" | "excel" | "pdf" | "other"

type FileCenterRecord = {
  id: string
  originalName: string
  fileName: string
  fileType: string
  mediaType: FileKind
  fileSize: number
  storagePath?: string
  createdAt: string
  category: string
  documentType: string
  status: string
  tags: string[]
  notes: string
  invoiceNo: string
  billOfLadingNo: string
  containerNo: string
  truckNo: string
  customer: string
  route: string
  isLocked: boolean
  isFinal: boolean
  favorite: boolean
  expiryDate: string
  dueDate: string
  dueStatus: string
  amount: string
  currency: string
  paymentStatus: string
  paidDate: string
  bankMethod: string
  referenceNo: string
  sealNo: string
  containerSize: string
  containerType: string
  ownerType: string
  ownerName: string
  qualityStatus: string
  qualityNotes: string
  timeline: string[]
  processingStatus: string
  folder: string
  isDeleted: boolean
  deletedAt: string
  isArchived: boolean
  colorLabel: string
  localUrl?: string
  backendId?: string
}

type WorkspaceMode = "general" | "export" | "import" | "trucking" | "invoice" | "branding" | "excel"
type FileViewMode = "desktop" | "grid" | "list" | "timeline" | "kanban" | "calendar" | "vaults"

type ClipboardItem = {
  mode: "copy" | "cut"
  id: string
} | null

type UploadQueueItem = {
  id: string
  name: string
  status: "Waiting" | "Uploading" | "Ready" | "Failed"
  progress: number
}

type SidebarSection = {
  title: string
  icon: any
  items: { label: string; icon: any; countKey?: string }[]
}

const LOCAL_FILES_KEY = "sky-files-media-center-records"
const LOCAL_FOLDERS_KEY = "sky-files-media-center-folders"
const ONBOARDING_KEY = "sky-files-media-center-onboarding"

const sidebarSections: SidebarSection[] = [
  {
    title: "Quick Access",
    icon: Cloud,
    items: [
      { label: "SKY Desktop", icon: FolderOpen },
      { label: "Recent Files", icon: History },
      { label: "Today's Work", icon: CalendarClock },
      { label: "Favorites", icon: Star, countKey: "favorites" },
      { label: "Shared / Linked Files", icon: Layers },
      { label: "Trash", icon: Trash2 },
    ],
  },
  {
    title: "Company Documents",
    icon: FileText,
    items: [
      { label: "Invoices", icon: FileText, countKey: "Invoices" },
      { label: "Bill of Lading", icon: PackageCheck, countKey: "Bill of Lading" },
      { label: "Packing Lists", icon: ClipboardList, countKey: "Packing Lists" },
      { label: "Customs Documents", icon: ShieldCheck, countKey: "Customs Documents" },
      { label: "Transit Documents", icon: FileCheck, countKey: "Transit Documents" },
      { label: "Truck Documents", icon: Boxes, countKey: "Truck Documents" },
      { label: "Driver Documents", icon: BadgeCheck, countKey: "Driver Documents" },
      { label: "Container Documents", icon: FileCog, countKey: "Container Documents" },
    ],
  },
  {
    title: "Media Library",
    icon: ImageIcon,
    items: [
      { label: "Company Logos", icon: ImageIcon, countKey: "Company Logos" },
      { label: "Stamps", icon: BadgeCheck, countKey: "Stamps" },
      { label: "Signatures", icon: FileCheck, countKey: "Signatures" },
      { label: "Letterheads", icon: FileText, countKey: "Letterheads" },
      { label: "Images", icon: ImageIcon, countKey: "image" },
      { label: "Videos", icon: Video, countKey: "video" },
      { label: "Audio", icon: Volume2, countKey: "audio" },
    ],
  },
  {
    title: "Excel Center",
    icon: FileSpreadsheet,
    items: [
      { label: "Import Excel Files", icon: FileInput, countKey: "excel" },
      { label: "Export Excel Files", icon: FileSpreadsheet },
      { label: "Account Ledger Excel", icon: Database },
      { label: "Truck List Excel", icon: FileSpreadsheet },
      { label: "Reports Excel", icon: ClipboardList },
    ],
  },
  {
    title: "System",
    icon: Settings,
    items: [
      { label: "Archive", icon: Archive },
      { label: "Backup", icon: FileArchive },
      { label: "Import History", icon: History },
      { label: "Storage Health", icon: HardDrive },
      { label: "Settings", icon: Settings },
    ],
  },
]

const defaultFolders = [
  "SKY Desktop",
  "Excel Files",
  "Company Logos",
  "Invoices",
  "Bill of Lading",
  "Packing Lists",
  "Customs Documents",
  "Truck Documents",
  "Driver Documents",
  "Container Documents",
  "Payment Receipts",
  "Images",
  "Media",
  "Archive",
  "Trash",
]

const requiredPacketDocs = ["Invoice", "Packing List", "BOL", "Certificate of Origin", "Customs Document"]

const workspaceModes: {
  key: WorkspaceMode
  label: string
  description: string
  folders: string[]
  actions: string[]
}[] = [
  {
    key: "general",
    label: "General Files",
    description: "All folders, media, documents, and quick access tools.",
    folders: ["SKY Desktop", "Recent Files", "Favorites", "Shared / Linked Files", "Archive"],
    actions: ["Upload File", "New Folder", "Export File List"],
  },
  {
    key: "export",
    label: "Export Shipment",
    description: "Export invoices, BOL, customs, containers, and shipment packets.",
    folders: ["Export Invoices", "Packing Lists", "BOL", "Customs Documents", "Container Documents", "Shipment Packets", "Missing Documents"],
    actions: ["Create Shipment Packet", "Rename Files by Shipment", "Copy WhatsApp Message"],
  },
  {
    key: "import",
    label: "Import Shipment",
    description: "Import permits, customs files, truck documents, ledgers, and receipts.",
    folders: ["Import Invoices", "Import Permits", "Customs Documents", "Truck Documents", "Import Ledger Excel", "Payment Receipts"],
    actions: ["Import Excel Files", "Create Shipment Packet", "Print File Summary"],
  },
  {
    key: "trucking",
    label: "Trucking",
    description: "Driver, truck, route permit, registration, and delivery proof vaults.",
    folders: ["Truck Documents", "Driver Documents", "Vehicle Registration", "Driver Passport/ID", "Route Permits", "Truck Photos", "Delivery Proof"],
    actions: ["Open Driver Vault", "Open Truck Vault", "Phone Upload"],
  },
  {
    key: "invoice",
    label: "Invoice",
    description: "Draft, final, paid, unpaid, demurrage, detention, and receipt files.",
    folders: ["Draft Invoices", "Final Invoices", "Paid Invoices", "Unpaid Invoices", "Detention/Demurrage Invoices", "Payment Receipts"],
    actions: ["Generate Document Number", "Track Payment", "Create PDF Package"],
  },
  {
    key: "branding",
    label: "Branding",
    description: "Logos, stamps, signatures, letterheads, watermarks, and headers.",
    folders: ["Logos", "Stamps", "Signatures", "Letterheads", "Watermarks", "Header Images"],
    actions: ["Set Default Logo", "Set Default Stamp", "Set Default Signature"],
  },
  {
    key: "excel",
    label: "Excel",
    description: "Import/export Excel, ledger sheets, mapping templates, and safety preview.",
    folders: ["Import Excel", "Export Excel", "Ledger Excel", "Truck List Excel", "Reports", "Mapping Templates", "Import Queue"],
    actions: ["Auto Match Columns", "Save Mapping Template", "Review Duplicates"],
  },
]

const kanbanStatuses = ["Inbox", "Draft", "Pending Review", "Approved", "Sent", "Completed", "Archived"]
const currencies = ["USD", "AFN", "PKR", "IRR", "EUR", "AED", "INR"]
const documentNumberPrefixes = ["INV", "BOL", "PKT", "DMG", "DEM"]

const commandActions = [
  "Upload File",
  "New Folder",
  "Open Excel Files",
  "Open Logo Manager",
  "Set Default Logo",
  "Open Recent Files",
  "Open Trash",
  "Export File List",
  "Create Shipment Packet",
  "Rename Files by Shipment",
  "Open Company Vault",
  "Open Driver Vault",
  "Open Truck Vault",
  "Open Container Vault",
  "Create Evidence Packet",
  "Copy WhatsApp Message",
  "Generate Document Number",
  "Rebuild File Index",
  "Storage Health Check",
]

export function FilesMediaCenter() {
  const [records, setRecords] = useState<FileCenterRecord[]>([])
  const [folders, setFolders] = useState<string[]>(defaultFolders)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeFolder, setActiveFolder] = useState("SKY Desktop")
  const [searchText, setSearchText] = useState("")
  const [activeChip, setActiveChip] = useState("all")
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("general")
  const [viewMode, setViewMode] = useState<FileViewMode>("desktop")
  const [splitView, setSplitView] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState("")
  const [launchpadOpen, setLaunchpadOpen] = useState(false)
  const [controlCenterOpen, setControlCenterOpen] = useState(false)
  const [desktopMenu, setDesktopMenu] = useState<{ x: number; y: number } | null>(null)
  const [iconSize, setIconSize] = useState<"small" | "medium" | "large">("medium")
  const [clipboardItem, setClipboardItem] = useState<ClipboardItem>(null)
  const [quickLookRecord, setQuickLookRecord] = useState<FileCenterRecord | null>(null)
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const commandInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setOnboardingOpen(window.localStorage.getItem(ONBOARDING_KEY) !== "true")
    loadRecords()
  }, [])

  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent) => {
      const currentSelected = selectedId ? records.find((record) => record.id === selectedId) : null
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setCommandOpen(true)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && selectedId) {
        event.preventDefault()
        setClipboardItem({ mode: "copy", id: selectedId })
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "x" && selectedId) {
        event.preventDefault()
        setClipboardItem({ mode: "cut", id: selectedId })
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault()
        void pasteClipboard()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d" && selectedId) {
        event.preventDefault()
        void duplicateRecord(selectedId)
      }
      if (event.key === "Delete" && selectedId) {
        event.preventDefault()
        void deleteRecord(selectedId)
      }
      if (event.key === "Enter" && selectedId) {
        event.preventDefault()
        void renameSelected()
      }
      if (event.code === "Space" && currentSelected) {
        event.preventDefault()
        setQuickLookRecord(currentSelected)
      }
      if (event.key === "Escape") {
        setCommandOpen(false)
        setQuickLookRecord(null)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [activeFolder, clipboardItem, records, selectedId])

  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => commandInputRef.current?.focus(), 50)
    }
  }, [commandOpen])

  const selectedRecord = useMemo(() => records.find((record) => record.id === selectedId) || records[0], [records, selectedId])
  const activeWorkspace = useMemo(() => workspaceModes.find((workspace) => workspace.key === workspaceMode) || workspaceModes[0], [workspaceMode])
  const availableFolders = useMemo(() => Array.from(new Set([...activeWorkspace.folders, ...folders])), [activeWorkspace, folders])
  const counts = useMemo(() => buildCounts(records), [records])
  const totalStorage = useMemo(() => records.reduce((sum, record) => sum + record.fileSize, 0), [records])
  const completeness = useMemo(() => buildCompleteness(records), [records])
  const dueSoonCount = useMemo(() => records.filter((record) => getDueStatus(record) === "Due Soon").length, [records])
  const overdueCount = useMemo(() => records.filter((record) => getDueStatus(record) === "Overdue").length, [records])

  const filteredRecords = useMemo(() => {
    const queryParts = parseSearchQuery(searchText)
    return records.filter((record) => {
      if (!recordMatchesWorkspace(record, activeWorkspace)) return false
      if (!recordMatchesFolder(record, activeFolder)) return false
      if (activeChip !== "all") {
        if (activeChip === "favorites" && !record.favorite) return false
        if (activeChip === "inbox" && record.status !== "Pending Review") return false
        if (activeChip === "overdue" && getDueStatus(record) !== "Overdue") return false
        if (
          !["favorites", "inbox", "overdue"].includes(activeChip) &&
          record.mediaType !== activeChip &&
          record.category !== activeChip
        ) return false
      }
      return matchesSearch(record, queryParts)
    })
  }, [activeChip, activeWorkspace, records, searchText])

  const commandMatches = useMemo(() => {
    const query = commandQuery.trim().toLowerCase()
    const actions = commandActions.filter((action) => action.toLowerCase().includes(query))
    const files = records
      .filter((record) => !query || record.originalName.toLowerCase().includes(query))
      .slice(0, 5)
      .map((record) => `Open ${record.originalName}`)
    return [...actions, ...files].slice(0, 9)
  }, [commandQuery, records])

  const loadRecords = async () => {
    setLoading(true)
    setError("")
    setFolders(loadLocalFolders())
    try {
      const response: any = await pythonBackend.media.list({ linked_type: "files-center" })
      const apiRecords = Array.isArray(response?.data) ? response.data.map(mapBackendMedia) : []
      setRecords(apiRecords)
      setSelectedId(apiRecords[0]?.id || null)
      window.localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(apiRecords))
    } catch (err) {
      const fallback = loadLocalRecords()
      setRecords(fallback)
      setSelectedId(fallback[0]?.id || null)
      setError("Python backend is not connected. Showing locally cached file metadata.")
    } finally {
      setLoading(false)
    }
  }

  const saveLocalRecords = (nextRecords: FileCenterRecord[]) => {
    setRecords(nextRecords)
    window.localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(nextRecords))
  }

  const saveFolders = (nextFolders: string[]) => {
    const cleanFolders = Array.from(new Set([...defaultFolders, ...nextFolders].filter(Boolean)))
    setFolders(cleanFolders)
    window.localStorage.setItem(LOCAL_FOLDERS_KEY, JSON.stringify(cleanFolders))
  }

  const addRecord = (record: FileCenterRecord) => {
    setRecords((current) => {
      const next = [record, ...current]
      window.localStorage.setItem(LOCAL_FILES_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (!files.length) return

    const queueItems = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      status: "Waiting" as const,
      progress: 0,
    }))
    setUploadQueue((current) => [...queueItems, ...current])

    for (const file of files) {
      const queueId = queueItems.find((item) => item.name === file.name)?.id
      updateQueue(queueId, { status: "Uploading", progress: 45 })
      const detected = detectDocument(file.name, file.type, activeFolder)
      const baseRecord = fileToLocalRecord(file, detected, activeFolder)

      try {
        const response: any = await pythonBackend.media.upload(file, {
          linked_type: "files-center",
          linked_id: activeFolder,
          shipment_reference: baseRecord.billOfLadingNo || baseRecord.invoiceNo || "",
          category: baseRecord.category,
          document_type: baseRecord.documentType,
          status: baseRecord.status,
          tags: baseRecord.tags.join(","),
          notes: baseRecord.notes,
          invoice_no: baseRecord.invoiceNo,
          bill_of_lading_no: baseRecord.billOfLadingNo,
          container_no: baseRecord.containerNo,
          truck_no: baseRecord.truckNo,
          customer: baseRecord.customer,
          route: baseRecord.route,
          is_locked: String(baseRecord.isLocked),
          is_final: String(baseRecord.isFinal),
          expiry_date: baseRecord.expiryDate,
          due_date: baseRecord.dueDate,
          due_status: baseRecord.dueStatus,
          amount: baseRecord.amount,
          currency: baseRecord.currency,
          payment_status: baseRecord.paymentStatus,
          paid_date: baseRecord.paidDate,
          bank_method: baseRecord.bankMethod,
          reference_no: baseRecord.referenceNo,
          seal_no: baseRecord.sealNo,
          container_size: baseRecord.containerSize,
          container_type: baseRecord.containerType,
          owner_type: baseRecord.ownerType,
          owner_name: baseRecord.ownerName,
          quality_status: baseRecord.qualityStatus,
          quality_notes: baseRecord.qualityNotes,
          folder: baseRecord.folder,
          is_deleted: String(baseRecord.isDeleted),
          deleted_at: baseRecord.deletedAt,
          is_archived: String(baseRecord.isArchived),
          color_label: baseRecord.colorLabel,
        })
        const savedRecord = mapBackendMedia(response?.data)
        addRecord(savedRecord)
        setSelectedId(savedRecord.id)
        updateQueue(queueId, { status: "Ready", progress: 100 })
      } catch {
        addRecord(baseRecord)
        setSelectedId(baseRecord.id)
        updateQueue(queueId, { status: "Failed", progress: 100 })
      }
    }
  }

  const updateQueue = (id: string | undefined, patch: Partial<UploadQueueItem>) => {
    if (!id) return
    setUploadQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const updateRecord = async (id: string, patch: Partial<FileCenterRecord>) => {
    const nextRecords = records.map((record) => (record.id === id ? { ...record, ...patch } : record))
    saveLocalRecords(nextRecords)
    const record = nextRecords.find((item) => item.id === id)
    if (!record?.backendId) return

    try {
      await pythonBackend.media.update(record.backendId, {
        original_name: record.originalName,
        shipment_reference: record.billOfLadingNo || record.invoiceNo || "",
        metadata: recordToMetadata(record),
      })
    } catch {
      setError("Saved locally. Backend metadata update is unavailable right now.")
    }
  }

  const deleteRecord = async (id: string) => {
    const target = records.find((record) => record.id === id)
    if (target?.isLocked) {
      setError("This file is locked. Unlock it before deleting.")
      return
    }
    await updateRecord(id, {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      category: "Trash",
      folder: "Trash",
      timeline: appendTimeline(target, "Moved to Trash"),
    })
    const nextVisible = records.find((record) => record.id !== id && !record.isDeleted)
    setSelectedId(nextVisible?.id || null)
  }

  const permanentDeleteRecord = async (id: string) => {
    const target = records.find((record) => record.id === id)
    if (!target) return
    const confirmed = window.confirm(`Permanently delete "${target.originalName}" from storage? This cannot be undone.`)
    if (!confirmed) return
    const nextRecords = records.filter((record) => record.id !== id)
    saveLocalRecords(nextRecords)
    setSelectedId(nextRecords[0]?.id || null)
    if (target.backendId) {
      try {
        await pythonBackend.media.delete(target.backendId, true)
      } catch {
        setError("Removed locally. Backend permanent delete is unavailable right now.")
      }
    }
  }

  const restoreRecord = async (id: string) => {
    const target = records.find((record) => record.id === id)
    await updateRecord(id, {
      isDeleted: false,
      deletedAt: "",
      category: target?.folder && target.folder !== "Trash" ? target.folder : "SKY Desktop",
      folder: "SKY Desktop",
      timeline: appendTimeline(target, "Restored from Trash"),
    })
  }

  const createFolder = () => {
    const name = window.prompt("New folder name")
    if (!name?.trim()) return
    saveFolders([...folders, name.trim()])
    setActiveFolder(name.trim())
  }

  const renameSelected = async () => {
    const target = selectedId ? records.find((record) => record.id === selectedId) : null
    if (!target) return
    if (target.isLocked) {
      setError("This file is locked. Unlock it before renaming.")
      return
    }
    const name = window.prompt("Rename file", target.originalName)
    if (!name?.trim() || name.trim() === target.originalName) return
    await updateRecord(target.id, {
      originalName: name.trim(),
      timeline: appendTimeline(target, `Renamed to ${name.trim()}`),
    })
  }

  const duplicateRecord = async (id: string) => {
    const target = records.find((record) => record.id === id)
    if (!target) return
    const copy: FileCenterRecord = {
      ...target,
      id: crypto.randomUUID(),
      backendId: undefined,
      originalName: nextCopyName(target.originalName, records.map((record) => record.originalName)),
      isLocked: false,
      isFinal: false,
      createdAt: new Date().toISOString(),
      timeline: [`Duplicated from ${target.originalName}`, ...target.timeline],
    }
    addRecord(copy)
    setSelectedId(copy.id)
  }

  const pasteClipboard = async () => {
    if (!clipboardItem) return
    const target = records.find((record) => record.id === clipboardItem.id)
    if (!target) return
    if (clipboardItem.mode === "cut") {
      await updateRecord(target.id, {
        category: activeFolder,
        folder: activeFolder,
        timeline: appendTimeline(target, `Moved to ${activeFolder}`),
      })
      setClipboardItem(null)
      return
    }
    const copy: FileCenterRecord = {
      ...target,
      id: crypto.randomUUID(),
      backendId: undefined,
      originalName: nextCopyName(target.originalName, records.map((record) => record.originalName)),
      category: activeFolder,
      folder: activeFolder,
      createdAt: new Date().toISOString(),
      timeline: [`Copied to ${activeFolder}`, ...target.timeline],
    }
    addRecord(copy)
    setSelectedId(copy.id)
  }

  const runCommand = (command: string) => {
    const normalized = command.toLowerCase()
    if (normalized.includes("upload")) fileInputRef.current?.click()
    if (normalized.includes("excel")) setActiveChip("excel")
    if (normalized.includes("logo")) setActiveFolder("Company Logos")
    if (normalized.includes("recent")) setActiveFolder("Recent Files")
    if (normalized.includes("trash")) setActiveFolder("Trash")
    if (normalized.includes("settings") || normalized.includes("storage")) setSettingsOpen(true)
    if (normalized.includes("company vault")) setViewMode("vaults")
    if (normalized.includes("driver vault") || normalized.includes("truck vault") || normalized.includes("container vault")) setViewMode("vaults")
    if (normalized.includes("evidence") || normalized.includes("shipment packet")) setActiveFolder("Shipment Packets")
    if (normalized.includes("whatsapp") && selectedRecord) copyWhatsAppMessage(selectedRecord)
    if (normalized.includes("rename") && selectedRecord) {
      const suggestedName = buildSuggestedFileName(selectedRecord)
      void updateRecord(selectedRecord.id, {
        originalName: suggestedName,
        timeline: appendTimeline(selectedRecord, `Suggested shipment name applied: ${suggestedName}`),
      })
    }
    if (normalized.includes("generate document number") && selectedRecord) {
      const prefix = documentNumberPrefixes.find((item) => selectedRecord.documentType.toUpperCase().includes(item)) || "PKT"
      const nextNumber = `${prefix}-${new Date().getFullYear()}-${String(records.length + 1).padStart(3, "0")}`
      void updateRecord(selectedRecord.id, {
        referenceNo: nextNumber,
        timeline: appendTimeline(selectedRecord, `Generated document number ${nextNumber}`),
      })
    }
    setCommandOpen(false)
    setCommandQuery("")
  }

  const completeOnboarding = () => {
    window.localStorage.setItem(ONBOARDING_KEY, "true")
    setOnboardingOpen(false)
  }

  return (
    <section
      className="mac-desktop-shell"
      onClick={() => setDesktopMenu(null)}
      onContextMenu={(event) => {
        if ((event.target as HTMLElement).closest("[data-mac-window], [data-mac-menu], [data-mac-dock]")) return
        event.preventDefault()
        setDesktopMenu({ x: event.clientX, y: event.clientY })
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) void handleFiles(event.target.files)
          event.target.value = ""
        }}
      />

      <MacTopBar
        records={records}
        totalStorage={totalStorage}
        onCommand={() => setCommandOpen(true)}
        onUpload={() => fileInputRef.current?.click()}
        onNewFolder={createFolder}
        onRefresh={loadRecords}
        onControlCenter={() => setControlCenterOpen((value) => !value)}
        onSettings={() => setSettingsOpen((value) => !value)}
        onFolder={setActiveFolder}
        onView={setViewMode}
        onIconSize={setIconSize}
        onPaste={() => void pasteClipboard()}
        canPaste={Boolean(clipboardItem)}
      />

      <div className="mac-desktop-stage">
        <DesktopShortcutRail
          iconSize={iconSize}
          counts={counts}
          onOpenFolder={setActiveFolder}
          onUpload={() => fileInputRef.current?.click()}
          onLaunchpad={() => setLaunchpadOpen(true)}
        />

        <DraggableWindow>
          <div className="mac-window-titlebar">
            <div className="flex items-center gap-2">
              <span className="mac-window-dot bg-[#ff5f57]" />
              <span className="mac-window-dot bg-[#ffbd2e]" />
              <span className="mac-window-dot bg-[#28c840]" />
            </div>
            <div className="min-w-0 text-center">
              <p className="truncate text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">SKY Desktop</p>
              <h2 className="truncate text-lg font-black text-slate-950 md:text-2xl">Finder - Files & Media Center</h2>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCommandOpen(true)} className="mac-titlebar-button">
                <Command className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mac-titlebar-button mac-titlebar-button-primary">
                <UploadCloud className="h-4 w-4" />
                Upload
              </button>
            </div>
          </div>

          <div className="mac-window-toolbar">
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-950">Professional logistics document desktop</p>
              <p className="mt-1 max-w-3xl text-xs font-bold text-slate-600">
                Manage Excel files, logos, invoices, BOL documents, shipment media, and import safety tools in one Finder-style workspace.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={loadRecords} className="file-center-secondary-button">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button type="button" onClick={() => setSettingsOpen((value) => !value)} className="file-center-secondary-button">
                <Settings className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>

      <div className="mac-finder-body grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="max-h-[calc(100vh-15rem)] overflow-y-auto border-b border-blue-100/80 bg-white/45 p-4 backdrop-blur-xl xl:border-b-0 xl:border-r">
          <div className="mb-4 rounded-[24px] border border-[#D4AF37]/30 bg-[#fff8df]/70 p-3 shadow-lg shadow-[#D4AF37]/20">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9b6d00]">Workspace Mode</p>
            <div className="mt-3 grid gap-2">
              {workspaceModes.map((workspace) => (
                <button
                  key={workspace.key}
                  type="button"
                  onClick={() => {
                    setWorkspaceMode(workspace.key)
                    setActiveFolder(workspace.folders[0])
                  }}
                  className={`rounded-2xl border px-3 py-2 text-left text-xs font-black transition ${
                    workspaceMode === workspace.key
                      ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-200"
                      : "border-white/80 bg-white/72 text-slate-700 hover:border-[#D4AF37]/60 hover:text-blue-700"
                  }`}
                >
                  <span className="block">{workspace.label}</span>
                  <span className={`mt-1 block text-[10px] leading-4 ${workspaceMode === workspace.key ? "text-blue-50" : "text-slate-500"}`}>{workspace.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-blue-100 bg-white/70 p-3 shadow-lg shadow-blue-100/50">
            <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-3 py-2">
              <Search className="h-4 w-4 text-blue-600" />
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search type:pdf status:pending"
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {["all", "pdf", "excel", "image", "video", "audio", "favorites", "inbox", "overdue"].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setActiveChip(chip)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-black capitalize transition ${
                    activeChip === chip ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/80 text-slate-600 hover:border-[#D4AF37]/60"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs font-black text-slate-600">
              Due Soon: <span className="text-amber-700">{dueSoonCount}</span> / Overdue: <span className="text-red-600">{overdueCount}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {sidebarSections.map((section) => {
              const Icon = section.icon
              const isCollapsed = collapsed[section.title]
              return (
                <div key={section.title} className="rounded-[24px] border border-white/75 bg-white/62 p-3 shadow-lg shadow-blue-100/50">
                  <button
                    type="button"
                    onClick={() => setCollapsed((current) => ({ ...current, [section.title]: !current[section.title] }))}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#9b6d00]">
                      <Icon className="h-4 w-4 text-blue-600" />
                      {section.title}
                    </span>
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {!isCollapsed ? (
                    <div className="mt-3 space-y-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon
                        const count = item.countKey ? counts[item.countKey] || 0 : 0
                        const active = activeFolder === item.label
                        return (
                          <button
                            type="button"
                            key={item.label}
                            onClick={() => setActiveFolder(item.label)}
                            className={`flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-black transition ${
                              active ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                            }`}
                          >
                            <ItemIcon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {count ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-[#D4AF37]/15 text-[#8a6200]"}`}>{count}</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_390px]">
            <main className="min-w-0 space-y-4">
              <section
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragActive(false)
                  void handleFiles(event.dataTransfer.files)
                }}
                className={`rounded-[28px] border border-dashed p-4 transition ${
                  dragActive ? "border-blue-500 bg-blue-50/90 shadow-xl shadow-blue-200" : "border-blue-200 bg-white/62 shadow-lg shadow-blue-100/50"
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.26em] text-[#D4AF37]">{activeFolder}</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">Drop files here or upload from your PC</h3>
                    <p className="mt-1 text-sm font-bold text-slate-600">Files are detected, tagged, and sent to the file inbox or current folder.</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <StatCard label="Total Files" value={String(records.length)} tone="blue" />
                    <StatCard label="Storage Used" value={formatBytes(totalStorage)} tone="gold" />
                    <StatCard label="Completeness" value={`${completeness.percent}%`} tone="green" />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="flex flex-wrap gap-2">
                    {availableFolders.map((folder) => (
                      <button
                        key={folder}
                        type="button"
                        onClick={() => setActiveFolder(folder)}
                        className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                          activeFolder === folder ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/78 text-slate-600 hover:border-[#D4AF37]/60"
                        }`}
                      >
                        {folder}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["desktop", "grid", "list", "timeline", "kanban", "calendar", "vaults"] as FileViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setViewMode(mode)}
                        className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black capitalize transition ${
                          viewMode === mode ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/78 text-slate-600 hover:bg-blue-50"
                        }`}
                      >
                        {mode === "desktop" ? <FolderOpen className="h-4 w-4" /> : mode === "grid" ? <Grid2X2 className="h-4 w-4" /> : mode === "list" ? <ListFilter className="h-4 w-4" /> : mode === "timeline" ? <History className="h-4 w-4" /> : mode === "kanban" ? <Columns3 className="h-4 w-4" /> : mode === "calendar" ? <CalendarDays className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeWorkspace.actions.map((action) => (
                    <button key={action} type="button" onClick={() => runCommand(action)} className="file-center-secondary-button">
                      <Wand2 className="h-4 w-4" />
                      {action}
                    </button>
                  ))}
                </div>
              </section>

              <FinderToolbar
                selectedRecord={selectedRecord}
                clipboardItem={clipboardItem}
                viewMode={viewMode}
                onUpload={() => fileInputRef.current?.click()}
                onNewFolder={createFolder}
                onCopy={() => selectedId && setClipboardItem({ mode: "copy", id: selectedId })}
                onCut={() => selectedId && setClipboardItem({ mode: "cut", id: selectedId })}
                onPaste={() => void pasteClipboard()}
                onRename={() => void renameSelected()}
                onDuplicate={() => selectedId && void duplicateRecord(selectedId)}
                onDelete={() => selectedId && void deleteRecord(selectedId)}
                onRestore={() => selectedId && void restoreRecord(selectedId)}
                onQuickLook={() => selectedRecord && setQuickLookRecord(selectedRecord)}
                onViewMode={setViewMode}
              />

              {error ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm font-black text-amber-800 shadow-sm">
                  {error}
                </div>
              ) : null}

              <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <GlassPanel title="Document Completeness" icon={PackageCheck}>
                  <div className="h-3 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500" style={{ width: `${completeness.percent}%` }} />
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {requiredPacketDocs.map((doc) => {
                      const complete = completeness.completed.includes(doc)
                      return (
                        <div key={doc} className={`rounded-2xl border px-3 py-2 text-xs font-black ${complete ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-amber-100 bg-amber-50 text-amber-700"}`}>
                          {complete ? "Completed" : "Missing"} - {doc}
                        </div>
                      )
                    })}
                  </div>
                </GlassPanel>

                <GlassPanel title="Import Queue" icon={Import}>
                  <div className="space-y-2">
                    {uploadQueue.length ? uploadQueue.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-blue-100 bg-white/75 p-3">
                        <div className="flex items-center justify-between gap-3 text-xs font-black">
                          <span className="min-w-0 truncate text-slate-800">{item.name}</span>
                          <span className={item.status === "Failed" ? "text-red-600" : "text-blue-600"}>{item.status}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100">
                          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                      </div>
                    )) : (
                      <p className="rounded-2xl border border-blue-100 bg-white/65 p-4 text-sm font-bold text-slate-600">No import queue items yet.</p>
                    )}
                  </div>
                </GlassPanel>
              </section>

              <section className="rounded-[28px] border border-blue-100 bg-white/66 p-4 shadow-xl shadow-blue-100/60 backdrop-blur-xl">
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">File Cards</p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">{filteredRecords.length} visible files</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="file-center-secondary-button" onClick={() => setSplitView((value) => !value)}>
                      <PanelRightOpen className="h-4 w-4" />
                      {splitView ? "Hide Preview" : "Split View"}
                    </button>
                    <button type="button" className="file-center-secondary-button">
                      <FileArchive className="h-4 w-4" />
                      Create PDF Package
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="h-48 animate-pulse rounded-[24px] bg-blue-50" />
                    ))}
                  </div>
                ) : viewMode === "desktop" ? (
                  <SkyDesktopView
                    records={filteredRecords}
                    folders={availableFolders}
                    activeFolder={activeFolder}
                    selectedId={selectedRecord?.id || ""}
                    onOpenFolder={setActiveFolder}
                    onSelect={(id) => setSelectedId(id)}
                    onQuickLook={(record) => setQuickLookRecord(record)}
                    onUpload={() => fileInputRef.current?.click()}
                    onNewFolder={createFolder}
                  />
                ) : viewMode === "list" ? (
                  <FileListView
                    records={filteredRecords}
                    selectedId={selectedRecord?.id || ""}
                    onSelect={(id) => setSelectedId(id)}
                    onQuickLook={(record) => setQuickLookRecord(record)}
                    onToggleFavorite={(id) => {
                      const record = records.find((item) => item.id === id)
                      if (record) void updateRecord(record.id, { favorite: !record.favorite })
                    }}
                    onRestore={(id) => void restoreRecord(id)}
                    onDelete={(id) => void deleteRecord(id)}
                  />
                ) : viewMode === "timeline" ? (
                  <TimelineView records={filteredRecords} />
                ) : viewMode === "kanban" ? (
                  <KanbanView records={filteredRecords} onStatusChange={(id, status) => updateRecord(id, { status, timeline: appendTimeline(records.find((record) => record.id === id), `Status changed to ${status}`) })} />
                ) : viewMode === "calendar" ? (
                  <CalendarView records={filteredRecords} />
                ) : viewMode === "vaults" ? (
                  <VaultsView records={filteredRecords} onSelect={(id) => setSelectedId(id)} />
                ) : filteredRecords.length ? (
                  <div className={`grid gap-3 ${splitView ? "md:grid-cols-2 2xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"}`}>
                    {filteredRecords.map((record) => (
                      <FileCard
                        key={record.id}
                        record={record}
                        selected={selectedRecord?.id === record.id}
                        onSelect={() => setSelectedId(record.id)}
                        onToggleFavorite={() => updateRecord(record.id, { favorite: !record.favorite })}
                        onMarkFinal={() => updateRecord(record.id, { isFinal: !record.isFinal, isLocked: !record.isFinal || record.isLocked, status: !record.isFinal ? "Approved" : record.status })}
                        onDelete={() => deleteRecord(record.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState onUpload={() => fileInputRef.current?.click()} />
                )}
              </section>
            </main>

            {splitView ? (
              <aside className="min-w-0 space-y-4">
                <PreviewPanel record={selectedRecord} onUpdate={updateRecord} onDelete={deleteRecord} />
                <ModuleDropPanel />
                {settingsOpen ? <SettingsPanel /> : null}
              </aside>
            ) : null}
        </div>
      </div>
          </div>
          <div className="mac-window-statusbar">
            <span>{filteredRecords.length} items</span>
            <span>{activeFolder}</span>
            <span>{formatBytes(totalStorage)} used</span>
          </div>
        </DraggableWindow>
      </div>

      <MacDock
        records={records}
        onFolder={setActiveFolder}
        onUpload={() => fileInputRef.current?.click()}
        onCommand={() => setCommandOpen(true)}
        onLaunchpad={() => setLaunchpadOpen(true)}
        onControlCenter={() => setControlCenterOpen((value) => !value)}
        onSettings={() => setSettingsOpen((value) => !value)}
        onView={setViewMode}
      />

      {controlCenterOpen ? (
        <MacControlCenter
          totalFiles={records.length}
          totalStorage={totalStorage}
          uploadQueue={uploadQueue}
          viewMode={viewMode}
          iconSize={iconSize}
          onView={setViewMode}
          onIconSize={setIconSize}
          onUpload={() => fileInputRef.current?.click()}
          onRefresh={loadRecords}
          onClose={() => setControlCenterOpen(false)}
        />
      ) : null}

      {launchpadOpen ? (
        <MacLaunchpad
          onClose={() => setLaunchpadOpen(false)}
          onOpen={(target) => {
            if (target === "Upload File") fileInputRef.current?.click()
            else if (target === "Spotlight") setCommandOpen(true)
            else if (target === "Settings") setSettingsOpen(true)
            else if (target === "Excel Viewer") {
              setActiveChip("excel")
              setViewMode("grid")
            } else if (target === "PDF Viewer") {
              setActiveChip("pdf")
              setViewMode("grid")
            } else if (target === "Media Viewer") {
              setActiveFolder("Media")
              setViewMode("grid")
            } else if (target === "Storage Health") {
              setSettingsOpen(true)
            } else {
              setActiveFolder(target)
            }
            setLaunchpadOpen(false)
          }}
        />
      ) : null}

      {desktopMenu ? (
        <MacDesktopContextMenu
          position={desktopMenu}
          canPaste={Boolean(clipboardItem)}
          onNewFolder={createFolder}
          onUpload={() => fileInputRef.current?.click()}
          onPaste={() => void pasteClipboard()}
          onRefresh={loadRecords}
          onSortName={() => saveLocalRecords([...records].sort((a, b) => a.originalName.localeCompare(b.originalName)))}
          onSortDate={() => saveLocalRecords([...records].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))))}
          onSortType={() => saveLocalRecords([...records].sort((a, b) => a.mediaType.localeCompare(b.mediaType)))}
          onIconSize={setIconSize}
          onClose={() => setDesktopMenu(null)}
        />
      ) : null}

      {commandOpen ? (
        <CommandPalette
          query={commandQuery}
          matches={commandMatches}
          onQuery={setCommandQuery}
          onRun={runCommand}
          onClose={() => setCommandOpen(false)}
          inputRef={commandInputRef}
        />
      ) : null}

      {onboardingOpen ? (
        <OnboardingModal onClose={completeOnboarding} onUpload={() => { completeOnboarding(); fileInputRef.current?.click() }} />
      ) : null}

      {quickLookRecord ? (
        <QuickLookPreview
          record={quickLookRecord}
          onClose={() => setQuickLookRecord(null)}
          onDelete={() => void deleteRecord(quickLookRecord.id)}
          onRestore={() => void restoreRecord(quickLookRecord.id)}
        />
      ) : null}
    </section>
  )
}

function MacTopBar({
  records,
  totalStorage,
  onCommand,
  onUpload,
  onNewFolder,
  onRefresh,
  onControlCenter,
  onSettings,
  onFolder,
  onView,
  onIconSize,
  onPaste,
  canPaste,
}: {
  records: FileCenterRecord[]
  totalStorage: number
  onCommand: () => void
  onUpload: () => void
  onNewFolder: () => void
  onRefresh: () => void
  onControlCenter: () => void
  onSettings: () => void
  onFolder: (folder: string) => void
  onView: (mode: FileViewMode) => void
  onIconSize: (size: "small" | "medium" | "large") => void
  onPaste: () => void
  canPaste: boolean
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const dateText = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())

  const menuGroups = [
    {
      label: "Files",
      items: [
        { label: "New Folder", icon: Folder, action: onNewFolder },
        { label: "Upload File", icon: UploadCloud, action: onUpload },
        { label: "Refresh", icon: RefreshCw, action: onRefresh },
        { label: "Move to Trash", icon: Trash2, action: () => onFolder("Trash") },
        { label: "Properties", icon: Info, action: onSettings },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Paste", icon: ClipboardList, action: onPaste, disabled: !canPaste },
        { label: "Select All", icon: BadgeCheck, action: () => {} },
        { label: "Clear Selection", icon: X, action: () => {} },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Grid View", icon: Grid2X2, action: () => onView("grid") },
        { label: "List View", icon: ListFilter, action: () => onView("list") },
        { label: "Desktop View", icon: FolderOpen, action: () => onView("desktop") },
        { label: "Small Icons", icon: Grid2X2, action: () => onIconSize("small") },
        { label: "Medium Icons", icon: Grid2X2, action: () => onIconSize("medium") },
        { label: "Large Icons", icon: Grid2X2, action: () => onIconSize("large") },
      ],
    },
    {
      label: "Go",
      items: [
        { label: "SKY Desktop", icon: FolderOpen, action: () => onFolder("SKY Desktop") },
        { label: "Recent Files", icon: History, action: () => onFolder("Recent Files") },
        { label: "Company Logos", icon: ImageIcon, action: () => onFolder("Company Logos") },
        { label: "Trash", icon: Trash2, action: () => onFolder("Trash") },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Logo Manager", icon: ImageIcon, action: () => onFolder("Company Logos") },
        { label: "Import Excel", icon: FileSpreadsheet, action: () => onFolder("Excel Files") },
        { label: "Storage Health", icon: HardDrive, action: onSettings },
        { label: "Rebuild Index", icon: Database, action: onRefresh },
      ],
    },
    {
      label: "Window",
      items: [
        { label: "Bring Finder to Front", icon: FolderOpen, action: () => {} },
        { label: "Open Control Center", icon: Settings, action: onControlCenter },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Supported File Types", icon: FileCheck, action: onSettings },
        { label: "Keyboard Shortcuts", icon: Command, action: onCommand },
      ],
    },
  ]

  return (
    <div data-mac-menu className="mac-topbar">
      <div className="mac-topbar-left">
        <div className="mac-brand-mark">SKY</div>
        <span className="hidden text-sm font-black text-slate-950 md:inline">SKY Logistics</span>
        <div className="mac-menu-strip">
          {menuGroups.map((group) => (
            <div key={group.label} className="relative">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setOpenMenu((current) => (current === group.label ? null : group.label))
                }}
                className="mac-menu-button"
              >
                {group.label}
              </button>
              {openMenu === group.label ? (
                <div className="mac-menu-dropdown">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const disabled = "disabled" in item ? Boolean(item.disabled) : false
                    return (
                      <button
                        key={item.label}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          item.action()
                          setOpenMenu(null)
                        }}
                        className="mac-menu-item"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mac-topbar-right">
        <button type="button" onClick={onCommand} className="mac-topbar-pill">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Spotlight</span>
        </button>
        <button type="button" onClick={onUpload} className="mac-topbar-pill">
          <UploadCloud className="h-4 w-4" />
          <span className="hidden sm:inline">{records.length}</span>
        </button>
        <button type="button" onClick={onControlCenter} className="mac-topbar-pill">
          <Settings className="h-4 w-4" />
          <span className="hidden xl:inline">{formatBytes(totalStorage)}</span>
        </button>
        <span className="hidden rounded-full bg-white/58 px-3 py-1 text-xs font-black text-slate-700 shadow-sm md:inline">{dateText}</span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-slate-950 text-xs font-black text-white shadow-lg shadow-blue-200">
          AQ
        </span>
      </div>
    </div>
  )
}

function DesktopShortcutRail({
  iconSize,
  counts,
  onOpenFolder,
  onUpload,
  onLaunchpad,
}: {
  iconSize: "small" | "medium" | "large"
  counts: Record<string, number>
  onOpenFolder: (folder: string) => void
  onUpload: () => void
  onLaunchpad: () => void
}) {
  const sizeClass = iconSize === "large" ? "mac-desktop-icon-large" : iconSize === "small" ? "mac-desktop-icon-small" : ""
  const icons = [
    { label: "Finder", folder: "SKY Desktop", icon: FolderOpen, count: counts.total },
    { label: "Excel Files", folder: "Excel Files", icon: FileSpreadsheet, count: counts.excel },
    { label: "Company Logos", folder: "Company Logos", icon: ImageIcon, count: counts["Company Logos"] },
    { label: "Invoices", folder: "Invoices", icon: FileText, count: counts.Invoices },
    { label: "Bill of Lading", folder: "Bill of Lading", icon: PackageCheck, count: counts["Bill of Lading"] },
    { label: "Customs Docs", folder: "Customs Documents", icon: ShieldCheck, count: counts["Customs Documents"] },
    { label: "Media", folder: "Media", icon: Images, count: counts.image + counts.video + counts.audio },
    { label: "Trash", folder: "Trash", icon: Trash2, count: counts.Trash },
  ]

  return (
    <div className="mac-desktop-icons">
      <button type="button" className={`mac-desktop-icon ${sizeClass}`} onDoubleClick={onLaunchpad} onClick={onLaunchpad}>
        <span className="mac-icon-tile bg-gradient-to-br from-slate-950 to-blue-700">
          <Grid2X2 className="h-5 w-5 text-white" />
        </span>
        <span className="mac-desktop-label">Launchpad</span>
      </button>
      {icons.map((item) => {
        const Icon = item.icon
        return (
          <button key={item.label} type="button" className={`mac-desktop-icon ${sizeClass}`} onDoubleClick={() => onOpenFolder(item.folder)} onClick={() => onOpenFolder(item.folder)}>
            <span className="mac-icon-tile">
              <Icon className="h-5 w-5 text-blue-700" />
              {item.count ? <span className="mac-icon-badge">{item.count}</span> : null}
            </span>
            <span className="mac-desktop-label">{item.label}</span>
          </button>
        )
      })}
      <button type="button" className={`mac-desktop-icon ${sizeClass}`} onClick={onUpload}>
        <span className="mac-icon-tile bg-gradient-to-br from-blue-600 to-sky-500">
          <UploadCloud className="h-5 w-5 text-white" />
        </span>
        <span className="mac-desktop-label">Upload File</span>
      </button>
    </div>
  )
}

function MacDock({
  records,
  onFolder,
  onUpload,
  onCommand,
  onLaunchpad,
  onControlCenter,
  onSettings,
  onView,
}: {
  records: FileCenterRecord[]
  onFolder: (folder: string) => void
  onUpload: () => void
  onCommand: () => void
  onLaunchpad: () => void
  onControlCenter: () => void
  onSettings: () => void
  onView: (mode: FileViewMode) => void
}) {
  const trashCount = records.filter((record) => record.isDeleted).length
  const dockItems = [
    {
      label: "Finder",
      icon: FolderOpen,
      action: () => {
        window.dispatchEvent(new Event("sky-finder-toggle"))
        onFolder("SKY Desktop")
      },
    },
    { label: "Launchpad", icon: Grid2X2, action: onLaunchpad },
    { label: "Spotlight", icon: Search, action: onCommand },
    { label: "Excel", icon: FileSpreadsheet, action: () => onFolder("Excel Files") },
    { label: "PDF", icon: FileText, action: () => onView("grid") },
    { label: "Branding", icon: ImageIcon, action: () => onFolder("Company Logos") },
    { label: "Packets", icon: PackageCheck, action: () => onFolder("Shipment Packets") },
    { label: "Upload", icon: UploadCloud, action: onUpload },
    { label: "Settings", icon: Settings, action: onSettings },
    { label: "Control", icon: SlidersIcon, action: onControlCenter },
    { label: "Trash", icon: Trash2, action: () => onFolder("Trash"), badge: trashCount },
  ]

  return (
    <div data-mac-dock className="mac-dock">
      {dockItems.map((item) => {
        const Icon = item.icon
        return (
          <button key={item.label} type="button" className="mac-dock-icon group" onClick={item.action} title={item.label}>
            <Icon className="h-[26px] w-[26px]" />
            {item.badge ? <span className="mac-dock-badge">{item.badge}</span> : null}
            <span className="mac-dock-tooltip">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SlidersIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  )
}

function MacControlCenter({
  totalFiles,
  totalStorage,
  uploadQueue,
  viewMode,
  iconSize,
  onView,
  onIconSize,
  onUpload,
  onRefresh,
  onClose,
}: {
  totalFiles: number
  totalStorage: number
  uploadQueue: UploadQueueItem[]
  viewMode: FileViewMode
  iconSize: "small" | "medium" | "large"
  onView: (mode: FileViewMode) => void
  onIconSize: (size: "small" | "medium" | "large") => void
  onUpload: () => void
  onRefresh: () => void
  onClose: () => void
}) {
  return (
    <div data-mac-menu className="mac-control-center">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Control Center</p>
          <h3 className="text-xl font-black text-slate-950">Storage & Desktop</h3>
        </div>
        <button type="button" className="mac-titlebar-button" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="mac-control-card">
          <HardDrive className="h-5 w-5 text-blue-700" />
          <span>{totalFiles} files</span>
          <strong>{formatBytes(totalStorage)}</strong>
        </div>
        <div className="mac-control-card">
          <UploadCloud className="h-5 w-5 text-blue-700" />
          <span>Uploads</span>
          <strong>{uploadQueue.filter((item) => item.status === "Uploading").length} active</strong>
        </div>
      </div>
      <div className="mt-4 rounded-[22px] border border-blue-100 bg-white/70 p-3">
        <p className="text-xs font-black text-slate-700">View Mode</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["desktop", "grid", "list", "timeline"] as FileViewMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => onView(mode)} className={`mac-control-chip ${viewMode === mode ? "mac-control-chip-active" : ""}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-[22px] border border-blue-100 bg-white/70 p-3">
        <p className="text-xs font-black text-slate-700">Desktop Icon Size</p>
        <div className="mt-2 flex gap-2">
          {(["small", "medium", "large"] as const).map((size) => (
            <button key={size} type="button" onClick={() => onIconSize(size)} className={`mac-control-chip ${iconSize === size ? "mac-control-chip-active" : ""}`}>
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onUpload} className="file-center-primary-button flex-1">
          <UploadCloud className="h-4 w-4" />
          Upload
        </button>
        <button type="button" onClick={onRefresh} className="file-center-secondary-button flex-1">
          <RefreshCw className="h-4 w-4" />
          Rebuild
        </button>
      </div>
    </div>
  )
}

function MacLaunchpad({ onClose, onOpen }: { onClose: () => void; onOpen: (target: string) => void }) {
  const apps = [
    { label: "Files & Media Center", icon: FolderOpen },
    { label: "Excel Viewer", icon: FileSpreadsheet },
    { label: "PDF Viewer", icon: FileText },
    { label: "Media Viewer", icon: Images },
    { label: "Branding Center", icon: ImageIcon },
    { label: "Logo Manager", icon: BadgeCheck },
    { label: "Shipment Packets", icon: PackageCheck },
    { label: "Invoices", icon: FileText },
    { label: "Bill of Lading", icon: PackageCheck },
    { label: "Truck Documents", icon: Boxes },
    { label: "Storage Health", icon: HardDrive },
    { label: "Upload File", icon: UploadCloud },
    { label: "Spotlight", icon: Search },
    { label: "Settings", icon: Settings },
  ]

  return (
    <div className="mac-launchpad">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.26em] text-[#D4AF37]">Launchpad</p>
          <h3 className="text-3xl font-black text-slate-950">SKY Desktop Apps</h3>
        </div>
        <button type="button" onClick={onClose} className="mac-titlebar-button">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mx-auto mt-8 grid w-full max-w-6xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
        {apps.map((app) => {
          const Icon = app.icon
          return (
            <button key={app.label} type="button" onClick={() => onOpen(app.label)} className="mac-launchpad-app">
              <span className="mac-launchpad-icon">
                <Icon className="h-7 w-7 text-blue-700" />
              </span>
              <span>{app.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MacDesktopContextMenu({
  position,
  canPaste,
  onNewFolder,
  onUpload,
  onPaste,
  onRefresh,
  onSortName,
  onSortDate,
  onSortType,
  onIconSize,
  onClose,
}: {
  position: { x: number; y: number }
  canPaste: boolean
  onNewFolder: () => void
  onUpload: () => void
  onPaste: () => void
  onRefresh: () => void
  onSortName: () => void
  onSortDate: () => void
  onSortType: () => void
  onIconSize: (size: "small" | "medium" | "large") => void
  onClose: () => void
}) {
  const maxLeft = typeof window === "undefined" ? position.x : Math.min(position.x, window.innerWidth - 230)
  const maxTop = typeof window === "undefined" ? position.y : Math.min(position.y, window.innerHeight - 390)
  const items = [
    { label: "New Folder", icon: Folder, action: onNewFolder },
    { label: "Upload File", icon: UploadCloud, action: onUpload },
    { label: "Paste", icon: ClipboardList, action: onPaste, disabled: !canPaste },
    { label: "Refresh", icon: RefreshCw, action: onRefresh },
    { label: "Sort by Name", icon: Languages, action: onSortName },
    { label: "Sort by Date", icon: CalendarDays, action: onSortDate },
    { label: "Sort by Type", icon: Tags, action: onSortType },
    { label: "Small Icons", icon: Grid2X2, action: () => onIconSize("small") },
    { label: "Medium Icons", icon: Grid2X2, action: () => onIconSize("medium") },
    { label: "Large Icons", icon: Grid2X2, action: () => onIconSize("large") },
  ]

  return (
    <div
      data-mac-menu
      className="mac-context-menu"
      style={{ left: maxLeft, top: maxTop }}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        return (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              item.action()
              onClose()
            }}
            className={`mac-menu-item ${index === 3 || index === 7 ? "border-t border-blue-100/70" : ""}`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function FinderToolbar({
  selectedRecord,
  clipboardItem,
  viewMode,
  onUpload,
  onNewFolder,
  onCopy,
  onCut,
  onPaste,
  onRename,
  onDuplicate,
  onDelete,
  onRestore,
  onQuickLook,
  onViewMode,
}: {
  selectedRecord?: FileCenterRecord
  clipboardItem: ClipboardItem
  viewMode: FileViewMode
  onUpload: () => void
  onNewFolder: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  onRestore: () => void
  onQuickLook: () => void
  onViewMode: (mode: FileViewMode) => void
}) {
  const hasSelection = Boolean(selectedRecord)
  const isTrash = Boolean(selectedRecord?.isDeleted)

  return (
    <section className="rounded-[28px] border border-blue-100 bg-white/72 p-3 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
      <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <ToolbarButton label="Upload" icon={UploadCloud} onClick={onUpload} />
          <ToolbarButton label="New Folder" icon={Folder} onClick={onNewFolder} />
          <ToolbarButton label="Copy" icon={Copy} onClick={onCopy} disabled={!hasSelection || isTrash} />
          <ToolbarButton label="Cut" icon={FileInput} onClick={onCut} disabled={!hasSelection || isTrash} />
          <ToolbarButton label="Paste" icon={ClipboardList} onClick={onPaste} disabled={!clipboardItem} />
          <ToolbarButton label="Duplicate" icon={FileArchive} onClick={onDuplicate} disabled={!hasSelection || isTrash} />
          <ToolbarButton label="Rename" icon={FileCog} onClick={onRename} disabled={!hasSelection || Boolean(selectedRecord?.isLocked) || isTrash} />
          {isTrash ? (
            <ToolbarButton label="Restore" icon={RefreshCw} onClick={onRestore} disabled={!hasSelection} />
          ) : (
            <ToolbarButton label="Trash" icon={Trash2} onClick={onDelete} disabled={!hasSelection} danger />
          )}
          <ToolbarButton label="Quick Look" icon={Eye} onClick={onQuickLook} disabled={!hasSelection} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["desktop", "grid", "list"] as FileViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewMode(mode)}
              className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black capitalize transition ${
                viewMode === mode ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/80 text-slate-600 hover:bg-blue-50"
              }`}
            >
              {mode === "desktop" ? <FolderOpen className="h-4 w-4" /> : mode === "grid" ? <Grid2X2 className="h-4 w-4" /> : <ListFilter className="h-4 w-4" />}
              {mode}
            </button>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[11px] font-bold text-slate-500">
        Shortcuts: Ctrl+C copy, Ctrl+X cut, Ctrl+V paste, Ctrl+D duplicate, Enter rename, Delete trash, Space quick preview.
      </p>
    </section>
  )
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string
  icon: any
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-10 items-center gap-2 rounded-2xl border px-3 text-xs font-black shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 ${
        danger
          ? "border-red-100 bg-red-50 text-red-700 enabled:hover:bg-red-100"
          : "border-blue-100 bg-white/80 text-slate-700 enabled:hover:border-[#D4AF37]/50 enabled:hover:bg-blue-50 enabled:hover:text-blue-700"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function SkyDesktopView({
  records,
  folders,
  activeFolder,
  selectedId,
  onOpenFolder,
  onSelect,
  onQuickLook,
  onUpload,
  onNewFolder,
}: {
  records: FileCenterRecord[]
  folders: string[]
  activeFolder: string
  selectedId: string
  onOpenFolder: (folder: string) => void
  onSelect: (id: string) => void
  onQuickLook: (record: FileCenterRecord) => void
  onUpload: () => void
  onNewFolder: () => void
}) {
  const desktopFolders = folders.filter((folder) => folder !== "Trash").slice(0, 12)

  return (
    <div className="min-h-[520px] rounded-[30px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.12),transparent_32%),linear-gradient(135deg,rgba(255,255,255,.72),rgba(239,246,255,.7))] p-5 shadow-inner">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">SKY Desktop</p>
          <h4 className="text-2xl font-black text-slate-950">{activeFolder}</h4>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onNewFolder} className="file-center-secondary-button">
            <Folder className="h-4 w-4" />
            New Folder
          </button>
          <button type="button" onClick={onUpload} className="file-center-primary-button">
            <UploadCloud className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {desktopFolders.map((folder) => (
          <button
            key={folder}
            type="button"
            onDoubleClick={() => onOpenFolder(folder)}
            onClick={() => onOpenFolder(folder)}
            className={`group rounded-[24px] border p-4 text-center shadow-lg backdrop-blur-xl transition hover:-translate-y-1 ${
              activeFolder === folder ? "border-blue-400 bg-blue-50/90 shadow-blue-200" : "border-white/80 bg-white/70 shadow-blue-100/50 hover:border-[#D4AF37]/50"
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl shadow-blue-200">
              <FolderOpen className="h-8 w-8" />
            </div>
            <span className="mt-3 block truncate text-xs font-black text-slate-800">{folder}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={onUpload}
          className="group rounded-[24px] border border-dashed border-blue-300 bg-white/55 p-4 text-center shadow-lg shadow-blue-100/50 backdrop-blur-xl transition hover:-translate-y-1 hover:bg-blue-50"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white text-blue-700 shadow-inner">
            <UploadCloud className="h-8 w-8" />
          </div>
          <span className="mt-3 block text-xs font-black text-blue-700">Upload File</span>
        </button>

        {records.slice(0, 36).map((record) => {
          const Icon = getKindIcon(record.mediaType)
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              onDoubleClick={() => onQuickLook(record)}
              className={`rounded-[24px] border p-4 text-center shadow-lg backdrop-blur-xl transition hover:-translate-y-1 ${
                selectedId === record.id ? "border-blue-500 bg-blue-50/90 shadow-blue-200" : "border-white/80 bg-white/70 shadow-blue-100/50 hover:border-[#D4AF37]/50"
              }`}
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border border-blue-100 bg-white text-blue-700 shadow-inner">
                <Icon className="h-8 w-8" />
              </div>
              <span className="mt-3 block truncate text-xs font-black text-slate-800">{record.originalName}</span>
              <span className="mt-1 block text-[10px] font-bold text-slate-500">{formatBytes(record.fileSize)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FileListView({
  records,
  selectedId,
  onSelect,
  onQuickLook,
  onToggleFavorite,
  onRestore,
  onDelete,
}: {
  records: FileCenterRecord[]
  selectedId: string
  onSelect: (id: string) => void
  onQuickLook: (record: FileCenterRecord) => void
  onToggleFavorite: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (!records.length) return <EmptyState onUpload={() => {}} />

  return (
    <div className="overflow-hidden rounded-[26px] border border-blue-100 bg-white/72 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
      <div className="grid min-w-[980px] grid-cols-[2.1fr_1fr_.8fr_1fr_1fr_.8fr_1fr] border-b border-blue-100 bg-blue-50/80 px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">
        <span>Name</span>
        <span>Type</span>
        <span>Size</span>
        <span>Status</span>
        <span>Linked Record</span>
        <span>Date</span>
        <span>Actions</span>
      </div>
      <div className="max-h-[620px] min-w-[980px] overflow-y-auto">
        {records.map((record) => {
          const Icon = getKindIcon(record.mediaType)
          return (
            <div
              key={record.id}
              onClick={() => onSelect(record.id)}
              onDoubleClick={() => onQuickLook(record)}
              className={`grid grid-cols-[2.1fr_1fr_.8fr_1fr_1fr_.8fr_1fr] items-center gap-3 border-b border-blue-50 px-4 py-3 text-sm font-bold transition hover:bg-blue-50/60 ${
                selectedId === record.id ? "bg-blue-50 text-blue-800" : "text-slate-700"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <Icon className="h-5 w-5 shrink-0 text-blue-700" />
                <span className="min-w-0">
                  <span className="block truncate font-black text-slate-950">{record.originalName}</span>
                  <span className="block truncate text-[11px] text-slate-500">{record.folder || record.category}</span>
                </span>
              </span>
              <span className="truncate">{record.documentType}</span>
              <span>{formatBytes(record.fileSize)}</span>
              <span><Badge label={record.status || "Uploaded"} tone={record.isDeleted ? "red" : "blue"} /></span>
              <span className="truncate">{record.invoiceNo || record.billOfLadingNo || record.containerNo || record.customer || "--"}</span>
              <span>{formatDate(record.createdAt)}</span>
              <span className="flex gap-1">
                <button type="button" onClick={(event) => { event.stopPropagation(); onToggleFavorite(record.id) }} className="file-card-action text-rose-600"><Star className="h-4 w-4" /></button>
                <button type="button" onClick={(event) => { event.stopPropagation(); onQuickLook(record) }} className="file-card-action text-blue-700"><Eye className="h-4 w-4" /></button>
                {record.isDeleted ? (
                  <button type="button" onClick={(event) => { event.stopPropagation(); onRestore(record.id) }} className="file-card-action text-emerald-700"><RefreshCw className="h-4 w-4" /></button>
                ) : (
                  <button type="button" onClick={(event) => { event.stopPropagation(); onDelete(record.id) }} className="file-card-action text-red-600"><Trash2 className="h-4 w-4" /></button>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickLookPreview({
  record,
  onClose,
  onDelete,
  onRestore,
}: {
  record: FileCenterRecord
  onClose: () => void
  onDelete: () => void
  onRestore: () => void
}) {
  const previewUrl = record.backendId ? pythonBackend.media.fileUrl(record.backendId) : record.localUrl
  const TypeIcon = getKindIcon(record.mediaType)

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-lg">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/75 bg-white/88 shadow-2xl shadow-blue-950/30 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-white/70 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Quick Look Preview</p>
              <h3 className="truncate text-lg font-black text-slate-950">{record.originalName}</h3>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {previewUrl ? (
              <a href={previewUrl} target="_blank" rel="noreferrer" className="file-center-secondary-button">
                <Eye className="h-4 w-4" />
                Open
              </a>
            ) : null}
            {previewUrl ? (
              <a href={previewUrl} download className="file-center-secondary-button">
                <Download className="h-4 w-4" />
                Download
              </a>
            ) : null}
            {record.isDeleted ? (
              <button type="button" onClick={onRestore} className="file-center-secondary-button">
                <RefreshCw className="h-4 w-4" />
                Restore
              </button>
            ) : (
              <button type="button" onClick={onDelete} className="file-center-danger-button">
                <Trash2 className="h-4 w-4" />
                Trash
              </button>
            )}
            <button type="button" onClick={onClose} className="file-card-action text-slate-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-[560px] items-center justify-center overflow-auto rounded-[28px] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50 p-4 shadow-inner">
            {record.mediaType === "image" && previewUrl ? (
              <img src={previewUrl} alt={record.originalName} className="max-h-[70vh] max-w-full object-contain" />
            ) : record.mediaType === "video" && previewUrl ? (
              <video src={previewUrl} controls className="max-h-[70vh] w-full rounded-3xl bg-black shadow-2xl" />
            ) : record.mediaType === "audio" && previewUrl ? (
              <div className="w-full max-w-xl rounded-[30px] border border-blue-100 bg-white/80 p-6 shadow-2xl shadow-blue-100">
                <Volume2 className="mx-auto h-14 w-14 text-blue-700" />
                <div className="my-6 flex h-24 items-end gap-1">
                  {Array.from({ length: 48 }).map((_, index) => (
                    <span key={index} className="flex-1 rounded-full bg-blue-400" style={{ height: `${24 + ((index * 17) % 68)}px` }} />
                  ))}
                </div>
                <audio src={previewUrl} controls className="w-full" />
              </div>
            ) : record.mediaType === "pdf" && previewUrl ? (
              <iframe src={previewUrl} title={record.originalName} className="h-[70vh] w-full rounded-2xl border border-blue-100 bg-white" />
            ) : record.mediaType === "excel" ? (
              <ExcelReadOnlyPreview record={record} />
            ) : (
              <div className="text-center">
                <TypeIcon className="mx-auto h-20 w-20 text-blue-700" />
                <p className="mt-4 text-lg font-black text-slate-700">Preview available by opening this file.</p>
                <p className="mt-2 text-sm font-bold text-slate-500">{record.fileType}</p>
              </div>
            )}
          </div>

          <aside className="min-h-0 overflow-y-auto rounded-[28px] border border-blue-100 bg-white/70 p-4 shadow-xl shadow-blue-100/60">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Properties</p>
            <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
              <InfoPill label="Type" value={record.documentType} />
              <InfoPill label="Size" value={formatBytes(record.fileSize)} />
              <InfoPill label="Folder" value={record.folder || record.category} />
              <InfoPill label="Status" value={record.status} />
              <InfoPill label="Invoice" value={record.invoiceNo || "--"} />
              <InfoPill label="BOL" value={record.billOfLadingNo || "--"} />
              <InfoPill label="Container" value={record.containerNo || "--"} />
              <InfoPill label="Customer" value={record.customer || "--"} />
              <InfoPill label="Route" value={record.route || "--"} />
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}

function ExcelReadOnlyPreview({ record }: { record: FileCenterRecord }) {
  return (
    <div className="w-full max-w-3xl rounded-[28px] border border-blue-100 bg-white/85 p-5 shadow-xl shadow-blue-100">
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-10 w-10 text-emerald-700" />
        <div>
          <p className="text-lg font-black text-slate-950">Excel preview workspace</p>
          <p className="text-sm font-bold text-slate-500">{record.originalName}</p>
        </div>
      </div>
      <div className="mt-5 overflow-auto rounded-2xl border border-blue-100">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-emerald-50 text-left text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            <tr>{["A", "B", "C", "D", "E", "F"].map((column) => <th key={column} className="border border-emerald-100 px-3 py-2">{column}</th>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-white even:bg-slate-50">
                {Array.from({ length: 6 }).map((_, columnIndex) => (
                  <td key={columnIndex} className="border border-slate-100 px-3 py-2 font-bold text-slate-600">
                    {rowIndex === 0 ? (["Invoice No", "Customer", "Container", "Amount", "Status", "Route"][columnIndex]) : rowIndex === 1 ? "Preview" : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs font-bold text-slate-500">Read-only Excel shell is ready. Full parsing can be connected to the existing backend Excel import endpoint.</p>
    </div>
  )
}

function FileCard({
  record,
  selected,
  onSelect,
  onToggleFavorite,
  onMarkFinal,
  onDelete,
}: {
  record: FileCenterRecord
  selected: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  onMarkFinal: () => void
  onDelete: () => void
}) {
  const TypeIcon = getKindIcon(record.mediaType)
  return (
    <article
      onClick={onSelect}
      className={`group cursor-pointer rounded-[24px] border p-3 shadow-lg backdrop-blur-xl transition hover:-translate-y-1 ${
        selected ? "border-blue-400 bg-blue-50/85 shadow-blue-200" : "border-blue-100 bg-white/72 shadow-blue-100/60 hover:border-[#D4AF37]/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-inner">
          <TypeIcon className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="line-clamp-2 text-sm font-black leading-5 text-slate-950">{record.originalName}</h4>
          <p className="mt-1 text-xs font-bold text-slate-500">{record.documentType} - {formatBytes(record.fileSize)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge label={record.status || "Uploaded"} tone="blue" />
        <Badge label={record.processingStatus || "Ready"} tone="green" />
        {record.isFinal ? <Badge label="Final" tone="gold" /> : null}
        {record.isLocked ? <Badge label="Locked" tone="slate" /> : null}
        {isExpired(record.expiryDate) ? <Badge label="Expired" tone="red" /> : null}
        {getDueStatus(record) === "Overdue" ? <Badge label="Overdue" tone="red" /> : null}
        {getDueStatus(record) === "Due Soon" ? <Badge label="Due Soon" tone="gold" /> : null}
        {record.qualityStatus !== "Good Quality" ? <Badge label={record.qualityStatus} tone="red" /> : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-black text-slate-600">
        <InfoPill label="Invoice" value={record.invoiceNo || "--"} />
        <InfoPill label="Container" value={record.containerNo || "--"} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={(event) => { event.stopPropagation(); onToggleFavorite() }} className={`file-card-action ${record.favorite ? "text-rose-600" : "text-slate-600"}`}>
          <Star className="h-4 w-4" />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onMarkFinal() }} className="file-card-action text-blue-700">
          <CheckCircle2 className="h-4 w-4" />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDelete() }} className="file-card-action text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}

function PreviewPanel({
  record,
  onUpdate,
  onDelete,
}: {
  record?: FileCenterRecord
  onUpdate: (id: string, patch: Partial<FileCenterRecord>) => void
  onDelete: (id: string) => void
}) {
  const [detailsOpen, setDetailsOpen] = useState(true)

  if (!record) {
    return (
      <GlassPanel title="Split Preview" icon={Eye}>
        <p className="rounded-2xl border border-blue-100 bg-white/65 p-5 text-sm font-bold text-slate-600">Select a file to preview details.</p>
      </GlassPanel>
    )
  }

  const previewUrl = record.backendId ? pythonBackend.media.fileUrl(record.backendId) : record.localUrl
  const TypeIcon = getKindIcon(record.mediaType)

  return (
    <section className="overflow-hidden rounded-[30px] border border-blue-100 bg-white/74 shadow-2xl shadow-blue-100/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-blue-100 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Split Preview</p>
            <h3 className="truncate text-sm font-black text-slate-950">{record.originalName}</h3>
          </div>
        </div>
        <button type="button" onClick={() => setDetailsOpen((value) => !value)} className="file-card-action text-blue-700">
          <FileSearch className="h-4 w-4" />
        </button>
      </div>

      <div className="p-4">
        <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-br from-slate-50 to-blue-50">
          {record.mediaType === "image" && previewUrl ? (
            <img src={previewUrl} alt={record.originalName} className="max-h-72 max-w-full object-contain" />
          ) : record.mediaType === "video" && previewUrl ? (
            <video src={previewUrl} controls className="max-h-72 w-full rounded-2xl" />
          ) : record.mediaType === "audio" && previewUrl ? (
            <div className="w-full max-w-sm rounded-3xl border border-blue-100 bg-white/80 p-5 shadow-lg">
              <Volume2 className="mx-auto h-10 w-10 text-blue-700" />
              <div className="my-5 flex h-16 items-end gap-1">
                {Array.from({ length: 28 }).map((_, index) => (
                  <span key={index} className="flex-1 rounded-full bg-blue-400" style={{ height: `${20 + ((index * 13) % 44)}px` }} />
                ))}
              </div>
              <audio src={previewUrl} controls className="w-full" />
            </div>
          ) : (
            <div className="text-center">
              <TypeIcon className="mx-auto h-16 w-16 text-blue-700" />
              <p className="mt-3 text-sm font-black text-slate-700">Preview ready for {record.documentType}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Open or download to inspect this document.</p>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noreferrer" className="file-center-secondary-button">
              <Eye className="h-4 w-4" />
              Open
            </a>
          ) : null}
          {previewUrl ? (
            <a href={previewUrl} download className="file-center-secondary-button">
              <Download className="h-4 w-4" />
              Download
            </a>
          ) : null}
          <button type="button" onClick={() => navigator.clipboard?.writeText(record.storagePath || record.originalName)} className="file-center-secondary-button">
            <Copy className="h-4 w-4" />
            Copy Path
          </button>
          <button type="button" onClick={() => onDelete(record.id)} className="file-center-danger-button">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>

        {detailsOpen ? (
          <div className="mt-4 space-y-3">
            <EditableText label="File Name" value={record.originalName} onChange={(value) => onUpdate(record.id, { originalName: value })} disabled={record.isLocked} />
            <div className="grid gap-3 sm:grid-cols-2">
              <EditableText label="Invoice No" value={record.invoiceNo} onChange={(value) => onUpdate(record.id, { invoiceNo: value })} />
              <EditableText label="BOL No" value={record.billOfLadingNo} onChange={(value) => onUpdate(record.id, { billOfLadingNo: value })} />
              <EditableText label="Container No" value={record.containerNo} onChange={(value) => onUpdate(record.id, { containerNo: value })} />
              <EditableText label="Truck No" value={record.truckNo} onChange={(value) => onUpdate(record.id, { truckNo: value })} />
              <EditableText label="Customer" value={record.customer} onChange={(value) => onUpdate(record.id, { customer: value })} />
              <EditableText label="Expiry Date" value={record.expiryDate} onChange={(value) => onUpdate(record.id, { expiryDate: value })} type="date" />
              <EditableText label="Due Date" value={record.dueDate} onChange={(value) => onUpdate(record.id, { dueDate: value, dueStatus: getDueStatus({ ...record, dueDate: value }) })} type="date" />
              <SelectField label="Currency" value={record.currency} options={currencies} onChange={(value) => onUpdate(record.id, { currency: value })} />
              <EditableText label="Amount" value={record.amount} onChange={(value) => onUpdate(record.id, { amount: value })} />
              <SelectField label="Payment Status" value={record.paymentStatus} options={["Unpaid", "Partially Paid", "Paid", "Overdue", "Cancelled"]} onChange={(value) => onUpdate(record.id, { paymentStatus: value })} />
              <EditableText label="Seal No" value={record.sealNo} onChange={(value) => onUpdate(record.id, { sealNo: value })} />
              <EditableText label="Container Type" value={record.containerType} onChange={(value) => onUpdate(record.id, { containerType: value })} />
              <SelectField label="Vault Type" value={record.ownerType} options={["Customer", "Driver", "Truck", "Container", "Shipment"]} onChange={(value) => onUpdate(record.id, { ownerType: value })} />
              <EditableText label="Vault Name" value={record.ownerName} onChange={(value) => onUpdate(record.id, { ownerName: value })} />
            </div>
            <EditableText label="Route / Notes" value={record.route || record.notes} onChange={(value) => onUpdate(record.id, { route: value, notes: value })} />
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-black text-slate-700">
              Quality: <span className={record.qualityStatus === "Needs Review" ? "text-amber-700" : "text-emerald-700"}>{record.qualityStatus}</span>
              <span className="mx-2 text-slate-300">|</span>
              Due: <span className={getDueStatus(record) === "Overdue" ? "text-red-600" : "text-blue-700"}>{getDueStatus(record)}</span>
              <span className="mx-2 text-slate-300">|</span>
              OCR: Ready for future extraction
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleButton active={record.isLocked} label={record.isLocked ? "Locked" : "Lock File"} icon={Lock} onClick={() => onUpdate(record.id, { isLocked: !record.isLocked })} />
              <ToggleButton active={record.isFinal} label={record.isFinal ? "Final Document" : "Mark Final"} icon={FileCheck} onClick={() => onUpdate(record.id, { isFinal: !record.isFinal, isLocked: !record.isFinal || record.isLocked })} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => copyDetails(record)} className="file-center-secondary-button">
                <Copy className="h-4 w-4" />
                Copy Details
              </button>
              <button type="button" onClick={() => copyWhatsAppMessage(record)} className="file-center-secondary-button">
                <MessageCircle className="h-4 w-4" />
                WhatsApp Message
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function ModuleDropPanel() {
  const modules = ["Invoice Editor", "Bill of Lading", "Export Accounts", "Imports Trucks List", "Branding Center"]
  return (
    <GlassPanel title="Drag File to Module" icon={Layers}>
      <div className="grid gap-2">
        {modules.map((module) => (
          <div key={module} className="rounded-2xl border border-blue-100 bg-white/65 px-3 py-2 text-xs font-black text-slate-700">
            Drop to {module} - confirmation required
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}

function TimelineView({ records }: { records: FileCenterRecord[] }) {
  const events = records.flatMap((record) => {
    const base = record.timeline.length ? record.timeline : [`Uploaded ${record.documentType || "file"}`]
    return base.map((event, index) => ({ id: `${record.id}-${index}`, record, event }))
  })

  if (!events.length) return <EmptyInline message="No timeline activity yet." />

  return (
    <div className="space-y-3">
      {events.map((item) => (
        <div key={item.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
          <div className="flex flex-col items-center">
            <span className="h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-lg shadow-blue-200" />
            <span className="mt-1 min-h-10 w-px bg-blue-100" />
          </div>
          <div className="rounded-[22px] border border-blue-100 bg-white/76 p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-950">{item.event}</p>
              <span className="text-[11px] font-black text-slate-500">{formatDate(item.record.createdAt)}</span>
            </div>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{item.record.originalName}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function KanbanView({
  records,
  onStatusChange,
}: {
  records: FileCenterRecord[]
  onStatusChange: (id: string, status: string) => void
}) {
  return (
    <div className="grid min-w-[920px] gap-3 overflow-x-auto pb-2 lg:grid-cols-3 2xl:grid-cols-7">
      {kanbanStatuses.map((status) => {
        const rows = records.filter((record) => normalizedStatus(record.status) === normalizedStatus(status))
        return (
          <section key={status} className="min-h-72 rounded-[24px] border border-blue-100 bg-white/60 p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-950">{status}</h4>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">{rows.length}</span>
            </div>
            <div className="space-y-2">
              {rows.length ? rows.map((record) => (
                <div key={record.id} className="rounded-2xl border border-blue-100 bg-white/82 p-3 shadow-sm">
                  <p className="line-clamp-2 text-xs font-black text-slate-900">{record.originalName}</p>
                  <p className="mt-1 text-[11px] font-bold text-slate-500">{record.customer || record.documentType}</p>
                  <select
                    value={record.status || "Uploaded"}
                    onChange={(event) => onStatusChange(record.id, event.target.value)}
                    className="mt-2 h-9 w-full rounded-xl border border-blue-100 bg-white px-2 text-xs font-black text-blue-700 outline-none"
                  >
                    {kanbanStatuses.map((nextStatus) => <option key={nextStatus}>{nextStatus}</option>)}
                  </select>
                </div>
              )) : (
                <p className="rounded-2xl border border-dashed border-blue-100 p-3 text-xs font-bold text-slate-400">No files</p>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function CalendarView({ records }: { records: FileCenterRecord[] }) {
  const grouped = records.reduce<Record<string, FileCenterRecord[]>>((acc, record) => {
    const key = record.dueDate || record.expiryDate || record.createdAt.slice(0, 10)
    acc[key] = acc[key] || []
    acc[key].push(record)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  if (!dates.length) return <EmptyInline message="No calendar dates yet." />

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {dates.map((date) => (
        <div key={date} className="rounded-[24px] border border-blue-100 bg-white/72 p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">{formatDate(date)}</p>
          <div className="mt-3 space-y-2">
            {grouped[date].map((record) => (
              <div key={record.id} className="rounded-2xl bg-blue-50/70 px-3 py-2 text-xs font-black text-slate-700">
                {record.originalName}
                <span className="mt-1 block text-[11px] text-blue-700">{getDueStatus(record)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function VaultsView({ records, onSelect }: { records: FileCenterRecord[]; onSelect: (id: string) => void }) {
  const groups = groupVaults(records)
  const keys = Object.keys(groups)
  if (!keys.length) return <EmptyInline message="No customer, driver, truck, or container vault files yet." />

  return (
    <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {keys.map((key) => {
        const [type, name] = key.split("::")
        return (
          <section key={key} className="rounded-[24px] border border-blue-100 bg-white/72 p-4 shadow-lg shadow-blue-100/40">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                {type === "Driver" ? <UserRound className="h-6 w-6" /> : type === "Truck" ? <Boxes className="h-6 w-6" /> : type === "Container" ? <PackageCheck className="h-6 w-6" /> : <Database className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">{type} Vault</p>
                <h4 className="truncate text-lg font-black text-slate-950">{name}</h4>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <InfoPill label="Files" value={String(groups[key].length)} />
              <InfoPill label="Expired" value={String(groups[key].filter((record) => isExpired(record.expiryDate)).length)} />
              <InfoPill label="Missing" value={String(Math.max(0, 3 - groups[key].length))} />
            </div>
            <div className="mt-3 space-y-2">
              {groups[key].slice(0, 4).map((record) => (
                <button key={record.id} type="button" onClick={() => onSelect(record.id)} className="block w-full truncate rounded-2xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-left text-xs font-black text-blue-800">
                  {record.originalName}
                </button>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function SettingsPanel() {
  return (
    <GlassPanel title="File Manager Settings" icon={Settings}>
      <div className="space-y-3 text-sm font-bold text-slate-700">
        {[
          ["General", "Default view: Grid, sort by newest, show details panel"],
          ["Upload", "Upload to current folder, auto rename duplicates, smart detection"],
          ["Branding", "Default logo, stamp, signature, and letterhead"],
          ["Storage", "Local PC storage, rebuild index, export backup, restore backup"],
          ["Excel", "Auto-detect headers and save mapping templates"],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-blue-100 bg-white/68 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">{title}</p>
            <p className="mt-1">{text}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  )
}

function CommandPalette({
  query,
  matches,
  onQuery,
  onRun,
  onClose,
  inputRef,
}: {
  query: string
  matches: string[]
  onQuery: (value: string) => void
  onRun: (command: string) => void
  onClose: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && matches[0]) {
      onRun(matches[0])
    }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center bg-slate-950/35 px-4 pt-24 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[30px] border border-white/75 bg-white/82 shadow-2xl shadow-blue-950/20 backdrop-blur-2xl">
        <div className="flex items-center gap-3 border-b border-blue-100 p-4">
          <Command className="h-6 w-6 text-blue-700" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or files"
            className="min-w-0 flex-1 bg-transparent text-lg font-black outline-none placeholder:text-slate-400"
          />
          <button type="button" onClick={onClose} className="file-card-action">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-3">
          <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#D4AF37]">Recent commands</p>
          <div className="space-y-1">
            {matches.map((match) => (
              <button
                key={match}
                type="button"
                onClick={() => onRun(match)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-black text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
              >
                <Sparkles className="h-4 w-4" />
                {match}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OnboardingModal({ onClose, onUpload }: { onClose: () => void; onUpload: () => void }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-[34px] border border-white/80 bg-white/86 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-600 text-white shadow-xl shadow-blue-200">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-center text-3xl font-black text-slate-950">Welcome to Files & Media Center</h3>
        <p className="mt-3 text-center text-sm font-bold leading-7 text-slate-600">
          Manage Excel files, logos, invoices, BOL documents, and shipment media in one place.
        </p>
        <div className="mt-5 grid gap-2">
          {["Upload your first file", "Add company logo", "Create folders", "Attach documents to ledgers and invoices", "Open Excel files inside software"].map((step, index) => (
            <div key={step} className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm font-black text-slate-700">
              {index + 1}. {step}
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onUpload} className="file-center-primary-button">
            <UploadCloud className="h-4 w-4" />
            Upload File
          </button>
          <button type="button" onClick={onClose} className="file-center-secondary-button">
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-[26px] border border-dashed border-blue-200 bg-blue-50/45 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white text-blue-700 shadow-xl shadow-blue-100">
        <UploadCloud className="h-10 w-10" />
      </div>
      <h3 className="mt-5 text-2xl font-black text-slate-950">No files uploaded yet</h3>
      <p className="mt-2 max-w-md text-sm font-bold leading-7 text-slate-600">Upload PDFs, Excel files, logos, images, videos, or voice messages to start building your company file index.</p>
      <button type="button" onClick={onUpload} className="file-center-primary-button mt-5">
        <Plus className="h-4 w-4" />
        Upload File
      </button>
    </div>
  )
}

function GlassPanel({ title, icon: Icon, children }: { title: string; icon: any; children: ReactNode }) {
  return (
    <section className="rounded-[28px] border border-blue-100 bg-white/68 p-4 shadow-xl shadow-blue-100/60 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: "blue" | "gold" | "green" }) {
  const classes = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    gold: "border-[#D4AF37]/30 bg-[#fff8df] text-[#8a6200]",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${classes[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-1 text-xl font-black">{value}</p>
    </div>
  )
}

function EditableText({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  disabled?: boolean
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9b6d00]">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-blue-100 bg-white/80 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
      />
    </label>
  )
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9b6d00]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-2xl border border-blue-100 bg-white/80 px-3 text-sm font-black text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
      >
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  )
}

function EmptyInline({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/45 p-8 text-center text-sm font-black text-slate-500">
      {message}
    </div>
  )
}

function ToggleButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: any; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black transition ${
        active ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-blue-100 bg-white/75 text-slate-700 hover:bg-blue-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function Badge({ label, tone }: { label: string; tone: "blue" | "green" | "gold" | "slate" | "red" }) {
  const classes = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    gold: "bg-[#fff8df] text-[#8a6200] border-[#D4AF37]/30",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    red: "bg-red-50 text-red-700 border-red-100",
  }
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${classes[tone]}`}>{label}</span>
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-blue-100 bg-white/70 px-2 py-1">
      <span className="block text-[9px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="block truncate text-slate-800">{value}</span>
    </div>
  )
}

function mapBackendMedia(item: any): FileCenterRecord {
  const metadata = item?.metadata || {}
  const mediaType = normalizeMediaType(item?.media_type, item?.file_type, item?.original_name)
  return {
    id: item?.id || crypto.randomUUID(),
    backendId: item?.id,
    originalName: item?.original_name || item?.file_name || "Untitled file",
    fileName: item?.file_name || item?.original_name || "file",
    fileType: item?.file_type || metadata.content_type || "file",
    mediaType,
    fileSize: Number(item?.file_size || 0),
    storagePath: item?.storage_path || "",
    createdAt: item?.created_at || new Date().toISOString(),
    category: metadata.category || defaultCategoryForType(mediaType),
    documentType: metadata.document_type || detectDocumentType(item?.original_name || item?.file_name || ""),
    status: metadata.status || "Uploaded",
    tags: parseTags(metadata.tags),
    notes: metadata.notes || "",
    invoiceNo: metadata.invoice_no || "",
    billOfLadingNo: metadata.bill_of_lading_no || metadata.shipment_reference || "",
    containerNo: metadata.container_no || "",
    truckNo: metadata.truck_no || "",
    customer: metadata.customer || "",
    route: metadata.route || "",
    isLocked: Boolean(metadata.is_locked),
    isFinal: Boolean(metadata.is_final),
    favorite: Boolean(metadata.favorite),
    expiryDate: metadata.expiry_date || "",
    dueDate: metadata.due_date || "",
    dueStatus: metadata.due_status || "No Due Date",
    amount: metadata.amount || "",
    currency: metadata.currency || "USD",
    paymentStatus: metadata.payment_status || "Unpaid",
    paidDate: metadata.paid_date || "",
    bankMethod: metadata.bank_method || "",
    referenceNo: metadata.reference_no || "",
    sealNo: metadata.seal_no || "",
    containerSize: metadata.container_size || "",
    containerType: metadata.container_type || "",
    ownerType: metadata.owner_type || inferOwnerType(metadata),
    ownerName: metadata.owner_name || metadata.customer || metadata.container_no || metadata.truck_no || "",
    qualityStatus: metadata.quality_status || "Good Quality",
    qualityNotes: metadata.quality_notes || "",
    timeline: Array.isArray(metadata.timeline) ? metadata.timeline : parseTags(metadata.timeline),
    processingStatus: metadata.processing_status || "Ready",
    folder: metadata.folder || item?.linked_id || metadata.category || "SKY Desktop",
    isDeleted: Boolean(metadata.is_deleted),
    deletedAt: metadata.deleted_at || "",
    isArchived: Boolean(metadata.is_archived),
    colorLabel: metadata.color_label || "",
  }
}

function fileToLocalRecord(file: File, detected: { category: string; documentType: string; mediaType: FileKind }, folder: string): FileCenterRecord {
  return {
    id: crypto.randomUUID(),
    originalName: file.name,
    fileName: file.name,
    fileType: file.type || "file",
    mediaType: detected.mediaType,
    fileSize: file.size,
    createdAt: new Date().toISOString(),
    category: detected.category || folder,
    documentType: detected.documentType,
    status: folder === "File Inbox" ? "Pending Review" : "Uploaded",
    tags: [],
    notes: "",
    invoiceNo: inferReference(file.name, /inv[-_\s]?\d+/i),
    billOfLadingNo: inferReference(file.name, /bol[-_\s]?[a-z0-9-]+/i),
    containerNo: inferReference(file.name, /[a-z]{4}\d{7}/i),
    truckNo: "",
    customer: "",
    route: "",
    isLocked: false,
    isFinal: false,
    favorite: false,
    expiryDate: "",
    dueDate: "",
    dueStatus: "No Due Date",
    amount: "",
    currency: "USD",
    paymentStatus: "Unpaid",
    paidDate: "",
    bankMethod: "",
    referenceNo: "",
    sealNo: "",
    containerSize: "",
    containerType: "",
    ownerType: "Shipment",
    ownerName: "",
    qualityStatus: buildQualityStatus(file),
    qualityNotes: buildQualityNotes(file),
    timeline: [`Uploaded ${detected.documentType}`, `Detected as ${detected.documentType}`],
    processingStatus: "Preview ready",
    folder,
    isDeleted: false,
    deletedAt: "",
    isArchived: false,
    colorLabel: "",
    localUrl: URL.createObjectURL(file),
  }
}

function recordToMetadata(record: FileCenterRecord) {
  return {
    category: record.category,
    document_type: record.documentType,
    status: record.status,
    tags: record.tags.join(","),
    notes: record.notes,
    invoice_no: record.invoiceNo,
    bill_of_lading_no: record.billOfLadingNo,
    container_no: record.containerNo,
    truck_no: record.truckNo,
    customer: record.customer,
    route: record.route,
    is_locked: record.isLocked,
    is_final: record.isFinal,
    favorite: record.favorite,
    expiry_date: record.expiryDate,
    due_date: record.dueDate,
    due_status: getDueStatus(record),
    amount: record.amount,
    currency: record.currency,
    payment_status: record.paymentStatus,
    paid_date: record.paidDate,
    bank_method: record.bankMethod,
    reference_no: record.referenceNo,
    seal_no: record.sealNo,
    container_size: record.containerSize,
    container_type: record.containerType,
    owner_type: record.ownerType,
    owner_name: record.ownerName,
    quality_status: record.qualityStatus,
    quality_notes: record.qualityNotes,
    timeline: record.timeline,
    processing_status: record.processingStatus,
    folder: record.folder || record.category,
    is_deleted: record.isDeleted,
    deleted_at: record.deletedAt,
    is_archived: record.isArchived,
    color_label: record.colorLabel,
  }
}

function detectDocument(fileName: string, fileType: string, folder: string) {
  const mediaType = normalizeMediaType("", fileType, fileName)
  return {
    mediaType,
    category: folder === "SKY Desktop" ? defaultCategoryForType(mediaType, fileName) : folder,
    documentType: detectDocumentType(fileName),
  }
}

function normalizeMediaType(mediaType: string, fileType: string, fileName: string): FileKind {
  const name = fileName.toLowerCase()
  if (mediaType === "image" || fileType.startsWith("image/")) return "image"
  if (mediaType === "video" || fileType.startsWith("video/")) return "video"
  if (mediaType === "audio" || fileType.startsWith("audio/")) return "audio"
  if (name.endsWith(".pdf") || fileType.includes("pdf")) return "pdf"
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "excel"
  if (mediaType === "document") return "document"
  return "other"
}

function detectDocumentType(fileName: string) {
  const name = fileName.toLowerCase()
  if (name.includes("invoice") || name.includes("inv")) return "Commercial Invoice"
  if (name.includes("bol") || name.includes("bill") || name.includes("lading")) return "Bill of Lading"
  if (name.includes("packing")) return "Packing List"
  if (name.includes("origin")) return "Certificate of Origin"
  if (name.includes("custom")) return "Customs Document"
  if (name.includes("truck")) return "Truck Document"
  if (name.includes("driver")) return "Driver Document"
  if (name.includes("receipt") || name.includes("payment")) return "Payment Receipt"
  if (name.includes("logo")) return "Company Logo"
  if (name.includes("stamp")) return "Stamp"
  if (name.includes("signature")) return "Signature"
  if (name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "Excel Ledger"
  if (name.endsWith(".pdf")) return "PDF Document"
  return "General File"
}

function defaultCategoryForType(type: FileKind, fileName = "") {
  if (type === "image") return fileName.toLowerCase().includes("logo") ? "Company Logos" : "Images"
  if (type === "video") return "Videos"
  if (type === "audio") return "Audio"
  if (type === "excel") return "Excel Files"
  if (type === "pdf") return "Company Documents"
  return "SKY Desktop"
}

function buildCounts(records: FileCenterRecord[]) {
  return records.reduce<Record<string, number>>((acc, record) => {
    acc[record.mediaType] = (acc[record.mediaType] || 0) + 1
    acc[record.category] = (acc[record.category] || 0) + 1
    acc.favorites = acc.favorites || 0
    if (record.favorite) acc.favorites += 1
    return acc
  }, {})
}

function buildCompleteness(records: FileCenterRecord[]) {
  const completed = requiredPacketDocs.filter((doc) => records.some((record) => record.documentType.toLowerCase().includes(doc.toLowerCase().replace("bol", "bill"))))
  return {
    completed,
    percent: Math.round((completed.length / requiredPacketDocs.length) * 100),
  }
}

function recordMatchesWorkspace(record: FileCenterRecord, workspace: (typeof workspaceModes)[number]) {
  if (workspace.key === "general") return true
  const text = [record.category, record.documentType, record.originalName, record.status, record.ownerType].join(" ").toLowerCase()
  return workspace.folders.some((folder) => text.includes(folder.toLowerCase().replace("bOL".toLowerCase(), "bill"))) ||
    workspace.actions.some((action) => text.includes(action.toLowerCase().split(" ")[0]))
}

function recordMatchesFolder(record: FileCenterRecord, activeFolder: string) {
  if (activeFolder === "Trash") return record.isDeleted
  if (record.isDeleted) return false
  if (activeFolder === "Recent Files" || activeFolder === "Today's Work" || activeFolder === "Shared / Linked Files") return true
  if (activeFolder === "Favorites") return record.favorite
  if (activeFolder === "Archive") return record.isArchived
  if (activeFolder === "SKY Desktop") return true
  return record.folder === activeFolder || record.category === activeFolder || record.documentType === activeFolder
}

function getDueStatus(record: Pick<FileCenterRecord, "dueDate" | "paymentStatus">) {
  if (record.paymentStatus === "Paid" || record.paymentStatus === "Completed") return "Completed"
  if (!record.dueDate) return "No Due Date"
  const now = new Date()
  const due = new Date(record.dueDate)
  const days = Math.ceil((due.getTime() - now.getTime()) / 86400000)
  if (days < 0) return "Overdue"
  if (days <= 7) return "Due Soon"
  return "Scheduled"
}

function normalizedStatus(status: string) {
  const value = (status || "Uploaded").toLowerCase()
  if (value.includes("inbox") || value.includes("pending")) return "pending review"
  if (value.includes("approve")) return "approved"
  if (value.includes("sent")) return "sent"
  if (value.includes("complete") || value.includes("paid")) return "completed"
  if (value.includes("archive")) return "archived"
  if (value.includes("draft")) return "draft"
  return value
}

function appendTimeline(record: FileCenterRecord | undefined, event: string) {
  return [event, ...(record?.timeline || [])].slice(0, 20)
}

function groupVaults(records: FileCenterRecord[]) {
  return records.reduce<Record<string, FileCenterRecord[]>>((acc, record) => {
    const type = record.ownerType || inferOwnerType(record)
    const name = record.ownerName || record.customer || record.containerNo || record.truckNo || record.billOfLadingNo || "Unassigned"
    const key = `${type}::${name}`
    acc[key] = acc[key] || []
    acc[key].push(record)
    return acc
  }, {})
}

function inferOwnerType(metadata: any) {
  if (metadata?.driver_name) return "Driver"
  if (metadata?.truck_no) return "Truck"
  if (metadata?.container_no) return "Container"
  if (metadata?.customer) return "Customer"
  return "Shipment"
}

function buildQualityStatus(file: File) {
  if (file.size < 12 * 1024) return "Needs Review"
  if (file.type.startsWith("image/") && file.size < 80 * 1024) return "Low Quality"
  return "Good Quality"
}

function buildQualityNotes(file: File) {
  if (file.size < 12 * 1024) return "File is very small; preview should be checked."
  if (file.type.startsWith("image/") && file.size < 80 * 1024) return "Image may be low resolution."
  return "No quality warning detected."
}

function copyDetails(record: FileCenterRecord) {
  const message = [
    `File Name: ${record.originalName}`,
    `Category: ${record.category}`,
    `Status: ${record.status}`,
    `Uploaded: ${formatDate(record.createdAt)}`,
    `Size: ${formatBytes(record.fileSize)}`,
    `Linked Record: ${record.invoiceNo || record.billOfLadingNo || record.containerNo || record.truckNo || "--"}`,
    `Customer: ${record.customer || "--"}`,
    `Notes: ${record.notes || "--"}`,
  ].join("\n")
  void navigator.clipboard?.writeText(message)
}

function copyWhatsAppMessage(record: FileCenterRecord) {
  const message = [
    "Dear Sir/Madam,",
    "",
    "Please find the shipment document information below:",
    "",
    `File: ${record.originalName}`,
    `Invoice No: ${record.invoiceNo || "--"}`,
    `Customer: ${record.customer || "--"}`,
    `Route: ${record.route || "--"}`,
    `Document Type: ${record.documentType}`,
    `Status: ${record.status}`,
    `Missing Documents: ${requiredPacketDocs.filter((doc) => !record.documentType.toLowerCase().includes(doc.toLowerCase().replace("bol", "bill"))).join(", ") || "None"}`,
    "",
    "Please review and confirm.",
  ].join("\n")
  void navigator.clipboard?.writeText(message)
}

function buildSuggestedFileName(record: FileCenterRecord) {
  const extension = record.originalName.includes(".") ? `.${record.originalName.split(".").pop()}` : ""
  const clean = (value: string) => value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "")
  const doc = clean(record.documentType || "Document")
  const invoice = clean(record.invoiceNo || record.referenceNo || "NoRef")
  const customer = clean(record.customer || record.ownerName || "Customer")
  const month = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" }).replace(/\s+/g, "_")
  return `${doc}_${invoice}_${customer}_${month}${extension}`
}

function nextCopyName(name: string, existingNames: string[]) {
  const dotIndex = name.lastIndexOf(".")
  const base = dotIndex > 0 ? name.slice(0, dotIndex) : name
  const extension = dotIndex > 0 ? name.slice(dotIndex) : ""
  let candidate = `${base} Copy${extension}`
  let index = 2
  while (existingNames.includes(candidate)) {
    candidate = `${base} Copy ${index}${extension}`
    index += 1
  }
  return candidate
}

function formatDate(value: string) {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })
}

function parseSearchQuery(query: string) {
  return query
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function matchesSearch(record: FileCenterRecord, parts: string[]) {
  if (!parts.length) return true
  const haystack = [
    record.originalName,
    record.fileName,
    record.fileType,
    record.mediaType,
    record.category,
    record.documentType,
    record.status,
    record.notes,
    record.invoiceNo,
    record.billOfLadingNo,
    record.containerNo,
    record.truckNo,
    record.customer,
    record.route,
    record.dueDate,
    record.dueStatus,
    record.amount,
    record.currency,
    record.paymentStatus,
    record.referenceNo,
    record.sealNo,
    record.containerType,
    record.ownerType,
    record.ownerName,
    record.qualityStatus,
    ...record.tags,
  ].join(" ").toLowerCase()

  return parts.every((part) => {
    const [key, value] = part.toLowerCase().split(":")
    if (value) {
      if (key === "type") return record.mediaType.includes(value) || record.fileType.toLowerCase().includes(value)
      if (key === "category") return record.category.toLowerCase().includes(value)
      if (key === "tag") return record.tags.some((tag) => tag.toLowerCase().includes(value))
      if (key === "status") return record.status.toLowerCase().includes(value)
      if (key === "customer") return record.customer.toLowerCase().includes(value)
      if (key === "container") return record.containerNo.toLowerCase().includes(value)
      if (key === "truck") return record.truckNo.toLowerCase().includes(value)
    }
    return haystack.includes(part.toLowerCase())
  })
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean)
  return []
}

function inferReference(fileName: string, pattern: RegExp) {
  return fileName.match(pattern)?.[0]?.toUpperCase() || ""
}

function loadLocalRecords(): FileCenterRecord[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_FILES_KEY)
    const rows = raw ? JSON.parse(raw) : []
    return Array.isArray(rows) ? rows.map(normalizeLocalRecord) : []
  } catch {
    return []
  }
}

function loadLocalFolders() {
  try {
    const raw = window.localStorage.getItem(LOCAL_FOLDERS_KEY)
    const rows = raw ? JSON.parse(raw) : []
    return Array.isArray(rows) ? Array.from(new Set([...defaultFolders, ...rows.map(String)])) : defaultFolders
  } catch {
    return defaultFolders
  }
}

function normalizeLocalRecord(record: FileCenterRecord): FileCenterRecord {
  return {
    ...record,
    folder: record.folder || record.category || "SKY Desktop",
    isDeleted: Boolean(record.isDeleted),
    deletedAt: record.deletedAt || "",
    isArchived: Boolean(record.isArchived),
    colorLabel: record.colorLabel || "",
  }
}

function getKindIcon(kind: FileKind) {
  if (kind === "image") return ImageIcon
  if (kind === "video") return Video
  if (kind === "audio") return Volume2
  if (kind === "excel") return FileSpreadsheet
  if (kind === "pdf") return FileText
  if (kind === "document") return FileCheck
  return Folder
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function isExpired(date: string) {
  return Boolean(date && new Date(date).getTime() < Date.now())
}
