"use client"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { CURRENT_SYSTEM_VERSION } from "@/lib/config/system-version"
import { UserRole } from "@/lib/types"
import {
  Users,
  Lock,
  Building2,
  Download,
  Shield,
  UserPlus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Globe,
  Phone,
  Mail,
  Save,
  Sliders,
  Terminal,
} from "lucide-react"

const ROLE_BADGES: Record<UserRole, { label: string; bg: string; text: string; icon: string }> = {
  superadmin: { label: "Superadmin", bg: "bg-purple-100 border-purple-300", text: "text-purple-900 font-extrabold", icon: "👑" },
  admin: { label: "Admin", bg: "bg-blue-100 border-blue-300", text: "text-blue-900 font-extrabold", icon: "🛡️" },
  accountant: { label: "Accountant", bg: "bg-emerald-100 border-emerald-300", text: "text-emerald-900 font-extrabold", icon: "💼" },
  viewer: { label: "Viewer", bg: "bg-slate-100 border-slate-300", text: "text-slate-700 font-bold", icon: "👁️" },
}

export function SettingsView() {
  const { users, addUser, updateUserRole, deleteUser, changePassword, currentUser } = useApp()
  const [activeTab, setActiveTab] = useState<"users" | "password" | "general" | "update">("users")

  // Add User Form State
  const [newUsername, setNewUsername] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState<UserRole>("admin")
  const [newEmail, setNewEmail] = useState("")
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // System Update Check State
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setUserMsg(null)

    if (!newUsername.trim() || !newName.trim()) {
      setUserMsg({ type: "error", text: "Username and Full Name are required." })
      return
    }

    if (users.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setUserMsg({ type: "error", text: "Username already exists. Please choose a different username." })
      return
    }

    addUser({
      username: newUsername,
      name: newName,
      role: newRole,
      email: newEmail,
    })

    setUserMsg({ type: "success", text: `User '${newUsername}' successfully created with role ${newRole.toUpperCase()}!` })
    setNewUsername("")
    setNewName("")
    setNewEmail("")
    setNewRole("admin")
  }

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPassMsg(null)

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New password and Confirm password do not match." })
      return
    }

    const res = changePassword(oldPassword, newPassword)
    if (res.success) {
      setPassMsg({ type: "success", text: res.message })
      setOldPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPassMsg({ type: "error", text: res.message })
    }
  }

  const handleCheckForUpdates = () => {
    setIsCheckingUpdate(true)
    setUpdateMsg(null)

    setTimeout(() => {
      setIsCheckingUpdate(false)
      setUpdateMsg(`Your system is up to date! (${CURRENT_SYSTEM_VERSION.version} - ${CURRENT_SYSTEM_VERSION.buildNumber})`)
    }, 1200)
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-blue-200/80 bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-extrabold text-blue-200">
              <Sliders className="w-3.5 h-3.5" />
              <span>SYSTEM CONTROL PANEL</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">System Settings & Management</h1>
            <p className="text-xs md:text-sm text-blue-200/90 font-[vazirmatn]" dir="rtl">
              تنظیمات سیستم، مدیریت کاربران، امنیت و بروزرسانی نرم‌افزار
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-300">
              {currentUser?.name?.charAt(0) || "A"}
            </div>
            <div>
              <div className="text-xs font-bold text-white">{currentUser?.name || "Administrator"}</div>
              <div className="text-[10px] text-amber-300 font-extrabold uppercase">
                {currentUser?.role || "superadmin"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/80 border border-slate-200 shadow-md backdrop-blur-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management ({users.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "password"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Change Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company & Regional Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("update")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "update"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>System Version & Updates</span>
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === "users" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add New User Panel */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Add New System User</h3>
                <p className="text-xs text-slate-500 font-[vazirmatn]" dir="rtl">
                  ایجاد کاربر جدید با سطوح دسترسی مختلف
                </p>
              </div>
            </div>

            {userMsg && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  userMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {userMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{userMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">Username / شناسه کاربر</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">Full Name / نام کامل</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">System Role / نقش کاربر</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-blue-500"
                >
                  <option value="superadmin">👑 Superadmin (Full System Access)</option>
                  <option value="admin">🛡️ Admin (BOL & Accounting Access)</option>
                  <option value="accountant">💼 Accountant (Ledgers & Invoices Only)</option>
                  <option value="viewer">👁️ Viewer (Read-only Document Access)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@skybalam.com"
                  className="w-full h-10 px-3 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create System Account</span>
              </button>
            </form>
          </div>

          {/* Active Users Table Panel */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">System Users & Roles</h3>
                  <p className="text-xs text-slate-500">Manage user access levels across 4 roles</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-700">
                {users.length} Users
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider">
                    <th className="p-3">User</th>
                    <th className="p-3">Role Level</th>
                    <th className="p-3">Created</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((u) => {
                    const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-700 shrink-0">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${badge.bg} ${badge.text}`}>
                              <span>{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>
                            <select
                              value={u.role}
                              onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                              className="h-7 px-1 text-[11px] font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
                              title="Change User Role"
                            >
                              <option value="superadmin">Superadmin</option>
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{u.createdAt || "2026-01-01"}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            disabled={users.length <= 1 || u.username === "admin"}
                            className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Change Password */}
      {activeTab === "password" && (
        <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-lg space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Change Account Password</h3>
              <p className="text-xs text-slate-500 font-[vazirmatn]" dir="rtl">
                تغییر رمز عبور حساب کاربری فعلی
              </p>
            </div>
          </div>

          {passMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                passMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {passMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1.5">Current Password / رمز عبور فعلی</label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1.5">New Password / رمز عبور جدید</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-extrabold text-slate-800 block mb-1.5">Confirm New Password / تایید رمز عبور جدید</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full h-11 px-3 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 mt-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: Company & Regional Info */}
      {activeTab === "general" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-lg space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="p-2.5 rounded-2xl bg-teal-100 text-teal-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Company & Regional Preferences</h3>
              <p className="text-xs text-slate-500">Official contact information and PDF document settings</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Regional Contact Info
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Afghanistan Head Office:</span>
                  <span className="text-slate-900 font-bold">+93 700 939 365 | +93 711 435 529</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Iran Representative Office:</span>
                  <span className="text-slate-900 font-bold">+98 9172325086</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Official Support Email:</span>
                  <span className="text-blue-700 font-bold">info@skyariana.com</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" /> System Defaults
              </h4>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block">Default Document Currency:</span>
                  <span className="text-slate-900 font-bold">$ USD (United States Dollar)</span>
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Dual Calendar Engine:</span>
                  <span className="text-slate-900 font-bold">Gregorian + Persian Solar (هجری شمسی)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50">
              <h4 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-emerald-700" /> Database Backup & Safety
              </h4>
              <p className="text-xs text-slate-600 font-medium">Export a complete snapshot of all BOLs, Ledgers, and Companies to JSON, or restore from a previous backup file.</p>
              
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const backupObj = {
                      exportedAt: new Date().toISOString(),
                      savedDocuments: JSON.parse(window.localStorage.getItem("sky-bol-browser-documents") || "[]"),
                      customCompanies: JSON.parse(window.localStorage.getItem("sky-bol-company-custom-companies") || "[]"),
                      accountLedgers: JSON.parse(window.localStorage.getItem("sky-bol-company-ledgers") || "{}"),
                    }
                    const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `SkyBalam_Backup_${new Date().toISOString().split("T")[0]}.json`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup (.json)</span>
                </button>

                <label className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-extrabold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer">
                  <Save className="w-4 h-4 text-blue-600" />
                  <span>Restore Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        try {
                          const data = JSON.parse(event.target?.result as string)
                          if (data.savedDocuments) {
                            window.localStorage.setItem("sky-bol-browser-documents", JSON.stringify(data.savedDocuments))
                            window.localStorage.setItem("skybol:saved-documents", JSON.stringify(data.savedDocuments))
                          }
                          if (data.customCompanies) {
                            window.localStorage.setItem("sky-bol-company-custom-companies", JSON.stringify(data.customCompanies))
                            window.localStorage.setItem("skybol:account-custom-companies", JSON.stringify(data.customCompanies))
                          }
                          if (data.accountLedgers) {
                            window.localStorage.setItem("sky-bol-company-ledgers", JSON.stringify(data.accountLedgers))
                            window.localStorage.setItem("skybol:account-ledgers", JSON.stringify(data.accountLedgers))
                          }
                          window.dispatchEvent(new CustomEvent("skybol:account-ledger-updated", { detail: {} }))
                          alert("Database Backup successfully restored!")
                        } catch (err) {
                          alert("Invalid backup file format.")
                        }
                      }
                      reader.readAsText(file)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: System Version & Updates (from system-version.ts) */}
      {activeTab === "update" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-lg space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">System Version & Software Updates</h3>
                <p className="text-xs text-slate-500">Loaded directly from system configuration file (`system-version.ts`)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckForUpdates}
              disabled={isCheckingUpdate}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-colors flex items-center gap-2 cursor-pointer self-start md:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingUpdate ? "animate-spin" : ""}`} />
              <span>{isCheckingUpdate ? "Checking Update File..." : "Check for Updates"}</span>
            </button>
          </div>

          {updateMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{updateMsg}</span>
            </div>
          )}

          {/* Current Version Box */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Installed Version</span>
              <div className="text-2xl font-black text-blue-900 font-mono">{CURRENT_SYSTEM_VERSION.version}</div>
              <span className="text-[11px] font-bold text-blue-700">{CURRENT_SYSTEM_VERSION.edition}</span>
            </div>

            <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Build Identifier</span>
              <div className="text-sm font-black text-purple-900 font-mono">{CURRENT_SYSTEM_VERSION.buildNumber}</div>
              <span className="text-[11px] font-bold text-purple-700">Released: {CURRENT_SYSTEM_VERSION.releaseDate}</span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Update Channel</span>
              <div className="text-sm font-black text-emerald-900 capitalize flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{CURRENT_SYSTEM_VERSION.updateChannel} Channel</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700">{CURRENT_SYSTEM_VERSION.companyName}</span>
            </div>
          </div>

          {/* System Release Changelog */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-700" /> System Release Log (`changelog`)
            </h4>

            <div className="space-y-3">
              {CURRENT_SYSTEM_VERSION.changelog.map((log) => (
                <div key={log.version} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 font-mono">
                      {log.version} - {log.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">{log.date}</span>
                  </div>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 font-medium">
                    {log.changes.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
