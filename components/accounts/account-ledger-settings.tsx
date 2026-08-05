"use client"

import { useEffect, useState } from "react"
import { Archive, Building2, Eye, FileJson, FileText, FolderOpen, HardDrive, ImageUp, RotateCcw, Save, Upload } from "lucide-react"

export type AccountLedgerDefaults = {
  officeAddress: string
  footerInfo: string
  ledgerFooterTitle?: string
  footerNotes?: string
  termsConditions?: string
  authorizedSignatureName?: string
  authorizedSignaturePosition?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  autoSaveFooter?: boolean
  logoDataUrl?: string
  savedPdfFolder?: string
  mediaFolder?: string
  mediaStorageMode?: "local" | "network" | "cloud"
  networkStoragePath?: string
  lastBackupDate?: string
}

export const ACCOUNT_LEDGER_SETTINGS_STORAGE_KEY = "sky_account_ledger_global_settings"

export const DEFAULT_OFFICE_ADDRESS = `AFGHANISTAN OFFICE
2nd FLOOR, 16 NO. OFFICE,
SHAHIDANO, CHOWK, ETIMAD RAHMI MARKET,
KANDAHAR, AFGHANISTAN.
LICENCE NUMBER: 2401-2198
EMAIL: info@skyariana.com, transport@skyariana.com
MOB: +93 700 939 365, +93711 4355 29`

export const DEFAULT_FOOTER_INFO = `LICENCE NUMBER: 2401-2198
EMAIL: info@skyariana.com, transport@skyariana.com
MOB: +93 700 939 365, +93711 4355 29`

export const DEFAULT_LEDGER_TERMS = "All ledger entries are subject to verification against original shipping documents, invoices, and payment receipts."

export const DEFAULT_ACCOUNT_LEDGER_SETTINGS: AccountLedgerDefaults = {
  officeAddress: DEFAULT_OFFICE_ADDRESS,
  footerInfo: DEFAULT_FOOTER_INFO,
  ledgerFooterTitle: "Ledger Footer",
  footerNotes: "Thank you for choosing SKY ARIANA & BALAM BAR BARAN logistics services.",
  termsConditions: DEFAULT_LEDGER_TERMS,
  authorizedSignatureName: "Authorized Manager",
  authorizedSignaturePosition: "Accounts Department",
  companyAddress: DEFAULT_OFFICE_ADDRESS,
  companyPhone: "+93 700 939 365, +93711 4355 29",
  companyEmail: "info@skyariana.com, transport@skyariana.com",
  companyWebsite: "www.skyariana.com",
  autoSaveFooter: false,
  savedPdfFolder: "public/uploads/account-ledger-pdfs",
  mediaFolder: "public/uploads/account-ledger-media",
  mediaStorageMode: "local",
  networkStoragePath: "",
  lastBackupDate: "",
}

export function readAccountLedgerSettings(): AccountLedgerDefaults {
  if (typeof window === "undefined") return DEFAULT_ACCOUNT_LEDGER_SETTINGS

  try {
    const saved = window.localStorage.getItem(ACCOUNT_LEDGER_SETTINGS_STORAGE_KEY)
    return saved
      ? { ...DEFAULT_ACCOUNT_LEDGER_SETTINGS, ...(JSON.parse(saved) as Partial<AccountLedgerDefaults>) }
      : DEFAULT_ACCOUNT_LEDGER_SETTINGS
  } catch {
    return DEFAULT_ACCOUNT_LEDGER_SETTINGS
  }
}

export function formatLedgerFooter(settings: AccountLedgerDefaults) {
  const title = settings.ledgerFooterTitle || DEFAULT_ACCOUNT_LEDGER_SETTINGS.ledgerFooterTitle || "Ledger Footer"
  const address = settings.companyAddress || settings.officeAddress || DEFAULT_OFFICE_ADDRESS
  const phone = settings.companyPhone || ""
  const email = settings.companyEmail || ""
  const website = settings.companyWebsite || ""
  const notes = settings.footerNotes || ""
  const terms = settings.termsConditions || ""
  const signatureName = settings.authorizedSignatureName || ""
  const signaturePosition = settings.authorizedSignaturePosition || ""

  return [
    title,
    address,
    phone ? `Phone: ${phone}` : "",
    email ? `Email: ${email}` : "",
    website ? `Website: ${website}` : "",
    notes ? `Notes: ${notes}` : "",
    terms ? `Terms: ${terms}` : "",
    signatureName || signaturePosition ? `Authorized Signature: ${signatureName}${signaturePosition ? ` - ${signaturePosition}` : ""}` : "",
  ]
    .filter(Boolean)
    .join("\n")
}

