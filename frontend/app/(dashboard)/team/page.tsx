"use client"

import { useEffect, useState } from "react"
import { Users, LayoutGrid, Network, Plus, Shield, Pencil, Trash2, Eye, Flame, Activity, Crown, Lock, ShieldCheck, Star, UserMinus, AlertCircle } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const NeonWrapper = ({ children, className = "", color = "cyan" }: any) => {
  const glowClass = `glow-${color}`;
  const dotColor = color === 'yellow' ? 'bg-amber-500' : color === 'red' ? 'bg-rose-500' : color === 'green' ? 'bg-emerald-500' : 'bg-[#00BCD4]';

  return (
    <div className={`relative rounded-3xl transition-all duration-300 group/neon ${glowClass} ${className}`}>
      <div className="relative z-10 w-full h-full bg-white/70 backdrop-blur-xl rounded-[inherit]">
        {children}
      </div>
    </div>
  );
}

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  position?: string
  skills?: string[]
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'pod' | 'cards'>('pod')

  const token = useAuthStore(state => state.token)

  const fetchMembers = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/members/", {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setMembers(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const [wizardStep, setWizardStep] = useState(1)
  const defaultForm = {
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    role: "Frontend Dev",
    grade: "Junior",
    internalRole: "TEAM_MEMBER",
    competences: [] as string[],
    experience: 2,
    disponibilite: "Disponible",
    linkedin: "",
    github: "",
    notes: "",
    password: "password123"
  }
  const [formData, setFormData] = useState(defaultForm)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState("")

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const handleAddMember = async () => {
    try {
      const payload = {
        email: formData.email,
        full_name: `${formData.prenom} ${formData.nom}`.trim(),
        phone_number: formData.telephone,
        position: `${formData.role} - ${formData.grade}`,
        role: formData.internalRole,
        skills: formData.competences,
        linkedin_url: formData.linkedin,
        github_url: formData.github,
        xp: formData.experience * 100, // example xp scale
        password: formData.password
      }
      await axios.post("http://localhost:8000/api/members/", payload, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchMembers()
      setIsDialogOpen(false)
      setWizardStep(1)
      setFormData(defaultForm)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateMember = async () => {
    try {
      const payload = {
        email: formData.email,
        full_name: `${formData.prenom} ${formData.nom}`.trim(),
        phone_number: formData.telephone,
        position: `${formData.role} - ${formData.grade}`,
        role: formData.internalRole,
        skills: formData.competences,
        linkedin_url: formData.linkedin,
        github_url: formData.github,
      }
      await axios.put(`http://localhost:8000/api/members/${editId}`, payload, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchMembers()
      setIsDialogOpen(false)
      setIsEdit(false)
      setWizardStep(1)
      setFormData(defaultForm)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMember = async (id: string) => {
    try {
      await axios.delete(`http://localhost:8000/api/members/${id}`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchMembers()
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (token) fetchMembers()
  }, [token])

  const getAvatar = (name: string, position?: string) => {
    if (!name) return "/boy-removebg-preview.png"
    if (name.toLowerCase().includes('alice') || name.toLowerCase().includes('senior manager')) return "/girl-removebg-preview.png"
    const isFemale = name.toLowerCase().includes('charlie') || name.toLowerCase().endsWith('a') || name.toLowerCase().endsWith('e')
    return isFemale ? "/girl-removebg-preview.png" : "/boy-removebg-preview.png"
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#f1f7fa]">
      <div className="w-10 h-10 border-4 border-[#00BCD4]/20 border-t-[#00BCD4] rounded-full animate-spin" />
    </div>
  )

  // Grouping for Pod View
  const leads = members.filter(m => m.role === 'TEAM_LEAD')
  const others = members.filter(m => m.role !== 'TEAM_LEAD' && !m.full_name.toLowerCase().includes('manager'))

  return (
    <div className="relative h-full pb-20 px-8 font-sans bg-transparent text-slate-700">
      {/* ANIMATED NEON BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div animate={{ x: [0, 100, -50, 0], y: [0, 50, 150, 0], opacity: [0.3, 0.5, 0.3] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-[-10%] right-[10%] w-[700px] h-[700px] bg-[#00BCD4]/20 blur-[120px] rounded-full" />
        <motion.div animate={{ x: [0, -150, 50, 0], y: [0, 150, 50, 0], opacity: [0.2, 0.4, 0.2] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] left-[5%] w-[600px] h-[600px] bg-[#ff007f]/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1550px] mx-auto pt-10">

        {/* HEADER SECTION RESTORED */}
        <div className="flex gap-12 mb-4 items-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#00BCD4] to-[#ff007f] rounded-full blur-2xl opacity-30 animate-[spin_8s_linear_infinite]"></div>
            <motion.div whileHover={{ scale: 1.05 }} className="relative cursor-pointer">
              <svg width="140" height="140" viewBox="0 0 100 100" className="drop-shadow-[0_10px_40px_rgba(0,188,212,0.2)]">
                <defs>
                  <clipPath id="circleClip"><circle cx="50" cy="50" r="42" /></clipPath>
                  <linearGradient id="orbGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#00BCD4" />
                    <stop offset="100%" stopColor="#ff007f" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="48" fill="none" stroke="url(#orbGrad)" strokeWidth="1" strokeDasharray="10 8" className="animate-[spin_20s_linear_infinite]" />
                <circle cx="50" cy="50" r="44" fill="white" stroke="#00BCD4" strokeWidth="0.5" />
                <image href="/manager.webp" width="84" height="84" x="8" y="8" clipPath="url(#circleClip)" preserveAspectRatio="xMidYMid slice" />
              </svg>
            </motion.div>
          </div>

          <div className="flex-1">
            <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] border border-white shadow-[0_15px_50px_rgba(0,0,0,0.03)] flex items-center justify-between group">
              <div>
                <h1 className="text-[34px] font-black text-slate-800 tracking-tighter mb-2 group-hover:text-[#00BCD4] transition-colors">Membres</h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-[#00BCD4]"></span> Team-Node pod.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex bg-[#e8f1f8] p-1.5 rounded-[1.8rem] gap-1 shadow-inner">
                  <button onClick={() => setViewMode('pod')} className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'pod' ? 'bg-white text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.1)]' : 'text-slate-400 hover:text-slate-600'}`}><Network size={14} /> Pod</button>
                  <button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cards' ? 'bg-white text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.1)]' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={14} /> Cartes</button>
                </div>

                <button onClick={() => { setIsEdit(false); setFormData(defaultForm); setWizardStep(1); setIsDialogOpen(true); }} className="w-16 h-16 rounded-full bg-white border-2 border-[#00BCD4]/10 flex items-center justify-center text-[#00BCD4] hover:bg-[#00BCD4] hover:text-white transition-all shadow-[0_8px_30px_rgba(0,188,212,0.1)] active:scale-95">
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'pod' ? (
            <motion.div key="pod" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* ENTIRE NEURAL TREE HIERARCHY */}
              <div className="flex items-center justify-center relative pt-2 pb-12 w-full">

                {/* 1. COMMANDER CARD (ALICE - GOLD/DORÉ) */}
                <motion.div
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="w-[280px] relative flex-shrink-0 group/cmd z-10 rounded-[2.5rem] glow-yellow bg-white/40 backdrop-blur-2xl transition-all duration-500"
                >
                  <div className="relative z-10 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] p-6 w-full h-full border border-white/50 overflow-hidden">

                    <div className="absolute top-0 right-6 w-[45px] h-[60px] bg-gradient-to-b from-[#e2c176] to-[#d4af37] shadow-[0_5px_20px_rgba(212,175,55,0.4)] flex flex-col items-center justify-center text-white z-10" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)' }}>
                      <Crown size={22} className="mt-[-5px] drop-shadow-md text-white" fill="currentColor" />
                    </div>

                    <h2 className="text-[20px] font-black text-slate-800 tracking-tight mb-6 mt-2 relative z-10 group-hover/cmd:text-amber-600 transition-colors">Alice Manager</h2>

                    <div className="flex flex-col items-center gap-4 mb-10 relative z-10">
                      <div className="relative w-[120px] h-[120px] group-hover/cmd:scale-110 transition-transform duration-500">
                        {/* Aura Shadow matching logic */}
                        <div className="absolute inset-0 bg-amber-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                        <img src="/manager.webp" className="relative h-full w-full object-contain drop-shadow-[0_10px_20px_rgba(251,191,36,0.2)]" />
                      </div>
                    </div>

                    <div className="flex gap-2 mb-6 justify-center relative z-10 w-full px-2">
                      <div className="flex-1 max-w-[140px] bg-amber-50 text-amber-600 py-1.5 rounded-full text-[8.5px] font-black uppercase flex items-center justify-center gap-1.5 border border-amber-100">
                        <ShieldCheck size={10} /> Senior Manager
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100/50 space-y-2 relative z-10">
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner p-[1px]">
                        <div className="h-full w-[65%] bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_10px_rgba(251,191,36,0.5)] rounded-full relative">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)] animate-[shimmer_2s_infinite]" />
                        </div>
                      </div>
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center group-hover/cmd:text-amber-500 transition-colors">XP = Level Up / 1200</p>
                    </div>
                  </div>
                </motion.div>

                {/* Main Bridge from Commander to Lead */}
                <div className="w-16 h-[2px] bg-slate-200 shrink-0"></div>

                {/* Lead Connector Node */}
                <div className="relative flex items-center justify-center w-6 h-6 z-10 -ml-3 shrink-0">
                  <div className="w-full h-full bg-white rounded-full border-2 border-[#00BCD4] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#00BCD4] rounded-full"></div>
                  </div>
                </div>

                {/* LEADS COLUMN */}
                <div className="flex flex-col justify-center relative z-10 ml-4">
                  {leads.length > 0 ? leads.map((lead, i) => (
                    <MemberPodCard key={lead.id} member={lead} gender="boy" />
                  )) : (
                    <div className="relative">
                      <MemberPodCard member={{ full_name: "Bob Lead", role: "TEAM_LEAD" }} gender="boy" />
                      {/* Line exiting Lead to the right */}
                      <div className="absolute top-1/2 -right-12 w-12 h-[2px] bg-slate-200 -translate-y-1/2"></div>
                    </div>
                  )}
                </div>

                {/* MEMBERS COLUMN */}
                <div className="flex flex-col gap-8 relative z-10 w-[260px] ml-12">

                  {/* Vertical Spanning Backbone (Guarantees perfect center routing) */}
                  <div className="absolute left-[-48px] top-[40px] bottom-[40px] w-[2px] bg-slate-200"></div>

                  {(others.length > 0 ? others.slice(0, 3) : [
                    { full_name: "Charlie Member", role: "Developer - Mid" },
                    { full_name: "Jean Dupont", role: "Frontend Dev" },
                    { full_name: "Test User", role: "Team Member" } // Added 3rd dummy to fill the tree nicely
                  ]).map((m, i) => (
                    <div key={i} className="relative">
                      {/* Horizontal Line attaching to Vertical Backbone */}
                      <div className="absolute top-1/2 left-[-48px] w-12 h-[2px] bg-slate-200 -translate-y-1/2"></div>
                      <div className="absolute top-1/2 left-[-48px] w-2 h-2 rounded-full bg-sky-500 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_8px_#0ca5e9]"></div>

                      <MemberPodCard member={m} gender={m.full_name.toLowerCase().includes('charlie') ? 'girl' : 'boy'} size="small" haste={i === 1} color="cyan" />
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          ) : (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-4 gap-10 px-4">
              {members.filter(m => !m.full_name.toLowerCase().includes('alice')).map((member, i) => {
                const colorClass = 'glow-cyan';
                const dotColor = 'bg-sky-500';

                return (
                  <motion.div
                    key={member.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className={`relative transition-all duration-500 rounded-[2.8rem] bg-white/40 backdrop-blur-2xl ${colorClass}`}
                  >
                    <div className="relative z-10 bg-white/70 backdrop-blur-3xl p-8 rounded-[2.8rem] w-full h-full border border-white/50 shadow-xl shadow-slate-200/20 overflow-hidden">
                      <div className="flex gap-4 mb-6">
                        <div className="w-[64px] h-[64px] rounded-full bg-white border border-slate-100/50 overflow-hidden shadow-sm">
                          <img src={getAvatar(member.full_name, member.position || member.role)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">{member.full_name}</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{member.role}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mb-8 px-1">
                        {[1, 2, 3, 4].map((lvl, k) => (
                          <div key={k} className="flex flex-col items-center gap-1.5">
                            {k === 0 ? (
                              <div className={`w-8 h-9 rounded-lg border flex items-center justify-center shadow-lg bg-[#00BCD4] text-white`} style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                                <Shield size={12} fill="currentColor" />
                              </div>
                            ) : (
                              <div className="w-8 h-9 rounded-lg border bg-white/50 text-slate-300 border-slate-100 flex items-center justify-center relative overflow-hidden" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                                <Lock size={12} />
                              </div>
                            )}
                            <span className={`text-[9px] font-black uppercase tracking-wider ${k === 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                              {k === 0 ? 'Lv 1' : 'Lock'}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-5 pt-5 border-t border-slate-100/50">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <span>Team Power</span>
                            <span className="text-slate-700">85 %</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r from-[#00BCD4] to-sky-500 w-[85%] rounded-full relative`} />
                          </div>
                        </div>
                        <div className="flex gap-3 justify-center mt-2 w-full">
                          <button onClick={() => { setSelectedMember(member); setIsViewModalOpen(true); }} className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-50 hover:text-sky-500 transition-all duration-300 hover:-translate-y-0.5"><Eye size={16} /></button>
                          <button onClick={() => {
                            const names = member.full_name.split(" ");
                            setFormData({ ...defaultForm, prenom: names[0] || "", nom: names.slice(1).join(" ") || "", email: member.email || "", role: member.position?.split(" - ")[0] || "Frontend Dev", grade: member.position?.split(" - ")[1] || "Junior", competences: member.skills || [] });
                            setEditId(member.id); setIsEdit(true); setWizardStep(1); setIsDialogOpen(true);
                          }} className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-50 hover:text-slate-600 transition-all duration-300 hover:-translate-y-0.5"><Pencil size={14} /></button>
                          <button onClick={() => { setSelectedMember(member); setIsDeleteModalOpen(true); }} className="w-10 h-10 rounded-xl bg-white text-slate-400 border border-slate-100 flex items-center justify-center shadow-sm hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all duration-300 hover:-translate-y-0.5"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(val) => {
            setIsDialogOpen(val);
            if (!val) {
              setIsEdit(false);
              setWizardStep(1);
            }
          }}
        >
          <DialogContent className="sm:max-w-[550px] p-0 rounded-[2rem] bg-white border-none shadow-2xl overflow-hidden">
            <div className="p-10">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-[22px] font-black text-[#1e293b] tracking-tight">{isEdit ? `Modifier ${formData.prenom} ${formData.nom}` : "Ajouter un Développeur"}</DialogTitle>
              </DialogHeader>

              {/* Stepper */}
              <div className="flex gap-2 mb-8">
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 1 ? 'bg-[#00BCD4]' : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 2 ? 'bg-[#00BCD4]' : 'bg-slate-100'}`} />
                <div className={`h-1 flex-1 rounded-full ${wizardStep >= 3 ? 'bg-[#00BCD4]' : 'bg-slate-100'}`} />
              </div>

              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div key="step-1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                    <h3 className="font-bold text-[#1e293b] text-[15px] mb-4">Étape 1 : Infos personnelles</h3>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Prénom</label>
                        <Input placeholder="Jean" className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Nom</label>
                        <Input placeholder="Dupont" className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Email Professionnel</label>
                        <Input placeholder="jean@pfe.com" type="email" className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Téléphone</label>
                        <Input placeholder="+33 6..." className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Rôle</label>
                        <select className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 font-semibold text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4]" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                          <option>Frontend Dev</option><option>Backend Dev</option><option>Fullstack</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Grade</label>
                        <select className="w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 font-semibold text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4]" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                          <option>Junior</option><option>Mid</option><option>Senior</option><option>Lead</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button onClick={() => setWizardStep(2)} className="w-full h-12 bg-[#00BCD4] font-bold text-[15px] rounded-2xl text-white shadow-md hover:bg-[#0052cc]">Suivant</Button>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div key="step-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                    <h3 className="font-bold text-[#1e293b] text-[15px] mb-4">Étape 2 : Compétences</h3>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-2 block">Ajouter une compétence</label>
                      <Input placeholder="Entrez une compétence (Ex: React)..." className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700 mb-4" />

                      <div className="flex flex-wrap gap-2">
                        {['React', 'Vue', 'Angular', 'Node.js', 'Python', 'FastAPI', 'Django', 'PostgreSQL', 'MongoDB', 'Docker', 'AWS', 'Git', 'Figma', 'TypeScript'].map(skill => (
                          <button key={skill} onClick={() => setFormData(prev => ({ ...prev, competences: prev.competences.includes(skill) ? prev.competences.filter(s => s !== skill) : [...prev.competences, skill] }))}
                            className={`px-4 py-1.5 rounded-full border text-[13px] font-semibold transition-all ${formData.competences.includes(skill) ? 'bg-[#00BCD4] text-white border-[#00BCD4]' : 'bg-white text-slate-500 border-slate-200 hover:border-[#00BCD4] hover:text-[#00BCD4]'}`}>
                            {skill}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-3 block">Expérience ({formData.experience} ans)</label>
                      <input type="range" min="0" max="10" value={formData.experience} onChange={e => setFormData({ ...formData, experience: parseInt(e.target.value) })} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]" />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center mt-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#1e293b]">Disponibilité actuelle</span>
                      <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-600 outline-none text-sm" value={formData.disponibilite} onChange={e => setFormData({ ...formData, disponibilite: e.target.value })}>
                        <option>Disponible</option><option>En mission</option><option>En congé</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button onClick={() => setWizardStep(1)} variant="outline" className="flex-1 h-12 bg-white border border-slate-200 font-bold text-[15px] rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-slate-800">Retour</Button>
                      <Button onClick={() => setWizardStep(3)} className="w-[65%] h-12 bg-[#00BCD4] font-bold text-[15px] rounded-2xl text-white shadow-md hover:bg-[#0052cc]">Suivant</Button>
                    </div>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div key="step-3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                    <h3 className="font-bold text-[#1e293b] text-[15px] mb-4">Étape 3 : Documents & Liens</h3>

                    <div>
                      <div className="border border-dashed border-slate-300 rounded-2xl p-4 flex justify-center items-center cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-[13px] font-semibold text-slate-500 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                          Téléverser le CV (PDF)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">LinkedIn</label>
                        <Input placeholder="https://linkedin.com/..." className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.linkedin} onChange={e => setFormData({ ...formData, linkedin: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">GitHub</label>
                        <Input placeholder="https://github.com/..." className="rounded-2xl h-12 bg-white border border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] px-4 font-semibold text-slate-700" value={formData.github} onChange={e => setFormData({ ...formData, github: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-1.5 block">Notes et commentaires</label>
                      <textarea placeholder="Infos utiles..." rows={4} className="w-full rounded-2xl bg-white border border-slate-200 p-4 font-semibold text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}></textarea>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <Button onClick={() => setWizardStep(2)} variant="outline" className="flex-1 h-12 bg-white border border-slate-200 font-bold text-[15px] rounded-2xl text-slate-600 hover:bg-slate-50 hover:text-slate-800">Retour</Button>
                      <Button onClick={isEdit ? handleUpdateMember : handleAddMember} className="w-[65%] h-12 bg-[#00BCD4] font-bold text-[15px] flex items-center justify-center gap-2 rounded-2xl text-white shadow-md hover:bg-[#0052cc]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        {isEdit ? "Modifier" : "Ajouter à l'équipe"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </DialogContent>
        </Dialog>

        {/* VIEW MEMBER MODAL */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-[380px] p-0 rounded-[2.5rem] bg-white border-none shadow-2xl overflow-hidden">
            <div className="pt-10 pb-6 px-7 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl border-4 border-sky-100 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
                <img
                  src={getAvatar(selectedMember?.full_name || "")}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-1.5">{selectedMember?.full_name}</h2>
              <div className="flex gap-2 mb-6">
                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Tech Lead</span>
                <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Senior</span>
              </div>

              <div className="w-full space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Contact</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><ShieldCheck size={16} /></div>
                      {selectedMember?.email}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Activity size={16} /></div>
                      +216 22 333 444
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Compétences Techniques</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Development', 'Review'].map(s => (
                      <span key={s} className="px-4 py-1.5 rounded-full border border-slate-100 text-slate-500 text-[11px] font-bold">{s}</span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Expérience</p>
                    <p className="text-[13px] font-black text-slate-800">4+ années</p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Projets</p>
                    <p className="text-[13px] font-black text-slate-800">3 actifs</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Charge de Travail</h4>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full w-[60%] bg-blue-500 rounded-full" />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 h-11 rounded-2xl bg-slate-50 flex items-center justify-center gap-2 text-slate-500 font-bold text-[13px] border border-slate-100 hover:bg-slate-100 transition-colors">
                    <Shield size={14} /> CV
                  </button>
                  <button className="flex-1 h-11 rounded-2xl bg-slate-50 flex items-center justify-center gap-2 text-slate-500 font-bold text-[13px] border border-slate-100 hover:bg-slate-100 transition-colors">
                    LinkedIn <Plus size={12} className="rotate-45" />
                  </button>
                </div>

                <button onClick={() => { setIsViewModalOpen(false); setIsDeleteModalOpen(true); }} className="w-full h-11 rounded-2xl bg-rose-50 text-rose-500 font-bold text-[13px] flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
                  <Trash2 size={14} /> Retirer de l'équipe
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DELETE CONFIRMATION MODAL */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-[380px] p-0 rounded-[2.8rem] bg-white border-none shadow-[0_25px_80px_rgba(0,0,0,0.15)] overflow-hidden">
            <AnimatePresence>
              {isDeleteModalOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-9 flex flex-col items-center relative"
                >
                  {/* Neural Glow Background */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15, delay: 0.1 }}
                    className="w-16 h-16 rounded-[1.5rem] bg-rose-50 flex items-center justify-center text-rose-500 mb-6 relative group"
                  >
                    <Trash2 size={28} className="relative z-10 group-hover:rotate-12 transition-transform" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-black text-slate-800 mb-3 tracking-tight"
                  >
                    Retrait du membre
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-slate-400 font-bold text-[13px] mb-8 leading-relaxed px-2"
                  >
                    Êtes-vous sûr de vouloir retirer ce membre de l'équipe du projet ?
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full bg-slate-50/80 backdrop-blur-sm p-4 rounded-3xl mb-8 flex items-center gap-4 border border-slate-100/50 shadow-sm"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00BCD4] to-[#00897b] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#00BCD4]/20">
                      {selectedMember?.full_name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm leading-tight">{selectedMember?.full_name}</h3>
                      <p className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest mt-0.5">{selectedMember?.role}</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/30 mb-8"
                  >
                    <p className="text-[11px] font-bold text-center leading-relaxed text-slate-600">
                      <motion.span
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="text-rose-500 font-black"
                      >
                        Attention :
                      </motion.span> L'historique de ses tâches sera conservé, mais ses accès au projet seront révoqués.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex gap-3 w-full"
                  >
                    <Button
                      onClick={() => setIsDeleteModalOpen(false)}
                      variant="outline"
                      className="flex-1 h-14 rounded-2xl border-slate-200 font-black text-slate-500 hover:bg-slate-50 transition-all text-[13px] uppercase tracking-wider"
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={() => selectedMember && handleDeleteMember(selectedMember.id)}
                      className="flex-1 h-14 rounded-2xl bg-[#ff0055] hover:bg-[#e6004c] text-white font-black flex items-center justify-center gap-3 shadow-xl shadow-rose-500/20 active:scale-95 transition-all text-[13px] uppercase tracking-wider"
                    >
                      <Trash2 size={18} /> Retirer
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function MemberPodCard({ member, gender, size = "normal", haste, color = "cyan" }: any) {
  const avatar = gender === "girl" ? "/girl-removebg-preview.png" : "/boy-removebg-preview.png";
  const isSmall = size === "small";
  const glowClass = `glow-${color}`;
  const dotColor = color === 'yellow' ? 'bg-amber-500' : color === 'red' ? 'bg-rose-500' : color === 'green' ? 'bg-emerald-500' : 'bg-sky-500';

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      className={`relative rounded-3xl transition-all duration-500 group/pod ${glowClass} ${isSmall ? 'w-[220px]' : 'w-[260px]'} bg-white/40 backdrop-blur-2xl`}
    >
      <div className={`relative z-10 bg-white/70 backdrop-blur-xl flex items-center gap-4 border border-white/50 ${isSmall ? 'p-3.5 rounded-3xl' : 'p-5 rounded-3xl'}`}>
        <div className={`${isSmall ? 'w-[52px] h-[52px]' : 'w-[64px] h-[64px]'} rounded-full bg-white border border-slate-100/50 flex items-center justify-center overflow-hidden relative shadow-sm`}>
          <img src={avatar} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-black text-slate-800 truncate mb-0.5 ${isSmall ? 'text-sm' : 'text-base'}`}>{member.full_name}</h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">{member.role}</p>
          <div className="flex gap-2 mt-2.5">
            <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 border bg-sky-50/50 text-sky-600 border-sky-100`}>
              <Star size={8} fill="currentColor" /> {member.position || "Developer"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
