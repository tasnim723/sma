"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Eye, EyeOff, Lock, Mail } from "lucide-react"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

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
      setError(err.response?.data?.detail || "An error occurred during login")
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white p-4 font-sans relative overflow-hidden">
      {/* Decorative animated blobs */}
      <motion.div 
        animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }} 
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-[#5acddb]/20 rounded-full blur-[80px] pointer-events-none"
      />
      <motion.div 
        animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }} 
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#e63946]/10 rounded-full blur-[100px] pointer-events-none"
      />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[420px] bg-white rounded-[32px] px-8 sm:px-10 py-12 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col items-center relative z-10 border border-gray-100"
      >
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-10 w-full relative">
          <div className="flex flex-col items-center justify-center text-center mt-4">
            <div className="relative mb-3.5" style={{ width: '24px', height: '24px' }}>
              <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[2px]" style={{ width: '15px', height: '15px' }}></div>
              <div className="absolute bottom-0 right-0 bg-[#00CCCC] rounded-[2px] mix-blend-multiply opacity-90" style={{ width: '15px', height: '15px' }}></div>
            </div>
            
            <h1 className="text-[36px] font-[900] text-[#111827] uppercase tracking-[0.16em] mr-[-0.16em] leading-none mb-1.5" style={{ WebkitTextStroke: "2px #111827" }}>
              NETINFO
            </h1>
            <p className="text-[11px] font-[700] text-gray-400 tracking-[0.25em] mr-[-0.25em] uppercase">
              ÉCOLE D'ART ET DE TECHNOLOGIE
            </p>
          </div>
          
          {/* Separator line */}
          <div className="w-10 h-[1.5px] bg-gray-100 mt-6 mb-2 rounded-full"></div>
        </div>

        {/* Title Section */}
        <div className="text-center mb-8">
          <h2 className="text-[22px] font-[800] text-[#1e293b] mb-1.5">Connexion</h2>
          <p className="text-[13px] font-[500] text-gray-400">Accédez à votre espace SMA</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full space-y-5">
          {error && (
            <div className="text-[13px] rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-red-600 font-medium text-center shadow-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[13px] font-[700] text-black ml-0.5">Email</label>
            <div className="relative flex items-center group">
              <Mail className="absolute left-4 h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#5acddb] transition-colors" strokeWidth={1.5} />
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-[42px] pr-4 py-[14px] rounded-[14px] border border-gray-200 bg-white focus:outline-none focus:ring-[3px] focus:ring-[#5acddb]/20 focus:border-[#5acddb] text-[14px] text-gray-700 placeholder:text-gray-300 font-medium transition-all shadow-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-[700] text-black ml-0.5">Mot de passe</label>
            <div className="relative flex items-center group">
              <Lock className="absolute left-4 h-[18px] w-[18px] text-gray-400 group-focus-within:text-[#5acddb] transition-colors" strokeWidth={1.5} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-[42px] pr-12 py-[14px] rounded-[14px] border border-gray-200 bg-white focus:outline-none focus:ring-[3px] focus:ring-[#5acddb]/20 focus:border-[#5acddb] text-[14px] text-gray-700 placeholder:text-gray-300 font-medium transition-all shadow-sm tracking-wide"
                required
              />
              <button
                type="button"
                className="absolute right-4 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-[#52c8d5] hover:bg-[#4bc0ce] active:bg-[#3bacb9] text-white py-[14px] rounded-[14px] font-[600] text-[15px] transition-all"
            >
              Se connecter
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-[11px] font-[500] text-gray-400/80">
            NETINFO SMA © 2026 — Netinfo Nabeul
          </p>
        </div>

      </motion.div>
    </div>
  )
}

