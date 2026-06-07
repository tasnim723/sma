"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"
import {
  FileText, Upload, X, Check, ChevronRight, ChevronLeft,
  Sparkles, Trophy, Zap, Bot, Flame, Star, RefreshCw, CheckCircle2,
  BrainCircuit, ArrowRight, Eye, ExternalLink, PlayCircle, BookOpen,
  TrendingUp, Lightbulb, Target, ChevronDown, Building2, Calendar, GitCompare, Cpu, User, Send,
  Edit3, Trash2, Box, AlertTriangle, Clock, UserCheck, MoreHorizontal, AlertCircle, CheckCircle,
  MessageSquare, Layers, Gamepad2, Image as ImageIcon, Globe, Compass, Waves, Search, Boxes, Mic, Settings2, Play
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

type Step = "mode" | "industry" | "warroom-input" | "warroom-agents" | "warroom-pick" | "warroom-params" | "warroom-tech" | "loading" | "done" | "import-details" | "comprehension" | "clarification" | "concept-validation" | "contraintes" | "design-brief" | "ideation" | "feasibility" | "projet-details" | "fonctionnalites" | "validation" | "prototype"
type Mode = "import" | "idea"
type DetailsTab = "design" | "technique" | "architecture" | "planification" | "synthese"

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
  team_distribution: { dev: number; design: number; three_d: number }
  deliverables: string[]
  scenarios: {
    fast: { duration_weeks: number; description: string }
    balanced: { duration_weeks: number; description: string }
    advanced: { duration_weeks: number; description: string }
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

const CreateProjectWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const router = useRouter()
  const { token } = useAuthStore()
  const { lang, t } = useLang()
  const { theme } = useThemeStore()
  const [step, setStep] = useState<Step>("mode")
  const [mode, setMode] = useState<Mode | null>(null)

  // Form
  const [projectName, setProjectName] = useState("")
  const [rawIdea, setRawIdea] = useState("")
  const [industry, setIndustry] = useState("game")
  const [deadline, setDeadline] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [files, setFiles] = useState<File[]>([])

  // War Room
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([])
  const [topIdeas, setTopIdeas] = useState<TopIdea[]>([])
  const [selectedIdea, setSelectedIdea] = useState<TopIdea | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // War Room Iterative (Vagues)
  const [waveIteration, setWaveIteration] = useState(1)
  const [starredIdeaId, setStarredIdeaId] = useState<string | null>(null)
  const [waveFeedback, setWaveFeedback] = useState("")

  // Tech Watch
  const [articles, setArticles] = useState<TechArticle[]>([])
  const [selectedArticle, setSelectedArticle] = useState<TechArticle | null>(null)
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
  const [detailsTab, setDetailsTab] = useState<DetailsTab>("design")
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
  const [selectedRepoFile, setSelectedRepoFile] = useState<string|null>(null)
  const [stackBattleChoice, setStackBattleChoice] = useState<'original'|'alternative'>('original')

  // ── MANAGER EDITABLE FIELDS (chaque étape est modifiable) ─────────────────
  // Étape 2: compréhension éditable
  const [editComp, setEditComp] = useState<{
    project_type: string; pedagogical_objective: string;
    estimated_duration: string; complexity_level: string; target_team: string;
  } | null>(null)
  // Étape 4: contraintes (guided chat)
  const [constraints, setConstraints] = useState({
    budget: "", teamSize: "", deadline: "", techConstraints: "", targetUsers: "", mainObjective: ""
  })
  const projectNameStr = selectedIdea?.title || projectName || "ce projet";
  const CONTRAINTES_QUESTIONS = React.useMemo(() => [
    { key: "mainObjective", q: `🎯 Objectif métier principal pour ${projectNameStr} (Ex: Lancement grand public, MVP investisseurs...)` },
    { key: "targetUsers", q: `👥 Utilisateurs cibles (Ex: Professionnels B2B, Étudiants, Grand public...)` },
    { key: "budget", q: `💰 Budget disponible (Ex: Projet bénévole, 5 000€, Budget illimité...)` },
    { key: "teamSize", q: `🧑‍🤝‍🧑 Taille de l'équipe (Ex: Indépendant, 2 devs + 1 designer...)` },
    { key: "techConstraints", q: `⚙️ Contraintes techniques (Ex: Obligatoire: Mobile-first, Interdit: cloud payant...)` }
  ], [projectNameStr]);

  const [contraintesChat, setContraintesChat] = useState<{ role: "ai" | "user", content: string }[]>([]);

  useEffect(() => {
    if (step === "contraintes" && contraintesChat.length === 0) {
      setContraintesChat([
        { role: "ai", content: `Bonjour ! Pour bien cadrer le développement de ${projectNameStr}, je vais vous poser 5 questions rapides. (Appuyez sur Entrée pour répondre, ou laissez vide pour passer).` },
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
  const [managerFeatures, setManagerFeatures] = useState<ProjectTask[]>([])
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([])
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<ProjectTask | null>(null)

  // NEW: Copilot Prompt-to-UI states
  const [copilotPrompt, setCopilotPrompt] = useState("")
  const [isCopilotThinking, setIsCopilotThinking] = useState(false)
  const [copilotTheme, setCopilotTheme] = useState<{bg:string, cardBg:string, border:string, text:string, shadow:string, radius:string}>({
    bg: '#f1f5f9', cardBg: '#ffffff', border: '#cbd5e1', text: '#334155', shadow: '0 10px 15px -3px rgba(0,0,0,0.1)', radius: '16px'
  })
  const [timeLapseWeek, setTimeLapseWeek] = useState(1)
  const [isPitchPlaying, setIsPitchPlaying] = useState(false)
  const [pitchProgress, setPitchProgress] = useState(0)

  // NEW: Feasibility Analysis
  const [feasibilityData, setFeasibilityData] = useState<any>(null)
  const [isLoadingFeasibility, setIsLoadingFeasibility] = useState(false)

  // NEW: Expanded project cards (ideation step)
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set())
  const [whatIfOverrides, setWhatIfOverrides] = useState<{budgetCut?:boolean;mvpSpeed?:boolean;b2b?:boolean;junior?:boolean}>({})
  const [devilsAdvocateMode, setDevilsAdvocateMode] = useState(false)

  // NEW: Micro-Chat Contextuel pour chaque carte
  const [cardChats, setCardChats] = useState<Record<number, {role:'user'|'ai', content:string}[]>>({})
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
  const [semanticAlerts, setSemanticAlerts] = useState<{word:string, msg:string, type:'warning'|'success'}[]>([])

  useEffect(() => {
    if (step === 'concept-validation' && selectedProject) {
      setSemanticVision(selectedProject.description || "")
      analyzeSemantics(selectedProject.description || "")
    }
  }, [step, selectedProject])

  const analyzeSemantics = (text: string) => {
    const alerts: {word:string, msg:string, type:'warning'|'success'}[] = []
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
    } catch (err) { console.error("Copilot finalize error:", err) }
    finally { setIsSubmittingFeedback(false) }
  }

  // ── STOP copilot recording ─────────────────────────────────────────────────
  const stopCopilotRecording = (discard = false) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // signal discard before stopping so onstop handler can check
      (mediaRecorderRef.current as any)._discard = discard
      mediaRecorderRef.current.stop()
    }
    if (copilotStreamRef.current) {
      copilotStreamRef.current.getTracks().forEach(t => t.stop())
      copilotStreamRef.current = null
    }
    clearInterval(copilotTimerRef.current)
    setIsListeningCopilot(false)
    setCopilotRecordingDuration(0)
  }

  // ── START copilot recording — same approach as FloatingAIChat chatbot ───────
  const startCopilotVoice = async () => {
    // Toggle off if already recording
    if (isListeningCopilot) {
      stopCopilotRecording(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      copilotStreamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      copilotChunksRef.current = []
      ;(recorder as any)._discard = false

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) copilotChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if ((recorder as any)._discard) {
          copilotChunksRef.current = []
          return
        }
        const audioBlob = new Blob(copilotChunksRef.current, { type: 'audio/webm' })
        if (audioBlob.size < 1000) return // too short — ignore

        // Send to backend /api/ai/voice — same endpoint as chatbot
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
          } else {
            showToast('Transcription vide. Réessayez.', 'warning')
          }
        } catch (err) {
          console.error('Voice transcription error:', err)
          showToast('Erreur de transcription. Vérifiez le backend.', 'error')
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
      setStep("ideation")
    }
  }, [ideationReady, waitingForIdeation])

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

    // Auto-advance to next step when a file is mapped in Import mode
    if (mode === "import" || true) {
      setTimeout(() => {
        const fileNames = acceptedFiles.map(f => f.name).join(" ");
        launchComprehension(`Projet : ${projectName || 'Nouveau'} - Fichiers : ${fileNames}`);
      }, 800); 
    }
  }, [projectName, mode]) // Added dependencies
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
      steps: [
        { step: "industry", label: "Secteur" },
        { step: "mode", label: "Entrée" },
        { step: "warroom-input", label: "Saisie" },
        { step: "import-details", label: "Import" },
        { step: "warroom-agents", label: "Agents" },
        { step: "warroom-pick", label: "Orientations" },
        { step: "warroom-params", label: "Paramètres" },
        { step: "comprehension", label: "Analyse" },
        { step: "clarification", label: "Affinage" },
        { step: "contraintes", label: "Contraintes" },
        { step: "design-brief", label: "Vision" },
        { step: "warroom-tech", label: "Veille tech" },
        { step: "ideation", label: "Directions" },
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
        { step: "validation", label: "Validation" },
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
    mode: 1, industry: 1, "warroom-input": 1, "import-details": 1, 
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
          weeks: scenario?.duration_weeks || 12
        })
      })
      if (!res.ok) throw new Error(`Feasibility failed: ${res.status}`)
      const data = await res.json()
      setFeasibilityData(data)
    } catch (err) {
      console.error("Feasibility error:", err)
    } finally {
      setIsLoadingFeasibility(false)
    }
  }
  const launchComprehension = async (clarAnswers?: string) => {
    setStep("comprehension")
    setIsGenerating12(true)
    setIdeationReady(false)
    setGeneratedProjects([])
    setGenerating12Msg("Analyse sémantique de votre demande...")
    try {
      const fd = new FormData()
      fd.append("manager_input", rawIdea)
      fd.append("project_name", projectName)
      if (clarAnswers) fd.append("clarification_answers", clarAnswers)
      const res = await fetch(`${API_BASE_URL}/api/wizard/comprehend`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      setComprehensionData(data)
      setIsGenerating12(false)
      // Toujours rester sur comprehension — l'utilisateur clique "Continuer → Veille Tech"
    } catch (err) {
      console.error("Comprehension error:", err)
      setIsGenerating12(false)
      setStep("warroom-input")
    }
  }

  // Alias pour compatibilité (step clarification re-lance avec les réponses)
  const launchGeneration = launchComprehension

  // Phase 2a: utilisateur confirme la compréhension → va sur Veille Tech + lance idéation en arrière-plan
  const handleComprehensionContinue = () => {
    setStep("warroom-tech")
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
        setStep("ideation");
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
      
      const res = await axios.post(`${API_BASE_URL}/api/wizard/generate-detailed-tasks`, fd, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.data && res.data.status === "error") {
        console.error("Task generation error:", res.data.message)
        return
      }

      if (Array.isArray(res.data)) {
        setManagerFeatures(res.data)
        // Skip redundant audit call as data is now integrated from the start
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
    setSelectedArticle(null)
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

  const analyzeTrend = async (article: TechArticle) => {
    setIsAnalyzing(true)
    setTechSubPhase("analyzing")
    const desc = mode === "import" ? `Projet basé sur le cahier des charges : ${projectName}` : (selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/analyze-trend`, {
        project_name: projectName,
        project_description: desc,
        trend_title: article.title,
        trend_category: article.category,
        trend_snippet: article.snippet
      }, { headers: { Authorization: `Bearer ${token}` } })
      setAnalysisPlan(res.data)
      setTechSubPhase("plan")
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
    formData.append("project_name", projectName)

    if (mode === "import") {
      files.forEach(f => formData.append("files", f))
      formData.append("description", finalDescription)
    } else {
      formData.append("description", finalDescription)
      if (deadline) formData.append("deadline", deadline)
      if (teamSize) formData.append("team_size", teamSize)
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
      "> Lancement du Protocole de Sauvetage IA...",
      "> Analyse des dépendances et de la dette technique...",
      "> DANGER : Budget insuffisant détecté.",
      "> Amputation des modules non-essentiels (Moteur 3D, Microservices)...",
      "> Migration vers une architecture Serverless / Monolithique...",
      "> Réduction de l'équipe à 2 développeurs Full-Stack...",
      "> Compilation de la nouvelle stratégie MVP Strict...",
      "> PROTOCOLE TERMINÉ. Projet sauvé."
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

  if (feasibilityData) {
    simulatedScore = Math.max(10, Math.min(100, Math.round(feasibilityData.feasibility_score * (budgetPressure/100) * (timePressure/100))));
    simulatedBudgetMin = Math.round((feasibilityData.cost_dt?.min||0) * (budgetPressure/100));
    simulatedBudgetMax = Math.round((feasibilityData.cost_dt?.max||0) * (budgetPressure/100));
    simulatedDuration = Math.max(1, Math.round((feasibilityData.duration?.realistic_weeks||12) * (timePressure/100)));
    simulatedRecommendation = simulatedScore > 75 ? 'success' : simulatedScore > 40 ? 'warning' : 'danger';
    displayedSummary = feasibilityData.summary;

    if (isRescueModeActive) {
      simulatedScore = 85;
      simulatedRecommendation = 'success';
      displayedSummary = "MODE SURVIE ACTIVÉ : Projet converti en MVP Ultra-Lean. Stack simplifiée. Mise sur le marché priorisée.";
      simulatedBudgetMin = Math.round(simulatedBudgetMin * 0.4); // Drastic cut
      simulatedBudgetMax = Math.round(simulatedBudgetMax * 0.4);
      simulatedDuration = Math.max(1, Math.round(simulatedDuration * 0.5));
    }
  }

  return (
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
            className={`absolute top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-xl max-w-[90%] min-w-[260px] ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/40 text-red-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
                : 'bg-slate-900/90 border-cyan-500/40 text-cyan-100'
            }`}
          >
            <span className={`text-lg shrink-0 ${
              toast.type === 'error' ? 'text-red-400' : toast.type === 'warning' ? 'text-amber-400' : 'text-cyan-400'
            }`}>
              {toast.type === 'error' ? '⚠️' : toast.type === 'warning' ? '🔔' : 'ℹ️'}
            </span>
            <p className="text-xs font-semibold leading-snug flex-1">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all ml-1"
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

        {/* ── LEFT SIDEBAR: Collapsible Phase Breadcrumb ── */}
        {step !== "mode" && (
          <div className="group w-16 hover:w-56 shrink-0 border-r border-slate-100/50 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex flex-col gap-4 py-6 transition-all duration-300 z-20">
            {PHASES.map(phase => {
              const isCurrentPhase = currentPhase === phase.id
              const isDonePhase = currentPhase > phase.id

              return (
                <div key={phase.id} className="relative flex items-center px-3">
                  {/* Active Indicator line with Neon Glow */}
                  {isCurrentPhase && (
                    <motion.div 
                      layoutId="activePhaseLine" 
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r-full shadow-[0_0_15px_rgba(34,211,238,0.8)]" 
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  
                  <button
                    onClick={() => {}}
                    className={`flex items-center gap-3 w-full p-2 rounded-xl transition-all ${isCurrentPhase ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white' : isDonePhase ? 'text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'text-slate-500 dark:text-slate-400'}`}
                  >
                    <span className={`w-6 h-6 flex items-center justify-center text-sm shrink-0`}>
                      {isDonePhase ? <Check size={14} className="text-[#00BCD4]" /> : phase.icon}
                    </span>
                    <div className="flex-1 min-w-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-left">
                      <p className={`text-[11px] font-bold uppercase tracking-widest truncate ${isCurrentPhase ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {phase.label}
                      </p>
                      {phase.id === 4 && <p className="text-[9px] text-slate-500 font-medium">Silencieux</p>}
                    </div>
                  </button>
                </div>
              )
            })}

            {/* Spacer + close button at bottom */}
            <div className="flex-1" />
            <div className="px-3">
               <button onClick={onClose} className="w-full flex items-center gap-3 p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                 <X size={14} className="shrink-0" />
                 <span className="text-[11px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Quitter</span>
               </button>
            </div>
          </div>
        )}

        {/* ── RIGHT: Main Content ── */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] no-scrollbar">
        <div className="p-6 pt-4">

          {/* Top Contextual Stepper */}
          {step !== "mode" && step !== "done" && (
            <div className="mb-4 flex flex-wrap items-center justify-center gap-3 px-4 overflow-hidden">
              {PHASES.find(p => p.id === currentPhase)?.steps
                .map((s, i, arr) => {
                  const currentPhaseObj = PHASES.find(p => p.id === currentPhase)
                  const phaseStepKeys = currentPhaseObj ? currentPhaseObj.steps.map(x => x.step) : []
                  const thisIdx = phaseStepKeys.indexOf(s.step)
                  const currentIdx = phaseStepKeys.indexOf(step)
                  const isActive = step === s.step
                  const isDone = currentIdx > thisIdx

                  return (
                    <div key={s.step} className="flex items-center gap-3 shrink-0">
                      <div className={`flex flex-col items-center transition-all ${isActive ? 'opacity-100' : isDone ? 'opacity-80' : 'opacity-60'}`}>
                        <div className="flex items-center gap-1.5">
                          {isDone && !isActive && <Check size={10} className="text-[#00BCD4]" />}
                          <span className={`text-[10px] font-black tracking-widest uppercase transition-all ${isActive ? 'text-cyan-400 dark:text-cyan-400 border-b-2 border-cyan-400 pb-0.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-700 dark:text-slate-300'}`}>
                            {s.label}
                          </span>
                        </div>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="w-8 h-[1px] bg-slate-200 dark:bg-slate-800" />
                      )}
                    </div>
                  )
                })}
            </div>
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
              <motion.div key="warroom-input" variants={fade} initial="initial" animate="animate" exit="exit" className="max-w-xl mx-auto space-y-4 pt-2 pb-2">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-turquoise-400 to-cyan-400 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">War Room — Décrivez votre idée</h2>
                  <p className="text-sm text-cyan-700 dark:text-cyan-300 font-black tracking-widest uppercase">Les agents IA vont l'analyser et synthétiser le Top 3 des orientations</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[13px] font-bold text-cyan-600 dark:text-cyan-400 ml-1 uppercase tracking-widest">{lang === 'fr' ? 'Nom du projet' : 'Project Name'}</Label>
                    <motion.div 
                      className="relative rounded-2xl p-[2px] overflow-hidden"
                      animate={{ background: ["linear-gradient(90deg, #06b6d4, #0891b2, #06b6d4)", "linear-gradient(90deg, #0891b2, #06b6d4, #0891b2)"] }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <Input
                        value={projectName}
                        onChange={e => setProjectName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && projectName.trim() && rawIdea.trim().length >= 15) launchGeneration();
                        }}
                        placeholder="ex. Simulation VR de formation, Jeu 3D Éducatif"
                        className="h-14 text-base text-slate-900 dark:text-white border-transparent shadow-none focus:ring-0 focus:border-transparent bg-white dark:bg-slate-950 rounded-[calc(1rem-1px)] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 px-5 relative z-10"
                      />
                      <motion.div 
                        className="absolute inset-0 z-0 bg-cyan-400 opacity-20 blur-md"
                        animate={{ opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[13px] font-bold text-cyan-600 dark:text-cyan-400 ml-1 uppercase tracking-widest">{lang === 'fr' ? 'Votre idée brute' : 'Your Raw Idea'}</Label>
                    <motion.div 
                      className="relative rounded-2xl p-[2px] overflow-hidden"
                      animate={{ background: ["linear-gradient(180deg, #06b6d4, #22d3ee, #06b6d4)", "linear-gradient(180deg, #22d3ee, #06b6d4, #22d3ee)"] }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
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
                        className="min-h-[160px] text-base text-slate-900 dark:text-white border-transparent shadow-none focus:ring-0 focus:border-transparent bg-white dark:bg-slate-950 rounded-[calc(1rem-1px)] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none p-5 relative z-10"
                      />
                      <motion.div 
                        className="absolute inset-0 z-0 bg-cyan-400 opacity-20 blur-lg"
                        animate={{ opacity: [0.1, 0.4, 0.1] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      />
                    </motion.div>
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <Button variant="ghost" onClick={() => setStep("mode")} className="rounded-2xl text-slate-400 hover:text-slate-600 px-6 font-bold uppercase tracking-widest text-[10px]">
                    {lang === 'fr' ? 'Retour' : 'Back'}
                  </Button>
                  <motion.div className="flex-1" animate={projectName.trim() && rawIdea.trim().length >= 15 ? { scale: [1, 1.02, 1], boxShadow: ["0 0 20px rgba(6,182,212,0.4)", "0 0 40px rgba(6,182,212,0.8)", "0 0 20px rgba(6,182,212,0.4)"] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                    <Button
                      disabled={!projectName.trim() || rawIdea.trim().length < 15}
                      onClick={() => startCopilot()}
                      className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 border border-cyan-300/50"
                    >
                      <BrainCircuit size={18} className="mr-2 opacity-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" /> {lang === 'fr' ? "Continuer" : "Continue"}
                    </Button>
                    {/* Mode selector subtle */}
                    <div className="flex gap-2 mt-2 justify-center">
                      <button onClick={() => setCopilotMode('creative')} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${copilotMode === 'creative' ? 'bg-cyan-400 text-white border-cyan-400' : 'border-slate-200 text-slate-400 hover:border-cyan-300'}`}>✨ Créatif</button>
                      <button onClick={() => setCopilotMode('critical')} className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${copilotMode === 'critical' ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 text-slate-400 hover:border-rose-300'}`}>🔥 Critique</button>
                    </div>
                  </motion.div>
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
                        <motion.div className="flex-1" animate={{ scale: [1, 1.01, 1], boxShadow: ["0 0 15px rgba(34,211,238,0.2)", "0 0 30px rgba(34,211,238,0.4)", "0 0 15px rgba(34,211,238,0.2)"] }} transition={{ duration: 3, repeat: Infinity }}>
                          <Button onClick={() => { setComprehensionData({ ...ed }); setStep("contraintes"); }} className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm border border-cyan-300/30">
                            Confirmer & Continuer <ArrowRight size={16} className="ml-2" />
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
                    <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">ÉTAPE 4 — Contraintes & Contexte</h2>
                    <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Définissez vos contraintes · Les champs sont optionnels</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-cyan-50/30 dark:bg-blue-900/10 rounded-2xl p-4 h-64 overflow-y-auto flex flex-col gap-3 border border-cyan-100 dark:border-blue-800/40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {contraintesChat.map((msg, idx) => (
                      <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "ai" && <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0"><Bot size={12} className="text-cyan-600 dark:text-cyan-400" /></div>}
                        <div className={`p-2.5 rounded-2xl text-xs max-w-[85%] ${msg.role === "user" ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-white rounded-tr-sm shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "bg-white dark:bg-blue-950/40 text-slate-700 dark:text-blue-100 border border-cyan-100 dark:border-blue-800/40 rounded-tl-sm shadow-sm"}`}>
                          {msg.content}
                        </div>
                        {msg.role === "user" && <div className="w-6 h-6 rounded-full bg-cyan-200 dark:bg-blue-800 flex items-center justify-center shrink-0"><User size={12} className="text-cyan-600 dark:text-blue-200" /></div>}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
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
                        newHistory.push({ role: "ai" as const, content: "✅ C'est noté ! J'ai intégré toutes vos contraintes. Vous pouvez valider et passer au design." })
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
                  <Button variant="ghost" onClick={() => setStep("comprehension")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">← Retour</Button>
                  <motion.div className="flex-1" animate={contraintesStepIndex >= CONTRAINTES_QUESTIONS.length ? { scale: [1, 1.02, 1], boxShadow: ["0 0 20px rgba(34,211,238,0.4)", "0 0 40px rgba(34,211,238,0.8)", "0 0 20px rgba(34,211,238,0.4)"] } : {}} transition={{ duration: 2, repeat: Infinity }}>
                    <Button
                      disabled={contraintesStepIndex < CONTRAINTES_QUESTIONS.length}
                      onClick={() => setStep("design-brief")}
                      className={`w-full py-6 rounded-2xl font-black transition-all duration-300 uppercase tracking-widest text-sm ${contraintesStepIndex < CONTRAINTES_QUESTIONS.length ? "bg-slate-100 text-slate-400 dark:bg-blue-900/20 dark:text-blue-500/50" : "bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white shadow-xl border border-cyan-300/30"}`}
                    >
                      <Zap size={15} className="mr-2" /> Valider &amp; Choisir le Design
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {/* ─── ÉTAPE 5 : DESIGN BRIEF (Nouvelle V2) ─── */}
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
                        className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white h-12 rounded-xl font-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all"
                      >
                        Continuer <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ─── ÉTAPE 7 : IDÉATION — Sélection visuelle avec images ─── */}
            {step === "ideation" && (() => {
              const isLoading = generatedProjects.length === 0

              // ── Domain ambient theme ─────────────────────────────────────────
              const ind = (industry || '').toLowerCase()
              const theme = ind.includes('vr') || ind.includes('game')
                ? { from: 'from-cyan-950', via: 'via-blue-950', accent: '#00d4ff', particle: 'bg-cyan-400' }
                : ind.includes('finance') || ind.includes('banque')
                ? { from: 'from-emerald-950', via: 'via-teal-950', accent: '#10b981', particle: 'bg-emerald-400' }
                : ind.includes('santé') || ind.includes('health') || ind.includes('médical')
                ? { from: 'from-sky-950', via: 'via-blue-950', accent: '#38bdf8', particle: 'bg-sky-400' }
                : { from: 'from-violet-950', via: 'via-purple-950', accent: '#a78bfa', particle: 'bg-violet-400' }

              // ── AI Scoring Engine ────────────────────────────────────────────
              const budgetText = (constraints.budget || '').toLowerCase()
              const objText    = (constraints.mainObjective || '').toLowerCase()
              const teamText   = (constraints.teamSize || '').toLowerCase()
              const isBudgetLimited = budgetText.includes('limité') || budgetText.includes('faible') || budgetText.includes('bénévole')
              const isSmallTeam     = teamText.includes('1') || teamText.includes('solo') || teamText.includes('indép')
              const wantsROI        = objText.includes('roi') || objText.includes('invest') || objText.includes('profit')
              const wantsSpeed      = objText.includes('rapide') || objText.includes('mvp') || objText.includes('vite')
              const wantsInnovation = objText.includes('innov') || objText.includes('pionnier') || objText.includes('avancé')

              const scoreProject = (proj: GeneratedProject) => {
                const dur = proj.scenarios?.balanced?.duration_weeks ?? 12
                const innov = proj.innovation_score ?? 70
                const comp  = proj.comparison_score ?? 70
                const isLow = proj.complexity === 'LOW'
                const isMed = proj.complexity === 'MEDIUM'
                const isHigh = proj.complexity === 'HIGH'
                
                // Simulateur "What-If" modifiers
                const budgetMod = (budgetPressure - 100) / 100 
                const timeMod = (timePressure - 100) / 100 

                const roiBudgetEffect = isHigh ? budgetMod * 60 : isMed ? budgetMod * 20 : budgetMod * -10
                const roi = Math.min(99, Math.max(10, comp + (isBudgetLimited ? 8 : 0) - (isHigh ? 12 : 0) + (wantsROI ? 10 : 0) + roiBudgetEffect))
                
                const fastTimeEffect = isHigh ? timeMod * 80 : isMed ? timeMod * 40 : timeMod * -20
                const fast = Math.min(99, Math.max(10, 100 - dur * 3 + (isLow ? 18 : isMed ? 8 : 0) + (wantsSpeed ? 12 : 0) + fastTimeEffect))

                const feasibBudgetEffect = isHigh ? budgetMod * 50 : isLow ? 0 : budgetMod * 20
                const feasibTimeEffect = isHigh ? timeMod * 50 : isLow ? timeMod * 10 : timeMod * 30
                const feasib = Math.min(99, Math.max(10, (isLow ? 85 : isMed ? 70 : 55) + (isSmallTeam ? -10 : 5) + feasibBudgetEffect + feasibTimeEffect))
                
                const scalab = Math.min(99, Math.max(10, 55 + innov * 0.3 + (proj.modules?.length || 0) * 3))
                const marketPot = Math.min(99, Math.max(10, comp * 0.6 + innov * 0.4))
                const risk = Math.min(99, Math.max(10, 100 - (isLow ? 25 : isMed ? 15 : 5) - (isBudgetLimited ? 10 : 0) - feasibBudgetEffect - feasibTimeEffect))
                const successPct = Math.round((roi * 0.25 + fast * 0.15 + innov * 0.2 + feasib * 0.25 + scalab * 0.15))
                const recScore   = roi * (wantsROI ? 1.5 : 0.5) + fast * (wantsSpeed ? 1.4 : 0.4)
                                 + innov * (wantsInnovation ? 1.5 : 0.4) + feasib * 0.6 + scalab * 0.3
                // Primary badge
                const signals = [
                  { key: 'rec',   val: recScore },
                  { key: 'innov', val: innov + (wantsInnovation ? 25 : 0) },
                  { key: 'roi',   val: roi   + (wantsROI ? 25 : 0) },
                  { key: 'fast',  val: fast  + (wantsSpeed ? 25 : 0) },
                  { key: 'safe',  val: risk  + (isBudgetLimited ? 20 : 0) },
                ]
                if (!wantsROI && !wantsSpeed && !wantsInnovation) {
                  if (innov >= 82) signals[1].val += 30
                  else if (dur <= 8) signals[3].val += 30
                  else if (comp >= 82) signals[2].val += 30
                  else signals[4].val += 30
                }
                const topSignal = signals.slice(1).reduce((a, b) => b.val > a.val ? b : a)
                return { roi, fast, scalab, feasib, marketPot, risk, innov, successPct, recScore, badgeKey: topSignal.key }
              }

              const BADGE_CFG: Record<string, { label: string; emoji: string; tw: string; glow: string; gradFrom: string; gradTo: string }> = {
                rec:   { label: 'Recommandé', emoji: '🔥', tw: 'text-orange-200 border-orange-400/60 bg-orange-500/20',   glow: 'shadow-orange-500/30',  gradFrom: 'from-orange-600',  gradTo: 'to-rose-600' },
                innov: { label: 'Le plus innovant', emoji: '🚀', tw: 'text-violet-200 border-violet-400/60 bg-violet-500/20', glow: 'shadow-violet-500/30', gradFrom: 'from-violet-600', gradTo: 'to-fuchsia-600' },
                roi:   { label: 'Meilleur ROI', emoji: '💰', tw: 'text-amber-200 border-amber-400/60 bg-amber-500/20',    glow: 'shadow-amber-500/30',   gradFrom: 'from-amber-500',   gradTo: 'to-orange-500' },
                fast:  { label: 'Rapide à lancer', emoji: '⚡', tw: 'text-emerald-200 border-emerald-400/60 bg-emerald-500/20', glow: 'shadow-emerald-500/30', gradFrom: 'from-emerald-500', gradTo: 'to-teal-500' },
                safe:  { label: 'Faible risque', emoji: '🛡️', tw: 'text-blue-200 border-blue-400/60 bg-blue-500/20',    glow: 'shadow-blue-500/30',    gradFrom: 'from-blue-600',    gradTo: 'to-sky-600' },
              }

              const scored = generatedProjects.map(proj => ({ proj, ...scoreProject(proj) }))
              const topRec = scored.length > 0 ? scored.reduce((a, b) => b.recScore > a.recScore ? b : a) : null

              const whyText = (s: typeof scored[0]) => {
                const dur = s.proj.scenarios?.balanced?.duration_weeks
                const reasons: string[] = []
                if (s.innov >= 80)     reasons.push(`Innovation ${s.innov}% — technologies avant-gardistes`)
                if (s.fast >= 75)      reasons.push(`Livrable en ${dur} semaines — lancement rapide`)
                if (s.roi >= 78)       reasons.push(`Fort potentiel ROI estimé à ${s.roi}%`)
                if (s.feasib >= 75)    reasons.push(`Faisabilité technique élevée — risque maîtrisé`)
                if (s.scalab >= 75)    reasons.push(`Architecture scalable — croissance facilitée`)
                if (s.marketPot >= 75) reasons.push(`Potentiel marché fort dans le secteur ${industry}`)
                if (reasons.length === 0) reasons.push(`Compatible avec votre profil et vos contraintes`)
                return reasons.slice(0, 4)
              }

              return (
                <motion.div key="ideation" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                      <span className="text-base drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">🤖</span>
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">ÉTAPE 5 — Choix du Projet</h2>
                      <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">
                        {isLoading ? "Analyse multi-agents en cours..." : `${generatedProjects.length} projets analysés · Sélectionnez votre direction`}
                      </p>
                    </div>
                  </div>

                  {isLoading ? (
                    /* ── PREMIUM LOADING ── */
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-8 text-center space-y-6 border border-violet-800/40">
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.15),transparent_70%)] pointer-events-none" />
                      <div className="relative flex flex-col items-center gap-5">
                        <div className="relative w-20 h-20">
                          <div className="absolute inset-0 rounded-full border-2 border-violet-500/30 animate-ping" />
                          <div className="absolute inset-2 rounded-full border-2 border-fuchsia-400/40 animate-ping" style={{animationDelay:'0.3s'}} />
                          <div className="w-20 h-20 rounded-full border-[3px] border-violet-800 border-t-violet-400 animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl">🧠</span></div>
                        </div>
                        <div className="space-y-1">
                          <p className="font-black text-white text-sm animate-pulse">Analyse stratégique multi-critères...</p>
                          <p className="text-[11px] text-violet-300/70 font-medium">Innovation · ROI · Scalabilité · Faisabilité · Risque</p>
                        </div>
                        <div className="w-full space-y-2">
                          {['Analyse du secteur et du contexte', 'Scoring innovation & marché', 'Calcul ROI et faisabilité', 'Génération des recommandations'].map((label, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] text-violet-300/60 font-bold">
                              <div className="w-3 h-3 rounded-full border border-violet-500/50 animate-pulse" style={{animationDelay:`${i*0.4}s`}} />
                              <span className="uppercase tracking-widest">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                  ) : (() => {
                    // ── Comparison table data ──────────────────────────────
                    const riskLabel = (c:string) => c==='LOW'?'Accessible':c==='MEDIUM'?'Moyen':'Complexe'
                    const riskColor = (c:string) => c==='LOW'?'text-emerald-600 bg-emerald-50':c==='MEDIUM'?'text-amber-600 bg-amber-50':'text-rose-600 bg-rose-50'

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6 relative z-20">

                        {/* ── 1. BADGES RECOMMANDATIONS ─────────────────────────────────── */}
                        <div className="flex gap-2 flex-wrap pb-2 border-b border-cyan-100/20 dark:border-blue-800/30 items-center">
                          {scored.length>0 && (() => {
                            const fastest = scored.reduce((a,b)=>(a.fast>b.fast?a:b))
                            const bestROI  = scored.reduce((a,b)=>(a.roi>b.roi?a:b))
                            const mostInn  = scored.reduce((a,b)=>(a.innov>b.innov?a:b))
                            return <>
                              <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.2)] cursor-default">
                                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span>
                                Rapide : {fastest.proj.title.split(' ').slice(0,2).join(' ')}
                          </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-default">
                                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span></span>
                                ROI : {bestROI.proj.title.split(' ').slice(0,2).join(' ')}
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-full bg-[#7B2DFF]/10 text-[#7B2DFF] dark:text-[#a77bff] border border-[#7B2DFF]/30 backdrop-blur-md shadow-[0_0_15px_rgba(123,45,255,0.2)] cursor-default">
                                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2DFF] opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#7B2DFF]"></span></span>
                                Innovant : {mostInn.proj.title.split(' ').slice(0,2).join(' ')}
                              </span>
                              
                              <div className="ml-auto flex items-center">
                                <button
                                  onClick={() => setDevilsAdvocateMode(!devilsAdvocateMode)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${
                                    devilsAdvocateMode 
                                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse' 
                                      : 'bg-white/50 text-slate-500 border-slate-200/50 hover:bg-slate-100 hover:text-slate-700 backdrop-blur-sm'
                                  }`}
                                >
                                  {devilsAdvocateMode ? '😈 Mode Avocat du Diable' : '😇 Activer l\'Avocat du Diable'}
                                </button>
                              </div>
                            </>
                          })()}
                        </div>

                        {/* ── 2. SCANNABLE PROJECT CARDS ─────────────────────────── */}
                        <div className="flex flex-col gap-4">
                          {scored.map((s,i)=>{
                            const isSelected = selectedProject?.id===s.proj.id
                            const isTop = topRec?.proj.id===s.proj.id
                            const bdg = BADGE_CFG[s.badgeKey]
                            const kpis = [
                              {icon:'🚀',label:'Innovation',val:s.innov,desc:s.innov>=80?'Bon potentiel différenciant':s.innov>=65?'Potentiel correct':'Potentiel modéré', color:'bg-violet-500'},
                              {icon:'💰',label:'ROI',val:s.roi,desc:s.roi>=80?'Rentabilité élevée':s.roi>=65?'Rentabilité moyenne/haute':'Rentabilité modérée', color:'bg-amber-400'},
                              {icon:'⚙️',label:'Faisabilité',val:s.feasib,desc:s.feasib>=80?'Très réalisable rapidement':s.feasib>=65?'Réalisable':'Complexe à livrer', color:'bg-emerald-500'},
                            ]
                            
                            return (
                              <motion.div key={s.proj.id} 
                                initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}} 
                                className="flex flex-col relative z-10 cursor-grab active:cursor-grabbing"
                                drag dragSnapToOrigin
                                whileDrag={{ scale: 1.02, zIndex: 50, rotate: 2, opacity: 0.95 }}
                                onDragEnd={(e, info) => {
                                  if (info.offset.x > 150) {
                                    setSelectedProject(s.proj);
                                    setManagerFeatures([]);
                                    setManagerDeliverables(s.proj.deliverables||[]);
                                    setStep("concept-validation");
                                  }
                                }}
                              >

                                {/* ── MAIN ROW (collapsed state) ── */}
                                <div className={`flex flex-row overflow-hidden transition-all duration-300 relative group min-h-[120px] border ${
                                  expandedCards.has(s.proj.id) ? 'rounded-t-2xl' : 'rounded-2xl'
                                } ${
                                  isSelected ? 'border-cyan-300/50 bg-cyan-50/30 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.15)] ring-1 ring-cyan-300/30' :
                                  isTop ? 'border-violet-200/50 bg-violet-50/20 backdrop-blur-md shadow-[0_4px_15px_rgba(139,92,246,0.1)]' :
                                  'border-slate-200/40 bg-white/25 backdrop-blur-md shadow-sm hover:shadow-[0_4px_15px_rgba(34,211,238,0.1)] hover:border-cyan-200/50'}`}
                                >
                                  {/* IMAGE — left */}
                                  <div className="relative w-40 shrink-0 overflow-hidden bg-slate-900 rounded-l-2xl">
                                    <img src={`https://image.pollinations.ai/prompt/${getDynamicImagePrompt(s.proj)}?width=400&height=300&nologo=true&model=flux&seed=${s.proj.id||i}`}
                                      alt={s.proj.title} loading="lazy"
                                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                                      onError={e=>{(e.target as HTMLImageElement).src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80'}}/>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-black/40"/>
                                    {isTop && (
                                      <div className="absolute top-2 left-2">
                                        <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-600/90 text-white border border-violet-400/50 backdrop-blur-sm shadow">
                                          <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span></span>
                                          RECOMMANDÉ
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* RIGHT: title + description + buttons */}
                                  <div className="flex flex-col flex-1 min-w-0 justify-between px-4 py-3">
                                    <div>
                                      <h3 className="font-black text-sm text-slate-800 leading-tight">{s.proj.title}</h3>
                                      <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2">{s.proj.description?.split('.')[0]}.</p>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-3">
                                      <button
                                        className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-cyan-600 transition-colors px-0"
                                        onClick={()=>{setExpandedCards(prev=>{const n=new Set(prev);n.has(s.proj.id)?n.delete(s.proj.id):n.add(s.proj.id);return n})}}>
                                        <span className="text-xs">{expandedCards.has(s.proj.id)?'🔼':'🔽'}</span>
                                        {expandedCards.has(s.proj.id)?'Masquer les détails':'Voir les détails'}
                                      </button>
                                      <Button
                                        className="bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 text-white rounded-xl px-4 py-1.5 text-xs font-black shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all border border-cyan-300/50 h-auto shrink-0"
                                        onClick={()=>{setSelectedProject(s.proj);setManagerFeatures([]);setManagerDeliverables(s.proj.deliverables||[]);setStep("concept-validation")}}>
                                        Continuer <ArrowRight size={12} className="ml-1" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* ── EXPANDED DETAILS — same glass style, seamless continuation ── */}
                                {expandedCards.has(s.proj.id) && (
                                  <div className={`border border-t-0 rounded-b-2xl backdrop-blur-md p-5 flex flex-col gap-5 ${
                                    isSelected ? 'border-cyan-300/50 bg-cyan-50/20' :
                                    isTop ? 'border-violet-200/50 bg-violet-50/15' :
                                    'border-slate-200/40 bg-white/20'
                                  }`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                      {/* LEFT COL */}
                                    <div className="space-y-4">
                                      {/* Quick stats row */}
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/80">
                                          <span className="text-xs">⏱</span><p className="text-[11px] font-black text-slate-700">{s.proj.scenarios?.balanced?.duration_weeks} semaines</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/80">
                                          <span className="text-xs">💰</span><p className={`text-[11px] font-black ${s.roi>=75?'text-emerald-600':'text-amber-600'}`}>ROI {s.roi>=80?'élevé':s.roi>=65?'moyen':'modéré'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/80">
                                          <span className="text-xs">🧩</span><p className={`text-[11px] font-black ${s.proj.complexity==='LOW'?'text-emerald-600':s.proj.complexity==='MEDIUM'?'text-amber-600':'text-rose-600'}`}>{riskLabel(s.proj.complexity)}</p>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/60 rounded-xl px-3 py-2 border border-white/80">
                                          <span className="text-xs">👥</span><p className="text-[11px] font-black text-slate-700 truncate">{(industry||'Général').substring(0,14)}</p>
                                        </div>
                                      </div>
                                      {/* Value */}
                                      <div>
                                        <h4 className="text-[10px] font-black text-cyan-600/80 uppercase tracking-widest mb-2 flex items-center gap-1.5">📌 Valeur ajoutée</h4>
                                        <ul className="space-y-1.5">
                                          {whyText(s).slice(0,3).map((r,j)=>(
                                            <li key={j} className="text-xs text-slate-600 font-medium flex items-start gap-2"><span className="text-cyan-500 font-bold mt-0.5">✓</span>{r}</li>
                                          ))}
                                        </ul>
                                      </div>
                                      {/* Stack */}
                                      <div className="pt-3 border-t border-white/60">
                                        <h4 className="text-[10px] font-black text-cyan-600/80 uppercase tracking-widest mb-2">🛠 Stack proposée</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                          {s.proj.stack?.map((t,j)=>(<span key={j} className="px-2 py-0.5 bg-cyan-50/80 text-cyan-800 border border-cyan-200/50 text-[10px] font-black rounded-lg">{t}</span>))}
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 flex items-center gap-2 mt-2">Niveau : <span className={`px-2 py-0.5 rounded-md ${riskColor(s.proj.complexity)} text-[10px]`}>{s.proj.complexity==='LOW'?'🟢 Accessible':s.proj.complexity==='MEDIUM'?'🟡 Moyen':'🔴 Complexe'}</span></p>
                                      </div>
                                    </div>
                                    {/* RIGHT COL */}
                                    <div className="space-y-3">
                                      <h4 className="text-[10px] font-black text-cyan-600/80 uppercase tracking-widest">📊 Métriques Clés</h4>
                                      {kpis.map(k=>(
                                        <div key={k.label} className="rounded-xl border border-white/80 bg-white/60 backdrop-blur-sm p-3 flex items-center gap-3">
                                          <div className="text-lg w-8 h-8 rounded-xl bg-white/80 border border-slate-100 flex items-center justify-center shrink-0">{k.icon}</div>
                                          <div className="flex-1">
                                            <div className="flex justify-between items-end mb-1"><p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{k.label}</p><p className="text-xs font-black text-slate-800">{k.val}%</p></div>
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-0.5"><motion.div initial={{width:0}} animate={{width:`${k.val}%`}} transition={{delay:i*0.1+0.3,duration:0.7}} className={`h-full rounded-full ${k.color}`}/></div>
                                            <p className="text-[10px] font-medium text-slate-400">{k.desc}</p>
                                          </div>
                                        </div>
                                      ))}
                                      {devilsAdvocateMode ? (
                                        <div className="rounded-xl bg-rose-50/80 border border-rose-200/60 p-3 shadow-[0_0_15px_rgba(244,63,94,0.05)] backdrop-blur-sm">
                                          <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">⚠️ Risques & Points Critiques</h4>
                                          <ul className="space-y-1.5">
                                            {getDevilsAdvocateRisks(s.proj).map((risk, idx) => (
                                              <li key={idx} className="text-[10px] font-medium text-slate-700 flex items-start gap-1.5 leading-snug">
                                                <span className="text-rose-500 font-bold shrink-0 mt-0.5">×</span> {risk}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : (
                                        <div className="rounded-xl bg-violet-50/80 border border-violet-200/50 p-3 backdrop-blur-sm">
                                          <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">🧠 Analyse IA</h4>
                                          <ul className="space-y-1">
                                            <li className="text-[10px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400">•</span> Compatible avec vos contraintes ({riskLabel(s.proj.complexity)})</li>
                                            <li className="text-[10px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400">•</span> Développement maîtrisé ({s.proj.scenarios?.balanced?.duration_weeks} sem)</li>
                                            <li className="text-[10px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400">•</span> Stack {s.proj.stack?.slice(0,2).join(', ')} alignée</li>
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* ── MICRO-CHAT CONTEXTUEL ── */}
                                    <div className="mt-2 pt-4 border-t border-slate-200/50 dark:border-white/10">
                                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                        💬 Interroger cette approche
                                      </h4>
                                      
                                      <div className="flex flex-col gap-3">
                                        {/* Historique des messages de la carte */}
                                        {(cardChats[s.proj.id] || []).length > 0 && (
                                          <div className="space-y-2.5 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                            {cardChats[s.proj.id].map((msg, mIdx) => (
                                              <div key={mIdx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[11px] font-medium leading-relaxed ${
                                                  msg.role === 'user' 
                                                    ? 'bg-cyan-500 text-white rounded-br-sm shadow-sm' 
                                                    : 'bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-bl-sm shadow-sm backdrop-blur-sm'
                                                }`}>
                                                  {msg.content}
                                                </div>
                                              </div>
                                            ))}
                                            {isCardChatLoading[s.proj.id] && (
                                              <div className="flex justify-start">
                                                <div className="bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-2.5 flex items-center gap-1">
                                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Input Box */}
                                        <form onSubmit={(e) => handleCardChatSubmit(e, s.proj.id, s.proj)} className="relative flex items-center">
                                          <div className="absolute left-3 text-slate-400"><Bot size={14} /></div>
                                          <input 
                                            type="text" 
                                            value={cardInputs[s.proj.id] || ''}
                                            onChange={(e) => setCardInputs(prev => ({...prev, [s.proj.id]: e.target.value}))}
                                            placeholder={`Poser une question technique sur l'option "${s.proj.title}"...`}
                                            className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 rounded-xl py-2 pl-9 pr-10 text-[11px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 backdrop-blur-md transition-all shadow-inner"
                                          />
                                          <button 
                                            type="submit" 
                                            disabled={!cardInputs[s.proj.id]?.trim() || isCardChatLoading[s.proj.id]}
                                            className="absolute right-1.5 p-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-cyan-500"
                                          >
                                            <Send size={12} />
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )
                          })}
                        </div>

                        {/* ── RECOMMANDATION IA — AI OS VIBE ─────────────── */}
                        {topRec && (
                          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3}}
                            className="relative overflow-hidden rounded-3xl border border-[#7B2DFF]/30 bg-[#0F172A]/90 p-6 md:p-8 shadow-[0_0_30px_rgba(123,45,255,0.15)] backdrop-blur-xl group mt-4">
                            {/* Animated AI Grid/Halo */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(123,45,255,0.15),transparent_50%)] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7B2DFF]/50 to-transparent opacity-50" />
                            
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-700"><span className="text-8xl">🏆</span></div>
                            <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7B2DFF] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#7B2DFF]"></span></span>
                                  <p className="text-[11px] font-black text-[#7B2DFF] uppercase tracking-widest drop-shadow-[0_0_5px_rgba(123,45,255,0.5)]">Choix Optimal IA</p>
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-4">{topRec.proj.title}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {whyText(topRec).slice(0,2).map((r,j)=>(
                                    <div key={j} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-md">
                                      <div className="w-8 h-8 rounded-lg bg-[#7B2DFF]/20 flex items-center justify-center shrink-0 border border-[#7B2DFF]/30">
                                        <span className="text-[#a77bff] font-black text-sm">✓</span>
                                      </div>
                                      <span className="text-[11px] font-bold text-slate-300 leading-snug">{r}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="shrink-0 bg-[#0F172A] p-5 rounded-2xl border border-[#7B2DFF]/20 shadow-[0_0_20px_rgba(123,45,255,0.2)] flex flex-col items-center justify-center min-w-[120px] relative overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(123,45,255,0.2),transparent_70%)]" />
                                <div className="relative w-16 h-16 mb-2">
                                  <svg className="w-16 h-16 -rotate-90 drop-shadow-[0_0_5px_rgba(123,45,255,0.5)]" viewBox="0 0 48 48">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3"/>
                                    <motion.circle cx="24" cy="24" r="20" fill="none" stroke="#a77bff" strokeWidth="3" strokeLinecap="round"
                                      initial={{strokeDasharray:'0 126'}} animate={{strokeDasharray:`${(topRec.successPct/100)*126} 126`}}
                                      transition={{duration:2,ease:'easeOut'}}/>
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-base font-black text-white">{topRec.successPct}%</span>
                                  </div>
                                </div>
                                <p className="text-[9px] font-black text-[#7B2DFF] uppercase tracking-widest text-center">Score Global</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
    
                        </div> {/* CLOSE lg:col-span-2 */}
                        <div className="lg:col-span-1">
                          {/* ── 3. SIMULATOR PANEL ─────────────────────────────────── */}
                          <div className="sticky top-6 flex flex-col gap-4 z-10">
                            {/* What-If Sliders */}
                            <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 shadow-[0_0_30px_rgba(79,70,229,0.15)] relative overflow-hidden group">
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.2),transparent_70%)] pointer-events-none" />
                              <h3 className="text-white font-black text-sm mb-5 flex items-center gap-2">
                                <Settings2 size={16} className="text-indigo-400" /> Simulateur "What-If"
                              </h3>
                              
                              <div className="space-y-6 relative z-10">
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-300">💰 Budget Alloué</span>
                                    <span className={budgetPressure < 80 ? 'text-rose-400' : 'text-emerald-400'}>{budgetPressure}%</span>
                                  </div>
                                  <input 
                                    type="range" min="50" max="150" value={budgetPressure} 
                                    onChange={e => setBudgetPressure(Number(e.target.value))}
                                    className="w-full h-2 rounded-lg appearance-none bg-slate-700/50 outline-none cursor-pointer accent-indigo-500"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-300">⏱ Temps Disponible</span>
                                    <span className={timePressure < 80 ? 'text-amber-400' : 'text-emerald-400'}>{timePressure}%</span>
                                  </div>
                                  <input 
                                    type="range" min="50" max="150" value={timePressure} 
                                    onChange={e => setTimePressure(Number(e.target.value))}
                                    className="w-full h-2 rounded-lg appearance-none bg-slate-700/50 outline-none cursor-pointer accent-indigo-500"
                                  />
                                </div>
                                <div className="text-[10px] text-slate-400 leading-relaxed italic border-l-2 border-indigo-500/50 pl-3">
                                  Ajustez les contraintes pour observer comment l'IA réévalue la faisabilité et le ROI de chaque option.
                                </div>
                              </div>
                            </div>

                            {/* Execution Core (Dropzone) */}
                            <div className="mt-2 flex flex-col items-center justify-center p-8 border-2 border-dashed border-cyan-500/30 rounded-3xl bg-cyan-950/40 hover:bg-cyan-900/60 transition-colors relative overflow-hidden group">
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.1),transparent_60%)] group-hover:bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.2),transparent_60%)] transition-colors pointer-events-none" />
                              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(34,211,238,0.2)] group-hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] group-hover:scale-110 transition-all duration-300">
                                <Flame size={24} className="text-cyan-400" />
                              </div>
                              <h4 className="text-white font-black text-sm text-center mb-1">Cœur d'Exécution</h4>
                              <p className="text-[10px] text-cyan-200/60 text-center font-medium max-w-[200px]">
                                Glissez-déposez la carte de projet sélectionnée ici pour lancer la validation.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
\n

                  <div className="flex gap-3 pt-1">
                    <Button variant="ghost" onClick={() => setStep("warroom-tech")} className="rounded-xl font-black text-slate-400">← Retour</Button>
                    <Button disabled={!selectedProject} onClick={() => { setStep("concept-validation"); }} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-5 rounded-xl font-black">
                      Sélectionner ce projet <ArrowRight size={15} className="ml-1.5" />
                    </Button>
                  </div>
                </motion.div>
              )
            })()}


            {/* ─── ÉTAPES 6→10 : DÉTAILS DU PROJET (tabs) ─── */}
            {step === "projet-details" && selectedProject && (() => {
              const p = selectedProject
              const cfg = COMPLEXITY_CFG[p.complexity] || COMPLEXITY_CFG.MEDIUM
              const tabs: { id: DetailsTab; label: string; icon: React.ReactNode }[] = [
                { id: "design", label: "🎨 Design", icon: <Eye size={12} /> },
                { id: "technique", label: "⚙️ Technique", icon: <Cpu size={12} /> },
                { id: "architecture", label: "🏗️ Architecture", icon: <Building2 size={12} /> },
                { id: "planification", label: "📅 Planning", icon: <Calendar size={12} /> },
                { id: "synthese", label: "📄 Synthèse", icon: <GitCompare size={12} /> },
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
                      <button key={t.id} onClick={() => setDetailsTab(t.id)} className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${detailsTab === t.id ? "bg-[#00BCD4] text-white shadow-[0_0_12px_rgba(0,188,212,0.3)]" : "bg-slate-100 dark:bg-blue-900/40 text-slate-500 dark:text-blue-400 hover:bg-slate-200"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {/* Tab content */}
                  <AnimatePresence mode="wait">
                    {detailsTab === "design" && (() => {
                      const handleCopilotSubmit = (e: React.FormEvent) => {
                        e.preventDefault();
                        if (!copilotPrompt.trim() || isCopilotThinking) return;
                        setIsCopilotThinking(true);
                        
                        // Fake AI parsing delay
                        setTimeout(() => {
                          const p = copilotPrompt.toLowerCase();
                          let newTheme = { ...copilotTheme };
                          
                          if (p.includes('sombre') || p.includes('dark')) {
                            newTheme = { bg: '#0f172a', cardBg: '#1e293b', border: '#334155', text: '#f8fafc', shadow: '0 20px 25px -5px rgba(0,0,0,0.5)', radius: '12px' };
                          } else if (p.includes('apple') || p.includes('épuré') || p.includes('minimal')) {
                            newTheme = { bg: '#f5f5f7', cardBg: '#ffffff', border: '#e5e5ea', text: '#1d1d1f', shadow: '0 8px 30px rgba(0,0,0,0.04)', radius: '24px' };
                          } else if (p.includes('néon') || p.includes('cyber')) {
                            newTheme = { bg: '#000000', cardBg: '#0a0a0a', border: '#06b6d4', text: '#22d3ee', shadow: '0 0 30px rgba(6,182,212,0.5)', radius: '0px' };
                          } else if (p.includes('rouge') || p.includes('red')) {
                            newTheme = { ...newTheme, border: '#ef4444', text: '#ef4444' };
                          } else if (p.includes('arrondi')) {
                            newTheme = { ...newTheme, radius: '32px' };
                          } else {
                            // Default slight change to show reaction
                            newTheme = { bg: '#e0e7ff', cardBg: '#ffffff', border: '#c7d2fe', text: '#3730a3', shadow: '0 10px 25px -5px rgba(67,56,202,0.1)', radius: '16px' };
                          }
                          
                          setCopilotTheme(newTheme);
                          setIsCopilotThinking(false);
                          setCopilotPrompt("");
                        }, 1200);
                      };

                      return (
                        <motion.div key="design" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="space-y-4">
                          <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest px-2 flex items-center gap-2">
                            <Bot size={14} /> The 3D AI Design Copilot
                          </p>

                          {/* 3D Hologram Area */}
                          <div 
                            className="p-8 rounded-[2rem] border border-cyan-200/40 bg-slate-900/5 shadow-inner overflow-hidden flex flex-col items-center justify-center min-h-[320px] relative perspective-1000"
                            style={{ perspective: "1000px" }}
                          >
                            <motion.div 
                              animate={{ backgroundColor: copilotTheme.bg }} 
                              transition={{ duration: 0.8 }}
                              className="absolute inset-0 opacity-20"
                            />
                            
                            {isCopilotThinking && (
                              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="absolute top-4 right-4 flex items-center gap-2 text-cyan-500 font-bold text-[10px] bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20 backdrop-blur-md z-10">
                                <RefreshCw size={12} className="animate-spin" /> IA en pleine création...
                              </motion.div>
                            )}

                            {/* Hover 3D Tilt Effect applied to the mock component */}
                            <motion.div
                              whileHover={{ rotateX: 10, rotateY: -10, scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 100, damping: 15 }}
                              className="w-full max-w-sm relative z-10 cursor-grab active:cursor-grabbing"
                              style={{ transformStyle: "preserve-3d" }}
                            >
                              <motion.div 
                                animate={{ 
                                  backgroundColor: copilotTheme.cardBg, 
                                  borderColor: copilotTheme.border, 
                                  borderRadius: copilotTheme.radius, 
                                  boxShadow: copilotTheme.shadow 
                                }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="w-full p-6 border-2 flex flex-col gap-4 relative overflow-hidden"
                              >
                                {/* Decorative elements */}
                                <div className="flex gap-1.5 mb-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></div>
                                </div>
                                
                                <motion.h3 animate={{ color: copilotTheme.text }} className="text-xl font-black transition-colors">{p.title || "Interface IA"}</motion.h3>
                                <motion.p animate={{ color: copilotTheme.text }} className="text-xs opacity-60 transition-colors leading-relaxed">
                                  Ceci est une projection 3D en direct. Décrivez le style que vous souhaitez dans le chat ci-dessous et observez l'interface évoluer de façon magique.
                                </motion.p>
                                
                                <div className="space-y-3 mt-2">
                                  <motion.div animate={{ backgroundColor: copilotTheme.bg, borderColor: copilotTheme.border, borderRadius: copilotTheme.radius }} className="w-full p-3 border-2 flex items-center shadow-inner">
                                    <motion.span animate={{ color: copilotTheme.text }} className="text-xs opacity-50 px-2 font-mono transition-colors">user_input_placeholder</motion.span>
                                  </motion.div>
                                  <motion.button 
                                    animate={{ backgroundColor: copilotTheme.text, color: copilotTheme.cardBg, borderRadius: copilotTheme.radius }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full py-3 font-black text-sm mt-2 transition-colors shadow-lg flex items-center justify-center gap-2"
                                  >
                                    <Zap size={16} /> Exécuter
                                  </motion.button>
                                </div>
                              </motion.div>
                            </motion.div>
                          </div>

                          {/* Copilot Prompt Input */}
                          <form onSubmit={handleCopilotSubmit} className="relative mt-2">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                              <Sparkles size={16} className="text-cyan-500" />
                            </div>
                            <Input
                              value={copilotPrompt}
                              onChange={(e) => setCopilotPrompt(e.target.value)}
                              placeholder="Ex: Rends ça sombre, 'Style minimaliste Apple' ou 'Néon cyber'"
                              className="w-full bg-white/40 dark:bg-slate-800/40 border-cyan-200/50 dark:border-cyan-800/50 rounded-2xl py-6 pl-12 pr-24 font-medium text-sm shadow-sm placeholder:text-slate-400 focus-visible:ring-cyan-500/30"
                              disabled={isCopilotThinking}
                            />
                            <Button 
                              type="submit" 
                              disabled={!copilotPrompt.trim() || isCopilotThinking}
                              className="absolute right-2 top-2 bottom-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-md font-bold px-4"
                            >
                              Générer
                            </Button>
                          </form>
                          
                          {/* Deliverables display */}
                          {p.deliverables && p.deliverables.length > 0 && (
                            <div className="mt-4 rounded-[1.5rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                              <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Livrables UX/UI</p>
                              <div className="flex flex-wrap gap-2">
                                {p.deliverables.map((d, i) => (
                                  <span key={i} className="px-2 py-1 bg-white/60 text-slate-700 border border-white/80 text-[10px] font-bold rounded-lg shadow-sm">{d}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })()}
                    {detailsTab === "technique" && (() => {
                      const auditStack = (stack: string[]) => {
                        const issues: string[] = [];
                        const success: string[] = [];
                        if (!stack || stack.length === 0) return { issues, success };
                        
                        const s = stack.map(x => x.toLowerCase());
                        
                        // Réelles règles d'audit technique (simulation)
                        if (s.includes('react') || s.includes('next.js')) {
                          success.push("L'écosystème React offre la meilleure compatibilité avec les UI modernes.");
                        }
                        if (s.includes('next.js') && (s.includes('express') || s.includes('nest.js'))) {
                          issues.push("Redondance détectée : Next.js intègre des API routes nativement. Un backend séparé ajoute de l'overhead réseau.");
                        }
                        if (s.includes('mongodb') && s.includes('prisma')) {
                          issues.push("Attention : Prisma supporte MongoDB, mais les transactions ACID complètes requièrent un Replica Set configuré.");
                        }
                        if (s.includes('django') && s.includes('react')) {
                          success.push("Excellent choix : Django API (robuste) + React (réactif) est un standard industriel.");
                        }
                        if (s.includes('flutter') && s.includes('react native')) {
                          issues.push("Conflit majeur : Deux frameworks mobiles cross-platform sélectionnés. Choisissez-en un seul.");
                        }
                        if (stack.length > 5) {
                          issues.push(`Stack lourde (${stack.length} technos). Risque accru pour la maintenabilité et la courbe d'apprentissage de l'équipe.`);
                        }
                        if (s.includes('typescript')) {
                          success.push("TypeScript détecté : Forte garantie de typage et réduction des bugs en production.");
                        }
                        
                        // Par défaut
                        if (success.length === 0) success.push("La stack sélectionnée est standard.");
                        if (issues.length === 0) success.push("Aucun conflit majeur détecté dans les dépendances.");
                        
                        return { issues, success };
                      };

                      const { issues, success } = auditStack(p.stack || []);

                      return (
                        <motion.div key="technique" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="space-y-4">
                          <div className="rounded-[2rem] border border-cyan-200/40 bg-white/10 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <Cpu size={14} /> Audit de Compatibilité Stack
                            </p>
                            
                            <div className="flex flex-wrap gap-2 mb-5">
                              {p.stack?.map((t, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg">{t}</span>
                              ))}
                            </div>

                            <div className="space-y-2.5">
                              {issues.map((msg, i) => (
                                <div key={i} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                  <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{msg}</p>
                                </div>
                              ))}
                              {success.map((msg, i) => (
                                <div key={i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{msg}</p>
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-5 p-3 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Version Checker v2.1</span>
                              <Badge className={issues.length > 0 ? "bg-amber-500/20 text-amber-600" : "bg-emerald-500/20 text-emerald-600"}>
                                {issues.length > 0 ? "Révisions recommandées" : "Stack Validée"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">📦 Modules du Projet</p>
                            <div className="flex flex-wrap gap-2">{p.modules?.map((m,i)=><span key={i} className="px-3 py-1.5 bg-white/60 border border-white/80 text-slate-700 text-[10px] font-black rounded-xl">{m}</span>)}</div>
                          </div>
                        </motion.div>
                      )
                    })()}
                    {detailsTab === "architecture" && (() => {
                      const stack = p.stack || [];
                      const s = stack.map(x => x.toLowerCase());
                      
                      let frontend = "Frontend";
                      if (s.some(x => ['react','next.js','vue.js','nuxt.js','angular'].includes(x))) {
                        frontend = stack.find(x => ['react','next.js','vue.js','nuxt.js','angular'].includes(x.toLowerCase())) || "Frontend Web";
                      } else if (s.some(x => ['flutter','react native'].includes(x))) {
                        frontend = stack.find(x => ['flutter','react native'].includes(x.toLowerCase())) || "Application Mobile";
                      }
                      
                      let backend = "API Backend";
                      if (s.some(x => ['node.js','express','nest.js','django','fastapi','spring boot'].includes(x))) {
                        backend = stack.find(x => ['node.js','express','nest.js','django','fastapi','spring boot'].includes(x.toLowerCase())) || "Serveur Backend";
                      }
                      
                      let db = "Database";
                      if (s.some(x => ['postgresql','mysql','mongodb','redis','sqlite'].includes(x))) {
                        db = stack.find(x => ['postgresql','mysql','mongodb','redis','sqlite'].includes(x.toLowerCase())) || "Base de Données";
                      }

                      const mermaidCode = `graph TD
  subgraph User Layer
    UI[${frontend}]:::front
  end
  subgraph Application Layer
    API[${backend}]:::api
  end
  subgraph Data Layer
    DB[(${db})]:::db
  end
  
  UI -->|Appel API REST/GraphQL| API
  API -->|Requêtes CRUD| DB

  classDef front fill:#082f49,stroke:#0ea5e9,stroke-width:2px,color:#bae6fd
  classDef api fill:#422006,stroke:#eab308,stroke-width:2px,color:#fef08a
  classDef db fill:#052e16,stroke:#22c55e,stroke-width:2px,color:#bbf7d0`;

                      return (
                        <motion.div key="architecture" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="space-y-4">
                          <div className="rounded-[2rem] border border-cyan-200/40 bg-[#0f172a] backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                <Layers size={14} /> Diagramme C4 (Mermaid)
                              </p>
                              <Badge className="bg-cyan-500/20 text-cyan-300">Auto-généré</Badge>
                            </div>
                            
                            <div className="p-4 bg-black/40 rounded-xl font-mono text-[10px] sm:text-xs overflow-x-auto text-cyan-100 border border-white/10 shadow-inner">
                              <pre><code>{mermaidCode}</code></pre>
                            </div>
                            
                            <div className="mt-3 flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => navigator.clipboard.writeText(mermaidCode)}
                                className="text-xs font-semibold bg-white/5 border-white/20 text-white hover:bg-white/10"
                              >
                                Copier le code Mermaid
                              </Button>
                            </div>
                            
                            <div className="mt-4 p-4 bg-cyan-950/30 rounded-xl border border-cyan-500/20">
                              <p className="text-[10px] font-black text-cyan-500/70 uppercase mb-2">Architecture Cible</p>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                Le système s'articule autour d'une architecture N-Tiers standard. Le composant <strong>{frontend}</strong> gère les interactions utilisateur, tandis que <strong>{backend}</strong> assure la logique métier et orchestre les flux de données avec <strong>{db}</strong>.
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })()}
                    {detailsTab === "planification" && (() => {
                      const totalWeeks = 12;
                      const logs = [
                        { week: 1, text: "Kickoff. Lancement de l'environnement de développement." },
                        { week: 2, text: "Configuration de la CI/CD. Système d'authentification en place." },
                        { week: 3, text: "Base de données modélisée. Premières API routes disponibles." },
                        { week: 4, text: "Intégration UI/UX. Le frontend commence à communiquer avec le backend." },
                        { week: 5, text: "Alerte : Petit retard sur le module de paiement. L'équipe Backend renforce." },
                        { week: 6, text: "Module de paiement validé en environnement de test." },
                        { week: 7, text: "Développement des fonctionnalités 'Coeur de métier'." },
                        { week: 8, text: "Fonctionnalités principales achevées. Début de l'intégration IA." },
                        { week: 9, text: "L'IA est connectée. Tests de charge en cours." },
                        { week: 10, text: "Tests utilisateurs QA. Correction de 14 bugs mineurs." },
                        { week: 11, text: "Phase de Security Audit & Optimisation de performance." },
                        { week: 12, text: "Préparation au déploiement Production. MVP prêt !" },
                      ];

                      return (
                        <motion.div key="planification" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="space-y-4">
                          <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest px-2 flex items-center gap-2">
                            <Clock size={14} /> La Machine à Voyager dans le Temps
                          </p>
                          
                          <div className="rounded-[2rem] border border-cyan-200/40 bg-[#0f172a] backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)] flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Semaine {timeLapseWeek} / {totalWeeks}</span>
                              <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Progression : {Math.round((timeLapseWeek/totalWeeks)*100)}%</Badge>
                            </div>
                            
                            <input 
                              type="range" 
                              min="1" max={totalWeeks} 
                              value={timeLapseWeek} 
                              onChange={(e) => setTimeLapseWeek(parseInt(e.target.value))}
                              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                            />
                            
                            <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-xs text-emerald-400 h-32 overflow-y-auto shadow-inner flex flex-col gap-2">
                              {logs.slice(0, timeLapseWeek).map((log, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                  <span className="text-slate-500">[{log.week < 10 ? '0'+log.week : log.week}/12]</span> <span className={log.text.includes('Alerte') ? 'text-amber-400' : 'text-emerald-400'}>{log.text}</span>
                                </motion.div>
                              ))}
                              <motion.span animate={{opacity:[1,0]}} transition={{repeat:Infinity,duration:0.8}} className="inline-block w-2 h-3 bg-emerald-400 mt-1"/>
                            </div>
                          </div>

                          <Button onClick={()=>setDetailsTab("synthese")} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-4 rounded-xl font-black shadow-lg">
                            Confirmer ce planning → Synthèse <ArrowRight size={14} className="ml-1.5"/>
                          </Button>
                        </motion.div>
                      )
                    })()},
                    {detailsTab === "synthese" && (() => {
                      const simulatePlay = () => {
                        if (isPitchPlaying) return;
                        setIsPitchPlaying(true);
                        setPitchProgress(0);
                        const interval = setInterval(() => {
                          setPitchProgress(p => {
                            if (p >= 100) { clearInterval(interval); setIsPitchPlaying(false); return 100; }
                            return p + 2; // 50 steps = approx 5 seconds
                          });
                        }, 100);
                      };

                      const pitchText = `Bonjour. Voici ${p.title}. Nous construisons la solution ultime pour répondre au défi majeur de ce secteur. Avec une architecture scalable propulsée par l'IA, notre MVP sera prêt en quelques semaines. Ce n'est pas juste un projet, c'est l'avenir de votre industrie.`;
                      // Split into words to highlight them
                      const words = pitchText.split(' ');
                      const currentWordIndex = Math.floor((pitchProgress / 100) * words.length);

                      return (
                        <motion.div key="synthese" initial={{opacity:0,x:10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-10}} className="space-y-4">
                          <p className="text-[9px] font-black text-cyan-600 uppercase tracking-widest px-2 flex items-center gap-2">
                            <Mic size={14} /> L'Elevator Pitch Vocal
                          </p>

                          <div className="rounded-[2rem] border border-cyan-200/40 bg-[#0f172a] backdrop-blur-xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.1)] flex flex-col items-center">
                            
                            {/* Audio Visualizer */}
                            <div className="flex items-center gap-1 h-12 mb-6">
                              {[...Array(20)].map((_, i) => (
                                <motion.div 
                                  key={i} 
                                  animate={{ 
                                    height: isPitchPlaying ? Math.random() * 40 + 10 : 4,
                                    backgroundColor: isPitchPlaying ? '#22d3ee' : '#475569'
                                  }}
                                  transition={{ repeat: isPitchPlaying ? Infinity : 0, duration: 0.2, repeatType: "reverse" }}
                                  className="w-1.5 rounded-full"
                                />
                              ))}
                            </div>

                            <div className="w-full bg-slate-800 rounded-full h-1.5 mb-6 overflow-hidden">
                              <motion.div className="h-full bg-cyan-400" style={{ width: `${pitchProgress}%` }} />
                            </div>

                            <p className="text-center font-medium text-sm leading-relaxed mb-6 px-4">
                              {words.map((w, i) => (
                                <span key={i} className={`transition-colors duration-200 ${i < currentWordIndex ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}>
                                  {w}{' '}
                                </span>
                              ))}
                            </p>

                            <Button 
                              onClick={simulatePlay}
                              disabled={isPitchPlaying}
                              className="bg-white/10 hover:bg-white/20 text-cyan-400 border border-cyan-500/30 rounded-full px-8 py-2 font-bold flex items-center gap-2 transition-colors"
                            >
                              {isPitchPlaying ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />} 
                              {isPitchPlaying ? "Lecture en cours..." : "Lancer le Pitch IA"}
                            </Button>
                          </div>

                          <Button onClick={()=>{setStep("fonctionnalites");generateDetailedTasks(p,selectedScenario)}} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-4 rounded-xl font-black shadow-lg">
                            Valider & Définir les fonctionnalités <ArrowRight size={14} className="ml-1.5"/>
                          </Button>
                        </motion.div>
                      )
                    })()}
                  </AnimatePresence>
                  <div className="flex gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setStep("feasibility")} className="rounded-xl font-black text-slate-400">← Retour</Button>
                    <Button onClick={() => setDetailsTab("planification")} className="flex-1 bg-[#00BCD4] hover:bg-[#0097a7] text-white py-5 rounded-xl font-black">
                      Planning & Synthèse <ChevronRight size={15} className="ml-1.5" />
                    </Button>
                  </div>
                </motion.div>
              )
            })()}

            {/* ─── CONCEPT VALIDATION (Phase 1 Checkpoint) ─── */}
            {step === "concept-validation" && selectedProject && (
              <motion.div key="concept-validation" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-3">
                <div className="flex items-center gap-3">
                  <motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:'spring'}} className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)] shrink-0"><CheckCircle size={16} className="text-white" /></motion.div>
                  <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.1}}>
                    <h2 className="text-base font-black text-slate-900 dark:text-cyan-50">Validation du Concept</h2>
                    <p className="text-[9px] text-cyan-600/80 font-bold uppercase tracking-widest leading-none">Confirmez la vision avant la préproduction</p>
                  </motion.div>
                </div>

                <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="rounded-[2rem] border border-white/60 bg-white/30 backdrop-blur-2xl p-5 space-y-3 shadow-[0_8px_32px_rgba(0,0,0,0.05)] relative overflow-hidden group">
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

                    <div className="space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Analyse de l'Innovation</p>
                        <div className="flex items-center gap-3">
                           <div className="flex-1 h-2.5 bg-white/50 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)]">
                             <motion.div 
                               initial={{width: 0}} animate={{width: `${selectedProject.innovation_score}%`}} transition={{duration: 1.5, ease: "easeOut"}}
                               className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)] relative overflow-hidden" 
                             >
                               <motion.div animate={{x: ['-100%', '200%']}} transition={{repeat: Infinity, duration: 2, ease: "linear"}} className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12" />
                             </motion.div>
                           </div>
                           <span className="text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-red-500">{selectedProject.innovation_score}%</span>
                        </div>
                      </div>
                      
                      <div>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Score Comparatif</p>
                         <motion.div initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} transition={{delay:0.5}} className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-red-500 italic drop-shadow-[0_2px_10px_rgba(239,68,68,0.2)]">
                           {selectedProject.comparison_score}%
                         </motion.div>
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
                        <motion.div initial={{opacity:0, y:-5}} animate={{opacity:1, y:0}} className="space-y-3">
                          <textarea 
                            value={semanticVision} 
                            onChange={handleSemanticChange}
                            className="w-full h-28 p-4 bg-white/50 backdrop-blur-xl border border-white/80 focus:border-cyan-400 rounded-xl text-xs text-slate-700 font-medium leading-relaxed focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all resize-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]"
                            placeholder="Décrivez la vision de votre projet..."
                          />
                          <AnimatePresence>
                            {semanticAlerts.length > 0 && (
                              <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} exit={{opacity:0, height:0}} className="space-y-1.5 overflow-hidden">
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
                            <span className="text-[10px] font-black text-slate-700 bg-white/90 backdrop-blur-sm border border-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2"><Edit3 size={12} className="text-cyan-500"/> Cliquer pour éditer</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed">{semanticVision || selectedProject.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
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
                              impact: `Innovation: ${selectedProject?.innovation_score}% · Stack: ${selectedProject?.stack?.slice(0,2).join(', ')}`,
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
                      <Button onClick={() => setStep("ideation")} variant="ghost" className="h-11 px-4 rounded-xl text-red-500 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] font-black uppercase text-[9px] tracking-widest flex items-center gap-2 group transition-all duration-300 border border-transparent hover:border-red-500/30">
                        <RefreshCw size={14} className="group-hover:rotate-180 transition-all duration-500" /> Changer
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
                          impact: `Stack: ${selectedProject?.stack?.slice(0,2).join(', ')} — Innovation: ${selectedProject?.innovation_score}%`,
                          alternatives: ['Changer de projet', 'Modifier le Design Brief'],
                          onConfirm: () => { setStep('feasibility'); generateFeasibility(selectedProject!, selectedScenario) }
                        })}
                        className="h-11 px-8 rounded-xl bg-[#00BCD4] hover:bg-[#0097a7] text-white font-black uppercase text-[10px] tracking-widest shadow-[0_8px_20px_rgba(0,188,212,0.3)] hover:shadow-[0_8px_25px_rgba(0,188,212,0.4)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 group overflow-hidden relative"
                      >
                        <span className="relative z-10 flex items-center gap-2">Sceller l'architecture <CheckCircle size={14} className="text-white group-hover:scale-110 transition-transform" /></span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </motion.div>
                  )}

                  {/* 📴 SILENCIEUX — bouton direct, zéro friction */}
                  {aiMode === 'silent' && (
                    <motion.div key="silent-actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2">
                      <Button onClick={() => setStep("ideation")} variant="ghost" className="h-10 px-3 rounded-xl text-slate-400 font-black text-[9px] uppercase">
                        ← Retour
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
              <motion.div key="feasibility" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.5)] shrink-0">
                    <Target size={20} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-cyan-800 to-cyan-600 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">Analyse de Faisabilité</h2>
                    <p className="text-[10px] text-cyan-600/60 dark:text-cyan-400/60 font-bold uppercase tracking-widest">Complexité · Durée · Coût en DT · Risques</p>
                  </div>
                </div>

                {isLoadingFeasibility ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="relative w-16 h-16">
                      <div className="w-16 h-16 rounded-full border-4 border-cyan-100 border-t-cyan-500 animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center"><Target size={20} className="text-cyan-500" /></div>
                    </div>
                    <p className="text-sm font-black text-slate-600 dark:text-cyan-400 animate-pulse">L'IA calcule la faisabilité...</p>
                    <p className="text-[10px] text-cyan-600/40 dark:text-cyan-400/40 font-bold uppercase tracking-widest text-center">Estimation des coûts en DT selon le marché tunisien</p>
                  </div>
                ) : feasibilityData ? (
                  isRescuing ? (
                    <div className="rounded-[2rem] border border-red-500/40 bg-black/80 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] font-mono min-h-[350px] flex flex-col">
                      <div className="flex items-center gap-3 mb-6 border-b border-red-500/30 pb-4 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                        <span className="text-red-500 font-bold uppercase tracking-widest text-sm">OVERRIDE : PROTOCOLE EN COURS</span>
                      </div>
                      <div className="space-y-3 flex-1 overflow-hidden flex flex-col justify-end">
                        {rescueTerminalLines.map((line, i) => (
                          <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-emerald-400 text-xs font-semibold">
                            {line}
                          </motion.p>
                        ))}
                        <div className="mt-2"><motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity }} className="inline-block w-2.5 h-4 bg-emerald-400" /></div>
                      </div>
                    </div>
                  ) : (
                  <div className="space-y-4">

                    {/* ── 0. SIMULATEUR DE PRESSION (Sliders) ── */}
                    <motion.div initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full -ml-16 -mb-16 blur-2xl pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-cyan-400 to-red-500 flex items-center justify-center shadow-md"><Settings2 size={12} className="text-white"/></div>
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Simulateur de Pression (What-If)</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pression Budgétaire</span>
                              <span className="text-[10px] font-black text-red-500">{budgetPressure}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={budgetPressure} onChange={(e) => setBudgetPressure(Number(e.target.value))} className="w-full accent-red-500 h-1.5 bg-red-100 rounded-full appearance-none cursor-pointer" />
                          </div>
                          <div>
                            <div className="flex justify-between mb-1.5">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Pression Temporelle (Deadline)</span>
                              <span className="text-[10px] font-black text-cyan-600">{timePressure}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={timePressure} onChange={(e) => setTimePressure(Number(e.target.value))} className="w-full accent-cyan-500 h-1.5 bg-cyan-100 rounded-full appearance-none cursor-pointer" />
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 1. LIVE SCORE BANNER ── */}
                    <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
                      className={`relative overflow-hidden rounded-[2rem] p-6 border-2 flex items-center gap-6 backdrop-blur-2xl shadow-lg transition-all duration-500 ${simulatedRecommendation==='success'?'bg-emerald-50/60 border-emerald-200/50':simulatedRecommendation==='warning'?'bg-amber-50/60 border-amber-200/50':'bg-red-50/60 border-red-200/50'}`}>
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(255,255,255,0.5),transparent_60%)] pointer-events-none"/>
                      <div className="relative shrink-0 text-center">
                        <motion.div key={simulatedScore} initial={{scale:0.8, opacity:0.5}} animate={{scale:1, opacity:1}} transition={{type:'spring'}}
                          className={`text-6xl font-black drop-shadow-sm transition-colors duration-300 ${simulatedRecommendation==='success'?'text-emerald-500':simulatedRecommendation==='warning'?'text-amber-500':'text-red-600'}`}>
                          {simulatedScore}
                        </motion.div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">/ 100</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full transition-colors duration-300 ${simulatedRecommendation==='success'?'bg-emerald-500 text-white':simulatedRecommendation==='warning'?'bg-amber-500 text-white':'bg-red-500 text-white'}`}>{feasibilityData.level}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score de Faisabilité (Simulé)</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed mb-1.5">{displayedSummary}</p>
                      </div>
                      <div className="shrink-0 flex flex-col gap-2">
                        <div className={`backdrop-blur-md px-4 py-3 rounded-2xl border shadow-sm flex flex-col items-end min-w-[140px] transition-colors duration-300 ${budgetPressure < 80 ? 'bg-red-100/50 border-red-300' : 'bg-white/80 border-white/80'}`}>
                          <p className="text-[9px] font-black text-red-500/80 uppercase tracking-widest mb-1">💰 Budget Simulé</p>
                          <p className="text-[15px] font-black text-slate-800 leading-none">{(simulatedBudgetMin).toLocaleString()} <span className="text-[9px] text-slate-400 uppercase">DT</span></p>
                        </div>
                        <div className={`backdrop-blur-md px-4 py-3 rounded-2xl border shadow-sm flex flex-col items-end min-w-[140px] transition-colors duration-300 ${timePressure < 80 ? 'bg-cyan-100/50 border-cyan-300' : 'bg-white/80 border-white/80'}`}>
                          <p className="text-[9px] font-black text-cyan-600/80 uppercase tracking-widest mb-1">📅 Durée Simulée</p>
                          <p className="text-[15px] font-black text-slate-800 leading-none">{simulatedDuration} <span className="text-[9px] text-slate-400 uppercase">Semaines</span></p>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 2. AI AGENT DEBATE ── */}
                    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
                      className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.05)] overflow-hidden">
                      <div className="px-5 py-3 border-b border-white/40 flex items-center gap-2 bg-white/40 backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"/>
                        <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">🧠 Débat Multi-Agents IA — Analyse Interactive</p>
                      </div>
                      <div className="p-4 space-y-3">
                        {[
                          {agent:'👨‍💻 Dev Agent', color: isRescueModeActive ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200' : timePressure < 80 ? 'text-red-700 bg-red-50/80 border-red-200' : 'text-cyan-800 bg-cyan-50/80 border-cyan-200',
                           msg: isRescueModeActive ? "Architecture Serverless déployée. Monolithique robuste. Dette technique sous contrôle." : timePressure < 80 ? `Alerte : Impossible de livrer une stack robuste en si peu de temps. Risque de dette technique maximal !` : feasibilityData.complexity?.score > 70 ? `Complexité ${feasibilityData.complexity?.label} — nécessite une équipe senior.` : `Projet techniquement maîtrisable avec l'équipe actuelle.`,
                           badge: isRescueModeActive ? {t:'✅ SAUVÉ', c:'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'} : timePressure < 80 ? {t:'🔴 CRITIQUE', c:'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'} : feasibilityData.complexity?.score > 70 ? {t:'⚠️ Attention', c:'bg-amber-100 text-amber-700'} : {t:'✅ OK', c:'bg-emerald-100 text-emerald-700'}},
                          {agent:'💰 Finance Agent', color: isRescueModeActive ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200' : budgetPressure < 80 ? 'text-red-700 bg-red-50/80 border-red-200' : 'text-indigo-800 bg-indigo-50/80 border-indigo-200',
                           msg: isRescueModeActive ? `Budget compressé à ${simulatedBudgetMin.toLocaleString()} DT. Faisable en réduisant l'équipe à 2 personnes.` : budgetPressure < 80 ? `Budget simulé trop faible (${simulatedBudgetMin} DT) ! Risque de faillite technique.` : `Budget estimé ${simulatedBudgetMin.toLocaleString()} DT. Enveloppe cohérente.`,
                           badge: isRescueModeActive ? {t:'✅ LEAN', c:'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'} : budgetPressure < 80 ? {t:'🔴 DANGER', c:'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'} : {t:'✅ Raisonnable', c:'bg-emerald-100 text-emerald-700'}},
                          {agent:'⚠️ Risk Agent', color: isRescueModeActive ? 'text-emerald-800 bg-emerald-50/80 border-emerald-200' : 'text-amber-800 bg-amber-50/80 border-amber-200',
                           msg: isRescueModeActive ? "Tous les risques critiques ont été évacués. Le projet est prêt pour un lancement rapide." : simulatedScore < 50 ? `Risque global : EXTRÊME. La simulation montre que le projet va droit dans le mur.` : `Risque global : ${feasibilityData.risk?.global}. Risques identifiés maîtrisables.`,
                           badge: isRescueModeActive ? {t:'🟢 STABLE', c:'bg-emerald-100 text-emerald-700'} : simulatedScore < 50 ? {t:'🔴 FAILLITE PROBABLE', c:'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'} : feasibilityData.risk?.global==='Critique' ? {t:'🔴 Critique', c:'bg-rose-100 text-rose-700'} : feasibilityData.risk?.global==='Élevé' ? {t:'🟠 Élevé', c:'bg-orange-100 text-orange-700'} : {t:'🟢 Modéré', c:'bg-emerald-100 text-emerald-700'}},
                        ].map((a,i) => (
                          <motion.div key={i} layout initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:0.1*i}}
                            className={`rounded-2xl border p-3 flex items-start gap-3 backdrop-blur-md shadow-sm transition-colors duration-300 ${a.color}`}>
                            <span className="text-sm font-black shrink-0 mt-0.5">{a.agent.split(' ')[0]}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-wider mb-0.5 opacity-80">{a.agent.split(' ').slice(1).join(' ')}</p>
                              <p className="text-xs font-semibold leading-snug">{a.msg}</p>
                            </div>
                            <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded-full transition-all duration-300 ${a.badge.c}`}>{a.badge.t}</span>
                          </motion.div>
                        ))}
                        <div className="flex items-center gap-2 pt-2 border-t border-white/40">
                          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${simulatedRecommendation==='success'?'bg-emerald-500':simulatedRecommendation==='warning'?'bg-amber-500':'bg-red-500'}`}/>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${simulatedRecommendation==='success'?'text-emerald-700':simulatedRecommendation==='warning'?'text-amber-700':'text-red-700'}`}>Consensus IA : {simulatedRecommendation==='success'?'✅ Simulation Viable — go !':simulatedRecommendation==='warning'?'⚠️ Viable avec ajustements importants':'🔴 ÉCHEC SIMULÉ — réévaluer les contraintes'}</p>
                        </div>
                      </div>
                    </motion.div>

                    {/* ── 3. RISK HEATMAP + COMPLEXITY ── */}
                    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.3}} className="grid grid-cols-2 gap-4">
                      <div className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-5 space-y-4 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                        <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">🌡️ Heatmap de Risque Dynamique</p>
                        {[
                          {label:'Budget', val: Math.min(100, Math.max(10, (feasibilityData.cost_dt?.min>150000?85:feasibilityData.cost_dt?.min>80000?55:30) + (100 - budgetPressure)))},
                          {label:'Technique', val: feasibilityData.complexity?.score||70},
                          {label:'Délai', val: Math.min(100, Math.max(10, (feasibilityData.duration?.realistic_weeks>20?80:feasibilityData.duration?.realistic_weeks>12?50:25) + (100 - timePressure)))},
                          {label:'Ressources', val: feasibilityData.team_required?.min_size>5?70:40},
                          {label:'Scalabilité', val: simulatedScore>75?30:60},
                        ].map(r => {
                          const c = r.val>70?'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]':r.val>45?'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]':'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                          return (
                            <div key={r.label} className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-slate-600 w-20 shrink-0">{r.label}</span>
                              <div className="flex-1 h-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-full overflow-hidden p-0.5">
                                <motion.div initial={{width:0}} animate={{width:`${r.val}%`}} transition={{duration:0.5,ease:'easeOut'}} className={`h-full rounded-full ${c}`}/>
                              </div>
                              <span className={`text-[10px] font-black w-8 text-right transition-colors ${r.val>70?'text-red-500':r.val>45?'text-amber-500':'text-cyan-600'}`}>{Math.round(r.val)}</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-5 space-y-3 shadow-[0_0_30px_rgba(34,211,238,0.05)] flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-2">⚙️ Complexité & Durée</p>
                          <p className="text-2xl font-black text-slate-800">{feasibilityData.complexity?.label}</p>
                          <div className="h-2.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-full overflow-hidden p-0.5 my-3">
                            <motion.div initial={{width:0}} animate={{width:`${feasibilityData.complexity?.score||0}%`}} transition={{delay:0.4,duration:0.9}} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]"/>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">{feasibilityData.complexity?.details}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-white/40">
                          {[['🟢',simulatedDuration-2,'Opt.','text-emerald-600'],['🔵',simulatedDuration,'Réal.','text-cyan-600'],['🔴',simulatedDuration+4,'Pes.','text-red-600']].map(([e,v,l,c])=>(
                            <div key={l as string} className="bg-white/60 backdrop-blur-sm border border-white/80 rounded-xl p-2 shadow-sm">
                              <p className={`text-xl font-black ${c}`}>{v}<span className="text-[10px] ml-0.5">s</span></p>
                              <p className="text-[8px] text-slate-500 font-black uppercase mt-1">{l as string}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>


                    {/* ── 5. TEAM + RISKS ── */}
                    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.5}} className="grid grid-cols-2 gap-4">
                      <div className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-5 space-y-3 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                        <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">👥 Équipe Requise</p>
                        <p className="text-xl font-black text-slate-800 leading-tight">{feasibilityData.team_required?.level}</p>
                        <p className="text-xs text-slate-500 font-bold">{isRescueModeActive ? '2' : feasibilityData.team_required?.min_size}–{isRescueModeActive ? '3' : feasibilityData.team_required?.recommended_size} personnes</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {feasibilityData.team_required?.key_roles?.map((r:string,i:number)=><span key={i} className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-lg text-[9px] font-black uppercase border border-cyan-100">{r}</span>)}
                        </div>
                      </div>
                      <div className="rounded-[2rem] border border-cyan-200/40 bg-white/20 backdrop-blur-xl p-5 space-y-3 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
                        <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">⚠️ Risque Global</p>
                        <p className={`text-xl font-black ${feasibilityData.risk?.global==='Critique'?'text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]':feasibilityData.risk?.global==='Élevé'?'text-amber-500':'text-cyan-600'}`}>{feasibilityData.risk?.global}</p>
                        <ul className="space-y-2 mt-2">
                          {feasibilityData.risk?.main_risks?.slice(0,3).map((r:string,i:number)=>(
                            <li key={i} className="flex items-start gap-2.5 bg-white/60 backdrop-blur-sm border border-white/80 p-2.5 rounded-xl shadow-sm">
                              <span className="shrink-0 mt-0.5"><AlertTriangle size={14} className="text-red-500"/></span>
                              <p className="text-xs font-semibold text-slate-700 leading-snug">{r}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <AlertCircle size={32} className="text-slate-300" />
                    <p className="text-sm text-slate-400 font-bold">Aucune donnée disponible</p>
                    <Button onClick={() => generateFeasibility(selectedProject, selectedScenario)} variant="outline" className="rounded-xl">Réessayer</Button>
                  </div>
                )}

                {/* ── MODE-AWARE ACTION PANEL — FAISABILITÉ ── */}
                <AnimatePresence mode="wait">

                  {/* 🤖 PROACTIF — 3 cards */}
                  {aiMode === 'proactive' && (
                    <motion.div key="feas-proactive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-3 space-y-3 border-t border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-cyan-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                        Mode Proactif — Quelle décision prenez-vous ?
                      </p>
                      {simulatedScore < 50 && !isRescueModeActive ? (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={handleRescueProtocol}
                          className="w-full flex items-center justify-center gap-4 p-4 rounded-2xl bg-red-600 border-2 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:bg-red-500 transition-all group"
                        >
                          <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center relative">
                            <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
                            <AlertTriangle size={20} className="text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black text-white uppercase tracking-widest">🚨 Lancer le Protocole de Sauvetage IA</p>
                            <p className="text-[10px] text-red-200 uppercase font-bold tracking-wider mt-0.5">Pivoter le projet en MVP de Survie (Auto-Pilot)</p>
                          </div>
                        </motion.button>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                            onClick={() => setPendingDecision({
                              stepLabel: 'Analyse de Faisabilité',
                              decision: `Valider — Score ${simulatedScore}/100`,
                              type: 'approve',
                              impact: `Budget: ${simulatedBudgetMin.toLocaleString()}–${simulatedBudgetMax.toLocaleString()} DT`,
                              onConfirm: () => { setDetailsTab("design"); setStep("projet-details") }
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
                      )}
                    </motion.div>
                  )}

                  {/* 🤝 CO-PILOTE — modal */}
                  {aiMode === 'copilot' && (
                    <motion.div key="feas-copilot" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                      <Button variant="ghost" onClick={() => setStep("concept-validation")} className="rounded-xl font-black text-slate-400 hover:text-cyan-500 transition-colors uppercase tracking-widest text-[10px]">← Retour</Button>
                      <motion.div className="flex-1" animate={{ scale: [1, 1.01, 1], boxShadow: ["0 0 20px rgba(34,211,238,0.2)", "0 0 40px rgba(34,211,238,0.4)", "0 0 20px rgba(34,211,238,0.2)"] }} transition={{ duration: 3, repeat: Infinity }}>
                        <Button
                          onClick={() => feasibilityData && setPendingDecision({
                            stepLabel: 'Analyse de Faisabilité',
                            decision: `Valider — Score ${feasibilityData.feasibility_score}/100`,
                            type: 'approve',
                            impact: `Budget: ${(feasibilityData.cost_dt?.min||0).toLocaleString()}–${(feasibilityData.cost_dt?.max||0).toLocaleString()} DT · Risque: ${feasibilityData.risk?.global}`,
                            alternatives: ['Changer de scénario', 'Revenir au concept'],
                            onConfirm: () => { setDetailsTab("design"); setStep("projet-details") }
                          })}
                          disabled={isLoadingFeasibility}
                          className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-sm"
                        >
                          Continuer vers Stack & Architecture <ArrowRight size={15} className="ml-1.5" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  )}

                  {/* 📴 SILENCIEUX — direct */}
                  {aiMode === 'silent' && (
                    <motion.div key="feas-silent" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                      <Button variant="ghost" onClick={() => setStep("concept-validation")} className="h-10 px-3 rounded-xl text-slate-400 font-black text-[9px] uppercase">← Retour</Button>
                      <div className="flex-1" />
                      <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" /> Log auto
                      </div>
                      <Button
                        disabled={isLoadingFeasibility}
                        onClick={() => {
                          logDecision({ step, stepLabel: 'Faisabilité', decision: 'Continuer vers Architecture', reason: '', type: 'approve', impact: `Score: ${feasibilityData?.feasibility_score}/100` })
                          setDetailsTab("design"); setStep("projet-details")
                        }}
                        className="h-10 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-[9px] tracking-widest flex items-center gap-2 transition-all"
                      >
                        Continuer <ArrowRight size={14} />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === "fonctionnalites" && selectedProject && (
              <motion.div key="fonctionnalites" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0"><Bot size={20} className="text-white" /></div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 dark:text-blue-50">Validation Collaborative IA-Manager</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Contrôlez et affinez le planning généré par l'IA</p>
                    </div>
                  </div>
                </div>

                {isGeneratingTasks ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <RefreshCw size={40} className="text-[#00BCD4] animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-600 animate-pulse">L'IA élabore la stratégie technique détaillée...</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Analyse des dépendances et estimation des charges</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Review Panel - Expanded to Full Width */}
                    <div className="col-span-12 space-y-6">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Backlog Suggéré</p>
                            <p className="text-sm font-black text-slate-800">{managerFeatures.length} tâches identifiées</p>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-200" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Durée Totale</p>
                            <p className="text-sm font-black text-slate-800">{Math.round(managerFeatures.reduce((acc, t) => acc + t.duration_hours, 0))} heures</p>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-200" />
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Approbation</p>
                            <p className="text-sm font-black text-emerald-600">{managerFeatures.filter(t => t.status === 'approved').length} / {managerFeatures.length}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" onClick={() => generateDetailedTasks(selectedProject, selectedScenario)} className="h-9 text-[10px] font-black border-slate-200 rounded-xl bg-white hover:bg-slate-50"><RefreshCw size={12} className="mr-2" /> Régénérer tout</Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                        {managerFeatures.map((task, i) => {
                          const isApproved = task.status === 'approved'
                          const isRejected = task.status === 'rejected'
                          
                          return (
                            <motion.div 
                              key={task.id || i}
                              initial={{ opacity: 0, y: 10 }} 
                              animate={{ opacity: 1, y: 0 }} 
                              transition={{ delay: i * 0.05 }}
                              className={`group relative p-4 rounded-3xl border-2 transition-all duration-300 cursor-pointer ${isApproved ? "border-emerald-500/30 bg-emerald-50/20" : isRejected ? "border-rose-200 bg-rose-50/50 opacity-60" : "border-slate-100 bg-white hover:border-[#00BCD4]/30 hover:shadow-xl"}`}
                              onClick={() => setSelectedTaskForDetail(task)}
                            >
                              <div className="flex flex-col h-full justify-between gap-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1.5">
                                      <Badge className={`px-2 py-0.5 rounded-full text-[8px] font-black border-none ${task.risk_level === 'High' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                        {task.risk_level === 'High' ? 'RISQUE ÉLEVÉ' : 'SÉCURISÉ'}
                                      </Badge>
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">{task.category}</span>
                                    </div>
                                    <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">{task.title}</h3>
                                    <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-relaxed">
                                      {task.description}
                                    </p>
                                  </div>

                                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                                    {!isApproved && !isRejected && (
                                      <>
                                        <button 
                                          onClick={() => {
                                            const next = [...managerFeatures]
                                            next[i].status = 'approved'
                                            setManagerFeatures(next)
                                          }}
                                          className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all border border-emerald-100"
                                          title="Approuver"
                                        >
                                          <Check size={16} />
                                        </button>
                                        <button 
                                          onClick={() => {
                                            const next = [...managerFeatures]
                                            next[i].status = 'rejected'
                                            setManagerFeatures(next)
                                          }}
                                          className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all border border-rose-100"
                                          title="Rejeter"
                                        >
                                          <X size={16} />
                                        </button>
                                      </>
                                    )}
                                    
                                    {(isApproved || isRejected) && (
                                      <button 
                                        onClick={() => {
                                          const next = [...managerFeatures]
                                          next[i].status = 'pending'
                                          setManagerFeatures(next)
                                        }}
                                        className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all border border-slate-200"
                                      >
                                        <RefreshCw size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                                  <div className="flex items-center gap-3 text-[10px] font-black text-slate-400">
                                    <div className="flex items-center gap-1.5"><Clock size={12} className="text-[#00BCD4]" /> {task.duration_hours}h</div>
                                  </div>
                                  <div className="text-[10px] font-black text-[#00BCD4] uppercase flex items-center gap-1">
                                    Détails <ChevronRight size={12} />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <Button variant="ghost" onClick={() => setStep("projet-details")} className="rounded-xl font-black text-slate-400">← Détails</Button>
                  <Button
                    disabled={managerFeatures.filter(t => t.status === 'approved').length === 0}
                    onClick={() => {
                      const approved = managerFeatures.filter(t => t.status === 'approved')
                      const rejected = managerFeatures.filter(t => t.status === 'rejected')
                      const proceed = () => setStep("validation")
                      if (aiMode !== 'silent') {
                        setPendingDecision({
                          stepLabel: 'Validation du Backlog',
                          decision: `Valider ${approved.length} tâche${approved.length > 1 ? 's' : ''} approuvée${approved.length > 1 ? 's' : ''}`,
                          type: 'approve',
                          impact: `${rejected.length} tâche${rejected.length > 1 ? 's' : ''} rejetée${rejected.length > 1 ? 's' : ''} · ${Math.round(approved.reduce((a,t) => a + t.duration_hours, 0))}h de travail validées`,
                          alternatives: ['Réviser les tâches', 'Régénérer le backlog'],
                          onConfirm: proceed
                        })
                      } else {
                        logDecision({ step, stepLabel: 'Validation du Backlog', decision: `${approved.length} tâches approuvées`, reason: '', type: 'approve', impact: `${Math.round(approved.reduce((a,t) => a + t.duration_hours, 0))}h validées` })
                        proceed()
                      }
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-2xl font-black shadow-xl shadow-indigo-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    Valider le Backlog Approuvé ({managerFeatures.filter(t => t.status === 'approved').length}) <ChevronRight size={18} className="ml-1.5" />
                  </Button>
                </div>
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
                      const proceed = () => { setStep("ideation"); if (rejectionFeedback) launchIdeationBackground() }
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
                      const proceed = () => { savePreferences(selectedProject, selectedScenario); setStep("prototype") }
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
              const gradClass = p.complexity === "HIGH" ? "from-cyan-900 via-slate-900 to-cyan-900" : p.complexity === "MEDIUM" ? "from-cyan-800 to-blue-900" : "from-cyan-700 to-teal-800"
              const accentColor = p.complexity === "HIGH" ? "#22d3ee" : p.complexity === "MEDIUM" ? "#00BCD4" : "#2dd4bf"
              const teamDev = p.team_distribution?.dev || 50
              const teamDesign = p.team_distribution?.design || 30
              const team3d = p.team_distribution?.three_d || 20

              return (
                <motion.div key="prototype" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shrink-0"><Trophy size={16} className="text-white" /></div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 dark:text-blue-50">ÉTAPE 12 — Brief Projet Final</h2>
                      <p className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest">Rendu exploitable · Prêt pour l'équipe technique</p>
                    </div>
                  </div>

                  {/* ── SECTION 1 : MOCKUP INTERFACE ── */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-blue-800 shadow-lg">
                    {(() => {
                      const isGamingVR = ["jeu", "game", "vr", "réalité", "realite", "virtuel", "virtual", "simulation", "interactif", "3d", "2d", "gameplay", "aventure", "rpg", "fps", "bim", "jumeau", "vfx", "metaverse", "industrie", "digital twin"].some(w => 
                        p.title.toLowerCase().includes(w) || 
                        p.description?.toLowerCase().includes(w) || 
                        comp?.project_type?.toLowerCase().includes(w)
                      );

                      if (isGamingVR) {
                        const bgImage = (generatedImageUrl && generatedImageUrl !== "concept-generated") ? generatedImageUrl : "/default-game-preview.png";
                        return (
                          <div className="relative w-full h-[350px] rounded-t-xl overflow-hidden shadow-inner group">
                            {/* Realistic 3D Environment Background (AI Generated) */}
                            <div 
                              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                              style={{ backgroundImage: `url('${bgImage}')` }} 
                            />
                            
                            {/* Subtle Vignette for depth */}
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.8)_100%)] pointer-events-none" />

                            {/* Watermark / Game Engine logo */}
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 opacity-70 px-4 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                               <span className="text-white text-[10px] font-mono tracking-widest uppercase drop-shadow-md">Unreal Engine 5 Render - {p.title}</span>
                            </div>

                          </div>
                        )
                      } else {
                        // Standard SaaS Dashboard Mockup
                        return (
                          <>
                            {/* Browser chrome */}
                            <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
                              <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-400" /><div className="w-2.5 h-2.5 rounded-full bg-amber-400" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-400" /></div>
                              <div className="flex-1 mx-2 bg-white dark:bg-slate-700 rounded-md px-3 py-1 text-[10px] text-slate-400 font-mono">{p.title.toLowerCase().replace(/\s+/g, "-")}.netinfo.fr</div>
                            </div>
                            {/* App mockup: Futuristic Viewport / HUD */}
                            <div className={`bg-slate-950 p-0 relative h-[280px] overflow-hidden`}>
                              {/* Central Viewport Grid (3D feel) */}
                              <div className="absolute inset-0 opacity-20 pointer-events-none" 
                                style={{ 
                                  backgroundImage: 'radial-gradient(circle at center, transparent 0%, #000 100%), linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)', 
                                  backgroundSize: '100% 100%, 30px 30px, 30px 30px',
                                  transform: 'perspective(500px) rotateX(60deg) translateY(-50px)' 
                                }} 
                              />
                              
                              {/* Immersive Background Glow */}
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(34,211,238,0.15)_0%,_transparent_70%)]" />

                              {/* Top HUD bar */}
                              <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 flex items-center justify-center bg-cyan-950/50 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-white tracking-widest uppercase leading-none">{p.title}</p>
                                    <p className="text-[7px] text-cyan-400 font-bold uppercase tracking-tighter">System Online • v1.0.2</p>
                                  </div>
                                </div>
                                <div className="flex gap-4">
                                  {["Tools", "Data", "Export", "Config"].map(n => (
                                    <span key={n} className="text-white/50 text-[8px] font-black uppercase tracking-widest hover:text-cyan-400 transition-colors cursor-default">{n}</span>
                                  ))}
                                </div>
                              </div>

                              {/* Floating HUD Elements */}
                              <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                                {/* Left HUD: Stats */}
                                <div className="space-y-3">
                                  {[1, 2, 3].map(i => (
                                    <motion.div 
                                      key={i} 
                                      initial={{ x: -20, opacity: 0 }} 
                                      animate={{ x: 0, opacity: 1 }} 
                                      transition={{ delay: i * 0.2 }}
                                      className="w-24 p-2 bg-black/40 backdrop-blur-md border-l-2 border-cyan-500 rounded-r-lg"
                                    >
                                      <div className="h-1 bg-cyan-500/30 rounded-full w-3/4 mb-1" />
                                      <div className="h-1 bg-white/10 rounded-full w-1/2" />
                                    </motion.div>
                                  ))}
                                </div>

                                {/* Center: Aim/Focus (Sci-fi) */}
                                <div className="relative">
                                  <div className="w-24 h-24 rounded-full border border-cyan-500/20 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-cyan-400/40 animate-[spin_10s_linear_infinite]" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-1 h-8 bg-cyan-400/20 absolute" />
                                      <div className="w-8 h-1 bg-cyan-400/20 absolute" />
                                    </div>
                                  </div>
                                </div>

                                {/* Right HUD: Visual parameters */}
                                <div className="space-y-3">
                                  <div className="w-24 p-3 bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-[0_0_20px_rgba(34,211,238,0.1)]">
                                    <p className="text-[7px] font-black text-cyan-400 uppercase tracking-widest mb-2">Parameters</p>
                                    <div className="space-y-2">
                                      <div className="h-1.5 bg-cyan-400/30 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 w-2/3" /></div>
                                      <div className="h-1.5 bg-cyan-400/30 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 w-1/2" /></div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom bar */}
                              <div className="absolute bottom-3 left-4 right-4 h-10 bg-black/60 backdrop-blur-md rounded-2xl border border-white/5 flex items-center px-4 justify-between z-10">
                                <div className="flex gap-1">
                                   {[1,2,3,4,5,6].map(i => <div key={i} className={`w-6 h-1 rounded-full ${i < 4 ? 'bg-cyan-500' : 'bg-white/10'}`} />)}
                                </div>
                                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Aperçu Interactif Temps Réel</span>
                                <div className="flex items-center gap-2">
                                   <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                   <span className="text-[8px] font-black text-emerald-500 uppercase">Engine Ready</span>
                                </div>
                              </div>
                            </div>
                          </>
                        )
                      }
                    })()}
                    <div className="bg-slate-50 dark:bg-blue-950/60 px-4 py-2 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase">Aperçu interface — {p.visual_style || comp?.project_type || "Interface principale"}</span>
                      <span className="text-[9px] font-black" style={{ color: accentColor }}>{p.artistic_direction || "Direction artistique IA"}</span>
                    </div>
                  </motion.div>

                  {/* ── SECTION 2 : TIMELINE GANTT ── */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-slate-200 dark:border-blue-800 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-blue-950/60 px-4 py-2.5 border-b border-slate-100 dark:border-blue-800 flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-600 dark:text-blue-300 uppercase tracking-widest">📅 Timeline — Scénario {selectedScenario} ({weeks} semaines)</span>
                    </div>
                    <div className="p-4 space-y-2">
                      {[
                        { phase: "🔍 Analyse & Design", pct: 0, w: Math.round(weeks * 0.15), color: "#6366F1" },
                        { phase: "⚙️ Développement Core", pct: 15, w: Math.round(weeks * 0.40), color: accentColor },
                        { phase: "🎨 Intégration Design", pct: 35, w: Math.round(weeks * 0.25), color: "#F59E0B" },
                        { phase: "🧪 Tests & Validation", pct: 65, w: Math.round(weeks * 0.15), color: "#10B981" },
                        { phase: "🚀 Livraison", pct: 85, w: Math.round(weeks * 0.10), color: "#EF4444" },
                      ].map((ph, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-[9px] font-bold text-slate-500 dark:text-blue-400 w-36 shrink-0 text-right">{ph.phase}</span>
                          <div className="flex-1 h-5 bg-slate-100 dark:bg-blue-900/30 rounded-full relative">
                            <motion.div
                              initial={{ width: 0 }} animate={{ width: `${(ph.w / weeks) * 100}%` }} transition={{ delay: 0.2 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                              className="h-full rounded-full absolute top-0 flex items-center justify-end pr-2"
                              style={{ left: `${ph.pct}%`, backgroundColor: ph.color + "CC" }}
                            >
                              <span className="text-[8px] font-black text-white">{ph.w}sem</span>
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* ── SECTION 3 : ÉQUIPE + STACK ── */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-2 gap-3">
                    {/* Team distribution */}
                    <div className="rounded-2xl border border-slate-200 dark:border-blue-800 p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">👥 Répartition équipe</p>
                      {[
                        { role: "Dev", pct: teamDev, color: accentColor },
                        { role: "Design", pct: teamDesign, color: "#F59E0B" },
                        { role: "3D/VFX", pct: team3d, color: "#6366F1" },
                      ].map((t, i) => (
                        <div key={i} className="mb-2">
                          <div className="flex justify-between mb-0.5"><span className="text-[9px] font-black text-slate-500">{t.role}</span><span className="text-[9px] font-black" style={{ color: t.color }}>{t.pct}%</span></div>
                          <div className="h-2 bg-slate-100 dark:bg-blue-900/30 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }} className="h-full rounded-full" style={{ backgroundColor: t.color }} />
                          </div>
                        </div>
                      ))}
                      {constraints.teamSize && <p className="text-[9px] text-slate-400 mt-2">Taille: {constraints.teamSize}</p>}
                    </div>

                    {/* Tech stack visual */}
                    <div className="rounded-2xl border border-slate-200 dark:border-blue-800 p-4">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">⚙️ Stack technique</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.stack?.map((s, i) => (
                          <motion.span key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.05 }} className="px-2 py-1 rounded-lg text-[9px] font-black text-white" style={{ backgroundColor: i % 3 === 0 ? accentColor : i % 3 === 1 ? "#6366F1" : "#F59E0B" }}>{s}</motion.span>
                        ))}
                      </div>
                      {(constraints.budget || constraints.deadline) && (
                        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-blue-800 space-y-1">
                          {constraints.budget && <p className="text-[9px] font-black text-amber-600">💰 {constraints.budget}</p>}
                          {constraints.deadline && <p className="text-[9px] font-black text-blue-500">📅 {constraints.deadline}</p>}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* ── SECTION 4 : FEATURE BOARD (kanban-style) ── */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-slate-200 dark:border-blue-800 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-blue-950/60 px-4 py-2.5 border-b border-slate-100 dark:border-blue-800">
                      <span className="text-[10px] font-black text-slate-600 dark:text-blue-300 uppercase tracking-widest">📋 Features Board — {Array.isArray(features) ? features.filter(t => typeof t === 'object' ? t.status === 'approved' : true).length : 0} fonctionnalités</span>
                    </div>
                    <div className="p-3 grid grid-cols-3 gap-2">
                      {(["À faire", "En cours", "Livré"] as const).map((col, ci) => {
                        const approved = Array.isArray(features) ? features.filter(t => typeof t === 'object' ? t.status === 'approved' : true) : []
                        const colFeatures = approved.filter((_, fi) => ci === 0 ? fi < Math.ceil(approved.length * 0.4) : ci === 1 ? fi < Math.ceil(approved.length * 0.7) && fi >= Math.ceil(approved.length * 0.4) : fi >= Math.ceil(approved.length * 0.7))
                        const colColor = ci === 0 ? "bg-slate-100 dark:bg-blue-900/30" : ci === 1 ? "bg-amber-50 dark:bg-amber-900/20" : "bg-emerald-50 dark:bg-emerald-900/20"
                        const dotColor = ci === 0 ? "bg-slate-400" : ci === 1 ? "bg-amber-400" : "bg-emerald-500"
                        return (
                          <div key={col} className={`rounded-xl ${colColor} p-2`}>
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                              <span className="text-[9px] font-black text-slate-500 dark:text-blue-400 uppercase">{col}</span>
                            </div>
                            <div className="space-y-1.5">
                              {colFeatures.map((f, fi) => (
                                <div key={fi} className="bg-white dark:bg-blue-950/50 rounded-lg px-2 py-1.5 shadow-sm">
                                  <p className="text-[9px] font-bold text-slate-600 dark:text-blue-300 leading-tight">{typeof f === 'string' ? f : f.title}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>

                  {/* ── DELIVERABLES ── */}
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">✅ Livrables attendus</p>
                    <div className="grid grid-cols-2 gap-2">
                      {deliverables.map((d, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-blue-300">{d}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Action finale */}
                  <div className="flex gap-3 pt-1">
                    <Button variant="ghost" onClick={() => setStep("validation")} className="rounded-xl font-black text-slate-400">← Retour</Button>
                    <Button
                      onClick={() => {
                        const desc = `${p.title} — ${p.description} Stack: ${p.stack?.join(", ")}. Fonctionnalités: ${features.join(", ")}. Scénario ${selectedScenario}: ${weeks} semaines. Contraintes: budget=${constraints.budget || "N/A"}, équipe=${constraints.teamSize || "N/A"}, deadline=${constraints.deadline || "N/A"}.${analysisPlan?.enriched_description ? " Contexte tech: " + analysisPlan.enriched_description : ""}`
                        handleAnalyze(desc)
                      }}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-5 rounded-xl font-black shadow-lg shadow-emerald-400/20"
                    >
                      <Sparkles size={16} className="mr-2" /> Créer le Projet & Générer les Tâches
                    </Button>
                  </div>
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
                        <div key={n} className={`w-2.5 h-2.5 rounded-full transition-all ${
                          n < copilotSession.currentIdeaIndex ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]' :
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

                {/* ── FINAL RANKING ── */}
                {copilotSession?.conversationStep === 'FINAL_RANKING' && copilotSession?.ranking && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">🏆 Classement Final — Décision Manager</p>
                    {copilotSession.ranking.map((r: any) => (
                      <motion.button
                        key={r.rank}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: r.rank * 0.1 }}
                        onClick={() => {
                          setSelectedIdea({ id: r.rank, title: r.title, description: r.description, score: r.confidence })
                          setRawIdea(r.title + " — " + r.description)
                          launchComprehension()
                        }}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:shadow-lg ${
                          r.rank === 1 ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 hover:shadow-amber-200' :
                          r.rank === 2 ? 'border-slate-300 bg-slate-50 dark:bg-slate-800/50 hover:shadow-slate-200' :
                          'border-orange-300 bg-orange-50/50 dark:bg-orange-900/10 hover:shadow-orange-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-lg">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
                          <span className={`text-sm font-black ${ r.rank === 1 ? 'text-amber-600' : r.rank === 2 ? 'text-slate-500' : 'text-orange-500' }`}>{r.confidence}%</span>
                        </div>
                        <p className="font-black text-slate-800 dark:text-white text-sm">{r.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{r.verdict}</p>
                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mt-2">→ Sélectionner cette idée</p>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ── CHAT FEED ── */}
                {!isStartingCopilot && copilotSession && copilotSession.conversationStep !== 'FINAL_RANKING' && (
                  <div ref={copilotChatRef} className="space-y-3 max-h-[380px] overflow-y-auto pr-1 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] no-scrollbar">
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
                            className={`flex gap-3 items-start ${ isManager ? 'flex-row-reverse' : '' }`}
                          >
                            {/* Avatar */}
                            {!isSystem && (
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                                msg.role === 'AI_IDEA' ? 'bg-gradient-to-br from-cyan-400 to-cyan-600' :
                                msg.role === 'AI_CRITIQUE' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600' :
                                'bg-gradient-to-br from-slate-700 to-slate-900'
                              }`}>
                                {isManager ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                              </div>
                            )}
                            {/* Bubble */}
                            <div className={`flex-1 max-w-[85%] ${ isSystem ? 'mx-auto' : '' }`}>
                              {!isSystem && (
                                <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${
                                  msg.role === 'AI_IDEA' ? 'text-cyan-500' :
                                  msg.role === 'AI_CRITIQUE' ? 'text-indigo-500' :
                                  'text-slate-400 text-right'
                                }`}>
                                  {msg.role === 'AI_IDEA' ? `💡 IA — Idée ${copilotSession.currentIdeaIndex}/3` :
                                   msg.role === 'AI_CRITIQUE' ? '🤖 IA — Analyse' : '🧑 Manager'}
                                </p>
                              )}
                              <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                                isSystem
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 text-center text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full'
                                  : isManager
                                  ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-tr-sm shadow-md'
                                  : msg.role === 'AI_IDEA'
                                  ? 'bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/20 dark:to-slate-900 border border-cyan-100 dark:border-cyan-800/30 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm'
                                  : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-tl-sm shadow-sm'
                              }`}>
                                {/* Confidence badge for AI_IDEA */}
                                {msg.role === 'AI_IDEA' && copilotSession.ideas?.[copilotSession.currentIdeaIndex - 1]?.confidence && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[9px] font-black bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded-full">
                                      {copilotSession.ideas[copilotSession.currentIdeaIndex - 1].confidence}% confiance
                                    </span>
                                  </div>
                                )}
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
                          {[0,1,2].map(i => <motion.div key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" animate={{ y: [0,-4,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}
                        </div>
                        <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">L'IA analyse...</span>
                      </motion.div>
                    )}
                  </div>
                )}

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
                          className={`p-2.5 rounded-full transition-all flex items-center justify-center ${ isListeningCopilot ? 'bg-rose-500 text-white animate-pulse shadow-md' : 'bg-white dark:bg-slate-700 text-slate-500 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 shadow-sm border border-slate-200 dark:border-slate-600' }`}
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
                      <Button
                        onClick={nextCopilotIdea}
                        className="flex-1 bg-gradient-to-r from-cyan-400 to-cyan-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-cyan-500/20"
                      >
                        Idée Suivante ({copilotSession.currentIdeaIndex + 1}/3) <ArrowRight size={16} className="ml-2" />
                      </Button>
                    ) : (
                      <Button
                        onClick={finalizeCopilot}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/20"
                      >
                        <Trophy size={16} className="mr-2" /> Voir le Classement Final
                      </Button>
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

            {/* ─── WAR ROOM PICK IDEA (ITERATIVE WAVES) ─── */}
            {step === "warroom-pick" && (
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 mb-1.5 block tracking-widest">Échéance (Optionnel)</Label>
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
                        if (v) {
                          const desc = selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea;
                          launchComprehension(desc);
                        }
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
                      className="w-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-cyan-400 bg-[length:200%_auto] animate-gradient-x text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl border border-cyan-300/30 transition-all hover:-translate-y-0.5"
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
                          const isSelected = selectedArticle?.id === article.id
                          const isVideo = article.type === "VIDEO"
                          return (
                            <motion.div
                              key={article.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              onClick={() => {
                                const willSelect = !isSelected;
                                setSelectedArticle(willSelect ? article : null);
                                if (willSelect) {
                                  setTimeout(() => analyzeTrend(article), 600);
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
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">{article.snippet}</p>
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

                              {/* Score + selection */}
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className={`text-[11px] font-black px-2 py-1 rounded-lg ${article.innovation_score >= 90 ? "bg-emerald-100 text-emerald-700" : article.innovation_score >= 80 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                  {article.innovation_score}%
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="text-[#00BCD4]" />}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setStep("design-brief")} className="rounded-xl font-black text-slate-400">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                      <Button
                        disabled={isFetchingTech || !selectedArticle}
                        onClick={() => selectedArticle && analyzeTrend(selectedArticle)}
                        className={`flex-1 py-5 rounded-xl font-black text-sm transition-all duration-300 ${isFetchingTech || !selectedArticle ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white shadow-lg shadow-cyan-400/20 hover:-translate-y-0.5"}`}
                      >
                        <Sparkles size={15} className="mr-2" />
                        Analyser cette tendance <ArrowRight size={15} className="ml-1.5" />
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
                {techSubPhase === "plan" && analysisPlan && selectedArticle && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {/* Selected trend recap */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedArticle.type === "VIDEO" ? "bg-red-100" : "bg-blue-50"}`}>
                        {selectedArticle.type === "VIDEO" ? <PlayCircle size={15} className="text-red-500" /> : <BookOpen size={15} className="text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedArticle.category}</p>
                        <p className="text-xs font-black text-slate-700 truncate">{selectedArticle.title}</p>
                      </div>
                      <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="text-[#00BCD4] hover:text-[#0097a7]">
                        <ExternalLink size={14} />
                      </a>
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
                          } else {
                            handleAnalyze(enrichedDesc)
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white py-5 rounded-xl font-black text-sm shadow-lg shadow-cyan-400/20 hover:-translate-y-0.5 transition-all"
                      >
                        {waitingForIdeation ? (
                          <><RefreshCw size={15} className="mr-2 animate-spin" /> Génération en cours...</>
                        ) : (
                          <><Sparkles size={15} className="mr-2" />
                            {lang === 'fr' ? 'Voir mes Projets' : 'View my Projects'} <ArrowRight size={15} className="ml-1.5" /></>
                        )}
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
                                  setSelectedArticle(detailArticle);
                                  setDetailArticle(null);
                                  setTimeout(() => analyzeTrend(detailArticle), 50);
                                }}
                                className="w-full bg-gradient-to-r from-[#00BCD4] to-[#0097a7] hover:-translate-y-0.5 transition-all text-white rounded-xl font-black text-[11px] h-12 shadow-md shadow-cyan-500/20"
                              >
                                L'INTÉGRER
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
                    disabled={projectName.length === 0 || files.length === 0}
                    onClick={() => {
                      setStep("warroom-tech");
                      const fileNames = files.map(f => f.name).join(" ");
                      fetchTechArticles(`Projet : ${projectName} - Fichiers : ${fileNames}`);
                    }}
                    className="flex-[2] bg-[#00BCD4] hover:bg-[#0097a7] text-white py-6 rounded-xl font-black text-lg shadow-lg shadow-[#00BCD4]/20"
                  >
                    {lang === 'fr' ? 'Passer à la Veille Tech' : 'Proceed to Tech Watch'} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}

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
              <motion.div key="done" variants={fade} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center space-y-8 py-10">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                  <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200 }} className="relative w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-green-500/30">
                    <Trophy className="w-12 h-12" />
                  </motion.div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-slate-900">{lang === 'fr' ? 'Projet Créé !' : 'Project Created !'}</h2>
                  <p className="text-slate-500 font-medium max-w-xs mx-auto">Votre projet <span className="text-slate-900 font-black">"{projectName}"</span> est prêt avec une intégration IA complète.</p>
                </div>
                {/* ÉTAPE 12 — Amélioration continue */}
                {managerInsights && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="w-full rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 dark:border-violet-800 p-4 space-y-2">
                    <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">🧠 ÉTAPE 12 — Amélioration Continue</p>
                    <p className="text-xs font-medium text-slate-600 dark:text-blue-200">Le système a appris de vos <span className="font-black text-violet-700 dark:text-violet-300">{managerInsights.total_validated}</span> projet(s) validé(s).</p>
                    <div className="flex gap-2 flex-wrap">
                      {managerInsights.top_stacks?.map((s: string, i: number) => (
                        <span key={i} className="text-[9px] font-black bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-1 rounded-full border border-violet-200 dark:border-violet-700">{s}</span>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium">Complexité préférée : <span className="font-black">{managerInsights.preferred_complexity}</span> · Scénario : <span className="font-black">{managerInsights.preferred_scenario}</span></p>
                  </motion.div>
                )}
                <div className="pt-4 w-full">
                  <Button
                    onClick={() => { if (createdProjectId) router.push(`/projects/${createdProjectId}`); onSuccess(); onClose() }}
                    className="w-full bg-[#00BCD4] hover:bg-[#0097a7] text-white py-8 rounded-2xl font-black text-xl shadow-lg shadow-[#00BCD4]/20"
                  >
                    {lang === 'fr' ? 'Aller au Projet' : 'Go to Project'} <ChevronRight className="ml-2 w-6 h-6" />
                  </Button>
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
                      onChange={e => editingTask && setEditingTask({...editingTask, title: e.target.value})}
                      className="rounded-xl border-slate-200 font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Description détaillée</Label>
                    <Textarea 
                      value={editingTask?.description || ""} 
                      onChange={e => editingTask && setEditingTask({...editingTask, description: e.target.value})}
                      className="rounded-xl border-slate-200 min-h-[100px] text-sm leading-relaxed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Priorité</Label>
                      <Select value={editingTask?.priority || "Medium"} onValueChange={v => editingTask && setEditingTask({...editingTask, priority: v as any})}>
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
                        onChange={e => editingTask && setEditingTask({...editingTask, duration_hours: parseInt(e.target.value)})}
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Rôle assigné</Label>
                      <Input 
                        value={editingTask?.role || ""} 
                        onChange={e => editingTask && setEditingTask({...editingTask, role: e.target.value})}
                        placeholder="Ex: Lead Dev, 3D Artist"
                        className="rounded-xl border-slate-200"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Risque</Label>
                      <Select value={editingTask?.risk_level || "Low"} onValueChange={v => editingTask && setEditingTask({...editingTask, risk_level: v as any})}>
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
                        onChange={e => editingTask && setEditingTask({...editingTask, tools: e.target.value.split(",").map(t => t.trim())})}
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
            <DialogContent className="sm:max-w-[700px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl bg-white">
              {selectedTaskForDetail && (
                <>
                  <div className="bg-slate-900 p-8 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10"><Box size={120} className="text-[#00BCD4]" /></div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                           <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${selectedTaskForDetail.priority === 'High' ? 'bg-rose-500 text-white' : 'bg-amber-400 text-slate-900'}`}>
                              Priorité {selectedTaskForDetail.priority}
                           </div>
                           <div className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-[10px] font-black uppercase tracking-tighter">
                              {selectedTaskForDetail.category}
                           </div>
                        </div>
                        <h2 className="text-3xl font-black text-white leading-tight mb-2">{selectedTaskForDetail.title}</h2>
                        <div className="flex items-center gap-6 text-white/50 text-sm font-bold">
                           <div className="flex items-center gap-2"><Clock size={16} className="text-[#00BCD4]" /> {selectedTaskForDetail.duration_hours} heures</div>
                           <div className="flex items-center gap-2"><Target size={16} className="text-[#00BCD4]" /> Sprint {selectedTaskForDetail.sprint}</div>
                        </div>
                     </div>
                  </div>

                  <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
                     {/* Description Section */}
                     <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           <FileText size={14} /> Description de la mission
                        </h3>
                        <p className="text-slate-600 text-base leading-relaxed font-medium">
                           {selectedTaskForDetail.description}
                        </p>
                     </div>

                     {/* AI Reasoning Section */}
                     <div className="bg-indigo-50/50 rounded-3xl p-6 border border-indigo-100">
                        <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2 mb-3">
                           <Lightbulb size={14} /> Pourquoi cette tâche ? (Audit IA)
                        </h3>
                        <p className="text-indigo-900/70 text-sm italic leading-relaxed font-medium">
                           {selectedTaskForDetail.reasoning}
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        {/* Tools Section */}
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <Cpu size={14} /> Stack & Outils
                           </h4>
                           <div className="flex flex-wrap gap-2">
                              {selectedTaskForDetail.tools.map((tool, ti) => (
                                 <span key={ti} className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black border border-slate-200">
                                    {tool}
                                 </span>
                              ))}
                           </div>
                        </div>

                        {/* Risk Section */}
                        <div className="space-y-3">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle size={14} /> Analyse de Risque
                           </h4>
                           <div className={`p-4 rounded-2xl border-2 space-y-2 ${selectedTaskForDetail.risk_level === 'High' ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}>
                              <div className="flex items-center gap-3">
                                 <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${selectedTaskForDetail.risk_level === 'High' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                 <span className={`text-sm font-black uppercase ${selectedTaskForDetail.risk_level === 'High' ? 'text-rose-600' : 'text-emerald-600'}`}>Niveau {selectedTaskForDetail.risk_level}</span>
                              </div>
                              {selectedTaskForDetail.mitigation && (
                                 <div className="pt-2 border-t border-black/5">
                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Stratégie de Mitigation</p>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{selectedTaskForDetail.mitigation}"</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Alternative Section if rejected */}
                     {selectedTaskForDetail.status === 'rejected' && (
                        <div className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-200 border-dashed space-y-4">
                           <div>
                              <h4 className="text-xs font-black text-rose-600 uppercase mb-1">Remplacer cette tâche</h4>
                              <p className="text-[11px] text-rose-400 font-bold">Cette feature a été écartée. Souhaitez-vous une alternative ?</p>
                           </div>
                           <div className="flex gap-3">
                              <Button 
                                 onClick={() => {
                                    if (selectedProject) suggestAlternativeTask(selectedTaskForDetail, selectedProject)
                                    setSelectedTaskForDetail(null)
                                 }}
                                 className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black py-6 shadow-lg shadow-rose-200"
                              >
                                 🚀 Proposer une alternative IA
                              </Button>
                              <div className="flex-[1.2] relative">
                                 <Input 
                                    placeholder="Saisir manuellement..."
                                    className="h-full rounded-2xl border-rose-200 bg-white font-bold"
                                    onKeyDown={(e) => {
                                       if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                          const next = managerFeatures.map(t => t.id === selectedTaskForDetail.id ? { ...t, title: e.currentTarget.value.trim(), status: 'approved' as const, reasoning: 'Tâche personnalisée par le manager' } : t) as ProjectTask[]
                                          setManagerFeatures(next)
                                          setSelectedTaskForDetail(null)
                                       }
                                    }}
                                 />
                              </div>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                     <Button 
                        variant="ghost" 
                        onClick={() => setSelectedTaskForDetail(null)}
                        className="flex-1 rounded-2xl font-black text-slate-400 h-14"
                     >
                        Fermer
                     </Button>
                     <Button 
                        onClick={() => {
                           setEditingTask(selectedTaskForDetail)
                           setSelectedTaskForDetail(null)
                        }}
                        className="flex-1 bg-white border-2 border-slate-200 hover:border-[#00BCD4] text-slate-600 hover:text-[#00BCD4] rounded-2xl font-black h-14 transition-all"
                     >
                        <Edit3 size={18} className="mr-2" /> Modifier la fiche
                     </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>  {/* end p-6 */}
        </div>  {/* end right panel */}
      </div>  {/* end two-panel flex */}
    </div>
  )
}
export default CreateProjectWizard

