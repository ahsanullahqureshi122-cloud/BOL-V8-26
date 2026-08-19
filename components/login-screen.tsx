"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/app-context"
import { Lock, Mail, ArrowRight, ShieldCheck, HelpCircle, Phone, Globe } from "lucide-react"

const bgImages = [
  '/images/mountain_logistics_bg.jpg',
  '/images/sky_freight_cargo_plane.jpg',
  '/images/maritime_port_cargo_ship.jpg',
  '/images/afghan_cargo_fleet_pass.jpg'
]

export function LoginScreen() {
  const { login } = useApp()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [activePortal, setActivePortal] = useState<"admin" | "shipper">("admin")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % bgImages.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    setTimeout(() => {
      const success = login(
        username.trim() || (activePortal === "admin" ? "admin" : "shipper"),
        password.trim() || "skybalam2026",
        rememberMe
      )
      if (!success) {
        setError("Invalid credentials. Please try again.")
        setIsLoading(false)
      }
    }, 600)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 overflow-hidden relative font-sans text-slate-800">
      
      {/* Immersive Faded Background */}
      <div className="absolute inset-0 z-0">
        {bgImages.map((src, index) => (
          <div 
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[3000ms] ease-in-out ${
              index === currentBg ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}
        {/* Soft, premium frosted glass overlay */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-xs z-10" />
      </div>

      {/* Main Login Card - Glassmorphism */}
      <div className="relative z-20 w-full max-w-[420px] bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_80px_-15px_rgba(37,99,235,0.2)] border border-white/80 p-10 flex flex-col items-center mx-4">
        
        {/* Brand Logo & Header */}
        <div className="w-full flex flex-col items-center mb-8">
          <div className="bg-white/90 p-3 rounded-2xl shadow-sm border border-white mb-4">
            <img src="/logo.png" alt="SKY ARIANA" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#0a2540] uppercase">
            SKY ARIANA
          </h1>
          <p className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-1">
            Logistics Enterprise
          </p>
          <div className="mt-4 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-200/60 text-[10px] uppercase tracking-widest text-amber-800 font-extrabold shadow-xs">
            Secure Access Portal
          </div>
        </div>

        {/* Portal Switcher - Segmented Control */}
        <div className="w-full grid grid-cols-2 gap-1 mb-8 p-1.5 bg-slate-200/50 backdrop-blur-md rounded-xl border border-white/50 shadow-inner">
          <button
            type="button"
            onClick={() => { setActivePortal("admin"); setError(null); }}
            className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activePortal === "admin" 
              ? "bg-white text-blue-900 shadow-md shadow-slate-200/50" 
              : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Admin Portal
          </button>
          <button
            type="button"
            onClick={() => { setActivePortal("shipper"); setError(null); }}
            className={`py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${
              activePortal === "shipper" 
              ? "bg-white text-blue-900 shadow-md shadow-slate-200/50" 
              : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Shipper Portal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          
          {error && (
            <div className="p-3 text-xs font-bold text-red-700 bg-red-50/90 backdrop-blur-md border border-red-200/80 rounded-xl text-center shadow-sm">
              {error}
            </div>
          )}

          {/* Email / Username */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative group">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={activePortal === "admin" ? "admin@skyariana.com" : "shipper@skyariana.com"}
                disabled={isLoading}
                className="w-full h-12 pl-4 pr-10 text-sm bg-white/70 backdrop-blur-md border border-white shadow-inner rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-bold text-slate-900 placeholder:text-slate-400"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative group">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full h-12 pl-4 pr-10 text-sm bg-white/70 backdrop-blur-md border border-white shadow-inner rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all font-black text-slate-900 placeholder:text-slate-400 tracking-widest"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            </div>
          </div>

          {/* Forgot Password & Remember Me */}
          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer peer appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors bg-white/80"
                />
                <ShieldCheck className="absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="group-hover:text-slate-800 transition-colors">Remember Me</span>
            </label>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full h-12 mt-4 bg-gradient-to-r from-[#0a2540] to-[#1d4ed8] hover:from-[#001428] hover:to-[#1e40af] text-white font-black uppercase tracking-wider text-sm rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 overflow-hidden"
          >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
            ) : (
              <span className="relative z-10 flex items-center gap-2">
                Log In Securely
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] font-bold text-slate-500">
          <button onClick={() => setShowHelpModal(true)} className="hover:text-blue-700 transition-colors">Activate Account</button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button onClick={() => setShowHelpModal(true)} className="hover:text-blue-700 transition-colors">Get Support</button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button onClick={() => setShowHelpModal(true)} className="hover:text-blue-700 transition-colors">Contact Us</button>
        </div>

      </div>

      {/* Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl relative border border-slate-100 text-center">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"
            >
              ✕
            </button>
            <ShieldCheck className="w-10 h-10 text-slate-800 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">System Support</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              For account recovery or technical support, please contact the IT administration team.
            </p>
            <div className="space-y-3 text-left">
              <a href="tel:+989172325086" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-3 transition-colors group">
                <Phone className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">+98 9172325086</span>
              </a>
              <a href="mailto:info@skyariana.com" className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl flex items-center gap-3 transition-colors group">
                <Globe className="w-4 h-4 text-slate-600 group-hover:text-blue-600 transition-colors" />
                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">info@skyariana.com</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
