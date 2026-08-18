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
    <div className="min-h-screen w-full flex items-center justify-center bg-white overflow-hidden relative font-sans text-slate-800">
      
      {/* Immersive Faded Background */}
      <div className="absolute inset-0 z-0">
        {bgImages.map((src, index) => (
          <div 
            key={src}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[3000ms] ease-in-out ${
              index === currentBg ? "opacity-30" : "opacity-0"
            }`}
            style={{ backgroundImage: `url("${src}")` }}
          />
        ))}
        {/* White gradient overlay to make it minimal and clean */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white z-10" />
      </div>

      {/* Main Login Card */}
      <div className="relative z-20 w-full max-w-[420px] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 p-10 flex flex-col items-center">
        
        {/* Brand Logo & Header */}
        <div className="w-full flex flex-col items-center mb-8">
          <img src="/logo.png" alt="SKY ARIANA" className="h-16 w-auto object-contain mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
            SKY ARIANA
          </h1>
          <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mt-1">
            Logistics Enterprise
          </p>
          <div className="mt-4 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            Secure Access
          </div>
        </div>

        {/* Portal Switcher */}
        <div className="w-full grid grid-cols-2 gap-2 mb-8 p-1 bg-slate-50 rounded-xl border border-slate-100">
          <button
            type="button"
            onClick={() => { setActivePortal("admin"); setError(null); }}
            className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activePortal === "admin" 
              ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
              : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Admin Portal
          </button>
          <button
            type="button"
            onClick={() => { setActivePortal("shipper"); setError(null); }}
            className={`py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
              activePortal === "shipper" 
              ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
              : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Shipper Portal
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-5">
          
          {error && (
            <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Email / Username */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              Email Address
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@skyariana.com"
                disabled={isLoading}
                className="w-full h-12 pl-4 pr-10 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all font-medium text-slate-900 placeholder:text-slate-400"
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full h-12 pl-4 pr-10 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 tracking-widest"
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Forgot Password & Remember Me */}
          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
              />
              Remember Me
            </label>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Forgot Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-4 bg-[#0a2540] hover:bg-[#001428] text-white font-semibold text-sm rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500">
          <button onClick={() => setShowHelpModal(true)} className="hover:text-slate-900 transition-colors">Activate Account</button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button onClick={() => setShowHelpModal(true)} className="hover:text-slate-900 transition-colors">Get Support</button>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <button onClick={() => setShowHelpModal(true)} className="hover:text-slate-900 transition-colors">Contact Us</button>
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
              <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">+98 9172325086</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                <Globe className="w-4 h-4 text-slate-600" />
                <span className="text-sm font-semibold text-slate-800">info@skyariana.com</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
