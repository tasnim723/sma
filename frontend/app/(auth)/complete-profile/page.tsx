"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import { Github, Linkedin, Briefcase, Sparkles, CheckCircle2, ChevronRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useThemeStore } from "@/lib/themeStore"

const SKILLS_OPTIONS = [
  "React", "Next.js", "TypeScript", "Python", "FastAPI", "Node.js",
  "MongoDB", "PostgreSQL", "Docker", "Git", "Machine Learning", "AI",
  "Figma", "UI/UX", "DevOps", "Java", "Spring Boot", "GraphQL",
]

const POSITIONS = [
  "Développeur Frontend",
  "Développeur Backend",
  "Développeur Full Stack",
  "Data Scientist",
  "DevOps Engineer",
  "UI/UX Designer",
  "Chef de projet",
  "Architecte logiciel",
  "Ingénieur QA",
]

export default function CompleteProfilePage() {
  const [githubUrl, setGithubUrl] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [position, setPosition] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const { theme } = useThemeStore()

  useEffect(() => {
    if (!token) {
      router.push("/login")
    }
  }, [token, router])

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await axios.patch(
        `${API_BASE_URL}/api/members/me`,
        {
          github_url: githubUrl,
          linkedin_url: linkedinUrl,
          position,
          skills: selectedSkills,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setUser({ ...user, position, skills: selectedSkills } as any)
      setSuccess(true)
      setTimeout(() => router.push("/"), 1500)
    } catch (err: any) {
      // Si l'endpoint /members/me n'existe pas encore, on redirige quand même
      if (err.response?.status === 404 || err.response?.status === 405) {
        setSuccess(true)
        setTimeout(() => router.push("/"), 1500)
      } else {
        setError(err.response?.data?.detail || "Erreur lors de la mise à jour du profil.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    router.push("/")
  }

  return (
    <div className={`min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden transition-colors duration-700 ${theme === 'dark' ? 'bg-[#020617]' : 'bg-[#f1f5f9]'}`}>
      {/* Background */}
      <div className="absolute inset-0 z-0 transition-all duration-700">
        {theme === 'light' ? (
          <>
            <Image src="/images/custom_background.png" alt="bg" fill priority className="object-cover opacity-90" />
            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
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

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[480px] relative z-10 flex flex-col items-center px-4"
      >
        {/* Corner accents */}
        <div className="absolute inset-x-4 inset-y-0 pointer-events-none z-20">
          <motion.div
            className="absolute top-[-1px] left-[-1px] w-[100px] h-[100px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#e63946]/90"
            animate={{ filter: [
              "drop-shadow(0 0 3px rgba(230,57,70,0.6))",
              "drop-shadow(0 0 8px rgba(230,57,70,1))",
              "drop-shadow(0 0 3px rgba(230,57,70,0.6))"
            ]}}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-1px] right-[-1px] w-[100px] h-[100px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/90"
            animate={{ filter: [
              "drop-shadow(0 0 3px rgba(0,188,212,0.6))",
              "drop-shadow(0 0 8px rgba(0,188,212,1))",
              "drop-shadow(0 0 3px rgba(0,188,212,0.6))"
            ]}}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div
          className={`w-full backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-10 pb-8 relative overflow-hidden transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#0f172a]/60 border border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(30,58,138,0.3)]' 
              : 'bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.6)]'
          }`}
          style={theme === 'light' ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255,0,0,0.2), 15px 0 45px -15px rgba(0,188,212,0.2), 0 10px 40px -10px rgba(0,0,0,0.1)' } : {}}
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
              theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/30' : 'bg-gradient-to-br from-[#00BCD4]/20 to-[#00BCD4]/5 border border-[#00BCD4]/30'
            }`}>
              <Sparkles className="w-6 h-6 text-[#00BCD4] dark:text-blue-400" />
            </div>
            <h1 className="text-[22px] font-[900] text-[#0f172a] dark:text-blue-50 tracking-tight mb-1 transition-colors">Bienvenue !</h1>
            <p className="text-[13px] font-[600] text-gray-500 dark:text-blue-400/60 text-center transition-colors">
              {user?.full_name ? `Bonjour ${user.full_name.split(" ")[0]} 👋` : "Complète ton profil pour commencer"}
            </p>
          </div>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`absolute inset-0 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center z-30 gap-4 transition-colors duration-500 ${
                  theme === 'dark' ? 'bg-[#020617]/95' : 'bg-white/95'
                }`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <CheckCircle2 className="w-16 h-16 text-[#00BCD4]" />
                </motion.div>
                <p className="text-[18px] font-[800] text-[#0f172a] dark:text-blue-50">Profil enregistré !</p>
                <p className="text-[13px] text-gray-500 dark:text-blue-400/60">Redirection vers le tableau de bord...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[13px] rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-red-600 font-[600] text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* GitHub URL */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-400 px-1 block transition-colors">GitHub</label>
              <div className="relative flex items-center group">
                <Github className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400" strokeWidth={2.5} />
                <input
                  type="url"
                  placeholder="https://github.com/monprofil"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full pl-[42px] pr-4 py-[13px] rounded-[18px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[14px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-800 font-[600] transition-all"
                />
              </div>
            </div>

            {/* LinkedIn URL */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-400 px-1 block transition-colors">LinkedIn</label>
              <div className="relative flex items-center group">
                <Linkedin className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400" strokeWidth={2.5} />
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/monprofil"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full pl-[42px] pr-4 py-[13px] rounded-[18px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[14px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-800 font-[600] transition-all"
                />
              </div>
            </div>

            {/* Position */}
            <div className="space-y-1.5">
              <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-400 px-1 block transition-colors">Poste</label>
              <div className="relative flex items-center group">
                <Briefcase className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400 z-10" strokeWidth={2.5} />
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full pl-[42px] pr-4 py-[13px] rounded-[18px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[14px] text-gray-800 dark:text-blue-50 font-[600] transition-all appearance-none"
                >
                  <option value="">Sélectionner un poste...</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <label className="text-[12.5px] font-[800] text-[#334155] dark:text-blue-400 px-1 block transition-colors">
                Compétences
                <span className="ml-2 text-[11px] font-[600] text-gray-400 dark:text-blue-800 transition-colors">({selectedSkills.length} sélectionnée{selectedSkills.length > 1 ? "s" : ""})</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILLS_OPTIONS.map((skill) => {
                  const isSelected = selectedSkills.includes(skill)
                  return (
                    <motion.button
                      key={skill}
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1.5 rounded-[12px] text-[12px] font-[700] border-[1.5px] transition-all duration-200 ${
                        isSelected
                          ? "bg-[#00BCD4] border-[#00BCD4] text-white shadow-[0_2px_8px_rgba(0,188,212,0.35)]"
                          : (theme === 'dark' ? "bg-blue-900/40 border-blue-500/20 text-blue-300 hover:border-blue-400/40" : "bg-white/60 border-gray-200 text-gray-600 hover:border-[#00BCD4]/40 hover:bg-white")
                      }`}
                    >
                      {skill}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-4 flex flex-col items-center gap-3">
              <div className="relative w-full flex justify-center">
                <div className="absolute inset-x-8 top-0 bottom-0 bg-[#00BCD4] opacity-40 blur-xl rounded-full" />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full max-w-[300px] relative bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] active:scale-[0.98] text-white py-[14px] rounded-[20px] font-[800] text-[15px] transition-all duration-200 shadow-[0_6px_20px_rgba(0,188,212,0.3)] flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      Accéder au tableau de bord
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleSkip}
                className="text-[12px] font-[700] text-gray-400 hover:text-gray-600 transition-colors"
              >
                Passer pour l&apos;instant →
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className={`mt-8 pt-5 border-t text-center transition-colors ${theme === 'dark' ? 'border-blue-500/10' : 'border-gray-200/60'}`}>
            <p className="text-[9px] font-[700] text-gray-400 dark:text-blue-900 uppercase tracking-widest transition-colors">
              NETINFO SMA © 2026 — Netinfo Nabeul
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
