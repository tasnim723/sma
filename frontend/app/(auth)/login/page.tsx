"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import { Eye, EyeOff, Lock, Mail, Sun, Moon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google"
import Image from "next/image"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"
// Face ID onboarding modal removed
// Face ID enrollment overlay removed

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t, lang, setLang } = useLang()
  const { theme, toggleTheme } = useThemeStore()
  const { setToken, setUser } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  useEffect(() => { 
    setMounted(true) 
  }, [])

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
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.append("username", email.trim())
      params.append("password", password.trim())
      
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })
      
      
      setToken(res.data.access_token)
      const userData = { 
        role: res.data.role, 
        id: res.data.user_id, 
        full_name: res.data.full_name || "User", 
        email: res.data.email || email,
        gender: res.data.gender || "",
        avatar_url: res.data.avatar_url || "",
      }
      setUser(userData as any)
      router.push("/")
    } catch (err: any) {
      const status = err?.response?.status
      const detail = err?.response?.data?.detail
      const isNetworkError = !err?.response
      
      if (isNetworkError) {
        setError(lang === "fr" ? "Serveur backend injoignable. Vérifiez qu'il est lancé." : "Backend server unreachable. Please ensure it is running.")
      } else if (status === 403 && detail?.toString().startsWith("PENDING")) {
        setError(lang === "fr" ? "Votre compte est en attente de validation." : "Your account is awaiting approval.")
      } else if (status === 403 && detail?.toString().startsWith("REJECTED")) {
        setError(lang === "fr" ? "Votre demande de compte a été refusée." : "Your account request was rejected.")
      } else if (status === 401) {
        setError(lang === "fr" ? "Email ou mot de passe incorrect." : "Invalid email or password.")
      } else {
        setError(detail || err?.message || (lang === "fr" ? "Une erreur est survenue lors de la connexion." : "An error occurred during login."))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setGoogleLoading(true)
    setError("")
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/google`, {
        token: credentialResponse.credential,
      })
      setToken(res.data.access_token)
      setUser({ role: res.data.role, id: res.data.user_id, full_name: res.data.full_name || "User", email: res.data.email } as any)
      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.detail || t.login.errorGoogle)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError(t.login.errorGoogle)
    setGoogleLoading(false)
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className={`min-h-screen w-full flex flex-col items-center justify-center font-sans relative overflow-hidden p-4 transition-colors duration-700 ${theme === 'dark' ? 'bg-[#020617]' : 'bg-[#f1f5f9]'}`}>
        
        {/* Background */}
        <div className="absolute inset-0 z-0 transition-all duration-700">
          {theme === 'light' ? (
            <>
              <Image src="/images/custom_background.png" alt="bg" fill priority className="object-cover opacity-90" />
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[#020617] overflow-hidden">
              <div className="absolute inset-0 opacity-[0.2]" 
                   style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #1e40af 1px, transparent 0)', backgroundSize: '32px 32px' }} />
              
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
              
              <div className="absolute inset-0 opacity-[0.05]" 
                   style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
            </div>
          )}
        </div>

        {renderParticles()}


        {/* Theme Toggle — top left */}
        <div className="preserve-colors absolute top-5 left-5 z-30">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={toggleTheme}
            title={theme === "light" ? "Mode sombre" : "Mode clair"}
            className="relative flex items-center gap-1 p-1 rounded-full backdrop-blur-xl transition-all duration-300"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.85)' }}
          >
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                boxShadow: [
                  "-6px 0 14px rgba(230,57,70,0.4), 6px 0 14px rgba(0,188,212,0.4)",
                  "-6px 0 24px rgba(230,57,70,0.9), 6px 0 24px rgba(0,188,212,0.9)",
                  "-6px 0 14px rgba(230,57,70,0.4), 6px 0 14px rgba(0,188,212,0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className={`p-1.5 rounded-full transition-all duration-300 relative z-10 ${theme === "light" ? "bg-white shadow-sm" : "opacity-60 hover:opacity-100"}`}>
              <Sun size={14} className={theme === "light" ? "text-amber-500" : "text-slate-500"} />
            </div>
            <div className={`p-1.5 rounded-full transition-all duration-300 relative z-10 ${theme === "dark" ? "bg-slate-800 shadow-sm" : "opacity-60 hover:opacity-100"}`}>
              <Moon size={14} className={theme === "dark" ? "text-blue-400" : "text-slate-600"} />
            </div>
          </motion.button>
        </div>

        {/* Language Toggle — top right */}
        <div className="preserve-colors absolute top-5 right-5 z-30">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            title={lang === "fr" ? "Switch to English" : "Passer en français"}
            className="relative flex items-center gap-1 p-1 rounded-full backdrop-blur-xl transition-all duration-300"
            style={{ backgroundColor: theme === 'dark' ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.85)' }}
          >
            <motion.span
              className="absolute inset-0 rounded-full pointer-events-none"
              animate={{
                boxShadow: [
                  "-6px 0 14px rgba(230,57,70,0.4), 6px 0 14px rgba(0,188,212,0.4)",
                  "-6px 0 24px rgba(230,57,70,0.9), 6px 0 24px rgba(0,188,212,0.9)",
                  "-6px 0 14px rgba(230,57,70,0.4), 6px 0 14px rgba(0,188,212,0.4)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <div className={`px-2 py-1 rounded-full text-[11px] font-[800] tracking-wider transition-all duration-300 relative z-10 ${lang === "fr" ? "bg-white shadow-sm text-[#00BCD4]" : "opacity-60 hover:opacity-100 text-slate-500 dark:text-slate-400"}`}>
              FR
            </div>
            <div className={`px-2 py-1 rounded-full text-[11px] font-[800] tracking-wider transition-all duration-300 relative z-10 ${lang === "en" ? "bg-white shadow-sm text-[#00BCD4]" : "opacity-60 hover:opacity-100 text-slate-500 dark:text-slate-400"}`}>
              EN
            </div>
          </motion.button>
        </div>

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
            className={`w-full backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-5 pb-4 relative overflow-hidden transition-all duration-500 ${
              theme === 'dark' 
                ? 'bg-[#0f172a]/60 border border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(30,58,138,0.3)]' 
                : 'bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.6)]'
            }`}
            style={theme === 'light' ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255,0,0,0.2), 15px 0 45px -15px rgba(0,188,212,0.2), 0 10px 40px -10px rgba(0,0,0,0.1)' } : {}}
          >
            {/* Logo + Header */}
            <div className="flex flex-col items-center justify-center text-center mb-3">
              <div className="relative w-7 h-7 mb-3">
                <div className="absolute top-0 left-0 w-3 h-3 bg-[#ff0000]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00BCD4]" />
              </div>

              <h1 className="text-[26px] font-[900] text-[#0f172a] dark:text-blue-50 tracking-[0.18em] mr-[-0.18em] leading-none mb-2 font-sans transition-colors duration-500">
                NETINFO
              </h1>
              <p translate="no" className="text-[7.5px] font-[500] text-gray-500 dark:text-blue-400/80 tracking-[0.38em] mr-[-0.38em] uppercase notranslate transition-colors duration-500">
                {t.login.school}
              </p>
            </div>

            {/* Title Section */}
            <AnimatePresence mode="wait">
              <motion.div key={lang} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }} className="text-center mb-3">
                <h2 translate="no" className="text-[18px] font-[800] text-[#1e293b] dark:text-blue-100 mb-1 notranslate transition-colors duration-500">{t.login.title}</h2>
                <p translate="no" className="text-[12px] font-[600] text-gray-500 dark:text-blue-400/60 notranslate transition-colors duration-500">{t.login.subtitle}</p>
              </motion.div>
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleLogin} className="w-full space-y-3">
              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center justify-center gap-1.5 py-1 px-3 mb-2 bg-red-50/80 border border-red-100 rounded-full">
                    <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                    <span className="text-[11px] font-[700] text-red-600">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-200/70 px-1 transition-colors duration-500">{t.login.email}</label>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400 z-10" strokeWidth={2.5} />
                  <input
                    type="email"
                    placeholder={t.login.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[13px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-700 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-200/70 px-1 transition-colors duration-500">{t.login.password}</label>
                <div className="relative flex items-center group">
                  <Lock className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400 z-10" strokeWidth={2.5} />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t.login.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-[42px] pr-12 py-[10px] rounded-[14px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[13px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-700 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                    required
                  />
                  <button type="button" className="absolute right-4 text-[#00BCD4] dark:text-blue-400 hover:text-[#0096a8] dark:hover:text-blue-300 transition-colors" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`w-full py-[11px] rounded-[14px] font-[800] text-[15px] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-blue-900 to-indigo-950 border border-blue-500/30 text-blue-100 shadow-[0_0_20px_rgba(30,58,138,0.5)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:border-blue-400/50'
                      : 'bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] text-white shadow-[0_4px_15px_rgba(0,188,212,0.3)]'
                  }`}
                >
                  {loading ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>{t.login.googleLoading}...</span></>) : t.login.submit}
                </button>
              </div>
            </form>

            {/* Separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-[1px] bg-gray-200/40 dark:bg-blue-500/10" />
              <span translate="no" className="notranslate text-[11px] font-[700] text-gray-400 dark:text-blue-500/50 uppercase tracking-widest transition-colors duration-500">{t.login.separator}</span>
              <div className="flex-1 h-[1px] bg-gray-200/40 dark:bg-blue-500/10" />
            </div>

            {/* Google Login */}
            <div className="w-full space-y-3">
              {mounted && (
                <>
                  <div className="flex flex-col items-center">
                    {googleLoading ? (
                      <div className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[14px] border border-gray-200 dark:border-blue-500/20 bg-white/60 dark:bg-blue-950/40 text-[13px] font-[700] text-gray-400 transition-all duration-500">
                         <svg className="animate-spin h-4 w-4 text-[#00BCD4] dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                        {t.login.googleLoading}
                      </div>
                    ) : (
                      <div className={`preserve-colors w-full rounded-[14px] overflow-hidden border-[1.5px] transition-all duration-500 ${
                        theme === 'dark' 
                          ? 'border-blue-500/20 bg-blue-950/40 hover:bg-blue-900/40' 
                          : 'border-gray-200/80 bg-white/60 hover:bg-white'
                      }`}>
                        <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} theme={theme === 'dark' ? 'filled_black' : 'outline'} size="large" width="100%" />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Register Link */}
            <div className="mt-4 text-center">
              <p translate="no" className="text-[11.5px] font-[600] text-gray-400 dark:text-blue-400/60 notranslate transition-colors duration-500">
                {t.login.noAccount}{" "}
                <a href="/register" className="font-[800] text-[#00BCD4] dark:text-blue-400 hover:text-[#0096a8] dark:hover:text-blue-300 transition-colors hover:underline underline-offset-2">{t.login.createAccount}</a>
              </p>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-blue-500/10 text-center transition-colors duration-500">
              <p translate="no" className="text-[9px] font-[700] text-gray-400 dark:text-blue-500/40 uppercase tracking-widest notranslate">{t.login.footer}</p>
            </div>
          </div>
        </motion.div>

// Face ID modals removed
      </div>
    </GoogleOAuthProvider>
  )
}
