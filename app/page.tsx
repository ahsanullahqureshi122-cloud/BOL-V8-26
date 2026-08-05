"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  Eye,
  EyeOff,
  FileInput,
  FileOutput,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Menu,
  ReceiptText,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import TruckIcon from "@/components/icons/TruckIcon"
import ImportsTrucksList from "@/components/imports-trucks-list"
import { BOLEditor } from "@/components/bill-of-lading/bol-editor"
import { SavedDocuments } from "@/components/bill-of-lading/saved-documents"
import { AccountLedger } from "@/components/bill-of-lading/account-ledger"
import { InvoiceEditor } from "@/components/invoice/invoice-editor"
import { AccountManager } from "@/components/accounts/account-manager"
import { AccountLedgerSettings } from "@/components/accounts/account-ledger-settings"
import { FilesMediaCenter } from "@/components/files-media-center"

type ViewKey = "dashboard" | "invoice" | "bol" | "import" | "export" | "settings" | "trucks" | "files"

const SESSION_KEY = "sky-logistics-authenticated"

const navItems: { key: ViewKey | "logout"; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "invoice", label: "Invoice Editor", icon: ReceiptText },
  { key: "bol", label: "Bill of Lading Editor", icon: FileText },
  { key: "import", label: "Import Accounts", icon: FileInput },
  { key: "export", label: "Export Accounts", icon: FileOutput },
  { key: "trucks", label: "Imports Trucks List", icon: TruckIcon },
  { key: "files", label: "Files & Media Center", icon: FolderOpen },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "logout", label: "Logout", icon: LogOut },
]

