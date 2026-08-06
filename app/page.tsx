"use client"

import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
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
import { BOLEditor } from "@/components/bill-of-lading/bol-editor"
import { SavedDocuments } from "@/components/bill-of-lading/saved-documents"
import { AccountLedger } from "@/components/bill-of-lading/account-ledger"
import { InvoiceEditor } from "@/components/invoice/invoice-editor"
import { AccountLedgerSettings } from "@/components/accounts/account-ledger-settings"

type ViewKey = "dashboard" | "invoice" | "bol" | "settings"

const SESSION_KEY = "sky-logistics-authenticated"

const navItems: { key: ViewKey | "logout"; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "invoice", label: "Invoice Editor", icon: ReceiptText },
  { key: "bol", label: "Bill of Lading Editor", icon: FileText },
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
    <main className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/70 via-slate-50 to-amber-50/50 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Light Theme Dynamic Background Elements */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-400/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-[400px] w-[600px] rounded-full bg-amber-400/20 blur-[120px]" />

      <svg className="pointer-events-none absolute inset-x-0 top-1/4 h-96 w-full opacity-25" viewBox="0 0 1440 360" fill="none" aria-hidden="true">
        <path d="M-80 285C210 20 506 8 825 180C1071 313 1264 256 1520 45" stroke="#D4AF37" strokeWidth="2" />
        <path d="M-40 322C238 88 508 70 792 203C1029 314 1246 326 1486 137" stroke="#2563eb" strokeWidth="1.4" opacity=".45" />
        <path d="M236 360C438 158 632 120 850 198C1024 260 1204 244 1364 139" stroke="#D4AF37" strokeWidth="1.2" opacity=".35" />
      </svg>

      {/* Floating Top Header Brand Pill (Light Glass) */}
      <header className="relative z-10 mt-2 flex w-full max-w-4xl items-center justify-between rounded-full border border-slate-200/80 bg-white/80 px-5 py-2.5 shadow-xl shadow-slate-200/50 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-400/60 bg-linear-to-br from-amber-400 to-yellow-600 text-slate-950 font-black text-xs shadow-md">
            SA
          </div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-slate-900 sm:text-sm">
            SKY ARIANA <span className="text-amber-700">&amp;</span> BALAM BAR BARAN
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">System Online</span>
        </div>
      </header>

      {/* Central Light Glass Login Card */}
      <div className="relative z-10 flex w-full flex-1 items-center justify-center py-8">
        <section className="relative w-full max-w-md overflow-hidden rounded-[36px] border border-slate-200/90 bg-white/90 p-7 shadow-2xl shadow-slate-900/10 backdrop-blur-3xl transition-all sm:p-9 hover:border-amber-400/70" aria-label="Sign in">
          {/* Card Top Gold Highlight */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-linear-to-r from-transparent via-amber-500 to-transparent" />

          {/* Logo Container */}
          <div className="mx-auto flex h-24 w-44 items-center justify-center rounded-2xl border border-amber-200/70 bg-white p-3 shadow-lg shadow-amber-500/10">
            <img src="/images/login-company-logo.png" alt="SKY ARIANA & BALAM BAR BARAN logo" className="h-full w-full object-contain" />
          </div>

          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-amber-900 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Secure Logistics Portal
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Welcome Back</h1>
            <p className="mt-1 text-sm font-extrabold text-[#0B1F4D]">SKY ARIANA &amp; BALAM BAR BARAN</p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.25em] text-amber-700">Logistics &amp; Transportation Services</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (canSubmit) onSubmit()
            }}
            className="mt-6 space-y-4"
          >
            <LoginInput
              icon={<Mail className="h-5 w-5 text-amber-700" />}
              value={loginName}
              onChange={onLoginNameChange}
              placeholder="Enter your email"
              type="email"
            />

            <LoginInput
              icon={<LockKeyhole className="h-5 w-5 text-amber-700" />}
              value={loginPassword}
              onChange={onLoginPasswordChange}
              placeholder="Enter password"
              type={showPassword ? "text" : "password"}
              onEnter={onSubmit}
              action={
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={onTogglePassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            <div className="flex items-center justify-between text-xs font-semibold pt-1">
              <span className="text-slate-500">Default: Admin access</span>
              <button type="button" className="text-amber-800 font-bold hover:text-amber-900 hover:underline">Forgot password?</button>
            </div>

            <button
              type="submit"
              className="group relative flex h-13 w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-amber-600/50 bg-linear-to-r from-[#0B1F4D] via-[#162C61] to-[#0B1F4D] px-5 text-base font-black text-white shadow-xl shadow-blue-950/20 transition-all hover:scale-[1.01] hover:from-amber-600 hover:via-yellow-500 hover:to-amber-600 hover:text-slate-950 hover:border-amber-400 active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
              disabled={!canSubmit}
            >
              <span>Sign in to Dashboard</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </section>
      </div>

      {/* Light Footer Pill */}
      <footer className="relative z-10 mb-2 w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white/80 p-4 text-center shadow-lg shadow-slate-200/50 backdrop-blur-2xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-700">Created By AQ</p>
        <div className="mt-2 flex flex-col gap-1.5 text-[11px] font-bold text-slate-700 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
          <p>
            <span className="text-amber-800">Emails:</span> ahsanullahqureshi888@gmail.com | yahoo.com | hotmail.com
          </p>
          <p>
            <span className="text-amber-800">Contact:</span> +93 711112762 | +93 744287995 | +93 79964110
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
    <div className="relative flex items-center w-full">
      <span className="absolute left-4 z-10 pointer-events-none flex items-center justify-center text-amber-700">{icon}</span>
      <input
        className="h-13 w-full rounded-2xl border border-slate-200/90 bg-slate-50/80 pl-12 pr-12 text-sm font-semibold text-slate-900 placeholder-slate-400 shadow-xs outline-none transition-all focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter?.()
        }}
        placeholder={placeholder}
        type={type}
      />
      {action ? <div className="absolute right-2 z-10 flex items-center">{action}</div> : null}
    </div>
  )
}

