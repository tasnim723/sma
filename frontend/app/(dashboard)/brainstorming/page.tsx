"use client"

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Rocket, Lightbulb, Zap, ArrowRight, Bot, 
  Terminal, Sparkles, Send, RefreshCw, Layers, ShieldCheck
} from 'lucide-react'
import axios from 'axios'
import { useAuthStore } from '@/lib/store'

interface Message {
  agent_name: string
  content: string
  phase: string
  timestamp: string
}

interface Session {
  id: string
  topic: string
  status: string
  messages: Message[]
  summary?: string
}

export default function BrainstormingWarRoom() {
  const token = useAuthStore(state => state.token)
  const [topic, setTopic] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [activeSession?.messages])

  // Polling for active session updates
  useEffect(() => {
    let interval: any
    if (activeSession && activeSession.status === 'RUNNING') {
      interval = setInterval(async () => {
        const res = await axios.get(`http://localhost:8000/api/brainstorming/`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const updated = res.data.find((s: any) => s.id === activeSession.id)
        if (updated) setActiveSession(updated)
        if (updated?.status === 'COMPLETED') clearInterval(interval)
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [activeSession?.status, token])

  const fetchSessions = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/brainstorming/", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSessions(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const startSession = async () => {
    if (!topic.trim()) return
    setLoading(true)
    try {
      const res = await axios.post("http://localhost:8000/api/brainstorming/", {
        topic,
        status: "PENDING",
        messages: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActiveSession(res.data)
      setTopic('')
      fetchSessions()
    } catch (err) {
       console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 md:p-8 space-y-8 overflow-hidden bg-[#0A0A0B] text-white">
      {/* GLITCH HEADER */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/10 blur-[100px] pointer-events-none" />
        <h1 className="text-4xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Terminal className="text-[#00CCCC] animate-pulse" size={32} />
          SMA Brainstorming <span className="text-[#FF0000]">War Room</span>
        </h1>
        <p className="text-slate-500 font-bold text-[10px] tracking-[0.3em] uppercase mt-2">
          Orchestration Multi-Agent • Mode Innovation Alpha
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* TOPIC INPUT / SESSIONS LIST */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
               <Zap size={14} className="text-amber-400" /> Nouvel Objectif
             </h3>
             <div className="space-y-4">
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="De quoi voulons-nous brainstormer ? (ex: 'Améliorer le benchmarking concurrentiel')"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm font-bold focus:border-[#00CCCC] transition-colors resize-none h-32 outline-none"
                />
                <button 
                  onClick={startSession}
                  disabled={loading || !topic}
                  className="w-full py-4 bg-[#00CCCC] text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                >
                  {loading ? <RefreshCw className="animate-spin" /> : <><Rocket size={20} /> Lancer la Simulation</>}
                </button>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Historique des Sessions</h3>
             {sessions.map(s => (
               <div 
                 key={s.id} 
                 onClick={() => setActiveSession(s)}
                 className={`p-4 rounded-3xl border cursor-pointer transition-all ${activeSession?.id === s.id ? 'bg-[#00CCCC]/20 border-[#00CCCC]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
               >
                 <h4 className="font-bold text-sm truncate">{s.topic}</h4>
                 <div className="flex items-center justify-between mt-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${s.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {s.status}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">{s.messages.length} échanges</span>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* FEED / WAR ROOM VISUALIZER */}
        <div className="lg:col-span-8 flex flex-col bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-3xl overflow-hidden relative">
           
           <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-4">
                 <div className={`w-3 h-3 rounded-full ${activeSession?.status === 'RUNNING' ? 'bg-amber-500 animate-pulse shadow-[0_0_10px_#f59e0b]' : activeSession?.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                 <h2 className="font-black text-lg tracking-tight">Focus : <span className="text-slate-400">{activeSession?.topic || 'Attente de session...'}</span></h2>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                 <ShieldCheck size={14} className="text-[#00CCCC]" /> AGENTS ACTIFS : 3
              </div>
           </div>

           <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar relative">
              
              <AnimatePresence>
                {activeSession ? (
                  activeSession.messages.map((m, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      className="flex gap-6 items-start group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[#00CCCC]/10 border border-[#00CCCC]/20 flex items-center justify-center shrink-0 shadow-lg shadow-[#00CCCC]/5">
                         <Bot size={24} className={m.agent_name.includes('Idé') ? "text-amber-400" : m.agent_name.includes('Critique') ? "text-rose-400" : "text-[#00CCCC]"} />
                      </div>
                      <div className="flex-1 space-y-2">
                         <div className="flex items-center gap-3">
                            <span className="text-[11px] font-black uppercase text-[#00CCCC] tracking-widest">{m.agent_name}</span>
                            <span className="text-[9px] font-black uppercase bg-white/5 px-2 py-0.5 rounded-md text-slate-500 tracking-tighter">{m.phase}</span>
                         </div>
                         <div className="p-6 rounded-[2rem] bg-white/5 border border-white/5 text-sm font-bold leading-relaxed text-slate-200 group-hover:bg-white/[0.08] transition-colors whitespace-pre-wrap">
                            {m.content}
                         </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                     <Sparkles size={120} className="mb-6 animate-pulse" />
                     <p className="text-2xl font-black uppercase tracking-[0.5em] italic">Simulation Off-Line</p>
                  </div>
                )}
              </AnimatePresence>

              {activeSession?.status === 'RUNNING' && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-6 items-center italic text-slate-500 font-bold p-4 bg-white/5 rounded-2xl border border-dashed border-white/10"
                >
                  <RefreshCw className="animate-spin" size={16} /> les agents sont en train de converger...
                </motion.div>
              )}
           </div>

           {/* SUMMARY / FOOTER UI */}
           {activeSession?.summary && (
              <motion.div 
                initial={{ y: 50 }}
                animate={{ y: 0 }}
                className="p-8 bg-gradient-to-t from-black to-transparent border-t border-white/10 text-center"
              >
                  <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-400 font-black text-xs uppercase tracking-widest mb-4">
                     <ShieldCheck size={16} /> SYNTHÈSE COMPLÈTE
                  </div>
                  <div className="max-w-2xl mx-auto opacity-80 mb-6">
                    <p className="text-sm font-bold italic line-clamp-3">
                      {activeSession.summary}
                    </p>
                  </div>
                  <button className="px-8 py-3 bg-[#00CCCC] text-black font-black uppercase tracking-widest rounded-xl hover:shadow-[0_0_30px_#00CCCC80] hover:scale-105 transition-all text-xs">
                    Exporter vers le Mind Map
                  </button>
              </motion.div>
           )}
        </div>
      </div>
    </div>
  )
}