function isValidEmailList(value = "") {
  if (!value.trim()) return false
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .every((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item))
}

function isValidWebsite(value = "") {
  if (!value.trim()) return false
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(value.trim())
}

export function AccountLedgerSettings() {
  const [settings, setSettings] = useState<AccountLedgerDefaults>(DEFAULT_ACCOUNT_LEDGER_SETTINGS)
  const [savedMessage, setSavedMessage] = useState("")
  const [validationMessage, setValidationMessage] = useState("")
  const [isFooterPreviewOpen, setIsFooterPreviewOpen] = useState(false)

  useEffect(() => {
    setSettings(readAccountLedgerSettings())
  }, [])

  useEffect(() => {
    if (!settings.autoSaveFooter) return
    const timeout = window.setTimeout(() => saveSettings(settings, true), 650)
    return () => window.clearTimeout(timeout)
  }, [
    settings.autoSaveFooter,
    settings.ledgerFooterTitle,
    settings.footerNotes,
    settings.termsConditions,
    settings.authorizedSignatureName,
    settings.authorizedSignaturePosition,
    settings.companyAddress,
    settings.companyPhone,
    settings.companyEmail,
    settings.companyWebsite,
  ])

  const validateFooterSettings = (nextSettings = settings) => {
    const required = [
      ["Ledger Footer Title", nextSettings.ledgerFooterTitle],
      ["Footer Notes", nextSettings.footerNotes],
      ["Terms & Conditions", nextSettings.termsConditions],
      ["Authorized Signature Name", nextSettings.authorizedSignatureName],
      ["Authorized Signature Position", nextSettings.authorizedSignaturePosition],
      ["Company Address", nextSettings.companyAddress],
      ["Company Phone", nextSettings.companyPhone],
      ["Company Email", nextSettings.companyEmail],
      ["Company Website", nextSettings.companyWebsite],
    ]
    const missing = required.find(([, value]) => !String(value || "").trim())
    if (missing) return `${missing[0]} is required.`
    if (!isValidEmailList(nextSettings.companyEmail)) return "Please enter valid company email address(es). Use commas for multiple emails."
    if (!isValidWebsite(nextSettings.companyWebsite)) return "Please enter a valid company website."
    return ""
  }

  const saveSettings = (nextSettings = settings, silent = false) => {
    const nextFooterInfo = formatLedgerFooter(nextSettings)
    const completeSettings = { ...nextSettings, footerInfo: nextFooterInfo }
    const validation = validateFooterSettings(completeSettings)
    if (validation) {
      setValidationMessage(validation)
      return false
    }
    window.localStorage.setItem(ACCOUNT_LEDGER_SETTINGS_STORAGE_KEY, JSON.stringify(completeSettings))
    window.dispatchEvent(new CustomEvent("account-ledger-settings-updated", { detail: completeSettings }))
    setSettings(completeSettings)
    setValidationMessage("")
    if (!silent) {
      setSavedMessage("Settings saved")
      window.setTimeout(() => setSavedMessage(""), 1800)
    }
    return true
  }

  const uploadLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return

    const reader = new FileReader()
    reader.onload = () => {
      const nextSettings = { ...settings, logoDataUrl: String(reader.result || "") }
      setSettings(nextSettings)
      saveSettings(nextSettings)
    }
    reader.readAsDataURL(file)
  }

  const resetDefaults = () => {
    setSettings(DEFAULT_ACCOUNT_LEDGER_SETTINGS)
    saveSettings(DEFAULT_ACCOUNT_LEDGER_SETTINGS)
  }

  const markBackup = () => {
    const nextSettings = { ...settings, lastBackupDate: new Date().toLocaleString() }
    setSettings(nextSettings)
    saveSettings(nextSettings)
  }

  function updateSetting<K extends keyof AccountLedgerDefaults>(key: K, value: AccountLedgerDefaults[K]) {
    const nextSettings = { ...settings, [key]: value }
    setSettings(nextSettings)
  }

  const exportFooterJson = () => {
    const footerSettings = {
      ledgerFooterTitle: settings.ledgerFooterTitle,
      footerNotes: settings.footerNotes,
      termsConditions: settings.termsConditions,
      authorizedSignatureName: settings.authorizedSignatureName,
      authorizedSignaturePosition: settings.authorizedSignaturePosition,
      companyAddress: settings.companyAddress,
      companyPhone: settings.companyPhone,
      companyEmail: settings.companyEmail,
      companyWebsite: settings.companyWebsite,
      autoSaveFooter: settings.autoSaveFooter,
    }
    const blob = new Blob([JSON.stringify(footerSettings, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "ledger-footer-settings.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFooterJson = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}")) as Partial<AccountLedgerDefaults>
        const nextSettings = { ...settings, ...imported }
        setSettings(nextSettings)
        saveSettings(nextSettings)
      } catch {
        setValidationMessage("Could not import this JSON file.")
      }
    }
    reader.readAsText(file)
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/75 bg-white/70 shadow-2xl shadow-blue-100/70 backdrop-blur-2xl">
      <header className="border-b border-blue-100/80 bg-gradient-to-r from-white via-blue-50/80 to-amber-50/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-white text-blue-600 shadow-lg shadow-blue-100">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Ledger Settings</p>
              <h2 className="text-2xl font-black text-slate-950">Global Ledger Footer, Logo & Address</h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetDefaults}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-blue-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => saveSettings()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] px-4 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-5 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.10),transparent_34%),linear-gradient(135deg,#ffffff,rgba(244,208,63,.12),#ffffff)] p-5 xl:grid-cols-[380px_1fr]">
        <div className="rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Ledger Logo</p>
          <div className="mt-4 flex min-h-52 items-center justify-center rounded-3xl border border-[#D4AF37]/40 bg-white/80 p-4">
            <img
              src={settings.logoDataUrl || "/images/account-ledger-logo.png"}
              alt="Account ledger logo"
              className="max-h-44 w-full object-contain"
            />
          </div>
          <label className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white text-sm font-black text-blue-700 shadow-sm transition hover:bg-blue-50">
            <ImageUp className="h-4 w-4" />
            Change Ledger Logo
            <input type="file" accept="image/*" className="hidden" onChange={(event) => uploadLogo(event.target.files?.[0])} />
          </label>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            This logo is used as the default top-center logo in Account Export Ledger views.
          </p>
        </div>

        <div className="grid gap-5">
          <label className="grid gap-2 rounded-[28px] border border-blue-100 bg-white/80 p-5 text-sm font-black text-slate-700 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
            Top Right Company Address
            <textarea
              value={settings.officeAddress}
              onChange={(event) => setSettings((current) => ({ ...current, officeAddress: event.target.value }))}
              className="min-h-52 resize-y rounded-2xl border border-blue-100 bg-white p-4 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="rounded-[32px] border border-white/75 bg-white/70 p-5 shadow-2xl shadow-blue-100/60 backdrop-blur-2xl">
            <div className="flex flex-col gap-4 border-b border-blue-100/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-blue-100 bg-white/80 text-blue-600 shadow-lg shadow-blue-100/50">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Ledger Settings</p>
                  <h3 className="text-xl font-black text-slate-950">Global Ledger Footer</h3>
                  <p className="text-sm font-semibold text-slate-500">Applies to all ledgers, print preview, PDF export, and reports.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsFooterPreviewOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white/85 px-4 text-xs font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5"
                >
                  <Eye className="h-4 w-4" />
                  Preview Footer
                </button>
                <button
                  type="button"
                  onClick={exportFooterJson}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-xs font-black text-amber-800 shadow-sm transition hover:-translate-y-0.5"
                >
                  <FileJson className="h-4 w-4" />
                  Export JSON
                </button>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm transition hover:-translate-y-0.5">
                  <Upload className="h-4 w-4" />
                  Import JSON
                  <input type="file" accept="application/json,.json" className="hidden" onChange={(event) => importFooterJson(event.target.files?.[0])} />
                </label>
              </div>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
              <div className="grid gap-4">
                <SettingsInput label="Ledger Footer Title" value={settings.ledgerFooterTitle || ""} onChange={(value) => updateSetting("ledgerFooterTitle", value)} />
                <SettingsTextarea label="Footer Notes" value={settings.footerNotes || ""} onChange={(value) => updateSetting("footerNotes", value)} rows="min-h-24" />
                <SettingsTextarea label="Terms & Conditions" value={settings.termsConditions || ""} onChange={(value) => updateSetting("termsConditions", value)} rows="min-h-28" />
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingsInput label="Authorized Signature Name" value={settings.authorizedSignatureName || ""} onChange={(value) => updateSetting("authorizedSignatureName", value)} />
                  <SettingsInput label="Authorized Signature Position" value={settings.authorizedSignaturePosition || ""} onChange={(value) => updateSetting("authorizedSignaturePosition", value)} />
                </div>
                <SettingsTextarea label="Company Address" value={settings.companyAddress || ""} onChange={(value) => updateSetting("companyAddress", value)} rows="min-h-32" />
                <div className="grid gap-4 md:grid-cols-3">
                  <SettingsInput label="Company Phone" value={settings.companyPhone || ""} onChange={(value) => updateSetting("companyPhone", value)} />
                  <SettingsInput label="Company Email" value={settings.companyEmail || ""} onChange={(value) => updateSetting("companyEmail", value)} />
                  <SettingsInput label="Company Website" value={settings.companyWebsite || ""} onChange={(value) => updateSetting("companyWebsite", value)} />
                </div>
                <label className="flex items-center justify-between gap-3 rounded-3xl border border-blue-100 bg-white/70 p-4 shadow-sm">
                  <span>
                    <span className="block text-sm font-black text-slate-900">Automatically save footer changes</span>
                    <span className="block text-xs font-semibold text-slate-500">When enabled, changes save after you stop typing.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.autoSaveFooter)}
                    onChange={(event) => updateSetting("autoSaveFooter", event.target.checked)}
                    className="h-6 w-6 rounded-lg border-blue-200 text-blue-600 focus:ring-blue-300"
                  />
                </label>
              </div>

              <LedgerFooterPreviewCard settings={settings} />
            </div>
          </div>

          <div className="grid gap-4 rounded-[28px] border border-blue-100 bg-white/80 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-slate-700">
              Saved Ledger PDF Documents Folder
              <input
                value={settings.savedPdfFolder || ""}
                onChange={(event) => setSettings((current) => ({ ...current, savedPdfFolder: event.target.value }))}
                className="h-12 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <span className="text-xs font-semibold text-slate-500">
                PDFs are saved on this local server inside the project public upload folder.
              </span>
            </label>

            <label className="grid gap-2 text-sm font-black text-slate-700">
              Ledger Row Media Folder
              <input
                value={settings.mediaFolder || ""}
                onChange={(event) => setSettings((current) => ({ ...current, mediaFolder: event.target.value }))}
                className="h-12 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <span className="text-xs font-semibold text-slate-500">
                Images and videos attached to ledger rows are stored here.
              </span>
            </label>
          </div>

          <div className="rounded-[28px] border border-blue-100 bg-white/82 p-5 shadow-xl shadow-blue-100/50 backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Media Storage</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Local PC Media Manager</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Ledger media is saved on this PC/server and remains available after restart.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={markBackup}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-black text-emerald-700 shadow-sm"
                >
                  <Archive className="h-4 w-4" />
                  Backup Media
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Open this folder on the local PC:\n${settings.mediaFolder || DEFAULT_ACCOUNT_LEDGER_SETTINGS.mediaFolder}`)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 text-xs font-black text-blue-700 shadow-sm"
                >
                  <FolderOpen className="h-4 w-4" />
                  Open Folder
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <label className="grid gap-2 text-sm font-black text-slate-700 lg:col-span-2">
                Media Storage Location
                <div className="relative">
                  <HardDrive className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-600" />
                  <input
                    value={settings.mediaFolder || ""}
                    onChange={(event) => setSettings((current) => ({ ...current, mediaFolder: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-blue-100 bg-white pl-12 pr-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Default folder structure: Media / Images / Videos / VoiceMessages / Documents / Thumbnails.
                </span>
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700">
                Storage Mode
                <select
                  value={settings.mediaStorageMode || "local"}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, mediaStorageMode: event.target.value as AccountLedgerDefaults["mediaStorageMode"] }))
                  }
                  className="h-12 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="local">Local PC Storage</option>
                  <option value="network">Network Drive Storage</option>
                  <option value="cloud">Cloud Storage (Future)</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-black text-slate-700 lg:col-span-3">
                Network / Shared Folder Path
                <input
                  value={settings.networkStoragePath || ""}
                  onChange={(event) => setSettings((current) => ({ ...current, networkStoragePath: event.target.value }))}
                  placeholder="\\\\SERVER\\ShipmentMedia or Z:\\ShipmentMedia"
                  className="h-12 rounded-2xl border border-blue-100 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {[
                ["Total Storage Used", "Calculated in media gallery"],
                ["Available Disk Space", "Local drive"],
                ["Media Count", "Shown per ledger row"],
                ["Last Backup Date", settings.lastBackupDate || "No backup yet"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-blue-100 bg-white/75 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {savedMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
              {savedMessage}
            </div>
          ) : null}
          {validationMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
              {validationMessage}
            </div>
          ) : null}
        </div>
      </div>

      {isFooterPreviewOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xl">
          <div className="w-full max-w-4xl rounded-[32px] border border-white/70 bg-white/82 p-5 shadow-2xl backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.20em] text-[#D4AF37]">Preview Footer</p>
                <h3 className="text-2xl font-black text-slate-950">Ledger Print / PDF / Report Footer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFooterPreviewOpen(false)}
                className="h-11 rounded-2xl border border-blue-100 bg-white px-5 text-sm font-black text-slate-700 shadow-sm"
              >
                Close
              </button>
            </div>
            <LedgerFooterPreviewCard settings={settings} wide />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function SettingsInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-blue-100 bg-white/85 px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  )
}

function SettingsTextarea({
  label,
  value,
  onChange,
  rows,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: string
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${rows} resize-y rounded-2xl border border-blue-100 bg-white/85 p-4 text-sm font-bold leading-6 text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100`}
      />
    </label>
  )
}