function DashboardCards({ setActiveView }: { setActiveView: (view: ViewKey) => void }) {
  const cards: { key: ViewKey; title: string; subtitlePersian: string; text: string; icon: any; accent: string; badge: string; features: string[] }[] = [
    {
      key: "invoice",
      title: "Invoice Editor",
      subtitlePersian: "مدیریت فاکتورهای تجارتی",
      text: "Create, save, preview, print, and download professional logistics freight invoices.",
      icon: ReceiptText,
      accent: "from-blue-600 via-indigo-600 to-sky-500",
      badge: "Billing & Freight",
      features: ["Auto Currency", "Itemized Table", "A4 PDF Print"],
    },
    {
      key: "bol",
      title: "Bill of Lading Editor",
      subtitlePersian: "مدیریت بارنامه‌های بین‌المللی",
      text: "Complete BOL editor with multi-stop timeline, truck details (Plate/Chassis/Customs Seal), and A4 PDF tools.",
      icon: FileText,
      accent: "from-[#0B1F4D] via-[#162C61] to-blue-700",
      badge: "Documents & Freight",
      features: ["Multi-Stop Route", "Truck Specs & Seal", "A4 High-Quality PDF"],
    },
    {
      key: "settings",
      title: "Settings & Security",
      subtitlePersian: "تنظیمات و دسترسی کاربران",
      text: "Manage system users (Admin, Accountant, Viewer), company logos, ledger footers, and local backups.",
      icon: Settings,
      accent: "from-amber-600 via-yellow-600 to-amber-700",
      badge: "Control & Security",
      features: ["Admin/Accountant Roles", "Company Logo & Footer", "JSON Backup & Restore"],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Dashboard Hero Welcome Banner */}
      <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="relative overflow-hidden rounded-[36px] border border-white/80 bg-linear-to-br from-white/90 via-blue-50/40 to-amber-50/40 p-7 shadow-2xl shadow-blue-100/60 backdrop-blur-2xl md:p-9">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-300/30 blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#D4AF37]/20 blur-3xl" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50/90 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900 shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                macOS Enterprise Command Suite
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                System Active
              </span>
            </div>

            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
              SKY ARIANA &amp; BALAM BAR BARAN
            </h2>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-8 text-slate-600">
              Unified international freight &amp; transportation hub for managing Bills of Lading, custom truck specifications, invoices, and role-based user access.
            </p>

            {/* Quick Launcher Action Shortcuts */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView("invoice")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blue-600 via-indigo-600 to-sky-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-500/25 transition hover:scale-[1.02] cursor-pointer"
              >
                <ReceiptText className="h-4 w-4" />
                <span>Create Invoice / فاکتور جدید</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("bol")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-amber-600/50 bg-[#0B1F4D] px-5 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-amber-600 hover:text-slate-950 cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>Open BOL Editor / بارنامه</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView("settings")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-5 text-sm font-black text-slate-800 shadow-sm transition hover:bg-amber-50 hover:border-amber-400 cursor-pointer"
              >
                <Settings className="h-4 w-4 text-slate-600" />
                <span>Settings &amp; Users / تنظیمات</span>
              </button>
            </div>
          </div>
        </div>

        {/* System Workspace Analytics Card */}
        <div className="rounded-[36px] border border-amber-200/70 bg-linear-to-br from-[#fffdf5] to-[#fff8df]/80 p-7 shadow-2xl shadow-[#D4AF37]/15 backdrop-blur-2xl md:p-9 flex flex-col justify-between">
          <div>
            <span className="text-xs font-black uppercase tracking-[0.28em] text-[#9e7000]">System Workspace Overview</span>
            <h3 className="mt-2 text-3xl font-black text-slate-950">Active Analytics</h3>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
              Live status overview of logistics modules, document storage, and security roles.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-amber-200/60 pt-5 text-xs font-bold text-slate-700">
            <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-3 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-amber-800 block">Security Roles</span>
              <span className="text-xs font-black text-slate-900">👑 Admin • 💼 Accountant • 👁️ Viewer</span>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-3 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-amber-800 block">Truck Presets</span>
              <span className="text-xs font-black text-slate-900">🚛 Herat → Islam Qala → Dougharoun</span>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-3 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-amber-800 block">PDF Engine</span>
              <span className="text-xs font-black text-slate-900">A4 Print &amp; Download Ready</span>
            </div>

            <div className="rounded-2xl border border-amber-200/80 bg-white/80 p-3 shadow-2xs">
              <span className="text-[10px] font-black uppercase text-amber-800 block">Storage</span>
              <span className="text-xs font-black text-emerald-800">● Local Browser Storage</span>
            </div>
          </div>
        </div>
      </section>

      {/* Module Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.key}
              onClick={() => setActiveView(card.key)}
              className="group relative min-h-80 cursor-pointer overflow-hidden rounded-[34px] border border-white/80 bg-white/85 p-6 text-left shadow-xl shadow-slate-200/60 backdrop-blur-2xl transition duration-300 hover:-translate-y-1.5 hover:border-amber-400 hover:bg-white hover:shadow-2xl hover:shadow-amber-500/10"
            >
              <div className={`absolute -right-12 -top-12 h-36 w-36 rounded-full bg-linear-to-br ${card.accent} opacity-15 blur-2xl transition group-hover:opacity-30`} />
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br ${card.accent} text-white shadow-xl shadow-blue-500/20 transition group-hover:scale-105`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <span className="rounded-full border border-amber-300/80 bg-amber-100/80 px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900">
                    {card.badge}
                  </span>
                </div>

                <div className="mt-6">
                  <h2 className="text-2xl font-black leading-tight text-slate-950">{card.title}</h2>
                  <p className="text-xs font-bold text-amber-800 font-[vazirmatn] mt-0.5" dir="rtl">{card.subtitlePersian}</p>
                </div>

                <p className="mt-3 flex-1 text-sm font-semibold leading-6 text-slate-600">{card.text}</p>

                {/* Feature Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {card.features.map((feat) => (
                    <span key={feat} className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700">
                      ✓ {feat}
                    </span>
                  ))}
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setActiveView(card.key)
                    }}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-linear-to-r from-[#0B1F4D] to-[#162C61] px-5 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:from-amber-600 hover:to-yellow-500 hover:text-slate-950 cursor-pointer"
                  >
                    <span>Launch Module / ورود به بخش</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