export default function LogisticsPlatformPage() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [loginName, setLoginName] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [activeView, setActiveView] = useState<ViewKey>("dashboard")
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [loadDocumentId, setLoadDocumentId] = useState<string | null>(null)
  const [pageKey, setPageKey] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsAuthed(window.localStorage.getItem(SESSION_KEY) === "true")
  }, [])

  const login = () => {
    if (!loginName.trim() || !loginPassword.trim()) return
    window.localStorage.setItem(SESSION_KEY, "true")
    setIsAuthed(true)
  }

  const logout = () => {
    window.localStorage.removeItem(SESSION_KEY)
    setIsAuthed(false)
    setActiveView("dashboard")
  }

  const resetBolView = () => {
    setLoadDocumentId(null)
    setPageKey((prev) => prev + 1)
  }

  const switchView = (view: ViewKey) => {
    setActiveView(view)
    setMobileMenuOpen(false)
  }

  const activeTitle = getViewTitle(activeView)

  if (!isAuthed) {
    return (
      <LoginScreen
        loginName={loginName}
        loginPassword={loginPassword}
        showPassword={showPassword}
        onLoginNameChange={setLoginName}
        onLoginPasswordChange={setLoginPassword}
        onTogglePassword={() => setShowPassword((value) => !value)}
        onSubmit={login}
      />
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(212,175,55,.18),transparent_30%),linear-gradient(135deg,#ffffff,#eff6ff,#fffdf7)] text-slate-950 print:bg-white">
      <MacDashboardNav
        activeView={activeView}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((value) => !value)}
        onNavigate={switchView}
        onLogout={logout}
      />

      <div className="min-h-screen w-full px-3 pb-5 pt-24 sm:px-5 lg:px-7 xl:px-8">
        <section className="mx-auto flex w-full max-w-[1900px] min-w-0 flex-col gap-5">
          <header className="overflow-hidden rounded-[30px] border border-white/75 bg-white/65 shadow-2xl shadow-blue-100/60 backdrop-blur-[24px] print:hidden">
            <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between lg:p-6">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#b8860b] shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Luxury Enterprise Logistics
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">{activeTitle}</h1>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-slate-600">
                  Welcome back. Manage invoices, bills of lading, account ledgers, truck imports, and company settings from one premium glass workspace.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-sm font-black text-slate-700 shadow-lg shadow-blue-100/60">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  Secure Session
                </div>
                {activeView === "bol" ? (
                  <button
                    type="button"
                    onClick={resetBolView}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-white/75 px-4 text-sm font-black text-blue-700 shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset View
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          {activeView === "dashboard" ? <DashboardCards setActiveView={setActiveView} /> : null}
          {activeView === "invoice" ? <InvoiceEditor /> : null}
          {activeView === "bol" ? (
            <section className="rounded-[28px] border border-white/70 bg-white/55 p-2 shadow-2xl shadow-blue-100/70 backdrop-blur-[20px] md:p-3 print:border-0 print:p-0 print:shadow-none">
              <BOLEditor
                key={pageKey}
                onRefreshDocuments={() => setRefreshTrigger((prev) => prev + 1)}
                loadDocumentId={loadDocumentId}
                onDocumentLoaded={() => setLoadDocumentId(null)}
                savedDocumentsPanel={<SavedDocuments onLoadDocument={setLoadDocumentId} refreshTrigger={refreshTrigger} variant="sidebar" />}
                accountLedgerPanel={<AccountLedger />}
              />
            </section>
          ) : null}
          {activeView === "import" ? <AccountManager mode="import" onClose={() => setActiveView("dashboard")} onOpenSettings={() => setActiveView("settings")} /> : null}
          {activeView === "export" ? <AccountManager mode="export" onClose={() => setActiveView("dashboard")} onOpenSettings={() => setActiveView("settings")} /> : null}
          {activeView === "trucks" ? <ImportsTrucksList onClose={() => setActiveView("dashboard")} /> : null}
          {activeView === "files" ? <FilesMediaCenter /> : null}
          {activeView === "settings" ? <AccountLedgerSettings /> : null}
        </section>
      </div>
    </main>
  )
}

function getViewTitle(activeView: ViewKey) {
  const item = navItems.find((navItem) => navItem.key === activeView)
  return item?.label || "Dashboard"
}

function MacDashboardNav({
  activeView,
  mobileMenuOpen,
  onToggleMobileMenu,
  onNavigate,
  onLogout,
}: {
  activeView: ViewKey
  mobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onNavigate: (view: ViewKey) => void
  onLogout: () => void
}) {
  const menuItems = navItems.filter((item) => item.key !== "logout") as { key: ViewKey; label: string; icon: any }[]

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 print:hidden sm:px-5 lg:px-7">
      <div className="mx-auto max-w-[1900px] rounded-[30px] border border-white/80 bg-white/72 shadow-2xl shadow-blue-100/70 backdrop-blur-xl">
        <div className="flex min-h-16 items-center gap-3 px-3 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="group flex min-w-0 items-center gap-3 rounded-3xl border border-white/70 bg-white/80 px-3 py-2 text-left shadow-lg shadow-blue-100/70 transition hover:-translate-y-0.5 hover:border-[#D4AF37]/50 hover:shadow-blue-200"
          >
            <span className="flex h-11 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-inner">
              <img src="/images/login-company-logo.png" alt="SKY Logistics logo" className="h-full w-full object-contain p-1" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-base font-black leading-tight text-[#0B1F4D]">SKY Logistics</span>
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">White Gold Blue Suite</span>
            </span>
          </button>

          <nav className="hidden flex-1 items-center justify-center gap-1 xl:flex">
            {menuItems.map((item) => (
              <DashNavButton key={item.key} item={item} active={item.key === activeView} onClick={() => onNavigate(item.key)} />
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-2 xl:flex">
            <LogoutButton onClick={onLogout} />
          </div>

          <div className="ml-auto flex items-center gap-2 xl:hidden">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-white/80 text-blue-700 shadow-lg shadow-blue-100 transition hover:bg-blue-50"
              aria-label={mobileMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-blue-100/70 px-3 pb-3 xl:hidden">
            <nav className="grid gap-2 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {menuItems.map((item) => (
                <DashNavButton key={item.key} item={item} active={item.key === activeView} onClick={() => onNavigate(item.key)} compact />
              ))}
              <LogoutButton onClick={onLogout} compact />
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  )
}

function DashNavButton({
  item,
  active,
  onClick,
  compact = false,
}: {
  item: { key: ViewKey; label: string; icon: any }
  active: boolean
  onClick: () => void
  compact?: boolean
}) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition duration-200 ${
        compact ? "h-12 justify-start" : "h-11"
      } ${
        active
          ? "border-blue-300 bg-linear-to-br from-[#2563EB] to-[#1D4ED8] text-white shadow-lg shadow-blue-200"
          : "border-white/70 bg-white/55 text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/10 hover:text-blue-700 hover:shadow-blue-100"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap">{item.label}</span>
    </button>
  )
}

function LogoutButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white/70 px-4 py-2 text-xs font-black text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-red-100 ${
        compact ? "h-12 justify-start" : "h-11"
      }`}
    >
      <LogOut className="h-4 w-4" />
      Logout
    </button>
  )
}

function LoginScreen({
  loginName,
  loginPassword,
  showPassword,
  onLoginNameChange,
  onLoginPasswordChange,
  onTogglePassword,
  onSubmit,
}: {
  loginName: string
  loginPassword: string
  showPassword: boolean
  onLoginNameChange: (value: string) => void
  onLoginPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: () => void
}) {
  const canSubmit = Boolean(loginName.trim() && loginPassword.trim())

  return (
    <main
      className="sky-login-screen"
      style={{
        backgroundImage:
          "linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.34)), url('/images/login-logistics-background.png')",
      }}
    >
      <svg className="sky-login-arcs" viewBox="0 0 1440 360" fill="none" aria-hidden="true">
        <path d="M-80 285C210 20 506 8 825 180C1071 313 1264 256 1520 45" stroke="white" strokeWidth="2" />
        <path d="M-40 322C238 88 508 70 792 203C1029 314 1246 326 1486 137" stroke="white" strokeWidth="1.4" opacity=".55" />
        <path d="M236 360C438 158 632 120 850 198C1024 260 1204 244 1364 139" stroke="white" strokeWidth="1.2" opacity=".36" />
      </svg>

      <div className="sky-login-center">
        <section className="sky-login-card" aria-label="Sign in">
          <div className="sky-login-card-logo">
            <img src="/images/login-company-logo.png" alt="SKY ARIANA & BALAM BAR BARAN logo" />
          </div>

          <p className="sky-login-kicker">Secure Logistics Portal</p>
          <h1>Welcome Back</h1>
          <p>SKY ARIANA &amp; BALAM BAR BARAN</p>
          <p className="sky-login-service">LOGISTICS &amp; TRANSPORTATION SERVICES</p>

          <div className="sky-login-form">
            <LoginInput
              icon={<Mail />}
              value={loginName}
              onChange={onLoginNameChange}
              placeholder="Email"
              type="email"
            />

            <LoginInput
              icon={<LockKeyhole />}
              value={loginPassword}
              onChange={onLoginPasswordChange}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              onEnter={onSubmit}
              action={
                <button type="button" className="sky-login-input-action" onClick={onTogglePassword} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              }
            />

            <div className="sky-login-forgot">
              <button type="button">Forgot password?</button>
            </div>

            <button type="button" className="sky-login-submit" onClick={onSubmit} disabled={!canSubmit}>
              Sign in
            </button>
          </div>

        </section>
      </div>

      <footer className="sky-login-footer">
        <div className="sky-login-footer-line" />
        <p className="sky-login-footer-title">Created By AQ</p>
        <div className="sky-login-footer-grid">
          <p>
            <strong>Emails:</strong> ahsanullahqureshi888@gmail.com | ahsanullahqureshi888@yahoo.com | ahsanullahqureshi88@hotmail.com
          </p>
          <p>
            <strong>Contact:</strong> +93 711112762 | +93 744287995 | +93 79964110 | +93 784044999
          </p>
        </div>
      </footer>
    </main>
  )
}

function LoginInput({
  icon,
  value,
  onChange,
  placeholder,
  type,
  action,
  onEnter,
}: {
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder: string
  type: string
  action?: ReactNode
  onEnter?: () => void
}) {
  return (
    <div className="sky-login-input-wrap">
      <span className="sky-login-input-icon">{icon}</span>
      <input
        className="sky-login-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.()
        }}
        placeholder={placeholder}
        type={type}
      />
      {action}
    </div>
  )
}

function DashboardCards({ setActiveView }: { setActiveView: (view: ViewKey) => void }) {
  const cards: { key: ViewKey; title: string; text: string; icon: any; accent: string; badge: string }[] = [
    { key: "invoice", title: "Invoice Editor", text: "Create, save, preview, print, and download professional logistics invoices.", icon: ReceiptText, accent: "from-blue-600 to-sky-500", badge: "Billing" },
    { key: "bol", title: "Bill of Lading Editor", text: "Continue using the complete BOL editor with saved documents and PDF tools.", icon: FileText, accent: "from-[#0B1F4D] to-blue-700", badge: "Documents" },
    { key: "import", title: "Import Accounts", text: "Manage importer accounts, company profiles, contacts, and ledger access.", icon: FileInput, accent: "from-cyan-600 to-blue-600", badge: "Accounts" },
    { key: "export", title: "Export Accounts", text: "Open export account ledgers, reports, media, PDFs, and CSV workflows.", icon: FileOutput, accent: "from-[#D4AF37] to-amber-500", badge: "Ledger" },
    { key: "trucks", title: "Imports Trucks List", text: "Track imported truck shipments, containers, drivers, customs, and routes.", icon: TruckIcon, accent: "from-blue-700 to-indigo-600", badge: "Trucking" },
    { key: "files", title: "Files & Media Center", text: "Organize PDFs, Excel files, media, logos, shipment packets, import queues, and document metadata.", icon: FolderOpen, accent: "from-sky-600 to-blue-700", badge: "Files" },
    { key: "settings", title: "Settings", text: "Update ledger logos, addresses, footer settings, storage paths, and defaults.", icon: Settings, accent: "from-slate-800 to-blue-700", badge: "Control" },
  ]

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[34px] border border-white/75 bg-white/65 p-6 shadow-2xl shadow-blue-100/70 backdrop-blur-[24px] md:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#D4AF37]/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#D4AF37]">macOS Dashboard</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              SKY ARIANA &amp; BALAM BAR BARAN
            </h2>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              A full-width logistics command center for invoices, BOL documents, import/export accounts, truck manifests, media, and settings.
            </p>
          </div>
        </div>
        <div className="rounded-[34px] border border-[#D4AF37]/30 bg-[#fff8df]/70 p-6 shadow-2xl shadow-[#D4AF37]/20 backdrop-blur-[24px] md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#a27300]">Today&apos;s Workspace</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">Choose a module</h3>
          <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
            Use the top dashbar for fast navigation, or open a main workflow from the cards below.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.key}
              onClick={() => setActiveView(card.key)}
              className="group relative min-h-72 cursor-pointer overflow-hidden rounded-[30px] border border-white/75 bg-white/68 p-5 text-left shadow-2xl shadow-blue-100/60 backdrop-blur-[24px] transition duration-300 hover:-translate-y-1 hover:border-[#D4AF37]/60 hover:bg-white/82 hover:shadow-blue-200"
            >
              <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-linear-to-br ${card.accent} opacity-15 blur-2xl transition group-hover:opacity-30`} />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br ${card.accent} text-white shadow-xl shadow-blue-200 transition group-hover:scale-105`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#936900]">
                    {card.badge}
                  </span>
                </div>
                <h2 className="mt-7 text-2xl font-black leading-tight text-slate-950">{card.title}</h2>
                <p className="mt-3 flex-1 text-sm font-semibold leading-7 text-slate-600">{card.text}</p>
                {card.key === "files" ? (
                  <div className="mt-6 grid gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveView("files")
                      }}
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-blue-100 bg-linear-to-br from-blue-600 to-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:from-blue-500 hover:to-blue-700"
                    >
                      Open
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setActiveView("files")
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-blue-100 bg-white/80 px-3 text-xs font-black text-blue-700 shadow-sm transition hover:bg-blue-50"
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setActiveView("files")
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#D4AF37]/40 bg-[#fff8df]/80 px-3 text-xs font-black text-[#8a6200] shadow-sm transition hover:bg-[#fff2bd]"
                      >
                        Add Logo
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveView(card.key)
                    }}
                    className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl border border-blue-100 bg-linear-to-br from-blue-600 to-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-200 transition group-hover:from-blue-500 group-hover:to-blue-700"
                  >
                    Open
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
