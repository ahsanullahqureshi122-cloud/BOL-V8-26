"use client"

import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  ArrowRight,
  Building2,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Grid3X3,
  Loader2,
  Pencil,
  Search,
  Trash2,
  Truck,
  Upload,
  X,
} from "lucide-react"

type DocumentCategoryKey = "all" | "account" | "export" | "import" | "with-pdf"

const DOCUMENT_CATEGORY_STORAGE_KEY = "sky-bol-document-categories"
const ACCOUNT_COMPANY_PDFS_STORAGE_KEY = "sky-bol-account-company-pdfs"
const ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY = "sky-bol-account-custom-companies"

interface SavedDocument {
  id: string
  bol_number: string
  issue_date: string
  shipper_name: string
  consignee_name: string
  truck_number?: string
  created_at: string
  pdf_url?: string | null
  pdf_uploaded_at?: string | null
}

interface AccountCompanyPdfFile {
  id: string
  name: string
  pdfUrl: string
  uploadedAt: string
}

interface AccountCompanyRecord {
  companyName: string
  pdfs: AccountCompanyPdfFile[]
  pdfUrl?: string | null
  uploadedAt?: string | null
}

interface SavedDocumentsProps {
  onLoadDocument: (id: string) => void
  refreshTrigger?: number
  variant?: "sidebar" | "sheet"
}

const categoryButtons: { key: DocumentCategoryKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "with-pdf", label: "Uploaded PDFs" },
  { key: "account", label: "Account" },
  { key: "export", label: "Export" },
  { key: "import", label: "Import" },
]

