
"use client"

import { useState } from "react"
import axios from "axios"
import { ShieldCheck, Fingerprint, ScanFace, CheckCircle2, AlertCircle, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/lib/store"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"
import { API_BASE_URL } from "@/lib/api"
import { prepareRegistrationOptions, encodeCredential } from "@/lib/webauthn"

export default function WebAuthnRegister() {
  const { user } = useAuthStore()
  const { lang, t } = useLang()
  const { theme } = useThemeStore()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState("")

  const handleRegister = async () => {
    if (!user?.id) return

    setLoading(true)
    setStatus('idle')
    setErrorMessage("")

    try {
      // 1. Get registration options
      const optionsRes = await axios.post(`${API_BASE_URL}/api/webauthn/register/options`, {
        user_id: user.id
      })

      const options = prepareRegistrationOptions(optionsRes.data)

      // 2. Browser biometric registration
      const credential = await navigator.credentials.create({
        publicKey: options
      })

      if (!credential) {
        throw new Error("Registration failed")
      }

      // 3. Verify with server
      await axios.post(`${API_BASE_URL}/api/webauthn/register/verify`, {
        user_id: user.id,
        credential: encodeCredential(credential)
      })

      setStatus('success')
      setTimeout(() => setIsOpen(false), 2000)
    } catch (err: any) {
      console.error("WebAuthn Registration Error:", err)
      setStatus('error')
      setErrorMessage(err.message || "Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
          theme === 'dark' 
            ? 'bg-blue-900/20 border-blue-500/20 text-blue-400 hover:bg-blue-900/40' 
            : 'bg-white border-slate-200 text-slate-600 hover:border-[#00BCD4]/40 hover:text-[#00BCD4]'
        }`}
      >
        <ScanFace size={18} strokeWidth={2.5} />
        <span className="text-[13px] font-bold">{lang === 'fr' ? 'Activer Face ID' : 'Enable Face ID'}</span>
      </motion.button>
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className={`relative w-full max-w-md rounded-[32px] p-8 overflow-hidden border ${
            theme === 'dark' 
              ? 'bg-slate-900 border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00BCD4] to-[#ff0000] flex items-center justify-center shadow-lg">
                <ShieldCheck className="text-white" size={22} />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">
                {lang === 'fr' ? 'Sécurité Biométrique' : 'Biometric Security'}
              </h2>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-6 text-center">
            <p className="text-[14px] text-slate-500 dark:text-blue-200/60 font-medium leading-relaxed">
              {lang === 'fr' 
                ? "Utilisez Face ID ou votre empreinte digitale pour vous connecter instantanément et en toute sécurité à votre espace SMA." 
                : "Use Face ID or your fingerprint to log in instantly and securely to your SMA workspace."}
            </p>

            <div className="flex justify-center py-4">
              <motion.div 
                animate={loading ? { scale: [1, 1.1, 1], opacity: [1, 0.6, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-24 h-24 rounded-[30px] flex items-center justify-center transition-all ${
                  status === 'success' ? 'bg-emerald-100 text-emerald-500' : 
                  status === 'error' ? 'bg-rose-100 text-rose-500' :
                  'bg-blue-50 text-[#00BCD4] dark:bg-blue-900/30'
                }`}
              >
                {status === 'success' ? <CheckCircle2 size={48} /> : 
                 status === 'error' ? <AlertCircle size={48} /> :
                 <ScanFace size={48} strokeWidth={1.5} />}
              </motion.div>
            </div>

            {status === 'success' && (
              <p className="text-emerald-500 font-bold text-[15px] animate-bounce">
                {t.login.faceIdSuccess}
              </p>
            )}

            {status === 'error' && (
              <p className="text-rose-500 font-bold text-[13px]">
                {errorMessage || t.login.faceIdError}
              </p>
            )}

            <div className="flex flex-col gap-3 pt-4">
              <button
                onClick={handleRegister}
                disabled={loading || status === 'success'}
                className={`w-full py-4 rounded-2xl font-black text-[15px] uppercase tracking-wider transition-all shadow-lg ${
                  loading || status === 'success'
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-gradient-to-r from-[#00BCD4] to-[#019ab3] text-white hover:shadow-[#00BCD4]/20 hover:-translate-y-0.5'
                }`}
              >
                {loading ? (lang === 'fr' ? 'Configuration...' : 'Configuring...') : (lang === 'fr' ? 'Configurer Face ID' : 'Setup Face ID')}
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-[13px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                {lang === 'fr' ? 'Plus tard' : 'Later'}
              </button>
            </div>
          </div>

          {/* Decorative grid */}
          <div className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '20px 20px' }} />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
