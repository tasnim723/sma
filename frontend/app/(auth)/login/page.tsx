"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  type: i % 2 === 0 ? "square" : "code",
  char: ["{}", "01", "</>", "AI", "//", "[]"][i % 6],
  x: 5 + (i * 6.7) % 90,
  y: 5 + (i * 11.3) % 90,
  size: 8 + (i * 3) % 14,
  duration: 8 + (i * 1.7) % 12,
  delay: (i * 0.7) % 8,
  opacity: 0.04 + (i * 0.018) % 0.1,
}))

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
      <div className="min-h-screen w-full flex items-center justify-center bg-[#eef2f7] p-4 font-sans relative overflow-hidden">

        {/* Animated background blobs */}
        {mounted && (
          <>
            <motion.div
              animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[-80px] left-[-80px] w-[380px] h-[380px] bg-[#00BCD4]/15 rounded-full blur-[90px] pointer-events-none"
            />
            <motion.div
              animate={{ y: [0, 25, 0], x: [0, -10, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute bottom-[-60px] right-[-60px] w-[420px] h-[420px] bg-[#e11d48]/8 rounded-full blur-[110px] pointer-events-none"
            />

            {/* Decorative particles */}
            {PARTICLES.map((p) => (
              <motion.div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  opacity: p.opacity,
                  fontSize: p.type === "code" ? `${p.size}px` : undefined,
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: 0,
                }}
                animate={{ y: [0, -18, 0], rotate: p.type === "square" ? [0, 90, 0] : [0, 0, 0] }}
                transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
              >
                {p.type === "square" ? (
                  <div style={{ width: p.size, height: p.size, background: "#00BCD4", borderRadius: 2 }} />
                ) : (
                  <span style={{ color: "#334155", fontFamily: "monospace", fontWeight: 700 }}>{p.char}</span>
                )}
              </motion.div>
            ))}
          </>
        )}

        {/* Decorative corner accents */}
        <div className="absolute top-6 left-6 w-[115px] h-[115px] border-l-[3px] border-t-[3px] border-[#e11d48]/50 rounded-tl-[20px] pointer-events-none z-0" />
        <div className="absolute bottom-6 right-6 w-[115px] h-[115px] border-r-[3px] border-b-[3px] border-[#00BCD4]/50 rounded-br-[20px] pointer-events-none z-0" />

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[400px]"
        >
          <div className="bg-white/70 backdrop-blur-2xl rounded-[28px] border border-white/80 shadow-[0_20px_60px_rgba(0,0,0,0.1)] px-8 pt-5 pb-4">

            {/* Logo + Header */}
            <div className="flex flex-col items-center mb-3 w-full relative">
              <div className="flex flex-col items-center justify-center text-center mt-0">
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
            </div>

            {/* Title */}
            <div className="text-center mb-2.5">
              <h2 className="text-[18px] font-[800] text-[#1e293b] mb-1">Connexion</h2>
              <p className="text-[12px] font-[600] text-gray-500">Accédez à votre espace SMA</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[13px] rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-red-600 font-[600] text-center backdrop-blur-md shadow-sm"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[12.5px] font-[800] text-[#334155]">Email</label>
                </div>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] group-focus-within:text-[#0096a8] transition-colors" strokeWidth={2.5} />
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[12.5px] font-[800] text-[#334155]">Mot de passe</label>
                </div>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] group-focus-within:text-[#0096a8] transition-colors" strokeWidth={2.5} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-[42px] pr-12 py-[10px] rounded-[14px] border-[1.5px] border-white bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] tracking-[0.1em]"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 text-[#00BCD4] hover:text-[#0096a8] focus:outline-none transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-[16px] w-[16px]" strokeWidth={2.5} /> : <Eye className="h-[16px] w-[16px]" strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 relative w-full flex justify-center">
                <div className="absolute inset-x-8 top-6 bottom-0 bg-[#00BCD4] opacity-50 blur-xl rounded-full" />
                <button
                  type="submit"
                  className="w-full max-w-[280px] relative bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] active:scale-[0.98] text-white py-[12px] rounded-[14px] font-[800] text-[15px] transition-all duration-200 shadow-[0_4px_15px_rgba(0,188,212,0.3)] tracking-wide"
                >
                  Se connecter
                </button>
              </div>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-gray-200/80" />
              <span className="text-[11px] font-[700] text-gray-400 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-[1px] bg-gray-200/80" />
            </div>

            {/* Google Sign-In Button */}
            <div className="w-full mb-1">
              {mounted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="flex flex-col items-center"
                >
                  {googleLoading ? (
                    <div className="w-full flex items-center justify-center gap-3 py-[13px] rounded-[18px] border-[1.5px] border-gray-200 bg-white/80 text-[14px] font-[700] text-gray-500">
                      <svg className="animate-spin h-4 w-4 text-[#00BCD4]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Connexion en cours...
                    </div>
                  ) : (
                    <div
                      className="w-full rounded-[14px] overflow-hidden border-[1.5px] border-gray-200 hover:border-[#00BCD4]/50 transition-all duration-200 bg-white/80 hover:bg-white shadow-sm hover:shadow-md"
                      style={{ minHeight: "40px" }}
                    >
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        useOneTap={false}
                        theme="outline"
                        size="large"
                        width="100%"
                        text="continue_with"
                        shape="rectangular"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Register Link */}
            <div className="mt-4 text-center">
              <p className="text-[11.5px] font-[600] text-gray-500 whitespace-nowrap">
                Pas encore de compte ?{" "}
                <a
                  href="/register"
                  className="font-[800] text-[#00BCD4] hover:text-[#0096a8] transition-colors underline-offset-2 hover:underline"
                >
                  Rejoindre l&apos;espace SMA &rarr;
                </a>
              </p>
            </div>

            {/* Footer */}
            <div className="mt-3 text-center">
              <p className="text-[9.5px] font-[600] text-gray-400/70 tracking-widest uppercase">
                NETINFO SMA © 2026 — NETINFO NABEUL
              </p>
            </div>

          </div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  )
}
