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
      {/* Header Banner - Premium Glassmorphism */}
      <div className="rounded-[32px] border border-blue-200/60 bg-gradient-to-r from-blue-900 via-[#1e3a8a] to-slate-900 p-6 md:p-8 text-white shadow-[0_20px_80px_-15px_rgba(30,58,138,0.4)] relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-black uppercase tracking-widest text-blue-100 shadow-inner">
              <Sliders className="w-3.5 h-3.5" />
              <span>SYSTEM CONTROL PANEL</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">System Settings</h1>
            <p className="text-xs md:text-sm text-blue-200/90 font-[vazirmatn] font-bold" dir="rtl">
              تنظیمات سیستم، مدیریت کاربران، امنیت و بروزرسانی نرم‌افزار
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl p-3.5 rounded-2xl border border-white/20 self-start md:self-auto shadow-inner">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 border border-amber-300 shadow-lg flex items-center justify-center font-black text-xl text-amber-950">
              {currentUser?.name?.charAt(0) || "A"}
            </div>
            <div>
              <div className="text-sm font-black text-white">{currentUser?.name || "Administrator"}</div>
              <div className="text-[10px] text-amber-300 font-black tracking-widest uppercase">
                {currentUser?.role || "superadmin"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar - Frosted Glass */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/60 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-5 py-3 rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
          <span className="ml-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-800">{users.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("password")}
          className={`flex items-center gap-2 px-5 py-3 rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "password"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-5 py-3 rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "general"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Info</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("update")}
          className={`flex items-center gap-2 px-5 py-3 rounded-[14px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "update"
              ? "bg-gradient-to-b from-white to-slate-50 text-blue-700 shadow-md border border-slate-100"
              : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Updates & Build</span>
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === "users" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add New User Panel */}
          <div className="lg:col-span-1 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/50">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30">
                <UserPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Add System User</h3>
                <p className="text-[11px] text-slate-500 font-[vazirmatn] font-bold" dir="rtl">
                  ایجاد کاربر جدید با سطوح دسترسی
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

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5 ml-1">Username / شناسه کاربر</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jsmith"
                  className="w-full h-12 px-4 text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5 ml-1">Full Name / نام کامل</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full h-12 px-4 text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5 ml-1">System Role / نقش کاربر</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full h-12 px-4 text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="superadmin">👑 Superadmin (Full System Access)</option>
                  <option value="admin">🛡️ Admin (BOL & Accounting Access)</option>
                  <option value="accountant">💼 Accountant (Ledgers & Invoices Only)</option>
                  <option value="viewer">👁️ Viewer (Read-only Document Access)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 block mb-1.5 ml-1">Email (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@skybalam.com"
                  className="w-full h-12 px-4 text-sm font-bold text-slate-900 bg-white/60 backdrop-blur-md border border-white shadow-inner rounded-xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                className="group relative w-full h-12 mt-4 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-black uppercase tracking-wider text-[11px] rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  Create System Account
                </span>
              </button>
            </form>
          </div>

          {/* Active Users Table Panel */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/50 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/30">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">System Users & Roles</h3>
                  <p className="text-xs font-bold text-slate-500">Manage user access levels across 4 roles</p>
                </div>
              </div>
              <span className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black text-slate-700 shadow-sm self-start md:self-auto">
                {users.length} Users Enrolled
              </span>
            </div>

            <div className="overflow-x-auto rounded-[24px] border border-white bg-white/40 backdrop-blur-md shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/60 text-slate-500 font-black uppercase tracking-widest text-[10px]">
                    <th className="p-4 pl-6">User</th>
                    <th className="p-4">Role Level</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/50 font-medium">
                  {users.map((u) => {
                    const badge = ROLE_BADGES[u.role] || ROLE_BADGES.viewer
                    return (
                      <tr key={u.id} className="hover:bg-white/60 transition-colors group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-white border border-white shadow-sm flex items-center justify-center font-black text-slate-700 shrink-0 text-sm group-hover:scale-105 transition-transform">
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-black text-slate-900 text-sm tracking-tight">{u.name}</div>
                              <div className="text-[11px] text-slate-500 font-bold">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm text-[10px] uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                              <span className="text-sm">{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>
                            <select
                              value={u.role}
                              onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                              className="h-8 px-2 text-[11px] font-black uppercase tracking-wider bg-white/50 backdrop-blur-sm border border-white rounded-xl text-slate-700 cursor-pointer hover:bg-white/80 transition-colors focus:ring-2 focus:ring-blue-100 outline-none shadow-sm appearance-none"
                              title="Change User Role"
                            >
                              <option value="superadmin">Superadmin</option>
                              <option value="admin">Admin</option>
                              <option value="accountant">Accountant</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </td>
                        <td className="p-4 text-slate-500 font-bold text-[11px] uppercase tracking-widest">{u.createdAt || "2026-01-01"}</td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            disabled={users.length <= 1 || u.username === "admin"}
                            className="p-2.5 rounded-xl border border-red-200/50 bg-red-50/50 text-red-600 hover:bg-red-100 hover:border-red-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all shadow-sm group-hover:shadow-md"
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
        <div className="max-w-xl mx-auto bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 md:p-10 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/50">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-lg shadow-amber-500/30">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">Change Account Password</h3>
              <p className="text-xs font-bold text-slate-500 font-[vazirmatn]" dir="rtl">
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
        <div className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/50">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-900">Company & Regional Preferences</h3>
              <p className="text-xs font-bold text-slate-500">Official contact information and database backup settings</p>
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
        <div className="bg-white/70 backdrop-blur-2xl rounded-[32px] border border-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/50">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-900">System Version & Software Updates</h3>
                <p className="text-xs font-bold text-slate-500">Loaded directly from system configuration file (`system-version.ts`)</p>
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
