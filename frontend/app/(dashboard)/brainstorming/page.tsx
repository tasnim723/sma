"use client"
import { API_BASE_URL } from "@/lib/api"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, Lightbulb, Zap, ArrowRight, Bot, 
  Terminal, Sparkles, Send, RefreshCw, Layers, ShieldCheck, Users, Mic
} from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '@/lib/store'
import { useLang } from '@/lib/useLang'
import { useSearchParams } from 'next/navigation'
import TeamBrainstormRoom from '@/components/brainstorming/TeamBrainstormRoom'

interface Message {
  agent_name: string
  content: string
  phase: string
  role?: 'AI' | 'MANAGER' | 'TEAM'
  user_id?: string
  timestamp: string
}

interface Participant {
  id: string
  name: string
  avatar?: string
  gender?: string
  avatar_url?: string
  role: string
}

interface IdeaThread {
  id: string
  title: string
  description: string
  messages: Message[]
  votes: Record<string, number>
}

interface Session {
  id: string
  topic: string
  mode?: 'AI' | 'TEAM' | 'WARROOM'
  status: string
  messages: Message[]
  summary?: string
  participants: Participant[]
  typing_users: string[]
  threads: IdeaThread[]
}

// ── Score breakdown sub-component (avoids IIFE in JSX) ──────────────────────
function AnimatedBar({ pct, color, delay }: { pct: number; color: string; delay: number }) {
  const [width, setWidth] = React.useState(0)
  React.useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120 + delay * 180)
    return () => clearTimeout(t)
  }, [pct, delay])
  return (
    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
      {/* Track shimmer */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-1/3 rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }}
          animate={{ x: ['-100%', '400%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: delay * 0.3 }}
        />
      </div>
      {/* Fill bar */}
      <div
        className="h-full rounded-full relative overflow-hidden"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: 'width 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `0 0 8px ${color}66`,
        }}
      >
        {/* Glow pulse on fill tip */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-3 rounded-full"
          style={{ background: color, filter: 'blur(3px)' }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

function AnimatedScore({ target, color, delay }: { target: number; color: string; delay: number }) {
  const [val, setVal] = React.useState(0)
  React.useEffect(() => {
    const start = Date.now()
    const duration = 1000
    const startDelay = 150 + delay * 180
    const t = setTimeout(() => {
      const tick = () => {
        const elapsed = Date.now() - start - startDelay
        if (elapsed < 0) { requestAnimationFrame(tick); return }
        const progress = Math.min(elapsed / duration, 1)
        // ease-out-expo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setVal(Math.round(eased * target))
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, startDelay)
    return () => clearTimeout(t)
  }, [target, delay])
  return (
    <div className="w-[46px] shrink-0 text-right">
      <span className="text-[18px] font-black leading-none tabular-nums" style={{ color }}>{val}</span>
      <span className="text-[9px] font-black text-slate-400">%</span>
    </div>
  )
}

function ScoreBreakdown({ data, rankItem, idea }: { data: any; rankItem: any; idea: any }) {
  const bd: any[] = data.breakdown?.length ? data.breakdown : [
    { criterion: 'Innovation',  weight: '30%', score: data.innovation  ?? 85, justification: '' },
    { criterion: 'Faisabilité', weight: '25%', score: data.feasibility ?? 75, justification: '' },
    { criterion: 'Impact',      weight: '25%', score: data.impact      ?? 90, justification: '' },
    { criterion: 'Cohérence',   weight: '20%', score: data.coherence   ?? 80, justification: '' },
  ]
  const weights = [0.30, 0.25, 0.25, 0.20]
  // Always recompute from breakdown to stay consistent with the displayed formula
  const computedScore = bd.length >= 4
    ? Math.round(bd.slice(0, 4).reduce((sum, item, i) => sum + Number(item.score) * weights[i], 0))
    : Math.round(Number(data.final_score ?? data.confidence ?? 80))

  const colors = ['#00BCD4', '#6366f1', '#10b981', '#f59e0b']

  // Animated global score counter
  const [globalVal, setGlobalVal] = React.useState(0)
  React.useEffect(() => {
    const duration = 1200
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setGlobalVal(Math.round(eased * computedScore))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [computedScore])

  return (
    <>
      {/* Header: title + animated global score */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden"
      >
        {/* Subtle cyan sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(0,188,212,0.06) 50%, transparent 100%)' }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />
        <div className="w-1 self-stretch rounded-full bg-[#00BCD4] shrink-0" />
        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-[11px] font-black text-slate-800 leading-snug truncate">
            {rankItem?.title || idea?.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#00BCD4]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <p className="text-[8px] font-black text-[#00BCD4] uppercase tracking-[0.18em]">Brainstorming</p>
          </div>
        </div>
        {/* Global score */}
        <div className="shrink-0 text-right relative z-10">
          <div className="flex items-end gap-0.5 justify-end">
            <span className="text-[38px] font-black text-slate-900 leading-none tracking-tighter tabular-nums">{globalVal}</span>
            <span className="text-[15px] font-black text-slate-400 mb-1">%</span>
          </div>
          <div className="flex items-center gap-1 justify-end">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 6px #10b981' }}
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <p className="text-[7px] font-black text-emerald-500 uppercase tracking-[0.15em]">Validé</p>
          </div>
        </div>
      </motion.div>

      {/* Formula pill */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
      >
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-[#e63946] shrink-0"
          animate={{ scale: [1, 1.6, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <p className="text-[8.5px] font-mono text-slate-500 font-bold tracking-tight">
          <span className="italic">f(S)</span> = (Inno×0.3) + (Fais×0.25) + (Imp×0.25) + (Coh×0.2)
        </p>
      </motion.div>

      {/* Landscape rows — staggered entrance */}
      <div className="space-y-2 mb-3">
        {bd.map((item: any, i: number) => {
          const pct = Math.min(100, Math.max(0, Number(item.score)))
          const color = colors[i] || '#00BCD4'
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4, ease: 'easeOut' }}
              whileHover={{ scale: 1.015, boxShadow: `0 0 0 1.5px ${color}55, 0 4px 16px ${color}22` }}
              className="flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border border-slate-100 shadow-sm cursor-default transition-colors"
              style={{ borderColor: 'rgba(226,232,240,1)' }}
            >
              {/* Left: criterion + weight */}
              <div className="w-[88px] shrink-0">
                <p className="text-[8.5px] font-black text-slate-500 uppercase tracking-[0.1em] leading-none">{item.criterion}</p>
                <motion.p
                  className="text-[8px] font-bold mt-0.5"
                  style={{ color }}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                >
                  {item.weight}
                </motion.p>
              </div>

              {/* Middle: animated progress bar */}
              <AnimatedBar pct={pct} color={color} delay={i} />

              {/* Right: animated score counter */}
              <AnimatedScore target={pct} color={color} delay={i} />

              {/* Justification — truncated, full on hover */}
              {item.justification && (
                <p
                  className="hidden sm:block text-[8px] text-slate-400 italic leading-snug w-[130px] shrink-0 truncate"
                  title={item.justification}
                >
                  {item.justification}
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Summary — fade in last */}
      {data.summary && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="text-[9.5px] text-slate-400 italic text-center leading-relaxed px-1"
        >
          {data.summary}
        </motion.p>
      )}
    </>
  )
}

export default function BrainstormingWarRoom() {
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const { t, lang } = useLang()
  
  const cleanTopic = (text: string) => {
    if (!text) return ''
    // Remove all bracketed manager directives
    let cleaned = text.replace(/\[Directive Manager:.*?\]/g, '').trim()
    
    // Remove redundant "War Room:" prefix if present
    cleaned = cleaned.replace(/^War Room:\s*/i, '')
    
    // Fix repetition like "Topic - Topic"
    const parts = cleaned.split(' - ')
    if (parts.length > 1 && parts[0].trim() === parts[1].trim()) {
      cleaned = parts[0].trim()
    }
    
    return cleaned
  }
  const [topic, setTopic] = useState('')
  const [mode, setMode] = useState<'AI' | 'TEAM'>('AI')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Session | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Copilot state
  const [copilotSession, setCopilotSession] = useState<any>(null)
  const [copilotInput, setCopilotInput] = useState('')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [isStartingCopilot, setIsStartingCopilot] = useState(false)
  const [isListeningCopilot, setIsListeningCopilot] = useState(false)
  const [scoreModal, setScoreModal] = useState<any>(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  // Cache formula-computed scores per idea title so cards stay in sync with the modal
  const [computedScores, setComputedScores] = useState<Record<string, number>>({})
  const [ideaDetailModal, setIdeaDetailModal] = useState<{ idea: any; rankItem: any } | null>(null)
  const copilotChatRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [isListening, setIsListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<any>(null)
  const searchParams = useSearchParams()

  // ── Voice Toggle (4-state lifecycle per message) ──────────────────────────
  // voiceStates tracks: 'idle' | 'playing' | 'paused' | 'ended' per message key
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
        ut.rate = 1.0
        ut.pitch = 1.0
        ut.onend = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'ended' }))
        ut.onerror = () => setVoiceStates(prev => ({ ...prev, [msgKey]: 'idle' }))
        utteranceRef.current[msgKey] = ut
        window.speechSynthesis.speak(ut)
        break
      }
      case 'playing': {
        // Pause
        window.speechSynthesis.pause()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'paused' }))
        break
      }
      case 'paused': {
        // Resume
        window.speechSynthesis.resume()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'playing' }))
        break
      }
      case 'ended': {
        // Replay from beginning
        window.speechSynthesis.cancel()
        setVoiceStates(prev => ({ ...prev, [msgKey]: 'playing' }))

        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*_~`]/g, '')
        const ut = new SpeechSynthesisUtterance(cleanText)
        ut.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
        ut.rate = 1.0
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
  const urlSessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!token) return   // wait for Zustand to rehydrate from localStorage
    fetchSessions()
    if (urlSessionId) {
      loadSession(urlSessionId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSessionId, token ?? ''])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeSession?.messages])

  // Polling for active session updates (only for legacy WARROOM/TEAM sessions, not copilot)
  useEffect(() => {
    let interval: any
    if (activeSession && activeSession.status === 'RUNNING' && activeSession.mode === 'TEAM') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/api/brainstorming/warroom/${activeSession.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          setActiveSession(res.data)
          if (res.data.status === 'COMPLETED') clearInterval(interval)
        } catch (err) {
          console.error(err)
        }
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [activeSession?.id, activeSession?.status, token])

  // Join session in TEAM mode
  useEffect(() => {
    if (activeSession && activeSession.mode === 'TEAM' && user) {
      const isAlreadyParticipant = activeSession.participants?.some(p => p.id === user.id)
      if (!isAlreadyParticipant) {
        axios.post(`${API_BASE_URL}/api/brainstorming/${activeSession.id}/join`, {
          user_id: user.id,
          name: user.full_name,
          role: user.role === 'PROJECT_MANAGER' ? 'MANAGER' : 'TEAM',
          gender: (user as any)?.gender || "",
          avatar_url: (user as any)?.avatar_url || "",
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.error(err))
      }
    }
  }, [activeSession?.id, user, token])

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/brainstorming/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Show only sessions created from this page — exclude wizard sessions (is_wizard === true)
      setSessions(res.data.filter((s: any) => s.is_wizard !== true))
    } catch (err) {
      console.error(err)
    }
  }

  const deleteSession = async (session: Session) => {
    setDeleting(true)
    try {
      await axios.delete(`${API_BASE_URL}/api/brainstorming/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSessions(prev => prev.filter(s => s.id !== session.id))
      if (activeSession?.id === session.id) setActiveSession(null)
      setDeleteConfirm(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  // Auto-scroll copilot chat
  useEffect(() => {
    if (copilotChatRef.current) {
      copilotChatRef.current.scrollTop = copilotChatRef.current.scrollHeight
    }
  }, [copilotSession?.feedbackHistory])

  const startCopilot = async () => {
    if (!topic.trim()) return
    setIsStartingCopilot(true)
    setCopilotSession(null)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/copilot/start`, {
        topic,
        project_name: '',
        mode: 'creative'
      }, { headers: { Authorization: `Bearer ${token}` } })
      setCopilotSession(res.data)
      fetchSessions()
    } catch (err) { console.error(err) }
    finally { setIsStartingCopilot(false) }
  }

  // NOTE: submitCopilotFeedback is declared below after nextCopilotIdea / finalizeCopilot
  // to avoid the Temporal Dead Zone (const functions cannot be forward-referenced).
  // This ref is used as a stable pointer so the JSX submit button can call it.
  const submitCopilotFeedbackRef = React.useRef<() => Promise<void>>(async () => {})

  const nextCopilotIdea = async () => {
    if (!copilotSession?.id) return
    setIsSubmittingFeedback(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/next`, {
        user_name: user?.full_name || 'Manager'
      }, { headers: { Authorization: `Bearer ${token}` } })
      setCopilotSession(res.data)
    } catch (err) { console.error(err) }
    finally { setIsSubmittingFeedback(false) }
  }

  const finalizeCopilot = async () => {
    if (!copilotSession?.id) return
    setIsSubmittingFeedback(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/finalize`, {},
        { headers: { Authorization: `Bearer ${token}` } })
      setCopilotSession(res.data)
    } catch (err) { console.error(err) }
    finally { setIsSubmittingFeedback(false) }
  }

  // ── submitCopilotFeedback (defined after helpers to avoid Temporal Dead Zone) ──
  const showCommandToast = (label: string) => {
    if (typeof window === 'undefined') return
    const flash = document.createElement('div')
    flash.innerText = label
    flash.style.cssText = [
      'position:fixed', 'bottom:90px', 'left:50%', 'transform:translateX(-50%)',
      'background:linear-gradient(135deg,#0f172a,#00BCD4)', 'color:white',
      'padding:10px 24px', 'border-radius:99px', 'font-weight:900',
      'font-size:13px', 'letter-spacing:0.1em',
      'box-shadow:0 0 30px rgba(0,188,212,0.5)', 'z-index:9999',
      'animation:jarvisToast 2.2s ease forwards',
    ].join(';')
    const style = document.createElement('style')
    style.textContent = '@keyframes jarvisToast{0%{opacity:0;transform:translateX(-50%) translateY(10px)}20%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0}}'
    document.head.appendChild(style)
    document.body.appendChild(flash)
    setTimeout(() => { flash.remove(); style.remove() }, 2300)
  }

  const submitCopilotFeedback = async () => {
    if (!copilotInput.trim() || !copilotSession?.id) return
    const feedback = copilotInput.trim()

    // ── Intercept typed shortcut commands (with or without "Jarvis" prefix) ──
    const TYPED_COMMANDS = [
      {
        pattern: /^(jarvis[,.]?\s*)?(suivant|next|idée suivante)[\s!]*$/i,
        action: () => nextCopilotIdea(),
        label: '⚡ Jarvis → Idée suivante',
      },
      {
        pattern: /^(jarvis[,.]?\s*)?(valid[eé]e?|finalize|classement|ranking)[\s!]*$/i,
        action: () => finalizeCopilot(),
        label: '🏆 Jarvis → Classement final',
      },
      {
        pattern: /^(jarvis[,.]?\s*)?(recommence[!]?|restart|reset|relance)[\s!]*$/i,
        action: () => { setCopilotSession(null); setTopic('') },
        label: '🔄 Jarvis → Redémarrage',
      },
    ]

    for (const cmd of TYPED_COMMANDS) {
      if (cmd.pattern.test(feedback)) {
        setCopilotInput('')
        showCommandToast(cmd.label)
        cmd.action()
        return
      }
    }

    // Normal feedback path
    setCopilotInput('')
    setIsSubmittingFeedback(true)
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/brainstorming/copilot/${copilotSession.id}/feedback`,
        { feedback, user_name: user?.full_name || 'Manager' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setCopilotSession(res.data)
    } catch (err) { console.error(err) }
    finally { setIsSubmittingFeedback(false) }
  }

  const downloadTop3PDF = (session: any) => {
    const ranking: any[] = session?.ranking || []
    const ideas: any[] = session?.ideas || []
    const sessionTopic: string = session?.topic || 'Brainstorming SMA'

    // Dynamic import — client-side only, never runs during SSR
    if (typeof window === 'undefined') return
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()   // 210
      const pageH = doc.internal.pageSize.getHeight()  // 297
      const margin = 14
      const contentW = pageW - margin * 2

      // ── helpers ──────────────────────────────────────────────────────────
      const addPageIfNeeded = (neededHeight: number, curY: number): number => {
        if (curY + neededHeight > pageH - 16) {
          doc.addPage()
          return 20
        }
        return curY
      }

      const wrappedText = (text: string, x: number, y: number, maxW: number, lineH: number): number => {
        const lines: string[] = doc.splitTextToSize(text, maxW)
        doc.text(lines, x, y)
        return y + lines.length * lineH
      }

      // ── HEADER BLOCK ─────────────────────────────────────────────────────
      // Dark background
      doc.setFillColor(15, 23, 42)
      doc.roundedRect(margin, 10, contentW, 36, 4, 4, 'F')

      // Cyan accent bar
      doc.setFillColor(0, 188, 212)
      doc.rect(margin, 10, 3, 36, 'F')

      // Label
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(0, 188, 212)
      doc.text('SMA WAR ROOM — CO-PILOTE IA', margin + 8, 19)

      // Topic
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      const displayTitle = ranking.length > 0 ? ranking[0].title : sessionTopic;
      const topicLines: string[] = doc.splitTextToSize(displayTitle, contentW - 12)
      doc.text(topicLines, margin + 8, 27)

      // Date
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
        margin + 8,
        43
      )

      // ── SECTION TITLE ────────────────────────────────────────────────────
      let y = 56
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(0, 188, 212)
      doc.text('CLASSEMENT FINAL — TOP 3 IDEES', margin, y)
      y += 2

      // Cyan underline
      doc.setDrawColor(0, 188, 212)
      doc.setLineWidth(0.4)
      doc.line(margin, y, margin + 80, y)
      y += 6

      // ── IDEA CARDS ───────────────────────────────────────────────────────
      const medals = ['1er', '2eme', '3eme']
      const rankColors: [number, number, number][] = [
        [245, 158, 11],   // amber  — gold
        [148, 163, 184],  // slate  — silver
        [249, 115, 22],   // orange — bronze
      ]

      ranking.forEach((r: any, idx: number) => {
        // Fuzzy-match idea for full description
        const idea = ideas.find((i: any) => i.title === r.title)
          || ideas.find((i: any) => i.title?.toLowerCase() === r.title?.toLowerCase())
          || ideas.find((i: any) => i.title?.toLowerCase().includes(r.title?.toLowerCase()?.slice(0, 15)))
          || {}

        // Full description — no truncation
        const desc: string = idea.description || r.verdict || ''
        const verdict: string = (idea.description && r.verdict && idea.description !== r.verdict)
          ? r.verdict
          : ''

        const [rr, gg, bb] = rankColors[idx] || [100, 100, 100]

        // Estimate card height to decide if we need a new page
        const descLines: string[] = desc ? doc.splitTextToSize(desc, contentW - 28) : []
        const verdictLines: string[] = verdict ? doc.splitTextToSize(verdict, contentW - 32) : []
        const estimatedH = 14 + (descLines.length * 4.5) + (verdict ? verdictLines.length * 4.5 + 10 : 0) + 10

        y = addPageIfNeeded(estimatedH, y)

        // Card background
        doc.setFillColor(250, 251, 252)
        doc.roundedRect(margin, y, contentW, estimatedH, 3, 3, 'F')

        // Colored left border
        doc.setFillColor(rr, gg, bb)
        doc.rect(margin, y, 3, estimatedH, 'F')

        // Rank badge
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(rr, gg, bb)
        doc.text(medals[idx], margin + 6, y + 8)

        // Title
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        const titleLines: string[] = doc.splitTextToSize(r.title || '', contentW - 40)
        doc.text(titleLines, margin + 18, y + 8)

        // Confidence score — top right
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(0, 188, 212)
        doc.text(`${r.confidence}%`, pageW - margin - 2, y + 8, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(148, 163, 184)
        doc.text('CONFIANCE', pageW - margin - 2, y + 13, { align: 'right' })

        let cardY = y + 14

        // Full description
        if (descLines.length > 0) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8.5)
          doc.setTextColor(71, 85, 105)
          cardY = wrappedText(desc, margin + 6, cardY, contentW - 28, 4.5)
          cardY += 3
        }

        // Verdict block (if different from description)
        if (verdictLines.length > 0) {
          // Light background for verdict
          doc.setFillColor(240, 249, 255)
          doc.roundedRect(margin + 6, cardY - 1, contentW - 14, verdictLines.length * 4.5 + 5, 2, 2, 'F')
          // Cyan left accent
          doc.setFillColor(0, 188, 212)
          doc.rect(margin + 6, cardY - 1, 1.5, verdictLines.length * 4.5 + 5, 'F')

          doc.setFont('helvetica', 'italic')
          doc.setFontSize(8)
          doc.setTextColor(71, 85, 105)
          cardY = wrappedText(verdict, margin + 10, cardY + 3, contentW - 22, 4.5)
          cardY += 4
        }

        y = cardY + 6
      })

      // ── FOOTER ───────────────────────────────────────────────────────────
      y = addPageIfNeeded(12, y)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.3)
      doc.line(margin, y, pageW - margin, y)
      y += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `NETINFO SMA \u00A9 ${new Date().getFullYear()} \u2014 Rapport Co-Pilote IA`,
        pageW / 2,
        y,
        { align: 'center' }
      )

      // ── SAVE ─────────────────────────────────────────────────────────────
      doc.save(`SMA-CoPilote-Top3-${new Date().toISOString().slice(0, 10)}.pdf`)
    }).catch(err => {
      console.error('[downloadTop3PDF] jsPDF load error:', err)
    })
  }

  // ── Jarvis voice command detector ──────────────────────────────────────────
  const JARVIS_COMMANDS: { patterns: RegExp[]; action: () => void; label: string }[] = [
    {
      patterns: [/jarvi[se][,.]?\s*(suivant|next)/i, /jarvis[,.]?\s*go\s*next/i],
      action: () => nextCopilotIdea(),
      label: '⚡ Jarvis → Idée suivante'
    },
    {
      patterns: [/jarvi[se][,.]?\s*(valid[ée]?|valide|finalize|finish|classement|ranking)/i],
      action: () => finalizeCopilot(),
      label: '🏆 Jarvis → Finalisation'
    },
    {
      patterns: [/jarvi[se][,.]?\s*(recommence[!]?|restart|reset|relance)/i],
      action: () => { setCopilotSession(null); setTopic('') },
      label: '🔄 Jarvis → Redémarrage'
    },
  ]

  const detectJarvisCommand = (transcript: string): boolean => {
    for (const cmd of JARVIS_COMMANDS) {
      if (cmd.patterns.some(p => p.test(transcript))) {
        // Visual flash feedback
        const flash = document.createElement('div')
        flash.innerText = cmd.label
        flash.style.cssText = `
          position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg, #0f172a, #00BCD4);
          color: white; padding: 10px 24px; border-radius: 99px;
          font-weight: 900; font-size: 13px; letter-spacing: 0.1em;
          box-shadow: 0 0 30px rgba(0,188,212,0.5); z-index: 9999;
          animation: fadeInOut 2s ease forwards;
        `
        const style = document.createElement('style')
        style.textContent = `@keyframes fadeInOut { 0%{opacity:0;transform:translateX(-50%) translateY(10px)} 20%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }`
        document.head.appendChild(style)
        document.body.appendChild(flash)
        setTimeout(() => { flash.remove(); style.remove() }, 2200)
        cmd.action()
        return true
      }
    }
    return false
  }

  const startCopilotVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert(lang === 'fr' ? "Votre navigateur ne supporte pas la reconnaissance vocale." : "Your browser doesn't support voice recognition."); return }
    const recognition = new SR()
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onstart = () => setIsListeningCopilot(true)
    recognition.onend = () => setIsListeningCopilot(false)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      // ── Check for Jarvis secret commands first ──
      if (detectJarvisCommand(transcript)) return
      // Otherwise, paste into input as usual
      setCopilotInput(prev => (prev ? prev + ' ' : '') + transcript)
    }
    recognition.onerror = (e: any) => {
      setIsListeningCopilot(false)
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        alert(lang === 'fr' ? "Erreur microphone. Vérifiez les permissions." : "Microphone error. Check permissions.")
      }
    }
    recognition.start()
  }

  const openScoreFormula = async (idea: any, rankItem: any) => {
    setScoreLoading(true)
    const merged = {
      title: rankItem?.title || idea?.title || 'Idée',
      description: idea?.description || rankItem?.verdict || '',
      confidence: Math.round(Number(rankItem?.confidence || idea?.confidence || 80)), // ensure integer
      feasibility: idea?.feasibility || 'Moyen',
      verdict: rankItem?.verdict || ''
    }
    setScoreModal({ loading: true, idea: merged, rankItem })

    const buildFallback = (c: number) => {
      const inno  = Math.min(100, Math.max(50, c + Math.round((Math.random() - 0.3) * 16)))
      const fais  = Math.min(100, Math.max(50, c + Math.round((Math.random() - 0.5) * 20)))
      const imp   = Math.min(100, Math.max(50, c + Math.round((Math.random() - 0.2) * 16)))
      const coh   = Math.min(100, Math.max(50, c + Math.round((Math.random() - 0.4) * 14)))
      const computed = Math.round(inno * 0.30 + fais * 0.25 + imp * 0.25 + coh * 0.20)
      return {
        formula: 'f(S) = (Inno × 0.30) + (Fais × 0.25) + (Imp × 0.25) + (Coh × 0.20)',
        breakdown: [
          { criterion: 'Innovation',  weight: '30%', score: inno, justification: "Potentiel créatif et originalité de l'idée." },
          { criterion: 'Faisabilité', weight: '25%', score: fais, justification: `Niveau estimé : ${merged.feasibility}.` },
          { criterion: 'Impact',      weight: '25%', score: imp,  justification: 'Valeur ajoutée et portée stratégique.' },
          { criterion: 'Cohérence',   weight: '20%', score: coh,  justification: 'Alignement avec les objectifs du projet.' },
        ],
        final_score: computed,
        summary: `Score global de ${computed}% reflétant le potentiel stratégique de cette idée.`
      }
    }

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/brainstorming/copilot/score-formula`,
        {
          idea_title: merged.title,
          idea_description: merged.description || 'Non fournie',
          confidence: merged.confidence,
          feasibility: merged.feasibility,
          verdict: merged.verdict
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      )
      const d = res.data
      if (d?.breakdown?.length > 0 && d.final_score !== undefined) {
        // Recompute from breakdown to guarantee consistency with the formula
        const weights = [0.30, 0.25, 0.25, 0.20]
        const recomputed = Math.round(d.breakdown.slice(0, 4).reduce((sum: number, item: any, i: number) => sum + Number(item.score) * weights[i], 0))
        d.final_score = recomputed
        setComputedScores(prev => ({ ...prev, [merged.title]: recomputed }))
        setScoreModal({ loading: false, idea: merged, rankItem, data: d })
      } else {
        const fb = buildFallback(merged.confidence)
        setComputedScores(prev => ({ ...prev, [merged.title]: fb.final_score }))
        setScoreModal({ loading: false, idea: merged, rankItem, data: fb })
      }
    } catch (err: any) {
      const detail = err?.response?.status
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err?.message || 'Network error'
      console.error('[ScoreFormula] error:', detail)
      const fb = buildFallback(merged.confidence)
      setComputedScores(prev => ({ ...prev, [merged.title]: fb.final_score }))
      setScoreModal({ loading: false, idea: merged, rankItem, data: fb })
    } finally {
      setScoreLoading(false)
    }
  }

  const loadSession = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/brainstorming/warroom/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActiveSession(res.data)
    } catch (err) {
      console.error("Failed to load linked session", err)
    }
  }

  const startSession = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/brainstorming/`, {
        topic,
        mode,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActiveSession(res.data)
      setCopilotSession(null)
      setTopic('')
      fetchSessions()
    } catch (err) {
       console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeSession || !user) return
    try {
      await axios.post(`${API_BASE_URL}/api/brainstorming/${activeSession.id}/message`, {
        content: messageInput,
        user_id: user.id,
        agent_name: user.full_name,
        role: user.role === 'PROJECT_MANAGER' ? 'MANAGER' : 'TEAM',
        phase: 'Live'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessageInput('')
      handleTyping(false)
    } catch (err) {
      console.error(err)
    }
  }

  const handleTyping = (isTyping: boolean) => {
    if (!activeSession || !user) return
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    axios.post(`${API_BASE_URL}/api/brainstorming/${activeSession.id}/typing`, {
      user_name: user.full_name,
      is_typing: isTyping
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(err => console.error(err))

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000)
    }
  }

  const startVoiceInput = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.")
      return
    }

    const recognition = new SR()
    recognition.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setMessageInput(prev => prev + ' ' + transcript)
    }

    let networkRetryDone = false
    recognition.onerror = (e: any) => {
      console.warn("Speech recognition error:", e.error, e)
      setIsListening(false)

      if (e.error === 'network') {
        if (!networkRetryDone) {
          networkRetryDone = true
          // Auto-retry once — Chrome's Web Speech API occasionally drops network on first call
          setTimeout(() => {
            try {
              const rec2 = new SR()
              rec2.lang = lang === 'fr' ? 'fr-FR' : 'en-US'
              rec2.onstart = () => setIsListening(true)
              rec2.onend = () => setIsListening(false)
              rec2.onresult = recognition.onresult
              rec2.onerror = () => {
                setIsListening(false)
                alert(lang === 'fr'
                  ? "Service vocal indisponible. Vérifiez votre connexion Internet."
                  : "Voice service unavailable. Check your Internet connection.")
              }
              rec2.start()
            } catch {
              alert(lang === 'fr'
                ? "Reconnaissance vocale indisponible. Veuillez taper votre message."
                : "Voice recognition unavailable. Please type your message.")
            }
          }, 1500)
        } else {
          alert(lang === 'fr'
            ? "Service vocal indisponible. Le micro Google Speech nécessite une connexion Internet stable."
            : "Voice service unavailable. Google Speech requires a stable Internet connection.")
        }
      } else if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        alert(lang === 'fr'
          ? "Accès au microphone refusé. Autorisez-le dans les paramètres du navigateur."
          : "Microphone access denied. Allow it in browser settings.")
      } else if (e.error === 'no-speech') {
        // Silently ignore — nothing was said
      } else if (e.error === 'aborted') {
        // Silently ignore — session stopped by user or system
      } else {
        alert(lang === 'fr'
          ? "Reconnaissance vocale interrompue. Veuillez taper votre message."
          : "Voice recognition interrupted. Please type your message.")
      }
    }

    recognition.start()
  }

  const handleDownloadPDF = () => {
      if (!activeSession) return;
      
      const substantialMessages = [...activeSession.messages]
         .filter(m => m.content.length > 50)
         .sort((a, b) => b.content.length - a.content.length)
         .slice(0, 3);
      
      const ideas = substantialMessages.map((m, i) => ({
         title: m.agent_name.includes('Idé') ? `Innovation Stratégique #${i+1}` : `Axe d'Optimisation #${i+1}`,
         description: m.content,
         score: 98 - (i * 7),
         agent: m.agent_name
      }));

      if (ideas.length < 3) {
         ideas.push({
            title: "Plan de Continuité",
            description: activeSession.summary || "Analyse approfondie en cours de finalisation par l'orchestrateur SMA.",
            score: 75,
            agent: "Système Central"
         });
      }

      const formatMarkdown = (text: string) => {
         if (!text) return '';
         return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br/>');
      };

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = `
         <html>
            <head>
               <title>Rapport Stratégique - SMA War Room</title>
               <script src="https://cdn.tailwindcss.com"></script>
               <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
               <style>
                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
                  body { font-family: 'Inter', sans-serif; color: #1e293b; background: #f8fafc; margin: 0; padding: 20px; }
               </style>
            </head>
            <body>
               <div id="report-content" class="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2rem] overflow-hidden border border-slate-200">
                  <div class="bg-slate-900 p-12 text-white relative">
                     <div class="absolute top-0 right-0 w-64 h-64 bg-[#00BCD4] opacity-10 rounded-full -mr-32 -mt-32"></div>
                     <div class="relative z-10">
                        <div class="flex items-center gap-4 mb-6">
                           <div class="h-10 w-2 bg-[#00BCD4]"></div>
                           <h1 class="text-4xl font-extrabold tracking-tighter uppercase italic">SMA <span class="text-[#00BCD4]">War Room</span></h1>
                        </div>
                        <h2 class="text-2xl font-bold text-slate-300 leading-tight mb-4">"${activeSession.topic}"</h2>
                        <div class="flex justify-between items-center pt-6 border-t border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                           <span>Rapport de Mission #${activeSession.id.slice(-6).toUpperCase()}</span>
                           <span>Date: ${new Date().toLocaleDateString()}</span>
                        </div>
                     </div>
                  </div>

                  <div class="p-12 space-y-12">
                     <div class="flex items-center gap-4">
                        <h3 class="text-xs font-black uppercase tracking-[0.4em] text-[#00BCD4]">Top 3 Stratégies Recommandées</h3>
                        <div class="h-[1px] flex-1 bg-slate-100"></div>
                     </div>

                     ${ideas.map((idea, i) => `
                        <div class="relative" style="page-break-inside: avoid; margin-bottom: 20px;">
                           <div class="flex items-start gap-8">
                              <div class="shrink-0 flex flex-col items-center">
                                 <div class="w-16 h-16 rounded-2xl bg-slate-50 border-2 border-slate-900 flex flex-col items-center justify-center text-slate-900 shadow-lg">
                                    <span class="text-[8px] font-black opacity-40">STEP</span>
                                    <span class="text-2xl font-extrabold italic">0${i+1}</span>
                                 </div>
                                 <div class="w-[2px] h-full bg-slate-100 mt-4"></div>
                              </div>
                              <div class="flex-1 pb-10">
                                 <div class="flex justify-between items-center mb-4">
                                    <h4 class="text-xl font-extrabold text-slate-900">${idea.title}</h4>
                                    <div class="flex items-center gap-3">
                                       <span class="text-2xl font-black text-[#00BCD4]">${idea.score}%</span>
                                       <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Confiance</span>
                                    </div>
                                 </div>
                                 <div class="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-sm leading-relaxed text-slate-600 italic">
                                    <p class="mb-4">${formatMarkdown(idea.description)}</p>
                                    <div class="flex items-center gap-2 pt-4 border-t border-slate-200/50">
                                       <span class="text-[9px] font-black uppercase text-slate-400">Source: Agent ${idea.agent}</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     `).join('')}
                  </div>

                  <div class="mx-12 mb-12 p-10 bg-[#00BCD4]/5 rounded-[2.5rem] border border-[#00BCD4]/10">
                     <h3 class="text-[10px] font-black uppercase tracking-[0.4em] text-[#00BCD4] mb-6">Synthèse Globale du SMA</h3>
                     <p class="text-md font-semibold italic text-slate-700 leading-relaxed">
                        "${activeSession.summary || 'Simulation complétée avec succès.'}"
                     </p>
                  </div>

                  <div class="bg-slate-50 p-8 border-t border-slate-100 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.5em]">
                     <span>Confidentiel • Système Multi-Agent d'Innovation</span>
                     <span>© 2026 SMA Intelligence</span>
                  </div>
               </div>

               <div id="controls" class="fixed bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
                  <button id="download-btn" class="bg-[#00BCD4] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">
                     Télécharger Directement
                  </button>
                  <button onclick="window.close()" class="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl border border-slate-200">
                     Fermer
                  </button>
               </div>

               <script>
                  document.getElementById('download-btn').addEventListener('click', function() {
                     const element = document.getElementById('report-content');
                     const opt = {
                        margin:       0.5,
                        filename:     'SMA-WarRoom-Rapport.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
                        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
                     };
                     
                     this.innerHTML = "Génération...";
                     this.disabled = true;
                     
                     html2pdf().set(opt).from(element).save().then(() => {
                        this.innerHTML = "Télécharger Directement";
                        this.disabled = false;
                     });
                  });
               </script>
            </body>
         </html>
      `;
      
      printWindow.document.write(html);
      printWindow.document.close();
   };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 space-y-8 overflow-hidden bg-transparent text-slate-800 relative nexus-room">
      
      {/* Cybernetic Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* GLITCH HEADER */}
      <div className="relative z-10 flex items-center justify-between overflow-hidden rounded-2xl px-4 py-3">

        {/* ── Background: carrots & floating shapes ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl" aria-hidden="true">
          {/* Subtle gradient wash */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#00BCD4]/5 via-transparent to-[#FF007F]/5" />

          {/* Floating carrots (chevrons) */}
          {[
            { top: '10%',  left: '3%',   size: 18, color: '#00BCD4', delay: 0,    dur: 3.2 },
            { top: '60%',  left: '8%',   size: 12, color: '#00BCD4', delay: 0.8,  dur: 4.1 },
            { top: '25%',  left: '18%',  size: 10, color: '#FF007F', delay: 1.4,  dur: 3.7 },
            { top: '70%',  left: '28%',  size: 14, color: '#00BCD4', delay: 0.3,  dur: 5.0 },
            { top: '15%',  left: '42%',  size: 9,  color: '#FF007F', delay: 2.1,  dur: 3.5 },
            { top: '75%',  left: '55%',  size: 11, color: '#00BCD4', delay: 1.0,  dur: 4.4 },
            { top: '30%',  left: '68%',  size: 13, color: '#FF007F', delay: 0.5,  dur: 3.9 },
            { top: '55%',  left: '78%',  size: 8,  color: '#00BCD4', delay: 1.7,  dur: 4.8 },
            { top: '20%',  left: '88%',  size: 15, color: '#FF007F', delay: 0.2,  dur: 3.3 },
            { top: '80%',  left: '94%',  size: 10, color: '#00BCD4', delay: 2.5,  dur: 4.2 },
          ].map((c, i) => (
            <motion.div
              key={i}
              className="absolute font-black select-none"
              style={{ top: c.top, left: c.left, color: c.color, fontSize: c.size, opacity: 0.12 }}
              animate={{ y: [0, -6, 0], opacity: [0.10, 0.18, 0.10] }}
              transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
            >
              {'>'}
            </motion.div>
          ))}

          {/* Tiny floating dots */}
          {[
            { top: '50%', left: '12%', delay: 0.6 },
            { top: '20%', left: '35%', delay: 1.2 },
            { top: '80%', left: '62%', delay: 0.4 },
            { top: '35%', left: '82%', delay: 1.9 },
          ].map((d, i) => (
            <motion.div
              key={`dot-${i}`}
              className="absolute w-1 h-1 rounded-full bg-[#00BCD4]"
              style={{ top: d.top, left: d.left, opacity: 0.15 }}
              animate={{ scale: [1, 1.8, 1], opacity: [0.12, 0.22, 0.12] }}
              transition={{ duration: 2.5, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}


        </div>

        {/* ── Foreground text (unchanged) ── */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="relative z-10">
          <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4 text-slate-900">
            <Terminal className="text-[#00BCD4] animate-pulse drop-shadow-[0_0_12px_rgba(0,188,212,0.8)]" size={32} />
            <span className="relative">
              Brainstorming
              <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-[#00BCD4] to-transparent opacity-50" />
            </span> 
            <span className="text-[#FF007F] drop-shadow-[0_0_12px_rgba(255,0,127,0.5)]">Espace de Brainstorming</span>
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">
              {lang === 'fr' ? 'Orchestration Collaborative • Mode Stratégique' : 'Collaborative Orchestration • Strategic Mode'}
            </p>
            <div className="h-[1px] w-24 bg-gradient-to-r from-slate-200 to-transparent" />
          </div>
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1 min-h-0 relative z-10">
        
        {/* LEFT COLUMN: CONTROL & HISTORY */}
        <div className="lg:col-span-4 flex flex-col gap-8 min-h-0">
          {/* New Objective Box */}
          <motion.div 
            whileHover={{ y: -2, scale: 1.01 }}
            className="neon-box-cyan light-sweep-container p-4 frosted-glass shrink-0 relative group"
          >
             <div className="absolute top-3 right-3 text-[#00BCD4]/30">
                <Layers size={16} />
             </div>
             <h3 className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3 flex items-center gap-2">
               <Zap size={12} className="text-amber-500 animate-bounce" /> {lang === 'fr' ? 'Séquence Initiale' : 'Initial Sequence'}
             </h3>
             <div className="relative z-10 space-y-3">
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={lang === 'fr' ? "Définir l'objectif stratégique..." : "Define strategic objective..."}
                  className="w-full bg-slate-950/5 border border-white/40 text-slate-900 placeholder:text-slate-400 rounded-2xl p-3 text-xs font-black focus:border-[#00BCD4] focus:ring-[4px] focus:ring-[#00BCD4]/10 transition-all resize-none h-16 outline-none shadow-inner custom-scrollbar italic"
                />

                {/* Mode Selection */}
                <div className="grid grid-cols-2 gap-2 relative z-10">
                  <button 
                    onClick={() => setMode('AI')}
                    className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all border group/btn ${mode === 'AI' ? 'bg-[#00BCD4]/10 border-[#00BCD4] text-[#00BCD4] shadow-[0_0_10px_rgba(0,188,212,0.1)]' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}
                  >
                    <Bot size={16} className={mode === 'AI' ? 'animate-bounce' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-[0.1em]">{lang === 'fr' ? 'Agents IA' : 'AI Agents'}</span>
                  </button>
                  <button 
                    onClick={() => setMode('TEAM')}
                    className={`py-2 rounded-xl flex flex-col items-center gap-1 transition-all border group/btn ${mode === 'TEAM' ? 'bg-[#FF007F]/10 border-[#FF007F] text-[#FF007F] shadow-[0_0_10px_rgba(255,0,127,0.1)]' : 'bg-white/5 border-white/20 text-slate-400 hover:border-white/40'}`}
                  >
                    <Users size={16} className={mode === 'TEAM' ? 'animate-bounce' : ''} />
                    <span className="text-[8px] font-black uppercase tracking-[0.1em]">{lang === 'fr' ? 'Équipe' : 'Team Members'}</span>
                  </button>
                </div>
                {mode === 'TEAM' ? (
                  <button
                    onClick={startSession}
                    disabled={loading || !topic}
                    className="w-full py-3 bg-[#FF007F] text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:shadow-[0_0_20px_rgba(255,0,127,0.4)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10 text-xs"
                  >
                    {loading ? <RefreshCw className="animate-spin" size={14} /> : <><Users size={16} /> {lang === 'fr' ? 'Lancer session équipe' : 'Launch team session'}</>}
                  </button>
                ) : (
                  <button
                    onClick={startCopilot}
                    disabled={isStartingCopilot || !topic}
                    className="w-full py-3 bg-slate-900 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#00BCD4] hover:shadow-[0_0_20px_rgba(0,188,212,0.4)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 border border-white/10 group overflow-hidden relative text-xs"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-sweep" />
                    {isStartingCopilot ? <RefreshCw className="animate-spin" size={14} /> : <><Rocket size={16} className="group-hover:rotate-12 transition-transform" /> {lang === 'fr' ? 'Lancer Co-Pilote' : 'Launch Co-Pilot'}</>}
                  </button>
                )}
             </div>
          </motion.div>

          {/* History List */}
          <div className="flex-1 flex flex-col min-h-0">
             <div className="flex items-center justify-between mb-3 px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{lang === 'fr' ? 'Archives' : 'Archives'}</h3>
                <div className="h-[1px] flex-1 bg-slate-200/20 ml-3" />
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 px-2 pb-8 -mx-2">
                {sessions.map((s, idx) => (
                  <motion.div 
                    key={s.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ x: 4, backgroundColor: "rgba(0,188,212,0.05)" }}
                    onClick={() => {
                      // Load into copilotSession if it has feedbackHistory (copilot type)
                      // otherwise load into activeSession for legacy message display
                      if ((s as any).feedbackHistory) {
                        setCopilotSession(s)
                        setActiveSession(null)
                      } else {
                        setActiveSession(s)
                        setCopilotSession(null)
                      }
                    }}
                    className={`group p-3 rounded-2xl border cursor-pointer transition-all mx-1 mb-1 frosted-glass ${activeSession?.id === s.id ? 'border-[#00BCD4] shadow-[0_0_15px_rgba(0,188,212,0.2)] ring-1 ring-[#00BCD4]/30' : 'border-white/20 hover:border-[#00BCD4]/30 shadow-sm'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                       <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-amber-500 shadow-[0_0_5px_#f59e0b]'}`} />
                       <h4 className="font-black text-[11px] truncate text-slate-800 flex-1">{s.topic}</h4>
                       {s.mode === 'TEAM' ? <Users size={10} className="text-[#FF007F]" /> : <Bot size={10} className="text-[#00BCD4]" />}
                       {/* Delete button */}
                       <button
                         onClick={(e) => { e.stopPropagation(); setDeleteConfirm(s) }}
                         className="opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 ml-1 shrink-0"
                         title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                       >
                         <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                         </svg>
                       </button>
                    </div>
                    <div className="flex items-center justify-between pl-3">
                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{(s as any).feedbackHistory ? `${(s as any).feedbackHistory.length} msgs` : `${s.messages.length} logs`}</span>
                       <ArrowRight size={12} className="text-slate-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.div>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: WAR ROOM VISUALIZER */}
        <div className="lg:col-span-8 flex flex-col neon-box-cyan light-sweep-container frosted-glass overflow-hidden relative group">

          {/* ── Background carrots & animations ── */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
            {/* Gradient wash */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/4 via-transparent to-[#FF007F]/3" />

            {/* Floating carrots */}
            {[
              { top: '5%',  left: '2%',   size: 20, color: '#00BCD4', delay: 0,    dur: 4.0 },
              { top: '18%', left: '10%',  size: 13, color: '#FF007F', delay: 1.2,  dur: 5.2 },
              { top: '35%', left: '5%',   size: 10, color: '#00BCD4', delay: 0.6,  dur: 3.8 },
              { top: '55%', left: '14%',  size: 16, color: '#FF007F', delay: 2.0,  dur: 4.5 },
              { top: '72%', left: '3%',   size: 11, color: '#00BCD4', delay: 0.3,  dur: 5.8 },
              { top: '88%', left: '9%',   size: 9,  color: '#FF007F', delay: 1.7,  dur: 3.5 },
              { top: '8%',  left: '88%',  size: 14, color: '#00BCD4', delay: 0.9,  dur: 4.2 },
              { top: '28%', left: '93%',  size: 10, color: '#FF007F', delay: 2.3,  dur: 5.0 },
              { top: '50%', left: '90%',  size: 18, color: '#00BCD4', delay: 0.4,  dur: 3.9 },
              { top: '68%', left: '95%',  size: 12, color: '#FF007F', delay: 1.5,  dur: 4.7 },
              { top: '85%', left: '87%',  size: 9,  color: '#00BCD4', delay: 0.1,  dur: 5.3 },
              { top: '42%', left: '50%',  size: 8,  color: '#00BCD4', delay: 3.0,  dur: 6.0 },
              { top: '15%', left: '72%',  size: 11, color: '#FF007F', delay: 1.8,  dur: 4.4 },
              { top: '78%', left: '45%',  size: 10, color: '#00BCD4', delay: 2.6,  dur: 5.1 },
            ].map((c, i) => (
              <motion.div
                key={`rc-${i}`}
                className="absolute font-black select-none"
                style={{ top: c.top, left: c.left, color: c.color, fontSize: c.size, opacity: 0.09 }}
                animate={{ y: [0, -8, 0], opacity: [0.07, 0.14, 0.07] }}
                transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'easeInOut' }}
              >
                {'>'}
              </motion.div>
            ))}

            {/* Floating dots */}
            {[
              { top: '12%', left: '20%', delay: 0.5, color: '#00BCD4' },
              { top: '40%', left: '8%',  delay: 1.4, color: '#FF007F' },
              { top: '65%', left: '30%', delay: 0.8, color: '#00BCD4' },
              { top: '25%', left: '80%', delay: 2.1, color: '#FF007F' },
              { top: '80%', left: '70%', delay: 0.3, color: '#00BCD4' },
              { top: '55%', left: '60%', delay: 1.9, color: '#FF007F' },
            ].map((d, i) => (
              <motion.div
                key={`rd-${i}`}
                className="absolute w-1 h-1 rounded-full"
                style={{ top: d.top, left: d.left, background: d.color, opacity: 0.12 }}
                animate={{ scale: [1, 2, 1], opacity: [0.10, 0.20, 0.10] }}
                transition={{ duration: 3.0, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </div>
           
           {/* Top Info Bar */}
           <div className="relative z-10 p-7 border-b border-white/20 flex items-center justify-between bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-6">
                 <div className="relative">
                    <div className={`w-4 h-4 rounded-full ${activeSession?.status === 'RUNNING' ? 'bg-amber-500 animate-ping' : activeSession?.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <div className={`absolute inset-0 w-4 h-4 rounded-full ${activeSession?.status === 'RUNNING' ? 'bg-amber-500 animate-pulse' : activeSession?.status === 'COMPLETED' ? 'bg-emerald-500 shadow-[0_0_15px_#10b981]' : 'bg-slate-300'}`} />
                 </div>
                 <div>
                    <h2 className="font-black text-xl tracking-tight text-slate-900 mb-0.5">
                       {(t.brainstorming as any).target}: <span className="text-[#00BCD4] italic">{cleanTopic(activeSession?.topic ?? '') || (lang === 'fr' ? 'En attente...' : 'Idle...')}</span>
                    </h2>
                    <div className="flex items-center gap-3">
                       {activeSession?.mode === 'TEAM' && activeSession.participants?.length > 0 && (
                          <div className="flex -space-x-2">
                             {activeSession.participants?.map(p => {
                                const avatarSrc = (p as any).avatar_url && (p as any).avatar_url !== ''
                                  ? (p as any).avatar_url
                                  : p.role === 'MANAGER'
                                    ? '/manager.webp'
                                    : (p as any).gender === 'Femme'
                                      ? '/girl-removebg-preview.png'
                                      : '/boy-removebg-preview.png'
                                return (
                                  <img key={p.id} src={avatarSrc} alt={p.name} title={p.name} className="w-6 h-6 rounded-full border-2 border-white object-cover" />
                                )
                             })}
                          </div>
                       )}
                       <div className="flex gap-1">
                          {[1,2,3].map(i => <div key={i} className={`w-3 h-1 rounded-full ${activeSession ? 'bg-[#00BCD4] animate-pulse' : 'bg-slate-200'}`} style={{ animationDelay: `${i * 0.2}s` }} />)}
                       </div>
                       <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          {(activeSession?.typing_users?.length ?? 0) > 0 
                            ? `${activeSession?.typing_users?.join(', ')} ${lang === 'fr' ? 'écrit...' : 'is typing...'}`
                            : (lang === 'fr' ? 'Session de Brainstorming Active' : 'Active Brainstorming Session')
                          }
                       </span>
                    </div>
                 </div>
              </div>
              <div className="flex flex-col items-end">
                 <div className="flex items-center gap-2 text-[11px] font-black text-slate-800 bg-white/40 px-4 py-1.5 rounded-full border border-white/50 shadow-sm">
                    <ShieldCheck size={16} className="text-[#00BCD4]" /> {(t.brainstorming as any).systemStatus} : {(t.brainstorming as any).optimal}
                 </div>
              </div>
           </div>

           {/* Main Scrollable Feed */}
           <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth">
              <AnimatePresence>
                {activeSession?.mode === 'TEAM' ? (
                  <div className="h-full min-h-[400px] -m-8">
                    <TeamBrainstormRoom
                      session={activeSession}
                      token={token!}
                      userId={user!.id}
                      userName={user!.full_name || 'Manager'}
                      userRole={user!.role}
                      lang={lang}
                      onSessionUpdate={setActiveSession as any}
                    />
                  </div>
                ) : copilotSession ? (
                  /* ── COPILOT CHAT UI ── */
                  <div ref={copilotChatRef} className="space-y-4">
                    {/* Progress bar */}
                    {copilotSession.conversationStep !== 'FINAL_RANKING' && (
                      <div className="flex items-center justify-center gap-3 mb-4">
                        {[1,2,3].map((n: number) => (
                          <div key={n} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${n < copilotSession.currentIdeaIndex ? 'bg-[#00BCD4] shadow-[0_0_8px_rgba(0,188,212,0.8)]' : n === copilotSession.currentIdeaIndex ? 'bg-[#00BCD4] animate-pulse scale-125' : 'bg-slate-200'}`} />
                            {n < 3 && <div className={`w-10 h-[2px] ${n < copilotSession.currentIdeaIndex ? 'bg-[#00BCD4]' : 'bg-slate-200'}`} />}
                          </div>
                        ))}
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          {lang === 'fr' ? `Idée ${copilotSession.currentIdeaIndex}/3` : `Idea ${copilotSession.currentIdeaIndex}/3`}
                        </span>
                      </div>
                    )}

                    {/* FINAL RANKING */}
                    {copilotSession.conversationStep === 'FINAL_RANKING' && copilotSession.ranking && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">
                          🏆 {lang === 'fr' ? 'Classement Final — Top 3 Idées' : 'Final Ranking — Top 3 Ideas'}
                        </p>
                        {copilotSession.ranking.map((r: any) => {
                          // Fuzzy match: exact first, then case-insensitive, then partial
                          const ideas: any[] = copilotSession.ideas || []
                          const idea = ideas.find((i: any) => i.title === r.title)
                            || ideas.find((i: any) => i.title?.toLowerCase() === r.title?.toLowerCase())
                            || ideas.find((i: any) => i.title?.toLowerCase().includes(r.title?.toLowerCase()?.slice(0, 15)))
                            || ideas.find((i: any) => r.title?.toLowerCase().includes(i.title?.toLowerCase()?.slice(0, 15)))
                          // Also try to extract description from feedbackHistory AI_IDEA messages
                          const ideaMsg = !idea?.description
                            ? copilotSession.feedbackHistory?.find((m: any) =>
                                m.role === 'AI_IDEA' &&
                                (m.content?.includes(r.title?.slice(0, 12)) || m.content?.toLowerCase().includes(r.title?.toLowerCase()?.slice(0, 12)))
                              )
                            : null
                          const description = idea?.description
                            || (ideaMsg?.content ? ideaMsg.content.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^.*?\n\n/, '').trim() : null)
                            || r.verdict
                          const borderColor = r.rank === 1 ? 'border-amber-400' : r.rank === 2 ? 'border-slate-300' : 'border-orange-300'
                          const bgColor = r.rank === 1 ? 'bg-amber-50/60 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : r.rank === 2 ? 'bg-slate-50/60' : 'bg-orange-50/40'
                          const scoreColor = r.rank === 1 ? 'text-amber-500' : r.rank === 2 ? 'text-slate-500' : 'text-orange-500'
                          return (
                            <motion.div
                              key={r.rank}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: r.rank * 0.1 }}
                              onClick={() => setIdeaDetailModal({ idea: { ...idea, description: description || idea?.description }, rankItem: r })}
                              className={`p-5 rounded-2xl border-2 cursor-pointer hover:scale-[1.01] transition-transform ${borderColor} ${bgColor}`}
                            >
                              {/* Top row: medal + title + score */}
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <span className="text-2xl shrink-0">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</span>
                                  <p className="font-black text-slate-800 text-sm leading-tight">{r.title}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-xl font-black ${scoreColor}`}>{computedScores[r.title] ?? r.confidence}%</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openScoreFormula({ ...idea, description: description || idea?.description }, r) }}
                                    className="w-5 h-5 rounded-full bg-slate-200 hover:bg-[#00BCD4] text-slate-500 hover:text-white flex items-center justify-center transition-all text-[10px] font-black"
                                    title={lang === 'fr' ? 'Comment ce score est calculé' : 'How this score is calculated'}
                                  >i</button>
                                </div>
                              </div>
                              {/* Full description */}
                              {description && (
                                <p className="text-xs text-slate-600 leading-relaxed mb-3 whitespace-pre-wrap">
                                  {description}
                                </p>
                              )}
                              {/* Verdict (if different from description) */}
                              {idea?.description && r.verdict && idea.description !== r.verdict && (
                                <div className="text-[10px] text-slate-500 italic border-l-2 border-[#00BCD4]/40 pl-2 leading-relaxed">
                                  {r.verdict}
                                </div>
                              )}
                              {/* Confidence bar */}
                              <div className="mt-3 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-[#00BCD4] to-[#019ab3]" style={{ width: `${computedScores[r.title] ?? r.confidence}%` }} />
                              </div>
                            </motion.div>
                          )
                        })}
                        {/* PDF Download button */}
                        <motion.button
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => downloadTop3PDF(copilotSession)}
                          className="w-full mt-2 py-3 rounded-2xl font-black text-[12px] uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all"
                          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                        >
                          <Bot size={15} /> {lang === 'fr' ? 'Télécharger Top 3 PDF' : 'Download Top 3 PDF'}
                        </motion.button>
                        <button onClick={() => { setCopilotSession(null); setTopic('') }}
                          className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all hover:border-slate-300">
                          ← {lang === 'fr' ? 'Nouvelle session' : 'New session'}
                        </button>
                      </motion.div>
                    )}

                    {/* CHAT FEED */}
                    {copilotSession.conversationStep !== 'FINAL_RANKING' && (
                      <div className="space-y-4">
                        <AnimatePresence initial={false}>
                          {copilotSession.feedbackHistory?.map((msg: any, i: number) => {
                            const isManager = msg.role === 'MANAGER'
                            const isSystem = msg.role === 'SYSTEM'
                            return (
                              <motion.div key={msg.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                                className={`flex gap-3 items-start ${isManager ? 'flex-row-reverse' : ''} ${isSystem ? 'justify-center' : ''}`}>
                                {!isSystem && (
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${msg.role === 'AI_IDEA' ? 'neon-bot-idea' : msg.role === 'AI_CRITIQUE' ? 'neon-bot-critique' : 'bg-white border border-[#00BCD4]/30'}`}>
                                    {isManager
                                      ? (user as any)?.avatar_url
                                        ? <img src={(user as any).avatar_url} className="w-full h-full object-cover rounded-xl" />
                                        : <img src="/manager.webp" className="w-full h-full object-contain rounded-xl" />
                                      : <Bot size={14} className="text-white" />
                                    }
                                  </div>
                                )}
                                <div className={`flex-1 ${isSystem ? 'max-w-none flex justify-center' : 'max-w-[85%]'}`}>
                                  {!isSystem && (
                                    <div className={`flex items-center gap-2 mb-1 ${isManager ? 'justify-end' : ''}`}>
                                      <p className={`text-[9px] font-black uppercase tracking-widest ${msg.role === 'AI_IDEA' ? 'text-[#00BCD4]' : msg.role === 'AI_CRITIQUE' ? 'text-indigo-500' : 'text-slate-400'}`}>
                                        {msg.role === 'AI_IDEA' ? `💡 IA — ${lang === 'fr' ? 'Idée' : 'Idea'} ${copilotSession.currentIdeaIndex}/3` : msg.role === 'AI_CRITIQUE' ? `🤖 IA — ${lang === 'fr' ? 'Analyse' : 'Analysis'}` : `🧑 ${user?.full_name || 'Manager'}`}
                                      </p>
                                      {/* 4-state Voice Toggle: idle → playing → paused → ended */}
                                      {(msg.role === 'AI_IDEA' || msg.role === 'AI_CRITIQUE') && (
                                        <button
                                          type="button"
                                          onClick={() => handleVoiceToggle(`msg-${i}`, msg.content)}
                                          className={`text-sm transition-all duration-200 hover:scale-125 focus:outline-none ${
                                            (voiceStates[`msg-${i}`] || 'idle') === 'playing'
                                              ? 'animate-pulse drop-shadow-[0_0_6px_rgba(0,188,212,0.8)]'
                                              : 'opacity-50 hover:opacity-100'
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
                                  <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${
                                    isSystem
                                      ? 'bg-slate-100/80 text-slate-500 text-center text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full'
                                      : isManager
                                        ? 'glass-manager text-slate-700'
                                        : msg.role === 'AI_IDEA'
                                          ? 'glass-ai-idea text-slate-700'
                                          : 'glass-ai-critique text-slate-600'
                                  }`}>
                                    {msg.role === 'AI_IDEA' && (
                                      <div className="mb-1" />
                                    )}
                                    {msg.role === 'AI_IDEA'
                                      ? msg.content
                                          .replace(/\*\*(.*?)\*\*/g, '$1')
                                          .replace(/\b(Moyen|Élevé|Challenge|Faisabilité\s*:\s*\S+)\b/g, '')
                                          .replace(/\n{3,}/g, '\n\n')
                                          .trim()
                                      : msg.content.replace(/\*\*(.*?)\*\*/g, '$1')
                                    }
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>
                        {(isSubmittingFeedback || isStartingCopilot) && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center px-4 py-3 bg-[#00BCD4]/5 rounded-2xl border border-[#00BCD4]/10">
                            <Bot size={14} className="text-[#00BCD4] shrink-0" />
                            <div className="flex gap-1">{[0,1,2].map(i => <motion.div key={i} className="w-1.5 h-1.5 bg-[#00BCD4] rounded-full" animate={{ y: [0,-4,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }} />)}</div>
                            <span className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest">{lang === 'fr' ? "L'IA analyse..." : 'AI thinking...'}</span>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── IDLE STATE ── */
                  <div className="h-full flex flex-col items-center justify-center select-none relative overflow-hidden min-h-[300px]">
                     {[
                       { color: '#00BCD4', size: 8,  left: '8%',  top: '100%', dur: 8,  xO: 18,  yO: -420, delay: 0   },
                       { color: '#00BCD4', size: 5,  left: '22%', top: '100%', dur: 10, xO: -14, yO: -400, delay: 2   },
                       { color: '#00BCD4', size: 10, left: '55%', top: '100%', dur: 9,  xO: -20, yO: -430, delay: 1   },
                       { color: '#00BCD4', size: 6,  left: '78%', top: '100%', dur: 11, xO: 10,  yO: -410, delay: 3   },
                       { color: '#e63946', size: 7,  left: '15%', top: '0%',   dur: 9,  xO: 20,  yO: 420,  delay: 0.5 },
                       { color: '#e63946', size: 5,  left: '35%', top: '0%',   dur: 11, xO: -18, yO: 400,  delay: 2.5 },
                       { color: '#e63946', size: 9,  left: '65%', top: '0%',   dur: 8,  xO: 12,  yO: 430,  delay: 1   },
                       { color: '#e63946', size: 4,  left: '85%', top: '0%',   dur: 10, xO: -22, yO: 410,  delay: 3.5 },
                     ].map((sq, i) => (
                       <motion.div key={i} className="absolute pointer-events-none"
                         style={{ width: sq.size, height: sq.size, left: sq.left, top: sq.top, backgroundColor: sq.color, borderRadius: '2px', boxShadow: `0 0 6px ${sq.color}80` }}
                         animate={{ y: [0, sq.yO, 0], x: [0, sq.xO, 0], opacity: [0, 0.35, 0], rotate: [0, 45, 0] }}
                         transition={{ duration: sq.dur, repeat: Infinity, ease: 'linear', delay: sq.delay }} />
                     ))}
                     <Sparkles size={64} className="relative z-10 mb-6 text-[#00BCD4]/40 drop-shadow-[0_0_12px_rgba(0,188,212,0.3)]" />
                     <p className="relative z-10 text-2xl font-black uppercase tracking-[0.5em] italic text-slate-400/70">{lang === 'fr' ? 'IA EN ATTENTE' : 'AI STANDBY'}</p>
                     <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.3em] mt-3 text-slate-300/60">Awaiting Connection Signal...</p>
                  </div>
                )}
              </AnimatePresence>
           </div>

           {/* Manager feedback input */}
           {copilotSession && copilotSession.conversationStep === 'WAITING_FEEDBACK' && !isSubmittingFeedback && (
             <div className="px-8 pb-6 mt-auto shrink-0">
               <div className="flex gap-2 items-center p-2.5 bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl shadow-lg">
                 {/* Mic button */}
                 <motion.button
                   onClick={startCopilotVoice}
                   disabled={isListeningCopilot}
                   whileTap={{ scale: 0.92 }}
                   className={`p-2.5 rounded-xl transition-all shrink-0 ${isListeningCopilot ? 'btn-mic-active' : 'btn-mic-idle'}`}
                   title={lang === 'fr' ? 'Parler' : 'Speak'}
                 >
                   <Mic size={15} />
                 </motion.button>
                 <input value={copilotInput} onChange={e => setCopilotInput(e.target.value)}
                   onKeyDown={e => { if (e.key === 'Enter') submitCopilotFeedback() }}
                   placeholder={isListeningCopilot ? (lang === 'fr' ? '🎙 Écoute en cours...' : '🎙 Listening...') : (lang === 'fr' ? "Votre feedback sur cette idée..." : "Your feedback on this idea...")}
                   className="flex-1 bg-transparent border-0 outline-none text-sm font-medium text-slate-800 placeholder:text-slate-400 px-1" />
                 <button onClick={submitCopilotFeedback} disabled={!copilotInput.trim()}
                   className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-md disabled:opacity-40 shrink-0">
                   <Send size={15} />
                 </button>
               </div>
             </div>
           )}

           {/* Next idea / Finalize */}
           {copilotSession && copilotSession.conversationStep === 'WAITING_CONTINUE_OR_NEXT' && !isSubmittingFeedback && (
             <div className="px-8 pb-6 mt-auto shrink-0 flex gap-3">
               {copilotSession.currentIdeaIndex < 3 ? (
                 <button onClick={nextCopilotIdea} className="btn-neon-pulse flex-1 py-3 bg-gradient-to-r from-[#00BCD4] to-[#0096a8] text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2">
                   {lang === 'fr' ? `Idée Suivante (${copilotSession.currentIdeaIndex + 1}/3)` : `Next Idea (${copilotSession.currentIdeaIndex + 1}/3)`} <ArrowRight size={14} />
                 </button>
               ) : (
                 <button onClick={finalizeCopilot} className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2">
                   🏆 {lang === 'fr' ? 'Voir le Classement Final' : 'See Final Ranking'}
                 </button>
               )}
             </div>
           )}

           {/* SUMMARY / FOOTER UI - Advanced Glass Bar */}
           {activeSession?.summary && (
              <motion.div 
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="py-5 px-10 bg-white/20 backdrop-blur-3xl border-t border-white/40 flex items-center justify-between absolute bottom-0 left-0 right-0 z-20 gap-10 frosted-glass shadow-[0_-20px_50px_rgba(0,0,0,0.1)]"
              >
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="relative group/badge">
                    <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 group-hover/badge:opacity-40 transition-opacity" />
                    <div className="relative inline-flex items-center gap-3 px-5 py-2 bg-emerald-500 text-white border border-emerald-300/50 rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shrink-0 shadow-xl">
                       <ShieldCheck size={18} fill="white" /> {lang === 'fr' ? 'STRATÉGIE VALIDÉE' : 'STRATEGY VALIDATED'}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                     <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] mb-1">Executive Summary</span>
                     <p className="text-[15px] font-bold italic truncate text-slate-800 leading-tight">
                       {activeSession.summary}
                     </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                   <button 
                     onClick={handleDownloadPDF}
                     className="px-8 py-3.5 bg-slate-900 text-white font-black uppercase tracking-[0.25em] rounded-2xl shadow-2xl hover:bg-[#00BCD4] hover:shadow-[0_0_35px_rgba(0,188,212,0.6)] hover:scale-[1.05] active:scale-95 transition-all text-[11px] flex items-center gap-3 shrink-0 border border-white/20 group"
                   >
                     <Bot size={18} className="group-hover:animate-bounce" /> {lang === 'fr' ? 'TÉLÉCHARGER TOP 3' : 'DOWNLOAD TOP 3'}
                   </button>
                </div>
              </motion.div>
           )}
        </div>
      </div>

      {/* ── DELETE CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setDeleteConfirm(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 0 0 2px rgba(230,57,70,0.8), 0 0 30px rgba(230,57,70,0.4), 0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              {/* Neon red top border pulse */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #e63946, transparent)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              <div className="p-8 text-center">
                {/* Icon */}
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 rounded-2xl bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-5"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </motion.div>

                <h3 className="text-lg font-black text-slate-800 mb-1">
                  {lang === 'fr' ? 'Suppression définitive' : 'Permanent deletion'}
                </h3>
                <p className="text-[12px] text-slate-500 font-medium mb-1">
                  {lang === 'fr' ? 'Cette action est irréversible.' : 'This action cannot be undone.'}
                </p>
                <p className="text-[13px] font-black text-slate-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2 mt-3 mb-6 truncate">
                  "{deleteConfirm.topic}"
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-black text-sm hover:border-slate-300 transition-all disabled:opacity-50"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => deleteSession(deleteConfirm)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #e63946, #c1121f)',
                      boxShadow: '0 4px 15px rgba(230,57,70,0.4)',
                    }}
                  >
                    {deleting ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{lang === 'fr' ? 'Suppression...' : 'Deleting...'}</>
                    ) : (
                      <>{lang === 'fr' ? 'Supprimer' : 'Delete'}</>
                    )}
                  </button>
                </div>
              </div>

              {/* Neon bottom border pulse */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #e63946, transparent)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.75 }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── IDEA DETAIL MODAL ── */}
      <AnimatePresence>
        {ideaDetailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIdeaDetailModal(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="relative w-full max-w-lg rounded-[28px] overflow-hidden bg-white shadow-[0_0_0_2px_rgba(0,188,212,0.5),0_0_40px_rgba(0,188,212,0.2),0_20px_60px_rgba(0,0,0,0.2)]"
            >
              {/* Neon top border */}
              <motion.div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #00BCD4, transparent)' }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />

              <div className="p-7">
                {/* Header */}
                <div className="flex items-start justify-between mb-5 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{ideaDetailModal.rankItem?.rank === 1 ? '🥇' : ideaDetailModal.rankItem?.rank === 2 ? '🥈' : '🥉'}</span>
                    <div>
                      <h3 className="text-[15px] font-black text-slate-800 leading-snug">{ideaDetailModal.rankItem?.title || ideaDetailModal.idea?.title}</h3>
                      <p className="text-[9px] font-black text-[#00BCD4] uppercase tracking-widest mt-0.5">
                        {lang === 'fr' ? `Rang #${ideaDetailModal.rankItem?.rank}` : `Rank #${ideaDetailModal.rankItem?.rank}`} — {ideaDetailModal.rankItem?.confidence}% {lang === 'fr' ? 'confiance' : 'confidence'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setIdeaDetailModal(null)} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* Confidence bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mb-5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#00BCD4] to-[#019ab3]"
                    initial={{ width: 0 }}
                    animate={{ width: `${ideaDetailModal.rankItem?.confidence || 0}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>

                {/* Full description */}
                {ideaDetailModal.idea?.description && (
                  <div className="mb-4">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{lang === 'fr' ? 'Description complète' : 'Full description'}</p>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {ideaDetailModal.idea.description}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                {ideaDetailModal.rankItem?.verdict && (
                  <div className="mb-5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{lang === 'fr' ? 'Verdict IA' : 'AI Verdict'}</p>
                    <div className="border-l-4 border-[#00BCD4] pl-4 text-[12px] text-slate-600 italic leading-relaxed">
                      {ideaDetailModal.rankItem.verdict}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => { openScoreFormula(ideaDetailModal.idea, ideaDetailModal.rankItem); setIdeaDetailModal(null) }}
                    className="flex-1 py-3 rounded-2xl border-2 border-[#00BCD4]/40 text-[#00BCD4] font-black text-[11px] uppercase tracking-widest hover:bg-[#00BCD4]/5 transition-all"
                  >
                    {lang === 'fr' ? 'Voir le Score' : 'View Score'}
                  </button>
                  <button
                    onClick={() => setIdeaDetailModal(null)}
                    className="flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white transition-all"
                    style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}
                  >
                    {lang === 'fr' ? 'Fermer' : 'Close'}
                  </button>
                </div>
              </div>

              {/* Neon bottom border */}
              <motion.div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #00BCD4, transparent)' }}
                animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── SCORE FORMULA MODAL ── */}
      <AnimatePresence>
        {scoreModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setScoreModal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal card */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="relative w-full max-w-[520px] rounded-[28px] overflow-visible"
              style={{
                background: 'linear-gradient(160deg, #f0f9ff 0%, #ffffff 40%, #f8fafc 100%)',
                boxShadow: '0 0 0 2px rgba(0,188,212,0.6), 0 0 24px rgba(0,188,212,0.35), 0 0 60px rgba(0,188,212,0.15), 0 20px 50px rgba(0,0,0,0.2)',
              }}
            >
              {/* Neon border glow — animated pulse */}
              <motion.div
                className="absolute inset-0 rounded-[28px] pointer-events-none"
                style={{ boxShadow: '0 0 0 2px rgba(0,188,212,0.8), 0 0 30px rgba(0,188,212,0.4)' }}
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />

              {/* Corner accents */}
              <div className="absolute -top-[3px] -left-[3px] w-6 h-6 border-t-[3px] border-l-[3px] border-[#00BCD4] rounded-tl-[28px] pointer-events-none" />
              <div className="absolute -top-[3px] -right-[3px] w-6 h-6 border-t-[3px] border-r-[3px] border-[#00BCD4] rounded-tr-[28px] pointer-events-none" />
              <div className="absolute -bottom-[3px] -left-[3px] w-6 h-6 border-b-[3px] border-l-[3px] border-[#00BCD4] rounded-bl-[28px] pointer-events-none" />
              <div className="absolute -bottom-[3px] -right-[3px] w-6 h-6 border-b-[3px] border-r-[3px] border-[#00BCD4] rounded-br-[28px] pointer-events-none" />

              {/* Cyan glow blob top-left */}
              <div className="absolute -top-8 -left-8 w-36 h-36 rounded-full bg-[#00BCD4]/15 blur-2xl pointer-events-none" />

              <div className="p-6 relative z-10 rounded-[28px] overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-[18px] font-black tracking-tight leading-tight">
                      <span className="text-[#e63946] italic">DÉTAILS</span>
                      <span className="text-slate-800 font-bold"> DU SCORE</span>
                    </h3>
                    <div className="w-10 h-[3px] bg-gradient-to-r from-[#e63946] to-[#00BCD4] rounded-full mt-1.5" />
                  </div>
                  <button
                    onClick={() => setScoreModal(null)}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 shadow-sm transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {scoreModal.loading ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <div className="w-9 h-9 border-[3px] border-[#00BCD4]/20 border-t-[#00BCD4] rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                      {lang === 'fr' ? 'Calcul en cours...' : 'Calculating...'}
                    </p>
                  </div>
                ) : scoreModal.data ? (
                  <ScoreBreakdown data={scoreModal.data} rankItem={scoreModal.rankItem} idea={scoreModal.idea} />
                ) : (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <div className="w-9 h-9 border-[3px] border-[#00BCD4]/20 border-t-[#00BCD4] rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
                      {lang === 'fr' ? 'Calcul en cours...' : 'Calculating...'}
                    </p>
                  </div>
                )}

                {/* ── Fermer l'Audit button ── */}
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 20px rgba(0,188,212,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setScoreModal(null)}
                  className="w-full py-4 rounded-2xl font-black text-[12px] uppercase tracking-[0.25em] text-white transition-all flex items-center justify-center gap-2.5 mt-1"
                  style={{ background: '#0f172a', boxShadow: '0 4px 16px rgba(15,23,42,0.35)' }}
                >
                  <ShieldCheck size={14} />
                  {lang === 'fr' ? "Fermer l'Audit" : 'Close Audit'}
                </motion.button>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}

