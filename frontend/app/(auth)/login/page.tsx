"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { GoogleOAuthProvider, GoogleLogin, CredentialResponse } from "@react-oauth/google"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

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
      setError(err.response?.data?.detail || "Une erreur est survenue lors de la connexion")
    }
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return
    setGoogleLoading(true)
    setError("")
    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/google", {
        credential: credentialResponse.credential,
      })
      setToken(res.data.access_token)
      setUser({
        role: res.data.role,
        id: res.data.user_id,
        full_name: res.data.full_name || "User",
        email: res.data.email,
      } as any)
      if (res.data.is_new) {
        router.push("/complete-profile")
      } else {
        router.push("/")
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Connexion Google échouée. Réessayez.")
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError("La connexion Google a été annulée ou a échoué.")
  }

  // Pre-calculate random values so they don't change on re-render (e.g. when typing)
  const particles = useMemo(() => {
    return {
      blue: [...Array(25)].map(() => ({
        width: Math.random() * 8 + 4 + "px",
        height: Math.random() * 8 + 4 + "px",
        left: Math.random() * 100 + "%",
        top: Math.random() * 100 + "%",
        duration: Math.random() * 6 + 6,
        xOffset: Math.random() * 30 - 15,
      })),
      red: [...Array(15)].map(() => ({
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
          <motion.div
            key={`blue-${i}`}
            className="absolute bg-[#00BCD4] shadow-[0_0_10px_#00BCD4]"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
              borderRadius: "1px",
              opacity: 0.7,
            }}
            animate={{
              y: [0, -120, 0],
              x: [0, p.xOffset, 0],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
         {particles.red.map((p, i) => (
          <motion.div
            key={`red-${i}`}
            className="absolute bg-[#FF0000] shadow-[0_0_10px_#FF0000]"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              top: p.top,
              borderRadius: "1px",
              opacity: 0.7,
            }}
            animate={{
              y: [0, 90, 0],
              x: [0, p.xOffset, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        {particles.chars.map((p, i) => (
           <motion.div
           key={`char-${i}`}
           className="absolute text-slate-400/40 font-mono text-lg font-bold"
           style={{
             left: p.left,
             top: p.top,
           }}
           animate={{
             y: [0, -200, 0],
             rotate: [0, 180, 0],
             opacity: [0.1, 0.4, 0.1]
           }}
           transition={{
             duration: p.duration,
             repeat: Infinity,
             ease: "linear",
           }}
         >
            {p.char}
         </motion.div>
        ))}
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen w-full flex items-center justify-center relative bg-[#f1f5f9] font-sans overflow-hidden">
        {/* Custom Image Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/custom_background.png"
            alt="Custom Background"
            fill
            priority
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
        </div>

        {renderParticles()}

        {/* Main Login Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[400px] relative z-10 flex flex-col items-center px-4"
        >
          {/* Static Corner Accents with Subtle Breathing Effect */}
          <div className="absolute inset-x-4 inset-y-0 pointer-events-none z-20">
            <motion.div 
              className="absolute top-[-1px] left-[-1px] w-[115px] h-[115px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#e63946]/90" 
              animate={{ filter: [
                "drop-shadow(0 0 3px rgba(230,57,70,0.6)) drop-shadow(0 0 8px rgba(230,57,70,0.4))", 
                "drop-shadow(0 0 5px rgba(230,57,70,1)) drop-shadow(0 0 15px rgba(230,57,70,0.8)) drop-shadow(0 0 25px rgba(230,57,70,0.5))", 
                "drop-shadow(0 0 3px rgba(230,57,70,0.6)) drop-shadow(0 0 8px rgba(230,57,70,0.4))"
              ] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="absolute bottom-[-1px] right-[-1px] w-[115px] h-[115px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/90" 
              animate={{ filter: [
                "drop-shadow(0 0 3px rgba(0,188,212,0.6)) drop-shadow(0 0 8px rgba(0,188,212,0.4))", 
                "drop-shadow(0 0 5px rgba(0,188,212,1)) drop-shadow(0 0 15px rgba(0,188,212,0.8)) drop-shadow(0 0 25px rgba(0,188,212,0.5))", 
                "drop-shadow(0 0 3px rgba(0,188,212,0.6)) drop-shadow(0 0 8px rgba(0,188,212,0.4))"
              ] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
          </div>

          {/* Card Container */}
          <div 
            className="w-full bg-white/10 backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-6 pb-5 relative overflow-hidden"
            style={{
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255, 0, 0, 0.2), 15px 0 45px -15px rgba(0, 188, 212, 0.2), 0 10px 40px -10px rgba(0,0,0,0.1)'
            }}
          >
            {/* Header Logo Section */}
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

            {/* Title Section */}
            <div className="text-center mb-2">
              <h2 className="text-[18px] font-[800] text-[#1e293b] mb-1">Connexion</h2>
              <p className="text-[12px] font-[600] text-gray-500">Accédez à votre espace SMA</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
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
                {/* Outer glow for button */}
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
            <div className="mt-4 pt-3 border-t border-gray-200/60 text-center">
              <p className="text-[9px] font-[700] text-gray-400 uppercase tracking-widest">
                NETINFO SMA © 2026 — Netinfo Nabeul
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </GoogleOAuthProvider>
  )
}
