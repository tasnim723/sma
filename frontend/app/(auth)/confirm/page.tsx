"use client"

import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, Loader2, ShieldCheck } from "lucide-react"
import { useThemeStore } from "@/lib/themeStore"

function ConfirmContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)
  const { theme } = useThemeStore()

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const hasAttempted = useRef(false)

  useEffect(() => {
    const token = searchParams.get("token")
    if (!token) {
      setStatus("error")
      setMessage("Lien de confirmation invalide ou manquant.")
      return
    }
    
    if (hasAttempted.current) return;
    hasAttempted.current = true;

    const confirm = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/confirm/${token}`)
        const data = res.data

        // Auto-login after confirmation
        setToken(data.access_token)
        setUser({
          id: data.user_id,
          full_name: data.full_name,
          email: data.email,
          role: data.role,
        })

        setStatus("success")
        setMessage("Votre compte est activé ! Redirection vers le tableau de bord...")

        setTimeout(() => router.push("/"), 2500)
      } catch (err: any) {
        setStatus("error")
        setMessage(err.response?.data?.detail || "Lien invalide ou expiré.")
      }
    }

    confirm()
  }, [searchParams, router, setToken, setUser])

  return (
    <div className={`min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden transition-colors duration-700 ${theme === 'dark' ? 'bg-[#020617]' : 'bg-[#f1f5f9]'}`}>
      {/* Background */}
      <div className="absolute inset-0 z-0 transition-all duration-700">
        {theme === 'light' ? (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#00BCD4]/10 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/8 rounded-full blur-[100px]" />
            </div>
            <div className="absolute inset-0 opacity-30 pointer-events-none"
                 style={{ backgroundImage: "linear-gradient(rgba(0,188,212,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,188,212,0.08) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          </>
        ) : (
          <div className="absolute inset-0 bg-[#020617] overflow-hidden">
            {/* Gamified Background Elements */}
            <div className="absolute inset-0 opacity-[0.2]" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1e40af 1px, transparent 0)', backgroundSize: '32px 32px' }} />
            
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            
            {/* Grid line */}
            <div className="absolute inset-0 opacity-[0.05]" 
                 style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-[440px] px-4"
      >
        {/* Corner neon accents */}
        <div className="absolute inset-x-4 inset-y-0 pointer-events-none z-20">
          <motion.div
            className="absolute top-[-1px] left-[-1px] w-[100px] h-[100px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#00BCD4]/80"
            animate={{ filter: ["drop-shadow(0 0 4px rgba(0,188,212,0.4))", "drop-shadow(0 0 10px rgba(0,188,212,0.9))", "drop-shadow(0 0 4px rgba(0,188,212,0.4))"] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-[-1px] right-[-1px] w-[100px] h-[100px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/80"
            animate={{ filter: ["drop-shadow(0 0 4px rgba(0,188,212,0.4))", "drop-shadow(0 0 10px rgba(0,188,212,0.9))", "drop-shadow(0 0 4px rgba(0,188,212,0.4))"] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
          />
        </div>

        <div
          className={`w-full backdrop-blur-3xl rounded-[32px] px-8 py-12 relative overflow-hidden transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#0f172a]/60 border border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(30,58,138,0.3)]' 
              : 'bg-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(255,255,255,0.5)]'
          }`}
        >
          {/* Logo */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="relative w-7 h-7 mb-3">
              <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#ff0000]" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00BCD4]" />
            </div>
            <h1 className="text-[26px] font-[900] text-[#0f172a] dark:text-blue-50 tracking-[0.14em] leading-none transition-colors">NETINFO</h1>
            <p className="text-[9px] font-[800] text-gray-400 dark:text-blue-800 tracking-[0.22em] uppercase mt-1 transition-colors">Activation du Compte</p>
          </div>

          <AnimatePresence mode="wait">

            {/* Loading */}
            {status === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-6 py-4"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-[#00BCD4]/10 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-[#00BCD4] animate-spin" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-[#00BCD4]/30"
                  />
                </div>
                <div className="text-center">
                  <p className="text-[17px] font-[900] text-[#1e293b] dark:text-blue-50 mb-1 transition-colors">Activation en cours...</p>
                  <p className="text-[12px] text-gray-400 dark:text-blue-800 font-[600] transition-colors">Veuillez patienter</p>
                </div>
              </motion.div>
            )}

            {/* Success */}
            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative"
                >
                  <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                  </div>
                  {/* Celebration rings */}
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0.8 }}
                      animate={{ scale: 2.5 + i * 0.5, opacity: 0 }}
                      transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-emerald-400"
                    />
                  ))}
                </motion.div>

                <div className="text-center space-y-2">
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[20px] font-[900] text-[#0f172a] dark:text-blue-50 transition-colors"
                  >
                    🎉 Compte Activé !
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-[13px] text-gray-500 dark:text-blue-400/60 font-[600] transition-colors"
                  >
                    {message}
                  </motion.p>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-[#00BCD4] to-emerald-400 rounded-full"
                  />
                </div>
              </motion.div>
            )}

            {/* Error */}
            {status === "error" && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-6 py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center"
                >
                  <XCircle className="w-14 h-14 text-red-500" />
                </motion.div>

                <div className="text-center space-y-2">
                  <p className="text-[18px] font-[900] text-[#0f172a] dark:text-blue-50 transition-colors">Lien invalide</p>
                  <p className="text-[13px] text-gray-500 dark:text-blue-400/60 font-[600] leading-relaxed transition-colors">{message}</p>
                </div>

                <button
                  onClick={() => router.push("/login")}
                  className="w-full h-[52px] rounded-[16px] bg-gradient-to-br from-[#00BCD4] to-[#0097a7] text-white font-[900] text-[14px] tracking-widest uppercase shadow-[0_8px_25px_rgba(0,188,212,0.3)] hover:shadow-[0_12px_35px_rgba(0,188,212,0.4)] transition-all"
                >
                  Retour à la connexion →
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]"><Loader2 className="w-12 h-12 text-[#00BCD4] animate-spin" /></div>}>
      <ConfirmContent />
    </Suspense>
  )
}
