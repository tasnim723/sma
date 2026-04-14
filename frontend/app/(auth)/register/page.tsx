"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import {
  User, Mail, Phone, Lock, EyeOff, Eye,
  Briefcase, Star, FileText, Github, Linkedin,
  ChevronRight, ChevronLeft, CheckCircle2, Upload, X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useDropzone } from "react-dropzone"

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLES = [
  { value: "TEAM_MEMBER", label: "Membre de l'équipe" },
  { value: "TEAM_LEAD", label: "Team Lead" },
  { value: "PROJECT_MANAGER", label: "Chef de projet" },
]

const POSITIONS = [
  "Développeur Frontend", "Développeur Backend", "Développeur Full Stack",
  "Data Scientist", "DevOps Engineer", "UI/UX Designer",
  "Architecte logiciel", "Ingénieur QA", "Ingénieur IA/ML",
]

const GRADES = ["Stagiaire", "Junior", "Intermédiaire", "Senior", "Expert", "Lead"]

const SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Vue.js",
  "Python", "FastAPI", "Django", "Node.js", "Spring Boot",
  "MongoDB", "PostgreSQL", "MySQL", "Redis", "Docker",
  "Git", "CI/CD", "AWS", "Machine Learning", "AI",
  "Figma", "UI/UX", "GraphQL", "Java", "DevOps",
]

const STEPS = [
  { id: 1, label: "Profil", icon: User },
  { id: 2, label: "Poste", icon: Briefcase },
  { id: 3, label: "Compétences", icon: Star },
  { id: 4, label: "Liens", icon: Github },
]

// ─── Input Component ─────────────────────────────────────────────────────────

