"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import {
  User, Mail, Phone, Lock, EyeOff, Eye,
  Briefcase, Star, FileText, Github, Linkedin,
  ChevronRight, ChevronLeft, CheckCircle2, Upload, X,
  Sparkles, Bot, Zap, ArrowRight, ShieldCheck
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useDropzone } from "react-dropzone"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"

// ─── Custom Icons ──────────────────────────────────────────────────────────────
const NoselessBot = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={props.strokeWidth || 2} strokeLinecap="round" strokeLinejoin="round" className={props.className} {...props}>
    {/* Antenne avec un petit cercle au bout, mais droite */}
    <path d="M12 8V4" />
    <circle cx="12" cy="3.5" r="1" />
    
    {/* Tête plus large */}
    <rect width="18" height="12" x="3" y="8" rx="3" />
    
    {/* Oreilles */}
    <path d="M1 14h2" />
    <path d="M21 14h2" />
    
    {/* Yeux (petits cercles remplis, PAS de nez au centre) */}
    <circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

// ─── Constants ───────────────────────────────────────────────────────────────

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

const MANUAL_STEPS = [
  { id: 1, label: "Profil", icon: User },
  { id: 2, label: "Poste", icon: Briefcase },
  { id: 3, label: "Compétences", icon: Star },
  { id: 4, label: "Liens", icon: Github },
]

// ─── FieldInput ──────────────────────────────────────────────────────────────

function FieldInput({
  icon: Icon, type = "text", placeholder, value, onChange, required = false, rightEl
}: {
  icon: any; type?: string; placeholder: string; value: string
  onChange: (v: string) => void; required?: boolean; rightEl?: React.ReactNode
}) {
  const { theme } = useThemeStore()
  return (
    <div className="relative flex items-center group">
      <Icon className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] dark:text-blue-400 z-10" strokeWidth={2.5} />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[13px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-700 font-[600] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
      />
      {rightEl && <div className="absolute right-4">{rightEl}</div>}
    </div>
  )
}

// ─── Spinning Robot ───────────────────────────────────────────────────────────