function LedgerFooterPreviewCard({ settings, wide = false }: { settings: AccountLedgerDefaults; wide?: boolean }) {
  return (
    <div className={`rounded-[28px] border border-[#D4AF37]/45 bg-white/80 p-5 shadow-xl shadow-blue-100/40 backdrop-blur-xl ${wide ? "" : "h-full"}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-100">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37]">Live Preview Card</p>
          <h4 className="text-xl font-black text-slate-950">{settings.ledgerFooterTitle || "Ledger Footer"}</h4>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-blue-100 bg-[linear-gradient(135deg,rgba(255,255,255,.86),rgba(239,246,255,.70))] p-5">
        <div className="grid gap-4 md:grid-cols-3">
          {["Ledger Print", "PDF Export", "Print Preview"].map((label) => (
            <div key={label} className="rounded-2xl border border-white/70 bg-white/70 p-3 text-center text-xs font-black text-blue-700 shadow-sm">
              {label}
            </div>
          ))}
        </div>
        <div className="mt-5 space-y-3 text-sm font-bold leading-6 text-slate-700">
          <p className="whitespace-pre-line">{settings.companyAddress || settings.officeAddress}</p>
          <p>{settings.companyPhone}</p>
          <p>{settings.companyEmail}</p>
          <p>{settings.companyWebsite}</p>
          <p className="rounded-2xl bg-blue-50 p-3 text-slate-700">{settings.footerNotes}</p>
          <p className="rounded-2xl bg-amber-50 p-3 text-slate-700">{settings.termsConditions}</p>
        </div>
        <div className="mt-8 flex items-end justify-between gap-4 border-t border-dashed border-slate-300 pt-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Authorized Signature</p>
            <p className="mt-2 text-lg font-black text-slate-950">{settings.authorizedSignatureName}</p>
            <p className="text-sm font-bold text-slate-500">{settings.authorizedSignaturePosition}</p>
          </div>
          <div className="h-px w-44 bg-slate-400" />
        </div>
      </div>
    </div>
  )
}