function FieldInput({
  icon: Icon, type = "text", placeholder, value, onChange, required = false, rightEl
}: {
  icon: any; type?: string; placeholder: string; value: string;
  onChange: (v: string) => void; required?: boolean; rightEl?: React.ReactNode
}) {
  return (
    <div className="relative flex items-center group">
      <Icon className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] z-10" strokeWidth={2.5} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
      />
      {rightEl && <div className="absolute right-4">{rightEl}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)

  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Step 1
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 2
  const [role, setRole] = useState("TEAM_MEMBER")
  const [position, setPosition] = useState("")
  const [grade, setGrade] = useState("")

  // Step 3
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [experience, setExperience] = useState("")
  const [cvFile, setCvFile] = useState<File | null>(null)

  // Step 4
  const [githubUrl, setGithubUrl] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")

  // ─── Dropzone ────────────────────────────────────────────────────────────
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setCvFile(acceptedFiles[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  const toggleSkill = (skill: string) =>
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    )

  // ─── Navigation ──────────────────────────────────────────────────────────
  const goNext = () => {
    setError("")
    if (step === 1) {
      if (!fullName.trim()) return setError("Le nom complet est requis.")
      if (!email.trim()) return setError("L'email est requis.")
      if (!password) return setError("Le mot de passe est requis.")
      if (password.length < 6) return setError("Le mot de passe doit faire au moins 6 caractères.")
      if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.")
    }
    if (step === 2) {
      if (!position) return setError("Veuillez sélectionner un poste.")
      if (!grade) return setError("Veuillez sélectionner un grade.")
    }
    setDirection(1)
    setStep((s) => s + 1)
  }

  const goBack = () => {
    setError("")
    setDirection(-1)
    setStep((s) => s - 1)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("")
    setLoading(true)
    try {
      // 1. Inscription
      await axios.post("http://127.0.0.1:8000/api/auth/register", {
        full_name: fullName,
        email,
        phone_number: phone,
        password,
        role,
        position,
        grade,
        skills: selectedSkills,
        experience,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
      })

      // 2. Connexion automatique pour obtenir le token
      const formData = new FormData()
      formData.append("username", email)
      formData.append("password", password)
      const loginRes = await axios.post("http://127.0.0.1:8000/api/auth/login", formData)
      const token = loginRes.data.access_token
      setToken(token)
      setUser({
        id: loginRes.data.user_id,
        full_name: loginRes.data.full_name || fullName,
        email: loginRes.data.email || email,
        role: loginRes.data.role,
      })

      // 3. Upload CV si sélectionné
      if (cvFile) {
        try {
          const cvData = new FormData()
          cvData.append("file", cvFile)
          const cvRes = await axios.post("http://127.0.0.1:8000/api/upload/cv", cvData, {
            headers: { Authorization: `Bearer ${token}` },
          })
          // 4. Mettre à jour cv_url dans le profil
          await axios.patch(
            "http://127.0.0.1:8000/api/members/me",
            { cv_url: cvRes.data.url },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        } catch {
          // CV upload non-bloquant
        }
      }

      setSuccess(true)
      setTimeout(() => router.push("/"), 1800)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'inscription. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  // ─── Slide variants ───────────────────────────────────────────────────────
  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  }

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

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-[#f1f5f9] font-sans overflow-hidden py-8">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image src="/images/custom_background.png" alt="bg" fill priority className="object-cover opacity-90" />
        <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
      </div>

      {renderParticles()}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10 px-4"
      >
        {/* Corner accents */}
        <div className="absolute inset-x-4 inset-y-0 pointer-events-none z-20">
          <motion.div
            className="absolute top-[-1px] left-[-1px] w-[115px] h-[115px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#e63946]/90"
            animate={{ filter: ["drop-shadow(0 0 3px rgba(230,57,70,0.5))", "drop-shadow(0 0 8px rgba(230,57,70,1))", "drop-shadow(0 0 3px rgba(230,57,70,0.5))"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-1px] right-[-1px] w-[115px] h-[115px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/90"
            animate={{ filter: ["drop-shadow(0 0 3px rgba(0,188,212,0.5))", "drop-shadow(0 0 8px rgba(0,188,212,1))", "drop-shadow(0 0 3px rgba(0,188,212,0.5))"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div
          className="w-full bg-white/10 backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-5 pb-4 relative overflow-hidden"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255,0,0,0.2), 15px 0 45px -15px rgba(0,188,212,0.2), 0 10px 40px -10px rgba(0,0,0,0.1)' }}
        >
          {/* Success overlay */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center z-30 gap-4"
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <CheckCircle2 className="w-16 h-16 text-[#00BCD4]" />
                </motion.div>
                <p className="text-[20px] font-[900] text-[#0f172a]">Compte créé !</p>
                <p className="text-[13px] text-gray-500">Redirection vers le tableau de bord...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
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
            <h2 className="text-[18px] font-[800] text-[#1e293b] mb-1">Inscription</h2>
            <p className="text-[12px] font-[600] text-gray-500">Accédez à votre espace SMA</p>
          </div>
          {/* Step Progress */}
          <div className="flex items-center justify-center gap-0 mb-4">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex items-center">
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{
                        background: isDone ? "#00BCD4" : isActive ? "linear-gradient(135deg,#00BCD4,#019ab3)" : "rgba(241,245,249,0.9)",
                        boxShadow: isActive ? "0 0 0 3px rgba(0,188,212,0.2)" : "none",
                        scale: isActive ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.3 }}
                      className="w-9 h-9 rounded-full flex items-center justify-center border-[1.5px]"
                      style={{ borderColor: isDone || isActive ? "#00BCD4" : "#e2e8f0" }}
                    >
                      {isDone
                        ? <CheckCircle2 className="w-4 h-4 text-white" />
                        : <StepIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-gray-400"}`} strokeWidth={2.5} />
                      }
                    </motion.div>
                    <span className={`text-[9px] font-[700] uppercase tracking-wider ${isActive ? "text-[#00BCD4]" : isDone ? "text-[#00BCD4]/70" : "text-gray-400"}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="w-8 h-[2px] mb-4 mx-1" style={{ background: step > s.id ? "#00BCD4" : "#e2e8f0" }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Error */}
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

          {/* Steps content */}
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* ── STEP 1 ── */}
              {step === 1 && (
                <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }} className="space-y-2.5"
                >
                  <p className="text-[13px] font-[800] text-[#1e293b] mb-2">Informations personnelles</p>
                  <FieldInput icon={User} placeholder="Nom et prénom" value={fullName} onChange={setFullName} required />
                  <FieldInput icon={Mail} type="email" placeholder="votre@email.com" value={email} onChange={setEmail} required />
                  <FieldInput icon={Phone} type="tel" placeholder="Téléphone (optionnel)" value={phone} onChange={setPhone} />
                  <FieldInput
                    icon={Lock} type={showPassword ? "text" : "password"} placeholder="Mot de passe (min. 6 car.)"
                    value={password} onChange={setPassword} required
                    rightEl={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#00BCD4] hover:text-[#0096a8] transition-colors">
                        {showPassword ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                      </button>
                    }
                  />
                  <FieldInput
                    icon={Lock} type={showConfirm ? "text" : "password"} placeholder="Confirmer le mot de passe"
                    value={confirmPassword} onChange={setConfirmPassword} required
                    rightEl={
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-[#00BCD4] hover:text-[#0096a8] transition-colors">
                        {showConfirm ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                      </button>
                    }
                  />
                </motion.div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }} className="space-y-2.5"
                >
                  <p className="text-[13px] font-[800] text-[#1e293b] mb-2">Informations professionnelles</p>
                  {/* Role */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">Rôle</label>
                    <div className="flex gap-2 flex-wrap">
                      {ROLES.map((r) => (
                        <motion.button key={r.value} type="button" whileTap={{ scale: 0.96 }} onClick={() => setRole(r.value)}
                          className={`px-3 py-2 rounded-[14px] text-[12px] font-[700] border-[1.5px] transition-all duration-200 ${role === r.value ? "bg-[#00BCD4] border-[#00BCD4] text-white shadow-[0_2px_8px_rgba(0,188,212,0.35)]" : "bg-white/60 border-gray-200 text-gray-600 hover:border-[#00BCD4]/40"}`}
                        >{r.label}</motion.button>
                      ))}
                    </div>
                  </div>
                  {/* Position */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">Poste</label>
                    <div className="relative flex items-center">
                      <Briefcase className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] z-10" strokeWidth={2.5} />
                      <select value={position} onChange={(e) => setPosition(e.target.value)}
                        className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[14px] text-gray-800 font-[600] transition-all appearance-none"
                      >
                        <option value="">Sélectionner un poste...</option>
                        {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Grade */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">Grade</label>
                    <div className="flex gap-2 flex-wrap">
                      {GRADES.map((g) => (
                        <motion.button key={g} type="button" whileTap={{ scale: 0.96 }} onClick={() => setGrade(g)}
                          className={`px-3 py-1.5 rounded-[12px] text-[12px] font-[700] border-[1.5px] transition-all duration-200 ${grade === g ? "bg-[#e63946] border-[#e63946] text-white shadow-[0_2px_8px_rgba(230,57,70,0.3)]" : "bg-white/60 border-gray-200 text-gray-600 hover:border-[#e63946]/30"}`}
                        >{g}</motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }} className="space-y-3"
                >
                  <p className="text-[13px] font-[800] text-[#1e293b] mb-2">Profil professionnel</p>
                  {/* CV Upload */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">Curriculum Vitae (PDF)</label>
                    <div
                      {...getRootProps()}
                      className={`w-full rounded-[16px] border-[2px] border-dashed transition-all cursor-pointer py-4 px-4 flex flex-col items-center gap-2 ${
                        isDragActive ? "border-[#00BCD4] bg-[#00BCD4]/5" : cvFile ? "border-[#00BCD4]/60 bg-[#00BCD4]/5" : "border-gray-200 bg-white/50 hover:border-[#00BCD4]/40 hover:bg-white/70"
                      }`}
                    >
                      <input {...getInputProps()} />
                      {cvFile ? (
                        <div className="flex items-center gap-2 w-full">
                          <FileText className="w-5 h-5 text-[#00BCD4] shrink-0" strokeWidth={2} />
                          <span className="text-[13px] font-[700] text-[#00BCD4] truncate flex-1">{cvFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setCvFile(null) }}
                            className="text-gray-400 hover:text-red-400 transition-colors shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
                          <p className="text-[12.5px] font-[700] text-gray-400 text-center">
                            {isDragActive ? "Déposez le fichier ici..." : "Glissez votre CV ou cliquez pour sélectionner"}
                          </p>
                          <p className="text-[10px] text-gray-300 font-[600]">PDF uniquement • Max 5 Mo</p>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Skills */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">
                      Compétences
                      <span className="ml-1.5 text-[10px] font-[600] text-gray-400">({selectedSkills.length} sélectionnée{selectedSkills.length > 1 ? "s" : ""})</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {SKILLS.map((skill) => {
                        const isSelected = selectedSkills.includes(skill)
                        return (
                          <motion.button key={skill} type="button" whileTap={{ scale: 0.94 }} onClick={() => toggleSkill(skill)}
                            className={`px-2.5 py-1 rounded-[10px] text-[11.5px] font-[700] border-[1.5px] transition-all duration-200 ${isSelected ? "bg-[#00BCD4] border-[#00BCD4] text-white" : "bg-white/60 border-gray-200 text-gray-500 hover:border-[#00BCD4]/40 hover:bg-white"}`}
                          >{skill}</motion.button>
                        )
                      })}
                    </div>
                  </div>
                  {/* Experience */}
                  <div>
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1 block mb-1.5">Expérience (optionnel)</label>
                    <textarea
                      value={experience} onChange={(e) => setExperience(e.target.value)}
                      placeholder="Décrivez brièvement votre expérience..."
                      rows={2}
                      className="w-full px-4 py-2 rounded-[14px] border-[1.5px] border-white/80 bg-[#f1f5f9]/80 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 focus:border-[#00BCD4]/50 text-[13px] text-gray-800 placeholder:text-gray-400 font-[600] transition-all resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* ── STEP 4 ── */}
              {step === 4 && (
                <motion.div key="step4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                  transition={{ duration: 0.3, ease: "easeInOut" }} className="space-y-2.5"
                >
                  <p className="text-[13px] font-[800] text-[#1e293b] mb-2">Liens externes</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1">GitHub</label>
                    <FieldInput icon={Github} type="url" placeholder="https://github.com/monprofil" value={githubUrl} onChange={setGithubUrl} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11.5px] font-[800] text-[#475569] px-1">LinkedIn</label>
                    <FieldInput icon={Linkedin} type="url" placeholder="https://linkedin.com/in/monprofil" value={linkedinUrl} onChange={setLinkedinUrl} />
                  </div>
                  {/* Summary card */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="mt-4 rounded-[20px] bg-gradient-to-br from-[#00BCD4]/8 to-[#00BCD4]/3 border border-[#00BCD4]/20 p-4 space-y-2"
                  >
                    <p className="text-[11px] font-[800] text-[#00BCD4] uppercase tracking-wider mb-2">Résumé</p>
                    <p className="text-[13px] font-[700] text-[#1e293b]">{fullName || "—"}</p>
                    <p className="text-[12px] text-gray-500">{email}</p>
                    <p className="text-[12px] text-gray-500">{position} {grade ? `· ${grade}` : ""}</p>
                    {selectedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selectedSkills.slice(0, 5).map(s => (
                          <span key={s} className="px-2 py-0.5 bg-[#00BCD4]/15 text-[#00BCD4] rounded-full text-[10px] font-[700]">{s}</span>
                        ))}
                        {selectedSkills.length > 5 && <span className="text-[10px] text-gray-400 font-[600]">+{selectedSkills.length - 5} autres</span>}
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 mt-3">
            {step > 1 && (
              <motion.button
                whileTap={{ scale: 0.97 }} onClick={goBack}
                className="flex items-center gap-1.5 px-5 py-[11px] rounded-[14px] border-[1.5px] border-gray-200 bg-white/60 text-[14px] font-[800] text-gray-500 hover:border-gray-300 hover:bg-white transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </motion.button>
            )}

            {step < 4 ? (
              <motion.button
                whileTap={{ scale: 0.97 }} onClick={goNext}
                className="flex-1 relative bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] text-white py-[11px] rounded-[14px] font-[800] text-[15px] transition-all duration-200 shadow-[0_4px_15px_rgba(0,188,212,0.3)] flex items-center justify-center gap-2"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
                className="flex-1 relative bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] disabled:opacity-70 text-white py-[11px] rounded-[14px] font-[800] text-[15px] transition-all duration-200 shadow-[0_4px_15px_rgba(0,188,212,0.3)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>Création du compte...</>
                ) : (<>Créer mon compte <CheckCircle2 className="w-4 h-4" /></>)}
              </motion.button>
            )}
          </div>

          {/* Login link */}
          <div className="mt-3 text-center">
            <p className="text-[11.5px] font-[600] text-gray-400 whitespace-nowrap">
              Déjà un compte ?{" "}
              <a href="/login" className="font-[800] text-[#00BCD4] hover:text-[#0096a8] transition-colors hover:underline underline-offset-2">
                Se connecter &rarr;
              </a>
            </p>
          </div>

          {/* Footer */}
          <div className="mt-3 pt-3 border-t border-gray-200/60 text-center">
            <p className="text-[9px] font-[700] text-gray-400 uppercase tracking-widest">NETINFO SMA © 2026 — Netinfo Nabeul</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