function SpinningRobot({ phase }: { phase: 'uploading' | 'analyzing' | 'done' }) {
  const { theme } = useThemeStore()
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative">
        {/* Outer rotating ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-[3px] border-dashed border-[#00BCD4]/40"
          style={{ width: 140, height: 140, margin: -10 }}
        />
        {/* Middle pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full border-[2px] border-[#ff0000]/50"
          style={{ width: 120, height: 120, margin: 0 }}
        />
        {/* Robot container */}
        <motion.div
          animate={phase === 'done' ? { scale: [1, 1.15, 1] } : { y: [0, -6, 0] }}
          transition={{ duration: phase === 'done' ? 0.5 : 2, repeat: phase === 'done' ? 0 : Infinity, ease: "easeInOut" }}
          className={`w-[120px] h-[120px] rounded-full backdrop-blur border-2 flex items-center justify-center shadow-[0_8px_32px_rgba(0,188,212,0.25)] relative overflow-hidden transition-colors duration-500 ${
            theme === 'dark' ? 'bg-blue-900/20 border-blue-500/40' : 'bg-gradient-to-br from-[#00BCD4]/20 to-[#ff0000]/20 border-white/60'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/10 via-transparent to-[#ff0000]/10" />
          <NoselessBot className="w-14 h-14 text-[#00BCD4] dark:text-blue-400 relative z-10 drop-shadow-lg" strokeWidth={1.5} />
        </motion.div>
        {/* Sparkle particles */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <motion.div
            key={i}
            animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
            className="absolute w-2 h-2 rounded-full bg-[#00BCD4]"
            style={{
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateX(70px)`,
              marginTop: -4, marginLeft: -4,
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-1">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[15px] font-[800] text-[#1e293b] dark:text-blue-50 transition-colors"
        >
          {phase === 'uploading' && 'Chargement du CV...'}
          {phase === 'analyzing' && "L'IA analyse votre profil..."}
          {phase === 'done' && 'Profil extrait avec succès !'}
        </motion.p>
        {phase !== 'done' && (
          <motion.div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                className="w-1.5 h-1.5 rounded-full bg-[#00BCD4]"
              />
            ))}
          </motion.div>
        )}
        {phase === 'done' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="flex items-center justify-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-[12px] font-[700] text-emerald-600">Données extraites</span>
          </motion.div>
        )}
      </div>

      {/* Processing steps */}
      <div className="w-full space-y-2">
        {[
          { label: 'Lecture du document PDF', done: true },
          { label: 'Détection des compétences', done: phase === 'analyzing' || phase === 'done' },
          { label: 'Génération du profil IA', done: phase === 'done' },
        ].map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.3 }}
            className="flex items-center gap-2"
          >
            <motion.div
              animate={step.done ? { backgroundColor: '#10b981' } : { backgroundColor: theme === 'dark' ? '#1e293b' : '#e2e8f0' }}
              className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors"
            >
              {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
            </motion.div>
            <span className={`text-[11px] font-[600] transition-colors ${step.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-blue-900'}`}>
              {step.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter()
  const setToken = useAuthStore((s) => s.setToken)
  const setUser = useAuthStore((s) => s.setUser)

  // Global state
  const [mode, setMode] = useState<'choice' | 'cv' | 'manual'>('choice')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [registeredUserId, setRegisteredUserId] = useState("")
  const [approvalStatus, setApprovalStatus] = useState<'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED'>('PENDING')
  const [mounted, setMounted] = useState(false)
  const { t, lang } = useLang()
  const { theme } = useThemeStore()

  useEffect(() => { setMounted(true) }, [])

  // ── Poll approval status every 4s when pending overlay is shown ───────────
  useEffect(() => {
    if (!pendingApproval || !registeredUserId) return
    if (approvalStatus === 'ACTIVE' || approvalStatus === 'REJECTED') return

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/status/${registeredUserId}`)
        const newStatus = res.data?.status as 'PENDING' | 'APPROVED' | 'ACTIVE' | 'REJECTED'
        if (newStatus) setApprovalStatus(newStatus)
        if (newStatus === 'ACTIVE' || newStatus === 'REJECTED') clearInterval(interval)
      } catch {
        // silently ignore polling errors
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [pendingApproval, registeredUserId, approvalStatus])

  // ── CV MODE state ─────────────────────────────────────────────
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvPhase, setCvPhase] = useState<'upload' | 'uploading' | 'analyzing' | 'done' | 'password'>('upload')
  const [cvData, setCvData] = useState<any>(null)
  const [cvPassword, setCvPassword] = useState("")
  const [cvConfirmPassword, setCvConfirmPassword] = useState("")
  const [showCvPass, setShowCvPass] = useState(false)
  const [showCvConfirm, setShowCvConfirm] = useState(false)

  // ── MANUAL MODE state ─────────────────────────────────────────
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [role, setRole] = useState("TEAM_MEMBER")
  const [position, setPosition] = useState("")
  const [grade, setGrade] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [experience, setExperience] = useState("")
  const [manualCvFile, setManualCvFile] = useState<File | null>(null)
  const [githubUrl, setGithubUrl] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [gender, setGender] = useState<"Homme" | "Femme" | "">("")
  const [cvGender, setCvGender] = useState<"Homme" | "Femme" | "">("")

  // ── CV Dropzone ───────────────────────────────────────────────
  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setCvFile(files[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  const onDropManual = useCallback((files: File[]) => {
    if (files[0]) setManualCvFile(files[0])
  }, [])
  const { getRootProps: getManualRootProps, getInputProps: getManualInputProps, isDragActive: isManualDrag } = useDropzone({
    onDrop: onDropManual,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  // ── CV Analysis ───────────────────────────────────────────────
  const runCVAnalysis = async () => {
    if (!cvFile) return
    setError("")
    setCvPhase('uploading')
    await new Promise(r => setTimeout(r, 800))
    setCvPhase('analyzing')
    try {
      const fd = new FormData()
      fd.append("file", cvFile)
      const res = await axios.post(`${API_BASE_URL}/api/ai/analyze-cv`, fd)
      const data = res.data
      setCvData(data)
      await new Promise(r => setTimeout(r, 600))
      setCvPhase('done')
      await new Promise(r => setTimeout(r, 1200))
      setCvPhase('password')
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'analyse. Réessayez.")
      setCvPhase('upload')
    }
  }

  // ── Submit CV mode ────────────────────────────────────────────
  const handleCvSubmit = async () => {
    if (!cvPassword) return setError("Le mot de passe est requis.")
    if (cvPassword.length < 6) return setError("Minimum 6 caractères.")
    if (cvPassword !== cvConfirmPassword) return setError("Les mots de passe ne correspondent pas.")
    setError("")
    setLoading(true)
    try {
      const fullNameFromCv = `${cvData?.prenom || ''} ${cvData?.nom || ''}`.trim() || cvData?.full_name || (lang === 'fr' ? 'Utilisateur' : 'User')
      const emailFromCv = cvData?.email || ""
      if (!emailFromCv) throw new Error("L'IA n'a pas pu extraire l'email. Vérifiez votre CV.")

      const cvAvatarUrl = cvGender === 'Femme'
        ? '/girl-removebg-preview.png'
        : cvGender === 'Homme'
        ? '/boy-removebg-preview.png'
        : ''

      let uploadedCvUrl = "";
      if (cvFile) {
        const cvFd = new FormData();
        cvFd.append("file", cvFile);
        try {
          const cvRes = await axios.post(`${API_BASE_URL}/api/upload/cv`, cvFd);
          uploadedCvUrl = `${API_BASE_URL}${cvRes.data.url}`;
        } catch (e) {
          console.error("Failed to upload CV during registration", e);
        }
      }

      const res2 = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        full_name: fullNameFromCv,
        email: emailFromCv,
        phone_number: cvData?.telephone || "",
        password: cvPassword,
        role: "TEAM_MEMBER",
        position: cvData?.role || cvData?.position || "",
        grade: cvData?.grade || "",
        skills: Array.isArray(cvData?.competences) ? cvData.competences : [],
        experience: String(cvData?.experience || ""),
        github_url: cvData?.github_url || "",
        linkedin_url: cvData?.linkedin_url || "",
        gender: cvGender,
        avatar_url: cvAvatarUrl,
        cv_url: uploadedCvUrl,
      })

      const userId = res2?.data?.user_id
      setRegisteredEmail(emailFromCv)
      if (userId) setRegisteredUserId(userId)
      setApprovalStatus('PENDING')
      setPendingApproval(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Erreur lors de la création du compte.")
    } finally {
      setLoading(false)
    }
  }

  // ── Manual navigation ─────────────────────────────────────────
  const goNext = () => {
    setError("")
    if (step === 1) {
      if (!fullName.trim()) return setError("Le nom complet est requis.")
      if (!email.trim()) return setError("L'email est requis.")
      if (!password) return setError("Le mot de passe est requis.")
      if (password.length < 6) return setError("Minimum 6 caractères.")
      if (password !== confirmPassword) return setError("Les mots de passe ne correspondent pas.")
    }
    if (step === 2) {
      if (!position) return setError("Veuillez sélectionner un poste.")
      if (!grade) return setError("Veuillez sélectionner un grade.")
    }
    setDirection(1)
    setStep(s => s + 1)
  }

  const goBack = () => { setError(""); setDirection(-1); setStep(s => s - 1) }

  // ── Manual submit ─────────────────────────────────────────────
  const handleManualSubmit = async () => {
    setError("")
    setLoading(true)
    try {
      // Determine avatar based on gender
      const avatarUrl = gender === 'Femme'
        ? '/girl-removebg-preview.png'
        : gender === 'Homme'
        ? '/boy-removebg-preview.png'
        : ''
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        full_name: fullName, email, phone_number: phone, password, role,
        position, grade, skills: selectedSkills, experience,
        github_url: githubUrl, linkedin_url: linkedinUrl,
        gender, avatar_url: avatarUrl,
      })

      const resData = res?.data
      setRegisteredEmail(email)
      if (resData?.user_id) setRegisteredUserId(resData.user_id)
      setApprovalStatus('PENDING')
      setPendingApproval(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'inscription.")
    } finally {
      setLoading(false)
    }
  }

  const toggleSkill = (skill: string) =>
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  }

  const particles = useMemo(() => ({
    blue: [...Array(20)].map(() => ({
      width: Math.random() * 8 + 4 + "px", height: Math.random() * 8 + 4 + "px",
      left: Math.random() * 100 + "%", top: Math.random() * 100 + "%",
      duration: Math.random() * 6 + 6, xOffset: Math.random() * 30 - 15,
    })),
    red: [...Array(12)].map(() => ({
      width: Math.random() * 6 + 3 + "px", height: Math.random() * 6 + 3 + "px",
      left: Math.random() * 100 + "%", top: Math.random() * 100 + "%",
      duration: Math.random() * 7 + 5, xOffset: Math.random() * 30 - 15,
    })),
  }), [])

  return (
    <div className={`min-h-screen w-full flex items-center justify-center font-sans relative overflow-hidden py-8 transition-colors duration-700 ${theme === 'dark' ? 'bg-[#020617]' : 'bg-[#f1f5f9]'}`}>
      {/* Background */}
      <div className="absolute inset-0 z-0 transition-all duration-700">
        {theme === 'light' ? (
          <>
            <Image src="/images/custom_background.png" alt="bg" fill priority className="object-cover opacity-90" />
            <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
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

      {/* Particles */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {particles.blue.map((p, i) => (
            <motion.div key={`b${i}`} className={`absolute shadow-[0_0_10px_#00BCD4] ${theme === 'dark' ? 'bg-blue-400' : 'bg-[#00BCD4]'}`}
              style={{ width: p.width, height: p.height, left: p.left, top: p.top, borderRadius: "1px", opacity: 0.7 }}
              animate={{ y: [0, -120, 0], x: [0, p.xOffset, 0], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          {particles.red.map((p, i) => (
            <motion.div key={`r${i}`} className={`absolute shadow-[0_0_10px_#FF0000] ${theme === 'dark' ? 'bg-rose-500' : 'bg-[#FF0000]'}`}
              style={{ width: p.width, height: p.height, left: p.left, top: p.top, borderRadius: "1px", opacity: 0.7 }}
              animate={{ y: [0, 90, 0], x: [0, p.xOffset, 0], opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: p.duration, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </div>
      )}

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[440px] relative z-10 px-4"
      >
        {/* Corner accents */}
        <div className="absolute inset-x-4 inset-y-0 pointer-events-none z-20">
          <motion.div
            className="absolute top-[-1px] left-[-1px] w-[115px] h-[115px] rounded-tl-[32px] border-t-[3px] border-l-[3px] border-[#e63946]/90"
            animate={{ filter: ["drop-shadow(0 0 3px rgba(230,57,70,0.5))", "drop-shadow(0 0 8px rgba(230,57,70,1))", "drop-shadow(0 0 3px rgba(230,57,70,0.5))"] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-[-1px] right-[-1px] w-[115px] h-[115px] rounded-br-[32px] border-b-[3px] border-r-[3px] border-[#00BCD4]/90"
            animate={{ filter: ["drop-shadow(0 0 3px rgba(0,188,212,0.5))", "drop-shadow(0 0 8px rgba(0,188,212,1))", "drop-shadow(0 0 3px rgba(0,188,212,0.5))"] }}
            transition={{ duration: 4, repeat: Infinity, delay: 2 }}
          />
        </div>

        <div
          className={`w-full backdrop-blur-3xl rounded-[32px] px-8 sm:px-10 pt-8 pb-6 relative transition-all duration-500 ${
            theme === 'dark' 
              ? 'bg-[#0f172a]/60 border border-blue-500/20 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(30,58,138,0.3)]' 
              : 'bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.1),inset_0_0_0_1px_rgba(255,255,255,0.6)]'
          }`}
          style={theme === 'light' ? { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6), -15px 0 45px -15px rgba(255,0,0,0.2), 15px 0 45px -15px rgba(0,188,212,0.2), 0 10px 40px -10px rgba(0,0,0,0.1)' } : {}}
        >
          {/* Pending Approval Overlay */}
          <AnimatePresence>
            {pendingApproval && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`absolute inset-0 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center z-30 gap-5 px-8 py-10 transition-colors duration-500 ${
                  theme === 'dark' ? 'bg-[#020617]/98' : 'bg-white/98'
                }`}
              >
                {/* Animated clock icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                    <span className="text-4xl">⏳</span>
                  </div>
                  {[0, 1].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 2], opacity: [0.4, 0] }}
                      transition={{ duration: 2, delay: i * 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-amber-300"
                    />
                  ))}
                </motion.div>

                <div className="text-center space-y-2">
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-[21px] font-[900] text-[#0f172a]"
                  >
                    Demande envoyée ! 🎉
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-[13px] text-gray-500 font-[600] leading-relaxed"
                  >
                    Votre demande a bien été soumise au manager.<br/>Vous recevrez un email de confirmation à <strong className="text-[#00BCD4]">{registeredEmail}</strong> une fois approuvée.
                  </motion.p>
                </div>

                {/* Steps — update dynamically based on polled approvalStatus */}
                <div className="w-full space-y-3 mt-2">
                  {([
                    {
                      icon: "✅",
                      label: "Compte créé avec succès",
                      done: true,
                      pending: false,
                    },
                    {
                      icon: approvalStatus === 'APPROVED' || approvalStatus === 'ACTIVE' ? "✅" : "👀",
                      label: "En attente d'approbation du manager",
                      done: approvalStatus === 'APPROVED' || approvalStatus === 'ACTIVE',
                      pending: approvalStatus === 'PENDING',
                    },
                    {
                      icon: approvalStatus === 'ACTIVE' ? "✅" : "📧",
                      label: "Email de confirmation à recevoir",
                      done: approvalStatus === 'ACTIVE',
                      pending: approvalStatus === 'APPROVED',
                    },
                  ] as { icon: string; label: string; done: boolean; pending: boolean }[]).map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.15 }}
                      className={`flex items-center gap-3 p-3 rounded-[14px] transition-all duration-500 ${
                        s.done
                          ? 'bg-emerald-50 border border-emerald-200'
                          : s.pending
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-slate-50 border border-slate-100'
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <p className={`text-[12px] font-[700] transition-colors duration-500 ${
                        s.done ? 'text-emerald-700' : s.pending ? 'text-amber-600' : 'text-slate-400'
                      }`}>{s.label}</p>
                      {s.pending && (
                        <motion.div
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="ml-auto w-2 h-2 rounded-full bg-amber-400"
                        />
                      )}
                    </motion.div>
                  ))}
                </div>

                <motion.a
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  href="/login"
                  className="text-[12px] font-[700] text-[#00BCD4] hover:underline"
                >
                  Retour à la connexion →
                </motion.a>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success overlay (legacy, kept for compatibility) */}
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
                <p className="text-[13px] text-gray-500">Redirection...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <div className="flex flex-col items-center justify-center text-center mb-4">
            <div className="relative w-7 h-7 mb-3">
              <div className="absolute top-0 left-0 w-3.5 h-3.5 bg-[#ff0000]" />
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00BCD4]" />
            </div>
            <h1 className="text-[28px] font-[900] text-[#0f172a] dark:text-blue-50 tracking-[0.14em] mr-[-0.14em] leading-none mb-1 transition-colors duration-500">NETINFO</h1>
            <p className="text-[9px] font-[800] text-gray-500 dark:text-blue-400/60 tracking-[0.22em] mr-[-0.22em] uppercase transition-colors duration-500">{lang === 'fr' ? "ÉCOLE D'ART ET DE TECHNOLOGIE" : "SCHOOL OF ART AND TECHNOLOGY"}</p>
          </div>

          <AnimatePresence mode="wait">

            {/* ═══════════════════════════════════════════
                CHOICE SCREEN
            ═══════════════════════════════════════════ */}
            {mode === 'choice' && (
              <motion.div
                key="choice"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="text-center mb-4">
                  <h2 className="text-[17px] font-[900] text-[#1e293b] dark:text-blue-100 mb-0.5 transition-colors duration-500">{lang === 'fr' ? 'Créer un compte' : 'Create an account'}</h2>
                  <p className="text-[11px] font-[600] text-gray-400 dark:text-blue-400/60 transition-colors duration-500">{lang === 'fr' ? 'Comment souhaitez-vous vous inscrire ?' : 'How would you like to sign up?'}</p>
                </div>

                {/* CV Card — compact */}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => { setMode('cv'); setCvPhase('upload') }}
                  className={`w-full rounded-[18px] px-4 py-3.5 text-left relative overflow-hidden group border-[1.5px] transition-all duration-300 ${
                    theme === 'dark'
                      ? 'border-blue-500/20 bg-gradient-to-r from-blue-900/40 to-blue-950/40 hover:border-blue-400/40 hover:from-blue-900/60 hover:to-blue-950/60 shadow-[0_4px_20px_rgba(30,58,138,0.3)]'
                      : 'border-[#00BCD4]/25 bg-gradient-to-r from-[#00BCD4]/8 to-[#ff0000]/6 hover:border-[#00BCD4]/50 hover:from-[#00BCD4]/12 hover:to-[#ff0000]/10 shadow-[0_2px_12px_rgba(0,188,212,0.08)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="w-11 h-11 rounded-[14px] bg-gradient-to-br from-[#00BCD4] to-[#ff0000] flex items-center justify-center shadow-[0_4px_14px_rgba(0,188,212,0.35)] shrink-0">
                      <NoselessBot className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-[900] text-[#1e293b] dark:text-blue-50">{lang === 'fr' ? 'Analyse CV par IA' : 'AI CV Analysis'}</span>
                        <span className="px-1.5 py-px rounded-full bg-gradient-to-r from-[#00BCD4] to-[#ff0000] text-white text-[8.5px] font-[800] uppercase tracking-wide">AI</span>
                      </div>
                      <p className="text-[10.5px] text-gray-400 dark:text-blue-400/60 font-[600] mt-0.5">{lang === 'fr' ? 'Upload PDF → extraction auto des compétences' : 'Upload PDF → auto skill extraction'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#00BCD4] dark:text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-0.5">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                  <span className="text-[10px] font-[700] text-gray-300 tracking-wider">OU</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                </div>

                {/* Manual Card — compact */}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => { setMode('manual'); setStep(1) }}
                  className={`w-full rounded-[18px] px-4 py-3.5 text-left relative overflow-hidden group border-[1.5px] transition-all duration-300 ${
                    theme === 'dark'
                      ? 'border-blue-900/40 bg-blue-950/40 hover:border-blue-500/40 hover:bg-blue-900/40 shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
                      : 'border-gray-100 bg-white/60 hover:border-gray-200 hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[14px] bg-[#1e293b] dark:bg-blue-900 flex items-center justify-center shadow-md shrink-0">
                      <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[13px] font-[900] text-[#1e293b] dark:text-blue-50 block">{lang === 'fr' ? 'Remplir manuellement' : 'Fill in manually'}</span>
                      <p className="text-[10.5px] text-gray-400 dark:text-blue-400/60 font-[600] mt-0.5">{lang === 'fr' ? 'Formulaire étape par étape' : 'Step-by-step form'}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-blue-800 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.button>

                <div className="text-center pt-1">
                  <p className="text-[11px] font-[600] text-gray-400">
                    {lang === 'fr' ? 'Déjà un compte ?' : 'Already have an account?'}{" "}
                    <a href="/login" className="font-[800] text-[#00BCD4] hover:text-[#0096a8] transition-colors">
                      {lang === 'fr' ? 'Se connecter →' : 'Sign in →'}
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                CV MODE
            ═══════════════════════════════════════════ */}
            {mode === 'cv' && (
              <motion.div
                key="cv-mode"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
              >
                {/* Header (Bright Glassmorphism Gamified) */}
                <div className="flex items-center gap-3 mb-5">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setMode('choice'); setCvPhase('upload'); setCvFile(null); setCvData(null); setError("") }}
                    className={`w-8 h-8 rounded-[12px] flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
                      theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/20 text-blue-400 hover:border-blue-400' : 'bg-white border border-gray-100 text-gray-500 hover:border-[#00BCD4]/40 hover:text-[#00BCD4]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
                  </motion.button>
                  <div>
                    <h2 className="text-[17px] font-[900] text-[#1e293b] dark:text-blue-50 tracking-tight transition-colors">{lang === 'fr' ? 'Scanner IA' : 'AI Scanner'} <span className="text-[#00BCD4]">Pro</span></h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] animate-pulse" />
                      <p className="text-[10px] font-[700] text-gray-400 dark:text-blue-800 uppercase tracking-widest transition-colors">{lang === 'fr' ? 'En attente de document' : 'Waiting for document'}</p>
                    </div>
                  </div>
                  <div className="ml-auto relative group">
                    <div className="absolute inset-0 bg-[#00BCD4] blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                    <div className={`relative w-10 h-10 rounded-[14px] flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(0,188,212,0.1)] transition-colors ${
                      theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/20' : 'bg-gradient-to-br from-white to-gray-50 border border-gray-100'
                    }`}>
                      <NoselessBot className="w-4.5 h-4.5 text-[#00BCD4]" strokeWidth={2} />
                    </div>
                  </div>
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-1.5 py-1.5 px-3 mb-3 bg-red-50/80 border border-red-100 rounded-full"
                    >
                      <div className="w-1 h-1 bg-[#ff0000] rounded-full animate-pulse" />
                      <span className="text-[11px] font-[700] text-[#ff0000]">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">

                  {/* ── UPLOAD PHASE (Gamified Light UI) ── */}
                  {cvPhase === 'upload' && (
                    <motion.div key="upload" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-4">
                      
                      {/* Soft Glassy Interactive Drop Zone */}
                      <div
                        {...getRootProps()}
                        className={`w-full relative overflow-hidden rounded-[24px] cursor-pointer transition-all duration-300 ease-out backdrop-blur-sm ${
                          theme === 'dark' ? 'bg-blue-950/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)]' : 'bg-white/40'
                        } ${
                          isDragActive ? 'scale-[1.02] shadow-[0_10px_30px_rgba(0,188,212,0.15)]' : 'hover:scale-[1.01] hover:shadow-[0_8px_25px_rgba(0,0,0,0.04)] shadow-[0_4px_15px_rgba(0,0,0,0.02)]'
                        }`}
                        style={{ minHeight: '190px' }}
                      >
                        {/* Light grid pattern overlay */}
                        <div className="absolute inset-0 opacity-[0.4]" 
                             style={{ backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                        
                        {/* Soft Ambient glowing blob behind */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#00BCD4] rounded-full blur-[80px] opacity-10 pointer-events-none" />

                        {/* Scanner line animation when empty & not active */}
                        {!cvFile && !isDragActive && (
                          <motion.div 
                            className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00BCD4] to-transparent opacity-20 z-10"
                            animate={{ top: ['0%', '100%', '0%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            style={{ boxShadow: '0 0 4px rgba(0,188,212,0.3)' }}
                          />
                        )}

                        {/* Animated borders with gradient */}
                        <div className="absolute inset-0 p-[2px] rounded-[24px]">
                           <div className={`w-full h-full rounded-[22px] border-[2px] border-dashed ${
                               isDragActive ? 'border-[#00BCD4]' 
                               : cvFile ? 'border-[#00BCD4]/40 border-solid bg-[#00BCD4]/[0.02]' 
                               : 'border-gray-200'
                             }`} />
                        </div>

                        <div className="relative z-20 h-full py-8 px-6 flex flex-col items-center justify-center gap-3 text-center">
                          <input {...getInputProps()} />

                          {cvFile ? (
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center w-full">
                              <div className="w-16 h-16 mb-2 rounded-[18px] bg-white border border-gray-100 flex items-center justify-center relative shadow-[0_8px_20px_rgba(0,188,212,0.15)] group-hover:shadow-[0_10px_25px_rgba(0,188,212,0.25)] transition-all">
                                <FileText className="w-8 h-8 text-[#00BCD4]" strokeWidth={1.5} />
                                <motion.div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#10b981] border-[2.5px] border-white flex items-center justify-center shadow-sm"
                                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                </motion.div>
                              </div>
                              <p className="text-[14px] font-[800] text-[#1e293b] truncate max-w-[90%] leading-tight">{cvFile.name}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-[#00BCD4] font-[800] bg-[#00BCD4]/10 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                                  PDF
                                </span>
                                <span className="text-[10px] text-gray-500 font-[700] uppercase tracking-wide">
                                  {(cvFile.size / 1024).toFixed(0)} KB
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setCvFile(null) }}
                                className="mt-3.5 px-4 py-1.5 rounded-full bg-white hover:bg-gray-50 text-gray-400 hover:text-red-500 text-[11px] font-[700] transition-colors border border-gray-200 flex items-center gap-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.02)]"
                              >
                                <X className="w-3 h-3" /> Supprimer
                              </button>
                            </motion.div>
                          ) : (
                            <>
                              <div className="relative mb-1">
                                {/* Soft Rings */}
                                <div className="absolute inset-0 rounded-full border border-[#00BCD4]/10 animate-ping" style={{ animationDuration: '3s' }} />
                                <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#00BCD4]/10 to-[#00BCD4]/5 flex items-center justify-center shadow-inner relative z-10">
                                  <Upload className={`w-7 h-7 transition-colors duration-300 ${isDragActive ? 'text-[#00BCD4] scale-110' : 'text-[#00BCD4]/60'}`} strokeWidth={2} />
                                </div>
                                {/* Floating cute icon */}
                                <motion.div
                                  animate={{ y: [-4, 4, -4], rotate: [0, 8, -8, 0] }}
                                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                  className="absolute -top-3 -right-3 w-8 h-8 rounded-[12px] bg-gradient-to-br from-[#ff0000] to-[#ff4d4d] flex items-center justify-center shadow-[0_4px_12px_rgba(255,0,0,0.3)] z-20 border-2 border-white"
                                >
                                  <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
                                </motion.div>
                              </div>
                              
                              <div className="mt-2">
                                <h3 className={`text-[15px] font-[900] tracking-wider uppercase mb-1 transition-colors ${isDragActive ? 'text-[#00BCD4]' : 'text-[#1e293b]'}`}>
                                  {isDragActive ? 'Lâchez le fichier...' : 'Glissez votre CV ici'}
                                </h3>
                                <p className="text-[12px] text-gray-500 font-[600] mt-0.5">
                                  Format PDF uniquement. (Max 5 Mo)
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {/* Analyze button (Light gamified) */}
                        <motion.button
                          whileHover={cvFile ? { scale: 1.015 } : {}}
                          whileTap={cvFile ? { scale: 0.98 } : {}}
                          onClick={runCVAnalysis}
                          disabled={!cvFile}
                          className={`flex-1 relative rounded-[20px] h-[54px] overflow-hidden group transition-all duration-300 ${
                            cvFile 
                              ? 'bg-gradient-to-br from-[#00BCD4] to-[#0096a8] shadow-[0_8px_25px_rgba(0,188,212,0.3)]' 
                              : 'bg-white border border-gray-200 cursor-not-allowed shadow-sm'
                          }`}
                        >
                          {cvFile && (
                            <>
                              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                              {/* Shining effect */}
                              <motion.div 
                                className="absolute top-0 bottom-0 w-[40px] bg-white/30 skew-x-[-20deg]"
                                animate={{ left: ['-100%', '200%'] }}
                                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                              />
                            </>
                          )}
                          
                          <div className="relative z-10 h-full flex items-center justify-center gap-2">
                            {cvFile ? (
                              <>
                                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
                                <span className="text-[14px] font-[900] text-white tracking-widest uppercase">Lancer l'Analyse</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 text-gray-300" strokeWidth={2.5} />
                                <span className="text-[13px] font-[800] text-gray-400 uppercase tracking-widest">En attente...</span>
                              </>
                            )}
                          </div>
                        </motion.button>
                        
                        {/* Mini Features column */}
                        <div className="w-[100px] flex flex-col gap-2">
                          <div className={`flex items-center gap-2 rounded-[14px] px-2 h-full justify-center shadow-sm transition-colors ${
                            theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/10' : 'bg-white border border-gray-100'
                          }`}>
                            <span className="text-[16px]">⚡</span>
                            <span className="text-[9px] font-[800] text-[#00BCD4] dark:text-blue-400 uppercase">Express</span>
                          </div>
                          <div className={`flex items-center gap-2 rounded-[14px] px-2 h-full justify-center shadow-sm transition-colors ${
                            theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/10' : 'bg-white border border-gray-100'
                          }`}>
                            <span className="text-[16px]">🎯</span>
                            <span className="text-[9px] font-[800] text-[#ff0000] dark:text-rose-400 uppercase">Précis</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ── PROCESSING PHASES ── */}
                  {(cvPhase === 'uploading' || cvPhase === 'analyzing' || cvPhase === 'done') && (
                    <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <SpinningRobot phase={cvPhase as any} />
                    </motion.div>
                  )}

                  {/* ── PASSWORD PHASE ── */}
                  {cvPhase === 'password' && cvData && (
                    <motion.div key="password" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                      {/* Profile preview card */}
                      <motion.div
                        initial={{ scale: 0.95 }}
                        animate={{ scale: 1 }}
                        className={`rounded-[18px] border p-4 transition-colors duration-500 ${
                          theme === 'dark' 
                            ? 'bg-blue-900/10 border-blue-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                            : 'bg-gradient-to-br from-emerald-50 to-[#00BCD4]/10 border-emerald-200/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00BCD4] to-[#ff0000] flex items-center justify-center shadow-md">
                            <ShieldCheck className="w-5 h-5 text-white" strokeWidth={2} />
                          </div>
                          <div>
                            <p className="text-[13px] font-[900] text-[#1e293b] dark:text-blue-50 transition-colors">
                              {`${cvData.prenom || ''} ${cvData.nom || ''}`.trim() || "Profil extrait"}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-blue-400/60 font-[600] transition-colors">{cvData.email || "email non détecté"}</p>
                            {cvData.telephone && (
                              <p className="text-[11px] text-gray-400 dark:text-blue-800 font-[600] transition-colors">{cvData.telephone}</p>
                            )}
                          </div>
                          <div className="ml-auto">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                          {cvData.role && (
                            <div className="bg-white/70 dark:bg-blue-900/20 rounded-[10px] px-2.5 py-1.5 transition-colors">
                              <p className="text-[8.5px] text-gray-400 dark:text-blue-500 font-[700] uppercase">Rôle</p>
                              <p className="text-[11px] font-[800] text-gray-700 dark:text-blue-200 truncate">{cvData.role}</p>
                            </div>
                          )}
                          {cvData.grade && (
                            <div className="bg-white/70 dark:bg-blue-900/20 rounded-[10px] px-2.5 py-1.5 transition-colors">
                              <p className="text-[8.5px] text-gray-400 dark:text-blue-500 font-[700] uppercase">Grade</p>
                              <p className="text-[11px] font-[800] text-gray-700 dark:text-blue-200">{cvData.grade}</p>
                            </div>
                          )}
                        </div>

                        {/* LinkedIn / GitHub links */}
                        {(cvData.linkedin_url || cvData.github_url) && (
                          <div className="flex flex-col gap-1 mb-2.5">
                            {cvData.linkedin_url && (
                              <div className="flex items-center gap-1.5">
                                <Linkedin className="w-3 h-3 text-[#0077b5]" strokeWidth={2} />
                                <p className="text-[10px] font-[600] text-[#0077b5] truncate">{cvData.linkedin_url}</p>
                              </div>
                            )}
                            {cvData.github_url && (
                              <div className="flex items-center gap-1.5">
                                <Github className="w-3 h-3 text-gray-600" strokeWidth={2} />
                                <p className="text-[10px] font-[600] text-gray-600 truncate">{cvData.github_url}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {cvData.competences?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {cvData.competences.slice(0, 6).map((c: string) => (
                              <span key={c} className="px-2 py-0.5 bg-[#00BCD4]/15 text-[#00BCD4] rounded-full text-[10px] font-[700]">{c}</span>
                            ))}
                            {cvData.competences.length > 6 && (
                              <span className="text-[10px] text-gray-400 font-[600] self-center">+{cvData.competences.length - 6}</span>
                            )}
                          </div>
                        )}
                      </motion.div>

                        <div className="grid grid-cols-2 gap-2 mb-2 px-0.5 mt-1">
                          {(["Homme", "Femme"] as const).map((g) => {
                            const isSelected = cvGender === g
                            const imgSrc = g === 'Homme' ? '/boy-removebg-preview.png' : '/girl-removebg-preview.png'
                            const label = lang === 'fr' ? g : (g === 'Homme' ? 'Male' : 'Female')
                            return (
                              <motion.button
                                key={g}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setCvGender(g)}
                                className={`relative flex items-center gap-1.5 py-1 px-2.5 rounded-[10px] border-[1.5px] transition-all duration-250 ${
                                  isSelected
                                    ? (theme === 'dark' ? 'border-blue-400 bg-blue-900/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-[#00BCD4] bg-[#00BCD4]/8 shadow-[0_0_0_2px_rgba(0,188,212,0.12)]')
                                    : (theme === 'dark' ? 'border-blue-900/40 bg-blue-950/20 hover:border-blue-400/40' : 'border-gray-200 bg-white/60 hover:border-[#00BCD4]/40')
                                }`}
                              >
                                {isSelected && theme === 'light' && (
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-[#00BCD4]/8 to-transparent"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  />
                                )}
                                <img src={imgSrc} alt={label}
                                  className={`w-5 h-5 object-contain z-10 transition-all duration-300 ${isSelected ? 'drop-shadow-[0_1px_2px_rgba(0,188,212,0.4)]' : 'opacity-60 grayscale'}`}
                                />
                                <span className={`text-[11px] font-[700] z-10 ${isSelected ? (theme === 'dark' ? 'text-blue-300' : 'text-[#00BCD4]') : (theme === 'dark' ? 'text-blue-800' : 'text-gray-500')}`}>{label}</span>
                                {isSelected && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="ml-auto w-3 h-3 rounded-full bg-[#00BCD4] flex items-center justify-center z-10">
                                    <CheckCircle2 className="w-2 h-2 text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>

                      {/* Password fields */}
                      <div className="space-y-2.5">
                        <p className="text-[12px] font-[800] text-[#475569] dark:text-blue-400 px-1 transition-colors">Choisissez un mot de passe</p>
                        <FieldInput
                          icon={Lock} type={showCvPass ? "text" : "password"}
                          placeholder="Mot de passe (min. 6 car.)"
                          value={cvPassword} onChange={setCvPassword}
                          rightEl={
                            <button type="button" onClick={() => setShowCvPass(!showCvPass)} className="text-[#00BCD4] hover:text-[#0096a8] transition-colors">
                              {showCvPass ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                            </button>
                          }
                        />
                        <FieldInput
                          icon={Lock} type={showCvConfirm ? "text" : "password"}
                          placeholder="Confirmer le mot de passe"
                          value={cvConfirmPassword} onChange={setCvConfirmPassword}
                          rightEl={
                            <button type="button" onClick={() => setShowCvConfirm(!showCvConfirm)} className="text-[#00BCD4] hover:text-[#0096a8] transition-colors">
                              {showCvConfirm ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}
                            </button>
                          }
                        />
                      </div>

                      {/* Submit */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCvSubmit}
                        disabled={loading}
                        className="w-full py-[13px] rounded-[16px] bg-gradient-to-r from-[#00BCD4] to-[#019ab3] text-white text-[14px] font-[900] flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(0,188,212,0.3)] disabled:opacity-70 hover:shadow-[0_8px_25px_rgba(0,188,212,0.4)] transition-all"
                      >
                        {loading ? (
                          <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>Création du compte...</>
                        ) : (
                          <><CheckCircle2 className="w-4 h-4" /> {lang === 'fr' ? 'Créer mon compte' : 'Create account'}</>
                        )}
                      </motion.button>
                    </motion.div>
                  )}

                </AnimatePresence>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════
                MANUAL MODE
            ═══════════════════════════════════════════ */}
            {mode === 'manual' && (
              <motion.div
                key="manual-mode"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setMode('choice'); setStep(1); setError("") }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/20 text-blue-400 hover:bg-blue-900/60' : 'bg-white/70 border border-gray-200 text-gray-500 hover:bg-white'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  <div>
                    <h2 className="text-[16px] font-[900] text-[#1e293b] dark:text-blue-50 transition-colors">{lang === 'fr' ? 'Inscription' : 'Sign Up'}</h2>
                    <p className="text-[11px] font-[600] text-gray-400 dark:text-blue-800 transition-colors">{lang === 'fr' ? 'Accédez à votre espace SMA' : 'Access your SMA workspace'}</p>
                  </div>
                </div>

                {/* Step progress */}
                <div className="flex items-center justify-center gap-0 mb-4">
                  {MANUAL_STEPS.map((s, i) => {
                    const StepIcon = s.icon
                    const isActive = step === s.id
                    const isDone = step > s.id
                    return (
                      <div key={s.id} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                          <motion.div
                            animate={{
                              background: isDone ? "#00BCD4" : isActive ? "linear-gradient(135deg,#00BCD4,#019ab3)" : (theme === 'dark' ? "rgba(30,58,138,0.3)" : "rgba(241,245,249,0.9)"),
                              boxShadow: isActive ? (theme === 'dark' ? "0 0 15px rgba(59,130,246,0.5)" : "0 0 0 3px rgba(0,188,212,0.2)") : "none",
                              scale: isActive ? 1.1 : 1,
                            }}
                            transition={{ duration: 0.3 }}
                            className={`w-9 h-9 rounded-full flex items-center justify-center border-[1.5px] transition-colors ${
                              isDone || isActive ? "border-[#00BCD4]" : (theme === 'dark' ? "border-blue-900" : "#e2e8f0")
                            }`}
                          >
                            {isDone
                              ? <CheckCircle2 className="w-4 h-4 text-white" />
                              : <StepIcon className={`w-4 h-4 ${isActive ? "text-white" : (theme === 'dark' ? "text-blue-900" : "text-gray-400")}`} strokeWidth={2.5} />
                            }
                          </motion.div>
                          <span className={`text-[9px] font-[700] uppercase tracking-wider transition-colors ${isActive ? (theme === 'dark' ? "text-blue-400" : "text-[#00BCD4]") : isDone ? "text-[#00BCD4]/70" : (theme === 'dark' ? "text-blue-900" : "text-gray-400")}`}>

                            {lang === 'fr' ? s.label : (s.label === 'Profil' ? 'Profile' : s.label === 'Poste' ? 'Role' : s.label === 'Compétences' ? 'Skills' : 'Links')}
                          </span>
                        </div>
                        {i < MANUAL_STEPS.length - 1 && (
                          <div className={`w-8 h-[2px] mb-4 mx-1 transition-colors ${step > s.id ? "bg-[#00BCD4]" : (theme === 'dark' ? "bg-blue-900/40" : "bg-slate-100")}`} />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center gap-1.5 py-1 px-3 mb-2 bg-red-50/80 border border-red-100 rounded-full"
                    >
                      <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                      <span className="text-[11px] font-[700] text-red-600">{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="overflow-hidden">
                  <AnimatePresence mode="wait" custom={direction}>

                    {/* STEP 1 */}
                    {step === 1 && (
                      <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.3 }} className="space-y-2.5">
                        <p className="text-[13px] font-[800] text-[#1e293b] dark:text-blue-100 mb-2 transition-colors">{lang === 'fr' ? 'Informations personnelles' : 'Personal information'}</p>
                        <FieldInput icon={User} placeholder={lang === 'fr' ? "Nom et prénom" : "Full name"} value={fullName} onChange={setFullName} required />
                        <FieldInput icon={Mail} type="email" placeholder={lang === 'fr' ? "votre@email.com" : "your@email.com"} value={email} onChange={setEmail} required />
                        <FieldInput icon={Phone} type="tel" placeholder={lang === 'fr' ? "Téléphone (optionnel)" : "Phone (optional)"} value={phone} onChange={setPhone} />
                        <FieldInput icon={Lock} type={showPassword ? "text" : "password"} placeholder={lang === 'fr' ? "Mot de passe (min. 6 car.)" : "Password (min. 6 chars.)"} value={password} onChange={setPassword} required
                          rightEl={<button type="button" onClick={() => setShowPassword(!showPassword)} className="text-[#00BCD4]">{showPassword ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}</button>}
                        />
                        <FieldInput icon={Lock} type={showConfirm ? "text" : "password"} placeholder={lang === 'fr' ? "Confirmer le mot de passe" : "Confirm password"} value={confirmPassword} onChange={setConfirmPassword} required
                          rightEl={<button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-[#00BCD4]">{showConfirm ? <Eye className="h-4 w-4" strokeWidth={2.5} /> : <EyeOff className="h-4 w-4" strokeWidth={2.5} />}</button>}
                        />

                        <div className="grid grid-cols-2 gap-2 px-0.5 mb-1 mt-1">
                          {(["Homme", "Femme"] as const).map((g) => {
                            const isSelected = gender === g
                            const imgSrc = g === 'Homme' ? '/boy-removebg-preview.png' : '/girl-removebg-preview.png'
                            const label = lang === 'fr' ? g : (g === 'Homme' ? 'Male' : 'Female')
                            return (
                              <motion.button
                                key={g}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setGender(g)}
                                className={`relative flex items-center gap-1.5 py-1 px-2.5 rounded-[10px] border-[1.5px] transition-all duration-250 ${
                                  isSelected
                                    ? (theme === 'dark' ? 'border-blue-400 bg-blue-900/40 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-[#00BCD4] bg-[#00BCD4]/8 shadow-[0_0_0_2px_rgba(0,188,212,0.12)]')
                                    : (theme === 'dark' ? 'border-blue-900/40 bg-blue-950/20 hover:border-blue-400/40' : 'border-gray-200 bg-white/60 hover:border-[#00BCD4]/40')
                                }`}
                              >
                                {isSelected && theme === 'light' && (
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-[#00BCD4]/8 to-transparent"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  />
                                )}
                                <img src={imgSrc} alt={label}
                                  className={`w-5 h-5 object-contain z-10 transition-all duration-300 ${isSelected ? 'drop-shadow-[0_1px_2px_rgba(0,188,212,0.4)]' : 'opacity-60 grayscale'}`}
                                />
                                <span className={`text-[11px] font-[700] z-10 ${
                                  isSelected ? (theme === 'dark' ? 'text-blue-300' : 'text-[#00BCD4]') : (theme === 'dark' ? 'text-blue-800' : 'text-gray-500')
                                }`}>{label}</span>
                                {isSelected && (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="ml-auto w-3 h-3 rounded-full bg-[#00BCD4] flex items-center justify-center z-10">
                                    <CheckCircle2 className="w-2 h-2 text-white" />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>

                      </motion.div>
                    )}

                    {/* STEP 2 */}
                    {step === 2 && (
                      <motion.div key="s2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.3 }} className="space-y-2.5">
                        <p className="text-[13px] font-[800] text-[#1e293b] dark:text-blue-50 mb-2 transition-colors">{lang === 'fr' ? 'Informations professionnelles' : 'Professional information'}</p>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">{lang === 'fr' ? 'Rôle' : 'Role'}</label>
                          <div className="flex gap-2 flex-wrap">
                            {ROLES.map(r => (
                              <motion.button key={r.value} type="button" whileTap={{ scale: 0.96 }} onClick={() => setRole(r.value)}
                                className={`px-3 py-2 rounded-[14px] text-[12px] font-[700] border-[1.5px] transition-all duration-200 ${
                                  role === r.value 
                                    ? "bg-[#00BCD4] border-[#00BCD4] text-white shadow-[0_2px_8px_rgba(0,188,212,0.35)]" 
                                    : (theme === 'dark' ? "bg-blue-900/40 border-blue-500/20 text-blue-300 hover:border-blue-400/40" : "bg-white/60 border-gray-200 text-gray-600 hover:border-[#00BCD4]/40")
                                }`}
                              >{r.label}</motion.button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">{lang === 'fr' ? 'Poste' : 'Position'}</label>
                          <div className="relative flex items-center">
                            <Briefcase className="absolute left-4 h-[16px] w-[16px] text-[#00BCD4] z-10" strokeWidth={2.5} />
                            <select value={position} onChange={e => setPosition(e.target.value)}
                              className="w-full pl-[42px] pr-4 py-[10px] rounded-[14px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[13px] text-gray-800 dark:text-blue-50 font-[600] transition-all appearance-none">
                              <option value="">{lang === 'fr' ? 'Sélectionner un poste...' : 'Select a position...'}</option>
                              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">{lang === 'fr' ? 'Grade' : 'Level'}</label>
                          <div className="flex gap-2 flex-wrap">
                            {GRADES.map(g => (
                              <motion.button key={g} type="button" whileTap={{ scale: 0.96 }} onClick={() => setGrade(g)}
                                className={`px-3 py-1.5 rounded-[12px] text-[12px] font-[700] border-[1.5px] transition-all duration-200 ${
                                  grade === g 
                                    ? "bg-[#e63946] border-[#e63946] text-white shadow-[0_2px_8px_rgba(230,57,70,0.3)]" 
                                    : (theme === 'dark' ? "bg-blue-900/40 border-blue-500/20 text-blue-300 hover:border-rose-400/40" : "bg-white/60 border-gray-200 text-gray-600 hover:border-[#e63946]/30")
                                }`}
                              >{g}</motion.button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 3 */}
                    {step === 3 && (
                      <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.3 }} className="space-y-3">
                        <p className="text-[13px] font-[800] text-[#1e293b] dark:text-blue-50 mb-2 transition-colors">{lang === 'fr' ? 'Profil professionnel' : 'Professional profile'}</p>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">{lang === 'fr' ? 'CV (PDF) — optionnel' : 'Resume (PDF) — optional'}</label>
                          <div
                            {...getManualRootProps()}
                            className={`w-full rounded-[16px] border-[2px] border-dashed transition-all cursor-pointer py-4 px-4 flex flex-col items-center gap-2 ${
                              isManualDrag 
                                ? "border-[#00BCD4] bg-[#00BCD4]/5" 
                                : manualCvFile 
                                  ? "border-[#00BCD4]/60 bg-[#00BCD4]/5" 
                                  : (theme === 'dark' ? "border-blue-900 bg-blue-950/20 hover:border-blue-500/40" : "border-gray-200 bg-white/50 hover:border-[#00BCD4]/40")
                            }`}
                          >
                            <input {...getManualInputProps()} />
                            {manualCvFile ? (
                              <div className="flex items-center gap-2 w-full">
                                <FileText className="w-5 h-5 text-[#00BCD4] shrink-0" strokeWidth={2} />
                                <span className="text-[13px] font-[700] text-[#00BCD4] truncate flex-1">{manualCvFile.name}</span>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setManualCvFile(null) }} className="text-gray-400 hover:text-red-400">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-7 h-7 text-gray-300" strokeWidth={1.5} />
                                <p className="text-[12px] font-[700] text-gray-400">{isManualDrag ? (lang === 'fr' ? 'Déposez ici...' : 'Drop here...') : (lang === 'fr' ? 'Glissez votre CV' : 'Drop your resume')}</p>
                              </>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">
                            {lang === 'fr' ? 'Compétences' : 'Skills'}
                            <span className="ml-1.5 text-[10px] font-[600] text-gray-400 dark:text-blue-800 transition-colors">({selectedSkills.length} {lang === 'fr' ? `sélectionnée${selectedSkills.length > 1 ? 's' : ''}` : 'selected'})</span>
                          </label>
                          <div className={`flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto pr-1 ${theme === 'dark' ? 'scrollbar-thin scrollbar-thumb-blue-900 scrollbar-track-transparent' : ''}`}>
                            {SKILLS.map(skill => {
                              const isSel = selectedSkills.includes(skill)
                              return (
                                <motion.button key={skill} type="button" whileTap={{ scale: 0.94 }} onClick={() => toggleSkill(skill)}
                                  className={`px-2.5 py-1 rounded-[10px] text-[11.5px] font-[700] border-[1.5px] transition-all duration-200 ${
                                    isSel 
                                      ? "bg-[#00BCD4] border-[#00BCD4] text-white" 
                                      : (theme === 'dark' ? "bg-blue-900/40 border-blue-500/20 text-blue-300 hover:border-blue-400/40" : "bg-white/60 border-gray-200 text-gray-500 hover:border-[#00BCD4]/40 hover:bg-white")
                                  }`}
                                >{skill}</motion.button>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 block mb-1.5 transition-colors">{lang === 'fr' ? 'Expérience (optionnel)' : 'Experience (optional)'}</label>
                          <textarea value={experience} onChange={e => setExperience(e.target.value)}
                            placeholder={lang === 'fr' ? 'Décrivez brièvement votre expérience...' : 'Briefly describe your experience...'}
                            rows={2}
                            className="w-full px-4 py-2 rounded-[14px] border-[1.5px] border-white/80 dark:border-blue-500/20 bg-[#f1f5f9]/80 dark:bg-blue-950/40 focus:bg-white dark:focus:bg-blue-900/40 focus:outline-none focus:ring-[3px] focus:ring-[#00BCD4]/20 dark:focus:ring-blue-500/20 focus:border-[#00BCD4]/50 dark:focus:border-blue-400/50 text-[13px] text-gray-800 dark:text-blue-50 placeholder:text-gray-400 dark:placeholder:text-blue-800 font-[600] transition-all resize-none"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* STEP 4 */}
                    {step === 4 && (
                      <motion.div key="s4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.3 }} className="space-y-2.5">
                        <p className="text-[13px] font-[800] text-[#1e293b] dark:text-blue-50 mb-2 transition-colors">Liens externes</p>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 transition-colors">GitHub</label>
                          <FieldInput icon={Github} type="url" placeholder="https://github.com/monprofil" value={githubUrl} onChange={setGithubUrl} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11.5px] font-[800] text-[#475569] dark:text-blue-400 px-1 transition-colors">LinkedIn</label>
                          <FieldInput icon={Linkedin} type="url" placeholder="https://linkedin.com/in/monprofil" value={linkedinUrl} onChange={setLinkedinUrl} />
                        </div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                          className={`mt-3 rounded-[20px] border p-4 space-y-2 transition-all duration-500 ${
                            theme === 'dark' ? 'bg-blue-900/10 border-blue-500/20' : 'bg-gradient-to-br from-[#00BCD4]/8 to-[#00BCD4]/3 border-[#00BCD4]/20'
                          }`}>
                          <p className="text-[11px] font-[800] text-[#00BCD4] uppercase tracking-wider mb-2">Résumé</p>
                          <p className="text-[13px] font-[700] text-[#1e293b] dark:text-blue-50 transition-colors">{fullName || "—"}</p>
                          <p className="text-[12px] text-gray-500 dark:text-blue-400/60 transition-colors">{email}</p>
                          <p className="text-[12px] text-gray-500 dark:text-blue-400/60 transition-colors">{position} {grade ? `· ${grade}` : ""}</p>
                          {selectedSkills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {selectedSkills.slice(0, 5).map(s => (
                                <span key={s} className="px-2 py-0.5 bg-[#00BCD4]/15 text-[#00BCD4] rounded-full text-[10px] font-[700]">{s}</span>
                              ))}
                              {selectedSkills.length > 5 && <span className="text-[10px] text-gray-400 dark:text-blue-800 font-[600]">+{selectedSkills.length - 5} autres</span>}
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
                    <motion.button whileTap={{ scale: 0.97 }} onClick={goBack}
                      className={`flex items-center gap-1.5 px-5 py-[11px] rounded-[14px] border-[1.5px] text-[14px] font-[800] transition-all ${
                        theme === 'dark' ? 'bg-blue-900/40 border-blue-500/20 text-blue-400 hover:bg-blue-900/60' : 'bg-white/60 border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-white'
                      }`}>
                      <ChevronLeft className="w-4 h-4" /> Retour
                    </motion.button>
                  )}
                  {step < 4 ? (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={goNext}
                      className="flex-1 bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] text-white py-[11px] rounded-[14px] font-[800] text-[15px] transition-all shadow-[0_4px_15px_rgba(0,188,212,0.3)] flex items-center justify-center gap-2">
                      {lang === 'fr' ? 'Suivant' : 'Next'} <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  ) : (
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleManualSubmit} disabled={loading}
                      className="flex-1 bg-gradient-to-r from-[#00BCD4] to-[#019ab3] hover:from-[#00c5df] hover:to-[#01a7c2] disabled:opacity-70 text-white py-[11px] rounded-[14px] font-[800] text-[15px] transition-all shadow-[0_4px_15px_rgba(0,188,212,0.3)] flex items-center justify-center gap-2">
                      {loading ? (
                        <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>Création...</>
                      ) : (<>{lang === 'fr' ? 'Créer mon compte' : 'Create account'} <CheckCircle2 className="w-4 h-4" /></>)}
                    </motion.button>
                  )}
                </div>

                <div className="mt-3 text-center">
                  <p className="text-[11.5px] font-[600] text-gray-400 dark:text-blue-800 transition-colors">
                    Déjà un compte ?{" "}
                    <a href="/login" className="font-[800] text-[#00BCD4] dark:text-blue-400 hover:text-[#0096a8] transition-colors hover:underline underline-offset-2">
                      Se connecter →
                    </a>
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Footer */}
          <div className={`mt-4 pt-3 border-t text-center transition-colors ${theme === 'dark' ? 'border-blue-500/10' : 'border-gray-200/60'}`}>
            <p className="text-[9px] font-[700] text-gray-400 dark:text-blue-900 uppercase tracking-widest">NETINFO SMA © 2026 — Netinfo Nabeul</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

