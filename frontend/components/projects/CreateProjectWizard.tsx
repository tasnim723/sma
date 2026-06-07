"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionTemplate } from "framer-motion"
import { useDropzone } from "react-dropzone"
import {
  FileText, Upload, X, Check, ChevronRight, ChevronLeft,
  Sparkles, Trophy, Zap, Bot, Flame, Star, RefreshCw, CheckCircle2,
  BrainCircuit, ArrowRight, ArrowLeft, Eye, ExternalLink, PlayCircle, BookOpen,
  TrendingUp, Lightbulb, Target, ChevronDown, Building2, Calendar, GitCompare, Cpu, User, Send,
  Edit3, Trash2, Box, AlertTriangle, Clock, UserCheck, MoreHorizontal, AlertCircle,
  MessageSquare, Layers, Gamepad2, Image as ImageIcon, Globe, Compass, Waves, Search, Boxes, Mic, Settings2, Play, Quote, Volume2,
  PenLine, Plus, Activity, Brain, CheckCircle, ClipboardList, Droplets, FileCheck, FileUp,
  FlaskConical, GanttChart, Gauge, GitBranch, LayoutGrid, Newspaper, Palette, Pencil,
  Radar, Rocket, Save, Settings, Shield, Users, Wallet
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"
import { WhatIfSimulator } from "./WhatIfSimulator"

type Step = "mode" | "industry" | "warroom-input" | "warroom-agents" | "warroom-pick" | "warroom-params" | "warroom-tech" | "loading" | "done" | "import-details" | "cdc-extract" | "cdc-risks" | "comprehension" | "clarification" | "concept-validation" | "contraintes" | "design-brief" | "ideation" | "feasibility" | "projet-details" | "fonctionnalites" | "validation" | "prototype"
type Mode = "import" | "idea"
type DetailsTab = "equipe" | "planification"

interface WizardProps {
  onClose: () => void
  onSuccess: () => void
}

interface AgentMessage {
  agent: string
  phase: string
  content: string
  colorClass: string
  icon: React.ReactNode
}

interface TopIdea {
  id: number
  title: string
  description: string
  score: number
}

interface TechArticle {
  id: string
  title: string
  snippet: string
  url: string
  type: string
  author: string
  date: string
  category: string
  image: string
  innovation_score: number
}

interface AnalysisPlan {
  impact_score: number
  integration_title: string
  one_liner: string
  innovations: Array<{ icon: string; label: string; detail: string }>
  enriched_description: string
}

interface GeneratedProject {
  id: number
  title: string
  complexity: "LOW" | "MEDIUM" | "HIGH"
  innovation_score: number
  description: string
  visual_style: string
  artistic_direction: string
  ambiance: string
  stack: string[]
  modules: string[]
  team_distribution: Record<string, number>
  deliverables: string[]
  scenarios: {
    fast: { duration_weeks: number; description: string; timeline?: Array<{ phase: string; percentage_start: number; duration_weeks: number }> }
    balanced: { duration_weeks: number; description: string; timeline?: Array<{ phase: string; percentage_start: number; duration_weeks: number }> }
    advanced: { duration_weeks: number; description: string; timeline?: Array<{ phase: string; percentage_start: number; duration_weeks: number }> }
  }
  versions: { v1: string; v2: string; v3: string }
  comparison_score: number
}

interface ProjectTask {
  id: string
  title: string
  description: string
  reasoning: string
  priority: 'High' | 'Medium' | 'Low'
  duration_hours: number
  role: string
  dependencies: string[]
  tools: string[]
  risk_level: 'High' | 'Medium' | 'Low'
  mitigation: string
  category: 'Setup' | 'Design' | 'Development' | 'Testing' | 'Deployment'
  sprint: number
  status: 'pending' | 'approved' | 'rejected';
  assigned_member_id?: string;
  assigned_member_name?: string;
  ai_proposed?: boolean;
  _editingMission?: boolean;
  _descBackup?: string;
  _editingStack?: boolean;
  _stackInput?: string;
  is_veille_task?: boolean;
  assignees?: string[];
}

interface SmartSuggestion {
  type: 'warning' | 'info' | 'success'
  message: string
  impact: 'High' | 'Medium' | 'Low'
  mitigation: string
}

const COMPLEXITY_CFG = {
  LOW: { label: "Initiation", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", icon: "🌱" },
  MEDIUM: { label: "Professionnel", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", icon: "⚡" },
  HIGH: { label: "Innovation AAA", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", icon: "🚀" },
}

const GRAPHIC_UNIVERSES = [
  { id: "sci-fi", label: "🌌 Sci-Fi / Futuriste", kw: "futuristic,neon,space,tech", desc: "Interfaces lumineuses, effets holographiques, ambiance spatiale", accent: "#7C3AED" },
  { id: "gaming", label: "🎮 Gaming / Immersif", kw: "game,esports,controller,dark", desc: "High contrast, animations dynamiques, vibrant et engageant", accent: "#EF4444" },
  { id: "minimal", label: "⚡ Minimaliste Pro", kw: "minimal,clean,white,ui", desc: "Épuré, typographie forte, beaucoup d’espace, efficacité maximale", accent: "#374151" },
  { id: "nature", label: "🌿 Nature & Organique", kw: "nature,green,organic,earth", desc: "Tons terreux, formes arrondies, doux et reposant", accent: "#059669" },
  { id: "corporate", label: "🏙️ Corporate Moderne", kw: "office,corporate,modern,building", desc: "Professionnel, confiant, structures claires et bleues", accent: "#2563EB" },
  { id: "artistic", label: "🎨 Créatif & Artistique", label2: "🎨", kw: "art,creative,colorful,paint", desc: "Expressif, coloré, originalité maximale, identité forte", accent: "#DB2777" },
]

const COLOR_PALETTES = [
  { name: "Ocean Tech", colors: ["#00BCD4", "#0D47A1", "#1A237E", "#E3F2FD"] },
  { name: "Sunset Pro", colors: ["#FF6B35", "#F7931E", "#FFD700", "#1C0A00"] },
  { name: "Forest Dark", colors: ["#2D5016", "#5A7C3B", "#A8C97F", "#1A1A1A"] },
  { name: "Purple Neon", colors: ["#7C3AED", "#EC4899", "#8B5CF6", "#0F0A1E"] },
  { name: "Monochrome", colors: ["#FFFFFF", "#9CA3AF", "#374151", "#111827"] },
  { name: "Fire Game", colors: ["#EF4444", "#F97316", "#FCD34D", "#1F2937"] },
  { name: "Azure Clean", colors: ["#3B82F6", "#06B6D4", "#E0F2FE", "#0F172A"] },
  { name: "Nature Soft", colors: ["#6EE7B7", "#34D399", "#FEF3C7", "#064E3B"] },
  { name: "Rose Gold", colors: ["#F43F5E", "#FB923C", "#FDE68A", "#1C1917"] },
  { name: "Deep Space", colors: ["#4F46E5", "#7C3AED", "#C4B5FD", "#030712"] },
]

const MECHANICS_OPTIONS = [
  "🎯 Système de progression", "🏆 Classements & scores", "⚡ Feedback temps réel",
  "🤝 Mode collaboratif", "🔔 Notifications intelligentes", "📊 Tableaux de bord live",
  "🎲 Simulation & physique", "🌍 Monde ouvert", "📖 Mode histoire / narration",
  "🔒 Gestion des droits", "🤖 IA adaptive", "📱 Multi-plateforme",
  "⏰ Temps limité / Urgence", "🌟 Récompenses & badges", "📝 Formulaires intelligents",
]

const INDUSTRIES = [
  { id: "edu", label: "Éducation & Training", icon: <BookOpen size={18} />, color: "border-amber-500/30 text-amber-500", desc: "Formations certifiées, EdTech, Gamification" },
  { id: "game", label: "Game Design & Dev", icon: <Gamepad2 size={18} />, color: "border-rose-500/30 text-rose-500", desc: "Unreal Engine, Unity, Game Art, Playability" },
  { id: "vfx", label: "Arts Numériques & VFX", icon: <Sparkles size={18} />, color: "border-purple-500/30 text-purple-500", desc: "Animation 3D, VFX, Rendu (Adobe/Autodesk)" },
  { id: "arch", label: "Design & Architecture", icon: <Boxes size={18} />, color: "border-cyan-500/30 text-cyan-500", desc: "BIM, Visualisation 3D, Design Industriel" },
  { id: "xr", label: "Tech Immersives (XR)", icon: <Cpu size={18} />, color: "border-indigo-500/30 text-indigo-500", desc: "Réalité Virtuelle, Augmentée, Metaverse" },
  { id: "innovation", label: "Innovation Digitale", icon: <TrendingUp size={18} />, color: "border-emerald-500/30 text-emerald-500", desc: "Transformation numérique, IA, Stratégie" },
]

const generatePaletteFromPrompt = (prompt: string) => {
  const p = prompt.toLowerCase()
  if (p.includes("neon") || p.includes("cyber") || p.includes("gaming") || p.includes("vaporwave")) return ["#FF00FF", "#00FFFF", "#7000FF", "#0A0A1A"]
  if (p.includes("dark") || p.includes("sombre") || p.includes("nuit") || p.includes("black")) return ["#111827", "#1F2937", "#374151", "#9CA3AF"]
  if (p.includes("nature") || p.includes("vert") || p.includes("forest") || p.includes("écolo")) return ["#064E3B", "#059669", "#34D399", "#ECFDF5"]
  if (p.includes("ocean") || p.includes("bleu") || p.includes("clean") || p.includes("eau")) return ["#0C4A6E", "#0284C7", "#38BDF8", "#F0F9FF"]
  if (p.includes("fire") || p.includes("rouge") || p.includes("chaud") || p.includes("flamme")) return ["#7F1D1D", "#DC2626", "#F87171", "#FEF2F2"]
  if (p.includes("pastel") || p.includes("doux") || p.includes("rose")) return ["#FDF4FF", "#FBCFE8", "#F472B6", "#831843"]
  if (p.includes("gold") || p.includes("luxe") || p.includes("premium")) return ["#FEF08A", "#EAB308", "#A16207", "#422006"]
  // default AI palette
  return ["#00BCD4", "#3B82F6", "#8B5CF6", "#F8FAFC"]
}

const getDynamicImagePrompt = (proj: any) => {
  const text = (proj.title + " " + (proj.description || "") + " " + (proj.stack?.join(" ") || "") + " " + (proj.modules?.join(" ") || "")).toLowerCase()

  let theme = `Epic 3D video game or virtual reality simulation cover art for ${proj.title}, concept: ${(proj.description || "").substring(0, 80)}`
  let style = "AAA game engine render, Unreal Engine 5 style, hyperrealistic, stunning visuals, 8k resolution, cinematic lighting, 3D visualization"

  // Semantic Visual Matching Logic
  if (text.match(/cyber|securit|hacker|crypto|blockchain|dark web/)) {
    theme = "dark cyberpunk tech visuals, glowing neon interfaces, futuristic cybersecurity command center, holograms"
    style = "cyberpunk, dark theme, cinematic lighting, 8k resolution, Unreal Engine 5 render"
  } else if (text.match(/vr|virtuel|réalité|reality|oculus|metaverse/)) {
    theme = "immersive VR metaverse environment, futuristic virtual reality headset perspective, glowing digital world"
    style = "sci-fi aesthetic, glowing neon blue and purple, 3D visualization, hyperrealistic"
  } else if (text.match(/archi|maison|bâtiment|building|design|intérieur|interior/)) {
    theme = "photorealistic architectural 3D visualization of a modern building interior or exterior"
    style = "archviz, Twinmotion, V-Ray render, photorealistic, cinematic lighting, elegant design"
  } else if (text.match(/voiture|auto|moteur|course|racing/)) {
    theme = "high-end automotive 3D visualization, sleek racing car in a dynamic environment"
    style = "studio lighting, automotive render, fast motion blur, highly detailed, professional 3D"
  } else if (text.match(/médical|santé|hopital|patient|docteur|clinique/)) {
    theme = "clean advanced medical tech simulation, futuristic healthcare facility, glowing medical holograms"
    style = "clean white and blue aesthetic, sterile environment, modern UI, realistic 3d render"
  } else if (text.match(/education|ecole|apprend|eleve|etudiant|cours/)) {
    theme = "modern educational virtual platform, interactive 3D learning environment, glowing knowledge nodes"
    style = "bright engaging colors, clean friendly UI, isometric 3d elements, modern flat design aesthetic"
  } else if (text.match(/jeux|game|joueur|rpg|mmo|fps|simulation/)) {
    theme = "epic AAA video game cover art, dramatic action scene, dynamic character posing, intense cinematic gameplay"
    style = "unreal engine 5 render, cinematic lighting, hyper-realistic, dramatic shadows, 8k resolution"
  } else if (text.match(/ai|ia|intelligence|artificiell|machine learning|data/)) {
    theme = "abstract artificial intelligence representation, glowing neural networks, glowing floating data nodes, futuristic supercomputer core, highly advanced technology"
    style = "sci-fi, glowing particles, deep blue and cyan tones, cinematic 3d render, highly detailed"
  } else if (text.match(/entreprise|gestion|erp|finance|business|management|rh|ressources/)) {
    theme = "futuristic corporate command center, glowing financial graphs, modern business dashboard holograms, data analytics, global network"
    style = "professional, sleek, corporate, isometric 3d, blue and gold colors, depth of field"
  }

  // Ensure prompt doesn't get overly truncated but stays clean
  // Adding specific negative prompt constraints for flux to avoid text
  const finalPrompt = `${theme}. Style: ${style}. Center framed, award-winning 3D art, pristine graphics. Without any text, no fonts, no letters, no words, no watermarks, no titles.`
  return encodeURIComponent(finalPrompt)
}

const getDevilsAdvocateRisks = (proj: any) => {
  const isLow = proj.complexity === 'LOW'
  const isHigh = proj.complexity === 'HIGH'
  const duration = proj.scenarios?.balanced?.duration_weeks || 12

  if (isHigh) {
    return [
      `Dette technique potentielle élevée due à la complexité de la stack (${proj.stack?.slice(0, 2).join(', ')}).`,
      `Risque de dérapage du budget si le recrutement des profils experts s'éternise.`,
      `Temps de développement long (${duration} sem) : le marché cible peut pivoter d'ici le lancement.`
    ]
  } else if (isLow) {
    return [
      `Potentiel de différenciation très faible. Fort risque de se faire cloner par la concurrence.`,
      `Le MVP ultra-rapide (${duration} sem) risque de générer une forte frustration utilisateur (manque de polish).`,
      `Modèle de monétisation potentiellement fragile en raison du manque de barrière technologique à l'entrée.`
    ]
  }
  return [
    `Compromis "mou" : risque de n'exceller ni en rapidité, ni en innovation de rupture.`,
    `Dépendance à des technologies intermédiaires qui pourraient nécessiter une refonte pour scaler massivement.`,
    `Budget estimé pour ${duration} semaines qui pourrait s'avérer insuffisant si des pivots sont nécessaires.`
  ]
}

const deriveStylesFromText = (text: string) => {
  const t = text.toLowerCase()
  let bg = "bg-white dark:bg-blue-950"
  let textC = "text-slate-800 dark:text-blue-50"
  let border = "border-slate-200 dark:border-blue-900"
  let radius = "rounded-xl"
  let shadow = "shadow-sm"

  if (t.includes("sombre") || t.includes("dark") || t.includes("noir")) {
    bg = "bg-slate-900"
    textC = "text-white"
    border = "border-slate-800"
  }
  if (t.includes("arrondi") || t.includes("doux") || t.includes("cercle")) {
    radius = "rounded-[2rem]"
  }
  if (t.includes("carré") || t.includes("brut") || t.includes("corporate") || t.includes("strict")) {
    radius = "rounded-none"
  }
  if (t.includes("neon") || t.includes("gaming") || t.includes("cyber") || t.includes("glowing")) {
    border = "border-fuchsia-500"
    shadow = "shadow-[0_0_20px_rgba(217,70,239,0.5)]"
  }
  if (t.includes("minimaliste") || t.includes("épuré") || t.includes("clean") || t.includes("simple")) {
    border = "border-transparent"
    shadow = "shadow-none"
  }

  return { bg, textC, border, radius, shadow }
}

const QuantumParticles = () => {
  const [particles, setParticles] = useState<any[]>([])

  useEffect(() => {
    // Generate particles on client side to avoid SSR hydration mismatch
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // horizontal position percentage
      size: Math.random() * 3 + 2, // 2px to 5px
      duration: Math.random() * 20 + 20, // 20s to 40s to float up
      delay: Math.random() * -40, // random start time so they are pre-distributed
      isRed: Math.random() > 0.85, // 15% chance to be NetInfo Red, else Cyan
    }))
    setParticles(newParticles)
  }, [])

  if (particles.length === 0) return null

  return (
    <div className="fixed inset-0 z-[-20] overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full blur-[1px] ${p.isRed ? 'bg-red-500 shadow-[0_0_15px_rgba(255,0,0,0.8)]' : 'bg-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.6)]'}`}
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: ['110vh', '-10vh'],
            opacity: [0, p.isRed ? 0.7 : 0.4, 0]
          }}
          transition={{
            y: {
              duration: p.duration,
              ease: "linear",
              repeat: Infinity,
              delay: p.delay,
            },
            opacity: {
              duration: p.duration / 2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
              delay: p.delay,
            }
          }}
        />
      ))}
    </div>
  )
}

const CreateProjectWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const router = useRouter()
  const { token } = useAuthStore()
  const { lang, t } = useLang()
  const { theme } = useThemeStore()
  const [step, setStep] = useState<Step>("mode")
  const [mode, setMode] = useState<Mode | null>(null)

  // Holographic Neon Tracking
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 25, stiffness: 120, mass: 0.5 }
  const springX = useSpring(mouseX, springConfig)
  const springY = useSpring(mouseY, springConfig)

  // NetInfo Fluent Border Effect
  const mouseHoverX = useMotionValue(0)
  const mouseHoverY = useMotionValue(0)
  const formHoverBackground = useMotionTemplate`radial-gradient(600px circle at ${mouseHoverX}px ${mouseHoverY}px, rgba(0, 229, 255, 0.08), transparent 60%)`
  const formHoverBorder = useMotionTemplate`radial-gradient(350px circle at ${mouseHoverX}px ${mouseHoverY}px, rgba(255, 0, 0, 0.7), transparent 60%)`

  const handleFormMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e
    const { left, top } = currentTarget.getBoundingClientRect()
    mouseHoverX.set(clientX - left)
    mouseHoverY.set(clientY - top)
  }

  // Form
  const [projectName, setProjectName] = useState("")
  const [rawIdea, setRawIdea] = useState("")
  const [isEnhancingIdea, setIsEnhancingIdea] = useState(false)

  const handleEnhanceIdea = async () => {
    if (!rawIdea || rawIdea.trim().length < 5) return;
    setIsEnhancingIdea(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/wizard/enhance-idea`, { raw_idea: rawIdea }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.enhanced_idea) {
        setRawIdea(res.data.enhanced_idea);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEnhancingIdea(false);
    }
  }
  const [industry, setIndustry] = useState("game")
  const [startDate, setStartDate] = useState("")
  const [deadline, setDeadline] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [files, setFiles] = useState<File[]>([])

  // CDC Import state
  const [cdcExtracted, setCdcExtracted] = useState<Record<string, any> | null>(null)
  const [isCdcExtracting, setIsCdcExtracting] = useState(false)
  const [cdcFixes, setCdcFixes] = useState<Record<string, string>>({})

  // War Room
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [topIdeas, setTopIdeas] = useState<TopIdea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<TopIdea | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // ── Voice Toggle (4-state lifecycle per message) ──────────────────────────
  const [voiceStates, setVoiceStates] = useState<Record<string, 'idle' | 'playing' | 'paused' | 'ended'>>({})
  const utteranceRef = useRef<Record<string, SpeechSynthesisUtterance>>({})

  // Cleanup all utterances on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  const handleVoiceToggle = (msgKey: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'fr' ? 'Synthèse vocale non supportée.' : 'Speech synthesis not supported.')
      return
    }
    const currentState = voiceStates[msgKey] || 'idle'

    switch (currentState) {
      case 'idle': {
        // Stop any other playing message first
        window.speechSynthesis.cancel()
        const newStates: Record<string, 'idle' | 'playing' | 'paused' | 'ended'> = {}
        Object.keys(voiceStates).forEach(k => { newStates[k] = k === msgKey ? 'playing' : 'idle' })
        newStates[msgKey] = 'playing'
        setVoiceStates(newStates)

        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*_~`]/g, '')
        const ut = new SpeechSynthesisUtterance(cleanText)
        ut.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
        ut.rate = 1.05
        ut.pitch = 1.0
        ut.onend = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'ended' }))
        ut.onerror = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'idle' }))
        utteranceRef.current[msgKey] = ut
        window.speechSynthesis.speak(ut)
        break
      }
      case 'playing': {
        window.speechSynthesis.pause()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'paused' }))
        break
      }
      case 'paused': {
        window.speechSynthesis.resume()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'playing' }))
        break
      }
      case 'ended': {
        window.speechSynthesis.cancel()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'playing' }))

        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*_~`]/g, '')
        const ut = new SpeechSynthesisUtterance(cleanText)
        ut.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
        ut.rate = 1.05
        ut.pitch = 1.0
        ut.onend = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'ended' }))
        ut.onerror = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'idle' }))
        utteranceRef.current[msgKey] = ut
        window.speechSynthesis.speak(ut)
        break
      }
    }
  }

  const getVoiceIcon = (state: string) => {
    switch (state) {
      case 'playing': return '⏸'
      case 'paused': return '▶'
      case 'ended': return '🔁'
      default: return '🔊'
    }
  }

  // War Room Iterative (Vagues)
  const [waveIteration, setWaveIteration] = useState(1)
  const [starredIdeaId, setStarredIdeaId] = useState<string | null>(null)
  const [waveFeedback, setWaveFeedback] = useState("")

  // Tech Watch
  const [articles, setArticles] = useState<TechArticle[]>([])
  const [selectedArticles, setSelectedArticles] = useState<TechArticle[]>([])
  const [detailArticle, setDetailArticle] = useState<TechArticle | null>(null)
  const [globalScore, setGlobalScore] = useState(0)
  const [isFetchingTech, setIsFetchingTech] = useState(false)
  // Tech sub-phase: "pick" → user selects trend | "analyzing" → AI analyzes | "plan" → show plan
  const [techSubPhase, setTechSubPhase] = useState<"pick" | "analyzing" | "plan">("pick")
  const [analysisPlan, setAnalysisPlan] = useState<AnalysisPlan | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [isDiscussionFinished, setIsDiscussionFinished] = useState(false)
  const [currentSimulationStatus, setCurrentSimulationStatus] = useState("")
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const [loadingPhase, setLoadingPhase] = useState("STARTING")
  const [loadingMessage, setLoadingMessage] = useState("Initialisation...")

  // ── 12-STEP STATE ─────────────────────────────────────────────────────────
  const [comprehensionData, setComprehensionData] = useState<any>(null)
  const [clarificationQs, setClarificationQs] = useState<string[]>([])
  const [clarificationAs, setClarificationAs] = useState<string[]>([])
  const [generatedProjects, setGeneratedProjects] = useState<GeneratedProject[]>([])
  const [selectedProject, setSelectedProject] = useState<GeneratedProject | null>(null)
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("equipe")
  const [selectedScenario, setSelectedScenario] = useState<"fast" | "balanced" | "advanced">("balanced")
  const [rejectionFeedback, setRejectionFeedback] = useState("")
  const [isGenerating12, setIsGenerating12] = useState(false)
  const [generating12Msg, setGenerating12Msg] = useState("")
  // Étape 5: ideation readiness flags
  const [ideationReady, setIdeationReady] = useState(false)
  const [waitingForIdeation, setWaitingForIdeation] = useState(false)
  // Étape 12: amélioration continue
  const [managerInsights, setManagerInsights] = useState<any>(null)
  // Simulateur de Pression (Feasibility)
  const [budgetPressure, setBudgetPressure] = useState<number>(100)
  const [timePressure, setTimePressure] = useState<number>(100)


  // Protocole de Sauvetage
  const [isRescueModeActive, setIsRescueModeActive] = useState(false)
  const [isRescuing, setIsRescuing] = useState(false)
  const [rescueTerminalLines, setRescueTerminalLines] = useState<string[]>([])
  // Projet-Details Innovations
  const [selectedRepoFile, setSelectedRepoFile] = useState<string | null>(null)
  const [stackBattleChoice, setStackBattleChoice] = useState<'original' | 'alternative'>('original')

  // ── MANAGER EDITABLE FIELDS (chaque étape est modifiable) ─────────────────
  // Étape 2: compréhension éditable
  const [editComp, setEditComp] = useState<{
    project_type: string; pedagogical_objective: string;
    estimated_duration: string; complexity_level: string; target_team: string;
  } | null>(null)
  // Étape 4: contraintes (guided chat)
  const [constraints, setConstraints] = useState({
    teamSize: "", startDate: "", deadline: "", techConstraints: "", targetUsers: "", mainObjective: "", visionArtistique: "", mechanismesJeu: ""
  })
  const projectNameStr = selectedIdea?.title || projectName || "ce projet";
  const CONTRAINTES_QUESTIONS = React.useMemo(() => [
    { key: "mainObjective", q: `🎯 Objectif métier principal pour ${projectNameStr} (Ex: Lancement grand public, MVP investisseurs...)` },
    { key: "targetUsers", q: `👥 Utilisateurs cibles (Ex: Professionnels B2B, Étudiants, Grand public...)` },
    { key: "teamSize", q: `🧑‍🤝‍🧑 Taille de l'équipe (Ex: Indépendant, 2 devs + 1 designer...)` },
    { key: "techConstraints", q: `⚙️ Contraintes techniques (Ex: Obligatoire: Mobile-first, Interdit: cloud payant...)` },
    { key: "visionArtistique", q: `🎨 Vision artistique & ambiance (Ex: Cyberpunk sombre avec néons froids, Fantasy médiévale lumineuse, Minimaliste corporate...)` },
    { key: "mechanismesJeu", q: `🕹️ Mécanismes de jeu / Interactions clés (Ex: Exploration 3D en monde ouvert, Puzzle-platformer tour par tour, Système de crafting et progression RPG...)` }
  ], [projectNameStr]);

  const [contraintesChat, setContraintesChat] = useState<{ role: "ai" | "user", content: string }[]>([]);

  useEffect(() => {
    if (step === "contraintes" && contraintesChat.length === 0) {
      setContraintesChat([
        { role: "ai", content: `Bonjour ! Pour bien cadrer le développement de ${projectNameStr}, je vais vous poser 6 questions rapides. (Appuyez sur Entrée pour répondre, ou laissez vide pour passer).` },
        { role: "ai", content: CONTRAINTES_QUESTIONS[0].q }
      ]);
    }
  }, [step, projectNameStr, CONTRAINTES_QUESTIONS]);

  const [contraintesStepIndex, setContraintesStepIndex] = useState(0)
  const [contraintesInput, setContraintesInput] = useState("")
  // Étape 5: Design Brief (avant idéation)
  const [designBrief, setDesignBrief] = useState<{
    universe: string; palette: string[]; mechanics: string[]; customAmbiance: string; typography: string;
  }>({ universe: "", palette: [], mechanics: [], customAmbiance: "", typography: "" })
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [conceptStyle, setConceptStyle] = useState<{ gradient: string; accent: string; label: string; particles: string[] } | null>(null)
  const [hoveredUniverse, setHoveredUniverse] = useState<string | null>(null)
  const [colorPrompt, setColorPrompt] = useState("")
  // Étapes 7-10: manager edits des détails du projet
  const [managerDesign, setManagerDesign] = useState<{
    visual_style: string; artistic_direction: string; ambiance: string; color_palette: string;
  } | null>(null)
  const [managerStack, setManagerStack] = useState<string[]>([])
  const [managerModules, setManagerModules] = useState<string[]>([])
  const [managerDeliverables, setManagerDeliverables] = useState<string[]>([])
  const [newDeliverable, setNewDeliverable] = useState("")
  const [editingDeliverableIndex, setEditingDeliverableIndex] = useState<number | null>(null)
  const [editingDeliverableText, setEditingDeliverableText] = useState<string>("")

  // NEW: Advanced Task Workflow
  const [managerFeatures, setManagerFeatures] = useState<any[]>([])
  const [taskFillMode, setTaskFillMode] = useState<'ai' | 'manual' | null>('ai')
  const [manualTaskInput, setManualTaskInput] = useState({ title: '', description: '', priority: 'Medium', duration_hours: 4 })
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [wizardMembers, setWizardMembers] = useState<{ id: string; full_name: string; position: string; avatar_url: string }[]>([])
  const [selectedTeamLeader, setSelectedTeamLeader] = useState<string | null>(null)
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])

  // AI Assign Proposals
  const [aiAssignmentsProposed, setAiAssignmentsProposed] = useState(false)

  // AI Planning Timeline
  const [dynamicPlanning, setDynamicPlanning] = useState<any>(null)
  const [isGeneratingPlanning, setIsGeneratingPlanning] = useState(false)

  const generateDynamicPlanning = async (forceRegenerate = false) => {
    if (!selectedProject || (dynamicPlanning && !forceRegenerate)) return;
    setIsGeneratingPlanning(true);
    try {
      // Compute real weeks from manager's dates, fallback to feasibility data
      let simWeeks: number;
      if (startDate && deadline) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const realWeeks = Math.max(1, Math.round((new Date(deadline).getTime() - new Date(startDate).getTime()) / msPerWeek));
        simWeeks = Math.max(1, Math.round(realWeeks * (timePressure / 100)));
      } else if (deadline) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const realWeeks = Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek));
        simWeeks = Math.max(1, Math.round(realWeeks * (timePressure / 100)));
      } else {
        const weeks = feasibilityData?.duration?.realistic_weeks || 12;
        simWeeks = Math.max(1, Math.round(weeks * (timePressure / 100)));
      }
      
      const payload = {
        project_title: selectedProject.title,
        project_description: selectedProject.description,
        weeks: simWeeks,
        stack: selectedProject.stack || []
      };
      
      const res = await axios.post(`${API_BASE_URL}/api/wizard/generate-planning`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDynamicPlanning(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPlanning(false);
    }
  }
  const [isAiAssigning, setIsAiAssigning] = useState(false)

  // AI Matchmaking
  const [isAiMatchmaking, setIsAiMatchmaking] = useState(false)
  const [matchScores, setMatchScores] = useState<Record<string, number>>({})

  // Workload Indicator
  const [overloadAlert, setOverloadAlert] = useState<{ memberName: string, workload: number } | null>(null)

  const getMemberWorkload = useCallback((memberId: string) => {
    const hash = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return 30 + (hash * 13) % 65 // Returns 30 to 94
  }, [])

  const handleAiMatchmaking = () => {
    setIsAiMatchmaking(true)
    setMatchScores({})
    setTimeout(() => {
      if (wizardMembers.length > 0) {
        const newScores: Record<string, number> = {}
        wizardMembers.forEach(m => {
          const workload = getMemberWorkload(m.id)
          const hash = m.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          // Inverse relationship: lower workload gives a higher match score
          newScores[m.id] = Math.max(40, Math.min(99, 100 - Math.round(workload * 0.7) + (hash % 15)))
        })
        const sortedMembers = [...wizardMembers].sort((a, b) => newScores[b.id] - newScores[a.id])
        if (sortedMembers.length > 0) {
          setSelectedTeamLeader(sortedMembers[0].id)
          const membersToSelect = sortedMembers.slice(1, Math.min(4, sortedMembers.length)).map(m => m.id)
          setSelectedTeamMembers(membersToSelect)
        }
        setMatchScores(newScores)
      }
      setIsAiMatchmaking(false)
    }, 1500)
  }
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<ProjectTask | null>(null)

  // ── Négociateur IA — inline chat per task card ─────────────────────────────
  const [negotiatingTaskId, setNegotiatingTaskId] = useState<string | null>(null)
  const [negotiateInputs, setNegotiateInputs] = useState<Record<string, string>>({})
  const [isNegotiating, setIsNegotiating] = useState(false)

  const handleNegotiate = (taskIndex: number, taskId: string) => {
    const input = negotiateInputs[taskId] || ''
    if (!input.trim()) return
    setIsNegotiating(true)
    setTimeout(() => {
      const next = [...managerFeatures]
      const task = next[taskIndex]
      const lower = input.toLowerCase()
      const hourMatch = lower.match(/(\d+)\s*h/)

      if (hourMatch && (lower.includes('rédui') || lower.includes('redui') || lower.includes('diminue') || lower.includes('passe'))) {
        task.duration_hours = parseInt(hourMatch[1])
        task.description = `[IA] Durée réduite à ${hourMatch[1]}h selon votre demande. ` + task.description
      } else if (hourMatch && (lower.includes('augment') || lower.includes('ajoute'))) {
        task.duration_hours = parseInt(hourMatch[1])
        task.description = `[IA] Durée augmentée à ${hourMatch[1]}h. ` + task.description
      } else if (lower.includes('développeur') || lower.includes('dev')) {
        task.assigned_member_name = 'Développeur Full-Stack'
        task.role = 'Développeur'
      } else if (lower.includes('designer') || lower.includes('design')) {
        task.assigned_member_name = 'UI/UX Designer'
        task.role = 'Designer'
      } else if (lower.includes('simplif') || lower.includes('raccourc')) {
        task.duration_hours = Math.max(2, Math.floor(task.duration_hours * 0.65))
        task.description = '[IA] Tâche simplifiée. ' + task.description.slice(0, 120) + '...'
      } else if (lower.includes('urgent') || lower.includes('priorit')) {
        task.risk_level = 'High'
        task.title = '🔴 ' + task.title
      } else if (lower.includes('renomme') || lower.includes('appelle') || lower.includes('titre')) {
        const parts = input.split(/[:—–-]/).slice(1).join('').trim()
        if (parts.length > 3) task.title = parts
      } else {
        task.description = `[IA] ${input} — ` + task.description
      }

      setManagerFeatures(next)
      setNegotiatingTaskId(null)
      setNegotiateInputs(prev => ({ ...prev, [taskId]: '' }))
      setIsNegotiating(false)
    }, 1600)
  }

  // ── Débat IA — two-agent debate per task detail ─────────────────────────
  const [debateVerdicts, setDebateVerdicts] = useState<Record<string, { verdict: string; revisedHours: number }>>({})
  const [isDebating, setIsDebating] = useState(false)
  const [isFastTracking, setIsFastTracking] = useState(false)
  const [scoreInfoOpen, setScoreInfoOpen] = useState<number | null>(null)
  const [scoreAuditData, setScoreAuditData] = useState<any | null>(null)
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  const openScoreAudit = async (e: React.MouseEvent, r: any) => {
    e.stopPropagation()
    setScoreInfoOpen(r.rank)
    setScoreAuditData(null)
    setIsLoadingAudit(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/brainstorming/copilot/score-formula`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          idea_title: r.title,
          idea_description: r.description || r.verdict || '',
          confidence: r.confidence,
          feasibility: r.feasibility || 'Moyen',
          verdict: r.verdict || ''
        })
      })
      const data = await res.json()
      setScoreAuditData(data)
    } catch (err) {
      console.error('Score audit error:', err)
    } finally {
      setIsLoadingAudit(false)
    }
  }
  const [validationMousePos, setValidationMousePos] = useState({ x: -1000, y: -1000 })

  const handleValidationMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setValidationMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleFastTrack = () => {
    setIsFastTracking(true)
    const pendingTasks = managerFeatures.filter(t => t.status !== 'approved')

    let delay = 0
    pendingTasks.forEach((task, index) => {
      setTimeout(() => {
        setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (task.id || task.title) ? { ...t, status: 'approved' } : t))
        if (index === pendingTasks.length - 1) {
          setTimeout(() => {
            setIsFastTracking(false)
            setToast({ message: `✅ ${pendingTasks.length} tâches sélectionnées.`, type: 'info' })
            setTimeout(() => setToast(null), 4000)
          }, 300)
        }
      }, delay)
      delay += 150
    })

    if (pendingTasks.length === 0) {
      setIsFastTracking(false)
      setToast({ message: `Toutes les tâches sont déjà approuvées.`, type: 'info' })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleAiAssignTasks = () => {
    setIsAiAssigning(true)

    // gather available members
    let availableMembers = [
      ...(selectedTeamLeader ? [wizardMembers.find(m => m.id === selectedTeamLeader)] : []),
      ...wizardMembers.filter(m => selectedTeamMembers.includes(m.id))
    ].filter(Boolean) as { id: string; full_name: string; position: string; avatar_url: string }[]

    // Do not assign tasks to Ines as she is an assistant
    availableMembers = availableMembers.filter(m => !m.full_name.toLowerCase().includes('ines'))

    if (availableMembers.length === 0) {
      setIsAiAssigning(false)
      setToast({ message: `Veuillez sélectionner au moins un membre de l'équipe d'abord.`, type: 'info' })
      setTimeout(() => setToast(null), 3000)
      return
    }

    let delay = 0
    managerFeatures.forEach((task, index) => {
      setTimeout(() => {
        // Simple matchmaking logic
        const lowerCat = task.category.toLowerCase()
        const lowerTitle = task.title.toLowerCase()
        let bestMatch = availableMembers[0]

        if (lowerCat.includes('design') || lowerTitle.includes('ui') || lowerTitle.includes('ux') || lowerTitle.includes('graph')) {
          bestMatch = availableMembers.find(m => m.position?.toLowerCase().includes('design') || m.position?.toLowerCase().includes('artist')) || bestMatch
        } else if (lowerCat.includes('development') || lowerCat.includes('setup') || lowerTitle.includes('dev')) {
          bestMatch = availableMembers.find(m => m.position?.toLowerCase().includes('dev')) || bestMatch
        } else if (lowerCat.includes('testing') || lowerTitle.includes('qa')) {
          bestMatch = availableMembers.find(m => m.position?.toLowerCase().includes('qa') || m.position?.toLowerCase().includes('test')) || bestMatch
        }

        setManagerFeatures(prev => prev.map(t => {
          if ((t.id || t.title) !== (task.id || task.title)) return t;
          if (t.is_veille_task) return t; // La tâche de veille a déjà tous les membres assignés
          return { ...t, assigned_member_id: bestMatch.id, assigned_member_name: bestMatch.full_name, ai_proposed: true };
        }))

        if (index === managerFeatures.length - 1) {
          setTimeout(() => {
            setIsAiAssigning(false)
            setAiAssignmentsProposed(true)
            setToast({ message: `🤖 IA : Propositions d'assignation terminées.`, type: 'info' })
            setTimeout(() => setToast(null), 3000)
          }, 300)
        }
      }, delay)
      delay += 100
    })
  }

  const handleAcceptAllAssignments = () => {
    setManagerFeatures(prev => prev.map(t => ({ ...t, ai_proposed: false })))
    setAiAssignmentsProposed(false)
    setToast({ message: `✅ Toutes les propositions IA ont été acceptées.`, type: 'info' })
    setTimeout(() => setToast(null), 3000)
  }

  const handleDebateVerdict = (task: ProjectTask) => {
    if (isDebating) return
    setIsDebating(true)
    setTimeout(() => {
      const taskId = task.id || task.title
      const originalHours = task.duration_hours
      const isHighRisk = task.risk_level === 'High'
      // Revised estimate: +30% for high risk, +20% for normal, capped at 2x
      const margin = isHighRisk ? 1.35 : 1.22
      const revisedHours = Math.min(originalHours * 2, Math.round(originalHours * margin / 4) * 4)
      const verdict = `Après analyse croisée, l’IA recommande de réviser à **${revisedHours}h** (vs ${originalHours}h initiales). ${isHighRisk
        ? `Le niveau de risque élevé justifie une marge de sécurité de +35%. Prévoir un buffer de test supplémentaire.`
        : `Une marge de +22% est prudente pour absorber les aléas techniques. L’estimation reste réaliste.`
        }`
      setDebateVerdicts(prev => ({ ...prev, [taskId]: { verdict, revisedHours } }))
      setIsDebating(false)
    }, 1800)
  }

  // task inline edit mode
  // AI Command Palette
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false)
  const [cmdInput, setCmdInput] = useState('')
  const [roleAutocomplete, setRoleAutocomplete] = useState<string | null>(null)

  // All team roles with their search aliases
  const TEAM_ROLES: { label: string; aliases: string[] }[] = [
    { label: 'Tech Lead',               aliases: ['tech', 'tech lead', 'techlead', 'lead tech'] },
    { label: 'Développeur Full-Stack',  aliases: ['full', 'fullstack', 'full-stack', 'full stack', 'développeur', 'dev full'] },
    { label: 'Développeur Frontend',    aliases: ['front', 'frontend', 'front-end', 'dev front'] },
    { label: 'Développeur Backend',     aliases: ['back', 'backend', 'back-end', 'dev back'] },
    { label: 'Développeur Mobile',      aliases: ['mobile', 'dev mobile', 'ios', 'android', 'flutter'] },
    { label: 'UI/UX Designer',          aliases: ['design', 'designer', 'ux', 'ui', 'ui/ux', 'ux/ui'] },
    { label: 'DevOps / Infra',          aliases: ['devops', 'infra', 'ops', 'cloud', 'sre'] },
    { label: 'QA / Testeur',            aliases: ['qa', 'test', 'testeur', 'qualité', 'quality'] },
    { label: 'Architecte Technique',    aliases: ['archi', 'architecte', 'architect', 'solution architect'] },
    { label: 'Data Engineer',           aliases: ['data', 'data engineer', 'dataengineer', 'pipeline'] },
    { label: 'Data Scientist',          aliases: ['scientist', 'data scientist', 'ml engineer', 'machine learning'] },
    { label: 'Ingénieur IA / ML',       aliases: ['ia', 'ai', 'ml', 'llm', 'deep learning', 'ingénieur ia'] },
    { label: 'Scrum Master',            aliases: ['scrum', 'scrum master', 'scrummaster', 'agile'] },
    { label: 'Project Manager',         aliases: ['manager', 'pm', 'chef de projet', 'responsable', 'project manager'] },
    { label: 'Product Owner',           aliases: ['product', 'po', 'product owner', 'productowner'] },
    { label: 'Artiste 3D',              aliases: ['3d', 'artiste', 'modélisateur', 'blender', 'maya'] },
    { label: 'Game Developer',          aliases: ['game', 'unity', 'unreal', 'gameplay', 'game dev'] },
    { label: 'Ingénieur Sécurité',      aliases: ['sécu', 'secu', 'sécurité', 'security', 'cybersec', 'pentest'] },
    { label: 'Développeur Blockchain',  aliases: ['blockchain', 'web3', 'solidity', 'smart contract'] },
  ]

  const getRoleAutocomplete = (input: string): string | null => {
    const lower = input.toLowerCase()
    // Extract the last word being typed after "assigne au/à/a"
    const afterAssign = lower.match(/assigne\s+(?:au|à|a|l'|un)\s+(.+)$/)
    if (!afterAssign) return null
    const query = afterAssign[1].trim()
    if (query.length < 2) return null
    // Find first role whose label or alias starts with the query
    const match = TEAM_ROLES.find(r =>
      r.label.toLowerCase().startsWith(query) ||
      r.aliases.some(a => a.startsWith(query))
    )
    if (!match) return null
    // Return the full label only if it's different from what's already typed
    if (match.label.toLowerCase() === query) return null
    return match.label
  }

  const [taskEditMode, setTaskEditMode] = useState(false)
  const [taskEditDraft, setTaskEditDraft] = useState<Partial<ProjectTask>>({})
  const [taskEditChatInput, setTaskEditChatInput] = useState('')
  const [isTaskEditChatLoading, setIsTaskEditChatLoading] = useState(false)

  const handleTaskEditChat = (task: ProjectTask) => {
    const input = taskEditChatInput.trim()
    if (!input) return
    setIsTaskEditChatLoading(true)
    setTimeout(() => {
      const lower = input.toLowerCase()
      const hourMatch = lower.match(/(\d+)\s*h/)
      const draft = { ...taskEditDraft }
      if (hourMatch && (lower.includes('r\u00e9dui') || lower.includes('redui') || lower.includes('diminue') || lower.includes('passe') || lower.includes('mets'))) {
        draft.duration_hours = parseInt(hourMatch[1])
      } else if (hourMatch && (lower.includes('augment') || lower.includes('ajoute'))) {
        draft.duration_hours = parseInt(hourMatch[1])
      } else if (lower.includes('d\u00e9veloppeur') || lower.includes('dev')) {
        draft.assigned_member_name = 'D\u00e9veloppeur Full-Stack'; draft.role = 'D\u00e9veloppeur'
      } else if (lower.includes('designer') || lower.includes('design')) {
        draft.assigned_member_name = 'UI/UX Designer'; draft.role = 'Designer'
      } else if (lower.includes('manager') || lower.includes('chef')) {
        draft.assigned_member_name = 'Project Manager'; draft.role = 'Project Manager'
      } else if (lower.includes('simplif') || lower.includes('raccourc')) {
        draft.duration_hours = Math.max(2, Math.floor((draft.duration_hours ?? task.duration_hours) * 0.65))
        draft.description = '[IA] T\u00e2che simplifi\u00e9e. ' + (draft.description || task.description).slice(0, 120) + '...'
      } else if (lower.includes('urgent') || lower.includes('priorit')) {
        draft.risk_level = 'High'; draft.title = '\ud83d\udd34 ' + (draft.title || task.title)
      } else if (lower.includes('titre') || lower.includes('renomme')) {
        const parts = input.split(/[:—–-]/).slice(1).join('').trim()
        if (parts.length > 2) draft.title = parts
      } else {
        draft.description = `[IA] ${input} — ` + (draft.description || task.description)
      }
      setTaskEditDraft(draft)
      setTaskEditChatInput('')
      setIsTaskEditChatLoading(false)
    }, 1200)
  }

  const applyTaskEditDraft = () => {
    if (!selectedTaskForDetail) return
    const updated = { ...selectedTaskForDetail, ...taskEditDraft }
    setManagerFeatures(prev => prev.map(t =>
      (t.id || t.title) === (selectedTaskForDetail.id || selectedTaskForDetail.title) ? updated : t
    ))
    setSelectedTaskForDetail(updated)
    setTaskEditMode(false); setTaskEditDraft({}); setTaskEditChatInput('')
    setToast({ message: 'Tache mise a jour !', type: 'info' })
    setTimeout(() => setToast(null), 3000)
  }

  const parseCmdInput = (input: string, task: any): Record<string, { field: string, before: any, after: any }> | null => {
    if (!input.trim() || input.trim().length < 3) return null
    const lower = input.toLowerCase()
    const diff: Record<string, { field: string, before: any, after: any }> = {}

    // 1. Durée
    const hourMatch = lower.match(/(\d+)\s*(?:h|heure|heures)/)
    if (hourMatch) {
      const newH = parseInt(hourMatch[1])
      if (newH !== task.duration_hours) diff['duration_hours'] = { field: 'Durée', before: task.duration_hours, after: newH }
    } else if (lower.includes('réduis de moitié') || lower.includes('simplifie')) {
      const newH = Math.max(2, Math.floor((task.duration_hours || 8) * 0.5))
      if (newH !== task.duration_hours) diff['duration_hours'] = { field: 'Durée', before: task.duration_hours, after: newH }
    } else if (lower.includes('réduis') || lower.includes('diminue')) {
      const newH = Math.max(1, Math.floor((task.duration_hours || 8) * 0.75))
      if (newH !== task.duration_hours) diff['duration_hours'] = { field: 'Durée', before: task.duration_hours, after: newH }
    } else if (lower.includes('augmente') || lower.includes('allonge')) {
      const newH = (task.duration_hours || 8) + 4
      diff['duration_hours'] = { field: 'Durée', before: task.duration_hours, after: newH }
    }

    // 2. Assignation de rôle — only when "assigne" keyword is present
    const currentRole = task.role || task.assigned_member_name || 'Non assigné'
    let newRole = null
    const hasAssign = lower.includes('assigne')

    if (hasAssign) {
      // Extract what comes after "assigne au/à/a/l'/un"
      const afterAssignMatch = lower.match(/assigne\s+(?:au|à|a|l'|un)\s+([\w\sÀ-ÿ\-\/]+)/)
      const queryAfterAssign = afterAssignMatch ? afterAssignMatch[1].trim() : ''

      // Match against full TEAM_ROLES list by aliases — only on the extracted query
      for (const r of TEAM_ROLES) {
        if (
          r.label.toLowerCase() === queryAfterAssign ||
          r.aliases.some(a => a === queryAfterAssign || queryAfterAssign.startsWith(a) || a.startsWith(queryAfterAssign))
        ) {
          newRole = r.label
          break
        }
      }

      // Fallback: capitalize free-form query
      if (!newRole && queryAfterAssign.length > 1) {
        newRole = queryAfterAssign.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      }
    }

    if (newRole && newRole.toLowerCase() !== currentRole.toLowerCase()) {
      diff['suggested_role'] = { field: 'Rôle', before: currentRole, after: newRole }
    }

    // 3. Priorité & Risque
    if (lower.includes('urgent') || lower.includes('critique') || lower.includes('prioritaire')) {
      if (task.priority !== 'High') diff['priority'] = { field: 'Priorité', before: task.priority || 'Medium', after: 'High' }
      if (task.risk_level !== 'High') diff['risk_level'] = { field: 'Risque', before: task.risk_level || 'Low', after: 'High' }
    } else if (lower.includes('priorité moyenne') || lower.includes('priorité medium') || lower.includes('normale') || lower.includes('medium priorit')) {
      if (task.priority !== 'Medium') diff['priority'] = { field: 'Priorité', before: task.priority || 'High', after: 'Medium' }
    } else if (lower.includes('basse priorité') || lower.includes('pas urgent')) {
      if (task.priority !== 'Low') diff['priority'] = { field: 'Priorité', before: task.priority || 'Medium', after: 'Low' }
    }
    
    if (lower.includes('risque élevé') || lower.includes('risqué')) {
      if (task.risk_level !== 'High') diff['risk_level'] = { field: 'Risque', before: task.risk_level || 'Low', after: 'High' }
    } else if (lower.includes('risque faible') || lower.includes('sécurisé')) {
      if (task.risk_level !== 'Low') diff['risk_level'] = { field: 'Risque', before: task.risk_level || 'High', after: 'Low' }
    }

    // 4. Sprint
    const sprintMatch = lower.match(/sprint\s+(\d+)/)
    const currentSprint = task.sprint || 1
    if (sprintMatch) {
      const newS = parseInt(sprintMatch[1])
      if (newS !== currentSprint) diff['sprint'] = { field: 'Sprint', before: currentSprint, after: newS }
    } else if (lower.includes('sprint suivant')) {
      diff['sprint'] = { field: 'Sprint', before: currentSprint, after: currentSprint + 1 }
    } else if (lower.includes('sprint précédent')) {
      const newS = Math.max(1, currentSprint - 1)
      if (newS !== currentSprint) diff['sprint'] = { field: 'Sprint', before: currentSprint, after: newS }
    }

    // 5. Titre & Catégorie
    const titleMatch = input.match(/(?:titre|renomme|appelle)[:\s]+(.+)/i)
    if (titleMatch) {
      const newT = titleMatch[1].trim()
      if (newT.length > 0 && newT !== task.title) diff['title'] = { field: 'Titre', before: task.title, after: newT }
    }
    
    const categoryMatch = input.match(/(?:catégorie|categorie)[:\s]+(.+)/i)
    if (categoryMatch) {
      const newC = categoryMatch[1].trim()
      if (newC.length > 0 && newC !== task.category) diff['category'] = { field: 'Catégorie', before: task.category || 'Général', after: newC }
    }

    return Object.keys(diff).length > 0 ? diff : null
  }

  const applyCmdDiff = (diff: Record<string, { field: string, before: any, after: any }> | null) => {
    if (!diff || !selectedTaskForDetail) return
    const updates = Object.fromEntries(Object.entries(diff).map(([k, v]) => [k, v.after]))
    const updated = { ...selectedTaskForDetail, ...updates }
    setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (selectedTaskForDetail.id || selectedTaskForDetail.title) ? updated : t))
    setSelectedTaskForDetail(updated)
    setCmdPaletteOpen(false); setCmdInput('')
    setToast({ message: 'Tache mise a jour !', type: 'info' })
    setTimeout(() => setToast(null), 3000)
  }

  // NEW: Copilot Prompt-to-UI states
  const [copilotPrompt, setCopilotPrompt] = useState("")
  const [isCopilotThinking, setIsCopilotThinking] = useState(false)
  const [copilotTheme, setCopilotTheme] = useState<{ bg: string, cardBg: string, border: string, text: string, shadow: string, radius: string }>({
    bg: '#f1f5f9', cardBg: '#ffffff', border: '#cbd5e1', text: '#334155', shadow: '0 10px 15px -3px rgba(0,0,0,0.1)', radius: '16px'
  })
  const [timeLapseWeek, setTimeLapseWeek] = useState(1);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{ success: string[], issues: string[] } | null>(null)

  useEffect(() => {
    if (detailsTab === "equipe" && wizardMembers.length === 0 && token) {
      fetch(`${API_BASE_URL}/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => setWizardMembers(Array.isArray(data) ? data : []))
        .catch(() => { })
    }
  }, [detailsTab, token])

  useEffect(() => {
    if (detailsTab === "equipe" && selectedProject?.stack && selectedProject.stack.length > 0 && !auditResult && !isAuditing) {
      setIsAuditing(true);
      axios.post(`${API_BASE_URL}/api/wizard/audit-stack`, { stack: selectedProject.stack }, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setAuditResult(res.data))
        .catch(() => setAuditResult({ success: ["La stack sélectionnée est standard."], issues: ["Vérification dynamique indisponible."] }))
        .finally(() => setIsAuditing(false));
    }
  }, [detailsTab, selectedProject, auditResult, isAuditing, token]);
  const [isPitchPlaying, setIsPitchPlaying] = useState(false)
  const [pitchProgress, setPitchProgress] = useState(0)

  // NEW: Feasibility Analysis
  const [feasibilityData, setFeasibilityData] = useState<any>(null)
  const [isLoadingFeasibility, setIsLoadingFeasibility] = useState(false)

  const [dynamicSimulation, setDynamicSimulation] = useState<{ score: number, level: string, summary: string, risks: string[] } | null>(null);
  const [isSimulatingLive, setIsSimulatingLive] = useState(false);
  const simTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!feasibilityData || !selectedProject) return;
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current);
    setIsSimulatingLive(true);
    simTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/api/wizard/simulate-feasibility-live`, {
          project_title: selectedProject.title,
          project_description: selectedProject.description || "",
          budget_pressure: budgetPressure,
          time_pressure: timePressure,
          base_score: feasibilityData.feasibility_score
        });
        setDynamicSimulation(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSimulatingLive(false);
      }
    }, 800);
  }, [budgetPressure, timePressure, feasibilityData, selectedProject]);

  // NEW: Expanded project cards (ideation step)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [whatIfOverrides, setWhatIfOverrides] = useState<{ resourceLimit?: boolean; mvpSpeed?: boolean; b2b?: boolean; junior?: boolean }>({})
  const [devilsAdvocateMode, setDevilsAdvocateMode] = useState(false)

  // NEW: Micro-Chat Contextuel pour chaque carte
  const [cardChats, setCardChats] = useState<Record<number, { role: 'user' | 'ai', content: string }[]>>({})
  const [cardInputs, setCardInputs] = useState<Record<number, string>>({})
  const [isCardChatLoading, setIsCardChatLoading] = useState<Record<number, boolean>>({})

  const handleCardChatSubmit = (e: React.FormEvent, projId: number, proj: GeneratedProject) => {
    e.preventDefault()
    const text = cardInputs[projId]?.trim()
    if (!text) return

    setCardChats(prev => ({
      ...prev,
      [projId]: [...(prev[projId] || []), { role: 'user', content: text }]
    }))
    setCardInputs(prev => ({ ...prev, [projId]: '' }))
    setIsCardChatLoading(prev => ({ ...prev, [projId]: true }))

    setTimeout(() => {
      const isTech = text.toLowerCase().match(/stack|tech|code|react|node|base|serveur|perf/)
      const isTime = text.toLowerCase().match(/temps|durée|semaine|mois|vite/)
      const isRisk = text.toLowerCase().match(/risque|danger|difficile|problème/)

      let aiResponse = `C'est un point clé pour l'approche "${proj.title}". `
      if (isTech) aiResponse += `Le choix de ${proj.stack?.[0] || 'cette architecture'} garantit une flexibilité maximale pour un projet de niveau ${proj.complexity}. Vous pourrez facilement pivoter plus tard.`
      else if (isTime) aiResponse += `Ce scénario est estimé à ${proj.scenarios?.balanced?.duration_weeks || 12} semaines. Accélérer demanderait de couper des livrables non-essentiels.`
      else if (isRisk) aiResponse += `Le risque principal est l'intégration technique, mais l'architecture modulaire suggérée permet de circonscrire ce risque rapidement.`
      else aiResponse += `Cette stratégie maximise vos chances de réussite sur ce positionnement. Souhaitez-vous explorer un autre compromis ?`

      setCardChats(prev => ({
        ...prev,
        [projId]: [...(prev[projId] || []), { role: 'ai', content: aiResponse }]
      }))
      setIsCardChatLoading(prev => ({ ...prev, [projId]: false }))
    }, 1200)
  }

  // NEW: Éditeur Sémantique (Concept Validation)
  const [semanticVision, setSemanticVision] = useState("")
  const [isEditingVision, setIsEditingVision] = useState(false)
  const [semanticAlerts, setSemanticAlerts] = useState<{ word: string, msg: string, type: 'warning' | 'success' }[]>([])

  useEffect(() => {
    if (step === 'concept-validation' && selectedProject) {
      setSemanticVision(selectedProject.description || "")
      analyzeSemantics(selectedProject.description || "")
    }
  }, [step, selectedProject])

  const analyzeSemantics = (text: string) => {
    const alerts: { word: string, msg: string, type: 'warning' | 'success' }[] = []
    const t = text.toLowerCase()

    if (t.match(/multijoueur|en ligne|multiplayer/)) {
      alerts.push({ word: 'Multijoueur', msg: 'Augmente la complexité serveur et le coût d\'infrastructure.', type: 'warning' })
    }
    if (t.match(/blockchain|crypto|nft|web3/)) {
      alerts.push({ word: 'Blockchain', msg: 'Risque réglementaire élevé. Faisabilité complexe.', type: 'warning' })
    }
    if (t.match(/ia|intelligence artificielle|machine learning/)) {
      alerts.push({ word: 'IA', msg: 'Excellent pour l\'innovation. Nécessite une API (OpenAI).', type: 'success' })
    }
    if (t.match(/temps réel|real time|websocket/)) {
      alerts.push({ word: 'Temps réel', msg: 'Architecture stateful requise (WebSockets).', type: 'warning' })
    }
    if (t.match(/simple|facile|minimaliste|mvp/)) {
      alerts.push({ word: 'MVP', msg: 'Scope maîtrisé. Idéal pour un développement rapide.', type: 'success' })
    }
    if (t.match(/million|massif|millions/)) {
      alerts.push({ word: 'Haute Scalabilité', msg: 'Demande une architecture cloud avancée.', type: 'warning' })
    }
    setSemanticAlerts(alerts)
  }

  const handleSemanticChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setSemanticVision(val)
    analyzeSemantics(val)
  }

  // NEW: Breadcrumb sidebar state
  const [expandedPhase, setExpandedPhase] = useState<number>(1)

  const [newFeature, setNewFeature] = useState("")
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null)
  const [editingFeatureText, setEditingFeatureText] = useState<string>("")
  // Étape 12: prototype generating
  const [isGeneratingPrototype, setIsGeneratingPrototype] = useState(false)
  const [prototype, setPrototype] = useState<any>(null)

  // ── CO-PILOTING SYSTEM ────────────────────────────────────────────────────
  type AiMode = 'proactive' | 'copilot' | 'silent'
  type DecisionEntry = {
    id: string
    step: string
    stepLabel: string
    decision: string
    reason: string
    alternatives?: string[]
    impact?: string
    timestamp: Date
    type: 'approve' | 'reject' | 'modify' | 'fork'
  }
  const [aiMode, setAiMode] = useState<AiMode>('copilot')
  const [decisionLog, setDecisionLog] = useState<DecisionEntry[]>([])
  const [showDecisionLog, setShowDecisionLog] = useState(false)
  const setPendingDecision = (decision: { stepLabel: string; decision: string; type: DecisionEntry['type']; impact?: string; alternatives?: string[]; onConfirm?: () => void }) => {
    logDecision({ step, stepLabel: decision.stepLabel, decision: decision.decision, reason: '', type: decision.type, impact: decision.impact, alternatives: decision.alternatives })
    if (decision.onConfirm) { decision.onConfirm() }
  }
  const logDecision = (entry: Omit<DecisionEntry, 'id' | 'timestamp'>) => {
    setDecisionLog(prev => [{ ...entry, id: Date.now().toString(), timestamp: new Date() }, ...prev])
  }

  // ── CO-PILOT STATE ────────────────────────────────────────────────────────
  const [copilotSession, setCopilotSession] = useState<any>(null)
  const [copilotInput, setCopilotInput] = useState("")
  const [copilotMode, setCopilotMode] = useState<"creative" | "critical">("creative")
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isStartingCopilot, setIsStartingCopilot] = useState(false)
  const [isListeningCopilot, setIsListeningCopilot] = useState(false)
  const [copilotRecordingDuration, setCopilotRecordingDuration] = useState(0)
  const copilotChatRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const copilotChunksRef = useRef<Blob[]>([])
  const copilotStreamRef = useRef<MediaStream | null>(null)
  const copilotTimerRef = useRef<any>(null)

  // ── JARVIS VOICE VISUALIZER ───────────────────────────────────────────────
  const [voiceWaveBars, setVoiceWaveBars] = useState<number[]>(Array(28).fill(4))
  const [liveTranscript, setLiveTranscript] = useState("")
  const [highlightedWords, setHighlightedWords] = useState<string[]>([])
  const voiceAnimFrameRef = useRef<any>(null)
  const speechRecognitionRef = useRef<any>(null)
  const speechProducedTextRef = useRef(false) // true when SpeechRecognition produced final text
  const copilotInputRef = useRef('') // mirrors copilotInput state, readable in stale closures
  const JARVIS_KEYWORDS = ["mobile", "3d", "ia", "ai", "jeu", "game", "vr", "ar", "web", "api", "design", "simple", "complexe", "rapide", "sécurité", "données", "cloud", "blockchain", "react", "python", "unity", "animation", "dashboard", "analyse", "temps réel"]

  const startWaveAnimation = () => {
    const animate = () => {
      setVoiceWaveBars(prev => prev.map(() => Math.random() * 52 + 6))
      voiceAnimFrameRef.current = setTimeout(animate, 80)
    }
    animate()
  }

  const stopWaveAnimation = () => {
    if (voiceAnimFrameRef.current) clearTimeout(voiceAnimFrameRef.current)
    setVoiceWaveBars(Array(28).fill(4))
  }

  const detectKeywords = (text: string) => {
    const lower = text.toLowerCase()
    const found = JARVIS_KEYWORDS.filter(kw => lower.includes(kw))
    setHighlightedWords(found)
  }

  // ── VOICE SHORTCUTS (#3) ───────────────────────────────────────────────────
  const VOICE_SHORTCUTS: { triggers: string[]; action: () => void; label: string }[] = [
    {
      triggers: [
        'suivant', 'jarvis suivant', 'jarvis, suivant', 'idée suivante', 'autre idée',
        'non', 'non merci', 'pas celle-là', 'pas cette idée', 'je n\'aime pas',
        'j\'aime pas', 'j\'aime pas cette idée', 'j\'ai pas aimé', 'j\'ai pas aimé l\'idée',
        'je n\'aime pas cette idée', 'cette idée ne me convient pas', 'cette idée ne me plaît pas',
        'ça ne me convient pas', 'ça ne me plaît pas', 'ça me plaît pas', 'ça m\'intéresse pas',
        'pas convaincu', 'pas convaincue', 'je ne suis pas convaincu', 'je ne suis pas convaincue',
        'pas terrible', 'pas top', 'bof', 'mouais', 'nope', 'négatif',
        'on passe', 'passer', 'passe', 'on passe à la suivante', 'passe à la suivante',
        'autre chose', 'autre proposition', 'une autre idée', 'montre moi autre chose',
        'je rejette', 'rejeté', 'rejetée', 'je refuse', 'refusé',
        'ça ne m\'intéresse pas', 'ça ne m\'intéresse pas du tout',
        'changer d\'idée', 'changer', 'on change', 'idée différente',
      ],
      action: () => { if (copilotSession?.currentIdeaIndex !== undefined && copilotSession.currentIdeaIndex < 3) nextCopilotIdea(); else finalizeCopilot(); },
      label: '⏭ Idée suivante'
    },
    {
      triggers: [
        'valide', 'valider', 'je valide', 'on valide', 'je valide cette idée', 'ok je valide',
        'jarvis valide', 'jarvis, valide', 'jarvis valider',
        'j\'approuve', 'j\'approuve cette idée', 'j\'approuve l\'idée', 'approuvé', 'approuve',
        'cette idée est validée', 'cette idée est approuvée', 'idée validée', 'idée approuvée',
        'c\'est validé', 'c\'est bon', 'c\'est parfait', 'parfait', 'excellent', 'super',
        'go', 'go pour cette idée', 'on y va', 'on part avec ça', 'on part avec cette idée',
        'ça me convient', 'ça me convient parfaitement', 'je suis d\'accord', 'd\'accord',
        'ok', 'ok pour moi', 'ok c\'est bon', 'validé', 'validée', 'validation',
        'je confirme', 'confirmer', 'confirmé', 'je confirme cette idée',
        'adopté', 'adopter', 'j\'adopte cette idée', 'retenu', 'je retiens cette idée',
        'lancez', 'on lance', 'on peut lancer', 'lancer le projet',
      ],
      action: () => finalizeCopilot(),
      label: '✅ Validation'
    },
    { triggers: ['recommence', 'recommencer', 'jarvis recommence', 'tout recommencer', 'jarvis reset'], action: () => { setCopilotSession(null); setStep('warroom-input') }, label: '🔄 Recommencer' },
  ]
  const [detectedShortcut, setDetectedShortcut] = useState<string | null>(null)

  const checkVoiceShortcuts = (newFinalText: string) => {
    // Check against BOTH the new token AND the full accumulated text
    // (browser may split "Jarvis, suivant" into two separate final events)
    const accumulated = (copilotInputRef.current + ' ' + newFinalText).toLowerCase().trim()
    const cleanAccumulated = accumulated.replace(/[.,!?]/g, '').trim()
    for (const sc of VOICE_SHORTCUTS) {
      if (sc.triggers.some(t => {
        // Pour les mots simples (ex: "suivant", "valide"), exiger une correspondance exacte
        // Pour les phrases composées (ex: "jarvis suivant"), on tolère l'inclusion
        return t.includes(' ') ? accumulated.includes(t) : cleanAccumulated === t
      })) {
        setDetectedShortcut(sc.label)
        // Clear the input — don't let the command text get submitted
        setCopilotInput('')
        copilotInputRef.current = ''
        speechProducedTextRef.current = false
        stopCopilotRecording(true) // discard audio
        setTimeout(() => { sc.action(); setDetectedShortcut(null) }, 900)
        return true
      }
    }
    return false
  }

  // ── REFORMULATEUR INSTANTANÉ (#5) ─────────────────────────────────────────
  const [showReformulation, setShowReformulation] = useState(false)
  const [originalVoiceText, setOriginalVoiceText] = useState('')
  const [reformulatedText, setReformulatedText] = useState('')

  const reformulate = (raw: string): string => {
    let text = raw.trim()
    // Remove filler words
    const fillers = ['euh ', 'euh, ', 'bah ', 'bah, ', 'enfin ', 'bon ', 'voilà ', 'hm ', 'hmm ', 'eh bien ']
    fillers.forEach(f => { text = text.replace(new RegExp(f, 'gi'), '') })
    // Capitalize first letter
    text = text.charAt(0).toUpperCase() + text.slice(1)
    // Add period at end if missing
    if (!/[.!?]$/.test(text)) text += '.'
    // Replace hesitant patterns with assertive ones
    text = text.replace(/peut-être qu?[ae]/gi, 'Je propose que')
    text = text.replace(/je sais pas/gi, "Je n'ai pas encore de position définitive")
    text = text.replace(/un truc/gi, 'une fonctionnalité')
    text = text.replace(/faire ça/gi, 'implémenter cette approche')
    text = text.replace(/c'est bien/gi, "c'est une excellente direction")
    return text
  }

  const triggerReformulation = (raw: string) => {
    if (!raw.trim() || raw.trim().split(' ').length < 4) return // too short to reformulate
    const reformed = reformulate(raw)
    if (reformed === raw.trim() + '.') return // nothing changed
    setOriginalVoiceText(raw.trim())
    setReformulatedText(reformed)
    setShowReformulation(true)
  }

  // ── IN-APP TOAST SYSTEM ───────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const showToast = (message: string, type: 'error' | 'warning' | 'info' = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToast({ type, message })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 5000)
  }

  useEffect(() => {
    if (copilotChatRef.current) {
      copilotChatRef.current.scrollTop = copilotChatRef.current.scrollHeight
    }
  }, [copilotSession?.feedbackHistory])

  const startCopilot = async () => {
    if (!rawIdea.trim() || !projectName.trim()) return
    setIsStartingCopilot(true)
    setStep("warroom-agents")
    try {
      const res = await fetch(`${API_BASE_URL}/api/brainstorming/copilot/start`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ topic: rawIdea, project_name: projectName, mode: copilotMode })
      })
      const data = await res.json()
      setCopilotSession(data)
    } catch (err) {
      console.error("Copilot start error:", err)
    } finally {
      setIsStartingCopilot(false)
    }
  }

  const submitCopilotFeedback = async () => {
    if (!copilotInput.trim() || !copilotSession?.id) return
    const feedback = copilotInput.trim()

    // ── Check typed shortcuts first ──
    const cleanFeedback = feedback.toLowerCase().replace(/[.,!?éèêëàâùûüîïôç']/g, (c) => {
      const map: Record<string, string> = { 'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'à': 'a', 'â': 'a', 'ù': 'u', 'û': 'u', 'ü': 'u', 'î': 'i', 'ï': 'i', 'ô': 'o', 'ç': 'c', "'": " " }
      return map[c] ?? c
    }).trim()
    const normalizedFeedback = feedback.toLowerCase().replace(/[.,!?]/g, '').trim()
    for (const sc of VOICE_SHORTCUTS) {
      if (sc.triggers.some(t => {
        const cleanT = t.toLowerCase().replace(/[.,!?]/g, '').trim()
        // Phrase avec espaces → inclusion
        if (cleanT.includes(' ')) return normalizedFeedback.includes(cleanT)
        // Mot simple → correspondance exacte OU le message commence/finit par ce mot
        return normalizedFeedback === cleanT ||
          normalizedFeedback.startsWith(cleanT + ' ') ||
          normalizedFeedback.endsWith(' ' + cleanT)
      })) {
        setDetectedShortcut(sc.label)
        setCopilotInput('')
        setTimeout(() => { sc.action(); setDetectedShortcut(null) }, 900)
        return
      }
    }

    setCopilotInput("")
    setIsSubmittingFeedback(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/feedback`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ feedback, user_name: "Manager" })
      })
      const data = await res.json()
      setCopilotSession(data)
    } catch (err) { console.error("Copilot feedback error:", err) }
    finally { setIsSubmittingFeedback(false) }
  }

  const nextCopilotIdea = async () => {
    if (!copilotSession?.id) return
    setIsSubmittingFeedback(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/next`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_name: "Manager" })
      })
      const data = await res.json()
      setCopilotSession(data)
    } catch (err) { console.error("Copilot next error:", err) }
    finally { setIsSubmittingFeedback(false) }
  }

  const finalizeCopilot = async () => {
    if (!copilotSession?.id) return
    setIsSubmittingFeedback(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/finalize`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      setCopilotSession(data)
      setStep("warroom-pick")
    } catch (err) { console.error("Copilot finalize error:", err) }
    finally { setIsSubmittingFeedback(false) }
  }

  // ── STOP copilot recording ─────────────────────────────────────────────────
  const stopCopilotRecording = (discard = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      (mediaRecorderRef.current as any)._discard = discard
      mediaRecorderRef.current.stop()
    }
    if (copilotStreamRef.current) {
      copilotStreamRef.current.getTracks().forEach(t => t.stop())
      copilotStreamRef.current = null
    }
    // ── Stop Jarvis visualizer ──
    stopWaveAnimation()
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop()
      speechRecognitionRef.current = null
    }
    clearInterval(copilotTimerRef.current)
    setIsListeningCopilot(false)
    setCopilotRecordingDuration(0)
  }

  // ── START copilot recording — Jarvis Visualizer ────────────────────────────
  const startCopilotVoice = async () => {
    if (isListeningCopilot) {
      stopCopilotRecording(false)
      return
    }

    // ── Reset speech flag ──
    speechProducedTextRef.current = false
    copilotInputRef.current = copilotInput // snapshot current value
    setLiveTranscript("")
    setHighlightedWords([])
    startWaveAnimation()

    // ── Launch Web Speech API for live transcription ──
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.lang = 'fr-FR'
        recognition.continuous = true
        recognition.interimResults = true
        recognition.onresult = (event: any) => {
          let interim = ''
          let final = ''
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript
            if (event.results[i].isFinal) final += t
            else interim += t
          }
          const combined = (final || interim).trim()
          setLiveTranscript(combined)
          detectKeywords(combined)
          // ── Check voice shortcuts first ──
          if (final && checkVoiceShortcuts(final)) return
          if (final) {
            speechProducedTextRef.current = true
            const newText = (copilotInputRef.current ? copilotInputRef.current + ' ' : '') + final.trim()
            copilotInputRef.current = newText
            setCopilotInput(newText)
          }
        }
        recognition.onerror = () => { }
        recognition.start()
        speechRecognitionRef.current = recognition
      }
    } catch (_) { }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      copilotStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      copilotChunksRef.current = []
        ; (recorder as any)._discard = false

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) copilotChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if ((recorder as any)._discard) {
          copilotChunksRef.current = []
          return
        }

        // ── Web Speech API already transcribed in real-time → skip backend ──
        // Access the latest input value via a snapshot captured at stop time.
        // We read from the DOM input to avoid stale closure issues.
        // ── If SpeechRecognition already produced text → skip backend call ──
        if (speechProducedTextRef.current) {
          triggerReformulation(copilotInputRef.current) // use ref — no stale closure
          copilotChunksRef.current = []
          return
        }

        // ── Fallback: backend transcription (when SpeechRecognition unavailable) ──
        const audioBlob = new Blob(copilotChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size < 1000) { copilotChunksRef.current = []; return }

        try {
          showToast('Transcription en cours…', 'info')
          const fd = new FormData()
          fd.append('file', audioBlob, 'vocal.webm')
          const res = await fetch(`${API_BASE_URL}/api/ai/voice`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          })
          const data = await res.json()
          if (data?.text) {
            setCopilotInput(prev => (prev ? prev + ' ' : '') + data.text)
            triggerReformulation(data.text)
          } else {
            showToast('Transcription vide. Réessayez.', 'warning')
          }
        } catch (err) {
          console.warn('Backend transcription skipped (backend may be offline):', err)
        }
      }

      recorder.start()
      setIsListeningCopilot(true)
      setCopilotRecordingDuration(0)

      // Auto-stop after 60 s
      copilotTimerRef.current = setInterval(() => {
        setCopilotRecordingDuration(prev => {
          if (prev >= 59) {
            stopCopilotRecording(false)
            return 60
          }
          return prev + 1
        })
      }, 1000)

    } catch (err: any) {
      console.error('Microphone error:', err)
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        showToast("Accès au microphone refusé. Autorisez-le dans les paramètres du navigateur.", 'warning')
      } else {
        showToast("Impossible d'accéder au microphone.", 'error')
      }
    }
  }

  // 3D Tilt Effect State for the Generated Image
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setMousePosition({ x, y })
  }
  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 })
  }

  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [agentMessages])

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [contraintesChat])

  // Auto-navigate to ideation when projects are ready (user may be waiting on tech watch)
  useEffect(() => {
    if (ideationReady && waitingForIdeation) {
      setWaitingForIdeation(false)
      if (generatedProjects.length > 0) {
        setSelectedProject(generatedProjects[0])
      }
      setStep("concept-validation")
    }
  }, [ideationReady, waitingForIdeation, generatedProjects])

  // Load manager insights (Etape 12) when wizard opens
  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE_URL}/api/wizard/preferences`, {
      headers: { "Authorization": `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      if (d?.insights) setManagerInsights(d.insights)
    }).catch(() => { })
  }, [token])

  // Auto-advance Agent Discussion
  useEffect(() => {
    if (step === "warroom-agents" && isDiscussionFinished) {
      const timer = setTimeout(() => {
        setStep("warroom-pick")
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [step, isDiscussionFinished])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
    // In import (CDC) mode: do NOT auto-launch — user clicks "Analyser le Document" explicitly
    // In idea mode: no auto-launch needed either (War Room handles its own flow)
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  })

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i))

  // ── 4-PHASE BREADCRUMB DEFINITION ────────────────────────────────────────────
  const PHASES = [
    {
      id: 1, label: "Découverte", icon: "🔍",
      steps: mode === "import"
        ? [
            { step: "import-details", label: "Import" },
            { step: "cdc-extract", label: "Extraction IA" },
            { step: "cdc-risks", label: "Audit des Risques" },
            { step: "warroom-tech", label: "Veille tech" },
          ]
        : [
            { step: "warroom-input", label: "Saisie" },
            { step: "warroom-agents", label: "Agents" },
            { step: "warroom-pick", label: "Orientations" },
            { step: "warroom-params", label: "Paramètres" },
            { step: "contraintes", label: "Contraintes" },
            { step: "warroom-tech", label: "Veille tech" },
          ]
    },
    {
      id: 2, label: "Préproduction", icon: "🎬",
      steps: [
        { step: "concept-validation", label: "Concept" },
        { step: "feasibility", label: "Faisabilité" },
        { step: "projet-details", label: "Architecture" },
      ]
    },
    {
      id: 3, label: "Production", icon: "⚙️",
      steps: [
        { step: "fonctionnalites", label: "Backlog" },
      ]
    },
    {
      id: 4, label: "Intelligence", icon: "🧠",
      steps: [
        { step: "done", label: "Terminé" },
      ]
    },
  ]

  const STEP_TO_PHASE: Record<string, number> = {
    mode: 1, industry: 1, "warroom-input": 1, "import-details": 1, "cdc-extract": 1, "cdc-risks": 1,
    "warroom-agents": 1, "warroom-pick": 1, "warroom-params": 1,
    comprehension: 1, clarification: 1, contraintes: 1, "design-brief": 1, "warroom-tech": 1, ideation: 1,
    "concept-validation": 2, feasibility: 2, "projet-details": 2,
    fonctionnalites: 3, validation: 3, prototype: 3,
    loading: 3, done: 4,
  }

  const currentPhase = STEP_TO_PHASE[step] ?? 1

  // Auto-expand current phase in breadcrumb
  useEffect(() => {
    setExpandedPhase(currentPhase)
  }, [currentPhase])

  // Auto-scroll stepper into view smoothly
  useEffect(() => {
    const el = document.getElementById('active-stepper-item')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [step])

  // Auto-launch comprehension when entering warroom-params (fills the AI analysis section)
  useEffect(() => {
    if (step === "warroom-params" && !comprehensionData && !isGenerating12) {
      const desc = selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea
      if (desc.trim()) launchComprehension(desc, true) // silent=true: don't change step
    }
  }, [step])

  // ── 12-STEP PIPELINE ──────────────────────────────────────────────────────
  // Phase 1 (Étape 2-3): appel synchrone à /comprehend → affiche la carte comme pause UX

  // Feasibility analysis call
  const generateFeasibility = async (proj: GeneratedProject, scenarioKey: string) => {
    setIsLoadingFeasibility(true)
    try {
      const scenario = (proj.scenarios as any)?.[scenarioKey]
      const url = `${API_BASE_URL}/api/wizard/analyze-feasibility`
      console.log("DEBUG: Calling feasibility at:", url)

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          project_title: proj.title,
          project_description: proj.description,
          project_type: comprehensionData?.project_type || "Général",
          project_stack: proj.stack || [],
          team_size: teamSize || "4-8",
          scenario_name: scenarioKey,
          start_date: startDate || undefined,
          deadline: deadline || undefined,
          weeks: (() => {
            // Prioritize manager's deadline over AI scenario duration
            if (deadline) {
              const msPerWeek = 7 * 24 * 60 * 60 * 1000
              return Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek))
            }
            return scenario?.duration_weeks || 12
          })()
        })
      })
      if (!res.ok) throw new Error(`Feasibility failed: ${res.status}`)
      const data = await res.json()
      setFeasibilityData(data)
      // Always start at 100% (normal baseline) so the user sees the neutral state first
      setTimePressure(100)
    } catch (err) {
      console.error("Feasibility error:", err)
    } finally {
      setIsLoadingFeasibility(false)
    }
  }
  const launchComprehension = async (clarAnswers?: string, silent = false) => {
    if (!silent) setStep("contraintes")
    setIsGenerating12(true)
    setIdeationReady(false)
    setGeneratedProjects([])
    setGenerating12Msg("Analyse sémantique de votre demande...")
    try {
      const fd = new FormData()
      fd.append("manager_input", silent ? (clarAnswers || projectName) : rawIdea)
      fd.append("project_name", projectName)
      if (clarAnswers && !silent) fd.append("clarification_answers", clarAnswers)
      const res = await fetch(`${API_BASE_URL}/api/wizard/comprehend`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      setComprehensionData(data)
      setIsGenerating12(false)
      if (false && !silent && data.needs_clarification && !clarAnswers) {
        setClarificationQs(data.questions || [])
        setClarificationAs(new Array(data.questions?.length || 0).fill(""))
        setStep("clarification")
      }
      // else: reste sur comprehension — l'utilisateur clique "Continuer → Veille Tech"
    } catch (err) {
      console.error("Comprehension error:", err)
      setIsGenerating12(false)
      if (!silent) setStep("warroom-input")
    }
  }

  // Alias pour compatibilité (step clarification re-lance avec les réponses)
  const launchGeneration = launchComprehension

  // Phase 2a: utilisateur confirme la compréhension → va sur Veille Tech + lance idéation en arrière-plan
  const handleComprehensionContinue = () => {
    setStep("contraintes")
    const desc = selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea;
    if (!articles.length) fetchTechArticles(desc)
    launchIdeationBackground(desc)
  }

  // Phase 2b: idéation SSE en arrière-plan — ne change pas le step courant
  const launchIdeationBackground = async (techCtx?: string) => {
    setIdeationReady(false)
    const fd = new FormData()
    fd.append("manager_input", rawIdea)
    fd.append("project_name", projectName)
    const ctx = techCtx || analysisPlan?.enriched_description
    if (ctx) fd.append("tech_context", ctx)
    if (rejectionFeedback) fd.append("feedback", rejectionFeedback)
    if (comprehensionData) fd.append("comprehension_data", JSON.stringify(comprehensionData))
    try {
      const res = await fetch(`${API_BASE_URL}/api/wizard/generate-projects`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      })
      if (!res.body) { setIdeationReady(true); return }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue
          try {
            const evData = JSON.parse(line.slice(6))
            if (evData.phase === "IDEATION_DONE" || evData.phase === "DONE") {
              if (evData.projects?.length) setGeneratedProjects(evData.projects)
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error("Ideation background error:", err)
    } finally {
      setIdeationReady(true) // déclenche auto-navigation si waitingForIdeation
    }
  }

  // Quand l'utilisateur clique "Générer mes Projets" depuis la veille tech
  const handleProceedToIdeation = (enrichedCtx?: string) => {
    if (enrichedCtx) {
      launchIdeationBackground(enrichedCtx);
      setWaitingForIdeation(true);
    } else {
      if (ideationReady) {
        if (generatedProjects.length > 0) {
          setSelectedProject(generatedProjects[0])
        }
        setStep("concept-validation");
      } else {
        setWaitingForIdeation(true);
      }
    }
  }

  const extractConceptStyle = (text: string) => {
    const t = text.toLowerCase()
    if (t.includes("neon") || t.includes("cyber") || t.includes("futur") || t.includes("ia") || t.includes("ai") || t.includes("sci-fi") || t.includes("espace")) {
      return { gradient: "from-cyan-950 via-blue-950 to-violet-950", accent: "#22d3ee", label: "Direction Sci-Fi · Futuriste", particles: ["Holographic", "Neon Glow", "Glass UI", "Dark Mode"] }
    }
    if (t.includes("gaming") || t.includes("jeu") || t.includes("game") || t.includes("esport")) {
      return { gradient: "from-red-950 via-rose-950 to-purple-950", accent: "#f43f5e", label: "Direction Gaming · Immersif", particles: ["High Contrast", "Motion FX", "Bold Type", "HDR Colors"] }
    }
    if (t.includes("nature") || t.includes("green") || t.includes("vert") || t.includes("organique") || t.includes("eco")) {
      return { gradient: "from-emerald-950 via-teal-950 to-green-950", accent: "#34d399", label: "Direction Nature · Organique", particles: ["Soft Curves", "Earth Tones", "Breathable", "Calming"] }
    }
    if (t.includes("bubble") || t.includes("claire") || t.includes("pastel") || t.includes("doux") || t.includes("rose") || t.includes("light")) {
      return { gradient: "from-pink-900 via-purple-950 to-indigo-950", accent: "#f472b6", label: "Direction Creative · Artistique", particles: ["Pastel Palette", "Soft Shadows", "Rounded UI", "Playful"] }
    }
    if (t.includes("minimal") || t.includes("clean") || t.includes("apple") || t.includes("epuré") || t.includes("simple")) {
      return { gradient: "from-slate-900 via-slate-800 to-zinc-900", accent: "#94a3b8", label: "Direction Minimaliste · Premium", particles: ["Whitespace", "Sharp Type", "No Clutter", "Precision"] }
    }
    if (t.includes("dark") || t.includes("sombre") || t.includes("noir") || t.includes("nuit")) {
      return { gradient: "from-gray-950 via-slate-950 to-neutral-950", accent: "#6366f1", label: "Direction Dark · Élégant", particles: ["Deep Black", "Subtle Glow", "Night Mode", "Premium"] }
    }
    // Default: modern AI blue
    return { gradient: "from-blue-950 via-cyan-950 to-indigo-950", accent: "#06b6d4", label: "Direction IA · Moderne", particles: ["Smart UI", "Dynamic", "Connected", "Adaptive"] }
  }

  const handleGenerateImage = async () => {
    if (!designBrief.customAmbiance.trim()) return
    setIsGeneratingImage(true)
    setGeneratedImageUrl(null)
    setImageLoaded(false)
    setImageError(false)
    setConceptStyle(extractConceptStyle(designBrief.customAmbiance))

    try {
      const fd = new FormData()
      fd.append("description", designBrief.customAmbiance)

      // Pass project context to help the backend detect gaming/VR properly
      const projTitle = selectedIdea?.title || rawIdea || "Projet Inconnu"
      const projDesc = selectedIdea?.description || comprehensionData?.project_type || ""
      fd.append("project_title", projTitle)
      fd.append("project_description", projDesc)

      const res = await fetch(`${API_BASE_URL}/api/wizard/generate-visual`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.image_data) {
        setGeneratedImageUrl(data.image_data)
        setImageLoaded(true)
      } else {
        throw new Error("No image returned")
      }
    } catch (err) {
      console.warn("[generate-visual] falling back to concept card:", err)
      // Fallback: show animated CSS concept card
      setGeneratedImageUrl("concept-generated")
      setImageLoaded(true)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  // Étape 12 — Sauvegarder les préférences du manager après validation
  const savePreferences = async (project: GeneratedProject, scenario: string) => {
    if (!comprehensionData) return
    try {
      const finalProject = {
        ...project,
        modules: managerFeatures.filter(t => t.status === 'approved'),
        deliverables: managerDeliverables.length ? managerDeliverables : project.deliverables
      }

      const fd = new FormData()
      fd.append("validated_project", JSON.stringify(finalProject))
      fd.append("comprehension", JSON.stringify(comprehensionData))
      fd.append("scenario", scenario)
      await fetch(`${API_BASE_URL}/api/wizard/save-preferences`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      })
    } catch (err) {
      console.error("Étape 12 - save error:", err)
    }
  }

  // ── War Room agents (Iterative real-time) ──────────────────────────────────
  const launchWarRoom = async (preservedMessages: any[] = []) => {
    setStep("warroom-agents")
    setAgentMessages(preservedMessages)
    setTopIdeas([])
    setIsDiscussionFinished(false)
    setCurrentSimulationStatus("Initialisation de la War Room...")

    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/warroom`, {
        idea: rawIdea,
        project_name: projectName
      }, { headers: { Authorization: `Bearer ${token}` } })

      const sid = res.data.session_id
      setSessionId(sid)

      // Start polling
      if (pollingRef.current) clearInterval(pollingRef.current)

      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await axios.get(`${API_BASE_URL}/api/brainstorming/warroom/${sid}`, {
            headers: { Authorization: `Bearer ${token}` }
          })

          const session = pollRes.data

          // Map backend messages to frontend format
          const newMessages = session.messages.map((m: any) => {
            let icon = <Bot size={16} />
            let color = "text-slate-400"

            if (m.agent_name.includes("Idéateur")) {
              icon = <Zap size={16} />
              color = "text-amber-500"
            } else if (m.agent_name.includes("Critique")) {
              icon = <Flame size={16} />
              color = "text-rose-500"
            } else if (m.agent_name.includes("Synthétiseur")) {
              icon = <Star size={16} />
              color = "text-[#00CCCC]"
            } else if (m.agent_name.includes("Expert RH") || m.agent_name.includes("Médiateur")) {
              icon = <UserCheck size={16} />
              color = "text-emerald-500"
            }

            return {
              agent: m.agent_name,
              phase: m.phase,
              content: m.content,
              colorClass: color,
              icon: icon
            }
          })

          setAgentMessages([...preservedMessages, ...newMessages])

          if (session.status === "RUNNING") {
            const lastMsg = newMessages[newMessages.length - 1]
            setCurrentSimulationStatus(lastMsg ? `${lastMsg.agent} : ${lastMsg.phase}` : "En cours...")
          }

          if (session.status === "COMPLETED") {
            if (pollingRef.current) clearInterval(pollingRef.current)
            setTopIdeas(session.top_ideas || [])
            setIsDiscussionFinished(true)
            setCurrentSimulationStatus("Discussion terminée avec succès.")
          }

          if (session.status === "FAILED") {
            if (pollingRef.current) clearInterval(pollingRef.current)
            setCurrentSimulationStatus("Erreur lors de la discussion.")
          }
        } catch (err) {
          console.error("Polling error:", err)
        }
      }, 2000)

    } catch (err) {
      console.error("War Room launch error:", err)
      setCurrentSimulationStatus("Erreur au lancement.")
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  const generateDetailedTasks = async (proj: GeneratedProject, scenarioKey: string) => {
    setIsGeneratingTasks(true)
    setManagerFeatures([]) // Clear previous simple features
    try {
      const scenario = (proj.scenarios as any)?.[scenarioKey]
      const fd = new FormData()
      fd.append("project_title", proj.title)
      fd.append("project_description", proj.description)
      fd.append("project_stack", JSON.stringify(proj.stack || []))
      fd.append("scenario_name", scenarioKey)
      fd.append("weeks", (scenario?.duration_weeks || 12).toString())
      fd.append("project_type", comprehensionData?.project_type || "")
      if (startDate) fd.append("start_date", startDate)
      if (deadline) fd.append("deadline", deadline)

      const res = await axios.post(`${API_BASE_URL}/api/wizard/generate-detailed-tasks`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data && res.data.status === "error") {
        console.error("Task generation error:", res.data.message)
        return
      }

      if (res.data && res.data.tasks && Array.isArray(res.data.tasks)) {
        let aiTasks = res.data.tasks
        
        // Inject Veille Technologique task if articles were selected
        if (selectedArticles && selectedArticles.length > 0) {
          const articlesSection = selectedArticles.map(a => 
            `### 📰 ${a.title || 'Article'}\n- **Lien :** ${a.url || '#'}\n- **Résumé :** ${(a.snippet || 'Aucun résumé disponible.').slice(0, 300)}`
          ).join('\n\n')
          
          const teamIds = new Set(selectedTeamMembers)
          if (selectedTeamLeader) teamIds.add(selectedTeamLeader)
          
          const veilleTask = {
            id: "veille-" + Date.now(),
            title: "🌟 [VEILLE TECHNOLOGIQUE] Étude et application des recommandations techniques",
            description: `## 🌟 Tâche de Gouvernance Technique — Veille Technologique\n\nCette tâche est **collaborative** et concerne **toute l'équipe**. Chaque membre doit consulter les ressources ci-dessous et appliquer les recommandations dans ses propres tâches de développement.\n\n---\n\n## 📚 Ressources Sélectionnées (${selectedArticles.length} veille${selectedArticles.length > 1 ? 's' : ''})\n\n${articlesSection}\n\n---\n\n## ✅ Responsabilités\n\n**Team Lead** :\n- Coordonner la veille technologique\n- Expliquer les recommandations à l'équipe\n- Diffuser les bonnes pratiques\n\n**Chaque membre** :\n- Consulter toutes les ressources fournies\n- Appliquer les recommandations dans ses tâches\n- Signaler toute difficulté d'application au Team Lead\n`,
            priority: "HIGH",
            duration_hours: 3,
            is_deliverable: false,
            is_veille_task: true,
            category: "VEILLE",
            assignees: Array.from(teamIds),
            status: "approved"
          }
          aiTasks = [veilleTask, ...aiTasks]
        }
        
        setManagerFeatures(aiTasks)
        if (Array.isArray(res.data.members)) {
          setWizardMembers(res.data.members)
        }
      } else if (Array.isArray(res.data)) {
        setManagerFeatures(res.data)
      }
    } catch (err) {
      console.error("Task generation error:", err)
    } finally {
      setIsGeneratingTasks(false)
    }
  }

  const analyzeCurrentTasks = async (tasks: ProjectTask[], proj: GeneratedProject) => {
    try {
      const fd = new FormData()
      fd.append("tasks_json", JSON.stringify(tasks))
      fd.append("project_title", proj.title)
      fd.append("project_description", proj.description)

      const res = await axios.post(`${API_BASE_URL}/api/wizard/analyze-tasks`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (Array.isArray(res.data)) {
        setSmartSuggestions(res.data)
      }
    } catch (err) {
      console.error("Task analysis error:", err)
    }
  }

  const suggestAlternativeTask = async (rejectedTask: ProjectTask, proj: GeneratedProject) => {
    try {
      const fd = new FormData()
      fd.append("project_title", proj.title)
      fd.append("project_description", proj.description)
      fd.append("rejected_task_title", rejectedTask.title)
      fd.append("existing_tasks_json", JSON.stringify(managerFeatures.map(t => t.title)))

      const res = await axios.post(`${API_BASE_URL}/api/wizard/suggest-alternative`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.data && res.data.title) {
        // Replace the rejected task with the new one at the same position
        const next = managerFeatures.map(t => t.id === rejectedTask.id ? { ...res.data, id: Date.now().toString() } : t)
        setManagerFeatures(next)
      }
    } catch (err) {
      console.error("Alternative task suggestion error:", err)
    }
  }

  const fetchTechArticles = async (desc: string, project?: any) => {
    setIsFetchingTech(true)
    setArticles([])
    setSelectedArticles([])
    setTechSubPhase("pick")
    setAnalysisPlan(null)
    try {
      // Use project data if provided (Stage 6 cards) or global state if applicable
      const payload = {
        project_name: project?.title || projectName,
        description: desc,
        category: project?.project_type || comprehensionData?.project_type,
        target_users: project?.target_team || comprehensionData?.target_team,
        technologies: project?.stack || [],
        business_goals: project?.pedagogical_objective || comprehensionData?.pedagogical_objective,
        timestamp: Date.now()
      }

      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/veille-tech`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 45000 // 45 seconds timeout because LLM + RSS takes time
      })
      setArticles(res.data.articles || [])
      setGlobalScore(res.data.global_score || 88)
    } catch (err: any) {
      console.error("Veille Tech errored:", err.message, err.response?.data, err.code)
      setArticles([])
      setGlobalScore(0)
      showToast("Veille technologique indisponible. Vérifiez votre connexion et réessayez.", 'error')
    } finally {
      setIsFetchingTech(false)
    }
  }

  const analyzeTrend = async (articles: TechArticle[]) => {
    setIsAnalyzing(true)
    setTechSubPhase("analyzing")
    const desc = mode === "import" ? `Projet basé sur le cahier des charges : ${projectName}` : (selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/analyze-trend`, {
        project_name: projectName,
        project_description: desc,
        trend_title: articles.map(a => a.title).join(" | "),
        trend_category: articles.map(a => a.category).join(" | "),
        trend_snippet: articles.map(a => a.snippet).join(" \n\n ")
      }, { headers: { Authorization: `Bearer ${token}` } })
      setAnalysisPlan(res.data)
      const enrichedDesc = res.data.enriched_description || desc;
      if (mode === "idea") {
        handleProceedToIdeation(enrichedDesc)
      } else if (mode === "import" && selectedProject) {
        setStep('concept-validation')
      } else {
        handleAnalyze(enrichedDesc)
      }
    } catch (err) {
      console.error("Analyze trend error:", err)
      showToast("Erreur lors de l'analyse de la tendance. Veuillez réessayer.", 'error')
      setTechSubPhase("pick")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // ── Main AI wizard — accepts description directly to avoid stale state ─────
  const handleAnalyze = async (finalDescription: string) => {
    setStep("loading")
    setLoadingPhase("PARSING")
    setLoadingMessage("Analyse du contexte...")

    const formData = new FormData()
    formData.append("mode", mode === "idea" ? "describe" : "import")
    formData.append("project_name", projectName?.trim() || "Nouveau Projet")

    if (mode === "import") {
      files.forEach(f => formData.append("files", f))
      formData.append("description", finalDescription)
    } else {
      formData.append("description", finalDescription)
      if (startDate) formData.append("start_date", startDate)
      if (deadline) formData.append("deadline", deadline)
      if (teamSize) formData.append("team_size", teamSize)
    }

    // Always send lead_id and team_members regardless of mode
    if (selectedTeamLeader) formData.append("lead_id", selectedTeamLeader)
    const allMembers = new Set(selectedTeamMembers)
    if (selectedTeamLeader) allMembers.add(selectedTeamLeader)
    allMembers.forEach(id => formData.append("team_members", id))

    // Send the manager-approved tasks so the backend doesn't regenerate them
    const approvedTasks = managerFeatures.filter(t => t.status === "approved")
    if (approvedTasks.length > 0) {
      formData.append("validated_tasks", JSON.stringify(approvedTasks))
    }

    // Send selected veille articles only if the manager chose at least one
    // If empty, no veille task will be created (as per the governance rules)
    if (selectedArticles && selectedArticles.length > 0) {
      formData.append("veille_articles", JSON.stringify(selectedArticles))
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/wizard/wizard`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.phase === "DONE") {
              setCreatedProjectId(data.project_id)
              setStep("done")
            } else if (data.phase === "ERROR") {
              showToast("Erreur IA : " + data.message, 'error')
              setStep(mode === "idea" ? "warroom-input" : "import-details")
            } else {
              setLoadingPhase(data.phase)
              setLoadingMessage(data.message)
            }
          } catch { /* skip malformed lines */ }
        }
      }
    } catch (err: any) {
      console.error("Wizard error:", err)
      showToast(err.message || "Impossible de contacter le serveur. Vérifiez que le backend est démarré.", 'error')
      setStep(mode === "idea" ? "warroom-input" : "import-details")
    }
  }

  const handleRescueProtocol = async () => {
    setIsRescuing(true);
    setRescueTerminalLines([]);

    const lines = [
      "> Analyse des contraintes du projet et du scope initial...",
      "> Identification des tâches parallélisables pour la compression du planning...",
      "> Réévaluation des coûts et simulation d'allocation de ressources Senior...",
      "> Analyse des risques critiques liés à l'accélération du délai...",
      "> Génération du rapport de faisabilité optimisé (Fast-Track)...",
      "> OPTIMISATION TERMINÉE. Faisabilité ajustée."
    ];

    for (let i = 0; i < lines.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setRescueTerminalLines(prev => [...prev, lines[i]]);
    }

    await new Promise(r => setTimeout(r, 1000));
    setIsRescuing(false);
    setIsRescueModeActive(true);
    setBudgetPressure(100);
    setTimePressure(100);
  };

  const fade = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }

  // --- SIMULATED FEASIBILITY DATA (For Auto-Pivot & Pressure Simulator) ---
  let simulatedScore = 0;
  let simulatedBudgetMin = 0;
  let simulatedBudgetMax = 0;
  let simulatedDuration = 0;
  let simulatedRecommendation = 'danger';
  let displayedSummary = "";
  let simulatedLevel = "";

  // Dynamic derivations based on slider values
  let dynamicTeamSizeMin = 3;
  let dynamicTeamSizeMax = 5;
  let dynamicTeamLevel = "Mixed";
  let dynamicRisks: string[] = [];
  let dynamicKeyRoles: string[] = [];

  if (feasibilityData) {
    simulatedScore = dynamicSimulation ? dynamicSimulation.score : Math.max(10, Math.min(100, Math.round(feasibilityData.feasibility_score * (budgetPressure / 100) * (timePressure / 100))));
    simulatedBudgetMin = Math.round((feasibilityData.cost_dt?.min || 0) * (budgetPressure / 100));
    simulatedBudgetMax = Math.round((feasibilityData.cost_dt?.max || 0) * (budgetPressure / 100));
    // Use manager's deadline if set, otherwise use AI estimate
    const baseWeeks = (() => {
      if (deadline) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000
        return Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek))
      }
      return feasibilityData.duration?.realistic_weeks || 12
    })()
    simulatedDuration = Math.max(1, Math.round(baseWeeks * (timePressure / 100)));
    simulatedRecommendation = simulatedScore > 75 ? 'success' : simulatedScore > 40 ? 'warning' : 'danger';
    const defaultSummary = "Le projet est analysé avec les paramètres actuels. Ajustez les curseurs pour simuler différents scénarios.";
    const apiSummary = feasibilityData.summary || "";
    const isInvalidSummary = !apiSummary || apiSummary.includes("Analyse dynamique indisponible") || apiSummary.trim().length < 10;
    const generatedSummary = isInvalidSummary
      ? (() => {
          const score = Math.max(10, Math.min(100, Math.round(feasibilityData.feasibility_score * (budgetPressure / 100) * (timePressure / 100))));
          const weeks = Math.max(1, Math.round(baseWeeks * (timePressure / 100)));
          const risk = feasibilityData.risk?.global || "modéré";
          if (score >= 75) return `Projet viable avec un score de faisabilité de ${score}/100. Durée estimée : ${weeks} semaines. Risque global ${risk}. Les paramètres actuels sont favorables à une livraison réussie.`;
          if (score >= 50) return `Faisabilité modérée (${score}/100). Durée estimée : ${weeks} semaines. Risque ${risk}. Certains ajustements de ressources ou de délai sont recommandés pour sécuriser la livraison.`;
          return `Faisabilité critique (${score}/100). Durée estimée : ${weeks} semaines. Risque ${risk}. Les contraintes actuelles rendent la livraison difficile — envisagez d'augmenter le budget ou d'allonger le délai.`;
        })()
      : apiSummary;
    const cleanSummary = generatedSummary;
    displayedSummary = isSimulatingLive ? "Analyse dynamique en cours..." : (dynamicSimulation ? dynamicSimulation.summary : (cleanSummary || defaultSummary));

    // Dynamic level tag based on simulatedScore
    simulatedLevel = dynamicSimulation ? dynamicSimulation.level : (simulatedScore >= 80 ? 'EXCELLENT'
      : simulatedScore >= 65 ? 'VIABLE'
        : simulatedScore >= 50 ? 'MOD�R�'
          : simulatedScore >= 35 ? 'RISQU�'
            : 'CRITIQUE');

    // Populate default dynamic variables from AI fetch
    dynamicTeamSizeMin = feasibilityData.team_required?.min_size || 3;
    dynamicTeamSizeMax = feasibilityData.team_required?.recommended_size || 5;
    dynamicTeamLevel = feasibilityData.team_required?.level || "Mixed";
    dynamicRisks = dynamicSimulation ? dynamicSimulation.risks : [...(feasibilityData.risk?.main_risks || [])];
    // In optimal zone with good score, clear risks
    if (!dynamicSimulation && timePressure >= 80 && timePressure <= 120 && budgetPressure >= 80 && simulatedScore >= 75) {
      dynamicRisks = [];
    }
    dynamicKeyRoles = [...(feasibilityData.team_required?.key_roles || [])];

    // APPLY LOGIC based on Time Pressure slider
    if (timePressure <= 70) {
      dynamicTeamSizeMin += 2;
      dynamicTeamSizeMax += 3;
      dynamicTeamLevel = "Seniors Uniquement";
      if (!dynamicRisks.some(r => r.includes('livraison accélérée'))) dynamicRisks.unshift("Risque extrême de dette technique due à la livraison accélérée.");
      if (!dynamicRisks.some(r => r.includes('Burnout'))) dynamicRisks.unshift("Épuisement critique de l'équipe (Burnout) en raison du délai compressé.");
      if (!dynamicKeyRoles.includes("EXPERT ARCHITECTE")) dynamicKeyRoles.unshift("EXPERT ARCHITECTE");
      if (!dynamicKeyRoles.includes("TECH LEAD SENIOR")) dynamicKeyRoles.unshift("TECH LEAD SENIOR");
    } else if (timePressure <= 90) {
      dynamicTeamSizeMin += 1;
      dynamicTeamSizeMax += 2;
      dynamicTeamLevel = "Équipe Expérimentée";
      if (!dynamicRisks.some(r => r.includes('Dette technique modérée'))) dynamicRisks.unshift("Dette technique modérée et compromis sur la qualité du code inévitables.");
      if (!dynamicRisks.some(r => r.includes('Surcharge cognitive'))) dynamicRisks.unshift("Surcharge cognitive de l'équipe pour tenir la timeline.");
    } else if (timePressure >= 130) {
      dynamicTeamSizeMin = Math.max(1, dynamicTeamSizeMin - 1);
      dynamicTeamSizeMax = Math.max(2, dynamicTeamSizeMax - 2);
      dynamicTeamLevel = "Mixte Junior/Intermédiaire";
      if (!dynamicRisks.some(r => r.includes('sur-ingénierie'))) dynamicRisks.unshift("Risque de sur-ingénierie et de dérive des fonctionnalités (Scope Creep).");
      if (!dynamicRisks.some(r => r.includes('momentum'))) dynamicRisks.unshift("Perte de momentum et démotivation de l'équipe face à un cycle trop long.");
    } else if (timePressure >= 110) {
      dynamicTeamSizeMin = Math.max(1, dynamicTeamSizeMin - 1);
      dynamicTeamSizeMax = Math.max(2, dynamicTeamSizeMax - 1);
      if (!dynamicRisks.some(r => r.includes('Parkinson'))) dynamicRisks.unshift("L'équipe risque de manquer d'urgence, impactant la vélocité (Loi de Parkinson).");
    }

    // Filter out 'inconnu', generic risks, and keep to max 3 items for display
    dynamicRisks = dynamicRisks.filter(r => r && !r.toLowerCase().includes('inconnu') && !r.toLowerCase().includes('standards de gestion')).slice(0, 3);

    if (isRescueModeActive) {
      simulatedScore = Math.min(100, simulatedScore + 35); // Rescue boosts but doesn't override slider
      simulatedRecommendation = simulatedScore > 70 ? 'success' : 'warning';
      simulatedBudgetMin = Math.round(simulatedBudgetMin * 0.4);
      simulatedBudgetMax = Math.round(simulatedBudgetMax * 0.4);
      simulatedDuration = Math.max(1, Math.round(simulatedDuration * 0.5));
      displayedSummary = `MODE FAST-TRACK ACTIVÉ : Planning optimisé et compressé à ${simulatedDuration} semaines. Parallélisation des tâches critiques et réallocation des ressources pour forcer la livraison.`;
      simulatedLevel = simulatedScore >= 70 ? 'SAUVÉ ✅' : 'EN COURS 🔧';
    }
  }

  return (
    <>
      <QuantumParticles />
      <div className={`w-full max-w-2xl mx-auto backdrop-blur-2xl border rounded-[2.5rem] overflow-hidden flex flex-col transition-all duration-700 ease-out ${detailArticle ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'} ${theme === 'dark'
        ? 'bg-[#0f172a]/60 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.2),_0_0_80px_rgba(6,182,212,0.1)]'
        : 'bg-white/75 border-cyan-100 shadow-[0_0_40px_rgba(0,188,212,0.15)]'
        }`} style={{ maxHeight: "92vh" }}>

        {/* ── IN-APP TOAST NOTIFICATION ── */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className={`absolute top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border backdrop-blur-xl max-w-[90%] min-w-[260px] ${toast.type === 'error'
                ? 'bg-red-500/15 border-red-400/50 text-red-700 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                : toast.type === 'warning'
                  ? 'bg-amber-500/15 border-amber-400/50 text-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-[#00BCD4]/15 border-[#00BCD4]/50 text-[#006064] shadow-[0_0_20px_rgba(0,188,212,0.25)]'
                }`}
            >
              <span className={`text-lg shrink-0 ${toast.type === 'error' ? 'text-red-500' : toast.type === 'warning' ? 'text-amber-500' : 'text-[#00BCD4]'
                }`}>
                {toast.type === 'error' ? '⚠️' : toast.type === 'warning' ? '🔔' : 'ℹ️'}
              </span>
              <p className="text-xs font-semibold leading-snug flex-1">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all ml-1"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background Layer */}
        <div className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${theme === 'dark' ? 'bg-gradient-to-br from-[#020617]/50 to-[#0f172a]/50' : 'bg-gradient-to-br from-[#00BCD4]/10 to-transparent'}`} />

        {/* Immersive FX Background (Step 5) */}
        <div className={`fixed inset-0 pointer-events-none z-[-1] transition-all duration-1000 ${step === "design-brief" && (hoveredUniverse || designBrief.universe) === "gaming" ? "bg-black opacity-100" :
          step === "design-brief" && (hoveredUniverse || designBrief.universe) === "scifi" ? "bg-slate-950 opacity-100" :
            step === "design-brief" && (hoveredUniverse || designBrief.universe) === "nature" ? "bg-emerald-950 opacity-100" :
              "opacity-0"
          }`}>
          {step === "design-brief" && (hoveredUniverse || designBrief.universe) === "scifi" && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-[#030712] to-[#030712] animate-pulse" />
          )}
          {step === "design-brief" && (hoveredUniverse || designBrief.universe) === "gaming" && (
            <div className="absolute inset-0 border-[10px] border-fuchsia-600/10 shadow-[inset_0_0_150px_rgba(217,70,239,0.15)]" />
          )}
        </div>

        {/* Gamified Grid for Dark Mode */}
        {theme === 'dark' && (
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        )}



        {/* Two-panel layout: breadcrumb sidebar + content */}
        <div className="flex flex-1 overflow-hidden relative z-10">

          {/* ── LEFT SIDEBAR: removed ── */}

          {/* ── RIGHT: Main Content ── */}
          <div className="flex-1 overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="p-6 pt-4">

              {/* Top Contextual Stepper — single scrollable line, no scrollbar, neon active state */}
              {step !== "mode" && step !== "done" && (
                <>
                  <style dangerouslySetInnerHTML={{
                    __html: `
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                  `}} />
                  <div className="no-scrollbar mb-6 flex flex-nowrap items-center gap-2 px-4 max-w-full mx-auto overflow-x-auto scroll-smooth">
                    {(() => {
                      const currentPhaseObj = PHASES.find(p => p.id === currentPhase)
                      if (!currentPhaseObj) return null
                      const allSteps = currentPhaseObj.steps
                      const currentIdx = allSteps.findIndex(x => x.step === step)

                      return (
                        <>
                          {allSteps.map((s, idx) => {
                            const thisIdx = allSteps.indexOf(s)
                            const isActive = step === s.step
                            const isDone = currentIdx > thisIdx

                            return (
                              <div key={s.step} id={isActive ? "active-stepper-item" : undefined} className="flex items-center shrink-0">
                                <div className={`flex flex-col items-center transition-all duration-500 px-3 py-1.5 rounded-lg ${isActive ? 'bg-cyan-500/10 dark:bg-cyan-400/10 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)]' : ''}`}>
                                  <div className="flex items-center gap-1.5">
                                    {isDone && !isActive && <Check size={10} className="text-[#00BCD4]" />}
                                    <span className={`text-[10px] font-black tracking-widest uppercase transition-all duration-500 whitespace-nowrap ${isActive ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : isDone ? 'text-[#00BCD4]/70' : 'text-slate-400/60 dark:text-slate-500/60'}`}>
                                      {s.label}
                                    </span>
                                  </div>
                                </div>
                                {idx < allSteps.length - 1 && (
                                  <div className={`w-6 h-px mx-1 shrink-0 transition-colors duration-500 ${isDone ? 'bg-[#00BCD4]/50' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                )}
                              </div>
                            )
                          })}
                        </>
                      )
                    })()}
                  </div>
                </>
              )}


              <AnimatePresence mode="wait">


                {/* ─── MODE SELECTION (original design) ─── */}
                {step === "mode" && (
                  <motion.div key="mode" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-blue-50 transition-colors duration-500">{lang === 'fr' ? 'Comment voulez-vous commencer ?' : 'How would you like to start?'}</h2>
                      <p className="text-slate-500 dark:text-blue-400/60 font-medium transition-colors duration-500">{lang === 'fr' ? "Choisissez un mode pour initialiser votre espace de projet propulsé par l'IA." : "Choose a mode to initialize your AI-powered project workspace."}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Import */}
                      <button
                        onClick={() => { setMode("import"); setTimeout(() => setStep("import-details"), 400); }}
                        className={`p-6 rounded-2xl border-2 text-left transition-all duration-500 group relative overflow-hidden backdrop-blur-md ${mode === "import"
                          ? (theme === 'dark' ? "border-blue-400 bg-blue-900/20 ring-4 ring-blue-500/20 shadow-[0_0_30px_rgba(37,99,235,0.3)]" : "border-[#00BCD4] bg-[#00BCD4]/10 ring-4 ring-[#00BCD4]/20 shadow-[0_0_20px_rgba(0,188,212,0.15)]")
                          : (theme === 'dark' ? "border-blue-900/40 bg-blue-950/20 hover:border-blue-500/40" : "border-slate-200/60 hover:border-[#00BCD4]/40 bg-white/40 hover:bg-white/60")
                          }`}
                      >
                        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${mode === "import"
                          ? (theme === 'dark' ? "bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]" : "bg-[#00BCD4] text-white shadow-[0_0_15px_rgba(0,188,212,0.4)]")
                          : (theme === 'dark' ? "bg-blue-900/30 text-blue-700" : "bg-white/80 text-slate-400 group-hover:bg-white border border-slate-100")
                          }`}>
                          <Upload className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 dark:text-blue-100 mb-1 transition-colors">{lang === 'fr' ? 'Importer un cahier des charges' : 'Import Specifications'}</h3>
                        <p className="text-sm text-slate-500 dark:text-blue-400/60 leading-snug transition-colors">{lang === 'fr' ? "Importez des PDF ou Documents et laissez l'IA extraire les tâches & la feuille de route." : "Import PDFs or Documents and let the AI extract tasks & the roadmap."}</p>
                      </button>

                      {/* War Room */}
                      <button onClick={() => { setMode("idea"); setTimeout(() => setStep("warroom-input"), 400); }} className={`p-6 rounded-2xl border-2 text-left transition-all duration-300 group relative overflow-hidden backdrop-blur-md ${mode === "idea" ? "border-[#FF0000] bg-red-500/10 ring-4 ring-[#FF0000]/20 shadow-[0_0_20px_rgba(255,0,0,0.15)]" : "border-slate-200/60 hover:border-[#FF0000]/40 bg-white/40 hover:bg-white/60"}`}>
                        {mode === "idea" && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-[#FF0000] text-white border-none text-[9px] font-black px-2">WAR ROOM</Badge>
                          </div>
                        )}
                        <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${mode === "idea" ? "bg-[#FF0000] text-white shadow-[0_0_15px_rgba(255,0,0,0.4)]" : "bg-white/80 text-slate-400 group-hover:bg-white border border-slate-100"}`}>
                          <Flame className="w-6 h-6" />
                        </div>
                        <h3 className="font-black text-lg text-slate-800 mb-1">{lang === 'fr' ? 'Brainstorming IA' : 'AI Brainstorming'}</h3>
                        <p className="text-sm text-slate-500 leading-snug">{lang === 'fr' ? "3 agents IA affinent votre idée brute → Top 3 orientations → plan complet avec tâches." : "3 AI agents refine your raw idea → Top 3 directions → complete plan with tasks."}</p>
                      </button>
                    </div>

                    <div className="pt-2">
                      <Button
                        disabled={!mode}
                        onClick={() => mode === "idea" ? setStep("warroom-input") : setStep("import-details")}
                        className={`w-full py-6 rounded-2xl font-black text-lg transition-all duration-500 relative z-10 ${!mode
                          ? (theme === 'dark' ? "bg-blue-950/40 text-blue-900 border border-blue-900/40" : "bg-slate-100/50 text-slate-400 border border-slate-200")
                          : (theme === 'dark'
                            ? "bg-blue-600/10 border border-blue-400/50 hover:bg-blue-600 text-blue-400 hover:text-white shadow-[0_0_25px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
                            : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)]")
                          }`}
                      >
                        {lang === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── INDUSTRY SELECTION ─── */}
                {step === "industry" && (
                  <motion.div key="industry" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-6">
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-blue-50 transition-colors duration-500">{(t.brainstorming as any).industry}</h2>
                      <p className="text-slate-500 dark:text-blue-400/60 font-medium transition-colors duration-500">
                        {lang === 'fr' ? "Ciblez votre expertise pour des recommandations IA ultra-spécifiques." : "Target your expertise for ultra-specific AI recommendations."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {INDUSTRIES.map((ind) => (
                        <button
                          key={ind.id}
                          onClick={() => setIndustry(ind.id)}
                          className={`p-4 rounded-2xl border-2 text-left transition-all duration-300 relative group overflow-hidden ${industry === ind.id
                            ? "border-[#00BCD4] bg-[#00BCD4]/10 shadow-[0_0_15px_rgba(0,188,212,0.1)]"
                            : "border-slate-100 dark:border-slate-100 bg-white/40 hover:border-slate-200"}`}
                        >
                          <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-all ${industry === ind.id ? "bg-[#00BCD4] text-white shadow-lg" : "bg-slate-50 dark:bg-slate-800 text-slate-400"}`}>
                            {ind.icon}
                          </div>
                          <h3 className={`font-black text-sm mb-0.5 ${industry === ind.id ? "text-[#00BCD4]" : "text-slate-700 dark:text-slate-300"}`}>{ind.label}</h3>
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-tight font-medium">{ind.desc}</p>
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setStep(mode === "idea" ? "warroom-input" : "import-details")} className="flex-1 rounded-xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[10px]">
                        Retour
                      </Button>
                      <Button
                        onClick={() => mode === "idea" ? startCopilot() : launchComprehension()}
                        className="flex-[2] bg-[#00BCD4] hover:bg-[#00ACC1] text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl"
                      >
                        {mode === "idea" ? (lang === "fr" ? "Lancer l'analyse" : "Start Analysis") : (lang === "fr" ? "Extraire" : "Extract")} <ChevronRight className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === "warroom-input" && (
                  <motion.div
                    key="warroom-input"
                    variants={fade}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="max-w-xl mx-auto space-y-4 pt-2 pb-2 relative group"
                    onMouseMove={handleFormMouseMove}
                  >
                    {/* Subtle Interactive Spotlight */}
                    <motion.div
                      className="pointer-events-none absolute -inset-10 z-[-1] rounded-[2rem] opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                      style={{ background: formHoverBackground }}
                    />
                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-turquoise-400 to-cyan-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">War Room — Décrivez votre idée</h2>
                      <p className="text-sm text-cyan-700 dark:text-cyan-300 font-black tracking-widest uppercase">Les agents IA vont l'analyser et synthétiser le Top 3 des orientations</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[13px] font-bold text-cyan-600 dark:text-cyan-400 ml-1 uppercase tracking-widest">{lang === 'fr' ? 'Nom du projet' : 'Project Name'}</Label>
                        <div className="relative rounded-2xl overflow-hidden transition-all duration-300 bg-white dark:bg-slate-950 border-2 border-slate-200/60 dark:border-slate-800 hover:border-cyan-400/40 focus-within:border-[#00BCD4] focus-within:ring-4 focus-within:ring-[#00BCD4]/20 focus-within:shadow-[0_0_20px_rgba(0,188,212,0.15)]">
                          <Input
                            value={projectName}
                            onChange={e => setProjectName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && projectName.trim() && rawIdea.trim().length >= 15) launchGeneration();
                            }}
                            placeholder="ex. Simulation VR de formation, Jeu 3D Éducatif"
                            className="h-14 text-base text-slate-900 dark:text-white !border-none !shadow-none !outline-none !ring-0 focus:!ring-0 focus:!border-none focus-visible:!ring-0 focus-visible:!border-none focus-visible:!outline-none !bg-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 px-5"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[13px] font-bold text-cyan-600 dark:text-cyan-400 ml-1 uppercase tracking-widest">{lang === 'fr' ? 'Votre idée brute' : 'Your Raw Idea'}</Label>
                        <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${isEnhancingIdea ? 'p-[2px] shadow-[0_0_30px_rgba(0,188,212,0.3)]' : 'bg-white dark:bg-slate-950 border-2 border-slate-200/60 dark:border-slate-800 hover:border-cyan-400/40 focus-within:border-[#00BCD4] focus-within:ring-4 focus-within:ring-[#00BCD4]/20 focus-within:shadow-[0_0_20px_rgba(0,188,212,0.15)]'}`}>
                          {isEnhancingIdea && (
                            <>
                              <div className="absolute top-1/2 left-1/2 w-[200%] h-[200%] -translate-x-1/2 -translate-y-1/2 animate-[spin_2.5s_linear_infinite] z-0" style={{ backgroundImage: 'conic-gradient(from 0deg, transparent 0%, #ef4444 25%, transparent 50%, #00BCD4 75%, transparent 100%)' }} />
                              <div className="absolute inset-[2px] rounded-[14px] bg-white dark:bg-slate-950 z-0" />
                            </>
                          )}
                          <Textarea
                            value={rawIdea}
                            onChange={e => setRawIdea(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (projectName.trim() && rawIdea.trim().length >= 15) launchGeneration();
                              }
                            }}
                            placeholder="Décrivez votre idée... ex: 'Une simulation VR pour la formation médicale avec Unreal Engine...'"
                            className="relative z-10 min-h-[160px] text-base text-slate-900 dark:text-white !border-none !shadow-none !outline-none !ring-0 focus:!ring-0 focus:!border-none focus-visible:!ring-0 focus-visible:!border-none focus-visible:!outline-none !bg-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none p-5 pr-14"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isEnhancingIdea || rawIdea.trim().length < 5}
                            onClick={handleEnhanceIdea}
                            className={`absolute bottom-3 right-3 rounded-full transition-all duration-300 z-30
                              ${isEnhancingIdea
                                ? 'bg-[#00BCD4] text-white shadow-[0_0_25px_rgba(0,188,212,0.8)] scale-110 opacity-100'
                                : 'bg-[#00BCD4]/10 text-[#00BCD4] hover:bg-[#00BCD4]/30 hover:text-[#00ACC1] hover:shadow-[0_0_15px_rgba(0,188,212,0.6)] opacity-80 hover:opacity-100'
                              }`}
                            title="Amélioration Magique (IA)"
                          >
                            {isEnhancingIdea ? <Bot size={18} className="animate-pulse" /> : <Sparkles size={18} />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                      <Button variant="ghost" onClick={() => setStep("mode")} className="rounded-2xl text-slate-400 hover:text-slate-600 px-6 font-bold uppercase tracking-widest text-[10px]">
                        {lang === 'fr' ? 'Retour' : 'Back'}
                      </Button>
                      <div className="flex-1">
                        <Button
                          disabled={!projectName.trim() || rawIdea.trim().length < 15}
                          onClick={() => startCopilot()}
                          className={`w-full py-6 rounded-2xl font-black text-lg transition-all duration-500 relative z-10 ${(!projectName.trim() || rawIdea.trim().length < 15)
                            ? (theme === 'dark' ? "bg-blue-950/40 text-blue-900 border border-blue-900/40" : "bg-slate-100/50 text-slate-400 border border-slate-200")
                            : (theme === 'dark'
                              ? "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_25px_rgba(0,188,212,0.3)] hover:shadow-[0_0_40px_rgba(0,188,212,0.6)]"
                              : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)]")
                            }`}
                        >
                          <BrainCircuit size={20} className="mr-2" /> {lang === 'fr' ? 'Continuer' : 'Continue'} <ChevronRight className="ml-2 w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── ÉTAPE 2 : COMPRÉHENSION (ÉDITABLE) ─── */}
                {step === "comprehension" && (
                  <motion.div key="comprehension" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                        <BrainCircuit size={16} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">ÉTAPE 2 — Compréhension & Analyse</h2>
                        <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">L'IA a analysé votre demande · Corrigez si nécessaire</p>
                      </div>
                    </div>
                    {isGenerating12 ? (
                      <div className="flex flex-col items-center py-10 space-y-5">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full border-4 border-[#00BCD4]/20 border-t-[#00BCD4] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center"><Bot size={28} className="text-[#00BCD4]" /></div>
                        </div>
                        <p className="font-black text-slate-700 dark:text-blue-200 animate-pulse text-center">{generating12Msg || "Analyse sémantique de votre demande..."}</p>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {["Analyse sémantique", "Détection du type", "Évaluation complexité", "Structuration"].map((l, i) => (
                            <motion.span key={i} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }} className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">{l}</motion.span>
                          ))}
                        </div>
                      </div>
                    ) : (editComp || comprehensionData) && (() => {
                      const ed = editComp || { project_type: comprehensionData?.project_type || "", pedagogical_objective: comprehensionData?.pedagogical_objective || "", estimated_duration: comprehensionData?.estimated_duration || "", complexity_level: comprehensionData?.complexity_level || "MEDIUM", target_team: comprehensionData?.target_team || "" }
                      return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/5 p-1.5 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                            {comprehensionData?.is_custom_mode && (
                              <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30 rounded-xl p-3 mb-2 mx-1 mt-1 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <Sparkles size={14} className="text-violet-500" />
                                  <span className="text-xs font-black text-violet-700 dark:text-violet-300 uppercase tracking-widest">🎯 CUSTOM MODE ACTIVÉ</span>
                                </div>
                                <p className="text-[10px] text-violet-600/80 dark:text-violet-400/80 font-bold">Structure générée uniquement depuis la logique de ce projet. Type détecté: {comprehensionData?.custom_category || "Projet Personnalisé"}</p>
                              </div>
                            )}
                            <p className="text-[9px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest px-2.5 pt-2 pb-1 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">✅ Analyse IA — Corrigez les champs si besoin</p>
                            <div className="space-y-3 p-2">
                              {[
                                { key: "project_type", label: "Type de projet", placeholder: "Ex: Simulation VR, Jeu 3D temps réel, Visite virtuelle..." },
                                { key: "pedagogical_objective", label: "Objectif principal", placeholder: "Ex: Maîtriser Unity/Unreal, Développer une app VR interactive..." },
                                { key: "estimated_duration", label: "Durée estimée", placeholder: "Ex: 3 mois, 6 mois..." },
                              ].map(f => (
                                <div key={f.key}>
                                  <Label className="text-[10px] font-black text-cyan-700/60 dark:text-cyan-400/60 uppercase tracking-widest mb-1 block">{f.label}</Label>
                                  <motion.div
                                    className="relative rounded-xl p-[1px] overflow-hidden group w-full"
                                    animate={{ background: ["linear-gradient(90deg, #22d3ee10, #22d3ee60, #22d3ee10)", "linear-gradient(90deg, #22d3ee60, #22d3ee10, #22d3ee60)"] }}
                                    transition={{ duration: 3 + Math.random(), repeat: Infinity }}
                                  >
                                    <Input
                                      value={(ed as any)[f.key]}
                                      onChange={e => setEditComp({ ...ed, [f.key]: e.target.value })}
                                      placeholder={f.placeholder}
                                      className="w-full h-11 text-sm rounded-[calc(0.75rem-1px)] border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 dark:text-blue-50 font-bold relative z-10 transition-all"
                                    />
                                    <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                                  </motion.div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button variant="ghost" onClick={() => setStep(mode === "idea" ? "warroom-params" : "import-details")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">← Retour</Button>
                            <motion.div className="flex-1" animate={{ scale: [1, 1.01, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                              <Button onClick={() => { setComprehensionData({ ...ed }); handleComprehensionContinue(); }} className="w-full bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-6 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-500 relative overflow-hidden group flex items-center justify-center">
                                <span className="relative z-10 flex items-center">Confirmer & Continuer <ArrowRight size={16} className="ml-2" /></span>
                              </Button>
                            </motion.div>
                          </div>
                        </motion.div>
                      )
                    })()}
                  </motion.div>
                )}


                {/* ─── ÉTAPE 3 : CLARIFICATION ─── */}
                {step === "clarification" && (
                  <motion.div key="clarification" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                        <Sparkles size={16} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">ÉTAPE 3 — Clarification</h2>
                        <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Informations complémentaires nécessaires</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {clarificationQs.map((q, i) => (
                        <div key={i}>
                          <Label className="text-[10px] font-black uppercase text-cyan-700/60 dark:text-cyan-400/60 mb-1.5 block tracking-widest">Question {i + 1} : {q}</Label>
                          <motion.div
                            className="relative rounded-xl p-[1px] overflow-hidden group"
                            animate={{ background: ["linear-gradient(90deg, #22d3ee10, #22d3ee40, #22d3ee10)", "linear-gradient(90deg, #22d3ee40, #22d3ee10, #22d3ee40)"] }}
                            transition={{ duration: 4, repeat: Infinity }}
                          >
                            <Textarea
                              value={clarificationAs[i] || ""}
                              onChange={e => { const a = [...clarificationAs]; a[i] = e.target.value; setClarificationAs(a) }}
                              placeholder="Votre réponse..."
                              className="min-h-[80px] w-full rounded-[calc(0.75rem-1px)] border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 dark:text-blue-50 font-bold text-sm relative z-10 transition-all resize-none"
                            />
                            <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                          </motion.div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setStep("comprehension")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">Retour</Button>
                      <motion.div className="flex-1" animate={!clarificationAs.some(a => !a.trim()) ? { scale: [1, 1.01, 1], boxShadow: ["0 0 15px rgba(34,211,238,0.2)", "0 0 30px rgba(34,211,238,0.4)", "0 0 15px rgba(34,211,238,0.2)"] } : {}} transition={{ duration: 3, repeat: Infinity }}>
                        <Button
                          disabled={clarificationAs.some(a => !a.trim())}
                          onClick={() => launchGeneration(clarificationAs.join(" | "))}
                          className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm border border-cyan-300/30"
                        >
                          <BrainCircuit size={15} className="mr-2" /> Relancer avec ces informations
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* ─── ÉTAPE 4 : CONTRAINTES & CONTEXTE ─── */}
                {step === "contraintes" && (
                  <motion.div key="contraintes" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                        <Target size={16} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">ÉTAPE 3 — Contraintes & Contexte</h2>
                        <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Définissez vos contraintes · Les champs sont optionnels</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {/* ── CHAT CONTAINER — light theme, propagating shapes ── */}
                      <div className="relative rounded-2xl overflow-hidden h-72 border border-[#00BCD4]/20 shadow-[0_0_30px_rgba(0,188,212,0.08)]">

                        {/* ── Animated background: light theme with propagating rings ── */}
                        <div className="absolute inset-0 z-0 overflow-hidden">
                          {/* Base gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white via-cyan-50/60 to-sky-50/80" />
                          {/* Propagating rings — 4 sets at different positions */}
                          {[
                            { cx: '15%', cy: '20%', delay: 0 },
                            { cx: '80%', cy: '70%', delay: 1.5 },
                            { cx: '50%', cy: '90%', delay: 3 },
                            { cx: '90%', cy: '15%', delay: 2 },
                          ].map((pos, i) => (
                            <div key={i} className="absolute" style={{ left: pos.cx, top: pos.cy, transform: 'translate(-50%,-50%)' }}>
                              {[0, 1, 2].map(ring => (
                                <motion.div
                                  key={ring}
                                  className="absolute rounded-full border border-[#00BCD4]/20"
                                  style={{ width: 20, height: 20, top: -10, left: -10 }}
                                  animate={{ width: [20, 120], height: [20, 120], top: [-10, -60], left: [-10, -60], opacity: [0.5, 0] }}
                                  transition={{ duration: 3.5, repeat: Infinity, delay: pos.delay + ring * 1.1, ease: 'easeOut' }}
                                />
                              ))}
                              {/* Center dot */}
                              <motion.div
                                className="absolute w-1.5 h-1.5 rounded-full bg-[#00BCD4]/40"
                                style={{ top: -3, left: -3 }}
                                animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.4, 1] }}
                                transition={{ duration: 2, repeat: Infinity, delay: pos.delay }}
                              />
                            </div>
                          ))}
                          {/* Floating soft blobs */}
                          {[
                            { w: 160, top: '10%', left: '5%', delay: 0, dur: 9 },
                            { w: 120, top: '55%', left: '65%', delay: 2, dur: 11 },
                            { w: 90, top: '75%', left: '20%', delay: 1, dur: 8 },
                          ].map((b, i) => (
                            <motion.div
                              key={i}
                              className="absolute rounded-full blur-3xl"
                              style={{ width: b.w, height: b.w, top: b.top, left: b.left, background: 'radial-gradient(circle, rgba(0,188,212,0.12), transparent)' }}
                              animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
                              transition={{ duration: b.dur, repeat: Infinity, delay: b.delay }}
                            />
                          ))}
                          {/* Subtle dot grid */}
                          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                        </div>

                        {/* ── Messages ── */}
                        <div className="relative z-10 h-full overflow-y-auto flex flex-col gap-4 p-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {contraintesChat.map((msg, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              transition={{ duration: 0.28, delay: idx * 0.04 }}
                              className={`flex gap-2.5 items-end ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              {/* ── AI avatar LEFT: Bot icon with neon ring ── */}
                              {msg.role === "ai" && (
                                <div className="relative shrink-0 self-end mb-0.5">
                                  <motion.div
                                    className="absolute -inset-[2px] rounded-full z-0"
                                    style={{ background: 'conic-gradient(from 0deg, #00BCD4, #67e8f9, #00BCD4, transparent, #00BCD4)' }}
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                                  />
                                  <div className="absolute -inset-[3px] rounded-full blur-sm bg-[#00BCD4]/30 z-0" />
                                  <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center">
                                    <Bot size={15} className="text-[#00BCD4]" />
                                  </div>
                                  <motion.div
                                    className="absolute -bottom-0.5 -right-0.5 z-20 w-2.5 h-2.5 rounded-full bg-[#00BCD4] border-2 border-white"
                                    animate={{ boxShadow: ['0 0 0px #00BCD4', '0 0 8px #00BCD4', '0 0 0px #00BCD4'] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                </div>
                              )}

                              {/* ── Bubble ── */}
                              <div className={`flex flex-col gap-0.5 max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                {msg.role === "ai" && (
                                  <span className="text-[9px] font-black text-[#00BCD4] uppercase tracking-widest ml-1" style={{ textShadow: '0 0 8px rgba(0,188,212,0.6)' }}>
                                    AI Assistant
                                  </span>
                                )}
                                <div
                                  className={`relative px-3.5 py-2.5 text-xs font-medium leading-relaxed rounded-2xl overflow-hidden ${msg.role === "user"
                                      ? "rounded-br-sm text-white"
                                      : "rounded-bl-sm text-slate-700"
                                    }`}
                                  style={msg.role === "user" ? {
                                    background: 'linear-gradient(135deg, #00BCD4, #0891b2)',
                                    boxShadow: '0 2px 16px rgba(0,188,212,0.35), inset 0 1px 0 rgba(255,255,255,0.2)'
                                  } : {
                                    background: 'rgba(255,255,255,0.85)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(0,188,212,0.25)',
                                    boxShadow: '0 2px 12px rgba(0,188,212,0.1), inset 0 1px 0 rgba(255,255,255,0.9)'
                                  }}
                                >
                                  {msg.role === "ai" && (
                                    <motion.div
                                      className="absolute inset-0 pointer-events-none"
                                      style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,188,212,0.06) 50%, transparent 100%)' }}
                                      animate={{ x: ['-100%', '200%'] }}
                                      transition={{ duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 2 }}
                                    />
                                  )}
                                  {msg.content}
                                </div>
                              </div>

                              {/* ── User avatar RIGHT: manager.webp with neon ring ── */}
                              {msg.role === "user" && (
                                <div className="relative shrink-0 self-end mb-0.5">
                                  <motion.div
                                    className="absolute -inset-[2px] rounded-full z-0"
                                    style={{ background: 'conic-gradient(from 0deg, transparent, #00BCD4, transparent, #67e8f9, transparent)' }}
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                                  />
                                  <div className="absolute -inset-[3px] rounded-full blur-sm bg-[#00BCD4]/20 z-0" />
                                  <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                    <img src="/manager.webp" alt="Manager" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          ))}
                          <div ref={chatBottomRef} />
                        </div>
                      </div>

                      {contraintesStepIndex < CONTRAINTES_QUESTIONS.length ? (
                        <form onSubmit={e => {
                          e.preventDefault()
                          if (contraintesStepIndex >= CONTRAINTES_QUESTIONS.length) return
                          const currentQ = CONTRAINTES_QUESTIONS[contraintesStepIndex]
                          const val = contraintesInput.trim()
                          setConstraints(prev => ({ ...prev, [currentQ.key]: val }))
                          const newHistory = [...contraintesChat, { role: "user" as const, content: val || "Passer" }]
                          if (contraintesStepIndex + 1 < CONTRAINTES_QUESTIONS.length) {
                            newHistory.push({ role: "ai" as const, content: CONTRAINTES_QUESTIONS[contraintesStepIndex + 1].q })
                          } else {
                            newHistory.push({ role: "ai" as const, content: "✅ Parfait ! J'ai bien enregistré toutes vos réponses, incluant votre vision artistique et les mécanismes de jeu. Vous pouvez maintenant passer à l'analyse technologique." })
                          }
                          setContraintesChat(newHistory)
                          setContraintesStepIndex(contraintesStepIndex + 1)
                          setContraintesInput("")
                        }} className="flex gap-2 relative">
                          <motion.div
                            className="flex-1 relative rounded-xl p-[1px] overflow-hidden group"
                            animate={{ background: ["linear-gradient(90deg, #22d3ee20, #22d3ee80, #22d3ee20)", "linear-gradient(90deg, #22d3ee80, #22d3ee20, #22d3ee80)"] }}
                            transition={{ duration: 3, repeat: Infinity }}
                          >
                            <Input
                              value={contraintesInput}
                              onChange={e => setContraintesInput(e.target.value)}
                              placeholder="Votre réponse (laissez vide pour passer)..."
                              className="w-full h-11 text-sm rounded-[calc(0.75rem-1px)] border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 dark:text-blue-50 pr-12 font-bold relative z-10 transition-all"
                              autoFocus
                            />
                            <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                          </motion.div>
                          <Button type="submit" className="absolute right-1.5 top-1.5 bottom-1.5 h-8 w-8 p-0 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.4)] z-20">
                            <Send size={14} />
                          </Button>
                        </form>
                      ) : null}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <Button variant="ghost" onClick={() => setStep("warroom-params")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">← Retour</Button>
                      <motion.div className="flex-1" animate={contraintesStepIndex >= CONTRAINTES_QUESTIONS.length ? { scale: [1, 1.02, 1], boxShadow: ["0 0 20px rgba(34,211,238,0.4)", "0 0 40px rgba(34,211,238,0.8)", "0 0 20px rgba(34,211,238,0.4)"] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                        <Button
                          disabled={contraintesStepIndex < CONTRAINTES_QUESTIONS.length}
                          onClick={() => {
                            setStep("warroom-tech")
                            if (!articles.length) fetchTechArticles(rawIdea)
                            const designCtx = constraints.visionArtistique ? `Vision artistique: ${constraints.visionArtistique}. Mécanismes: ${constraints.mechanismesJeu}` : ''
                            if (designCtx) launchIdeationBackground(designCtx)
                          }}
                          className={`w-full py-6 rounded-2xl font-black transition-all duration-300 uppercase tracking-widest text-sm ${contraintesStepIndex < CONTRAINTES_QUESTIONS.length ? "bg-slate-100 text-slate-400 dark:bg-blue-900/20 dark:text-blue-500/50" : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)]"}`}
                        >
                          <Zap size={15} className="mr-2" /> Valider &amp; Analyser les Technologies
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* ─── ÉTAPE 5 : DESIGN BRIEF (supprimé — intégré dans contraintes) ─── */}
                {step === "design-brief" && (
                  <motion.div key="design-brief" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-6">

                    {/* Header Minimaliste */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)] flex items-center gap-2">
                          <Sparkles className="text-cyan-500" size={20} />
                          Vision Artistique
                        </h2>
                        <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Décrivez l'ambiance et l'univers de votre projet · L'IA générera un concept visuel inspirant</p>
                      </div>
                    </div>

                    {!generatedImageUrl && !isGeneratingImage && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Zone de Saisie Premium (Vercel/Linear style) */}
                        <motion.div
                          className="relative rounded-2xl p-[1px] overflow-hidden group"
                          animate={{ background: ["linear-gradient(90deg, #22d3ee20, #22d3ee80, #22d3ee20)", "linear-gradient(90deg, #22d3ee80, #22d3ee20, #22d3ee80)"] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <div className="relative bg-white dark:bg-slate-950 rounded-[calc(1rem-1px)] p-4 shadow-sm transition-all z-10">
                            <Label className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-widest mb-2 block">
                              {(t.brainstorming as any).lore} / Direction Artistique
                            </Label>
                            <Textarea
                              value={designBrief.customAmbiance}
                              onChange={e => setDesignBrief(p => ({ ...p, customAmbiance: e.target.value }))}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey && designBrief.customAmbiance.trim()) {
                                  e.preventDefault()
                                  handleGenerateImage()
                                }
                              }}
                              placeholder="Ex: Dans un univers cyberpunk sombre, la mécanique principale repose sur le piratage temporel. DA : néons froids, interfaces minimalistes, HUD holographique..."
                              className="min-h-[140px] bg-transparent border-none p-0 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none focus-visible:ring-0 shadow-none"
                            />
                          </div>
                          <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                        </motion.div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                          <Button variant="ghost" onClick={() => setStep("contraintes")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">
                            ← Retour
                          </Button>
                          <motion.div className="flex-1" animate={designBrief.customAmbiance.trim() ? { scale: [1, 1.02, 1], boxShadow: ["0 0 20px rgba(34,211,238,0.4)", "0 0 40px rgba(34,211,238,0.8)", "0 0 20px rgba(34,211,238,0.4)"] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                            <Button
                              disabled={!designBrief.customAmbiance.trim()}
                              onClick={handleGenerateImage}
                              className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm border border-cyan-300/30"
                            >
                              <Sparkles size={16} className="mr-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" /> Générer l'univers visuel
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                    {/* État de chargement (Génération de l'image) */}
                    {isGeneratingImage && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 space-y-6">
                        <div className="relative">
                          <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="text-cyan-500 animate-pulse" size={24} />
                          </div>
                        </div>
                        <p className="text-sm font-black text-slate-700 dark:text-slate-300 animate-pulse tracking-widest uppercase">Génération du concept visuel...</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 text-center max-w-xs">L'IA crée une image inspirante basée sur votre description. Cela peut prendre quelques secondes.</p>
                      </motion.div>
                    )}

                    {/* Résultat - Image IA réelle ou Concept Visuel Immersif */}
                    {generatedImageUrl && imageLoaded && conceptStyle && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="space-y-5"
                      >
                        {/* ── Real AI Image (from backend proxy) with 3D Tilt Effect ── */}
                        {generatedImageUrl !== "concept-generated" ? (
                          <motion.div
                            className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl perspective-1000"
                            onMouseMove={handleMouseMove}
                            onMouseLeave={handleMouseLeave}
                            animate={{
                              rotateX: mousePosition.y * -15, // Tilt based on mouse Y
                              rotateY: mousePosition.x * 15,  // Tilt based on mouse X
                              scale: 1.02
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            style={{ transformStyle: "preserve-3d" }}
                          >
                            <motion.img
                              src={generatedImageUrl}
                              alt="Concept visuel IA"
                              className="w-full h-full object-cover"
                              initial={{ opacity: 0, scale: 1.1 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              style={{ transform: "translateZ(0px)" }}
                            />
                            {/* 3D Floating Particles over the image */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ transform: "translateZ(50px)" }}>
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute rounded-full"
                                  style={{
                                    width: `${20 + i * 15}px`,
                                    height: `${20 + i * 15}px`,
                                    background: conceptStyle.accent,
                                    left: `${(i * 25 + 10) % 90}%`,
                                    top: `${(i * 30 + 20) % 80}%`,
                                    filter: "blur(15px)",
                                  }}
                                  animate={{
                                    y: [0, -20, 0],
                                    x: [0, 10, 0],
                                    opacity: [0.2, 0.6, 0.2]
                                  }}
                                  transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                                />
                              ))}
                            </div>
                            {/* Overlay gradient bottom */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" style={{ transform: "translateZ(20px)" }} />
                            {/* Bottom text - pops out in 3D */}
                            <div className="absolute bottom-0 left-0 right-0 p-6" style={{ transform: "translateZ(40px)" }}>
                              <p className="text-white text-sm font-bold italic line-clamp-2 drop-shadow-xl" style={{ textShadow: `0 2px 10px ${conceptStyle.accent}` }}>
                                &ldquo;{designBrief.customAmbiance}&rdquo;
                              </p>
                            </div>
                            {/* Badge top-left - pops out in 3D */}
                            <div className="absolute top-5 left-5" style={{ transform: "translateZ(60px)" }}>
                              <div className="backdrop-blur-md bg-black/60 border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 shadow-xl">
                                <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">{conceptStyle.label}</span>
                              </div>
                            </div>
                            {/* Animated 3D accent glow border */}
                            <motion.div
                              className="absolute inset-0 rounded-2xl pointer-events-none border-2"
                              style={{ borderColor: `${conceptStyle.accent}40`, boxShadow: `inset 0 0 100px ${conceptStyle.accent}30` }}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                          </motion.div>
                        ) : (
                          /* ── Fallback: animated CSS concept card ── */
                          <div className={`relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br ${conceptStyle.gradient} border border-white/5 shadow-2xl`}>
                            {/* Ambient particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              {[...Array(8)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  className="absolute rounded-full"
                                  style={{
                                    width: `${60 + i * 30}px`,
                                    height: `${60 + i * 30}px`,
                                    background: conceptStyle.accent,
                                    left: `${(i * 17 + 5) % 90}%`,
                                    top: `${(i * 23 + 10) % 80}%`,
                                    filter: "blur(40px)",
                                  }}
                                  animate={{ scale: [1, 1.3, 1], opacity: [0.06, 0.18, 0.06] }}
                                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                              ))}
                            </div>
                            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(${conceptStyle.accent} 1px, transparent 1px), linear-gradient(90deg, ${conceptStyle.accent} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                              <motion.div
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                                className="flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-md"
                                style={{ borderColor: `${conceptStyle.accent}40`, background: `${conceptStyle.accent}15` }}
                              >
                                <Sparkles size={12} style={{ color: conceptStyle.accent }} />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: conceptStyle.accent }}>{conceptStyle.label}</span>
                              </motion.div>
                              <motion.p
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                                className="text-white font-bold text-base leading-relaxed max-w-xs"
                                style={{ textShadow: `0 0 40px ${conceptStyle.accent}60` }}
                              >
                                &ldquo;{designBrief.customAmbiance}&rdquo;
                              </motion.p>
                              <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                                className="flex gap-2 flex-wrap justify-center"
                              >
                                {conceptStyle.particles.map((p, i) => (
                                  <span key={i} className="px-3 py-1 rounded-full text-[10px] font-black border backdrop-blur-md"
                                    style={{ borderColor: `${conceptStyle.accent}30`, color: conceptStyle.accent, background: `${conceptStyle.accent}10` }}>
                                    {p}
                                  </span>
                                ))}
                              </motion.div>
                            </div>
                            <div className="absolute top-4 left-4">
                              <div className="backdrop-blur-md bg-black/40 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                <Bot size={12} className="text-cyan-400" />
                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Direction IA</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => { setGeneratedImageUrl(null); setImageLoaded(false); setConceptStyle(null) }}
                            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold shadow-sm transition-all"
                          >
                            Affiner le texte
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleGenerateImage}
                            className="flex-1 h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold shadow-sm transition-all"
                          >
                            <RefreshCw size={14} className="mr-2" /> Régénérer
                          </Button>
                          <Button
                            onClick={() => {
                              setStep("warroom-tech")
                              if (!articles.length) fetchTechArticles(rawIdea)
                              const designCtx = `Univers visuel choisi: ${designBrief.customAmbiance}`
                              launchIdeationBackground(designCtx)
                            }}
                            className="flex-1 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] h-12 rounded-xl font-black transition-all"
                          >
                            Continuer <ArrowRight size={16} className="ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}


                {/* ─── ÉTAPES 6→10 : DÉTAILS DU PROJET (tabs) ─── */}
                {step === "projet-details" && selectedProject && (() => {
                  const p = selectedProject
                  const cfg = COMPLEXITY_CFG[p.complexity] || COMPLEXITY_CFG.MEDIUM
                  const tabs: { id: DetailsTab; label: string; icon: React.ReactNode }[] = [
                    { id: "equipe", label: "👥 Équipe", icon: <User size={12} /> },
                    { id: "planification", label: "📅 Planning", icon: <Calendar size={12} /> },
                  ]
                  return (
                    <motion.div key="projet-details" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <span className="text-2xl shrink-0">{cfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[9px] font-black uppercase tracking-widest ${cfg.color}`}>ÉTAPES 6→10 · {cfg.label}</p>
                          <h2 className="text-base font-black text-slate-900 dark:text-blue-50 leading-tight">{p.title}</h2>
                        </div>
                        <button onClick={() => setStep("feasibility")} className="text-slate-300 hover:text-slate-500 shrink-0"><ChevronLeft size={18} /></button>
                      </div>
                      {/* Tabs */}
                      <div className="flex gap-1 overflow-x-auto pb-1">
                        {tabs.map(t => (
                          <button key={t.id} onClick={() => {
                            setDetailsTab(t.id);
                            if (t.id === "planification" && !dynamicPlanning && !isGeneratingPlanning) {
                              generateDynamicPlanning();
                            }
                          }} className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${detailsTab === t.id ? "bg-[#00BCD4] text-white shadow-[0_0_12px_rgba(0,188,212,0.3)]" : "bg-slate-100 dark:bg-blue-900/40 text-slate-500 dark:text-blue-400 hover:bg-slate-200"}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {/* Tab content */}
                      <AnimatePresence mode="wait">

                        {detailsTab === "equipe" && (() => {
                          const leader = wizardMembers.find(m => m.id === selectedTeamLeader)
                          const members = wizardMembers.filter(m => selectedTeamMembers.includes(m.id))
                          const availableForMembers = wizardMembers.filter(m => m.id !== selectedTeamLeader)

                          return (
                            <motion.div key="equipe" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">

                              {/* ── AI MATCHMAKING ── */}
                              <div className="flex justify-end mb-2">
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleAiMatchmaking}
                                  disabled={isAiMatchmaking || wizardMembers.length === 0}
                                  className={`relative overflow-hidden flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide shadow-lg transition-all border ${isAiMatchmaking
                                    ? 'bg-slate-800/30 backdrop-blur-md border-slate-700/50 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-500/20 to-cyan-500/20 backdrop-blur-xl border-white/50 text-slate-800 hover:from-red-500/30 hover:to-cyan-500/30 hover:border-white/80 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)] hover:text-cyan-950'
                                    }`}
                                >
                                  {isAiMatchmaking ? (
                                    <>
                                      <RefreshCw size={14} className="animate-spin" />
                                      Analyse des profils en cours...
                                    </>
                                  ) : (
                                    <>
                                      <BrainCircuit size={14} className="animate-pulse" />
                                      Générer l'équipe optimale par IA
                                    </>
                                  )}

                                  {/* Shimmer effect */}
                                  {!isAiMatchmaking && (
                                    <motion.div
                                      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                      animate={{ translateX: ['-100%', '200%'] }}
                                      transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1 }}
                                    />
                                  )}
                                </motion.button>
                              </div>

                              {/* ── CHEF D'ÉQUIPE ── */}
                              <div className="rounded-2xl border border-cyan-200/20 bg-white/10 backdrop-blur-2xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Trophy size={14} className="text-red-500" /> Chef d'Équipe (Team Leader)
                                </p>

                                {wizardMembers.length === 0 ? (
                                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <RefreshCw size={14} className="text-slate-400 animate-spin" />
                                    <p className="text-xs text-slate-400 font-medium">Chargement des membres...</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                    {wizardMembers.map(member => {
                                      const isSelected = selectedTeamLeader === member.id
                                      return (
                                        <motion.button
                                          key={member.id}
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onMouseMove={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                                            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                                          }}
                                          onClick={() => {
                                            setSelectedTeamLeader(isSelected ? null : member.id)
                                            if (!isSelected) {
                                              setSelectedTeamMembers(prev => prev.filter(id => id !== member.id))
                                              const wl = getMemberWorkload(member.id)
                                              if (wl >= 80) setOverloadAlert({ memberName: member.full_name, workload: wl })
                                              else setOverloadAlert(null)
                                            }
                                          }}
                                          className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-300 ${isSelected
                                            ? 'border-red-400 bg-red-50 shadow-[0_0_20px_rgba(239,68,68,0.6),inset_0_0_10px_rgba(239,68,68,0.15)]'
                                            : 'border-slate-100 bg-white hover:border-red-200 hover:bg-red-50/30'
                                            }`}
                                        >
                                          {/* Magnetic Hover Effect */}
                                          <div
                                            className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl"
                                            style={{
                                              background: `radial-gradient(300px circle at var(--mouse-x, 0) var(--mouse-y, 0), ${isSelected ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)'}, transparent 40%)`
                                            }}
                                          />
                                          <div className="relative z-10 flex w-full items-center gap-3">
                                            <div className="relative shrink-0">
                                              {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                              ) : (
                                                <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-600 font-black text-sm shadow-sm">
                                                  {member.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                              )}
                                              {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-sm">
                                                  <Trophy size={8} className="text-white" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-0.5">
                                                <p className={`text-[12px] font-black truncate ${isSelected ? 'text-red-700' : 'text-slate-800'}`}>{member.full_name}</p>
                                                {matchScores[member.id] && (
                                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] px-1.5 py-0 border-0 h-4 flex items-center gap-1 font-black shadow-sm">
                                                    <Sparkles size={8} className="text-emerald-500" /> {matchScores[member.id]}% Match
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-medium truncate">{member.position || 'Membre'}</p>
                                              <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                                                  {(() => {
                                                    const wl = getMemberWorkload(member.id);
                                                    return (
                                                      <motion.div
                                                        className={`h-full rounded-full ${wl >= 80 ? 'shadow-[0_0_8px_rgba(244,63,94,0.5)]' : ''}`}
                                                        style={{
                                                          width: `${wl}%`,
                                                          background: wl >= 80
                                                            ? 'linear-gradient(90deg, #f43f5e 0%, #e11d48 50%, #f43f5e 100%)'
                                                            : wl >= 60
                                                              ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)'
                                                              : 'linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%)',
                                                          backgroundSize: '200% 100%'
                                                        }}
                                                        animate={{ backgroundPosition: ['0% 0%', '-200% 0%'] }}
                                                        transition={{ duration: wl >= 80 ? 1.5 : 2.5, repeat: Infinity, ease: "linear" }}
                                                      />
                                                    )
                                                  })()}
                                                </div>
                                                <span className={`text-[8px] font-black ${getMemberWorkload(member.id) >= 80 ? 'text-rose-500' : 'text-slate-400'}`}>{getMemberWorkload(member.id)}%</span>
                                              </div>
                                            </div>
                                            {isSelected && (
                                              <span className="shrink-0 text-[9px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase tracking-widest">Leader</span>
                                            )}
                                          </div>
                                        </motion.button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* ── MEMBRES DE L'ÉQUIPE ── */}
                              <div className="rounded-2xl border border-cyan-200/20 bg-white/10 backdrop-blur-2xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                                    <User size={14} className="text-cyan-500" /> Membres de l'Équipe
                                  </p>
                                  {selectedTeamMembers.length > 0 && (
                                    <span className="text-[9px] font-black text-cyan-600 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
                                      {selectedTeamMembers.length} sélectionné{selectedTeamMembers.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>

                                {availableForMembers.length === 0 ? (
                                  <p className="text-xs text-slate-400 font-medium text-center py-4">Aucun autre membre disponible</p>
                                ) : (
                                  <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1">
                                    {availableForMembers.map(member => {
                                      const isSelected = selectedTeamMembers.includes(member.id)
                                      return (
                                        <motion.button
                                          key={member.id}
                                          whileHover={{ scale: 1.01 }}
                                          whileTap={{ scale: 0.99 }}
                                          onMouseMove={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                                            e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                                          }}
                                          onClick={() => {
                                            setSelectedTeamMembers(prev => isSelected ? prev.filter(id => id !== member.id) : [...prev, member.id])
                                            if (!isSelected) {
                                              const wl = getMemberWorkload(member.id)
                                              if (wl >= 80) setOverloadAlert({ memberName: member.full_name, workload: wl })
                                              else setOverloadAlert(null)
                                            }
                                          }}
                                          className={`group relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-300 ${isSelected
                                            ? 'border-[#00BCD4] bg-cyan-50 shadow-[0_0_20px_rgba(0,188,212,0.6),inset_0_0_10px_rgba(0,188,212,0.15)]'
                                            : 'border-slate-100 bg-white hover:border-cyan-200 hover:bg-cyan-50/30'
                                            }`}
                                        >
                                          {/* Magnetic Hover Effect */}
                                          <div
                                            className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl"
                                            style={{
                                              background: `radial-gradient(300px circle at var(--mouse-x, 0) var(--mouse-y, 0), ${isSelected ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.08)'}, transparent 40%)`
                                            }}
                                          />
                                          <div className="relative z-10 flex w-full items-center gap-3">
                                            <div className="relative shrink-0">
                                              {member.avatar_url ? (
                                                <img src={member.avatar_url} alt={member.full_name} className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-sm" />
                                              ) : (
                                                <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 font-black text-sm shadow-sm">
                                                  {member.full_name?.charAt(0).toUpperCase()}
                                                </div>
                                              )}
                                              {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center shadow-sm">
                                                  <Check size={8} className="text-white" />
                                                </div>
                                              )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-0.5">
                                                <p className={`text-[12px] font-black truncate ${isSelected ? 'text-cyan-700' : 'text-slate-800'}`}>{member.full_name}</p>
                                                {matchScores[member.id] && (
                                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] px-1.5 py-0 border-0 h-4 flex items-center gap-1 font-black shadow-sm">
                                                    <Sparkles size={8} className="text-emerald-500" /> {matchScores[member.id]}% Match
                                                  </Badge>
                                                )}
                                              </div>
                                              <p className="text-[10px] text-slate-400 font-medium truncate">{member.position || 'Membre'}</p>
                                              <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                                                  {(() => {
                                                    const wl = getMemberWorkload(member.id);
                                                    return (
                                                      <motion.div
                                                        className={`h-full rounded-full ${wl >= 80 ? 'shadow-[0_0_8px_rgba(244,63,94,0.5)]' : ''}`}
                                                        style={{
                                                          width: `${wl}%`,
                                                          background: wl >= 80
                                                            ? 'linear-gradient(90deg, #f43f5e 0%, #e11d48 50%, #f43f5e 100%)'
                                                            : wl >= 60
                                                              ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)'
                                                              : 'linear-gradient(90deg, #10b981 0%, #059669 50%, #10b981 100%)',
                                                          backgroundSize: '200% 100%'
                                                        }}
                                                        animate={{ backgroundPosition: ['0% 0%', '-200% 0%'] }}
                                                        transition={{ duration: wl >= 80 ? 1.5 : 2.5, repeat: Infinity, ease: "linear" }}
                                                      />
                                                    )
                                                  })()}
                                                </div>
                                                <span className={`text-[8px] font-black ${getMemberWorkload(member.id) >= 80 ? 'text-rose-500' : 'text-slate-400'}`}>{getMemberWorkload(member.id)}%</span>
                                              </div>
                                            </div>
                                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-200'}`}>
                                              {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                                            </div>
                                          </div>
                                        </motion.button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* ── RÉSUMÉ ÉQUIPE ── */}
                              {(selectedTeamLeader || selectedTeamMembers.length > 0) && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                  className="rounded-2xl border border-emerald-200/60 bg-emerald-50/60 p-4 flex items-center gap-3">
                                  <div className="flex -space-x-2 shrink-0">
                                    {[selectedTeamLeader, ...selectedTeamMembers].filter(Boolean).slice(0, 4).map((id, i) => {
                                      const m = wizardMembers.find(x => x.id === id)
                                      return m?.avatar_url ? (
                                        <img key={i} src={m.avatar_url} className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                                      ) : (
                                        <div key={i} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${id === selectedTeamLeader ? 'bg-red-500/15 text-red-600' : 'bg-cyan-500/15 text-cyan-600'}`}>
                                          {m?.full_name?.charAt(0).toUpperCase()}
                                        </div>
                                      )
                                    })}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-black text-emerald-700">
                                      Équipe configurée · {1 + selectedTeamMembers.length} membre{selectedTeamMembers.length > 0 ? 's' : ''}
                                    </p>
                                    <p className="text-[10px] text-emerald-600/70 font-medium">
                                      {leader ? `Leader : ${leader.full_name}` : 'Aucun leader sélectionné'}
                                    </p>
                                  </div>
                                </motion.div>
                              )}

                              {/* AI Copilot Overload Alert */}
                              <AnimatePresence>
                                {overloadAlert && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="fixed bottom-6 right-6 max-w-[280px] bg-slate-900 border border-rose-500/50 rounded-2xl p-4 shadow-2xl z-[999] flex gap-3"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30">
                                      <Bot size={16} className="text-rose-400" />
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider">Alerte IA</p>
                                        <button onClick={() => setOverloadAlert(null)} className="text-slate-500 hover:text-white">
                                          <X size={12} />
                                        </button>
                                      </div>
                                      <p className="text-xs text-slate-300 leading-relaxed">
                                        Attention, <span className="text-white font-bold">{overloadAlert.memberName}</span> est déjà surchargé(e) à {overloadAlert.workload}%. Risque de burnout ou de retard estimé à {(overloadAlert.workload - 40)}%.
                                      </p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </motion.div>
                          )
                        })()}

                        {detailsTab === "planification" && (() => {
                          const p = selectedProject as any
                          const scenario = p.scenarios?.[selectedScenario]
                          // Compute totalWeeks from real dates if available
                          let totalWeeks: number;
                          if (simulatedDuration > 0) {
                            totalWeeks = simulatedDuration;
                          } else if (startDate && deadline) {
                            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                            totalWeeks = Math.max(1, Math.round((new Date(deadline).getTime() - new Date(startDate).getTime()) / msPerWeek));
                          } else if (deadline) {
                            const msPerWeek = 7 * 24 * 60 * 60 * 1000;
                            totalWeeks = Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek));
                          } else {
                            totalWeeks = scenario?.duration_weeks || 12;
                          }

                          // Show loading state while AI planning is being generated
                          if (isGeneratingPlanning) {
                            return (
                              <motion.div key="planning-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 gap-4">
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} className="w-10 h-10 rounded-full border-3 border-cyan-200 border-t-cyan-500" />
                                <p className="text-sm font-bold text-slate-500">Génération du planning IA en cours...</p>
                                <p className="text-[10px] text-slate-400">Analyse du projet et répartition des phases sur {totalWeeks} semaines</p>
                              </motion.div>
                            )
                          }

                          // ── Use REAL AI planning data when available ──
                          const hasDynamicPlanning = dynamicPlanning && dynamicPlanning.phases && dynamicPlanning.weeks && dynamicPlanning.weeks.length > 0

                          // Build phases & logs from dynamicPlanning (real AI data) or fallback
                          let scaledPhases: Array<{ phase: string; percentage_start: number; duration_weeks: number; scaledWeeks: number }> = []
                          let logs: Array<{ week: number; text: string; phase: string; isAlert: boolean }> = []

                          if (hasDynamicPlanning) {
                            // ── REAL AI-GENERATED PLANNING ──
                            const aiPhases = dynamicPlanning.phases as Array<{ name: string; color: string; duration_weeks: number }>
                            const aiWeeks = dynamicPlanning.weeks as Array<{ week: number; text: string; phase_index: number }>

                            let pctCursor = 0
                            scaledPhases = aiPhases.map((ph: any) => {
                              const pct = pctCursor
                              pctCursor += (ph.duration_weeks / totalWeeks) * 100
                              return { phase: ph.name, percentage_start: Math.round(pct), duration_weeks: ph.duration_weeks, scaledWeeks: ph.duration_weeks }
                            })

                            // Build logs from real AI week descriptions, enforcing unique sequential IDs
                            aiWeeks.forEach((wk, i) => {
                              const phaseIdx = wk.phase_index ?? 0
                              const phaseName = aiPhases[phaseIdx]?.name || "Phase"
                              logs.push({ week: i + 1, text: wk.text, phase: phaseName, isAlert: false })
                            })

                            // Fill remaining weeks if AI returned fewer than totalWeeks
                            while (logs.length < totalWeeks) {
                              const lastPhase = aiPhases[aiPhases.length - 1]?.name || "Finalisation"
                              logs.push({ week: logs.length + 1, text: `Finalisation et préparation au déploiement — ${p.title || "le projet"}.`, phase: lastPhase, isAlert: false })
                            }
                          } else {
                            // ── FALLBACK: Generated phases from project data ──
                            const rawTimeline: Array<{ phase: string; percentage_start: number; duration_weeks: number }> =
                              scenario?.timeline && scenario.timeline.length > 0
                                ? scenario.timeline
                                : (() => {
                                    const stack = p.stack || []
                                    const hasAI = stack.some((s: string) => /ai|ml|openai|langchain|tensorflow/i.test(s))
                                    const has3D = stack.some((s: string) => /unity|three|blender|unreal|vr|ar/i.test(s))
                                    const hasMobile = stack.some((s: string) => /react.native|flutter|swift|kotlin/i.test(s))
                                    const phases = [
                                      { phase: "Setup & Architecture", pct: 0, dur: Math.max(1, Math.round(totalWeeks * 0.1)) },
                                      { phase: "Core Development", pct: 10, dur: Math.max(2, Math.round(totalWeeks * 0.35)) },
                                      ...(hasAI ? [{ phase: "Intégration IA", pct: 45, dur: Math.max(1, Math.round(totalWeeks * 0.15)) }] : []),
                                      ...(has3D ? [{ phase: "Rendu 3D & Assets", pct: 45, dur: Math.max(1, Math.round(totalWeeks * 0.15)) }] : []),
                                      ...(hasMobile ? [{ phase: "UI Mobile", pct: 45, dur: Math.max(1, Math.round(totalWeeks * 0.15)) }] : []),
                                      ...(!hasAI && !has3D && !hasMobile ? [{ phase: "Features & UI", pct: 45, dur: Math.max(1, Math.round(totalWeeks * 0.15)) }] : []),
                                      { phase: "Tests & QA", pct: 70, dur: Math.max(1, Math.round(totalWeeks * 0.15)) },
                                      { phase: "Déploiement & Launch", pct: 85, dur: Math.max(1, Math.round(totalWeeks * 0.15)) },
                                    ]
                                    return phases.map(ph => ({ phase: ph.phase, percentage_start: ph.pct, duration_weeks: ph.dur }))
                                  })()

                            scaledPhases = rawTimeline.map(ph => ({ ...ph, scaledWeeks: 0 }));
                            for (let w = 1; w <= totalWeeks; w++) {
                              const pct = ((w - 0.5) / totalWeeks) * 100;
                              let phaseIdx = 0;
                              for (let i = rawTimeline.length - 1; i >= 0; i--) {
                                if (pct >= rawTimeline[i].percentage_start) { phaseIdx = i; break; }
                              }
                              scaledPhases[phaseIdx].scaledWeeks++;
                            }
                            if (totalWeeks >= rawTimeline.length) {
                              scaledPhases.forEach(ph => {
                                if (ph.scaledWeeks === 0) {
                                  ph.scaledWeeks = 1;
                                  const longest = scaledPhases.reduce((max, p2) => p2.scaledWeeks > max.scaledWeeks ? p2 : max, scaledPhases[0]);
                                  longest.scaledWeeks--;
                                }
                              });
                            }

                            // Build per-week logs from project data
                            let weekCursor = 1
                            const stackStr = (p.stack || []).slice(0, 3).join(", ") || "stack définie"
                            const projectTitle = p.title || "le projet"
                            const complexity = p.complexity || "MEDIUM"
                            const projectModules: string[] = p.modules || []
                            const projectDeliverables: string[] = p.deliverables || []
                            const projectStack: string[] = p.stack || []
                            const teamRoles = Object.keys(p.team_distribution || {})
                            const projectVersions = p.versions || {}

                            scaledPhases.forEach((ph, phIdx) => {
                              const phWeeks = ph.scaledWeeks;
                              const moduleForPhase = projectModules[phIdx] || projectModules[phIdx % Math.max(projectModules.length, 1)] || null
                              const deliverableForPhase = projectDeliverables[phIdx] || projectDeliverables[phIdx % Math.max(projectDeliverables.length, 1)] || null
                              const stackForPhase = projectStack.slice(phIdx % Math.max(projectStack.length - 1, 1), (phIdx % Math.max(projectStack.length - 1, 1)) + 2).join(" + ") || stackStr
                              const teamForPhase = teamRoles[phIdx % Math.max(teamRoles.length, 1)] || ""
                              const versionKey = phIdx === 0 ? "v1" : phIdx === 1 ? "v2" : "v3"
                              const versionLabel = projectVersions[versionKey] || null

                              const taskList: string[] = []
                              taskList.push(moduleForPhase ? `Démarrage de "${moduleForPhase}" — ${ph.phase} pour ${projectTitle}.` : `Lancement de la phase ${ph.phase} — ${projectTitle}.`)
                              if (phWeeks >= 3) taskList.push(stackForPhase ? `Développement avec ${stackForPhase}${teamForPhase ? ` — équipe ${teamForPhase}` : ""}.` : `Développement en cours — ${ph.phase}.`)
                              if (phWeeks >= 4) taskList.push(moduleForPhase ? `Intégration et tests du module "${moduleForPhase}" avec ${stackStr}.` : `Intégration et tests — ${ph.phase}.`)
                              if (phWeeks >= 5) taskList.push(teamForPhase ? `Revue de code et validation qualité — ${teamForPhase} sur ${projectTitle}.` : `Revue et validation — ${ph.phase}.`)
                              for (let extra = 5; extra < phWeeks - 1; extra++) {
                                const extraModule = projectModules[(phIdx + extra) % Math.max(projectModules.length, 1)]
                                taskList.push(extraModule ? `Avancement sur "${extraModule}" — itération ${extra - 3}.` : `Itération ${extra - 3} — ${ph.phase} pour ${projectTitle}.`)
                              }
                              taskList.push(deliverableForPhase ? `✅ Livrable : ${deliverableForPhase}${versionLabel ? ` (${versionLabel})` : ""}.` : versionLabel ? `✅ ${versionLabel} — fin de phase ${ph.phase}.` : `✅ Fin de phase ${ph.phase} — validation et passage à la suite.`)

                              for (let w = 0; w < phWeeks && weekCursor <= totalWeeks; w++) {
                                const isLast = w === phWeeks - 1
                                const isAlert = complexity === "HIGH" && w === Math.floor(phWeeks / 2) && phIdx > 0
                                let text = ""
                                if (isAlert) text = `⚠️ Point de contrôle "${ph.phase}" — Revue d'avancement sur ${projectTitle}${moduleForPhase ? `. Module en cours : ${moduleForPhase}` : ""}. Vérification des délais et de la qualité.`
                                else if (isLast) text = taskList[taskList.length - 1]
                                else text = taskList[Math.min(w, taskList.length - 2)]
                                logs.push({ week: weekCursor, text, phase: ph.phase, isAlert })
                                weekCursor++
                              }
                            })
                            while (weekCursor <= totalWeeks) {
                              const lastDeliverable = projectDeliverables[projectDeliverables.length - 1]
                              logs.push({ week: weekCursor, text: lastDeliverable ? `Finalisation — ${lastDeliverable} pour ${p.title || "le projet"}.` : `Finalisation & préparation au déploiement — ${p.title || "le projet"}.`, phase: "Déploiement", isAlert: false })
                              weekCursor++
                            }
                          }

                          // Phase color palette — hex values for inline styles (Tailwind purges dynamic classes)
                          const phaseColors = [
                            { bar: "#00BCD4", barLight: "#b2ebf2", shadow: "rgba(0,188,212,0.5)", badge: "#e0f7fa", badgeText: "#006064", dot: "#00BCD4" },
                            { bar: "#6366f1", barLight: "#c7d2fe", shadow: "rgba(99,102,241,0.5)", badge: "#ede9fe", badgeText: "#4338ca", dot: "#6366f1" },
                            { bar: "#f59e0b", barLight: "#fde68a", shadow: "rgba(245,158,11,0.5)", badge: "#fef3c7", badgeText: "#92400e", dot: "#f59e0b" },
                            { bar: "#10b981", barLight: "#a7f3d0", shadow: "rgba(16,185,129,0.5)", badge: "#d1fae5", badgeText: "#065f46", dot: "#10b981" },
                            { bar: "#ef4444", barLight: "#fecaca", shadow: "rgba(239,68,68,0.5)", badge: "#fee2e2", badgeText: "#991b1b", dot: "#ef4444" },
                            { bar: "#8b5cf6", barLight: "#ddd6fe", shadow: "rgba(139,92,246,0.5)", badge: "#ede9fe", badgeText: "#5b21b6", dot: "#8b5cf6" },
                            { bar: "#ec4899", barLight: "#fbcfe8", shadow: "rgba(236,72,153,0.5)", badge: "#fce7f3", badgeText: "#9d174d", dot: "#ec4899" },
                            { bar: "#14b8a6", barLight: "#99f6e4", shadow: "rgba(20,184,166,0.5)", badge: "#ccfbf1", badgeText: "#134e4a", dot: "#14b8a6" },
                          ]
                          const phaseList = [...new Set(logs.map(l => l.phase))]
                          const phaseColorMap: Record<string, typeof phaseColors[0]> = {}
                          phaseList.forEach((ph, i) => { phaseColorMap[ph] = phaseColors[i % phaseColors.length] })

                          const safeWeek = Math.min(Math.max(1, timeLapseWeek), totalWeeks)
                          const currentLog = logs[safeWeek - 1]
                          const currentPhase = currentLog?.phase || ""
                          const currentColor = phaseColorMap[currentPhase] || phaseColors[0]

                          return (
                            <motion.div key="planification" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">

                              {/* Header */}
                              <div className="flex items-center px-1">
                                <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={14} /> Planning — {p.title}
                                </p>
                              </div>

                              {/* Gantt bar */}
                              <div className="rounded-2xl border border-slate-100 bg-white/60 backdrop-blur-md p-4 space-y-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Phases du projet · {totalWeeks} semaines</p>
                                {scaledPhases.map((ph, i) => {
                                  const color = phaseColorMap[ph.phase] || phaseColors[0]
                                  const prevWeeks = scaledPhases.slice(0, i).reduce((acc, p) => acc + p.scaledWeeks, 0)
                                  const startPct = (prevWeeks / totalWeeks) * 100
                                  const widthPct = (ph.scaledWeeks / totalWeeks) * 100
                                  const isActive = currentPhase === ph.phase
                                  return (
                                    <div key={i} className="flex items-center gap-2">
                                      <div className="flex items-center gap-1.5 w-28 shrink-0">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color.dot }} />
                                        <span className="text-[9px] font-bold text-slate-500 truncate">{ph.phase}</span>
                                      </div>
                                      <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${widthPct}%` }}
                                          transition={{ duration: 0.8, delay: i * 0.08, ease: "easeOut" }}
                                          style={{
                                            marginLeft: `${startPct}%`,
                                            backgroundColor: isActive ? color.bar : color.barLight,
                                            boxShadow: isActive ? `0 0 8px ${color.shadow}` : "none",
                                          }}
                                          className="absolute top-0 h-full rounded-full"
                                        />
                                        {isActive && (
                                          <motion.div
                                            className="absolute top-0 h-full w-1 bg-white/70 rounded-full"
                                            style={{ left: `${startPct + (((safeWeek - 1) / totalWeeks) * 100) - startPct}%` }}
                                            animate={{ opacity: [0.5, 1, 0.5] }}
                                            transition={{ duration: 1, repeat: Infinity }}
                                          />
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-mono w-8 shrink-0">{ph.scaledWeeks}s</span>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Card deck */}
                              <div className="rounded-[2rem] border border-cyan-200/40 bg-white/70 backdrop-blur-xl p-5 shadow-[0_10px_40px_rgba(34,211,238,0.15)] flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-cyan-800 font-bold text-xs uppercase tracking-wider">Semaine {safeWeek} / {totalWeeks}</span>
                                    <span
                                      className="text-[9px] font-black px-2 py-0.5 rounded-full"
                                      style={{ backgroundColor: currentColor.badge, color: currentColor.badgeText }}
                                    >{currentPhase}</span>
                                  </div>
                                  <Badge className="bg-cyan-50 text-cyan-600 border border-cyan-200">
                                    {Math.round((safeWeek / totalWeeks) * 100)}%
                                  </Badge>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: `linear-gradient(90deg, ${currentColor.barLight}, ${currentColor.bar})` }}
                                    animate={{ width: `${Math.round((safeWeek / totalWeeks) * 100)}%` }}
                                    transition={{ duration: 0.4 }}
                                  />
                                </div>

                                {/* Holographic card deck */}
                                <div className="relative h-44 w-full overflow-hidden flex items-center justify-center rounded-xl bg-slate-900/5">
                                  <AnimatePresence mode="popLayout">
                                    {logs.map((log) => {
                                      const activeIndex = safeWeek - 1
                                      const index = log.week - 1
                                      const offset = index - activeIndex
                                      if (offset < -1 || offset > 3) return null
                                      const isActive = offset === 0
                                      const isDiscarded = offset === -1
                                      const logColor = phaseColorMap[log.phase] || phaseColors[0]
                                      return (
                                        <motion.div
                                          key={log.week}
                                          initial={{ opacity: 0, scale: 0.8, y: -50 }}
                                          animate={{
                                            opacity: isActive ? 1 : isDiscarded ? 0.3 : 1 - offset * 0.25,
                                            scale: isActive ? 1 : isDiscarded ? 0.8 : 1 - offset * 0.05,
                                            y: isDiscarded ? 30 : offset * 12,
                                            x: isDiscarded ? "-60%" : "30%",
                                            rotate: isDiscarded ? -8 : 0,
                                            zIndex: isDiscarded ? 11 : 10 - offset,
                                          }}
                                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                          onClick={() => {
                                            if (isActive && safeWeek < totalWeeks) setTimeLapseWeek(prev => prev + 1)
                                            else if (isDiscarded) setTimeLapseWeek(prev => prev - 1)
                                          }}
                                          className={`absolute w-[85%] max-w-[320px] h-28 rounded-2xl border p-4 flex flex-col justify-center backdrop-blur-xl shadow-xl transition-colors duration-500 ${
                                            isActive
                                              ? log.isAlert
                                                ? "bg-rose-500/10 border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] cursor-pointer"
                                                : "bg-white/60 cursor-pointer hover:bg-white/80"
                                              : isDiscarded
                                                ? "bg-slate-100/40 border-slate-300/30 cursor-pointer"
                                                : "bg-white/20 border-white/20 pointer-events-none"
                                          }`}
                                          style={isActive && !log.isAlert ? {
                                            borderColor: `${logColor.bar}60`,
                                            boxShadow: `0 0 30px ${logColor.shadow}`,
                                          } : {}}
                                        >
                                          <div className="flex items-center justify-between gap-2 mb-2">
                                            <Badge
                                              className="border-0"
                                              style={log.isAlert
                                                ? { backgroundColor: "#fee2e2", color: "#991b1b" }
                                                : { backgroundColor: logColor.badge, color: logColor.badgeText }
                                              }
                                            >
                                              S{log.week < 10 ? "0" + log.week : log.week} / {totalWeeks}
                                            </Badge>
                                            <span
                                              className="text-[9px] font-black uppercase tracking-wider"
                                              style={{ color: log.isAlert ? "#ef4444" : logColor.bar }}
                                            >
                                              {log.isAlert ? "⚠️ Alerte" : log.phase}
                                            </span>
                                          </div>
                                          <p className={`text-xs font-bold leading-snug ${log.isAlert ? "text-rose-900" : "text-slate-800"}`}>
                                            {log.text}
                                            {isActive && (
                                              <motion.span
                                                animate={{ opacity: [1, 0] }}
                                                transition={{ repeat: Infinity, duration: 0.8 }}
                                                className="inline-block w-1.5 h-3 ml-1 align-baseline rounded-sm"
                                                style={{ backgroundColor: log.isAlert ? "#ef4444" : logColor.bar }}
                                              />
                                            )}
                                          </p>
                                        </motion.div>
                                      )
                                    })}
                                  </AnimatePresence>
                                </div>

                                {/* Navigation arrows */}
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => setTimeLapseWeek(prev => Math.max(1, prev - 1))}
                                    disabled={safeWeek <= 1}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 transition-all"
                                  >
                                    ← Préc.
                                  </button>
                                  <div className="flex gap-1 items-center">
                                    {Array.from({ length: Math.min(totalWeeks, 12) }).map((_, i) => (
                                      <button
                                        key={i}
                                        onClick={() => setTimeLapseWeek(i + 1)}
                                        className="w-1.5 h-1.5 rounded-full transition-all"
                                        style={{
                                          backgroundColor: safeWeek === i + 1 ? currentColor.bar : "#e2e8f0",
                                          transform: safeWeek === i + 1 ? "scale(1.4)" : "scale(1)"
                                        }}
                                      />
                                    ))}
                                    {totalWeeks > 12 && <span className="text-[9px] text-slate-400 font-bold">+{totalWeeks - 12}</span>}
                                  </div>
                                  <button
                                    onClick={() => setTimeLapseWeek(prev => Math.min(totalWeeks, prev + 1))}
                                    disabled={safeWeek >= totalWeeks}
                                    className="px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 disabled:opacity-30 transition-all"
                                  >
                                    Suiv. →
                                  </button>
                                </div>
                              </div>

                              {/* Scenario description */}
                              {scenario?.description && (
                                <div className="px-4 py-3 rounded-xl bg-cyan-50/60 border border-cyan-100 text-xs text-cyan-800 font-medium italic">
                                  💬 {scenario.description}
                                </div>
                              )}
                            </motion.div>
                          )
                        })()},

                      </AnimatePresence>
                      <div className="flex gap-3 pt-2">
                        <Button variant="ghost" onClick={() => setStep("feasibility")} className="rounded-xl font-black text-slate-400">← Retour</Button>
                        {detailsTab === "planification" ? (
                          <Button onClick={() => { setStep("fonctionnalites"); generateDetailedTasks(selectedProject, selectedScenario); }} className="flex-1 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-6 rounded-2xl font-black text-lg transition-all duration-500 relative overflow-hidden group">
                            <span className="relative z-10 flex items-center justify-center">Valider &amp; Définir les fonctionnalités <ChevronRight size={18} className="ml-1.5" /></span>
                          </Button>
                        ) : detailsTab === "equipe" ? (
                          <Button onClick={() => setDetailsTab("planification")} className="flex-1 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-6 rounded-2xl font-black text-lg transition-all duration-500 relative overflow-hidden group">
                            <span className="relative z-10 flex items-center justify-center">Continuer vers le Planning <ChevronRight size={18} className="ml-1.5" /></span>
                          </Button>
                        ) : null}
                      </div>
                    </motion.div>
                  )
                })()}

                {/* ─── CONCEPT VALIDATION (Phase 1 Checkpoint) ─── */}
                {step === "concept-validation" && selectedProject && (
                  <motion.div key="concept-validation" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-3">
                    <div className="flex items-center gap-3">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] shrink-0"><CheckCircle size={16} className="text-white" /></motion.div>
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <h2 className="text-base font-black text-slate-900 dark:text-cyan-50">Validation du Concept</h2>
                        <p className="text-[9px] text-cyan-600/80 font-bold uppercase tracking-widest leading-none">Confirmez la vision avant la préproduction</p>
                      </motion.div>
                    </div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-[2rem] border border-white/60 bg-white/30 backdrop-blur-2xl p-5 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/20 rounded-full -mr-16 -mt-16 blur-[40px] group-hover:bg-cyan-400/30 transition-all duration-700" />
                      <div className="absolute bottom-0 left-0 w-40 h-40 bg-red-500/10 rounded-full -ml-16 -mb-16 blur-[40px] group-hover:bg-red-500/20 transition-all duration-700" />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                        <div className="col-span-1 md:col-span-2">
                          <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">Titre du Projet</p>
                          <p className="text-xl font-black text-slate-900 leading-tight">{selectedProject.title}</p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Type & Complexité</p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200/50">
                              <Box size={12} className="text-slate-500" />
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{comprehensionData?.project_type || "Projet"} • {selectedProject.complexity}</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Stack Technique</p>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedProject.stack?.slice(0, 4).map((s, i) => (
                                <span key={i} className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className={`space-y-3 ${deadline && (Date.now() - new Date(deadline).getTime() > 30 * 24 * 60 * 60 * 1000) ? 'bg-rose-500/20 border border-rose-400/30' : ''}`}>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Score Stratégique Global</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-2.5 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                                <motion.div
                                  initial={{ width: 0 }} animate={{ width: `${selectedIdea?.score || 80}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                                  className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] relative overflow-hidden"
                                >
                                  <motion.div animate={{ x: ['-100%', '200%'] }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12" />
                                </motion.div>
                              </div>
                              <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-red-500">{selectedIdea?.score || 80}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Vision du Projet (Éditeur Sémantique)</p>
                            <button onClick={() => setIsEditingVision(!isEditingVision)} className="flex items-center gap-1.5 text-[9px] font-bold text-[#00BCD4] bg-[#00BCD4]/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#00BCD4]/20 hover:bg-[#00BCD4]/20 hover:shadow-[0_0_15px_rgba(0,188,212,0.3)] transition-all">
                              {isEditingVision ? 'Fermer l\'éditeur' : '✏️ Éditer & Analyser'}
                            </button>
                          </div>

                          {isEditingVision ? (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                              <textarea
                                value={semanticVision}
                                onChange={handleSemanticChange}
                                className="w-full h-28 p-4 bg-white/50 backdrop-blur-xl border border-white/80 focus:border-cyan-400 rounded-xl text-xs text-slate-700 font-medium leading-relaxed focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]"
                                placeholder="Décrivez la vision de votre projet..."
                              />
                              <AnimatePresence>
                                {semanticAlerts.length > 0 && (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-1.5 overflow-hidden">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">⚡ Analyse IA en temps réel</p>
                                    {semanticAlerts.map((al, idx) => (
                                      <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg border backdrop-blur-md shadow-sm ${al.type === 'warning' ? 'bg-amber-50/80 border-amber-200/60' : 'bg-emerald-50/80 border-emerald-200/60'}`}>
                                        <span className="mt-0.5 text-sm">{al.type === 'warning' ? '⚠️' : '💡'}</span>
                                        <div>
                                          <p className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${al.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>{al.word}</p>
                                          <p className="text-[10px] font-medium text-slate-600 leading-snug">{al.msg}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          ) : (
                            <div className="p-4 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 italic relative group cursor-pointer transition-all hover:bg-white/60 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:border-cyan-200/50" onClick={() => setIsEditingVision(true)}>
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 to-red-500/0 group-hover:from-cyan-400/5 group-hover:to-red-500/5 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[1px]">
                                <span className="text-[10px] font-black text-slate-700 bg-white/90 backdrop-blur-sm border border-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2"><Edit3 size={12} className="text-cyan-500" /> Cliquer pour éditer</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium leading-relaxed">{semanticVision || selectedProject.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>

                    {/* What-If Simulator Integration in Concept Validation */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 mb-6">
                      <WhatIfSimulator
                        token={token}
                        projects={selectedProject ? [selectedProject as any] : []}
                        constraints={constraints}
                        whatIfOverrides={whatIfOverrides}
                        setWhatIfOverrides={setWhatIfOverrides}
                        whatIfWeights={{ roi: 25, fast: 15, innov: 20, feasib: 25, scalab: 15 }}
                        confidenceScore={selectedIdea?.score || 80}
                      />
                    </motion.div>

                    {/* ── MODE-AWARE ACTION PANEL ── */}
                    <AnimatePresence mode="wait">

                      {/* 🤖 PROACTIF — 3 action cards */}
                      {aiMode === 'proactive' && (
                        <motion.div key="proactive-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-3 space-y-3">
                          <p className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                            Mode Proactif — Choisissez votre action
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {/* Card 1: Approuver */}
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setPendingDecision({
                                  stepLabel: 'Validation du Concept',
                                  decision: `✅ Approuver : "${selectedProject?.title}"`,
                                  type: 'approve',
                                  impact: `Innovation: ${selectedProject?.innovation_score}% · Stack: ${selectedProject?.stack?.slice(0, 2).join(', ')}`,
                                  onConfirm: () => { setStep('feasibility'); generateFeasibility(selectedProject!, selectedScenario) }
                                })
                              }}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
                            >
                              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                <Check size={18} className="text-white" />
                              </div>
                              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Sceller</p>
                              <p className="text-[8px] text-emerald-600/70 text-center leading-tight">Valider & passer à la faisabilité</p>
                            </motion.button>

                            {/* Card 2: Alternatives */}
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                logDecision({ step, stepLabel: 'Validation du Concept', decision: 'Demander alternatives', reason: 'Manager insatisfait du concept actuel', type: 'reject' })
                                setStep('ideation')
                              }}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border-2 border-sky-200 dark:border-sky-900/50 hover:border-sky-400 hover:shadow-[0_0_20px_rgba(14,165,233,0.2)] transition-all"
                            >
                              <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-[0_0_12px_rgba(14,165,233,0.4)]">
                                <RefreshCw size={16} className="text-white" />
                              </div>
                              <p className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider">Alternatives</p>
                              <p className="text-[8px] text-sky-600/70 text-center leading-tight">Voir d'autres propositions IA</p>
                            </motion.button>

                            {/* Card 3: Modifier */}
                            <motion.button
                              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                logDecision({ step, stepLabel: 'Validation du Concept', decision: 'Modifier le Design Brief', reason: 'Ajustement de la vision', type: 'modify' })
                                setStep('design-brief')
                              }}
                              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                            >
                              <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                                <Edit3 size={16} className="text-white" />
                              </div>
                              <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Modifier</p>
                              <p className="text-[8px] text-amber-600/70 text-center leading-tight">Retravailler le Design Brief</p>
                            </motion.button>
                          </div>
                        </motion.div>
                      )}

                      {/* 🤝 CO-PILOTE — bouton + modale */}
                      {aiMode === 'copilot' && (
                        <motion.div key="copilot-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3 pt-2">
                          <Button onClick={() => { setStep(mode === "import" ? "warroom-tech" : "warroom-tech"); setTechSubPhase("pick"); }} variant="ghost" className="h-11 px-4 rounded-xl text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] font-black uppercase text-[9px] tracking-widest flex items-center gap-2 group transition-all duration-300 border border-transparent hover:border-red-500/30">
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" /> Retour
                          </Button>
                          <div className="flex-1" />
                          <Button onClick={() => setStep("design-brief")} variant="ghost" className="h-11 px-4 rounded-xl text-cyan-600 hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] font-black uppercase text-[9px] tracking-widest flex items-center gap-2 group transition-all duration-300 border border-transparent hover:border-cyan-500/30">
                            <Edit3 size={14} className="group-hover:scale-110 transition-transform duration-300" /> Modifier
                          </Button>
                          <Button
                            onClick={() => setPendingDecision({
                              stepLabel: 'Validation du Concept',
                              decision: `Approuver : "${selectedProject?.title}"`,
                              type: 'approve',
                              impact: `Stack: ${selectedProject?.stack?.slice(0, 2).join(', ')} — Innovation: ${selectedProject?.innovation_score}%`,
                              alternatives: ['Changer de projet', 'Modifier le Design Brief'],
                              onConfirm: () => { setStep('feasibility'); generateFeasibility(selectedProject!, selectedScenario) }
                            })}
                            className="h-11 px-8 rounded-xl bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white font-black uppercase text-[10px] tracking-widest shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 group overflow-hidden relative"
                          >
                            <span className="relative z-10 flex items-center gap-2">Sceller l'architecture <CheckCircle size={14} className="text-white group-hover:scale-110 transition-transform" /></span>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </Button>
                        </motion.div>
                      )}

                      {/* 📴 SILENCIEUX — bouton direct, zéro friction */}
                      {aiMode === 'silent' && (
                        <motion.div key="silent-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2">
                          <Button onClick={() => { setStep(mode === "import" ? "warroom-tech" : "warroom-tech"); setTechSubPhase("pick"); }} variant="ghost" className="h-10 px-3 rounded-xl text-slate-400 font-black text-[9px] uppercase flex items-center gap-1.5 group">
                            <ArrowLeft size={13} className="group-hover:-translate-x-1 transition-transform duration-300" /> Retour
                          </Button>
                          <div className="flex-1" />
                          <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                            Log automatique actif
                          </div>
                          <Button
                            onClick={() => {
                              logDecision({ step, stepLabel: 'Validation du Concept', decision: `Approuver : "${selectedProject?.title}"`, reason: '', type: 'approve', impact: `Innovation: ${selectedProject?.innovation_score}%` })
                              setStep('feasibility')
                              generateFeasibility(selectedProject!, selectedScenario)
                            }}
                            className="h-10 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 transition-all"
                          >
                            Continuer <ArrowRight size={14} />
                          </Button>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </motion.div>
                )}

                {/* ─── FAISABILITÉ & RISQUES (Phase 2.2) ─── */}
                {step === "feasibility" && selectedProject && (
                  <motion.div key="feasibility" variants={fade} initial="initial" animate="animate" exit="exit" className="relative overflow-hidden min-h-[600px] p-6 rounded-[2.5rem] border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)] bg-slate-50/50 dark:bg-slate-950/50">

                    {/* 🌪️ PARTICLE STRESS FIELD BACKGROUND */}
                    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                      <motion.div
                        animate={{ opacity: (timePressure < 80 || timePressure >= 130) ? 0.6 : 0.4 }}
                        className={`absolute -top-20 -right-20 w-[30rem] h-[30rem] rounded-full blur-[100px] transition-colors duration-1000 ${(timePressure < 80 || timePressure >= 130) ? 'bg-rose-400/30' : 'bg-cyan-300/30'}`}
                      />
                      <motion.div
                        animate={{ opacity: (timePressure < 80 || timePressure >= 130) ? 0.5 : 0.3 }}
                        className={`absolute -bottom-20 -left-20 w-[30rem] h-[30rem] rounded-full blur-[100px] transition-colors duration-1000 ${(timePressure < 80 || timePressure >= 130) ? 'bg-amber-400/20' : 'bg-emerald-300/20'}`}
                      />
                      {Array.from({ length: 35 }).map((_, i) => {
                        const size = 3 + (i % 5) * 2;
                        const xStart = (i * 13) % 100;
                        const yStart = (i * 17) % 100;
                        const duration = ((timePressure < 80 || timePressure >= 130) ? 2 : 8) + (i % 5);
                        const isHighStress = timePressure < 80 || timePressure >= 130;
                        const color = isHighStress
                          ? (i % 3 === 0 ? 'bg-rose-400' : 'bg-amber-400')
                          : (i % 3 === 0 ? 'bg-cyan-300' : 'bg-white');

                        return (
                          <motion.div
                            key={`particle-${i}`}
                            className={`absolute rounded-full ${color} mix-blend-overlay`}
                            style={{ width: size, height: size, left: `${xStart}%`, top: `${yStart}%` }}
                            animate={{
                              y: isHighStress ? [0, -150, 0] : [0, -50, 0],
                              x: isHighStress ? [0, (i % 2 === 0 ? 80 : -80), 0] : [0, (i % 2 === 0 ? 20 : -20), 0],
                              scale: isHighStress ? [1, 2, 1] : [1, 1.2, 1],
                              opacity: [0.1, 0.6, 0.1]
                            }}
                            transition={{ duration, repeat: Infinity, ease: "linear" }}
                          />
                        );
                      })}
                    </div>

                    <div className="relative z-10 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                          <Target size={20} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                        </div>
                        <div>
                          <h2 className="text-lg font-black tracking-tight text-slate-800 dark:text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">Analyse de Faisabilité</h2>
                          <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold uppercase tracking-widest">Complexité · Durée · Risques</p>
                        </div>
                      </div>

                      {isLoadingFeasibility ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                          <div className="relative w-16 h-16">
                            <div className="w-16 h-16 rounded-full border-4 border-white/50 dark:border-slate-800 border-t-cyan-500 animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center"><Target size={20} className="text-cyan-500" /></div>
                          </div>
                          <p className="text-sm font-black text-cyan-600 dark:text-cyan-400 animate-pulse drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">Analyse Neuronale en cours...</p>
                        </div>
                      ) : feasibilityData ? (
                        isRescuing ? (
                          <div className="rounded-[2rem] border border-cyan-300 bg-white backdrop-blur-xl p-8 shadow-[0_0_40px_rgba(34,211,238,0.3)] font-mono min-h-[350px] flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/80 to-white pointer-events-none" />
                            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite] pointer-events-none" />
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,211,238,0.2),transparent_50%)] pointer-events-none" />

                            <div className="flex items-center gap-3 mb-6 border-b border-cyan-300/50 pb-4 shrink-0 relative z-10">
                              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                              <span className="text-cyan-800 font-bold uppercase tracking-widest text-sm drop-shadow-sm"><span className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]">⚡</span> OVERCLOCKING SYSTEM : PROTOCOLE EN COURS</span>
                            </div>

                            <div className="space-y-3 flex-1 overflow-hidden flex flex-col justify-end relative z-10">
                              {rescueTerminalLines.map((line, i) => (
                                <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-cyan-800 text-xs font-semibold drop-shadow-[0_0_5px_rgba(34,211,238,0.4)] bg-cyan-50/50 px-2 py-1 rounded-md border border-cyan-100">
                                  {line}
                                </motion.p>
                              ))}
                              <div className="mt-2"><motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity }} className="inline-block w-2.5 h-4 bg-cyan-600 shadow-[0_0_8px_rgba(34,211,238,0.5)]" /></div>
                            </div>
                          </div>
                        ) : (
                          <motion.div animate={simulatedScore < 50 || timePressure < 70 ? { x: [-2, 2, -2, 2, 0] } : {}} transition={{ duration: 0.4 }} className="space-y-4">

                            {/* ── 0. SIMULATEUR DE PRESSION (Circuit Board) ── */}
                            <motion.div className="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none" />
                              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                              <div className={`absolute bottom-0 left-0 w-32 h-32 ${(timePressure < 80 || timePressure >= 130) ? 'bg-red-500/20' : 'bg-cyan-500/10'} rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none transition-colors duration-500`} />

                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-4">
                                  <div className={`w-6 h-6 rounded-lg ${(timePressure < 80 || timePressure >= 130) ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.8)]'} flex items-center justify-center transition-colors duration-300`}><Settings2 size={12} className="text-white" /></div>
                                  <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Simulateur de Pression (What-If)</p>
                                </div>
                                <div className="max-w-md">
                                  <div>
                                    <div className="flex justify-between mb-2">
                                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pression Temporelle (Deadline)</span>
                                      <span className={`text-[10px] font-black drop-shadow-[0_0_5px_currentColor] ${(timePressure < 80 || timePressure >= 130) ? 'text-red-500' : 'text-cyan-600 dark:text-cyan-400'}`}>{timePressure}%</span>
                                    </div>
                                    {(() => {
                                      const realisticWeeks = (() => {
                                        if (deadline) {
                                          const msPerWeek = 7 * 24 * 60 * 60 * 1000
                                          return Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek))
                                        }
                                        return feasibilityData?.duration?.realistic_weeks || 12
                                      })()
                                      const sliderMin = 10
                                      const sliderMax = 200
                                      const sliderRange = sliderMax - sliderMin
                                      const fillPct = Math.max(0, Math.min(100, ((timePressure - sliderMin) / sliderRange) * 100))
                                      const simWeeks = Math.max(1, Math.round(realisticWeeks * (timePressure / 100)))
                                      // Compute user's actual deadline marker position
                                      let deadlineMarkerPct: number | null = null
                                      let deadlineWeeks: number | null = null
                                      if (deadline) {
                                        const msPerWeek = 7 * 24 * 60 * 60 * 1000
                                        deadlineWeeks = Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek))
                                        const deadlineRatio = Math.round((deadlineWeeks / realisticWeeks) * 100)
                                        deadlineMarkerPct = Math.max(0, Math.min(100, ((deadlineRatio - sliderMin) / sliderRange) * 100))
                                      }
                                      return (
                                        <>
                                          <div className="relative h-2 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full border border-white/50 dark:border-white/5 overflow-visible">
                                            <input type="range" min={sliderMin} max={sliderMax} value={timePressure} onChange={(e) => {
                                              const v = Number(e.target.value);
                                              setTimePressure(v);
                                              if (isRescueModeActive) setIsRescueModeActive(false);
                                            }} className="absolute z-20 w-full h-full opacity-0 cursor-pointer" />
                                            <div className="absolute inset-0 rounded-full overflow-hidden">
                                              <motion.div className={`absolute top-0 left-0 h-full ${(timePressure < 80 || timePressure >= 130) ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,1)]'}`} style={{ width: `${fillPct}%` }} />
                                            </div>
                                            {/* Deadline marker pin */}
                                            {deadlineMarkerPct !== null && (
                                              <div
                                                className="absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none"
                                                style={{ left: `${deadlineMarkerPct}%` }}
                                                title={`Votre deadline : ≈ ${deadlineWeeks} sem.`}
                                              >
                                                <div className="w-0.5 h-4 bg-amber-400 -translate-x-1/2 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[7px] font-black text-amber-500 whitespace-nowrap">{deadlineWeeks}s</div>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex justify-between mt-1">
                                            <span className="text-[8px] text-slate-400">{sliderMin}% — Rush extrême</span>
                                            <span className="text-[8px] font-bold text-slate-500">≈ {simWeeks} sem.</span>
                                            <span className="text-[8px] text-slate-400">{sliderMax}% — Confort</span>
                                          </div>
                                        </>
                                      )
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </motion.div>

                            {/* ── 1. LIVE SCORE BANNER (Holographic) ── */}
                            <motion.div
                              className={`relative overflow-hidden rounded-[2rem] p-6 border flex items-center gap-6 backdrop-blur-3xl transition-all duration-500 ${simulatedScore >= 70 ? 'bg-white/40 dark:bg-slate-900/40 border-cyan-500/30 shadow-[0_8px_32px_rgba(34,211,238,0.1)]' : simulatedScore >= 50 ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-500/30 shadow-[0_8px_32px_rgba(245,158,11,0.1)]' : 'bg-rose-50/50 dark:bg-rose-900/20 border-red-500/50 shadow-[0_8px_32px_rgba(239,68,68,0.2)] animate-pulse-slow'}`}>
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.2),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.05),transparent_60%)] pointer-events-none" />
                              <div className="relative shrink-0 text-center">
                                <motion.div key={simulatedScore} initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}
                                  className={`text-6xl font-black transition-colors duration-300 ${simulatedScore >= 70 ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]' : simulatedScore >= 50 ? 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]' : 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)]'}`}>
                                  {simulatedScore}
                                </motion.div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">/ 100</p>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border transition-colors duration-300 ${simulatedScore >= 70 ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-700 dark:text-cyan-300' : simulatedScore >= 50 ? 'bg-amber-500/20 border-amber-400/50 text-amber-700 dark:text-amber-300' : 'bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400'}`}>{simulatedLevel}</span>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Verdict Holographique</span>
                                </div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed mb-1.5">{displayedSummary}</p>
                              </div>
                              <div className="shrink-0 flex flex-col gap-2">
                                <div className={`backdrop-blur-xl px-4 py-3 rounded-2xl border flex flex-col items-end min-w-[140px] transition-colors duration-300 ${timePressure < 80 ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]'}`}>
                                  <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${timePressure < 80 ? 'text-red-500 dark:text-red-400' : 'text-cyan-600 dark:text-cyan-400'}`}>📅 Durée Estimée</p>
                                  <p className="text-[15px] font-black text-slate-800 dark:text-white leading-none">{simulatedDuration} <span className="text-[9px] text-slate-500 uppercase">Semaines</span></p>
                                </div>
                                {(timePressure < 80 || timePressure >= 130) && (() => {
                                  const optimalWeeks = (() => {
                                    if (deadline) {
                                      const msPerWeek = 7 * 24 * 60 * 60 * 1000
                                      return Math.max(1, Math.round((new Date(deadline).getTime() - Date.now()) / msPerWeek))
                                    }
                                    return feasibilityData?.duration?.realistic_weeks || 12
                                  })()
                                  const optimalDate = new Date()
                                  optimalDate.setDate(optimalDate.getDate() + optimalWeeks * 7)
                                  const optimalDateStr = deadline || optimalDate.toISOString().split('T')[0]
                                  return (
                                    <motion.button
                                      initial={{ opacity: 0, scale: 0.85 }}
                                      animate={{
                                        opacity: 1,
                                        scale: 1,
                                        x: [0, -4, 4, -3, 3, -1, 1, 0],
                                      }}
                                      transition={{
                                        opacity: { duration: 0.3 },
                                        scale: { duration: 0.3 },
                                        x: {
                                          duration: 0.5,
                                          repeat: Infinity,
                                          repeatDelay: 2.5,
                                          ease: "easeInOut",
                                        }
                                      }}
                                      whileHover={{ scale: 1.06, x: 0 }}
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => {
                                        // Use manager's deadline if set, otherwise use AI estimate
                                        if (deadline) {
                                          setTimePressure(100)
                                        } else {
                                          setDeadline(optimalDateStr)
                                          setTimePressure(100)
                                        }
                                      }}
                                      className="relative min-w-[140px] overflow-hidden rounded-2xl px-4 py-3 flex flex-col items-center gap-0.5 cursor-pointer"
                                      style={{ background: 'linear-gradient(135deg, #001a33, #003366, #001a33)' }}
                                    >
                                      {/* Pulsing neon border */}
                                      <motion.div
                                        className="absolute inset-0 rounded-2xl pointer-events-none"
                                        animate={{
                                          opacity: [0.5, 1, 0.5], boxShadow: [
                                            '0 0 8px 2px #00b4ff, inset 0 0 8px 1px #00b4ff20',
                                            '0 0 22px 5px #00b4ff, inset 0 0 18px 2px #00b4ff40',
                                            '0 0 8px 2px #00b4ff, inset 0 0 8px 1px #00b4ff20',
                                          ]
                                        }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                        style={{ border: '1.5px solid #00b4ff' }}
                                      />
                                      {/* Sweep line */}
                                      <motion.div
                                        className="absolute inset-0 pointer-events-none"
                                        animate={{ x: ['-100%', '220%'] }}
                                        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear', repeatDelay: 1.5 }}
                                        style={{ background: 'linear-gradient(90deg, transparent, rgba(0,180,255,0.25), transparent)', width: '55%' }}
                                      />
                                      {/* Alert dot */}
                                      <motion.div
                                        className="absolute top-2 right-2 w-2 h-2 rounded-full"
                                        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                        style={{ background: '#00b4ff', boxShadow: '0 0 6px 2px #00b4ff' }}
                                      />
                                      {/* Text */}
                                      <span className="relative z-10 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">
                                        Choix Optimal
                                      </span>
                                      <motion.span
                                        className="relative z-10 text-[14px] font-black tabular-nums"
                                        animate={{ textShadow: ['0 0 6px #00b4ff', '0 0 18px #00b4ff', '0 0 6px #00b4ff'] }}
                                        transition={{ duration: 1.2, repeat: Infinity }}
                                        style={{ color: '#7dd8ff' }}
                                      >
                                        {optimalWeeks} semaines
                                      </motion.span>
                                    </motion.button>
                                  )
                                })()}
                              </div>
                            </motion.div>

                            {/* ── 2. AI AGENT DEBATE (Floating Glass) ── */}
                            <motion.div
                              className="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.05)] overflow-hidden">
                              <div className="px-5 py-3 border-b border-white/50 dark:border-white/10 flex items-center gap-2 bg-white/20 dark:bg-slate-900/20 backdrop-blur-md">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_5px_rgba(34,211,238,1)]" />
                                <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">🧠 Débat Multi-Agents IA — Neural Link</p>
                              </div>
                              <div className="p-4 space-y-3">
                                {[
                                  {
                                    agent: '👨‍💻 Dev Agent', color: isRescueModeActive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : timePressure < 80 ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-slow' : 'text-cyan-700 dark:text-cyan-300 bg-white/50 dark:bg-cyan-950/30 border-white/80 dark:border-cyan-500/30',
                                    msg: isRescueModeActive ? "Architecture Serverless déployée. Monolithique robuste. Dette technique sous contrôle." : timePressure <= 70 ? `Alerte : Impossible de livrer une stack robuste en si peu de temps. Risque de dette technique maximal !` : timePressure >= 130 ? `Alerte : Délais très larges. Risque de sur-ingénierie et de perte de focus sur le MVP.` : feasibilityData.complexity?.score > 70 ? `Complexité ${feasibilityData.complexity?.label} — nécessite une équipe senior.` : `Projet techniquement maîtrisable avec l'équipe actuelle.`,
                                    badge: isRescueModeActive ? { t: '✅ SAUVÉ', c: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,1)]' } : timePressure <= 70 ? { t: '🔴 CRITIQUE', c: 'bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,1)]' } : timePressure >= 130 ? { t: '⚠️ LENT', c: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/50 text-amber-600 dark:text-amber-400' } : feasibilityData.complexity?.score > 70 ? { t: '⚠️ Attention', c: 'bg-amber-100 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/50 text-amber-600 dark:text-amber-400' } : { t: '✅ OK', c: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-400' }
                                  },
                                  {
                                    agent: '⚠️ Risk Agent', color: isRescueModeActive ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-500/30' : simulatedScore < 50 ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-slow' : 'text-amber-700 dark:text-amber-300 bg-white/50 dark:bg-amber-950/30 border-white/80 dark:border-amber-500/30',
                                    msg: isRescueModeActive ? "Tous les risques critiques ont été évacués. Le projet est prêt pour un lancement rapide." : simulatedScore < 50 ? `Risque global : EXTRÊME. La simulation montre que le projet va droit dans le mur.` : `Risque global : ${simulatedScore >= 75 ? 'Faible' : simulatedScore >= 55 ? 'Modéré' : 'Élevé'}. Les dynamiques de temps affectent directement l'équipe.`,
                                    badge: isRescueModeActive ? { t: '🟢 STABLE', c: 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400' } : simulatedScore < 50 ? { t: '🔴 FAILLITE', c: 'bg-red-100 dark:bg-red-500/20 border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,1)]' } : simulatedScore < 75 ? { t: '🟠 Élevé', c: 'bg-orange-100 dark:bg-orange-500/20 border-orange-200 dark:border-orange-500/50 text-orange-600 dark:text-orange-400' } : { t: '🟢 Modéré', c: 'bg-cyan-100 dark:bg-cyan-500/20 border-cyan-200 dark:border-cyan-500/50 text-cyan-600 dark:text-cyan-400' }
                                  },
                                ].map((a, i) => (
                                  <motion.div key={i} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                                    className={`rounded-2xl border p-3 flex items-start gap-3 backdrop-blur-md transition-colors duration-300 ${a.color}`}>
                                    <span className="text-sm font-black shrink-0 mt-0.5">{a.agent.split(' ')[0]}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 opacity-80">{a.agent.split(' ').slice(1).join(' ')}</p>
                                      <p className="text-xs font-medium leading-snug">{a.msg}</p>
                                    </div>
                                    <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded-full border transition-all duration-300 ${a.badge.c}`}>{a.badge.t}</span>
                                  </motion.div>
                                ))}
                                <div className="flex items-center gap-2 pt-2 border-t border-white/30 dark:border-slate-800">
                                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${simulatedScore >= 70 ? 'bg-cyan-500 shadow-[0_0_5px_rgba(34,211,238,1)]' : simulatedScore >= 50 ? 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,1)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)]'}`} />
                                  <p className={`text-[10px] font-black uppercase tracking-widest ${simulatedScore >= 70 ? 'text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]' : simulatedScore >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-500 drop-shadow-[0_0_2px_rgba(239,68,68,0.5)]'}`}>Consensus IA : {simulatedScore >= 70 ? '✅ Systèmes Stables — go !' : simulatedScore >= 50 ? '⚠️ Viable avec ajustements importants' : '🔴 SURCHARGE SIMULÉE — réévaluer'}</p>
                                </div>
                              </div>
                            </motion.div>


                            {/* ── 5. TEAM + RISKS ── */}
                            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="grid grid-cols-2 gap-4">
                              <div className="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-5 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
                                <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">👥 Équipe Requise</p>
                                <p className="text-xl font-black text-slate-800 dark:text-white leading-tight">{dynamicTeamLevel}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{isRescueModeActive ? '2' : dynamicTeamSizeMin}–{isRescueModeActive ? '3' : dynamicTeamSizeMax} personnes</p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {dynamicKeyRoles?.map((r: string, i: number) => <span key={i} className="px-2.5 py-1 bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400 rounded-lg text-[9px] font-black uppercase border border-cyan-200 dark:border-cyan-500/30">{r}</span>)}
                                </div>
                              </div>
                              <div className="rounded-[2rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-5 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)]">
                                <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">⚠️ Risque Global</p>
                                {/* Dynamique: change avec le slider de pression */}
                                {simulatedScore >= 75
                                  ? <p className="text-xl font-black text-cyan-600 dark:text-cyan-400">Faible</p>
                                  : simulatedScore >= 55
                                    ? <p className="text-xl font-black text-amber-400">Modéré</p>
                                    : simulatedScore >= 35
                                      ? <p className="text-xl font-black text-amber-500">Élevé</p>
                                      : <p className="text-xl font-black text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">Critique</p>
                                }
                                <ul className="space-y-2 mt-2">
                                  {dynamicRisks.length === 0 || (dynamicRisks.length === 1 && dynamicRisks[0].toLowerCase() === 'inconnu') ? (
                                    <li className="flex items-start gap-2.5 bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-800 p-2.5 rounded-xl">
                                      <span className="shrink-0 mt-0.5"><CheckCircle2 size={14} className="text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" /></span>
                                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">Aucun risque</p>
                                    </li>
                                  ) : (
                                    dynamicRisks.map((r: string, i: number) => (
                                      <li key={i} className="flex items-start gap-2.5 bg-white/50 dark:bg-slate-900/50 border border-white/60 dark:border-slate-800 p-2.5 rounded-xl">
                                        <span className="shrink-0 mt-0.5"><AlertTriangle size={14} className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" /></span>
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug">{r}</p>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              </div>
                            </motion.div>
                          </motion.div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                          <AlertCircle size={32} className="text-slate-400 dark:text-slate-300" />
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-bold">Aucune donnée disponible</p>
                          <Button onClick={() => generateFeasibility(selectedProject, selectedScenario)} variant="outline" className="rounded-xl">Réessayer</Button>
                        </div>
                      )}

                      {/* ── MODE-AWARE ACTION PANEL — FAISABILITÉ ── */}
                      <AnimatePresence mode="wait">
                        {simulatedScore < 50 && !isRescueModeActive ? (
                          <motion.div key="overclock-override" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-3 mt-4 border-t border-white/30 dark:border-slate-800/50">
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                              onClick={handleRescueProtocol}
                              className="w-full flex items-center justify-center gap-4 p-4 rounded-2xl bg-white border-2 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:border-cyan-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all group overflow-hidden relative"
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-50/80 via-white to-cyan-100/50" />
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_2s_infinite]" />
                              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center relative z-10 border border-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping" />
                                <Zap size={20} className="text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" />
                              </div>
                              <div className="text-left relative z-10">
                                <p className="text-sm font-black text-cyan-800 uppercase tracking-widest drop-shadow-sm group-hover:text-cyan-900 transition-colors">⚡ Activer l'Overclocking IA</p>
                                <p className="text-[10px] text-cyan-600 uppercase font-bold tracking-wider mt-0.5">Injection Serverless & Génération de code</p>
                              </div>
                            </motion.button>
                          </motion.div>
                        ) : (
                          <>
                            {/* 🤖 PROACTIF — 3 cards */}
                            {aiMode === 'proactive' && (
                              <motion.div key="feas-proactive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-3 space-y-3 border-t border-white/30 dark:border-slate-800/50">
                                <p className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                                  Mode Proactif — Quelle décision prenez-vous ?
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => setPendingDecision({
                                      stepLabel: 'Analyse de Faisabilité',
                                      decision: `Valider — Score ${simulatedScore}/100`,
                                      type: 'approve',
                                      impact: `Budget: ${simulatedBudgetMin.toLocaleString()}–${simulatedBudgetMax.toLocaleString()} DT`,
                                      onConfirm: () => { setDetailsTab("equipe"); setStep("projet-details") }
                                    })}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-900/50 hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
                                    disabled={isLoadingFeasibility || isRescuing}
                                  >
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.4)]"><Check size={18} className="text-white" /></div>
                                    <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Valider</p>
                                    <p className="text-[8px] text-emerald-600/70 text-center leading-tight">Continuer vers Architecture</p>
                                  </motion.button>

                                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => { logDecision({ step, stepLabel: 'Faisabilité', decision: 'Changer de scénario', reason: 'Réévaluation du planning', type: 'modify' }); setStep("concept-validation") }}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-900/50 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all"
                                    disabled={isRescuing}
                                  >
                                    <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.4)]"><RefreshCw size={16} className="text-white" /></div>
                                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider">Scénario</p>
                                    <p className="text-[8px] text-amber-600/70 text-center leading-tight">Changer le planning</p>
                                  </motion.button>

                                  <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => { logDecision({ step, stepLabel: 'Faisabilité', decision: 'Revenir au concept', reason: 'Risque trop élevé', type: 'reject' }); setStep("concept-validation") }}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/50 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] transition-all"
                                    disabled={isRescuing}
                                  >
                                    <div className="w-9 h-9 rounded-xl bg-rose-500 flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.4)]"><X size={16} className="text-white" /></div>
                                    <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-wider">Revenir</p>
                                    <p className="text-[8px] text-rose-600/70 text-center leading-tight">Risque trop élevé</p>
                                  </motion.button>
                                </div>
                              </motion.div>
                            )}

                            {/* 🤝 CO-PILOTE — modal */}
                            {aiMode === 'copilot' && (
                              <motion.div key="feas-copilot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 pt-2 border-t border-white/30 dark:border-slate-800/50">
                                <Button variant="ghost" onClick={() => setStep("concept-validation")} className="rounded-xl font-black text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">← Retour</Button>
                                <motion.div className="flex-1" animate={{ scale: [1, 1.01, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                                  <Button
                                    onClick={() => feasibilityData && setPendingDecision({
                                      stepLabel: 'Analyse de Faisabilité',
                                      decision: `Valider — Score ${feasibilityData.feasibility_score}/100`,
                                      type: 'approve',
                                      impact: `Budget: ${(feasibilityData.cost_dt?.min || 0).toLocaleString()}–${(feasibilityData.cost_dt?.max || 0).toLocaleString()} DT · Risque: ${feasibilityData.risk?.global}`,
                                      alternatives: ['Changer de scénario', 'Revenir au concept'],
                                      onConfirm: () => { setDetailsTab("equipe"); setStep("projet-details") }
                                    })}
                                    disabled={isLoadingFeasibility}
                                    className="w-full bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-6 rounded-2xl font-black uppercase tracking-widest text-sm transition-all duration-500 relative overflow-hidden group flex justify-center items-center"
                                  >
                                    <span className="relative z-10 flex items-center">Définir l'Équipe & Planning <ArrowRight size={18} className="ml-1.5" /></span>
                                  </Button>
                                </motion.div>
                              </motion.div>
                            )}

                            {/* 📴 SILENCIEUX — direct */}
                            {aiMode === 'silent' && (
                              <motion.div key="feas-silent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2 border-t border-white/30 dark:border-slate-800/50">
                                <Button variant="ghost" onClick={() => setStep("concept-validation")} className="h-10 px-3 rounded-xl text-slate-500 dark:text-slate-400 font-black text-[9px] uppercase">← Retour</Button>
                                <div className="flex-1" />
                                <div className="flex items-center gap-1.5 text-[8px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" /> Log auto
                                </div>
                                <Button
                                  disabled={isLoadingFeasibility}
                                  onClick={() => {
                                    logDecision({ step, stepLabel: 'Faisabilité', decision: 'Continuer vers Architecture', reason: '', type: 'approve', impact: `Score: ${feasibilityData?.feasibility_score}/100` })
                                    setDetailsTab("equipe"); setStep("projet-details")
                                  }}
                                  className="h-10 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 transition-all"
                                >
                                  Continuer <ArrowRight size={14} />
                                </Button>
                              </motion.div>
                            )}
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {step === "fonctionnalites" && selectedProject && (
                  <motion.div
                    key="fonctionnalites"
                    variants={fade}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-4 relative overflow-hidden"
                    onMouseMove={handleValidationMouseMove}
                    onMouseLeave={() => setValidationMousePos({ x: -1000, y: -1000 })}
                  >

                    {/* Neon Background Orbs - Breathing Animation */}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, 20, 0], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute top-10 left-10 w-96 h-96 bg-[#00BCD4]/10 rounded-full blur-[100px] pointer-events-none z-0"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], x: [0, -40, 0], y: [0, -30, 0], opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                      className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-rose-400/5 rounded-full blur-[100px] pointer-events-none z-0"
                    />

                    {/* Mouse Tracking Holographic Light */}
                    <motion.div
                      animate={{ x: validationMousePos.x - 200, y: validationMousePos.y - 200 }}
                      transition={{ type: "spring", damping: 40, stiffness: 150, mass: 0.5 }}
                      className="absolute top-0 left-0 w-[400px] h-[400px] bg-gradient-to-r from-[#00BCD4]/20 to-blue-500/10 rounded-full blur-[80px] pointer-events-none z-0 transition-opacity duration-500"
                      style={{ opacity: validationMousePos.x < 0 ? 0 : 1 }}
                    />

                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center shrink-0 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/20 to-transparent" />
                          <Bot size={22} className="text-[#00BCD4] relative z-10" />
                        </div>
                        <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight">Validation Collaborative IA-Manager</h2>
                          <p className="text-[11px] text-[#00BCD4] font-black uppercase tracking-widest mt-0.5">Contrôlez et affinez le planning généré par l'IA</p>
                        </div>
                      </div>
                    </div>

                    {/* ── MANUAL MODE ── */}
                    {taskFillMode === 'manual' && (
                      <motion.div
                        key="task-manual"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="relative z-10 space-y-5"
                      >
                        {/* Header */}
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center shrink-0 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-transparent" />
                            <PenLine size={20} className="text-slate-600 relative z-10" />
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Saisie Manuelle des Tâches</h2>
                            <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Ajoutez vos tâches une par une</p>
                          </div>
                        </div>

                        {/* Add task form */}
                        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Titre <span className="text-rose-500">*</span></label>
                              <input
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[13px] font-bold text-slate-800 focus:outline-none focus:border-[#00BCD4] focus:ring-2 focus:ring-[#00BCD4]/20 bg-slate-50/50"
                                placeholder="Titre de la tâche..."
                                value={manualTaskInput.title}
                                onChange={e => setManualTaskInput(p => ({ ...p, title: e.target.value }))}
                              />
                            </div>
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Description</label>
                              <textarea
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[12px] text-slate-700 focus:outline-none focus:border-[#00BCD4] focus:ring-2 focus:ring-[#00BCD4]/20 resize-none bg-slate-50/50"
                                placeholder="Décrivez la tâche..."
                                value={manualTaskInput.description}
                                onChange={e => setManualTaskInput(p => ({ ...p, description: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Priorité</label>
                              <select
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[12px] font-bold text-slate-700 focus:outline-none focus:border-[#00BCD4] bg-slate-50/50"
                                value={manualTaskInput.priority}
                                onChange={e => setManualTaskInput(p => ({ ...p, priority: e.target.value }))}
                              >
                                <option value="High">Haute</option>
                                <option value="Medium">Moyenne</option>
                                <option value="Low">Basse</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Durée (heures)</label>
                              <input
                                type="number"
                                min={1}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-[12px] font-bold text-slate-700 focus:outline-none focus:border-[#00BCD4] bg-slate-50/50"
                                value={manualTaskInput.duration_hours}
                                onChange={e => setManualTaskInput(p => ({ ...p, duration_hours: parseInt(e.target.value) || 1 }))}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (!manualTaskInput.title.trim()) return
                              const newTask = {
                                id: Date.now().toString(),
                                title: manualTaskInput.title.trim(),
                                description: manualTaskInput.description.trim(),
                                priority: manualTaskInput.priority as "High" | "Medium" | "Low",
                                duration_hours: manualTaskInput.duration_hours,
                                status: 'approved' as const,
                                category: 'Manuel',
                                risk_level: 'Low' as const,
                                reasoning: '',
                                priority_reasoning: '',
                                priority_criteria: [],
                                negotiation_badge: '',
                                negotiation_justification: '',
                                suggested_role: '',
                                required_skills: [],
                                dependencies: [],
                                tools: [],
                                mitigation: '',
                                sprint: 1,
                              }
                              setManagerFeatures(prev => [...prev, newTask])
                              setManualTaskInput({ title: '', description: '', priority: 'Medium', duration_hours: 4 })
                            }}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#00BCD4] to-[#0096a8] text-white font-black text-[11px] uppercase tracking-widest hover:shadow-[0_8px_25px_rgba(0,188,212,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2"
                          >
                            <Plus size={16} /> Ajouter la tâche
                          </button>
                        </div>

                        {/* Task list */}
                        {managerFeatures.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">
                              {managerFeatures.length} tâche{managerFeatures.length > 1 ? 's' : ''} ajoutée{managerFeatures.length > 1 ? 's' : ''}
                            </p>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                              {managerFeatures.map((task, i) => (
                                <div key={task.id || i} className="flex items-center gap-3 p-4 bg-white/80 rounded-2xl border border-slate-100 shadow-sm group">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${task.priority === 'High' ? 'bg-rose-500' : task.priority === 'Medium' ? 'bg-amber-400' : 'bg-[#00BCD4]'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-black text-slate-800 truncate">{task.title}</p>
                                    {task.description && <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{task.description}</p>}
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-400 shrink-0">{task.duration_hours}h</span>
                                  <button
                                    onClick={() => setManagerFeatures(prev => prev.filter((_, idx) => idx !== i))}
                                    className="w-7 h-7 rounded-xl bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Footer actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <button
                            onClick={() => { setTaskFillMode(null); setManagerFeatures([]) }}
                            className="text-[11px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                          >
                            <ChevronLeft size={14} /> Retour
                          </button>
                          <button
                            disabled={managerFeatures.length === 0}
                            onClick={() => {
                              const approved = managerFeatures.filter(t => t.status === 'approved')
                              const updatedProject = { ...selectedProject, tasks: approved } as any
                              setSelectedProject(updatedProject)
                              savePreferences(updatedProject, selectedScenario)
                              
                              const p = updatedProject;
                              const features = approved.map(t => t.title);
                              const weeks = p?.scenarios?.[selectedScenario]?.duration_weeks || 0;
                              const desc = `${p.title || ''} — ${p.description || ''} Stack: ${(p.stack || []).join(", ")}. Fonctionnalités: ${features.join(", ")}. Scénario ${selectedScenario}: ${weeks} semaines. Contraintes: équipe=${constraints.teamSize || "N/A"}, deadline=${constraints.deadline || "N/A"}.${analysisPlan?.enriched_description ? " Contexte tech: " + analysisPlan.enriched_description : ""}`;
                              handleAnalyze(desc);
                            }}
                            className="h-12 px-8 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-2"
                          >
                            Valider le Backlog ({managerFeatures.length}) <ArrowRight size={16} />
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* ── AI MODE ── */}
                    {taskFillMode === 'ai' && (
                      isGeneratingTasks ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-5 relative z-10">
                        <div className="relative">
                          <div className="absolute inset-0 bg-[#00BCD4]/20 blur-xl rounded-full" />
                          <RefreshCw size={48} className="text-[#00BCD4] animate-spin relative z-10" />
                        </div>
                        <div className="text-center">
                          <p className="text-base font-black text-slate-800 animate-pulse">L'IA élabore la stratégie technique détaillée...</p>
                          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Analyse des dépendances et estimation des charges</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative z-10">
                        {/* Review Panel - Light Neon Glassmorphism */}
                        <div className="col-span-12 space-y-4">
                          <div className="flex flex-col lg:flex-row items-center justify-between bg-white/80 backdrop-blur-2xl px-5 py-3 rounded-2xl border border-[#00BCD4]/30 shadow-[0_0_20px_rgba(0,188,212,0.12)] overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00BCD4]/5 blur-[60px] rounded-full pointer-events-none" />

                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto justify-between lg:justify-start">
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] shadow-[0_0_8px_rgba(0,188,212,0.6)]" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Backlog :</span>
                                <span className="text-sm font-black text-slate-800">{managerFeatures.length} tâches</span>
                              </div>
                              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
                              <div className="hidden sm:flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Durée :</span>
                                <span className="text-sm font-black text-slate-800">{Math.round(managerFeatures.reduce((acc, t) => acc + t.duration_hours, 0))}h</span>
                              </div>
                              <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approbation :</span>
                                <span className="text-sm font-black text-emerald-500">{managerFeatures.filter(t => t.status === 'approved').length}/{managerFeatures.length}</span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto shrink-0 relative z-10 mt-3 lg:mt-0">
                              {aiAssignmentsProposed && managerFeatures.some(t => t.ai_proposed) ? (
                                <Button variant="outline" size="sm" onClick={handleAcceptAllAssignments}
                                  className="h-7 px-2.5 text-[9px] font-black rounded-xl transition-all border bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600 hover:shadow-[0_0_12px_rgba(16,185,129,0.4)]">
                                  <CheckCircle size={11} className="mr-1" /> Accepter Toutes
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" onClick={handleAiAssignTasks} disabled={isAiAssigning}
                                  className={`h-7 px-2.5 text-[9px] font-black rounded-xl transition-all border ${isAiAssigning ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' : 'bg-indigo-500 border-indigo-500 text-white hover:bg-indigo-600 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]'}`}>
                                  {isAiAssigning ? (
                                    <><div className="flex gap-1 mr-1.5">{[0, 1, 2].map(d => <div key={d} className="w-1 h-1 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />)}</div> Matching...</>
                                  ) : (
                                    <><Bot size={11} className="mr-1" /> Assigner</>
                                  )}
                                </Button>
                              )}
                              <Button variant="outline" size="sm" onClick={handleFastTrack} disabled={isFastTracking || managerFeatures.filter(t => t.status !== 'approved').length === 0}
                                className={`h-7 px-2.5 text-[9px] font-black rounded-xl transition-all border ${isFastTracking ? 'bg-[#00BCD4]/10 text-[#00BCD4] border-[#00BCD4]/30' : 'bg-white border-[#00BCD4]/40 text-[#00BCD4] hover:bg-[#00BCD4]/10 hover:border-[#00BCD4] hover:shadow-[0_0_12px_rgba(0,188,212,0.3)]'}`}>
                                {isFastTracking ? (
                                  <><div className="flex gap-1 mr-1.5">{[0, 1, 2].map(d => <div key={d} className="w-1 h-1 rounded-full bg-[#00BCD4] animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />)}</div> Analyse...</>
                                ) : (
                                  <><Sparkles size={11} className="mr-1" /> Tout sélectionner</>
                                )}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => generateDetailedTasks(selectedProject, selectedScenario)}
                                className="h-7 px-2.5 text-[9px] font-black border-white/80 rounded-xl bg-white/80 backdrop-blur-md shadow-sm hover:bg-white hover:text-[#00BCD4] hover:border-[#00BCD4]/30 transition-all">
                                <RefreshCw size={11} className="mr-1" /> Régénérer
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[550px] overflow-y-auto pr-2 pb-8 scrollbar-thin scrollbar-thumb-slate-200">
                            {managerFeatures.map((task, i) => {
                              const isApproved = task.status === 'approved'
                              const isRejected = task.status === 'rejected'

                              return (
                                <motion.div
                                  key={task.id || i}
                                  initial={{ opacity: 0, y: 15 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                  className={`group relative p-5 rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden ${isApproved ? "border-emerald-500/20 bg-emerald-50/40 shadow-sm" : isRejected ? "border-rose-200/50 bg-rose-50/30 opacity-60" : "border-white/80 bg-white/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-[#00BCD4]/40 hover:shadow-[0_15px_40px_rgba(0,188,212,0.12)] hover:-translate-y-1"}`}
                                  onClick={() => setSelectedTaskForDetail(task)}
                                >
                                  {isApproved && <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none" />}
                                  {!isApproved && !isRejected && <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />}

                                  <div className="flex flex-col h-full justify-between gap-4 relative z-10">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2.5 mb-2.5">
                                          <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 bg-white border ${task.risk_level === 'High' ? 'border-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.1)]' : 'border-cyan-100 shadow-[0_0_10px_rgba(0,188,212,0.1)]'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${task.risk_level === 'High' ? 'bg-rose-500' : 'bg-[#00BCD4]'}`} />
                                            <span className={`text-[9px] font-black tracking-widest ${task.risk_level === 'High' ? 'text-rose-600' : 'text-[#00BCD4]'}`}>
                                              {task.risk_level === 'High' ? 'RISQUE ÉLEVÉ' : 'SÉCURISÉ'}
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{task.category}</span>
                                        </div>
                                        <h3 className="text-[15px] font-black text-slate-800 leading-snug mb-1.5 group-hover:text-[#00BCD4] transition-colors">{task.title}</h3>
                                        <p className="text-[11px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                          {task.description}
                                        </p>
                                      </div>
                                      <div className="flex flex-col gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button
                                          onClick={() => setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (task.id || task.title) ? { ...t, status: isApproved ? 'pending' : 'approved' } : t))}
                                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isApproved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white border border-slate-100 text-slate-300 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                        >
                                          <Check size={18} strokeWidth={isApproved ? 3 : 2} />
                                        </button>
                                        <button
                                          onClick={() => setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (task.id || task.title) ? { ...t, status: isRejected ? 'pending' : 'rejected' } : t))}
                                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isRejected ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30' : 'bg-white border border-slate-100 text-slate-300 hover:border-rose-400 hover:text-rose-500 hover:bg-rose-50'}`}
                                        >
                                          <X size={18} strokeWidth={isRejected ? 3 : 2} />
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100/60 mt-auto">
                                      <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400">
                                        <div className="flex items-center gap-1.5"><Clock size={14} className={isApproved ? "text-emerald-500" : ""} /> {task.duration_hours}h</div>
                                      </div>
                                      {/* Member assignment UI */}
                                      <div onClick={e => e.stopPropagation()}>
                                        {task.ai_proposed ? (
                                          <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-lg shadow-sm">
                                              <Sparkles size={10} className="text-indigo-500" />
                                              <span className="text-[10px] font-black text-indigo-700 truncate max-w-[90px]">{task.assigned_member_name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <button
                                                onClick={() => setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (task.id || task.title) ? { ...t, ai_proposed: false } : t))}
                                                className="w-6 h-6 rounded-full bg-white border border-emerald-200 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                                              >
                                                <Check size={12} strokeWidth={3} />
                                              </button>
                                              <button
                                                onClick={() => setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (task.id || task.title) ? { ...t, ai_proposed: false, assigned_member_id: undefined, assigned_member_name: undefined } : t))}
                                                className="w-6 h-6 rounded-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                                              >
                                                <X size={12} strokeWidth={3} />
                                              </button>
                                            </div>
                                          </div>
                                        ) : task.is_veille_task || (task.assignees && task.assignees.length > 0) ? (
                                          <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-50 border border-cyan-100 rounded-lg shadow-sm cursor-help" title="Tâche collaborative : Assignée à toute l'équipe">
                                            <Users size={12} className="text-cyan-600" />
                                            <span className="text-[10px] font-black text-cyan-700 uppercase tracking-widest truncate max-w-[100px]">
                                              {task.assignees?.length || 0} membres
                                            </span>
                                          </div>
                                        ) : (
                                          [...(selectedTeamLeader ? [wizardMembers.find(m => m.id === selectedTeamLeader)] : []), ...wizardMembers.filter(m => selectedTeamMembers.includes(m.id))].filter(Boolean).length > 0 ? (
                                            <select
                                              value={task.assigned_member_id || ""}
                                              onChange={e => {
                                                const memberId = e.target.value
                                                const member = wizardMembers.find(m => m.id === memberId)
                                                setManagerFeatures(prev => prev.map(t =>
                                                  (t.id || t.title) === (task.id || task.title)
                                                    ? { ...t, assigned_member_id: memberId, assigned_member_name: member?.full_name || "", ai_proposed: false }
                                                    : t
                                                ))
                                              }}
                                              className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer hover:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all max-w-[130px]"
                                            >
                                              <option value="">👤 Assigner...</option>
                                              {selectedTeamLeader && wizardMembers.find(m => m.id === selectedTeamLeader) && (
                                                <option value={selectedTeamLeader}>
                                                  ⭐ {wizardMembers.find(m => m.id === selectedTeamLeader)?.full_name}
                                                </option>
                                              )}
                                              {wizardMembers.filter(m => selectedTeamMembers.includes(m.id)).map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                              ))}
                                            </select>
                                          ) : (
                                            <span className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              Détails <ChevronRight size={12} />
                                            </span>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Clean Integrated Action Bar */}
                        <div className="pt-6 mt-2 border-t border-slate-100 flex items-center justify-between gap-4">
                          <Button
                            variant="outline"
                            onClick={() => setStep("concept-validation")}
                            className="h-12 px-8 rounded-xl bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2"
                          >
                            <ChevronLeft size={16} /> Retour
                          </Button>

                          <Button
                            disabled={!managerFeatures.some(t => t.status === 'approved')}
                            onClick={() => {
                              const approved = managerFeatures.filter(t => t.status === 'approved')
                              const updatedProject = { ...selectedProject, tasks: approved } as any
                              setSelectedProject(updatedProject)
                              savePreferences(updatedProject, selectedScenario)
                              
                              const p = updatedProject;
                              const features = approved.map(t => t.title);
                              const weeks = p?.scenarios?.[selectedScenario]?.duration_weeks || 0;
                              const desc = `${p.title || ''} — ${p.description || ''} Stack: ${(p.stack || []).join(", ")}. Fonctionnalités: ${features.join(", ")}. Scénario ${selectedScenario}: ${weeks} semaines. Contraintes: équipe=${constraints.teamSize || "N/A"}, deadline=${constraints.deadline || "N/A"}.${analysisPlan?.enriched_description ? " Contexte tech: " + analysisPlan.enriched_description : ""}`;
                              handleAnalyze(desc);
                            }}
                            className="h-14 px-10 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-500 relative overflow-hidden group disabled:opacity-40 disabled:hover:bg-[#00BCD4]/10 disabled:hover:text-[#00BCD4] disabled:hover:shadow-[0_0_20px_rgba(0,188,212,0.2)]"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              Valider le Backlog ({managerFeatures.filter(t => t.status === 'approved').length})
                              <ArrowRight size={16} />
                            </span>
                          </Button>
                        </div>
                      </div>
                    )
                    )}
                  </motion.div>
                )}

                {/* ─── VALIDATION MANAGER ─── */}
                {step === "validation" && selectedProject && (
                  <motion.div key="validation" variants={fade} initial="initial" animate="animate" exit="exit" className="w-full max-w-full px-6 mx-auto space-y-6 pt-2 pb-4 overflow-hidden">

                    {/* Header */}
                    <div className="text-center space-y-1.5 mb-6">
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                        Décision Manager <Sparkles size={18} className="text-[#00BCD4] ml-1" />
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">Le manager reste le seul décideur pour la suite du projet.</p>
                    </div>

                    {/* Project Card */}
                    <div className="rounded-[2rem] bg-white dark:bg-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 sm:p-6 flex flex-col gap-4 border border-slate-100 dark:border-slate-700/50 relative overflow-hidden group/card">

                      {/* Content Container */}
                      <div className="flex-1 flex flex-col gap-4 w-full min-w-0">

                        {/* Top Row: Title + Innovation */}
                        <div className="flex flex-row justify-between items-start gap-4 w-full">
                          {/* Title block */}
                          <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-widest mb-1.5">
                              <Sparkles size={10} /> Projet sélectionné
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-2" title={selectedProject.title}>{selectedProject.title}</h3>
                          </div>

                          {/* Innovation block */}
                          <div className="shrink-0 flex flex-col items-center justify-start w-24 sm:w-28 border-l border-slate-100 dark:border-slate-700/50 pl-4 sm:pl-5 hidden md:flex">
                            <p className="text-[11px] font-bold text-slate-500 mb-2">Innovation</p>
                            <div className="relative w-14 h-14 flex items-center justify-center rounded-full shadow-[0_4px_15px_rgba(0,188,212,0.15)] transition-transform duration-500 group-hover/card:scale-110 group-hover/card:rotate-6" style={{ background: `conic-gradient(#00BCD4 ${selectedProject.innovation_score || 72}%, #f1f5f9 0)` }}>
                              <div className="absolute inset-1.5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center">
                                <span className="text-sm font-black text-slate-900 dark:text-white">{selectedProject.innovation_score || 72}%</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-[#00BCD4] mt-2">Élevée</p>
                          </div>
                        </div>

                        {/* Bottom Row: Stack and Scenario */}
                        <div className="flex flex-col gap-2 w-full">
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-2 flex items-start gap-2 border border-slate-100 dark:border-slate-800/60 w-full transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/80">
                            <Layers size={12} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0 mt-0.5">Stack :</span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                              {selectedProject.stack?.join(", ") || "Unreal Engine 5, Blender 4.x"}
                            </span>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl px-3 py-2 flex items-start gap-2 border border-slate-100 dark:border-slate-800/60 w-full transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/80">
                            <Calendar size={12} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0 mt-0.5">Scénario :</span>
                            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                              balancé ({(selectedProject.scenarios as any)?.[selectedScenario || 'balanced']?.duration_weeks || 8} sem.)
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-blue-500 text-white flex items-center justify-center"><MessageSquare size={12} className="sm:w-[14px] sm:h-[14px]" /></div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-[14px] sm:text-[15px]">Feedback <span className="font-medium text-slate-500">(optionnel)</span></h4>
                        <span className="text-slate-500 dark:text-slate-400 text-[12px] sm:text-[13px] hidden sm:inline">— pour affiner si refus</span>
                      </div>
                      <div className="relative">
                        <div className="absolute top-4 left-4 sm:top-5 sm:left-5 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-400">
                          <MessageSquare size={16} className="sm:w-5 sm:h-5" />
                        </div>
                        <Textarea
                          value={rejectionFeedback}
                          onChange={e => setRejectionFeedback(e.target.value)}
                          placeholder="Ex: Je préfère un projet plus court, ou avec Unreal plutôt qu'Unity..."
                          className="min-h-[100px] sm:min-h-[120px] w-full rounded-[1.5rem] border-2 border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-800/80 focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 text-slate-700 dark:text-slate-200 resize-none pl-16 sm:pl-20 pr-5 sm:pr-6 pt-5 sm:pt-7 pb-6 sm:pb-8 text-[13px] sm:text-[14px] font-medium shadow-[0_4px_20px_rgb(0,0,0,0.03)] placeholder:text-slate-400 transition-all duration-200"
                        />
                        <span className="absolute bottom-4 sm:bottom-5 right-5 sm:right-6 text-[10px] sm:text-[11px] font-bold text-slate-400">{rejectionFeedback.length}/500</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const proceed = () => { setStep("warroom-tech"); if (rejectionFeedback) launchIdeationBackground() }
                          if (aiMode !== 'silent') {
                            setPendingDecision({
                              stepLabel: 'Décision Manager — Refus',
                              decision: `Refuser le projet "${selectedProject?.title}"`,
                              type: 'reject',
                              impact: 'L’IA regénérera de nouvelles propositions basées sur votre feedback',
                              alternatives: ['Approuver avec modifications', 'Modifier le backlog'],
                              onConfirm: proceed
                            })
                          } else {
                            logDecision({ step, stepLabel: 'Décision Manager', decision: `Refuser : "${selectedProject?.title}"`, reason: rejectionFeedback, type: 'reject' })
                            proceed()
                          }
                        }}
                        className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-5 rounded-[1.5rem] border-2 border-red-100 dark:border-red-900/30 bg-red-50/80 dark:bg-red-950/20 hover:bg-red-100/80 transition-all group"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                          <X size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <p className="font-bold text-red-600 text-base sm:text-lg">Refuser</p>
                        <p className="text-[10px] text-slate-500 font-medium text-center max-w-[150px] sm:max-w-[180px]">Nouvelles propositions générées avec le feedback</p>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const proceed = () => { 
                            savePreferences(selectedProject, selectedScenario);
                            const p = selectedProject || {} as any;
                            const approved = managerFeatures.filter(t => t.status === 'approved');
                            const features = approved.map(t => t.title);
                            const weeks = p?.scenarios?.[selectedScenario]?.duration_weeks || 0;
                            const desc = `${p.title || ''} — ${p.description || ''} Stack: ${(p.stack || []).join(", ")}. Fonctionnalités: ${features.join(", ")}. Scénario ${selectedScenario}: ${weeks} semaines. Contraintes: équipe=${constraints.teamSize || "N/A"}, deadline=${constraints.deadline || "N/A"}.${analysisPlan?.enriched_description ? " Contexte tech: " + analysisPlan.enriched_description : ""}`;
                            handleAnalyze(desc);
                          }
                          if (aiMode !== 'silent') {
                            setPendingDecision({
                              stepLabel: 'Décision Manager — Validation Finale',
                              decision: `✅ Valider et lancer le projet "${selectedProject?.title}"`,
                              type: 'approve',
                              impact: `Scénario : ${selectedScenario} · ${managerFeatures.filter(t => t.status === 'approved').length} tâches validées · Prototype en cours`,
                              alternatives: ['Réviser le backlog', 'Changer de projet'],
                              onConfirm: proceed
                            })
                          } else {
                            logDecision({ step, stepLabel: 'Décision Manager', decision: `Valider : "${selectedProject?.title}"`, reason: '', type: 'approve', impact: `Scénario ${selectedScenario}` })
                            proceed()
                          }
                        }}
                        className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 py-4 sm:py-5 rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)] transition-all group relative overflow-hidden"
                      >
                        <div className="absolute top-2 right-4 sm:top-3 sm:right-6 opacity-30"><Sparkles size={40} className="sm:w-[50px] sm:h-[50px] text-white" /></div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform backdrop-blur-md">
                          <Check size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
                        </div>
                        <p className="font-bold text-white text-base sm:text-lg">Valider</p>
                        <p className="text-[10px] text-white/90 font-medium text-center">Générer le prototype final</p>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ─── ÉTAPE 12 : PROTOTYPE FINAL — Brief Visuel Complet ─── */}
                {step === "prototype" && selectedProject && (() => {
                  const p = selectedProject
                  const comp = editComp || comprehensionData
                  const features = managerFeatures.length ? managerFeatures : p.modules || []
                  const deliverables = managerDeliverables.length ? managerDeliverables : p.deliverables || []
                  const scenario = (p.scenarios as any)?.[selectedScenario]
                  const weeks = scenario?.duration_weeks || 12
                  const accentColor = p.complexity === "HIGH" ? "#22d3ee" : p.complexity === "MEDIUM" ? "#00BCD4" : "#2dd4bf"
                  // Dynamic team roles from AI
                  const teamRoles: Array<{ role: string; pct: number }> = p.team_distribution
                    ? Object.entries(p.team_distribution).map(([role, pct]) => ({ role, pct: Number(pct) || 0 }))
                    : [{ role: "Dev", pct: 50 }, { role: "Design", pct: 30 }, { role: "3D/VFX", pct: 20 }]
                  // Dynamic timeline phases from AI
                  const PHASE_COLORS = ["#6366F1", accentColor, "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"]
                  const timelinePhases: Array<{ phase: string; pct: number; w: number; color: string }> = scenario?.timeline && Array.isArray(scenario.timeline)
                    ? scenario.timeline.map((ph: any, i: number) => ({ phase: ph.phase, pct: ph.percentage_start || 0, w: ph.duration_weeks || 1, color: PHASE_COLORS[i % PHASE_COLORS.length] }))
                    : [
                      { phase: "🔍 Analyse & Design", pct: 0, w: Math.round(weeks * 0.15), color: "#6366F1" },
                      { phase: "⚙️ Développement Core", pct: 15, w: Math.round(weeks * 0.40), color: accentColor },
                      { phase: "🎨 Intégration Design", pct: 35, w: Math.round(weeks * 0.25), color: "#F59E0B" },
                      { phase: "🧪 Tests & Validation", pct: 65, w: Math.round(weeks * 0.15), color: "#10B981" },
                      { phase: "🚀 Livraison", pct: 85, w: Math.round(weeks * 0.10), color: "#EF4444" },
                    ]
                  const ROLE_COLORS = [accentColor, "#F59E0B", "#6366F1", "#10B981", "#EF4444", "#EC4899", "#8B5CF6"]

                  return (
                    <motion.div key="prototype" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4 relative">
                      {/* Ambient neon glow */}
                      <div className="absolute -inset-4 pointer-events-none overflow-hidden rounded-3xl">
                        <motion.div className="absolute top-0 left-1/4 w-64 h-32 rounded-full blur-3xl"
                          style={{ background: `radial-gradient(circle, ${accentColor}40, transparent)` }}
                          animate={{ x: [0, 30, 0], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 5, repeat: Infinity }} />
                        <motion.div className="absolute bottom-0 right-1/4 w-48 h-24 rounded-full blur-3xl"
                          style={{ background: 'radial-gradient(circle, #6366f140, transparent)' }}
                          animate={{ x: [0, -20, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} />
                      </div>

                      {/* Header */}
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 relative z-10">
                        <motion.div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
                          animate={{ boxShadow: ['0 0 15px rgba(245,158,11,0.4)', '0 0 30px rgba(245,158,11,0.7)', '0 0 15px rgba(245,158,11,0.4)'] }}
                          transition={{ duration: 2, repeat: Infinity }}>
                          <Trophy size={18} className="text-white" />
                        </motion.div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 dark:text-blue-50 flex items-center gap-2">
                            ÉTAPE 12 — Brief Projet Final
                            <motion.div className="w-1.5 h-1.5 rounded-full bg-amber-400"
                              animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} />
                          </h2>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Rendu exploitable · Prêt pour l'équipe technique</p>
                        </div>
                      </motion.div>

                      {/* ── TIMELINE GANTT ── */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="rounded-2xl overflow-hidden relative z-10"
                        style={{ border: `1px solid ${accentColor}30`, boxShadow: `0 0 20px ${accentColor}10, 0 4px 20px rgba(0,0,0,0.05)` }}>
                        <motion.div className="absolute top-0 left-0 right-0 h-[2px] z-10"
                          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
                          animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                        <motion.div className="absolute inset-0 pointer-events-none"
                          style={{ background: `linear-gradient(90deg, transparent, ${accentColor}05, transparent)` }}
                          animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                        <div className="bg-white/80 px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: `${accentColor}20` }}>
                          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }}
                            animate={{ scale: [1, 1.5, 1], boxShadow: [`0 0 4px ${accentColor}`, `0 0 10px ${accentColor}`, `0 0 4px ${accentColor}`] }}
                            transition={{ duration: 1.5, repeat: Infinity }} />
                          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Timeline — Scénario {selectedScenario} ({weeks} semaines)</span>
                        </div>
                        <div className="p-4 space-y-2.5 bg-white/60">
                          {timelinePhases.map((ph, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }} className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-slate-500 w-36 shrink-0 text-right">{ph.phase}</span>
                              <div className="flex-1 h-5 bg-slate-100/80 rounded-full relative overflow-hidden">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(ph.w / weeks) * 100}%` }}
                                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: "easeOut" }}
                                  className="h-full rounded-full absolute top-0 flex items-center justify-end pr-2 overflow-hidden"
                                  style={{ left: `${ph.pct}%`, background: `linear-gradient(90deg, ${ph.color}99, ${ph.color})`, boxShadow: `0 0 8px ${ph.color}66` }}>
                                  <motion.div className="absolute inset-y-0 w-6 rounded-full"
                                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                                    animate={{ x: ['-200%', '400%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', delay: i * 0.3 }} />
                                  <span className="text-[8px] font-black text-white relative z-10">{ph.w}sem</span>
                                </motion.div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* ── ÉQUIPE + STACK ── */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3 relative z-10">
                        <div className="rounded-2xl p-4 relative overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,188,212,0.2)', boxShadow: '0 0 15px rgba(0,188,212,0.07)' }}>
                          <motion.div className="absolute top-0 left-0 right-0 h-[1.5px]"
                            style={{ background: 'linear-gradient(90deg, transparent, #00BCD4, transparent)' }}
                            animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity }} />
                          <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-[#00BCD4]">👥 Répartition équipe</p>
                          {teamRoles.map((t, i) => {
                            const roleColor = ROLE_COLORS[i % ROLE_COLORS.length]
                            return (
                              <div key={i} className="mb-2.5">
                                <div className="flex justify-between mb-1">
                                  <span className="text-[9px] font-black text-slate-600">{t.role}</span>
                                  <motion.span className="text-[9px] font-black" style={{ color: roleColor }}
                                    animate={{ textShadow: [`0 0 4px ${roleColor}60`, `0 0 10px ${roleColor}`, `0 0 4px ${roleColor}60`] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>{t.pct}%</motion.span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${t.pct}%` }}
                                    transition={{ delay: 0.3 + i * 0.1, duration: 0.7, ease: 'easeOut' }}
                                    className="h-full rounded-full relative overflow-hidden"
                                    style={{ background: `linear-gradient(90deg, ${roleColor}88, ${roleColor})`, boxShadow: `0 0 6px ${roleColor}66` }}>
                                    <motion.div className="absolute inset-y-0 w-4"
                                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }}
                                      animate={{ x: ['-100%', '400%'] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: i * 0.5 }} />
                                  </motion.div>
                                </div>
                              </div>
                            )
                          })}
                          {constraints.teamSize && <p className="text-[9px] text-slate-400 mt-1">Taille: {constraints.teamSize}</p>}
                        </div>
                        <div className="rounded-2xl p-4 relative overflow-hidden"
                          style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 15px rgba(99,102,241,0.07)' }}>
                          <motion.div className="absolute top-0 left-0 right-0 h-[1.5px]"
                            style={{ background: 'linear-gradient(90deg, transparent, #6366f1, transparent)' }}
                            animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }} />
                          <p className="text-[9px] font-black uppercase tracking-widest mb-3 text-indigo-500">⚙️ Stack technique</p>
                          <div className="flex flex-wrap gap-1.5">
                            {p.stack?.map((s, i) => (
                              <motion.span key={i} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 + i * 0.06, type: 'spring', stiffness: 200 }}
                                whileHover={{ scale: 1.08, y: -1 }}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-black text-white"
                                style={{
                                  background: i % 3 === 0 ? `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` : i % 3 === 1 ? 'linear-gradient(135deg, #6366f1cc, #6366f1)' : 'linear-gradient(135deg, #f59e0bcc, #f59e0b)',
                                  boxShadow: i % 3 === 0 ? `0 0 8px ${accentColor}60` : i % 3 === 1 ? '0 0 8px rgba(99,102,241,0.5)' : '0 0 8px rgba(245,158,11,0.5)'
                                }}>{s}</motion.span>
                            ))}
                          </div>
                          {constraints.deadline && <p className="text-[9px] font-black text-blue-500 mt-3">📅 {constraints.deadline}</p>}
                        </div>
                      </motion.div>

                      {/* ── DELIVERABLES ── */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="rounded-2xl p-4 relative overflow-hidden z-10"
                        style={{ background: 'linear-gradient(135deg, rgba(236,253,245,0.9), rgba(255,255,255,0.95))', border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }}>
                        <motion.div className="absolute top-0 left-0 right-0 h-[1.5px]"
                          style={{ background: 'linear-gradient(90deg, transparent, #10b981, transparent)' }}
                          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                        <motion.div className="absolute inset-0 pointer-events-none"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.04), transparent)' }}
                          animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }} />
                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-1.5 relative z-10">
                          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>✅</motion.span> Livrables attendus
                        </p>
                        <div className="grid grid-cols-2 gap-2 relative z-10">
                          {deliverables.map((d, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 + i * 0.07 }} className="flex items-center gap-2">
                              <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                              <span className="text-[10px] font-bold text-slate-600 dark:text-blue-300">{d}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Action finale */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex gap-3 pt-1 relative z-10">
                        <Button variant="ghost" onClick={() => setStep("fonctionnalites")} className="rounded-xl font-black text-slate-400 hover:text-slate-600">← Retour</Button>
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16,185,129,0.5), 0 0 60px rgba(16,185,129,0.2)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            const desc = `${p.title} — ${p.description} Stack: ${p.stack?.join(", ")}. Fonctionnalités: ${features.join(", ")}. Scénario ${selectedScenario}: ${weeks} semaines. Contraintes: équipe=${constraints.teamSize || "N/A"}, deadline=${constraints.deadline || "N/A"}.${analysisPlan?.enriched_description ? " Contexte tech: " + analysisPlan.enriched_description : ""}`
                            handleAnalyze(desc)
                          }}
                          className="flex-1 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 relative overflow-hidden"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
                          <motion.div className="absolute inset-0 pointer-events-none"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                            animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                          <Sparkles size={16} className="relative z-10" />
                          <span className="relative z-10">Créer le Projet & Générer les Tâches</span>
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  )
                })()}

                {/* ─── CO-PILOT BRAINSTORMING (Turn-based chat) ─── */}
                {step === "warroom-agents" && (
                  <motion.div key="warroom-agents" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">

                    {/* ── HEADER ── */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)] shrink-0">
                          <Bot size={16} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 dark:text-blue-50">Co-Pilote IA — Brainstorming</h2>
                          <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest">
                            {copilotSession ? `Idée ${copilotSession.currentIdeaIndex} sur 3 · ${copilotSession.conversationStep === 'FINAL_RANKING' ? 'Classement Final' : copilotMode === 'creative' ? '✨ Mode Créatif' : '🔥 Mode Critique'}` : 'Initialisation...'}
                          </p>
                        </div>
                      </div>
                      {/* Progress dots */}
                      {copilotSession && (
                        <div className="flex gap-2">
                          {[1, 2, 3].map(n => (
                            <div key={n} className={`w-2.5 h-2.5 rounded-full transition-all ${n < copilotSession.currentIdeaIndex ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' :
                              n === copilotSession.currentIdeaIndex ? 'bg-cyan-400 animate-pulse' : 'bg-slate-200 dark:bg-slate-700'
                              }`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ── LOADING STATE ── */}
                    {isStartingCopilot && (
                      <div className="flex flex-col items-center py-12 space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-cyan-200 border-t-cyan-400 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center"><Bot size={22} className="text-cyan-500" /></div>
                        </div>
                        <p className="font-black text-slate-600 dark:text-slate-300 animate-pulse text-sm">Génération de la première idée...</p>
                      </div>
                    )}


                    {/* ── CHAT FEED ── */}
                    {!isStartingCopilot && copilotSession && copilotSession.conversationStep !== 'FINAL_RANKING' && (
                      <div ref={copilotChatRef} className="space-y-3 max-h-[380px] overflow-y-auto pr-2 scroll-smooth">
                        <AnimatePresence initial={false}>
                          {copilotSession.feedbackHistory?.map((msg: any, i: number) => {
                            const isAI = msg.role === 'AI_IDEA' || msg.role === 'AI_CRITIQUE'
                            const isManager = msg.role === 'MANAGER'
                            const isSystem = msg.role === 'SYSTEM'
                            return (
                              <motion.div
                                key={msg.id || i}
                                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.35 }}
                                className={`flex gap-3 items-start ${isManager ? 'flex-row-reverse' : ''}`}
                              >
                                {/* Avatar */}
                                {/* Avatar */}
                                {!isSystem && (
                                  isManager ? (
                                    <img
                                      src="/manager.webp"
                                      alt="Samia Chalbi"
                                      className="w-8 h-8 rounded-xl object-cover shrink-0 shadow-sm border border-sky-300/30"
                                    />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'AI_IDEA' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' :
                                      'bg-gradient-to-br from-indigo-400 to-indigo-600'
                                      }`}>
                                      <Bot size={14} className="text-white" />
                                    </div>
                                  )
                                )}
                                {/* Bubble */}
                                <div className={`flex-1 max-w-[85%] ${isSystem ? 'mx-auto' : ''}`}>
                                  {!isSystem && (
                                    <div className={`flex items-center gap-2 mb-1 ${isManager ? 'justify-end' : 'justify-start'}`}>
                                      <p className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'AI_IDEA' ? 'text-cyan-500' :
                                        msg.role === 'AI_CRITIQUE' ? 'text-indigo-500' :
                                          'text-sky-500 text-right dark:text-sky-400'
                                        }`}>
                                        {msg.role === 'AI_IDEA' ? `💡 IA — Idée ${copilotSession.currentIdeaIndex}/3` :
                                          msg.role === 'AI_CRITIQUE' ? '🤖 IA — Analyse' : '👩 Samia Chalbi'}
                                      </p>
                                      {(msg.role === 'AI_IDEA' || msg.role === 'AI_CRITIQUE') && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleVoiceToggle(`msg-${i}`, msg.content);
                                          }}
                                          className={`text-sm transition-all duration-200 hover:scale-125 focus:outline-none ${(voiceStates[`msg-${i}`] || 'idle') === 'playing'
                                            ? 'animate-pulse drop-shadow-[0_0_6px_rgba(34,211,238,0.8)] text-cyan-400'
                                            : 'text-slate-400 hover:text-cyan-500'
                                            }`}
                                          title={{
                                            idle: lang === 'fr' ? 'Lire le message' : 'Read message',
                                            playing: lang === 'fr' ? 'Mettre en pause' : 'Pause',
                                            paused: lang === 'fr' ? 'Reprendre la lecture' : 'Resume',
                                            ended: lang === 'fr' ? 'Réécouter' : 'Replay',
                                          }[voiceStates[`msg-${i}`] || 'idle']}
                                        >
                                          {getVoiceIcon(voiceStates[`msg-${i}`] || 'idle')}
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${isSystem
                                    ? 'bg-white/30 dark:bg-slate-800/50 backdrop-blur-md border border-white/40 text-slate-600 dark:text-slate-300 text-center text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full'
                                    : isManager
                                      ? 'bg-white/50 backdrop-blur-xl border border-white/60 text-slate-800 dark:bg-sky-950/40 dark:border-sky-800/30 dark:text-sky-100 rounded-tr-sm shadow-[0_4px_12px_rgba(56,189,248,0.15)]'
                                      : msg.role === 'AI_IDEA'
                                        ? 'bg-white/60 backdrop-blur-xl border border-white/60 text-slate-800 dark:bg-cyan-900/20 dark:border-cyan-800/30 dark:text-slate-200 rounded-tl-sm shadow-[0_4px_12px_rgba(0,229,255,0.1)]'
                                        : 'bg-white/50 backdrop-blur-xl border border-white/60 text-slate-800 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300 rounded-tl-sm shadow-sm'
                                    }`}>

                                    {msg.content.replace(/\*\*(.*?)\*\*/g, '$1')}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>

                        {/* Typing indicator */}
                        {isSubmittingFeedback && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center px-4 py-3 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-2xl border border-cyan-100 dark:border-cyan-800/20">
                            <Bot size={14} className="text-cyan-500 shrink-0" />
                            <div className="flex gap-1">
                              {[0, 1, 2].map(i => <motion.div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
                            </div>
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">L'IA analyse...</span>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ── VOICE SHORTCUT FLASH ── */}
                    <AnimatePresence>
                      {detectedShortcut && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="relative flex flex-col items-center justify-center gap-3 py-6 px-4 rounded-2xl mt-2 overflow-hidden"
                          style={detectedShortcut === '⏭ Idée suivante' ? {
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))',
                            border: '1.5px solid rgba(245,158,11,0.5)',
                            boxShadow: '0 0 40px rgba(245,158,11,0.2), inset 0 0 30px rgba(245,158,11,0.05)'
                          } : {
                            background: 'linear-gradient(135deg, rgba(0,188,212,0.12), rgba(0,188,212,0.06))',
                            border: '1.5px solid rgba(0,188,212,0.5)',
                            boxShadow: '0 0 40px rgba(0,188,212,0.25), inset 0 0 30px rgba(0,188,212,0.05)'
                          }}
                        >
                          {/* Glow ring */}
                          <motion.div
                            className="absolute inset-0 rounded-2xl"
                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            style={detectedShortcut === '⏭ Idée suivante'
                              ? { background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.15) 0%, transparent 70%)' }
                              : { background: 'radial-gradient(ellipse at center, rgba(0,188,212,0.15) 0%, transparent 70%)' }
                            }
                          />
                          {/* Icon */}
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                            className="relative z-10 w-14 h-14 rounded-full flex items-center justify-center"
                            style={detectedShortcut === '⏭ Idée suivante'
                              ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 25px rgba(245,158,11,0.6)' }
                              : { background: 'linear-gradient(135deg, #00BCD4, #00ACC1)', boxShadow: '0 0 25px rgba(0,188,212,0.6)' }
                            }
                          >
                            {detectedShortcut === '⏭ Idée suivante'
                              ? <ChevronRight size={28} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                              : <Check size={28} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                            }
                          </motion.div>
                          {/* Text */}
                          <div className="relative z-10 text-center space-y-1">
                            <motion.p
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="text-base font-black uppercase tracking-widest"
                              style={detectedShortcut === '⏭ Idée suivante'
                                ? { color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.5))' }
                                : { color: '#00BCD4', filter: 'drop-shadow(0 0 10px rgba(0,188,212,0.5))' }
                              }
                            >
                              {detectedShortcut === '⏭ Idée suivante'
                                ? '⏭ Idée rejetée — on passe à la suivante'
                                : '✅ Le Manager a approuvé l\'idée'
                              }
                            </motion.p>
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.35 }}
                              className="text-[10px] font-bold uppercase tracking-[0.2em]"
                              style={detectedShortcut === '⏭ Idée suivante'
                                ? { color: 'rgba(245,158,11,0.7)' }
                                : { color: 'rgba(0,188,212,0.7)' }
                              }
                            >
                              {detectedShortcut === '⏭ Idée suivante'
                                ? 'Chargement de la prochaine proposition…'
                                : 'Passage à l\'étape suivante…'
                              }
                            </motion.p>
                          </div>
                          {/* Particles */}
                          {[...Array(6)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-1.5 h-1.5 rounded-full"
                              style={{ background: detectedShortcut === '⏭ Idée suivante' ? '#f59e0b' : '#00BCD4' }}
                              initial={{ opacity: 0, x: 0, y: 0 }}
                              animate={{
                                opacity: [0, 1, 0],
                                x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 10)],
                                y: [0, -30 - i * 8],
                              }}
                              transition={{ delay: 0.15 + i * 0.05, duration: 0.8 }}
                            />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── REFORMULATION PANEL ── */}
                    <AnimatePresence>
                      {showReformulation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 rounded-2xl overflow-hidden"
                          style={{ border: '1px solid rgba(129,140,248,0.4)', background: 'linear-gradient(135deg,rgba(129,140,248,0.06),rgba(34,211,238,0.04))' }}
                        >
                          <div className="px-4 pt-3 pb-1 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm">✨</span>
                            <span className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em]">Reformulateur Jarvis</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {/* Original */}
                            <div className="px-3 py-2 rounded-xl bg-slate-100/60 dark:bg-slate-800/40">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Vous avez dit :</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 italic">"{originalVoiceText}"</p>
                            </div>
                            {/* Reformulated */}
                            <div className="px-3 py-2 rounded-xl" style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.25)' }}>
                              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1">✨ Version professionnelle :</p>
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">"{reformulatedText}"</p>
                            </div>
                            {/* Action buttons */}
                            <div className="flex gap-2 pt-1">
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                  setCopilotInput(reformulatedText)
                                  setShowReformulation(false)
                                }}
                                className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white"
                                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', boxShadow: '0 0 12px rgba(139,92,246,0.35)' }}
                              >
                                ✨ Envoyer reformulé
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setShowReformulation(false)}
                                className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
                              >
                                Envoyer tel quel
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ── MANAGER INPUT ── */}
                    {copilotSession && copilotSession.conversationStep === 'WAITING_FEEDBACK' && !isSubmittingFeedback && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-4">
                        <div className="relative flex items-end w-full p-2 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-inner focus-within:border-cyan-400/50 focus-within:ring-4 focus-within:ring-cyan-400/10 transition-all duration-300">
                          <Textarea
                            value={copilotInput}
                            onChange={e => setCopilotInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCopilotFeedback() } }}
                            placeholder="Répondez librement... critiques, questions, améliorations"
                            rows={1}
                            className="flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 min-h-[44px] h-[44px] max-h-[150px] py-3 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] no-scrollbar"
                          />
                          <div className="flex items-center gap-2 pr-2 pb-1.5 shrink-0">
                            <button
                              onClick={startCopilotVoice}
                              className={`p-2.5 rounded-full transition-all flex items-center justify-center ${isListeningCopilot ? 'bg-rose-500 text-white animate-pulse shadow-md' : 'bg-white dark:bg-slate-700 text-slate-500 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 shadow-sm border border-slate-200 dark:border-slate-600'}`}
                              title="Parler"
                            >
                              <Mic size={18} />
                            </button>
                            <button
                              onClick={submitCopilotFeedback}
                              disabled={!copilotInput.trim()}
                              className="p-2.5 rounded-full transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-500 hover:bg-cyan-400 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                            >
                              <Send size={18} className={copilotInput.trim() ? "translate-x-0.5" : ""} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── NAVIGATION: Next idea or Finalize ── */}
                    {copilotSession && copilotSession.conversationStep === 'WAITING_CONTINUE_OR_NEXT' && !isSubmittingFeedback && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                        {copilotSession.currentIdeaIndex < 3 ? (
                          <div className="flex-1">
                            <Button
                              onClick={nextCopilotIdea}
                              className={`w-full py-6 rounded-2xl font-black text-lg transition-all duration-500 relative z-10 ${theme === 'dark'
                                ? "bg-blue-600/10 border border-blue-400/50 hover:bg-blue-600 text-blue-400 hover:text-white shadow-[0_0_25px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
                                : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)]"
                                }`}
                            >
                              Idée Suivante ({copilotSession.currentIdeaIndex + 1}/3) <ArrowRight size={20} className="ml-2" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex-1">
                            <Button
                              onClick={finalizeCopilot}
                              className={`w-full py-6 rounded-2xl font-black text-lg transition-all duration-500 relative z-10 ${theme === 'dark'
                                ? "bg-blue-600/10 border border-blue-400/50 hover:bg-blue-600 text-blue-400 hover:text-white shadow-[0_0_25px_rgba(37,99,235,0.3)] hover:shadow-[0_0_40px_rgba(37,99,235,0.6)]"
                                : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)]"
                                }`}
                            >
                              <Trophy size={20} className="mr-2" /> Voir le Classement Final
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ── FOOTER ── */}
                    <div className="flex justify-between items-center pt-1">
                      <Button variant="ghost" onClick={() => { setCopilotSession(null); setStep("warroom-input") }} className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
                        ← Recommencer
                      </Button>
                    </div>


                  </motion.div>
                )}

                {/* ─── WAR ROOM PICK IDEA (ITERATIVE WAVES OR COPILOT) ─── */}
                {step === "warroom-pick" && (
                  <>
                    {copilotSession?.ranking ? (
                      <>
                        {/* ── FINAL RANKING ── */}
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">🏆 Classement Final — Décision Manager</p>
                          {copilotSession.ranking.map((r: any) => (
                            <motion.div
                              key={r.rank}
                              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: r.rank * 0.1 }}
                              onClick={() => {
                                setSelectedIdea({ id: r.rank, title: r.title, description: r.description, score: r.confidence })
                                setRawIdea(r.title + " — " + r.description)
                                setStep("warroom-params")
                              }}
                              className={`w-full cursor-pointer text-left p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${r.rank === 1 ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 hover:shadow-amber-200' :
                                r.rank === 2 ? 'border-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:shadow-slate-200' :
                                  'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10 hover:shadow-orange-200'
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-lg">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-black ${r.rank === 1 ? 'text-amber-600' : r.rank === 2 ? 'text-slate-500' : 'text-orange-500'}`}>{r.confidence}%</span>
                                  {/* Info button — opens AI Score Audit modal */}
                                  <button
                                    onClick={(e) => openScoreAudit(e, r)}
                                    className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:border-cyan-400 transition-all"
                                    title="Voir le détail du score"
                                  >
                                    <span className="text-[9px] font-black leading-none">i</span>
                                  </button>
                                </div>
                              </div>
                              <p className="font-black text-slate-800 dark:text-white text-sm">{r.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.verdict}</p>
                              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-2">→ Sélectionner cette idée</p>
                            </motion.div>
                          ))}
                        </motion.div>

                        {/* ── AI SCORE AUDIT MODAL ── */}
                        <AnimatePresence>
                          {scoreInfoOpen !== null && (() => {
                            const r = copilotSession?.ranking?.find((x: any) => x.rank === scoreInfoOpen)
                            if (!r) return null
                            return (
                              <motion.div
                                key="score-audit-modal"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                                onClick={() => setScoreInfoOpen(null)}
                              >
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.92, y: 20 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.92, y: 20 }}
                                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                                  className="relative w-full max-w-4xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl rounded-3xl border border-cyan-400/50 shadow-[0_0_50px_rgba(34,211,238,0.4)] group"
                                  onClick={e => e.stopPropagation()}
                                >
                                  {/* Close Button - Fixed to top right */}
                                  <button
                                    onClick={() => setScoreInfoOpen(null)}
                                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:border-rose-400 hover:bg-rose-500 transition-all z-30 bg-white dark:bg-slate-900 shadow-xl"
                                  >
                                    <X size={14} />
                                  </button>

                                  {/* Scrollable Container */}
                                  <div className="relative z-10 w-full max-h-[85vh] overflow-y-auto overflow-x-hidden p-5 md:p-6 rounded-3xl scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-cyan-500/60 [&::-webkit-scrollbar-thumb]:rounded-full">

                                    <div className="flex flex-col md:flex-row gap-5">
                                      {/* Left Column: Info & Summary */}
                                      <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                          {/* Title */}
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                                              <Sparkles size={10} className="text-cyan-500" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
                                              AUDIT <span className="text-slate-800 dark:text-white">IA</span>
                                            </p>
                                          </div>

                                          {/* Idea header */}
                                          <div className="bg-slate-50 dark:bg-slate-900/80 rounded-2xl p-4 mb-4 border-l-4 border-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.05)] relative overflow-hidden group-hover:border-cyan-300 transition-colors">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/10 blur-3xl rounded-full" />
                                            <div className="relative z-10 flex flex-col gap-2">
                                              <div>
                                                <p className="font-black text-slate-800 dark:text-white text-sm leading-tight">{r.title}</p>
                                                <p className="text-[9px] text-cyan-500 font-black uppercase tracking-widest mt-0.5">● Brainstorming SMA</p>
                                              </div>
                                              <div className="flex items-end gap-2 mt-1">
                                                <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">{r.confidence}<span className="text-sm text-slate-400">%</span></p>
                                                <p className="text-[9px] font-black text-emerald-500 mb-0.5 drop-shadow-[0_0_3px_rgba(16,185,129,0.5)]">● VALIDÉ</p>
                                              </div>
                                            </div>
                                          </div>

                                          {isLoadingAudit ? (
                                            <div className="flex flex-col items-center py-6 gap-3">
                                              <div className="relative">
                                                <div className="w-10 h-10 rounded-full border-4 border-cyan-100 dark:border-cyan-900 border-t-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <Bot size={14} className="text-cyan-500" />
                                                </div>
                                              </div>
                                              <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-widest animate-pulse">Analyse en cours...</p>
                                            </div>
                                          ) : scoreAuditData ? (
                                            <>
                                              {/* Formula */}
                                              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                                <Bot size={12} className="text-cyan-500 shrink-0 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)]" />
                                                <code className="text-[9px] text-slate-500 dark:text-slate-400 font-mono font-bold leading-none">{scoreAuditData.formula}</code>
                                              </div>

                                              {/* Summary */}
                                              <div className="relative mt-2">
                                                <Quote size={16} className="text-cyan-200 dark:text-cyan-900 absolute -top-1 -left-2 rotate-180" />
                                                <p className="text-[10px] text-slate-600 dark:text-slate-300 italic leading-snug pl-3 relative z-10 font-medium">
                                                  {scoreAuditData.summary}
                                                </p>
                                              </div>
                                            </>
                                          ) : null}
                                        </div>

                                        {/* Close button at bottom left */}
                                        <div className="mt-5">
                                          <button
                                            onClick={() => setScoreInfoOpen(null)}
                                            className="w-full bg-slate-900 hover:bg-cyan-500 dark:bg-slate-800 dark:hover:bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/50 hover:-translate-y-0.5"
                                          >
                                            <CheckCircle size={14} /> Fermer l'Audit
                                          </button>
                                        </div>
                                      </div>

                                      {/* Right Column: Criteria breakdown */}
                                      {(!isLoadingAudit && scoreAuditData) && (
                                        <div className="flex-1 flex flex-col gap-3">
                                          {scoreAuditData.breakdown?.map((c: any, idx: number) => {
                                            const colors: Record<string, { bar: string, text: string, bg: string, border: string }> = {
                                              'Innovation': { bar: 'bg-gradient-to-r from-cyan-400 to-teal-400', text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50/70 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800/50' },
                                              'Faisabilité': { bar: 'bg-gradient-to-r from-indigo-400 to-purple-400', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/70 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800/50' },
                                              'Impact': { bar: 'bg-gradient-to-r from-emerald-400 to-green-400', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800/50' },
                                              'Cohérence': { bar: 'bg-gradient-to-r from-amber-400 to-orange-400', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800/50' },
                                            }
                                            const cfg = colors[c.criterion] || { bar: 'bg-cyan-400', text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100' }

                                            return (
                                              <motion.div
                                                key={c.criterion}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className={`rounded-xl p-3 border transition-all hover:shadow-lg ${cfg.bg} ${cfg.border} hover:-translate-y-0.5`}
                                              >
                                                <div className="flex items-center justify-between mb-2">
                                                  <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 drop-shadow-sm">{c.criterion}</p>
                                                    <p className={`text-[9px] font-bold mt-0.5 ${cfg.text}`}>{c.weight}</p>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner hidden sm:block">
                                                      <motion.div
                                                        className={`h-full rounded-full ${cfg.bar}`}
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${c.score}%` }}
                                                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 + idx * 0.1 }}
                                                      />
                                                    </div>
                                                    <span className={`text-sm font-black ${cfg.text} drop-shadow-sm`}>{c.score}<span className="text-[9px] opacity-60">%</span></span>
                                                  </div>
                                                </div>
                                                <p className="text-[10px] text-slate-600 dark:text-slate-300/90 leading-tight font-medium">{c.justification}</p>
                                              </motion.div>
                                            )
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )
                          })()}
                        </AnimatePresence>
                      </>
                    ) : (
                      <motion.div key="warroom-pick" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0">
                              <Waves size={20} className="text-white" />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-slate-900 dark:text-white">Vague d'Idéation #{waveIteration}</h2>
                              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-widest">3 concepts proposés · Réagissez pour affiner</p>
                            </div>
                          </div>
                          {waveIteration > 1 && (
                            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
                              Cycle Itératif
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {topIdeas.map((idea, i) => {
                            const isStarred = starredIdeaId === String(idea.id);
                            const isSelected = selectedIdea?.id === idea.id;
                            return (
                              <motion.div
                                key={idea.id}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${isStarred ? "border-amber-400 bg-amber-50/30 dark:bg-amber-900/10 shadow-[0_0_20px_rgba(251,191,36,0.1)]" : isSelected ? "border-[#00BCD4] bg-cyan-50/30 dark:bg-cyan-900/10" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700"}`}
                              >
                                {isStarred && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-400/10 blur-2xl rounded-full" />}

                                <div className="flex items-start justify-between gap-4 relative z-10 cursor-pointer" onClick={() => setSelectedIdea(idea)}>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-base font-black text-slate-800 dark:text-white">{idea.title}</p>
                                      {isStarred && <Star size={14} className="text-amber-500 fill-amber-500" />}
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-4">{idea.description}</p>
                                  </div>

                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${i === 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : i === 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>{idea.score}% Innovation</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setStarredIdeaId(isStarred ? null : String(idea.id)) }}
                                      className={`p-2 rounded-xl transition-all ${isStarred ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:bg-slate-800 dark:hover:bg-amber-900/30'}`}
                                      title="Garder comme fil conducteur"
                                    >
                                      <Star size={16} className={isStarred ? 'fill-current' : ''} />
                                    </button>
                                  </div>
                                </div>

                                {/* Interactive Reaction Panel */}
                                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 relative z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Feedback : L'idée "${idea.title}" est excellente. Gardez cet esprit et approfondissez.`);
                                      if (isStarred) setRawIdea(prev => prev + ` (NOTE: Cette idée est le FAVORI).`);
                                      setWaveIteration(prev => prev + 1);
                                      launchWarRoom();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    <CheckCircle2 size={12} /> J'aime
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Feedback : L'idée "${idea.title}" doit être améliorée. Proposez une version alternative plus forte.`);
                                      setWaveIteration(prev => prev + 1);
                                      launchWarRoom();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 dark:text-amber-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    <RefreshCw size={12} /> À améliorer
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Feedback : J'aime la piste "${idea.title}". Explorez des variantes très proches et déclinez ce concept.`);
                                      setWaveIteration(prev => prev + 1);
                                      launchWarRoom();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    <Search size={12} /> Variantes
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Feedback : Rejetez catégoriquement l'idée "${idea.title}". Proposez quelque chose de complètement différent.`);
                                      setWaveIteration(prev => prev + 1);
                                      launchWarRoom();
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                                  >
                                    <X size={12} /> Rejeter
                                  </button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>

                        {/* Demande Ciblée Globale */}
                        <div className="mt-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 shadow-inner">
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={16} className="text-indigo-500" />
                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Demande ciblée globale</p>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={waveFeedback}
                              onChange={e => setWaveFeedback(e.target.value)}
                              placeholder="Ex: 'Donnez-moi des idées plus simples', 'Moins cher', 'Axé mobile'..."
                              className="flex-1 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm shadow-sm"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && waveFeedback.trim()) {
                                  setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Directive Générale : ${waveFeedback}`);
                                  setWaveIteration(prev => prev + 1);
                                  setWaveFeedback("");
                                  launchWarRoom();
                                }
                              }}
                            />
                            <Button
                              disabled={!waveFeedback.trim()}
                              onClick={() => {
                                setRawIdea(prev => prev + `\n\n[Vague ${waveIteration + 1}] Directive Générale : ${waveFeedback}`);
                                setWaveIteration(prev => prev + 1);
                                setWaveFeedback("");
                                launchWarRoom();
                              }}
                              className="h-12 px-6 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl shadow-md font-black uppercase tracking-widest text-[10px]"
                            >
                              <Zap size={14} className="mr-2" /> Générer
                            </Button>
                          </div>
                        </div>

                        {/* Actions Finales */}
                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <Button variant="ghost" onClick={() => { setWaveIteration(1); setStep("warroom-input"); }} className="rounded-xl font-black text-slate-400 dark:text-slate-500 hover:text-slate-600">{lang === 'fr' ? 'Recommencer à zéro' : 'Restart'}</Button>
                          <Button
                            disabled={!selectedIdea}
                            onClick={() => setStep("warroom-params")}
                            className="flex-1 bg-gradient-to-r from-[#00BCD4] to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-6 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-cyan-400/20"
                          >
                            <CheckCircle2 size={16} className="mr-2" /> {lang === 'fr' ? 'Valider cette orientation finale' : 'Validate this final direction'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}

                {/* ─── WAR ROOM PARAMS + GENERATE ─── */}
                {step === "warroom-params" && (
                  <motion.div key="warroom-params" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                        <Sparkles size={16} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                      </div>
                      <div>
                        <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-500 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">Paramètres du projet</h2>
                        <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Dernière étape avant génération IA</p>
                      </div>
                    </div>

                    {selectedIdea && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-2xl bg-cyan-500/10 border border-cyan-400/40 p-4 relative overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.05)]"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/20 blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">Orientation sélectionnée ✓</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{selectedIdea.title}</p>
                        <p className="text-xs text-slate-700 dark:text-cyan-50 font-semibold mt-1 leading-relaxed">{selectedIdea.description}</p>
                      </motion.div>
                    )}

                    {/* 3rd auto-filled field: AI comprehension summary */}
                    {comprehensionData && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-emerald-400/40 bg-emerald-500/5 p-4 space-y-2"
                      >
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">✦ Analyse IA — Modifiable par vous</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 border border-emerald-300/30 px-3 py-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Type de projet</p>
                            <input
                              type="text"
                              value={comprehensionData.project_type || ''}
                              onChange={e => setComprehensionData({ ...comprehensionData, project_type: e.target.value })}
                              className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-emerald-300/40 focus:border-emerald-500 focus:outline-none pb-0.5 transition-colors"
                            />
                          </div>
                          <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 border border-emerald-300/30 px-3 py-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Durée estimée</p>
                            <input
                              type="text"
                              value={comprehensionData.estimated_duration || ''}
                              onChange={e => setComprehensionData({ ...comprehensionData, estimated_duration: e.target.value })}
                              className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-emerald-300/40 focus:border-emerald-500 focus:outline-none pb-0.5 transition-colors"
                            />
                          </div>
                          <div className="rounded-xl bg-white/60 dark:bg-slate-800/60 border border-emerald-300/30 px-3 py-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Équipe cible</p>
                            <input
                              type="text"
                              value={comprehensionData.target_team || ''}
                              onChange={e => setComprehensionData({ ...comprehensionData, target_team: e.target.value })}
                              className="w-full text-xs font-bold text-slate-900 dark:text-white bg-transparent border-b border-emerald-300/40 focus:border-emerald-500 focus:outline-none pb-0.5 transition-colors"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 mb-1.5 block tracking-widest">Date de début</Label>
                        <motion.div
                          className="relative rounded-xl p-[1px] overflow-hidden group w-full"
                          animate={{ background: ["linear-gradient(90deg, #22d3ee20, #22d3ee80, #22d3ee20)", "linear-gradient(90deg, #22d3ee80, #22d3ee20, #22d3ee80)"] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 rounded-[calc(0.75rem-1px)] font-bold text-sm relative z-10 transition-all" />
                          <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                        </motion.div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 mb-1.5 block tracking-widest">Deadline</Label>
                        <motion.div
                          className="relative rounded-xl p-[1px] overflow-hidden group w-full"
                          animate={{ background: ["linear-gradient(90deg, #22d3ee20, #22d3ee80, #22d3ee20)", "linear-gradient(90deg, #22d3ee80, #22d3ee20, #22d3ee80)"] }}
                          transition={{ duration: 3, repeat: Infinity }}
                        >
                          <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full h-11 border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 rounded-[calc(0.75rem-1px)] font-bold text-sm relative z-10 transition-all" />
                          <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                        </motion.div>
                      </div>
                      <div>
                        <Label className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 mb-1.5 block tracking-widest">Taille de l'Équipe</Label>
                        <motion.div
                          className="relative rounded-xl p-[1px] overflow-hidden group w-full"
                          animate={{ background: ["linear-gradient(180deg, #22d3ee20, #22d3ee80, #22d3ee20)", "linear-gradient(180deg, #22d3ee80, #22d3ee20, #22d3ee80)"] }}
                          transition={{ duration: 4, repeat: Infinity }}
                        >
                          <Select value={teamSize} onValueChange={v => {
                            setTeamSize(v || "");
                          }}>
                            <SelectTrigger className="w-full h-11 border-transparent focus:border-transparent focus:ring-0 bg-white dark:bg-slate-950 rounded-[calc(0.75rem-1px)] font-bold text-sm relative z-10 transition-all shadow-none"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                            <SelectContent className="rounded-xl border-cyan-500/20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                              <SelectItem value="1-3">1-3 Personnes</SelectItem>
                              <SelectItem value="4-8">4-8 Personnes</SelectItem>
                              <SelectItem value="9-15">9-15 Personnes</SelectItem>
                              <SelectItem value="15+">15+ Personnes</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="absolute inset-0 bg-cyan-400 opacity-0 group-hover:opacity-10 transition-opacity blur-md" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-1">
                      <Button variant="ghost" onClick={() => setStep("warroom-pick")} className="rounded-xl font-black text-slate-400">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                      <motion.div
                        className="flex-1"
                        animate={teamSize ? { scale: [1, 1.02, 1], boxShadow: ["0 0 20px rgba(34,211,238,0.3)", "0 0 40px rgba(34,211,238,0.6)", "0 0 20px rgba(34,211,238,0.3)"] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Button
                          onClick={() => {
                            const desc = selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea
                            launchComprehension(desc)
                          }}
                          className="w-full bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 relative overflow-hidden group flex items-center justify-center"
                        >
                          <Sparkles size={16} className="mr-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" /> {lang === 'fr' ? 'Analyser ce concept' : 'Analyze this concept'} <ArrowRight size={16} className="ml-1.5 inline-block" />
                        </Button>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* ─── WAR ROOM TECH WATCH ─── */}
                {step === "warroom-tech" && (
                  <motion.div key="warroom-tech" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">

                    {/* Header compact */}
                    <div className="flex items-center gap-3 pb-1">
                      <div className="w-9 h-9 rounded-xl bg-[#00BCD4] flex items-center justify-center shadow shrink-0">
                        <BrainCircuit size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base font-black text-slate-900">Veille Technologique</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tendances réelles · Mise à jour quotidienne · Liées à votre projet</p>
                      </div>
                      {globalScore > 0 && (
                        <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-full shrink-0">
                          <TrendingUp size={13} className="text-[#00BCD4]" />
                          <span className="text-[11px] font-black text-[#00BCD4]">{globalScore}%</span>
                        </div>
                      )}
                    </div>

                    {/* SUB-PHASE: PICK */}
                    {techSubPhase === "pick" && (
                      <>
                        {isFetchingTech ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-3">
                            <RefreshCw size={28} className="text-[#00BCD4] animate-spin" />
                            <p className="text-sm font-black text-slate-400 animate-pulse">Scan des tendances en temps réel pour votre projet...</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {articles.map((article, i) => {
                              const isSelected = selectedArticles.some(a => a.id === article.id)
                              const isVideo = article.type === "VIDEO"
                              return (
                                <motion.div
                                  key={article.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.08 }}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedArticles(prev => prev.filter(a => a.id !== article.id));
                                    } else {
                                      setSelectedArticles(prev => [...prev, article]);
                                    }
                                  }}
                                  className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? "border-[#00BCD4] bg-cyan-50/60 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
                                >
                                  {/* Type icon */}
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isVideo ? "bg-red-100" : "bg-blue-50"}`}>
                                    {isVideo
                                      ? <PlayCircle size={18} className="text-red-500" />
                                      : <BookOpen size={18} className="text-blue-500" />
                                    }
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isVideo ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                                        {article.type}
                                      </span>
                                      <span className="text-[9px] font-black text-[#00BCD4] uppercase tracking-wider">{article.category}</span>
                                      {i === 0 && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase">NOUVEAU</span>}
                                    </div>
                                    <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2">{article.title}</p>
                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">Cette fonctionnalité peut être intégrée et utilisée dans votre projet selon vos besoins techniques.</p>
                                    <div className="flex items-center gap-3 mt-2">
                                      <span className="text-[10px] text-slate-400 font-bold flex-1 truncate">Par {article.author} · {article.date}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDetailArticle(article);
                                        }}
                                        className="text-[9px] font-black text-slate-500 hover:text-[#00BCD4] transition-colors flex items-center gap-1 uppercase tracking-widest bg-slate-50 hover:bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                                      >
                                        Détails
                                      </button>
                                      <a
                                        href={article.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className="text-[9px] font-black text-white bg-[#00BCD4] hover:bg-[#0097a7] transition-colors flex items-center gap-1 uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-sm shadow-cyan-500/20"
                                      >
                                        Ouvrir <ExternalLink size={10} />
                                      </a>
                                    </div>
                                  </div>

                                  {/* Selection indicator only */}
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    {isSelected && <CheckCircle2 size={16} className="text-[#00BCD4]" />}
                                  </div>
                                </motion.div>
                              )
                            })}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button variant="ghost" onClick={() => { setStep(mode === "import" ? "warroom-tech" : "contraintes"); setTechSubPhase("pick"); }} className="rounded-xl font-black text-slate-400">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              const desc = mode === "import" ? `Projet basé sur le cahier des charges : ${projectName}` : (selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea)
                              if (mode === "idea") {
                                handleProceedToIdeation(desc)
                              } else if (mode === "import" && selectedProject) {
                                // CDC flow: proceed to concept validation
                                setStep('concept-validation')
                              } else {
                                handleAnalyze(desc)
                              }
                            }}
                            className="flex-[1.5] py-5 rounded-xl font-black text-slate-500 border-slate-200 transition-all hover:bg-slate-50"
                          >
                            Passer
                          </Button>
                          <Button
                            disabled={isFetchingTech || selectedArticles.length === 0}
                            onClick={() => selectedArticles.length > 0 && analyzeTrend(selectedArticles)}
                            className={`flex-[2] py-5 rounded-xl font-black text-sm transition-all duration-300 ${isFetchingTech || selectedArticles.length === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] hover:-translate-y-0.5"}`}
                          >
                            <Sparkles size={15} className="mr-2" />
                            Analyser ({selectedArticles.length}) <ArrowRight size={15} className="ml-1.5" />
                          </Button>
                        </div>
                      </>
                    )}

                    {/* SUB-PHASE: ANALYZING */}
                    {techSubPhase === "analyzing" && (
                      <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full border-4 border-cyan-100 border-t-[#00BCD4] animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Lightbulb size={20} className="text-[#00BCD4]" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-700">Analyse d'intégration en cours...</p>
                          <p className="text-[11px] text-slate-400 font-bold mt-1">L'IA étudie comment intégrer cette tendance à votre projet</p>
                        </div>
                        <div className="flex gap-1.5">
                          {["Extraction du contexte", "Planification", "Génération du plan"].map((label, i) => (
                            <motion.div
                              key={i}
                              animate={{ opacity: [0.4, 1, 0.4] }}
                              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                              className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full"
                            >
                              {label}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SUB-PHASE: PLAN */}
                    {techSubPhase === "plan" && analysisPlan && selectedArticles.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        {/* Selected trends recap */}
                        <div className="flex flex-col gap-2 max-h-32 overflow-y-auto pr-1">
                          {selectedArticles.map(art => (
                            <div key={art.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${art.type === "VIDEO" ? "bg-red-100" : "bg-blue-50"}`}>
                                {art.type === "VIDEO" ? <PlayCircle size={15} className="text-red-500" /> : <BookOpen size={15} className="text-blue-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{art.category}</p>
                                <p className="text-xs font-black text-slate-700 truncate">{art.title}</p>
                              </div>
                              <a href={art.url} target="_blank" rel="noopener noreferrer" className="text-[#00BCD4] hover:text-[#0097a7]">
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          ))}
                        </div>

                        {/* Plan d'intégration */}
                        <div className="rounded-2xl border border-[#00BCD4]/20 bg-gradient-to-br from-cyan-50/50 to-white p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <Target size={14} className="text-[#00BCD4]" />
                                <span className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest">Plan d'intégration</span>
                                <span className="text-[10px] font-black bg-[#00BCD4] text-white px-2 py-0.5 rounded-full">{analysisPlan.impact_score}% impact</span>
                              </div>
                              <p className="text-sm font-black text-slate-900">{analysisPlan.integration_title}</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{analysisPlan.one_liner}"</p>
                          <div className="grid grid-cols-3 gap-2">
                            {analysisPlan.innovations.map((inno, i) => (
                              <div key={i} className="bg-white rounded-xl p-2.5 border border-slate-100 space-y-1">
                                <p className="text-base">{inno.icon}</p>
                                <p className="text-[10px] font-black text-slate-800 leading-tight">{inno.label}</p>
                                <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{inno.detail}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <Button variant="ghost" onClick={() => setTechSubPhase("pick")} className="rounded-xl font-black text-slate-400 text-sm">
                            ← Changer
                          </Button>
                          <Button
                            onClick={() => {
                              const enrichedDesc = analysisPlan.enriched_description || (mode === "import" ? `Projet basé sur le cahier des charges : ${projectName}` : rawIdea)
                              if (mode === "idea") {
                                handleProceedToIdeation(enrichedDesc)
                              } else if (mode === "import" && selectedProject) {
                                // CDC flow: proceed to concept validation
                                setStep('concept-validation')
                              } else {
                                handleAnalyze(enrichedDesc)
                              }
                            }}
                            className="flex-1 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] py-5 rounded-2xl font-black text-sm transition-all duration-500 relative overflow-hidden group flex justify-center items-center"
                          >
                            <span className="relative z-10 flex items-center">
                              {waitingForIdeation ? (
                                <><RefreshCw size={15} className="mr-2 animate-spin" /> Génération en cours...</>
                              ) : (
                                <><Sparkles size={15} className="mr-2" />
                                  {lang === 'fr' ? 'Voir mes Projets' : 'View my Projects'} <ArrowRight size={15} className="ml-1.5" /></>
                              )}
                            </span>
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* ─── DETAILS MODAL ─── */}
                    <Dialog open={!!detailArticle} onOpenChange={(open) => !open && setDetailArticle(null)}>
                      <DialogContent className="w-full sm:max-w-2xl p-0 border-none rounded-3xl bg-white shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }}>
                        {detailArticle && (
                          <div className="flex flex-col">
                            {/* Modal Header Media (Video Embed or Image) */}
                            <div className="relative shrink-0 bg-black flex items-center justify-center overflow-hidden w-full h-[300px]">
                              {detailArticle.type === 'VIDEO' && (detailArticle.url.includes('youtube.com/watch?v=') || detailArticle.url.includes('youtu.be/')) ? (
                                <iframe
                                  className="absolute top-0 left-0 w-full h-full border-0"
                                  src={`https://www.youtube.com/embed/${detailArticle.url.includes('v=') ? detailArticle.url.split('v=')[1].split('&')[0] : detailArticle.url.split('youtu.be/')[1].split('?')[0]}?autoplay=1&rel=0&modestbranding=1`}
                                  title={detailArticle.title}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                ></iframe>
                              ) : (
                                <img
                                  src={detailArticle.image && detailArticle.image.startsWith('http') ? detailArticle.image : `https://api.microlink.io/?url=${encodeURIComponent(detailArticle.url)}&embed=image.url`}
                                  alt={detailArticle.title}
                                  onError={(e) => {
                                    if (!e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = "true";
                                      e.currentTarget.src = `https://api.microlink.io/?url=${encodeURIComponent(detailArticle.url)}&embed=image.url`;
                                    } else {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80";
                                    }
                                  }}
                                  className="absolute top-0 left-0 w-full h-full object-cover opacity-90"
                                />
                              )}
                            </div>

                            {/* Modal Body (Horizontal Split - Un bloc horizontal) */}
                            <div className="flex flex-col sm:flex-row bg-slate-50 sm:h-[320px]">

                              {/* Left Column: Info & Snippet */}
                              <div className="flex-1 p-5 sm:p-6 sm:pb-8 flex flex-col justify-between overflow-hidden">
                                <div className="space-y-2 overflow-hidden">
                                  <div className="flex gap-2 mb-1">
                                    <Badge className={`border-none px-2 py-0.5 text-[9px] font-black tracking-widest uppercase ${detailArticle.type === 'VIDEO' ? 'bg-red-500 text-white' : 'bg-[#00BCD4] text-white'}`}>
                                      {detailArticle.type}
                                    </Badge>
                                    <Badge className="bg-white text-slate-500 border border-slate-200 px-2 py-0.5 text-[9px] font-black tracking-widest uppercase">
                                      {detailArticle.category}
                                    </Badge>
                                  </div>
                                  <h2 className="text-xl font-black text-slate-900 leading-tight line-clamp-3" title={detailArticle.title}>
                                    {detailArticle.title}
                                  </h2>

                                  <div className="flex items-center gap-1.5 font-bold text-[10px] text-slate-400">
                                    <RefreshCw size={10} /> PUBLIÉ PAR {detailArticle.author.toUpperCase()} · {detailArticle.date.toUpperCase()}
                                  </div>

                                  <p className="text-xs font-medium text-slate-600 leading-relaxed text-justify mt-1 line-clamp-4" title={detailArticle.snippet}>
                                    {detailArticle.snippet}
                                  </p>
                                </div>

                                <div className="pt-4 mt-auto">
                                  <a
                                    href={detailArticle.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setDetailArticle(null)}
                                    className="bg-[#111827] hover:bg-black text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest inline-flex items-center gap-2 transition-all shadow-md hover:shadow-lg shadow-black/10"
                                  >
                                    <ExternalLink size={15} /> CONSULTER LA SOURCE
                                  </a>
                                </div>
                              </div>

                              {/* Right Column: Innovation Sidebar */}
                              <div className="w-full sm:w-[220px] bg-white p-5 sm:p-6 sm:pb-8 border-t sm:border-t-0 sm:border-l border-slate-100 flex flex-col shrink-0 justify-between overflow-hidden">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Sparkles size={14} className="text-[#00BCD4]" />
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Innovation</h4>
                                  </div>
                                  <div className="text-4xl font-black text-[#00BCD4] mb-2">{detailArticle.innovation_score}%</div>
                                  <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                                    Technologie recommandée pour innover et propulser ce projet.
                                  </p>
                                </div>

                                <div className="pt-4 mt-3 sm:mt-0 border-t border-slate-50">
                                  <Button
                                    onClick={() => {
                                      if (selectedArticles.some(a => a.id === detailArticle.id)) {
                                        setSelectedArticles(prev => prev.filter(a => a.id !== detailArticle.id));
                                      } else {
                                        setSelectedArticles(prev => [...prev, detailArticle]);
                                      }
                                    }}
                                    className={`w-full hover:-translate-y-0.5 transition-all rounded-xl font-black text-[11px] h-12 shadow-md ${selectedArticles.some(a => a.id === detailArticle.id) ? "bg-rose-100 text-rose-600 hover:bg-rose-200" : "bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white shadow-cyan-500/20"}`}
                                  >
                                    {selectedArticles.some(a => a.id === detailArticle.id) ? "DÉSÉLECTIONNER" : "SÉLECTIONNER"}
                                  </Button>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </motion.div>
                )}

                {/* ─── IMPORT DETAILS ─── */}
                {step === "import-details" && (
                  <motion.div key="import" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-5">
                    <div className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name" className="text-xs font-black uppercase text-slate-400">{lang === 'fr' ? 'Nom du Projet' : 'Project Name'}</Label>
                        <Input id="name" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="ex. Expérience VR NextGen, Visualisation 3D" className="h-12 border-slate-200 rounded-xl font-medium" />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs font-black uppercase text-slate-400">Documents de Spécification</Label>
                        {files.length === 0 ? (
                          <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${isDragActive ? "border-[#00BCD4] bg-[#00BCD4]/5" : "border-slate-200 hover:border-slate-300"}`}>
                            <input {...getInputProps()} />
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Upload className="w-6 h-6 text-slate-400" /></div>
                            <p className="font-bold text-slate-600">Déposez vos fichiers ici, ou <span className="text-[#00BCD4]">parcourez</span></p>
                            <p className="text-xs text-slate-400 mt-1 uppercase font-black">PDF, DOCX, TXT</p>
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between border-dashed">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#00BCD4]/10 rounded-xl flex items-center justify-center text-[#00BCD4]">
                                <CheckCircle2 size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{files.length} fichier(s) sélectionné(s)</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pret pour l'analyse IA</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFiles([])}
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest"
                            >
                              Réinstaller
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {files.map((file, i) => (
                          <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#00BCD4]" />
                            <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{file.name}</span>
                            <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setStep("mode")} className="flex-1 py-6 rounded-xl font-black text-slate-500">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                      <Button
                        disabled={projectName.length === 0 || files.length === 0 || isCdcExtracting}
                        onClick={async () => {
                          setIsCdcExtracting(true)
                          try {
                            const fd = new FormData()
                            fd.append('file', files[0])
                            const res = await fetch(`${API_BASE_URL}/api/wizard/extract-cdc`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                              body: fd
                            })
                            if (!res.ok) {
                              const errBody = await res.text().catch(() => 'No details')
                              console.error(`CDC extract HTTP ${res.status}:`, errBody)
                              // Fallback: let user fill all fields manually
                              const fallback: Record<string, any> = {}
                              for (const k of ['project_name', 'description', 'stack', 'start_date', 'deadline', 'team_size', 'constraints']) {
                                fallback[k] = { value: null, confidence: 0, risk: 'critical', risk_reason: `Extraction échouée (HTTP ${res.status})`, suggestion: 'Remplissez ce champ manuellement' }
                              }
                              setCdcExtracted(fallback)
                              setCdcFixes({})
                              showToast(`Extraction IA indisponible (${res.status}) — remplissez les champs manuellement`, 'warning')
                              setStep('cdc-extract')
                              return
                            }
                            const data = await res.json()
                            setCdcExtracted(data.fields)
                            setCdcFixes({})
                            setStep('cdc-extract')
                          } catch (err: any) {
                            console.error('CDC extraction error:', err)
                            // Network error fallback
                            const fallback: Record<string, any> = {}
                            for (const k of ['project_name', 'description', 'stack', 'start_date', 'deadline', 'team_size', 'constraints']) {
                              fallback[k] = { value: null, confidence: 0, risk: 'critical', risk_reason: 'Serveur inaccessible', suggestion: 'Remplissez ce champ manuellement' }
                            }
                            setCdcExtracted(fallback)
                            setCdcFixes({})
                            showToast('Backend inaccessible — remplissez les champs manuellement', 'error')
                            setStep('cdc-extract')
                          } finally {
                            setIsCdcExtracting(false)
                          }
                        }}
                        className="flex-[2] bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white py-6 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all duration-500"
                      >
                        {isCdcExtracting ? (
                          <span className="flex items-center gap-2"><motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />Analyse IA en cours...</span>
                        ) : (
                          <span>{lang === 'fr' ? 'Analyser le Document' : 'Analyze Document'} <Sparkles className="ml-2 w-5 h-5 inline" /></span>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── CDC EXTRACT — Tableau de bord extraction ─── */}
                {step === "cdc-extract" && cdcExtracted && (() => {
                  const FIELD_LABELS: Record<string, string> = {
                    project_name: 'Nom du projet', description: 'Description', stack: 'Stack technique',
                    start_date: 'Date de début', deadline: 'Deadline', team_size: 'Taille équipe', constraints: 'Contraintes'
                  }
                  const CRITICAL_FIELDS = ['project_name', 'description', 'start_date', 'deadline']
                  const hasBlockers = Object.entries(cdcExtracted).some(([k, f]: [string, any]) =>
                    f.risk === 'critical' && CRITICAL_FIELDS.includes(k)
                  )
                  return (
                    <motion.div key="cdc-extract" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                          <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 dark:text-white">Extraction IA — Cahier des Charges</h2>
                          <p className="text-[10px] text-cyan-500 font-black uppercase tracking-widest">Résultats de l'analyse automatique</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const fieldsToShow = { ...cdcExtracted }
                          const ALWAYS_SHOW = ['start_date', 'deadline']
                          ALWAYS_SHOW.forEach(k => {
                            if (!fieldsToShow[k]) {
                              fieldsToShow[k] = { value: null, confidence: 0, risk: 'critical', risk_reason: `🚨 Aucun(e) ${FIELD_LABELS[k] || k} trouvé(e)`, suggestion: 'Remplissez ce champ manuellement' }
                            }
                          })
                          
                          const FIELD_ORDER = ['project_name', 'description', 'stack', 'start_date', 'deadline', 'team_size', 'constraints']
                          const sortedEntries = Object.entries(fieldsToShow).sort(([a], [b]) => {
                            const idxA = FIELD_ORDER.indexOf(a)
                            const idxB = FIELD_ORDER.indexOf(b)
                            return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99)
                          })
                          
                          return sortedEntries.map(([key, field]: [string, any]) => {
                            const color = field.risk === 'critical' ? 'shake-alert'
                              : field.risk === 'uncertain' ? 'neon-alert'
                                : 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-900/10'
                            const badge = field.risk === 'critical' ? '⚠️ CRITIQUE'
                              : field.risk === 'uncertain' ? '⚠️ INCERTAIN' : '🟢 OK'
                            const displayValue = Array.isArray(field.value)
                              ? field.value.join(', ')
                              : (field.value ?? '—')
                            return (
                              <div key={key} className={`rounded-2xl border-2 px-4 py-3 flex items-start justify-between gap-3 transition-all ${color}`}>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{FIELD_LABELS[key] || key}</span>
                                    <span className="text-[9px] font-black">{badge}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{displayValue}</p>
                                  {field.risk_reason && <p className={`mt-1 ${field.risk === 'critical' ? 'text-sm font-black text-red-500/90' : 'text-[10px] text-slate-500 italic'}`}>
                                    {field.risk === 'critical' && !field.risk_reason.includes('🚨') ? `🚨 ${field.risk_reason}` : field.risk_reason}
                                  </p>}
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[10px] font-black text-slate-400">{field.confidence}%</span>
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>

                      <div className="flex gap-3 pt-1">
                        <Button variant="ghost" onClick={() => setStep('import-details')} className="rounded-xl font-black text-slate-400 hover:text-slate-600">← Retour</Button>
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,188,212,0.5), 0 0 60px rgba(0,188,212,0.2)' }} whileTap={{ scale: 0.98 }}
                          onClick={() => setStep('cdc-risks')}
                          className="flex-1 bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all duration-500"
                        >
                          <span className="relative z-10">Corriger les risques <ArrowRight size={16} className="inline ml-1" /></span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })()}

                {/* ─── CDC RISKS — Correction des champs bloquants ─── */}
                {step === "cdc-risks" && cdcExtracted && (() => {
                  const FIELD_LABELS: Record<string, string> = {
                    project_name: 'Nom du projet', description: 'Description', stack: 'Stack technique',
                    start_date: 'Date de début', deadline: 'Deadline', team_size: 'Taille équipe', constraints: 'Contraintes'
                  }
                  const CRITICAL_FIELDS = ['project_name', 'description', 'start_date', 'deadline']
                  const ALWAYS_SHOW = ['start_date', 'deadline']
                  const riskyFields = Object.entries(cdcExtracted).filter(([k, f]: [string, any]) =>
                    f.risk === 'critical' || f.risk === 'uncertain' || ALWAYS_SHOW.includes(k)
                  )
                  // Also add start_date/deadline if not in cdcExtracted at all
                  for (const k of ALWAYS_SHOW) {
                    if (!cdcExtracted[k] && !riskyFields.some(([rk]: [string, any]) => rk === k)) {
                      riskyFields.push([k, { value: null, confidence: 0, risk: 'critical', risk_reason: `Aucun(e) ${FIELD_LABELS[k] || k} trouvé(e)`, suggestion: 'Remplissez ce champ manuellement' }])
                    }
                  }

                  const FIELD_ORDER = ['start_date', 'deadline', 'team_size', 'project_name', 'description', 'stack', 'constraints']
                  riskyFields.sort(([a], [b]) => {
                    const idxA = FIELD_ORDER.indexOf(a as string)
                    const idxB = FIELD_ORDER.indexOf(b as string)
                    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99)
                  })
                  const criticalUnsolved = riskyFields.filter(([k, f]: [string, any]) =>
                    f.risk === 'critical' && CRITICAL_FIELDS.includes(k) && !cdcFixes[k]
                  )
                  const canContinue = criticalUnsolved.length === 0

                  const handleCdcContinue = () => {
                    // Merge extracted + fixed values into project state
                    const merged: Record<string, any> = {}
                    Object.entries(cdcExtracted).forEach(([k, f]: [string, any]) => {
                      merged[k] = cdcFixes[k] ?? (Array.isArray(f.value) ? f.value.join(', ') : f.value ?? '')
                    })
                    if (merged.project_name) setProjectName(merged.project_name)
                    if (merged.start_date) setStartDate(merged.start_date)
                    if (merged.deadline) setDeadline(merged.deadline)
                    if (merged.team_size) setTeamSize(merged.team_size)

                    const stackArr = merged.stack
                      ? merged.stack.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : []

                    // Pass to tech watch via comprehension data shape
                    setComprehensionData({
                      project_type: 'Import CDC',
                      estimated_duration: merged.deadline || '3 mois',
                      target_team: merged.team_size || 'Équipe technique',
                      complexity_level: 'MEDIUM',
                      key_features: merged.constraints ? [merged.constraints] : [],
                      suggested_stack: stackArr,
                      enriched_description: merged.description || ''
                    })

                    // Build synthetic selectedProject so feasibility + task steps work
                    const syntheticProject: GeneratedProject = {
                      id: Date.now(),
                      title: merged.project_name || projectName || 'Projet CDC',
                      description: merged.description || '',
                      complexity: 'MEDIUM' as const,
                      innovation_score: 75,
                      visual_style: 'Modern',
                      artistic_direction: '',
                      ambiance: '',
                      stack: stackArr,
                      modules: [],
                      team_distribution: { dev: 3, design: 1, three_d: 0 },
                      deliverables: merged.constraints ? [merged.constraints] : [],
                      scenarios: {
                        fast: { duration_weeks: 8, description: 'Version rapide' },
                        balanced: { duration_weeks: 12, description: merged.deadline || '3 mois' },
                        advanced: { duration_weeks: 20, description: 'Version complète' }
                      },
                      versions: { v1: 'MVP', v2: 'Beta', v3: 'Production' },
                      comparison_score: 80
                    }
                    setSelectedProject(syntheticProject)
                    setSelectedScenario('balanced')

                    // Pre-load tech watch articles for CDC stack
                    const techDesc = merged.description || `Projet ${merged.project_name || projectName} — Stack: ${stackArr.join(', ')}`
                    fetchTechArticles(techDesc, syntheticProject)

                    setStep('warroom-tech')
                  }

                  return (
                    <motion.div key="cdc-risks" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                          <AlertTriangle size={18} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-black text-slate-900 dark:text-white">Audit des Risques IA</h2>
                          <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">{criticalUnsolved.length} champ(s) critique(s) à corriger</p>
                        </div>
                      </div>

                      {riskyFields.length === 0 ? (
                        <div className="text-center py-8">
                          <span className="text-4xl">✅</span>
                          <p className="mt-3 font-black text-slate-700 dark:text-white">Aucun risque détecté !</p>
                          <p className="text-sm text-slate-500">Tous les champs sont correctement extraits.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {riskyFields.map(([key, field]: [string, any]) => {
                            const isCritical = field.risk === 'critical' && CRITICAL_FIELDS.includes(key)
                            return (
                              <div key={key} className={`rounded-2xl border-2 p-4 space-y-2 transition-all ${isCritical ? 'border-red-500 bg-red-50/60 dark:bg-red-900/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                : 'neon-alert'
                                }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{FIELD_LABELS[key] || key}</span>
                                  <span className="text-[9px] font-black">{isCritical ? '⚠️ BLOQUANT' : '⚠️ Recommandé'}</span>
                                </div>
                                {field.risk_reason && <p className="text-xs text-slate-600 dark:text-slate-300 italic">{field.risk_reason}</p>}
                                {field.suggestion && (
                                  <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">💡 {field.suggestion}</p>
                                )}
                                <input
                                  type={key === 'deadline' || key === 'start_date' ? 'date' : 'text'}
                                  className="w-full border rounded-xl px-3 py-2 text-sm font-medium bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                                  placeholder={`Entrez ${FIELD_LABELS[key] || key}...`}
                                  value={cdcFixes[key] ?? (Array.isArray(field.value) ? field.value.join(', ') : field.value ?? '')}
                                  onChange={e => setCdcFixes(prev => ({ ...prev, [key]: e.target.value }))}
                                />
                                {isCritical && !cdcFixes[key] && (
                                  <p className="text-[10px] text-red-500 font-black">⚠️ Ce champ est obligatoire pour continuer</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      <div className="flex gap-3 pt-1">
                        <Button variant="ghost" onClick={() => setStep('cdc-extract')} className="rounded-xl font-black text-slate-400 hover:text-slate-600">← Retour</Button>
                        <motion.button
                          whileHover={canContinue ? { scale: 1.02, boxShadow: '0 0 30px rgba(0,188,212,0.5), 0 0 60px rgba(0,188,212,0.2)' } : {}}
                          whileTap={canContinue ? { scale: 0.98 } : {}}
                          onClick={canContinue ? handleCdcContinue : undefined}
                          className={`flex-1 py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 relative overflow-hidden transition-all duration-500 ${canContinue
                            ? 'bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] cursor-pointer'
                            : 'text-slate-400 cursor-not-allowed bg-slate-100 dark:bg-slate-800'
                            }`}
                        >
                          <span className="relative z-10">
                            {canContinue ? 'Continuer — Veille Technologique' : `${criticalUnsolved.length} champ(s) manquant(s)`}
                            {canContinue && <ArrowRight size={16} className="inline ml-1" />}
                          </span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })()}

                {/* ─── AI LOADING ─── */}
                {step === "loading" && (
                  <motion.div key="loading" variants={fade} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center space-y-6 py-6">
                    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180, transform: "scale(0.55)", margin: "-30px 0" }}>
                      <motion.svg width="180" height="180" viewBox="0 0 180 180" className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} style={{ originX: "50%", originY: "50%" }}>
                        <defs><linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00CCCC" /><stop offset="50%" stopColor="#00CCCC" stopOpacity="0.1" /><stop offset="100%" stopColor="#FF0000" stopOpacity="0.8" /></linearGradient></defs>
                        <circle cx="90" cy="90" r="85" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.4" />
                        <circle cx="90" cy="90" r="85" fill="none" stroke="url(#wg1)" strokeWidth="3.5" />
                      </motion.svg>
                      <motion.svg width="135" height="135" viewBox="0 0 135 135" className="absolute" style={{ top: 22.5, left: 22.5, originX: "50%", originY: "50%" }} animate={{ rotate: -360 }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}>
                        <defs><linearGradient id="wg2" x1="100%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#111111" stopOpacity="0.9" /><stop offset="50%" stopColor="#00CCCC" stopOpacity="0" /><stop offset="100%" stopColor="#00CCCC" stopOpacity="0.8" /></linearGradient></defs>
                        <circle cx="67.5" cy="67.5" r="63" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.3" />
                        <circle cx="67.5" cy="67.5" r="63" fill="none" stroke="url(#wg2)" strokeWidth="2.5" />
                      </motion.svg>
                      <div className="absolute z-10 flex items-center justify-center"><Bot size={90} className="text-[#00BCD4]" /></div>
                    </div>

                    <div className="text-center space-y-3">
                      <Badge className="bg-[#00CCCC]/10 text-[#00CCCC] border-none px-4 py-1.5 rounded-full font-black animate-pulse">{loadingPhase}</Badge>
                      <h2 className="text-xl font-black text-slate-800">{loadingMessage}</h2>
                      <p className="text-slate-500 font-medium max-w-[260px] mx-auto text-sm">Nos agents IA construisent votre espace de projet...</p>
                    </div>

                    <div className="w-full max-w-sm space-y-2">
                      {[
                        { phase: "PARSING", label: "Extraction du contexte" },
                        { phase: "EXTRACTING", label: "Validation de la spécification" },
                        { phase: "ROADMAP", label: "Création des jalons" },
                        { phase: "TASKS", label: "Génération des tâches" },
                        { phase: "FINALIZING", label: "Espace prêt" }
                      ].map((p, i) => {
                        const phases = ["STARTING", "PARSING", "EXTRACTING", "ROADMAP", "TASKS", "FINALIZING", "DONE"]
                        const ci = phases.indexOf(loadingPhase), pi = phases.indexOf(p.phase)
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full shrink-0 transition-all ${ci > pi ? "bg-green-500" : ci === pi ? "bg-[#00CCCC] animate-ping" : "bg-slate-200"}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${ci >= pi ? "text-slate-700" : "text-slate-300"}`}>{p.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}

                {/* ─── SUCCESS ─── */}
                {step === "done" && (
                  <motion.div key="done" variants={fade} initial="initial" animate="animate" exit="exit"
                    className="flex flex-col items-center justify-center space-y-6 py-8 relative overflow-hidden">

                    {/* Ambient neon orbs */}
                    <div className="absolute inset-0 pointer-events-none">
                      <motion.div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(0,188,212,0.3), transparent)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 3, repeat: Infinity }} />
                      <motion.div className="absolute bottom-0 left-1/4 w-48 h-24 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(0,188,212,0.2), transparent)' }}
                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity, delay: 1 }} />
                      <motion.div className="absolute bottom-0 right-1/4 w-48 h-24 rounded-full blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.25), transparent)' }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }} />
                    </div>

                    {/* Trophy icon */}
                    <div className="relative z-10">
                      <motion.div className="absolute inset-0 rounded-full blur-2xl"
                        style={{ background: 'rgba(0,188,212,0.35)' }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                      <motion.div
                        initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="relative w-24 h-24 rounded-full flex items-center justify-center text-white"
                        style={{ background: 'linear-gradient(135deg, #00BCD4, #0097a7)', boxShadow: '0 0 30px rgba(0,188,212,0.7), 0 0 60px rgba(0,188,212,0.25)' }}>
                        <Trophy className="w-12 h-12" />
                      </motion.div>
                      {/* Orbiting particles */}
                      {[0, 1, 2, 3].map(i => (
                        <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                          style={{ background: i % 2 === 0 ? '#00BCD4' : '#14b8a6', top: '50%', left: '50%', boxShadow: `0 0 6px ${i % 2 === 0 ? '#00BCD4' : '#14b8a6'}` }}
                          animate={{ rotate: [i * 90, i * 90 + 360] }}
                          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'linear' }}
                          transformTemplate={({ rotate }) => `rotate(${rotate}) translateX(52px)`} />
                      ))}
                    </div>

                    {/* Title — animated chars */}
                    <div className="text-center space-y-3 relative z-10">
                      <motion.h2 className="text-3xl font-black text-slate-900 flex items-center justify-center gap-2"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        {(lang === 'fr' ? 'Projet Créé !' : 'Project Created !').split('').map((char, i) => (
                          <motion.span key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 + i * 0.04 }}
                            style={char !== ' ' ? { display: 'inline-block' } : { display: 'inline-block', width: '0.3em' }}>
                            {char}
                          </motion.span>
                        ))}
                      </motion.h2>
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        className="text-slate-500 font-medium max-w-xs mx-auto">
                        Votre projet <motion.span className="font-black text-slate-900"
                          animate={{ color: ['#0f172a', '#00BCD4', '#0f172a'] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }}>
                          "{projectName}"
                        </motion.span> est prêt avec une intégration IA complète.
                      </motion.p>
                    </div>

                    {/* Insights — sans la phrase "Le système a appris" */}
                    {managerInsights && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                        className="w-full rounded-2xl p-4 space-y-3 relative overflow-hidden z-10"
                        style={{ background: 'linear-gradient(135deg, rgba(245,243,255,0.9), rgba(255,255,255,0.95))', border: '1px solid rgba(139,92,246,0.25)', boxShadow: '0 0 20px rgba(139,92,246,0.08)' }}>
                        <motion.div className="absolute top-0 left-0 right-0 h-[1.5px]"
                          style={{ background: 'linear-gradient(90deg, transparent, #8b5cf6, transparent)' }}
                          animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
                        <motion.div className="absolute inset-0 pointer-events-none"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.04), transparent)' }}
                          animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }} />
                        <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-1.5 relative z-10">
                          <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>🧠</motion.span>
                          Amélioration Continue
                        </p>
                        <div className="flex gap-2 flex-wrap relative z-10">
                          {(selectedProject?.stack || []).map((s: string, i: number) => (
                            <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.6 + i * 0.07, type: 'spring' }}
                              whileHover={{ scale: 1.05, y: -1 }}
                              className="text-[9px] font-black px-2.5 py-1 rounded-full border"
                              style={{ background: 'rgba(139,92,246,0.08)', color: '#7c3aed', borderColor: 'rgba(139,92,246,0.25)', boxShadow: '0 0 6px rgba(139,92,246,0.15)' }}>{s}</motion.span>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium relative z-10">
                          Complexité préférée : <span className="font-black text-violet-600">{managerInsights.preferred_complexity}</span>
                          {' · '}Scénario : <span className="font-black text-violet-600">{managerInsights.preferred_scenario}</span>
                        </p>
                      </motion.div>
                    )}

                    {/* CTA button */}
                    <div className="pt-2 w-full relative z-10">
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(0,188,212,0.5), 0 0 60px rgba(0,188,212,0.2)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { if (createdProjectId) router.push(`/projects/${createdProjectId}`); onSuccess(); onClose() }}
                        className="w-full bg-[#00BCD4]/10 border border-[#00BCD4]/50 hover:bg-[#00BCD4] text-[#00BCD4] hover:text-white py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-2 relative overflow-hidden shadow-[0_0_20px_rgba(0,188,212,0.2)] hover:shadow-[0_0_30px_rgba(0,188,212,0.5)] transition-all duration-500">
                        <span className="relative z-10">{lang === 'fr' ? 'Aller au Projet' : 'Go to Project'}</span>
                        <motion.div className="relative z-10" animate={{ x: [0, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                          <ChevronRight className="w-6 h-6" />
                        </motion.div>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>

              {/* ─── MODAL D'ÉDITION DE TÂCHE AVANCÉE (HORS ANIMATEPRESENCE) ─── */}
              <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
                <DialogContent className="sm:max-w-[600px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
                  <div className="bg-slate-900 p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#00BCD4] flex items-center justify-center shadow-lg"><Edit3 size={20} className="text-white" /></div>
                      <div>
                        <DialogTitle className="text-lg font-black text-white">Édition de Tâche</DialogTitle>
                        <DialogDescription className="text-xs text-white/50 font-bold uppercase tracking-widest">Ajustez les paramètres techniques et organisationnels</DialogDescription>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Titre de la tâche</Label>
                        <Input
                          value={editingTask?.title || ""}
                          onChange={e => editingTask && setEditingTask({ ...editingTask, title: e.target.value })}
                          className="rounded-xl border-slate-200 font-bold"
                        />
                      </div>

                      <div>
                        <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Description détaillée</Label>
                        <Textarea
                          value={editingTask?.description || ""}
                          onChange={e => editingTask && setEditingTask({ ...editingTask, description: e.target.value })}
                          className="rounded-xl border-slate-200 min-h-[100px] text-sm leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Priorité</Label>
                          <Select value={editingTask?.priority || "Medium"} onValueChange={v => editingTask && setEditingTask({ ...editingTask, priority: v as any })}>
                            <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">🔴 Haute (Crucial)</SelectItem>
                              <SelectItem value="Medium">🟡 Moyenne</SelectItem>
                              <SelectItem value="Low">🟢 Basse</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Estimation (Heures)</Label>
                          <Input
                            type="number"
                            value={editingTask?.duration_hours || 0}
                            onChange={e => editingTask && setEditingTask({ ...editingTask, duration_hours: parseInt(e.target.value) })}
                            className="rounded-xl border-slate-200"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Rôle assigné</Label>
                          <Input
                            value={editingTask?.role || ""}
                            onChange={e => editingTask && setEditingTask({ ...editingTask, role: e.target.value })}
                            placeholder="Ex: Lead Dev, 3D Artist"
                            className="rounded-xl border-slate-200"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Risque</Label>
                          <Select value={editingTask?.risk_level || "Low"} onValueChange={v => editingTask && setEditingTask({ ...editingTask, risk_level: v as any })}>
                            <SelectTrigger className="rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="High">Risque Élevé</SelectItem>
                              <SelectItem value="Medium">Risque Modéré</SelectItem>
                              <SelectItem value="Low">Risque Faible</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Outils & Technologies</Label>
                        <Input
                          value={editingTask?.tools?.join(", ") || ""}
                          onChange={e => editingTask && setEditingTask({ ...editingTask, tools: e.target.value.split(",").map(t => t.trim()) })}
                          placeholder="Ex: Unreal Engine, PhysX, Git"
                          className="rounded-xl border-slate-200"
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="bg-slate-50 p-4 border-t border-slate-200">
                    <Button variant="ghost" onClick={() => setEditingTask(null)} className="rounded-xl font-black text-slate-500">Annuler</Button>
                    <Button
                      onClick={() => {
                        if (editingTask) {
                          const next = managerFeatures.map(t => t.id === editingTask.id ? editingTask : t)
                          setManagerFeatures(next)
                          setEditingTask(null)
                          // Trigger AI re-analysis
                          if (selectedProject) analyzeCurrentTasks(next, selectedProject)
                        }
                      }}
                      className="bg-[#00BCD4] hover:bg-[#0097a7] text-white rounded-xl font-black px-8"
                    >
                      Appliquer les changements
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* ─── MODAL DE DÉTAILS DE TÂCHE (HORS ANIMATEPRESENCE) ─── */}
              <Dialog open={!!selectedTaskForDetail} onOpenChange={() => setSelectedTaskForDetail(null)}>
                <DialogContent className="sm:max-w-[680px] rounded-3xl p-0 overflow-hidden flex flex-col h-[90vh] sm:h-[85vh]"
                  style={{ background: 'rgba(240,253,255,0.97)', backdropFilter: 'blur(20px)', border: '1.5px solid rgba(0,188,212,0.35)', boxShadow: '0 0 0 1px rgba(0,188,212,0.15), 0 0 40px rgba(0,188,212,0.18), 0 0 80px rgba(0,188,212,0.08), 0 25px 60px rgba(0,0,0,0.12)' }}>
                  {/* Neon top border animation */}
                  <motion.div className="absolute top-0 left-0 right-0 h-[2px] z-50 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, #00BCD4 40%, #67e8f9 60%, transparent 100%)' }}
                    animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }} />
                  {/* Neon bottom border animation */}
                  <motion.div className="absolute bottom-0 left-0 right-0 h-[2px] z-50 pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent 0%, #00BCD4 40%, #67e8f9 60%, transparent 100%)' }}
                    animate={{ opacity: [0.4, 0.9, 0.4] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1 }} />
                  {selectedTaskForDetail && (
                    <div className="relative z-10 flex flex-col flex-1 min-h-0">
                      {/* HEADER — light with neon accent */}
                      <div className="relative overflow-hidden shrink-0 px-6 sm:px-8 pt-7 pb-6"
                        style={{ background: 'linear-gradient(135deg, rgba(224,247,250,0.9) 0%, rgba(255,255,255,0.95) 60%, rgba(224,247,250,0.7) 100%)', borderBottom: '1px solid rgba(0,188,212,0.15)' }}>
                        {/* Floating neon orb */}
                        <motion.div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                          style={{ background: 'radial-gradient(circle, rgba(0,188,212,0.12) 0%, transparent 70%)' }}
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 3, repeat: Infinity }} />
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                          <div className="flex items-center gap-2.5 mb-4">
                            <motion.div
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedTaskForDetail.priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-cyan-50 text-[#00BCD4] border-cyan-200 shadow-[0_0_10px_rgba(0,188,212,0.2)]'}`}
                              animate={{ boxShadow: selectedTaskForDetail.priority === 'High' ? ['0 0 8px rgba(239,68,68,0.2)', '0 0 18px rgba(239,68,68,0.4)', '0 0 8px rgba(239,68,68,0.2)'] : ['0 0 8px rgba(0,188,212,0.2)', '0 0 18px rgba(0,188,212,0.4)', '0 0 8px rgba(0,188,212,0.2)'] }}
                              transition={{ duration: 2, repeat: Infinity }}>
                              Priorité {selectedTaskForDetail.priority}
                            </motion.div>
                            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                              {selectedTaskForDetail.category}
                            </span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight mb-4 tracking-tight">{selectedTaskForDetail.title}</h2>
                          <div className="flex items-center gap-5 text-sm font-bold text-slate-500">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-cyan-100 shadow-sm">
                              <Clock size={14} className="text-[#00BCD4]" /> <span className="text-slate-700">{selectedTaskForDetail.duration_hours} heures</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-cyan-100 shadow-sm">
                              <Target size={14} className="text-[#00BCD4]" /> <span className="text-slate-700">Sprint {selectedTaskForDetail.sprint}</span>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      <div className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-cyan-200 scrollbar-track-transparent" style={{ background: 'linear-gradient(180deg, rgba(240,253,255,0.5) 0%, rgba(255,255,255,0.8) 100%)' }}>
                        {/* Description Section */}
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                          className="space-y-3 p-5 rounded-2xl bg-white/70 backdrop-blur-md border border-cyan-300/60 shadow-[0_0_15px_rgba(0,188,212,0.15)] hover:shadow-[0_0_30px_rgba(0,188,212,0.3)] hover:border-[#00BCD4]/80 transition-all duration-500 relative group">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-black text-[#00BCD4] uppercase tracking-widest flex items-center gap-2">
                              <FileText size={13} /> Description de la mission
                            </h3>
                            {!(selectedTaskForDetail as any)._editingMission && (
                              <button onClick={() => {
                                setSelectedTaskForDetail({ ...selectedTaskForDetail, _editingMission: true, _descBackup: selectedTaskForDetail.description })
                              }} className="text-slate-400 hover:text-[#00BCD4] transition-colors p-1 opacity-0 group-hover:opacity-100">
                                <Edit3 size={12} />
                              </button>
                            )}
                          </div>
                          {(selectedTaskForDetail as any)._editingMission ? (
                            <div className="space-y-3">
                              <textarea
                                autoFocus
                                className="w-full text-sm text-slate-600 bg-slate-50 border border-cyan-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/20 resize-none min-h-[100px]"
                                value={selectedTaskForDetail.description}
                                onChange={e => setSelectedTaskForDetail({ ...selectedTaskForDetail, description: e.target.value })}
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => {
                                  const backup = (selectedTaskForDetail as any)._descBackup ?? selectedTaskForDetail.description
                                  const next = { ...selectedTaskForDetail, description: backup }
                                  delete (next as any)._editingMission
                                  delete (next as any)._descBackup
                                  setSelectedTaskForDetail(next)
                                }} className="px-4 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-200 transition-colors">
                                  Annuler
                                </button>
                                <button onClick={() => {
                                  const updated = { ...selectedTaskForDetail }
                                  delete (updated as any)._editingMission
                                  delete (updated as any)._descBackup
                                  setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (updated.id || updated.title) ? updated : t))
                                  setSelectedTaskForDetail(updated)
                                  setToast({ message: '✅ Description mise à jour !', type: 'info' })
                                  setTimeout(() => setToast(null), 3000)
                                }} className="px-4 py-1.5 bg-[#00BCD4] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[#00acc1] transition-colors">
                                  Sauvegarder
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-600 text-[14px] leading-relaxed font-medium">
                              {selectedTaskForDetail.description}
                            </p>
                          )}
                        </motion.div>

                        {/* Stack & Risk */}
                        <div className="grid grid-cols-2 gap-4">
                          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                            className="space-y-3 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-cyan-300/60 shadow-[0_0_15px_rgba(0,188,212,0.15)] hover:shadow-[0_0_30px_rgba(0,188,212,0.3)] hover:border-[#00BCD4]/80 transition-all duration-500 relative group">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest">Stack & Outils</h4>
                              {!(selectedTaskForDetail as any)._editingStack ? (
                                <button onClick={() => {
                                  setSelectedTaskForDetail({ ...selectedTaskForDetail, _editingStack: true, _stackInput: '' })
                                }} className="text-slate-400 hover:text-[#00BCD4] transition-colors p-1">
                                  <Edit3 size={12} />
                                </button>
                              ) : (
                                <button onClick={() => {
                                  const next = { ...selectedTaskForDetail }
                                  delete (next as any)._editingStack
                                  delete (next as any)._stackInput
                                  setSelectedTaskForDetail(next)
                                }} className="text-rose-400 hover:text-rose-500 transition-colors p-1">
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                            {(selectedTaskForDetail as any)._editingStack ? (() => {
                              const ALL_TOOLS = [
                                'React','Next.js','Vue.js','Angular','Svelte','TypeScript','JavaScript','Tailwind CSS','Sass',
                                'Node.js','Express','NestJS','Python','Django','FastAPI','Flask','Java','Spring Boot',
                                'Kotlin','Swift','Flutter','React Native',
                                'PostgreSQL','MongoDB','MySQL','Redis','Prisma',
                                'GraphQL','REST API',
                                'Docker','Kubernetes','AWS','Azure','GCP','Vercel','Netlify','Git','GitHub','GitLab',
                                'Figma',
                                'Unreal Engine','Unity','Blender','Three.js','WebGL','Meta Quest','PSVR','HTC Vive','SteamVR','OpenXR','ARKit','ARCore',
                                'OpenCV','TensorFlow','PyTorch',
                                'Webpack','Vite','ESLint','Jest','Cypress','Playwright','Storybook'
                              ]
                              const inputVal = ((selectedTaskForDetail as any)._stackInput || '').trim()
                              const currentTools: string[] = selectedTaskForDetail.tools || []
                              const suggestions = inputVal.length >= 1
                                ? ALL_TOOLS.filter(t => t.toLowerCase().startsWith(inputVal.toLowerCase()) && !currentTools.includes(t)).slice(0, 8)
                                : []
                                
                              const saveTools = (newTools: string[]) => {
                                const updated = { ...selectedTaskForDetail, tools: newTools }
                                setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (updated.id || updated.title) ? updated : t))
                                setSelectedTaskForDetail(updated)
                              }

                              return (
                                <div className="space-y-2.5">
                                  {/* Chips with always-visible ✕ */}
                                  <div className="flex flex-wrap gap-1.5">
                                    {currentTools.map((tool, ti) => (
                                      <span key={ti} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200/60 text-cyan-700 text-[10px] font-bold">
                                        {tool}
                                        <button onClick={() => {
                                          saveTools(currentTools.filter((_: any, idx: number) => idx !== ti))
                                        }} className="text-cyan-400 hover:text-rose-500 transition-colors ml-0.5">
                                          <X size={10} />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                  {/* Input row */}
                                  <div className="relative inline-block mt-1">
                                    <input
                                      autoFocus
                                      className="w-[200px] text-[10px] text-slate-600 bg-cyan-50/30 border border-[#00BCD4]/40 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/20 placeholder:text-slate-400"
                                      value={(selectedTaskForDetail as any)._stackInput || ''}
                                      onChange={e => setSelectedTaskForDetail({ ...selectedTaskForDetail, _stackInput: e.target.value })}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault()
                                          const val = ((selectedTaskForDetail as any)._stackInput || '').trim()
                                          if (val && !currentTools.includes(val)) {
                                            const updated = { ...selectedTaskForDetail, tools: [...currentTools, val], _stackInput: '' }
                                            setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (updated.id || updated.title) ? updated : t))
                                            setSelectedTaskForDetail(updated)
                                          }
                                        }
                                        if (e.key === 'Escape') {
                                          const next = { ...selectedTaskForDetail }
                                          delete (next as any)._editingStack
                                          delete (next as any)._stackInput
                                          setSelectedTaskForDetail(next)
                                        }
                                      }}
                                      placeholder="Tapez pour chercher un outil..."
                                    />
                                    {/* Dropdown suggestions */}
                                    {suggestions.length > 0 && (
                                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-cyan-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-[200px] overflow-y-auto">
                                        {suggestions.map((s, si) => (
                                          <button key={si} onClick={() => {
                                            const updated = { ...selectedTaskForDetail, tools: [...currentTools, s], _stackInput: '' }
                                            setManagerFeatures(prev => prev.map(t => (t.id || t.title) === (updated.id || updated.title) ? updated : t))
                                            setSelectedTaskForDetail(updated)
                                          }} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-cyan-50 hover:text-[#00BCD4] transition-colors border-b border-slate-50 last:border-0">
                                            {s}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })() : (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedTaskForDetail.tools?.map((tool, ti) => (
                                  <motion.span key={ti} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + ti * 0.05 }}
                                    className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-200/60 text-cyan-700 text-[10px] font-bold shadow-[0_0_6px_rgba(0,188,212,0.1)]">
                                    {tool}
                                  </motion.span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                            className={`space-y-3 p-4 rounded-2xl border bg-white/70 backdrop-blur-md relative transition-all duration-500 ${selectedTaskForDetail.risk_level === 'High' ? 'border-rose-300/80 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:border-rose-400' : 'border-emerald-300/80 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:border-emerald-400'}`}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: selectedTaskForDetail.risk_level === 'High' ? '#e11d48' : '#059669' }}>Analyse de Risque</h4>
                            <div className="flex items-center gap-2">
                              <motion.div className={`w-2 h-2 rounded-full ${selectedTaskForDetail.risk_level === 'High' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }} transition={{ duration: 1.5, repeat: Infinity }} />
                              <span className={`text-sm font-black ${selectedTaskForDetail.risk_level === 'High' ? 'text-rose-600' : 'text-emerald-600'}`}>Niveau {selectedTaskForDetail.risk_level}</span>
                            </div>
                            {selectedTaskForDetail.mitigation && (
                              <p className="text-[11px] font-medium text-slate-500 leading-snug">{selectedTaskForDetail.mitigation}</p>
                            )}
                          </motion.div>
                        </div>


                      </div>

                      {/* Footer */}
                      <div className="p-4 sm:p-6 flex gap-3 shrink-0 relative z-20" style={{ background: 'rgba(240,253,255,0.9)', borderTop: '1px solid rgba(0,188,212,0.15)' }}>
                        <button
                          onClick={() => setSelectedTaskForDetail(null)}
                          className="flex-1 rounded-2xl font-black text-slate-500 h-13 py-3.5 hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all text-sm"
                        >
                          Fermer
                        </button>
                        <motion.button whileHover={{ scale: 1.01, boxShadow: '0 0 18px rgba(0,188,212,0.3)' }} whileTap={{ scale: 0.98 }}
                          onClick={() => { setCmdPaletteOpen(!cmdPaletteOpen); setCmdInput('') }}
                          className={`flex-1 border-2 rounded-2xl font-black py-3.5 transition-all flex items-center justify-center gap-2 text-sm ${cmdPaletteOpen ? 'border-[#00BCD4] text-[#00BCD4] bg-cyan-50 shadow-[0_0_15px_rgba(0,188,212,0.2)]' : 'bg-white border-cyan-200 hover:border-[#00BCD4] text-slate-600 hover:text-[#00BCD4]'}`}
                        >
                          <Edit3 size={16} /> {cmdPaletteOpen ? "Fermer Copilot" : "Modifier la fiche"}
                        </motion.button>
                      </div>

                      {/* Command Palette Overlay */}
                      <AnimatePresence>
                        {cmdPaletteOpen && selectedTaskForDetail && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
                            className="absolute inset-x-4 bottom-24 z-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[50vh]"
                            style={{ background: 'rgba(240,253,255,0.97)', backdropFilter: 'blur(16px)', border: '1.5px solid rgba(0,188,212,0.3)', boxShadow: '0 0 0 1px rgba(0,188,212,0.1), 0 0 25px rgba(0,188,212,0.15), 0 15px 40px rgba(0,0,0,0.1)' }}>
                            <div className="p-4 border-b border-cyan-100 space-y-3">
                              <div className="flex items-center gap-2">
                                <motion.div className="w-2 h-2 rounded-full bg-[#00BCD4]"
                                  animate={{ scale: [1, 1.5, 1], boxShadow: ['0 0 4px rgba(0,188,212,0.5)', '0 0 10px rgba(0,188,212,1)', '0 0 4px rgba(0,188,212,0.5)'] }}
                                  transition={{ duration: 1.5, repeat: Infinity }} />
                                <p className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest">AI Copilot</p>
                              </div>
                              <div className="relative">
                                <input
                                  autoFocus
                                  id="copilot-input"
                                  value={cmdInput}
                                  onChange={e => {
                                    const val = e.target.value
                                    // If user is deleting (shorter than before), just update
                                    if (val.length < cmdInput.length) {
                                      setCmdInput(val)
                                      setRoleAutocomplete(null)
                                      return
                                    }
                                    setCmdInput(val)
                                    // Try autocomplete
                                    const suggestion = getRoleAutocomplete(val)
                                    if (suggestion) {
                                      const afterAssign = val.match(/^(.*assigne\s+(?:au|à|a|l'|un)\s+)(.*)$/i)
                                      if (afterAssign) {
                                        const prefix = afterAssign[1]
                                        const completed = prefix + suggestion
                                        // Set full value then select the ghost part
                                        setCmdInput(completed)
                                        setRoleAutocomplete(suggestion)
                                        // Select the autocompleted portion
                                        requestAnimationFrame(() => {
                                          const el = document.getElementById('copilot-input') as HTMLInputElement
                                          if (el) el.setSelectionRange(val.length, completed.length)
                                        })
                                      }
                                    } else {
                                      setRoleAutocomplete(null)
                                    }
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') { const d = parseCmdInput(cmdInput, selectedTaskForDetail); if (d) applyCmdDiff(d) }
                                    if (e.key === 'Escape') { setCmdPaletteOpen(false); setCmdInput('') }
                                  }}
                                  placeholder="Ex: Assigne au Tech Lead, urgent, réduis à 8h..."
                                  className="w-full bg-white border border-cyan-200 rounded-xl px-4 py-3 text-slate-800 placeholder:text-slate-400 text-sm font-semibold outline-none focus:border-[#00BCD4] focus:shadow-[0_0_0_3px_rgba(0,188,212,0.15)] transition-all"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {[
                                  `Réduis à ${Math.max(2, selectedTaskForDetail.duration_hours - 4)}h`,
                                  'Réduis de moitié',
                                  'Urgent, prioritaire',
                                  'Priorité moyenne',
                                  'Basse priorité',
                                  'Assigne au Designer',
                                  'Assigne au DevOps',
                                  `Sprint suivant`,
                                  'Simplifie'
                                ].map((chip, ci) => (
                                  <button key={ci} onClick={() => setCmdInput(chip)} className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 hover:border-cyan-300 transition-colors">{chip}</button>
                                ))}
                              </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white/60">
                              {(() => {
                                const diff = parseCmdInput(cmdInput, selectedTaskForDetail)
                                if (cmdInput.trim().length < 3) return (
                                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 py-4">
                                    <Sparkles size={24} className="opacity-30 text-[#00BCD4]" />
                                    <p className="text-xs font-medium">Tapez en langage naturel</p>
                                  </div>
                                )
                                if (!diff) return (<div className="h-full flex flex-col items-center justify-center py-4">
                                  <p className="text-slate-400 text-sm">
                                    {cmdInput.trim().length >= 3 ? "Déjà à cette valeur — aucun changement nécessaire." : "Aucun changement détecté."}
                                  </p>
                                </div>)
                                return Object.entries(diff).map(([key, { field, before, after }], di) => (
                                  <motion.div key={key} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: di * 0.05 }} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-cyan-100 shadow-sm">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 shrink-0">{field}</span>
                                    <span className="text-sm text-rose-400 font-bold line-through">{String(before)}{key === 'duration_hours' ? 'h' : ''}</span>
                                    <span className="text-slate-400 text-xs">→</span>
                                    <span className="text-sm text-emerald-500 font-black">{String(after)}{key === 'duration_hours' ? 'h' : ''}</span>
                                  </motion.div>
                                ))
                              })()}
                            </div>
                            <div className="p-3 border-t border-cyan-100 shrink-0 bg-cyan-50/50">
                              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={() => applyCmdDiff(parseCmdInput(cmdInput, selectedTaskForDetail))}
                                disabled={!parseCmdInput(cmdInput, selectedTaskForDetail)}
                                className="w-full py-3 rounded-xl text-white text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                style={{ background: 'linear-gradient(135deg, #00BCD4, #0097a7)', boxShadow: '0 4px 12px rgba(0,188,212,0.3)' }}>
                                Appliquer
                              </motion.button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>  {/* end p-6 */}
          </div>  {/* end right panel */}
        </div>  {/* end two-panel flex */}
      </div>
    </>
  )
}
export default CreateProjectWizard