export function SavedDocuments({ onLoadDocument, refreshTrigger, variant = "sidebar" }: SavedDocumentsProps) {
  const [documents, setDocuments] = useState<SavedDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [openingPdfId, setOpeningPdfId] = useState<string | null>(null)
  const [uploadingCompanyName, setUploadingCompanyName] = useState<string | null>(null)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string | null>(null)
  const [openCompanyTabs, setOpenCompanyTabs] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const [newCompanyName, setNewCompanyName] = useState("")
  const [activeCategory, setActiveCategory] = useState<DocumentCategoryKey>("all")
  const [documentCategories, setDocumentCategories] = useState<Record<string, Exclude<DocumentCategoryKey, "all" | "with-pdf">>>({})
  const [accountCompanyPdfs, setAccountCompanyPdfs] = useState<Record<string, AccountCompanyRecord>>({})
  const [customAccountCompanies, setCustomAccountCompanies] = useState<string[]>([])

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/bol")
      if (!response.ok) {
        throw new Error(`Saved documents request failed (${response.status})`)
      }
      const result = await response.json()
      if (Array.isArray(result.data)) {
        setDocuments(result.data)
      }
    } catch (error) {
      console.warn("Saved documents temporarily unavailable:", error)
      toast.error("Could not load saved documents. Check that the app server is running.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchDocuments()
  }, [refreshTrigger])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DOCUMENT_CATEGORY_STORAGE_KEY)
      if (stored) {
        setDocumentCategories(JSON.parse(stored))
      }

      const storedCompanyPdfs = window.localStorage.getItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY)
      if (storedCompanyPdfs) {
        const parsed = JSON.parse(storedCompanyPdfs) as Record<string, AccountCompanyRecord>
        const migrated = Object.fromEntries(
          Object.entries(parsed).map(([key, record]) => {
            if (Array.isArray(record.pdfs)) {
              return [key, record]
            }

            return [
              key,
              {
                companyName: record.companyName,
                pdfs: record.pdfUrl
                  ? [
                      {
                        id: `${key}-legacy`,
                        name: `${record.companyName}.pdf`,
                        pdfUrl: record.pdfUrl,
                        uploadedAt: record.uploadedAt || new Date().toISOString(),
                      },
                    ]
                  : [],
              },
            ]
          })
        )
        setAccountCompanyPdfs(migrated)
        window.localStorage.setItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY, JSON.stringify(migrated))
      }

      const storedCompanies = window.localStorage.getItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY)
      if (storedCompanies) {
        setCustomAccountCompanies(JSON.parse(storedCompanies))
      }
    } catch (error) {
      console.error("Error loading saved document settings:", error)
    }
  }, [])

  const getAssignedCategory = (doc: SavedDocument) => documentCategories[doc.id || doc.bol_number]

  const getDocumentSearchText = (doc: SavedDocument) => {
    const extra = doc as SavedDocument & {
      category?: string | null
      document_category?: string | null
      document_type?: string | null
      type?: string | null
      status?: string | null
      notes?: string | null
    }

    return [
      doc.bol_number,
      doc.shipper_name,
      doc.consignee_name,
      doc.truck_number,
      getAssignedCategory(doc),
      extra.category,
      extra.document_category,
      extra.document_type,
      extra.type,
      extra.status,
      extra.notes,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
  }

  const matchesCategory = (doc: SavedDocument, category: DocumentCategoryKey) => {
    if (category === "all" || category === "account") return true
    if (category === "with-pdf") return Boolean(doc.pdf_url)

    const assigned = getAssignedCategory(doc)
    if (assigned === category) return true

    const searchText = getDocumentSearchText(doc)
    const keywords: Record<Exclude<DocumentCategoryKey, "all" | "with-pdf">, string[]> = {
      account: ["account", "accounts", "ledger", "invoice", "payment", "balance", "receipt"],
      export: ["export", "exports", "exporter", "outbound"],
      import: ["import", "imports", "importer", "inbound"],
    }

    return keywords[category].some((keyword) => searchText.includes(keyword))
  }

  const filteredDocuments = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    return documents.filter((doc) => {
      const matchesSearch = !cleanQuery || getDocumentSearchText(doc).includes(cleanQuery)
      return matchesSearch && matchesCategory(doc, activeCategory)
    })
  }, [documents, query, activeCategory, documentCategories])

  const accountCompanies = useMemo(() => {
    const byName = new Map<string, { companyName: string; docs: SavedDocument[] }>()

    for (const companyName of customAccountCompanies) {
      const cleanName = companyName.trim()
      if (cleanName) {
        byName.set(cleanName.toLowerCase(), { companyName: cleanName, docs: [] })
      }
    }

    for (const companyRecord of Object.values(accountCompanyPdfs)) {
      const cleanName = companyRecord.companyName.trim()
      if (cleanName && !byName.has(cleanName.toLowerCase())) {
        byName.set(cleanName.toLowerCase(), { companyName: cleanName, docs: [] })
      }
    }

    for (const doc of documents) {
      const companyName = (doc.shipper_name || "Unnamed Shipper Company").trim()
      const key = companyName.toLowerCase()
      const existing = byName.get(key)

      if (existing) {
        existing.docs.push(doc)
      } else {
        byName.set(key, { companyName, docs: [doc] })
      }
    }

    return Array.from(byName.values()).sort((a, b) => a.companyName.localeCompare(b.companyName))
  }, [documents, documentCategories, customAccountCompanies, accountCompanyPdfs])

  const categoryCounts = useMemo(() => {
    return categoryButtons.reduce<Record<DocumentCategoryKey, number>>((counts, category) => {
      counts[category.key] = documents.filter((doc) => matchesCategory(doc, category.key)).length
      return counts
    }, { all: 0, account: 0, export: 0, import: 0, "with-pdf": 0 })
  }, [documents, documentCategories])

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyName) return null
    return accountCompanies.find((company) => company.companyName === selectedCompanyName) || null
  }, [accountCompanies, selectedCompanyName])

  const openCompanyTab = (companyName: string) => {
    setActiveCategory("account")
    setSelectedCompanyName(companyName)
    setOpenCompanyTabs((prev) => (
      prev.includes(companyName) ? prev : [...prev, companyName]
    ))
  }

  const closeCompanyTab = (companyName: string) => {
    setOpenCompanyTabs((prev) => {
      const next = prev.filter((tab) => tab !== companyName)
      if (selectedCompanyName === companyName) {
        setSelectedCompanyName(next[next.length - 1] || null)
      }
      return next
    })
  }

  const assignDocumentCategory = (doc: SavedDocument, category: Exclude<DocumentCategoryKey, "all" | "with-pdf">) => {
    const documentId = doc.id || doc.bol_number

    setDocumentCategories((prev) => {
      const next = {
        ...prev,
        [documentId]: category,
      }

      window.localStorage.setItem(DOCUMENT_CATEGORY_STORAGE_KEY, JSON.stringify(next))
      return next
    })

    toast.success(`Moved to ${category}`)
  }

  const persistAccountCompanyPdfs = (records: Record<string, AccountCompanyRecord>) => {
    setAccountCompanyPdfs(records)
    window.localStorage.setItem(ACCOUNT_COMPANY_PDFS_STORAGE_KEY, JSON.stringify(records))
  }

  const persistCustomAccountCompanies = (companies: string[]) => {
    setCustomAccountCompanies(companies)
    window.localStorage.setItem(ACCOUNT_CUSTOM_COMPANIES_STORAGE_KEY, JSON.stringify(companies))
  }

  const addAccountCompany = () => {
    const cleanName = newCompanyName.trim()
    if (!cleanName) {
      toast.error("Enter a company name first")
      return
    }

    const exists = accountCompanies.some((company) => company.companyName.toLowerCase() === cleanName.toLowerCase())
    if (exists) {
      toast.info("Company already exists")
      setNewCompanyName("")
      return
    }

    persistCustomAccountCompanies([...customAccountCompanies, cleanName])
    setNewCompanyName("")
    setActiveCategory("account")
    toast.success("Company category added")
  }

  const handleCompanyPDFUpload = async (companyName: string, file?: File | null) => {
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.")
      return
    }

    setUploadingCompanyName(companyName)
    try {
      const formData = new FormData()
      formData.append("pdf", file, file.name || `${companyName}.pdf`)
      formData.append("companyName", companyName)

      const response = await fetch("/api/account-company-pdf", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload company PDF")
      }

      const key = companyName.toLowerCase()
      const currentRecord = accountCompanyPdfs[key]
      const nextFile: AccountCompanyPdfFile = {
        id: crypto.randomUUID(),
        name: file.name || `${companyName}.pdf`,
        pdfUrl: result.data.pdfUrl,
        uploadedAt: result.data.uploadedAt,
      }

      persistAccountCompanyPdfs({
        ...accountCompanyPdfs,
        [key]: {
          companyName,
          pdfs: [nextFile, ...(currentRecord?.pdfs || [])],
        },
      })
      toast.success("Company PDF uploaded")
    } catch (error) {
      console.error("Company PDF upload error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to upload company PDF")
    } finally {
      setUploadingCompanyName(null)
    }
  }

  const openCompanyPDF = (pdf: AccountCompanyPdfFile) => {
    window.open(pdf.pdfUrl, "_blank", "noopener,noreferrer")
  }

  const deleteCompanyPDF = async (companyName: string, pdf: AccountCompanyPdfFile) => {
    const key = companyName.toLowerCase()
    const record = accountCompanyPdfs[key]
    if (!record) return

    if (!confirm(`Remove ${pdf.name} from ${companyName}?`)) return

    try {
      await fetch(`/api/account-company-pdf?pdfUrl=${encodeURIComponent(pdf.pdfUrl)}`, {
        method: "DELETE",
      })
      const nextPdfs = record.pdfs.filter((item) => item.id !== pdf.id)
      const next = {
        ...accountCompanyPdfs,
        [key]: {
          ...record,
          pdfs: nextPdfs,
        },
      }
      persistAccountCompanyPdfs(next)
      toast.success("Company PDF removed")
    } catch (error) {
      console.error("Company PDF delete error:", error)
      toast.error("Unable to remove company PDF")
    }
  }

  const handleCompanyFileInput = (companyName: string) => (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    void handleCompanyPDFUpload(companyName, file)
    event.target.value = ""
  }

  const handleDelete = async (id: string, event: MouseEvent) => {
    event.stopPropagation()
    if (!confirm("Delete this saved document?")) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/bol/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
        toast.success("Document deleted")
      } else {
        toast.error("Could not delete document")
      }
    } catch (error) {
      console.error("Error deleting document:", error)
      toast.error("Could not delete document")
    } finally {
      setDeletingId(null)
    }
  }

  const handlePDFUpload = async (doc: SavedDocument, file?: File | null) => {
    if (!file) return

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please choose a PDF file.")
      return
    }

    setUploadingId(doc.id)
    try {
      const formData = new FormData()
      formData.append("pdf", file, file.name || `${doc.bol_number || doc.id}.pdf`)
      formData.append("bolId", doc.id)
      formData.append("bolNumber", doc.bol_number || doc.id)

      const response = await fetch("/api/bol/pdf", {
        method: "POST",
        body: formData,
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to upload PDF")
      }

      toast.success(doc.pdf_url ? "PDF replaced" : "PDF uploaded")
      await fetchDocuments()
      setActiveCategory("with-pdf")
    } catch (error) {
      console.error("PDF upload error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to upload PDF")
    } finally {
      setUploadingId(null)
    }
  }

  const openUploadedPDF = async (doc: SavedDocument) => {
    if (!doc.pdf_url) {
      toast.error("No uploaded PDF for this BOL")
      return
    }

    setOpeningPdfId(doc.id)
    try {
      const response = await fetch(`/api/bol/pdf?action=download&bolId=${doc.id}`)
      const result = await response.json()
      const pdfUrl = result?.data?.pdfUrl || doc.pdf_url

      if (!response.ok || !pdfUrl) {
        throw new Error(result.error || "Uploaded PDF not found")
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer")
    } catch (error) {
      console.error("Open uploaded PDF error:", error)
      toast.error(error instanceof Error ? error.message : "Unable to open uploaded PDF")
    } finally {
      setOpeningPdfId(null)
    }
  }

  const viewBOLPreview = (doc: SavedDocument) => {
    onLoadDocument(doc.id)
    window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "preview", tab: "preview" } }))
    toast.success("BOL preview opened", {
      description: `${doc.bol_number || "Document"} is loaded in A4 Preview.`,
    })
  }

  const editBOL = (doc: SavedDocument) => {
    onLoadDocument(doc.id)
    window.dispatchEvent(new CustomEvent("skybol:editor-action", { detail: { action: "form", tab: "form" } }))
  }

  const downloadDocumentJSON = async (doc: SavedDocument) => {
    try {
      const res = await fetch(`/api/bol/${doc.id}`)
      if (!res.ok) throw new Error("Failed to fetch document")
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${doc.bol_number || doc.id}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Unable to download document data")
    }
  }

  const handleFileInput = (doc: SavedDocument) => (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const file = event.target.files?.[0]
    void handlePDFUpload(doc, file)
    event.target.value = ""
  }

  return (
    <Card className={`flex h-full flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-sm ${variant === "sidebar" ? "w-full" : "md:w-96"}`}>
      <CardHeader className="border-b border-blue-100 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Grid3X3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-lg font-black text-slate-950">Saved PDF Documents</CardTitle>
              <p className="text-xs font-medium text-slate-500">
                Grid view for saved BOLs, uploaded PDFs, and BOL previews
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-sm font-black text-blue-700">
            <FileText className="h-4 w-4" />
            {documents.length} saved
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-500" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search BOL number, shipper, consignee, truck..."
              className="h-10 rounded-xl border-blue-100 bg-white pl-9 text-sm focus:border-blue-300 focus:ring-blue-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categoryButtons.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => {
                  setActiveCategory(category.key)
                  if (category.key !== "account") {
                    setSelectedCompanyName(null)
                  }
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                  activeCategory === category.key
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-blue-100 bg-white text-blue-700 hover:bg-blue-50"
                }`}
              >
                {category.label}
                <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${
                  activeCategory === category.key ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700"
                }`}>
                  {category.key === "account" ? accountCompanies.length : categoryCounts[category.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {openCompanyTabs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-blue-100 pt-3">
            {openCompanyTabs.map((companyName) => (
              <div
                key={companyName}
                className={`inline-flex max-w-full items-center overflow-hidden rounded-xl border text-xs font-black shadow-sm ${
                  selectedCompanyName === companyName
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory("account")
                    setSelectedCompanyName(companyName)
                  }}
                  className="min-w-0 truncate px-3 py-2"
                  title={companyName}
                >
                  {companyName}
                </button>
                <button
                  type="button"
                  onClick={() => closeCompanyTab(companyName)}
                  className={`flex h-8 w-8 items-center justify-center ${
                    selectedCompanyName === companyName ? "hover:bg-white/15" : "hover:bg-amber-100"
                  }`}
                  title="Close company tab"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="min-h-[420px] flex-1 overflow-auto bg-slate-50 p-4">
        {isLoading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow-sm">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">Loading saved documents...</p>
            </div>
          </div>
        ) : (
          <>
            {activeCategory === "account" && (
              <section className="mb-5 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-black text-slate-950">
                      <Building2 className="h-5 w-5 text-amber-600" />
                      Account Company Categories
                    </h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Add each company name here, then upload that company&apos;s account PDF.
                    </p>
                  </div>

                  <div className="flex min-w-0 gap-2">
                    <Input
                      value={newCompanyName}
                      onChange={(event) => setNewCompanyName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          addAccountCompany()
                        }
                      }}
                      placeholder="Company name"
                      className="h-10 min-w-0 rounded-xl border-amber-100 bg-white text-sm focus:border-amber-300 focus:ring-amber-200"
                    />
                    <Button
                      type="button"
                      onClick={addAccountCompany}
                      className="h-10 rounded-xl bg-amber-600 text-white hover:bg-amber-700"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {accountCompanies.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    No account companies yet. Add a company name above.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {accountCompanies.map((company) => {
                      const record = accountCompanyPdfs[company.companyName.toLowerCase()]
                      const companyPdfCount = record?.pdfs.length || 0
                      const hasCompanyPdf = companyPdfCount > 0
                      const isUploading = uploadingCompanyName === company.companyName
                      const isSelected = selectedCompanyName === company.companyName

                      return (
                        <article
                          key={company.companyName}
                          className={`flex min-h-52 flex-col rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                            isSelected
                              ? "border-amber-500 bg-amber-100/70"
                              : "border-amber-100 bg-amber-50/40 hover:border-amber-300"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => openCompanyTab(company.companyName)}
                            className="flex items-start justify-between gap-3 text-left"
                          >
                            <div className="min-w-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <h4 className="mt-3 truncate text-base font-black text-slate-950">
                                {company.companyName}
                              </h4>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {company.docs.length} linked BOL{company.docs.length === 1 ? "" : "s"}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-amber-700">
                                {companyPdfCount} uploaded PDF{companyPdfCount === 1 ? "" : "s"}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                              hasCompanyPdf ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {isSelected ? "Open" : "Click"}
                            </span>
                          </button>

                          {record?.pdfs[0]?.uploadedAt && (
                            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                              Last PDF {new Date(record.pdfs[0].uploadedAt).toLocaleDateString()}
                            </p>
                          )}

                          <div className="mt-auto grid gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => openCompanyTab(company.companyName)}
                              className="h-10 rounded-xl border-amber-200 bg-white text-amber-700 hover:bg-amber-50"
                            >
                              <Eye className="h-4 w-4" />
                              Open Company
                            </Button>
                            <div className="grid grid-cols-[1fr_auto] gap-2">
                              <label
                                className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold text-amber-700 transition hover:bg-amber-50 ${
                                  isUploading ? "pointer-events-none opacity-70" : ""
                                }`}
                              >
                                {isUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                                Add PDF
                                <input
                                  type="file"
                                  accept="application/pdf,.pdf"
                                  className="hidden"
                                  disabled={isUploading}
                                  onChange={handleCompanyFileInput(company.companyName)}
                                />
                              </label>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openCompanyTab(company.companyName)}
                                className="h-10 rounded-xl border-blue-200 px-3 text-blue-700 hover:bg-blue-50"
                                title="View folder"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                {selectedCompany && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-amber-700">Company Tab</p>
                        <h4 className="mt-1 text-xl font-black text-slate-950">{selectedCompany.companyName}</h4>
                        <p className="mt-1 text-sm font-medium text-slate-600">
                          All uploaded PDFs and all BOL documents for this shipper company.
                        </p>
                      </div>
                      <label
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700 ${
                          uploadingCompanyName === selectedCompany.companyName ? "pointer-events-none opacity-70" : ""
                        }`}
                      >
                        {uploadingCompanyName === selectedCompany.companyName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        Add PDF to Company
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={uploadingCompanyName === selectedCompany.companyName}
                          onChange={handleCompanyFileInput(selectedCompany.companyName)}
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <h5 className="font-black text-slate-950">Company PDF Files</h5>
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">
                            {accountCompanyPdfs[selectedCompany.companyName.toLowerCase()]?.pdfs.length || 0}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {(accountCompanyPdfs[selectedCompany.companyName.toLowerCase()]?.pdfs || []).length === 0 ? (
                            <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                              No company PDF files yet. Use “Add PDF to Company”.
                            </p>
                          ) : (
                            accountCompanyPdfs[selectedCompany.companyName.toLowerCase()]?.pdfs.map((pdf) => (
                              <div key={pdf.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold text-slate-900">{pdf.name}</p>
                                  <p className="text-xs text-slate-500">{new Date(pdf.uploadedAt).toLocaleString()}</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openCompanyPDF(pdf)}
                                    className="h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => deleteCompanyPDF(selectedCompany.companyName, pdf)}
                                    className="h-9 rounded-xl border-red-200 px-3 text-red-600 hover:bg-red-50"
                                    title="Delete PDF"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                          <h5 className="font-black text-slate-950">BOL Files for Shipper</h5>
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
                            {selectedCompany.docs.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {selectedCompany.docs.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-800">
                              No saved BOLs for this shipper company yet.
                            </p>
                          ) : (
                            selectedCompany.docs.map((doc) => (
                              <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{doc.bol_number}</p>
                                    <p className="truncate text-xs text-slate-500">{doc.consignee_name || "No consignee"}</p>
                                  </div>
                                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                                    doc.pdf_url ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                  }`}>
                                    {doc.pdf_url ? "Uploaded PDF" : "BOL only"}
                                  </span>
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                  <Button type="button" onClick={() => editBOL(doc)} className="h-9 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                                    Edit
                                  </Button>
                                  <Button type="button" variant="outline" onClick={() => viewBOLPreview(doc)} className="h-9 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50">
                                    BOL PDF
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => openUploadedPDF(doc)}
                                    disabled={!doc.pdf_url || openingPdfId === doc.id}
                                    className="h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:border-slate-100 disabled:text-slate-300"
                                  >
                                    Uploaded
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {activeCategory === "account" ? null : filteredDocuments.length === 0 ? (
              <div className="flex min-h-80 items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
                  <FileText className="mx-auto h-10 w-10 text-blue-600" />
                  <p className="mt-3 text-base font-black text-slate-950">No documents found</p>
                  <p className="mt-1 text-sm text-slate-500">Try another search or category.</p>
                </div>
              </div>
            ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredDocuments.map((doc) => {
              const assignedCategory = getAssignedCategory(doc)
              const hasUploadedPdf = Boolean(doc.pdf_url)

              return (
                <article
                  key={doc.id}
                  className="group flex min-h-[310px] flex-col rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex max-w-full items-center gap-2 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-black text-white">
                        <FileText className="h-3.5 w-3.5" />
                        <span className="truncate">{doc.bol_number || "BOL"}</span>
                      </div>
                      <p className="mt-3 truncate text-base font-black text-slate-950">
                        {doc.shipper_name || "No shipper"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                        <ArrowRight className="h-3.5 w-3.5 text-blue-500" />
                        <span className="truncate">{doc.consignee_name || "No consignee"}</span>
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-black ${
                      hasUploadedPdf ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {hasUploadedPdf ? "PDF uploaded" : "No PDF"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="font-semibold">
                        {doc.issue_date
                          ? new Date(doc.issue_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span className="truncate font-semibold">{doc.truck_number || "No truck number"}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["account", "export", "import"] as const).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => assignDocumentCategory(doc, category)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${
                          assignedCategory === category
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:text-blue-700"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto grid gap-2 pt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        onClick={() => editBOL(doc)}
                        className="h-10 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit BOL
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => viewBOLPreview(doc)}
                        className="h-10 rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                        BOL PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openUploadedPDF(doc)}
                        disabled={!hasUploadedPdf || openingPdfId === doc.id}
                        className="h-10 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:border-slate-100 disabled:text-slate-300"
                      >
                        {openingPdfId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ExternalLink className="h-4 w-4" />
                        )}
                        Uploaded PDF
                      </Button>
                      <label
                        className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 ${
                          uploadingId === doc.id ? "pointer-events-none opacity-70" : ""
                        }`}
                      >
                        {uploadingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {hasUploadedPdf ? "Replace" : "Upload"}
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={uploadingId === doc.id}
                          onChange={handleFileInput(doc)}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => downloadDocumentJSON(doc)}
                        className="h-9 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        Data
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(event) => handleDelete(doc.id, event)}
                        disabled={deletingId === doc.id}
                        className="h-9 rounded-xl border-red-200 px-3 text-red-600 hover:bg-red-50"
                        title="Delete document"
                      >
                        {deletingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
