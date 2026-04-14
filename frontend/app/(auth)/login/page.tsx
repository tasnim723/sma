"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"
import Image from "next/image"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => { setMounted(true) }, [])

  const particles = useMemo(() => {
    return {
      blue: [...Array(20)].map(() => ({
        width: Math.random() * 8 + 4 + "px",
        height: Math.random() * 8 + 4 + "px",
        left: Math.random() * 100 + "%",
        top: Math.random() * 100 + "%",
        duration: Math.random() * 6 + 6,
        xOffset: Math.random() * 30 - 15,
      })),
      red: [...Array(12)].map(() => ({
        width: Math.random() * 6 + 3 + "px",
        height: Math.random() * 6 + 3 + "px",
        left: Math.random() * 100 + "%",
        top: Math.random() * 100 + "%",
        duration: Math.random() * 7 + 5,
        xOffset: Math.random() * 30 - 15,
      })),
      chars: ['<', '/>', '{', '}', '0', '1', '()', '=>', ';'].map((char, i) => ({
        char,
        left: (i * 10 + Math.random() * 10) + "%",
        top: Math.random() * 100 + "%",
        duration: Math.random() * 15 + 10,
      }))
    }
  }, [])

  const renderParticles = () => {
    if (!mounted) return null;
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {particles.blue.map((p, i) => (
          <motion.div key={`blue-${i}`} className="absolute bg-[#00BCD4] shadow-[0_0_10px_#00BCD4]"
            style={{ width: p.width, height: p.height, left: p.left, top: p.top, borderRadius: "1px", opacity: 0.7 }}
            animate={{ y: [0, -120, 0], x: [0, p.xOffset, 0], opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
         {particles.red.map((p, i) => (
          <motion.div key={`red-${i}`} className="absolute bg-[#FF0000] shadow-[0_0_10px_#FF0000]"
            style={{ width: p.width, height: p.height, left: p.left, top: p.top, borderRadius: "1px", opacity: 0.7 }}
            animate={{ y: [0, 90, 0], x: [0, p.xOffset, 0], opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {particles.chars.map((p, i) => (
           <motion.div key={`char-${i}`} className="absolute text-slate-400/40 font-mono text-lg font-bold"
           style={{ left: p.left, top: p.top }}
           animate={{ y: [0, -200, 0], rotate: [0, 180, 0], opacity: [0.1, 0.4, 0.1] }}
           transition={{ duration: p.duration, repeat: Infinity, ease: "linear" }}
         >{p.char}</motion.div>
        ))}
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    try {
      const formData = new FormData()
      formData.append("username", email)
      formData.append("password", password)
      const res = await axios.post("http://127.0.0.1:8000/api/auth/login", formData)
      setToken(res.data.access_token)
      setUser({ role: res.data.role, id: res.data.user_id, full_name: res.data.full_name || "User", email: res.data.email || email } as any)
      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Identifiants invalides. Veuillez réessayer.")
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGoogleLoading(true)
    setError("")
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/google", {
        token: credentialResponse.credential,
      })
      setToken(res.data.access_token)
      setUser({ role: res.data.role, id: res.data.user_id, full_name: res.data.full_name || "User", email: res.data.email } as any)
      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la connexion avec Google.")
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError("La connexion Google a échoué. Veuillez réessayer.")
    setGoogleLoading(false)
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f1f5f9] font-sans relative overflow-hidden p-4">
        
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <Image src="/images/custom_background.png" alt="bg" fill priority className="object-cover opacity-90" />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
        </div>

        {renderParticles()}

        {/* Login Card Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Corner accents */}
          <div className="absolute -inset-px pointer-events-none z-20">
            <motion.div
              className="absolute top-[-2px] left-[-2px] w-[115px] h-[115px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#e63946]/90"
              animate={{ filter: ["drop-shadow(0 0 3px rgba(230,57,70,0.5))", "drop-shadow(0 0 8px rgba(230,57,70,1))", "drop-shadow(0 0 3px rgba(230,57,70,0.5))"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[-2px] right-[-2px] w-[115px] h-[115px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/90"
              animate={{ filter: ["drop-shadow(0 0 3px rgba(0,188,212,0.5))", "drop-shadow(0 0 8px rgba(0,188,212,1))", "drop-shadow(0 0 3px rgba(0,188,212,0.5))"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </div>

          <div 
            className="w-full bg-white/10 backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-5 pb-4 relative overflow-hidden"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255,0,0,0.2), 15px 0 45px -15px rgba(0,188,212,0.2), 0 10px 40px -10px rgba(0,0,0,0.1)' }}
          >
            {/* Logo + Header */}
            <div className="flex flex-col items-center justify-center text-center mb-3">
              {/* 2 Square Logo */}
              <div className="relative w-7 h-7 mb-3">
                <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#ff0000]" />
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00BCD4]" />
              </div>

              <h1 className="text-[28px] font-[900] text-[#0f172a] tracking-[0.14em] mr-[-0.14em] leading-none mb-1 font-sans">
                NETINFO
              </h1>
              <p className="text-[9px] font-[800] text-gray-500 tracking-[0.22em] mr-[-0.22em] uppercase">
                ÉCOLE D&apos;ART ET DE TECHNOLOGIE
              </p>
            </div>

            {/* Title Section */}
            <div className="text-center mb-3">
              <h2 className="text-[18px] font-[800] text-[#1e293b] mb-1">Connexion</h2>
              <p className="text-[12px] font-[600] text-gray-500">Accédez à votre espace SMA</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-center gap-1.5 py-1 px-3 mb-2 bg-red-50/80 border border-red-100 rounded-full"
                  >
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-[11px] font-[700] text-red-600">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-[800] text-[#334155] px-1">Email</label>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] z-10" strokeWidth={2.5} />
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-[800] text-[#334155] px-1">Mot de passe</label>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] z-10" strokeWidth={2.5} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-[42px] pr-12 py-[10px] rounded-[14px] border-[1.5px] border-white/80 bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 text-[#00BCD4] hover:text-[#0096a8] transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] text-white py-[11px] rounded-[14px] font-[800] text-[15px] transition-all duration-200 shadow-[0_4px_15px_rgba(0,188,212,0.3)]"
                >
                  Se connecter
                </button>
              </div>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-gray-200/60" />
              <span className="text-[11px] font-[700] text-gray-400">OU</span>
              <div className="flex-1 h-[1px] bg-gray-200/60" />
            </div>

            {/* Google Login */}
            <div className="w-full">
              {mounted && (
                <div className="flex flex-col items-center">
                  {googleLoading ? (
                    <div className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[14px] border border-gray-200 bg-white/60 text-[13px] font-[700] text-gray-400">
                       <svg className="animate-spin h-4 w-4 text-[#00BCD4]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Connexion...
                    </div>
                  ) : (
                    <div className="w-full rounded-[14px] overflow-hidden border-[1.5px] border-gray-200/80 bg-white/60 hover:bg-white transition-all">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        width="100%"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Register Link */}
            <div className="mt-4 text-center">
              <p className="text-[11.5px] font-[600] text-gray-400">
                Pas encore de compte ?{" "}
                <a href="/register" className="font-[800] text-[#00BCD4] hover:text-[#0096a8] transition-colors hover:underline underline-offset-2">
                  Créer un compte &rarr;
                </a>
              </p>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200/60 text-center">
              <p className="text-[9px] font-[700] text-gray-400 uppercase tracking-widest">NETINFO SMA © 2026 — Netinfo Nabeul</p>
            </div>
          </div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  )
}
