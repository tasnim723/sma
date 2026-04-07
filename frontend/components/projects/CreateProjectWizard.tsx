"use client"

import React, { useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"
import { 
  FileText, 
  Upload, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  BrainCircuit, 
  Send,
  Loader2,
  Sparkles,
  Trophy,
  Calendar,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/lib/store"
import axios from "axios"
import { useRouter } from "next/navigation"

type Step = 1 | 2 | 3 | 4
type Mode = "import" | "describe"

interface WizardProps {
  onClose: () => void
  onSuccess: () => void
}

const CreateProjectWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const router = useRouter()
  const { token } = useAuthStore()
  const [step, setStep] = useState<Step>(1)
  const [mode, setMode] = useState<Mode | null>(null)
  
  // Form State
  const [projectName, setProjectName] = useState("")
  const [description, setDescription] = useState("")
  const [deadline, setDeadline] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [files, setFiles] = useState<File[]>([])
  
  // Loading State
  const [loadingPhase, setLoadingPhase] = useState<string>("")
  const [loadingMessage, setLoadingMessage] = useState<string>("")
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  })

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const steps = [
    { id: 1, label: "Mode" },
    { id: 2, label: "Détails" },
    { id: 3, label: "Analyse IA" },
    { id: 4, label: "Terminé" }
  ]

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 }
  }

  const handleContinue = () => {
    if (step === 1 && mode) setStep(2)
  }

  const handleAnalyze = async () => {
    setStep(3)
    setLoadingPhase("STARTING")
    setLoadingMessage("Initializing AI Orchestrator...")

    const formData = new FormData()
    formData.append("mode", mode!)
    formData.append("project_name", projectName)
    
    if (mode === "import") {
      files.forEach(file => formData.append("files", file))
    } else {
      formData.append("description", description)
      formData.append("deadline", deadline)
      formData.append("team_size", teamSize)
    }

    try {
      const response = await fetch("http://127.0.0.1:8000/api/wizard/wizard", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      })

      if (!response.body) throw new Error("No response body")
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))
            if (data.phase === "DONE") {
              setCreatedProjectId(data.project_id)
              setStep(4)
            } else if (data.phase === "ERROR") {
              alert("Error: " + data.message)
              setStep(2)
            } else {
              setLoadingPhase(data.phase)
              setLoadingMessage(data.message)
            }
          }
        }
      }
    } catch (err) {
      console.error(err)
      alert("Failed to analyze project")
      setStep(2)
    }
  }

  const isStep2Valid = mode === "import" 
    ? (projectName.length > 0 && files.length > 0)
    : (projectName.length > 0 && description.length >= 10)

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl overflow-hidden shadow-2xl">
      {/* Progress Bar */}
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between relative mb-2">
          {/* Background Line */}
          <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
          
          {/* Filling Line */}
          <motion.div 
            className="absolute top-1/2 left-0 h-[2px] bg-[#00BCD4] -translate-y-1/2 z-0 origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: (step - 1) / (steps.length - 1) }}
            transition={{ duration: 0.5 }}
          />

          {steps.map((s) => {
            const isCompleted = step > s.id
            const isActive = step === s.id
            const isPending = step < s.id

            return (
              <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isCompleted ? "bg-green-500 border-green-500 text-white" : 
                    isActive ? "bg-white border-[#00BCD4] text-[#00BCD4] shadow-[0_0_15px_rgba(0,188,212,0.3)]" : 
                    "bg-slate-50 border-slate-200 text-slate-400"
                  }`}
                  animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : <span className="text-sm font-black">{s.id}</span>}
                </motion.div>
                <span className={`text-[10px] uppercase font-black tracking-widest ${
                  isActive ? "text-[#00BCD4]" : isCompleted ? "text-green-500" : "text-slate-400"
                }`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-8 min-h-[400px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-900">Comment voulez-vous commencer ?</h2>
                <p className="text-slate-500 font-medium">Choisissez un mode pour initialiser votre espace de projet propulsé par l'IA.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setMode("import")}
                  className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                    mode === "import" 
                      ? "border-[#00BCD4] bg-[#00BCD4]/5 ring-4 ring-[#00BCD4]/10" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${
                    mode === "import" ? "bg-[#00BCD4] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  }`}>
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-lg text-slate-800 mb-1">Importer un cahier des charges</h3>
                  <p className="text-sm text-slate-500 leading-snug">Importez des PDF ou Documents et laissez l'IA extraire les tâches & la feuille de route.</p>
                </button>

                <button 
                  onClick={() => setMode("describe")}
                  className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group ${
                    mode === "describe" 
                      ? "border-[#00BCD4] bg-[#00BCD4]/5 ring-4 ring-[#00BCD4]/10" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${
                    mode === "describe" ? "bg-[#00BCD4] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                  }`}>
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-lg text-slate-800 mb-1">Décrivez votre idée</h3>
                  <p className="text-sm text-slate-500 leading-snug">Rédigez une brève description et nous générerons tout pour vous.</p>
                </button>
              </div>

              <div className="pt-4">
                <Button 
                  disabled={!mode}
                  onClick={handleContinue}
                  className="w-full bg-[#00BCD4] hover:bg-[#0097a7] text-white py-6 rounded-xl font-black text-lg shadow-lg shadow-[#00BCD4]/20"
                >
                  Continuer
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && mode === "import" && (
            <motion.div 
              key="step2-import"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400">Nom du Projet</Label>
                  <Input 
                    id="name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="ex. Application Mobile NextGen" 
                    className="h-12 border-slate-200 rounded-xl font-medium focus:ring-[#00BCD4]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-black uppercase text-slate-400">Documents de Spécification</Label>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                      isDragActive ? "border-[#00BCD4] bg-[#00BCD4]/5" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="font-bold text-slate-600">Déposez vos fichiers ici, ou <span className="text-[#00BCD4]">parcourez</span></p>
                    <p className="text-xs text-slate-400 mt-1 uppercase font-black">PDF, DOCX, TXT</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <motion.div 
                      key={i}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2 group"
                    >
                      <FileText className="w-4 h-4 text-[#00BCD4]" />
                      <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                      <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 py-6 rounded-xl font-black text-slate-500">Retour</Button>
                <Button 
                  disabled={!isStep2Valid}
                  onClick={handleAnalyze}
                  className="flex-[2] bg-[#00BCD4] hover:bg-[#0097a7] text-white py-6 rounded-xl font-black text-lg shadow-lg shadow-[#00BCD4]/20"
                >
                  Analyser avec l'IA
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && mode === "describe" && (
            <motion.div 
              key="step2-describe"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400">Nom du Projet</Label>
                <Input 
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="ex. Plateforme de Contenu IA" 
                  className="h-11 border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc" className="text-xs font-black uppercase text-slate-400">Description</Label>
                <Textarea 
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre vision en détail..." 
                  className="min-h-[120px] border-slate-200 rounded-xl font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="deadline" className="text-xs font-black uppercase text-slate-400">Échéance (Optionnel)</Label>
                  <div className="relative">
                    <Input 
                      id="deadline"
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="h-11 border-slate-200 rounded-xl font-medium px-4"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="teamsize" className="text-xs font-black uppercase text-slate-400">Taille de l'Équipe</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                    <Select value={teamSize} onValueChange={(v) => setTeamSize(v || "")}>
                      <SelectTrigger className="h-11 border-slate-200 rounded-xl pl-10 font-medium">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3">1-3 Personnes</SelectItem>
                        <SelectItem value="4-8">4-8 Personnes</SelectItem>
                        <SelectItem value="9-15">9-15 Personnes</SelectItem>
                        <SelectItem value="15+">15+ Personnes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 py-6 rounded-xl font-black text-slate-500">Retour</Button>
                <Button 
                  disabled={!isStep2Valid}
                  onClick={handleAnalyze}
                  className="flex-[2] bg-[#00BCD4] hover:bg-[#0097a7] text-white py-6 rounded-xl font-black text-lg shadow-lg shadow-[#00BCD4]/20"
                >
                  Générer le Plan
                  <Sparkles className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center space-y-6 py-4"
            >
              {/* Robot + Rings Container (Scaled down by 45%) */}
              <div className="relative flex items-center justify-center" style={{ width: 180, height: 180, transform: "scale(0.55)", margin: "-30px 0" }}>

                {/* Outer ring — complete circle */}
                <motion.svg
                  width="180" height="180" viewBox="0 0 180 180"
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  style={{ originX: "50%", originY: "50%" }}
                >
                  <defs>
                    <linearGradient id="outerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00CCCC" stopOpacity="1" />
                      <stop offset="50%" stopColor="#00CCCC" stopOpacity="0.1" />
                      <stop offset="100%" stopColor="#FF0000" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <circle cx="90" cy="90" r="85" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.4" />
                  <circle cx="90" cy="90" r="85" fill="none" stroke="url(#outerGrad)" strokeWidth="3.5" />
                </motion.svg>

                {/* Inner ring — complete circle */}
                <motion.svg
                  width="135" height="135" viewBox="0 0 135 135"
                  className="absolute"
                  style={{ top: 22.5, left: 22.5, originX: "50%", originY: "50%" }}
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
                >
                  <defs>
                    <linearGradient id="innerGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#111111" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#00CCCC" stopOpacity="0" />
                      <stop offset="100%" stopColor="#00CCCC" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <circle cx="67.5" cy="67.5" r="63" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3" />
                  <circle cx="67.5" cy="67.5" r="63" fill="none" stroke="url(#innerGrad)" strokeWidth="2.5" />
                </motion.svg>

                {/* Glow halo */}
                <motion.div
                  className="absolute rounded-full"
                  style={{ width: 100, height: 100, top: 40, left: 40, background: "radial-gradient(circle, rgba(0,204,204,0.15) 0%, transparent 70%)" }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Robot Mascot — faithful 3D SVG recreation */}
                <motion.div
                  className="absolute z-10"
                  style={{ top: 28, left: 45, width: 90 }}
                >
                  <svg width="160" height="220" viewBox="0 0 160 220" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="20%" stopColor="#FFFFFF" />
                        <stop offset="90%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                      </linearGradient>
                      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="30%" stopColor="#F8FAFC" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                      </linearGradient>
                      <linearGradient id="armGradLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#CBD5E1" />
                        <stop offset="60%" stopColor="#F8FAFC" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                      <linearGradient id="armGradRight" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#CBD5E1" />
                        <stop offset="60%" stopColor="#F8FAFC" />
                        <stop offset="100%" stopColor="#FFFFFF" />
                      </linearGradient>
                      <radialGradient id="visorGrad" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#334155" />
                        <stop offset="60%" stopColor="#1E293B" />
                        <stop offset="100%" stopColor="#0F172A" />
                      </radialGradient>
                    </defs>

                    {/* Floating Drop Shadow */}
                    <motion.ellipse 
                      cx="80" cy="210" rx="30" ry="5" fill="rgba(0,0,0,0.12)"
                      animate={{ rx: [30, 22, 30], opacity: [0.12, 0.05, 0.12] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    />

                    {/* Robot Group - floating gently up and down */}
                    <motion.g
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {/* Left Arm */}
                      <rect x="15" y="115" width="28" height="75" rx="14" fill="url(#armGradLeft)" transform="rotate(18, 29, 115)" />
                      
                      {/* Right Arm */}
                      <rect x="117" y="115" width="28" height="75" rx="14" fill="url(#armGradRight)" transform="rotate(-18, 131, 115)" />

                      {/* Neck Area */}
                      <rect x="65" y="95" width="30" height="25" rx="8" fill="#94A3B8" />
                      <rect x="65" y="95" width="30" height="15" fill="#64748B" opacity="0.3" /> {/* Neck shadow */}

                      {/* Main Body (Pear shape) */}
                      <path d="M 50 115 
                               C 50 100, 110 100, 110 115
                               C 130 160, 110 195, 80 195
                               C 50 195, 30 160, 50 115 Z" 
                            fill="url(#bodyGrad)" />
                      
                      {/* Body Highlight */}
                      <path d="M 58 118 C 58 108, 90 108, 90 118 C 100 135, 75 160, 58 118 Z" fill="#FFFFFF" opacity="0.4" />

                      {/* Body Panel / Joint Detail */}
                      <path d="M 45 155 Q 65 160, 72 160 L 72 165 L 88 165 L 88 160 Q 95 160, 115 155" 
                            stroke="#94A3B8" strokeWidth="2.5" fill="none" strokeLinejoin="round" opacity="0.5" />

                      {/* Head Antenna Cap Base */}
                      <rect x="55" y="24" width="50" height="15" rx="7.5" fill="#E2E8F0" />
                      <rect x="60" y="22" width="40" height="10" rx="5" fill="#F8FAFC" />

                      {/* Left Ear Panel */}
                      <rect x="15" y="52" width="25" height="45" rx="12.5" fill="#CBD5E1" />
                      <rect x="13" y="60" width="8" height="30" rx="4" fill="#94A3B8" opacity="0.25" />

                      {/* Right Ear Panel */}
                      <rect x="120" y="52" width="25" height="45" rx="12.5" fill="#CBD5E1" />
                      <rect x="139" y="60" width="8" height="30" rx="4" fill="#94A3B8" opacity="0.25" />

                      {/* Base Head Pill Shape */}
                      <rect x="25" y="30" width="110" height="85" rx="42.5" fill="url(#headGrad)" />

                      {/* Head Top Curved Sheen */}
                      <path d="M 45 45 Q 80 35, 115 45 Q 100 52, 80 52 Q 60 52, 45 45 Z" fill="#FFFFFF" opacity="0.6" />

                      {/* Dark Visor Base */}
                      <rect x="35" y="44" width="90" height="58" rx="28" fill="url(#visorGrad)" />

                      {/* Visor Glare/Reflection */}
                      <rect x="45" y="48" width="70" height="12" rx="6" fill="#FFFFFF" opacity="0.06" />

                      {/* Blinking Turquoise Glowing Face */}
                      <motion.g
                        animate={{ opacity: [1, 1, 0, 1, 1] }}
                        transition={{ duration: 4.5, times: [0, 0.94, 0.96, 0.98, 1], repeat: Infinity }}
                      >
                        {/* Left Eye (Upward curve) */}
                        <path d="M 50 68 C 50 56, 64 56, 64 68 Z" fill="#00CCCC" style={{ filter: "drop-shadow(0 0 7px rgba(0, 204, 204, 0.9))" }} />
                        
                        {/* Right Eye (Upward curve) */}
                        <path d="M 96 68 C 96 56, 110 56, 110 68 Z" fill="#00CCCC" style={{ filter: "drop-shadow(0 0 7px rgba(0, 204, 204, 0.9))" }} />
                        
                        {/* Friendly Mouth */}
                        <path d="M 74 76 C 74 86, 86 86, 86 76 Z" fill="#00CCCC" style={{ filter: "drop-shadow(0 0 7px rgba(0, 204, 204, 0.9))" }} />
                      </motion.g>

                    </motion.g>
                  </svg>
                </motion.div>
              </div>

              {/* Phase label + message */}
              <div className="text-center space-y-3">
                <Badge className="bg-[#00CCCC]/10 text-[#00CCCC] border-none px-4 py-1.5 rounded-full font-black animate-pulse">
                  {loadingPhase}
                </Badge>
                <h2 className="text-xl font-black text-slate-800">{loadingMessage}</h2>
                <p className="text-slate-500 font-medium max-w-[260px] mx-auto text-sm">Nos agents IA collaborent pour construire votre espace de projet...</p>
              </div>

              {/* Progress steps */}
              <div className="w-full max-w-sm space-y-2">
                {[
                  { phase: "PARSING", label: "Extraction du contexte" },
                  { phase: "EXTRACTING", label: "Validation de la spécification" },
                  { phase: "ROADMAP", label: "Création des jalons" },
                  { phase: "TASKS", label: "Génération des tâches" },
                  { phase: "FINALIZING", label: "Espace prêt" }
                ].map((p, i) => {
                  const phases = ["STARTING", "PARSING", "EXTRACTING", "ROADMAP", "TASKS", "FINALIZING", "DONE"]
                  const currentIdx = phases.indexOf(loadingPhase)
                  const pIdx = phases.indexOf(p.phase)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full transition-all ${
                        currentIdx > pIdx ? "bg-green-500" :
                        currentIdx === pIdx ? "bg-[#00CCCC] animate-ping" :
                        "bg-slate-200"
                      }`} />
                      <span className={`text-xs font-black uppercase tracking-widest ${
                        currentIdx >= pIdx ? "text-slate-700" : "text-slate-300"
                      }`}>
                        {p.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}



          {step === 4 && (
            <motion.div 
              key="step4"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center space-y-8 py-10"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-500/30"
                >
                  <Trophy className="w-12 h-12" />
                </motion.div>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-slate-900">Projet Créé !</h2>
                <p className="text-slate-500 font-medium max-w-xs mx-auto">
                  Votre projet <span className="text-slate-900 font-black">"{projectName}"</span> est prêt avec une intégration IA complète.
                </p>
              </div>

              <div className="pt-4 w-full">
                <Button 
                  onClick={() => {
                    if (createdProjectId) {
                      router.push(`/projects/${createdProjectId}`)
                    }
                    onSuccess()
                    onClose()
                  }}
                  className="w-full bg-[#00BCD4] hover:bg-[#0097a7] text-white py-8 rounded-2xl font-black text-xl shadow-lg shadow-[#00BCD4]/20"
                >
                  Aller au Projet
                  <ChevronRight className="ml-2 w-6 h-6" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default CreateProjectWizard
