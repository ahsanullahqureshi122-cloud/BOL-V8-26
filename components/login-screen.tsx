"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Phone, 
  Globe, 
  Eye, 
  EyeOff, 
  Shield, 
  Truck, 
  Sparkles,
  AlertCircle,
  HelpCircle,
  Check
} from "lucide-react"

const bgImages = [
  {
    url: '/images/sky_freight_cargo_plane.jpg',
    title: 'Air Freight Cargo Transit',
  },
  {
    url: '/images/maritime_port_cargo_ship.jpg',
    title: 'Maritime Sea Port Logistics',
  },
  {
    url: '/images/mountain_logistics_bg.jpg',
    title: 'Mountain Highway Trade Corridor',
  },
  {
    url: '/images/afghan_cargo_fleet_pass.jpg',
    title: 'Overland Fleet Transit',
  }
]

export function LoginScreen() {
  const { login } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [activePortal, setActivePortal] = useState<"admin" | "shipper">("admin")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    setTimeout(() => {
      const targetUser = username.trim() || (activePortal === "admin" ? "admin" : "shipper")
      const targetPass = password.trim() || "skybalam2026"
      
      const success = login(targetUser, targetPass, rememberMe)
      if (!success) {
        setError("Invalid username or password. Default admin: admin / skybalam2026")
        setIsLoading(false)
      }
    }, 500)
  }

  const handleQuickFill = (portal: "admin" | "shipper") => {
    setActivePortal(portal)
    setUsername(portal === "admin" ? "admin" : "shipper")
    setPassword("skybalam2026")
    setError(null)
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] min-h-screen bg-slate-950 flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto overflow-x-hidden font-sans text-slate-800 z-50 select-none">
      
      {/* Dynamic Background Image Layers (Zero gap / Zero white line) */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden pointer-events-none">
        {bgImages.map((bg, index) => (
          <div 
            key={bg.url}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-out ${
              index === currentBg ? "opacity-100 scale-100" : "opacity-0 scale-105"
            }`}
            style={{ backgroundImage: `url("${bg.url}")` }}
          />
        ))}
        {/* Cinematic gradient & vignette overlays */}
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1.5px] z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-slate-950/60 z-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(2,6,23,0.6)_100%)] z-10" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-20 w-full max-w-5xl flex items-center justify-between py-2 text-white/90">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-white drop-shadow-sm">
              SKY ARIANA & BALAM BARAN
            </div>
            <div className="text-[10px] text-white/60 font-medium tracking-widest uppercase">
              International Cargo & Logistics
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 rounded-full text-white/90 hover:text-white transition-all shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span>Support</span>
          </button>
        </div>
      </header>

      {/* Main Login Card - Refined Glassmorphism */}
      <main className="relative z-20 w-full max-w-[430px] my-auto">
        <div className="bg-white/90 backdrop-blur-2xl rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] border border-white/90 p-7 sm:p-9 flex flex-col items-center">
          
          {/* Company Logo & Identity */}
          <div className="w-full flex flex-col items-center mb-6">
            <div className="relative mb-3 group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-amber-500 rounded-2xl blur-xs opacity-50 group-hover:opacity-75 transition duration-500" />
              <div className="relative bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
                <img 
                  src="/logo.png" 
                  alt="SKY ARIANA LOGISTICS" 
                  className="h-14 w-auto object-contain"
                />
              </div>
            </div>
            
            <h1 className="text-xl font-black tracking-tight text-[#0a2540] uppercase text-center">
              SKY ARIANA
            </h1>
            <p className="text-[10px] font-extrabold tracking-[0.25em] text-slate-500 uppercase mt-0.5">
              Logistics Enterprise System
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300/80 text-[10px] uppercase tracking-wider text-amber-900 font-extrabold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Secure Access Portal
            </div>
          </div>

          {/* Portal Switcher - Modern Segmented Tabs */}
          <div className="w-full grid grid-cols-2 gap-1.5 mb-6 p-1.5 bg-slate-200/60 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              type="button"
              onClick={() => { setActivePortal("admin"); setError(null); }}
              className={`py-2 px-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activePortal === "admin" 
                ? "bg-white text-blue-900 shadow-md shadow-slate-300/50" 
                : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => { setActivePortal("shipper"); setError(null); }}
              className={`py-2 px-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                activePortal === "shipper" 
                ? "bg-white text-blue-900 shadow-md shadow-slate-300/50" 
                : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Shipper Portal
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            
            {error && (
              <div className="p-3 text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email / Username */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-username"
                className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-1 flex items-center justify-between"
              >
                <span>{activePortal === "admin" ? "Admin Username / Email" : "Shipper Account / Email"}</span>
              </label>
              <div className="relative group">
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activePortal === "admin" ? "admin@skyariana.com or admin" : "shipper@skyariana.com"}
                  disabled={isLoading}
                  className="w-full h-11 pl-4 pr-11 text-sm bg-white/90 border border-slate-200 shadow-inner rounded-xl focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all font-bold text-slate-900 placeholder:text-slate-400"
                />
                <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label 
                htmlFor="login-password"
                className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-1 flex items-center justify-between"
              >
                <span>Password</span>
              </label>
              <div className="relative group">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full h-11 pl-4 pr-11 text-sm bg-white/90 border border-slate-200 shadow-inner rounded-xl focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500/20 transition-all font-black text-slate-900 placeholder:text-slate-400 tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer group select-none">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer peer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors bg-white shadow-2xs"
                  />
                  <Check className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity stroke-[3]" />
                </div>
                <span className="group-hover:text-slate-900 transition-colors">Remember Session</span>
              </label>

              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full h-12 mt-3 bg-gradient-to-r from-[#0a2540] via-[#1d4ed8] to-[#0a2540] bg-[length:200%_auto] hover:bg-right transition-[background-position] duration-500 text-white font-black uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-blue-900/25 flex items-center justify-center gap-2 overflow-hidden cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  Log In Securely
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Shortcut */}
          <div className="w-full mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold">Quick Auto-Fill:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill("admin")}
                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-md border border-blue-200 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("shipper")}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md border border-slate-300 transition-colors"
              >
                Shipper
              </button>
            </div>
          </div>

          {/* Footer Quick Links */}
          <div className="mt-5 flex items-center justify-center gap-3 text-[11px] font-bold text-slate-500">
            <button 
              type="button"
              onClick={() => setShowHelpModal(true)} 
              className="hover:text-blue-700 transition-colors"
            >
              Activate Account
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <button 
              type="button"
              onClick={() => setShowHelpModal(true)} 
              className="hover:text-blue-700 transition-colors"
            >
              24/7 Support
            </button>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <button 
              type="button"
              onClick={() => setShowHelpModal(true)} 
              className="hover:text-blue-700 transition-colors"
            >
              Contact IT
            </button>
          </div>

        </div>
      </main>

      {/* Bottom Status & Background Indicator Bar */}
      <footer className="relative z-20 w-full max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-3 py-2 text-[11px] text-white/75 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
          <span>System Online · Enterprise 256-bit Encrypted</span>
        </div>

        {/* Background carousel slide selector dots */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/50 uppercase tracking-wider hidden sm:inline">
            {bgImages[currentBg].title}
          </span>
          <div className="flex items-center gap-1.5 ml-2">
            {bgImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentBg(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentBg ? "w-6 bg-amber-400" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
                title={`Switch to ${bgImages[i].title}`}
              />
            ))}
          </div>
        </div>
      </footer>

      {/* Support & Account Recovery Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl relative border border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors font-bold"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-1">
              Enterprise System Support
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              For password reset, new user activation, or cargo operations dispatch, contact the IT administration team.
            </p>

            <div className="space-y-2.5 text-left mb-5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Default Credentials
                </div>
                <div className="text-xs font-mono font-bold text-slate-800 flex justify-between items-center">
                  <span>Admin: <strong className="text-blue-700 font-extrabold">admin</strong></span>
                  <span>Pass: <strong className="text-blue-700 font-extrabold">skybalam2026</strong></span>
                </div>
              </div>

              <a 
                href="tel:+93700939365" 
                className="p-3 bg-slate-50 hover:bg-blue-50/80 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center gap-3 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Afghanistan Office</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">+93 700 939 365</div>
                </div>
              </a>

              <a 
                href="tel:+989172325086" 
                className="p-3 bg-slate-50 hover:bg-blue-50/80 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center gap-3 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Iran Office</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">+98 9172325086</div>
                </div>
              </a>

              <a 
                href="mailto:info@skyariana.com" 
                className="p-3 bg-slate-50 hover:bg-blue-50/80 rounded-2xl border border-slate-100 hover:border-blue-200 flex items-center gap-3 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-slate-600 group-hover:text-blue-600">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Email Support</div>
                  <div className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 font-mono">info@skyariana.com</div>
                </div>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
