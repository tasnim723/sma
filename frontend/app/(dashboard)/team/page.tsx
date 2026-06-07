"use client"
import { API_BASE_URL } from "@/lib/api"

import { useEffect, useState, useCallback } from "react"
import { Users, LayoutGrid, Network, Plus, Shield, Pencil, Trash2, Eye, Flame, Activity, Crown, Lock, ShieldCheck, Star, UserMinus, AlertCircle, Sparkles, FileText, Upload, X, Cpu, CheckCircle2, ClipboardList, Bell, UserCheck, UserX, Clock } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"
import { useLang } from "@/lib/useLang"

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
  gender?: string
  avatar_url?: string
  cv_url?: string
  linkedin_url?: string
  github_url?: string
  experience?: number | string
  phone_number?: string
  grade?: string
  project_count?: number
  workload?: number
}

interface PendingUser {
  id: string
  full_name: string
  email: string
  role: string
  position?: string
  skills?: string[]
  created_at: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'pod' | 'cards'>('pod')

  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === 'PROJECT_MANAGER'

  // Pending approvals state
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([])
  const [pendingLoading, setPendingLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [showPendingPanel, setShowPendingPanel] = useState(false)
  const [confirmLinkData, setConfirmLinkData] = useState<{ name: string; link: string; emailSent: boolean } | null>(null)

  const fetchPendingUsers = async () => {
    if (!token || !isManager) return
    setPendingLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/pending-users?token=${token}`)
      setPendingUsers(res.data)
      if (res.data.length > 0) setShowPendingPanel(true)
    } catch (err) {
      console.error('Failed to fetch pending users', err)
    } finally {
      setPendingLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    const targetUser = pendingUsers.find(u => u.id === userId)
    setApprovingId(userId)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/approve/${userId}?token=${token}`)
      setPendingUsers(prev => prev.filter(u => u.id !== userId))
      fetchMembers() // Add this to refresh the members list immediately
      // Show the confirmation link in a dialog (fallback if email fails)
      setConfirmLinkData({
        name: targetUser?.full_name || 'Utilisateur',
        link: res.data.confirm_link || '',
        emailSent: res.data.email_sent ?? true
      })
    } catch (err) {
      console.error('Approve failed', err)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async (userId: string) => {
    setRejectingId(userId)
    try {
      await axios.post(`${API_BASE_URL}/api/auth/reject/${userId}?token=${token}`)
      setPendingUsers(prev => prev.filter(u => u.id !== userId))
    } catch (err) {
      console.error('Reject failed', err)
    } finally {
      setRejectingId(null)
    }
  }

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/members/`, {
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
  const [cvMode, setCvMode] = useState<'manual' | 'auto'>('manual')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvAnalyzing, setCvAnalyzing] = useState(false)
  const [cvAnalyzed, setCvAnalyzed] = useState(false)
  const [cvAnalysisError, setCvAnalysisError] = useState("")
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
    password: "password123",
    gender: "" as "Homme" | "Femme" | "",
    cv_url: "",
  }
  const [formData, setFormData] = useState(defaultForm)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState("")

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isCvUploadModalOpen, setIsCvUploadModalOpen] = useState(false)
  const [missingCvFile, setMissingCvFile] = useState<File | null>(null)
  const [uploadingMissingCv, setUploadingMissingCv] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [deleteError, setDeleteError] = useState("")

  const handleAddMember = async () => {
    try {
      let uploadedCvUrl = formData.cv_url || "";
      if (cvFile && !uploadedCvUrl) {
         const cvFd = new FormData();
         cvFd.append("file", cvFile);
         try {
           const cvRes = await axios.post(`${API_BASE_URL}/api/upload/cv`, cvFd, {
             headers: { Authorization: `Bearer ${token || ""}` }
           });
           uploadedCvUrl = `${API_BASE_URL}${cvRes.data.url}`;
         } catch(e) {
           console.error("Failed to upload CV", e);
         }
      }

      const avatarUrl = formData.gender === 'Femme'
        ? '/girl-removebg-preview.png'
        : formData.gender === 'Homme'
        ? '/boy-removebg-preview.png'
        : ''
      const payload = {
        email: formData.email,
        full_name: `${formData.prenom} ${formData.nom}`.trim(),
        phone_number: formData.telephone,
        position: `${formData.role} - ${formData.grade}`,
        role: formData.internalRole,
        skills: formData.competences,
        linkedin_url: formData.linkedin,
        github_url: formData.github,
        password: formData.password,
        gender: formData.gender,
        avatar_url: avatarUrl,
        cv_url: uploadedCvUrl,
        experience: formData.experience,
        grade: formData.grade,
      }
      await axios.post(`${API_BASE_URL}/api/members/`, payload, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchMembers()
      setIsDialogOpen(false)
      setWizardStep(1)
      setCvMode('manual')
      setCvFile(null)
      setCvAnalyzed(false)
      setCvAnalysisError("")
      setFormData(defaultForm)
    } catch (err) {
      console.error(err)
    }
  }

  const handleUpdateMember = async () => {
    try {
      let uploadedCvUrl = formData.cv_url || "";
      if (cvFile && !uploadedCvUrl) {
         const cvFd = new FormData();
         cvFd.append("file", cvFile);
         try {
           const cvRes = await axios.post(`${API_BASE_URL}/api/upload/cv`, cvFd, {
             headers: { Authorization: `Bearer ${token || ""}` }
           });
           uploadedCvUrl = `${API_BASE_URL}${cvRes.data.url}`;
         } catch(e) {
           console.error("Failed to upload CV", e);
         }
      }

      const avatarUrl = formData.gender === 'Femme'
        ? '/girl-removebg-preview.png'
        : formData.gender === 'Homme'
        ? '/boy-removebg-preview.png'
        : ''
      const payload = {
        email: formData.email,
        full_name: `${formData.prenom} ${formData.nom}`.trim(),
        phone_number: formData.telephone,
        position: `${formData.role} - ${formData.grade}`,
        role: formData.internalRole,
        skills: formData.competences,
        linkedin_url: formData.linkedin,
        github_url: formData.github,
        gender: formData.gender,
        avatar_url: avatarUrl,
        cv_url: uploadedCvUrl,
        experience: String(formData.experience),
        grade: formData.grade,
      }
      await axios.put(`${API_BASE_URL}/api/members/${editId}`, payload, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchMembers()
      setIsDialogOpen(false)
      setIsEdit(false)
      setWizardStep(1)
      setCvMode('manual')
      setCvFile(null)
      setCvAnalyzed(false)
      setFormData(defaultForm)
    } catch (err) {
      console.error(err)
    }
  }

  const onDropCV = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setCvFile(acceptedFiles[0])
      setCvAnalyzed(false)
      setCvAnalysisError("")
    }
  }, [])

  const { getRootProps: getCVRootProps, getInputProps: getCVInputProps, isDragActive: isCVDragActive } = useDropzone({
    onDrop: onDropCV,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  const onDropMissingCV = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) {
      setMissingCvFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps: getMissingCvRootProps, getInputProps: getMissingCvInputProps, isDragActive: isMissingCvDragActive } = useDropzone({
    onDrop: onDropMissingCV,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
  })

  const handleUploadMissingCv = async () => {
    if (!missingCvFile || !selectedMember) return
    setUploadingMissingCv(true)
    try {
      const cvFd = new FormData()
      cvFd.append("file", missingCvFile)
      const cvRes = await axios.post(`${API_BASE_URL}/api/upload/cv`, cvFd, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      const uploadedCvUrl = `${API_BASE_URL}${cvRes.data.url}`
      
      await axios.put(`${API_BASE_URL}/api/members/${selectedMember.id}`, { cv_url: uploadedCvUrl }, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      
      setSelectedMember(prev => prev ? { ...prev, cv_url: uploadedCvUrl } : null)
      setMembers(prev => prev.map(m => m.id === selectedMember.id ? { ...m, cv_url: uploadedCvUrl } : m))
      setIsCvUploadModalOpen(false)
      setMissingCvFile(null)
    } catch (err) {
      console.error("Failed to upload missing CV", err)
    } finally {
      setUploadingMissingCv(false)
    }
  }

  const analyzeCV = async () => {
    if (!cvFile) return
    setCvAnalyzing(true)
    setCvAnalysisError("")
    try {
      const fd = new FormData()
      fd.append("file", cvFile)
      const res = await axios.post(`${API_BASE_URL}/api/ai/analyze-cv`, fd, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      const d = res.data
      setFormData(prev => ({
        ...prev,
        prenom: d.prenom || prev.prenom,
        nom: d.nom || prev.nom,
        email: d.email || prev.email,
        telephone: d.telephone || prev.telephone,
        role: d.role || prev.role,
        grade: d.grade || prev.grade,
        competences: Array.isArray(d.competences) && d.competences.length > 0 ? d.competences : prev.competences,
        experience: d.experience || prev.experience,
        notes: d.notes || prev.notes,
      }))
      setCvAnalyzed(true)
    } catch (err: any) {
      setCvAnalysisError(err.response?.data?.detail || "Erreur lors de l'analyse du CV.")
    } finally {
      setCvAnalyzing(false)
    }
  }

  const handleDeleteMember = async (id: string) => {
    setDeleteError("")
    try {
      await axios.delete(`${API_BASE_URL}/api/members/${id}`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setIsDeleteModalOpen(false)
      setSelectedMember(null)
      fetchMembers()
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "Erreur réseau. Vérifiez que le serveur est démarré."
      setDeleteError(msg)
      console.error('[DELETE MEMBER]', err)
    }
  }

  useEffect(() => {
    if (token) {
      fetchMembers()
      fetchPendingUsers()
    }
  }, [token])

  const getAvatar = (member: Member | { full_name: string; gender?: string; avatar_url?: string }) => {
    if (member.avatar_url && member.avatar_url !== '') return member.avatar_url
    if ((member as any).gender === 'Femme') return "/girl-removebg-preview.png"
    if ((member as any).gender === 'Homme') return "/boy-removebg-preview.png"
    const name = member.full_name || ''
    if (!name) return "/boy-removebg-preview.png"
    if (name.toLowerCase().includes('alice') || name.toLowerCase().includes('senior manager') || name.toLowerCase().includes('manager principal')) return "/manager.webp"
    const isFemale = name.toLowerCase().includes('charlie') || name.toLowerCase().endsWith('a') || name.toLowerCase().endsWith('e')
    return isFemale ? "/girl-removebg-preview.png" : "/boy-removebg-preview.png"
  }

  const { t, lang } = useLang()

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#f1f7fa]">
      <div className="w-10 h-10 border-4 border-[#00BCD4]/20 border-t-[#00BCD4] rounded-full animate-spin" />
    </div>
  )

  // Grouping for Pod View
  const manager = members.find(m => m.role === 'PROJECT_MANAGER' || m.full_name.toLowerCase().includes('manager'))
  // Swap Bilel (TEAM_LEAD) and Sabeur (TEAM_MEMBER) positions visually — keep original role labels
  const rawLeads = members.filter(m => m.role === 'TEAM_LEAD')
  const rawOthers = members.filter(m => m.role === 'TEAM_MEMBER')
  const bilel = rawLeads.find(m => m.full_name.toLowerCase().includes('bilel'))
  const sabeur = rawOthers.find(m => m.full_name.toLowerCase().includes('sabeur') || m.full_name.toLowerCase().includes('saber'))
  // Sabeur takes the lead slot visually (but keeps TEAM_MEMBER label), Bilel goes to members
  const leads = [
    ...(sabeur ? [sabeur] : []),
    ...rawLeads.filter(m => !m.full_name.toLowerCase().includes('bilel')),
  ]
  const others = [
    ...(bilel ? [bilel] : []),
    ...rawOthers.filter(m => !(m.full_name.toLowerCase().includes('sabeur') || m.full_name.toLowerCase().includes('saber'))),
  ]
  const allExceptManager = members.filter(m => m.id !== manager?.id)

  return (
    <div className="relative h-full pb-20 px-8 font-sans bg-transparent text-slate-700">
      {/* ANIMATED NEON BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <motion.div animate={{ x: [0, -150, 50, 0], y: [0, 150, 50, 0], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute bottom-[-10%] left-[5%] w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-[1550px] mx-auto pt-10">

        {/* ─── PENDING APPROVALS PANEL (Manager only) ─────────────────────────── */}
        <AnimatePresence>
          {isManager && showPendingPanel && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="mb-6 relative"
            >
              <div className="rounded-[2.5rem] shadow-[0_15px_60px_rgba(251,191,36,0.15),0_0_20px_rgba(251,191,36,0.2),inset_0_0_0_1px_rgba(251,191,36,0.5)] border border-amber-300/30 overflow-hidden relative">
                <div className="absolute inset-0 bg-white/20 backdrop-blur-3xl" />
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-100 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                <div className="relative p-7">
                  {/* Panel header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                          <Bell size={18} className="text-white" />
                        </div>
                        {pendingUsers.length > 0 && (
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                          >
                            <span className="text-[9px] font-black text-white">{pendingUsers.length}</span>
                          </motion.div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-[16px] font-black text-slate-800 tracking-tight">Demandes d'accès en attente</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                          {pendingUsers.length} demande{pendingUsers.length > 1 ? 's' : ''} à traiter
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPendingPanel(false)}
                      className="w-10 h-10 rounded-[1rem] bg-white/40 flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-white border border-white/60 shadow-sm transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Pending users list */}
                  {pendingLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="w-6 h-6 border-2 border-[#00BCD4]/30 border-t-[#00BCD4] rounded-full animate-spin" />
                    </div>
                  ) : pendingUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-20 gap-2">
                      <CheckCircle2 size={24} className="text-emerald-400" />
                      <p className="text-[13px] font-bold text-slate-400">Aucune demande en attente</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence>
                        {pendingUsers.map((u) => (
                          <motion.div
                            key={u.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, x: -20 }}
                            className="bg-white/20 backdrop-blur-xl hover:bg-white/40 transition-all duration-300 rounded-[1.8rem] p-5 border border-white/40 shadow-[0_8px_30px_rgba(251,191,36,0.1)] hover:shadow-[0_15px_40px_rgba(251,191,36,0.25),0_0_15px_rgba(251,191,36,0.2),inset_0_0_0_1px_rgba(251,191,36,0.5)] relative overflow-hidden group"
                          >
                            {/* Top accent */}
                            <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 opacity-70 group-hover:opacity-100 group-hover:shadow-[0_2px_15px_rgba(251,191,36,1)] transition-all duration-300" />

                            <div className="flex items-start gap-3 mb-3">
                              <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-amber-400/20 to-orange-500/10 flex items-center justify-center shrink-0 border border-amber-300/40 shadow-inner group-hover:shadow-[0_0_20px_rgba(251,191,36,0.4)] transition-all duration-300">
                                <span className="text-[15px] font-black text-amber-600">
                                  {u.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-black text-slate-800 truncate">{u.full_name}</p>
                                <p className="text-[11px] text-slate-400 font-bold truncate">{u.email}</p>
                                {u.position && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-[#00BCD4]/10 text-[#00BCD4] text-[9px] font-black uppercase tracking-wider rounded-full">
                                    {u.position}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Skills */}
                            {u.skills && u.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-4">
                                {u.skills.slice(0, 4).map(s => (
                                  <span key={s} className="px-2.5 py-1 bg-white/60 border border-white/50 shadow-sm text-slate-500 text-[9px] font-black uppercase tracking-wider rounded-lg">{s}</span>
                                ))}
                                {u.skills.length > 4 && <span className="text-[9px] text-slate-400 font-bold px-1 py-1">+{u.skills.length - 4}</span>}
                              </div>
                            )}

                            {/* Time */}
                            <div className="flex items-center gap-1 mb-3">
                              <Clock size={10} className="text-slate-300" />
                              <span className="text-[10px] text-slate-400 font-bold">
                                {new Date(u.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2.5 mt-1">
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleApprove(u.id)}
                                disabled={approvingId === u.id || rejectingId === u.id}
                                className="flex-1 h-10 rounded-[1rem] bg-emerald-500/10 backdrop-blur-md border border-emerald-400/50 text-emerald-600 text-[11.5px] font-black flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_0_0_1px_rgba(16,185,129,0.5)] hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              >
                                {approvingId === u.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                ) : (
                                  <><UserCheck size={14} /> Approuver</>
                                )}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleReject(u.id)}
                                disabled={approvingId === u.id || rejectingId === u.id}
                                className="flex-1 h-10 rounded-[1rem] bg-rose-500/10 backdrop-blur-md border border-rose-400/50 text-rose-500 text-[11.5px] font-black flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3),inset_0_0_0_1px_rgba(244,63,94,0.5)] hover:bg-rose-500/20 transition-all disabled:opacity-50"
                              >
                                {rejectingId === u.id ? (
                                  <div className="w-3.5 h-3.5 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                                ) : (
                                  <><UserX size={14} /> Refuser</>
                                )}
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating badge to re-open panel */}
        {isManager && !showPendingPanel && pendingUsers.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setShowPendingPanel(true)}
            className="fixed bottom-8 right-8 z-50 flex items-center gap-2 bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-2xl shadow-amber-500/40 font-black text-[13px] hover:bg-amber-600 transition-all"
          >
            <Bell size={16} />
            {pendingUsers.length} demande{pendingUsers.length > 1 ? 's' : ''} en attente
          </motion.button>
        )}

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
            <div className="bg-white/20 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-[0_15px_50px_rgba(0,188,212,0.1),inset_0_0_0_1px_rgba(255,255,255,0.4)] flex items-center justify-between group relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00BCD4]/50 to-transparent opacity-80" />
              <div>
                <h1 className="text-[34px] font-black text-slate-800 tracking-tighter mb-2 group-hover:text-[#00BCD4] transition-colors">{t.team.members}</h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] flex items-center gap-3">
                  <span className="w-8 h-[2px] bg-[#00BCD4]"></span> {t.team.teamNode}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex bg-white/10 backdrop-blur-md border border-white/20 p-1.5 rounded-[1.8rem] gap-1 shadow-inner">
                  <button onClick={() => setViewMode('pod')} className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'pod' ? 'bg-white/60 text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.2),inset_0_0_0_1px_rgba(255,255,255,0.5)]' : 'text-slate-400 hover:text-white'}`}><Network size={14} /> Pod</button>
                  <button onClick={() => setViewMode('cards')} className={`flex items-center gap-2 px-6 py-2.5 rounded-[1.2rem] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'cards' ? 'bg-white/60 text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.2),inset_0_0_0_1px_rgba(255,255,255,0.5)]' : 'text-slate-400 hover:text-white'}`}><LayoutGrid size={14} /> Cartes</button>
                </div>

                {/* 
                <button onClick={() => { setIsEdit(false); setFormData(defaultForm); setWizardStep(1); setCvMode('manual'); setCvFile(null); setCvAnalyzed(false); setIsDialogOpen(true); }} className="w-16 h-16 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 flex items-center justify-center text-[#00BCD4] hover:bg-[#00BCD4] hover:text-white hover:border-[#00BCD4] transition-all shadow-[0_8px_30px_rgba(0,188,212,0.2)] active:scale-95">
                  <Plus size={24} strokeWidth={3} />
                </button>
                */}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'pod' ? (
            <motion.div key="pod" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* TOP-DOWN TREE: Manager → Lead → Members rows of 4 */}
              <div className="flex flex-col items-center w-full pt-6 pb-16 px-8">

                {/* 1. MANAGER — gold neon border */}
                <motion.div
                  className="relative bg-white/40 backdrop-blur-xl rounded-[1.4rem] px-5 py-3.5 flex items-center gap-3.5 w-[220px]"
                  style={{ border: '1.5px solid rgba(212,175,55,0.8)' }}
                  animate={{ boxShadow: ['0 0 6px rgba(212,175,55,0.25), inset 0 0 0 1px rgba(255,255,255,0.7)', '0 0 14px rgba(212,175,55,0.55), inset 0 0 0 1px rgba(255,255,255,0.7)', '0 0 6px rgba(212,175,55,0.25), inset 0 0 0 1px rgba(255,255,255,0.7)'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="absolute top-0 right-3 w-[26px] h-[36px] bg-gradient-to-b from-[#e2c176] to-[#d4af37] flex items-center justify-center text-white z-10" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 85%, 50% 100%, 0% 85%)' }}>
                    <Crown size={12} className="text-white" fill="currentColor" />
                  </div>
                  {/* Avatar — same animated ring pattern as lead/members but in gold */}
                  <div className="relative shrink-0 w-[48px] h-[48px]">
                    <motion.img
                      src={manager ? getAvatar(manager) : "/manager.webp"}
                      className="w-[48px] h-[48px] object-contain rounded-full"
                      style={{ border: '2.5px solid #D4AF37' }}
                      animate={{ boxShadow: ['0 0 0 2.5px rgba(212,175,55,0.4), 0 0 6px rgba(212,175,55,0.4)', '0 0 0 3px rgba(212,175,55,0.9), 0 0 18px rgba(212,175,55,1)', '0 0 0 2.5px rgba(212,175,55,0.4), 0 0 6px rgba(212,175,55,0.4)'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-black text-slate-800 truncate">{manager?.full_name || "Manager"}</p>
                    <span className="inline-flex items-center gap-0.5 mt-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border border-amber-200/60">
                      <ShieldCheck size={7} /> Senior Manager
                    </span>
                  </div>
                </motion.div>

                {/* Line: Manager → Lead */}
                <motion.div
                  className="w-[2px] h-8 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,188,212,0.4), rgba(0,188,212,0.8))' }}
                  animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.4)', '0 0 10px rgba(0,188,212,0.9)', '0 0 4px rgba(0,188,212,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.div className="w-2.5 h-2.5 rounded-full bg-[#00BCD4]"
                  animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.6)', '0 0 12px rgba(0,188,212,1)', '0 0 4px rgba(0,188,212,0.6)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* 2. LEAD CARD — glass + neon */}
                {(() => {
                  const lead = leads[0] || { id: "dl", full_name: "Lead", role: "TEAM_LEAD", position: "Lead Developer", gender: "Homme" }
                  return (
                    <motion.div
                      className="relative backdrop-blur-xl rounded-[1.4rem] px-5 py-4 flex items-center gap-3.5 w-[240px] neon-box-cyan"
                      style={{ background: 'rgba(255,255,255,0.35)', border: '1.5px solid rgba(0,188,212,0.5)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)' }}
                      animate={{ boxShadow: ['0 0 10px rgba(0,188,212,0.2), inset 0 0 0 1px rgba(255,255,255,0.6)', '0 0 22px rgba(0,188,212,0.45), inset 0 0 0 1px rgba(255,255,255,0.6)', '0 0 10px rgba(0,188,212,0.2), inset 0 0 0 1px rgba(255,255,255,0.6)'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div className="relative shrink-0 w-[48px] h-[48px]">
                        <motion.img
                          src={getAvatar(lead)}
                          className="w-[48px] h-[48px] object-contain rounded-full"
                          style={{ border: '2.5px solid #00BCD4' }}
                          animate={{ boxShadow: ['0 0 0 2.5px rgba(0,188,212,0.3), 0 0 6px rgba(0,188,212,0.3)', '0 0 0 3px rgba(0,188,212,0.8), 0 0 16px rgba(0,188,212,0.8)', '0 0 0 2.5px rgba(0,188,212,0.3), 0 0 6px rgba(0,188,212,0.3)'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-800 truncate">{lead.full_name}</p>
                        <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider">{lead.role}</p>
                        <span className="inline-flex items-center gap-0.5 mt-1.5 bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full text-[7px] font-black uppercase border border-sky-200/60">
                          <Star size={6} fill="currentColor" /> {lead.position || "Lead"}
                        </span>
                      </div>
                    </motion.div>
                  )
                })()}

                {/* Line: Lead → members */}
                <motion.div
                  className="w-[2px] h-8 rounded-full"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,188,212,0.8), rgba(0,188,212,0.4))' }}
                  animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.4)', '0 0 10px rgba(0,188,212,0.9)', '0 0 4px rgba(0,188,212,0.4)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />
                <motion.div className="w-2.5 h-2.5 rounded-full bg-[#00BCD4]"
                  animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.6)', '0 0 12px rgba(0,188,212,1)', '0 0 4px rgba(0,188,212,0.6)'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                />

                {/* 3. MEMBERS — SINGLE SCROLLING ROW */}
                {(() => {
                  const memberList: any[] = others.length > 0 ? others : [
                    { id: "d1", full_name: "Charlie", role: "TEAM_MEMBER", position: "Backend Dev", gender: "Homme" },
                    { id: "d2", full_name: "Jean Dupont", role: "TEAM_MEMBER", position: "Frontend Dev", gender: "Homme" },
                    { id: "d3", full_name: "Test User", role: "TEAM_MEMBER", position: "QA", gender: "Homme" },
                    { id: "d4", full_name: "Alice", role: "TEAM_MEMBER", position: "Designer", gender: "Femme" },
                    { id: "d5", full_name: "Bob", role: "TEAM_MEMBER", position: "DevOps", gender: "Homme" }
                  ]
                  const remainder = memberList.length % 4;
                  const dummyCount = remainder === 0 ? 0 : 4 - remainder;
                  const paddedMemberList = [
                    ...memberList,
                    ...Array.from({ length: dummyCount }, (_, idx) => ({
                      id: `placeholder-${idx}`,
                      isPlaceholder: true,
                    }))
                  ];
                  const CARD_W = 172 // px — card width
                  const GAP = 14    // px — gap between cards

                  return (
                    <div className="relative w-full max-w-5xl flex flex-col items-center mt-2">
                      <style>{`
                        .hide-scroll::-webkit-scrollbar { display: none; }
                        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
                      `}</style>
                      
                      {/* Horizontal backbone — fixed center */}
                      <motion.div
                        className="h-[2px] rounded-full z-0"
                        style={{ width: '80%', background: 'rgba(0,188,212,0.6)' }}
                        animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.4)', '0 0 10px rgba(0,188,212,0.9)', '0 0 4px rgba(0,188,212,0.4)'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      />

                      {/* Carousel Container */}
                      <div className="relative w-[860px] max-w-full px-12">
                        {/* Navigation Buttons */}
                        {memberList.length > 4 && (
                          <>
                            <button
                              onClick={(e) => { e.preventDefault(); document.getElementById('members-carousel')?.scrollBy({ left: -744, behavior: 'smooth' }) }}
                              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-[#00BCD4]/40 flex items-center justify-center text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.2)] hover:bg-[#00BCD4] hover:text-white active:bg-[#00BCD4] active:text-white active:shadow-[0_0_20px_rgba(0,188,212,0.8),inset_0_0_10px_rgba(255,255,255,0.5)] active:scale-95 transition-all"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); document.getElementById('members-carousel')?.scrollBy({ left: 744, behavior: 'smooth' }) }}
                              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/60 backdrop-blur-md border border-[#00BCD4]/40 flex items-center justify-center text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.2)] hover:bg-[#00BCD4] hover:text-white active:bg-[#00BCD4] active:text-white active:shadow-[0_0_20px_rgba(0,188,212,0.8),inset_0_0_10px_rgba(255,255,255,0.5)] active:scale-95 transition-all"
                            >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                          </>
                        )}

                        {/* Scroll Area */}
                        <div
                          id="members-carousel"
                          className="flex items-start overflow-x-auto snap-x scroll-smooth hide-scroll pt-6 pb-6 relative z-10 w-full max-w-[758px] px-3.5 mx-auto"
                          style={{ gap: GAP }}
                        >
                          {paddedMemberList.map((m: any, i: number) => m.isPlaceholder ? (
                            <div key={m.id} className="w-[172px] shrink-0" />
                          ) : (
                            <div key={m.id || i} className="flex flex-col items-center shrink-0 snap-center relative">
                              {/* Vertical drop line connected to card */}
                              <motion.div
                                className="absolute -top-6 w-[2px] rounded-full"
                                style={{ height: 24, background: 'rgba(0,188,212,0.6)' }}
                                animate={{ boxShadow: ['0 0 3px rgba(0,188,212,0.4)', '0 0 8px rgba(0,188,212,0.9)', '0 0 3px rgba(0,188,212,0.4)'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
                              />
                              <motion.div
                                className="absolute -top-6 w-2.5 h-2.5 rounded-full bg-[#00BCD4]"
                                animate={{ boxShadow: ['0 0 4px rgba(0,188,212,0.6)', '0 0 12px rgba(0,188,212,1)', '0 0 4px rgba(0,188,212,0.6)'] }}
                                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                              />

                              {/* Card */}
                              <motion.div
                                className="relative backdrop-blur-xl rounded-[1.2rem] px-3.5 py-3 flex items-center gap-2.5 cursor-pointer overflow-hidden mt-[1px]"
                                style={{
                                  width: CARD_W,
                                  background: 'rgba(255,255,255,0.35)',
                                  border: '1.5px solid rgba(0,188,212,0.3)',
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.6)',
                                }}
                                whileHover={{ scale: 1.04, y: -3 }}
                                animate={{ boxShadow: ['0 0 6px rgba(0,188,212,0.15), inset 0 0 0 1px rgba(255,255,255,0.6)', '0 0 18px rgba(0,188,212,0.4), inset 0 0 0 1px rgba(255,255,255,0.6)', '0 0 6px rgba(0,188,212,0.15), inset 0 0 0 1px rgba(255,255,255,0.6)'] }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                              >
                                {/* Avatar with neon ring */}
                                <div className="relative shrink-0 w-[38px] h-[38px]">
                                  <motion.img
                                    src={getAvatar(m)}
                                    className="w-[38px] h-[38px] object-contain rounded-full drop-shadow-[0_3px_6px_rgba(0,188,212,0.25)]"
                                    style={{ border: '2px solid #00BCD4' }}
                                    animate={{ boxShadow: ['0 0 0 2px rgba(0,188,212,0.3), 0 0 6px rgba(0,188,212,0.3)', '0 0 0 3px rgba(0,188,212,0.7), 0 0 14px rgba(0,188,212,0.7)', '0 0 0 2px rgba(0,188,212,0.3), 0 0 6px rgba(0,188,212,0.3)'] }}
                                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10.5px] font-black text-slate-800 truncate leading-tight">{m.full_name}</p>
                                  <p className="text-[7px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{m.role}</p>
                                  <span className="inline-flex items-center gap-0.5 mt-1 bg-sky-50/80 text-sky-600 px-1.5 py-0.5 rounded-full text-[6.5px] font-black uppercase border border-sky-200/50 leading-none">
                                    <Star size={5.5} fill="currentColor" /> {m.position || "Member"}
                                  </span>
                                </div>
                              </motion.div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })()}

              </div>

            </motion.div>
          ) : (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-4 gap-10 px-4 pb-20 pt-4">
              {(allExceptManager.length > 0 ? allExceptManager : [
                { id: "dummy-lead", full_name: "Bob", role: "TEAM_LEAD", position: "Lead Developer", gender: "Homme" },
                { id: "dummy-1", full_name: "Charlie", role: "TEAM_MEMBER", position: "Backend Developer", gender: "Homme" },
                { id: "dummy-2", full_name: "Jean Dupont", role: "TEAM_MEMBER", position: "Frontend Developer", gender: "Homme" },
                { id: "dummy-3", full_name: "Test User", role: "TEAM_MEMBER", position: "Quality Assurance", gender: "Homme" }
              ] as Member[]).map((member, i) => {
                const colorClass = 'glow-cyan';
                const dotColor = 'bg-sky-500';

                return (
                  <motion.div
                    key={member.id}
                    whileHover={{ y: -8, scale: 1.02, boxShadow: "0 0 40px rgba(0, 188, 212, 0.2)" }}
                    className={`relative transition-all duration-500 neon-box-cyan light-sweep-container bg-white/20 backdrop-blur-3xl shadow-[0_10px_30px_rgba(0,188,212,0.1),inset_0_0_0_1px_rgba(255,255,255,0.4)]`}
                  >
                    <div className="relative z-10 p-8 rounded-[2rem] w-full h-full border-none overflow-hidden">
                      <div className="flex gap-4 mb-6">
                        <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center relative transition-all">
                        <img src={getAvatar(member)} className="w-[115%] h-[115%] object-contain drop-shadow-[0_4px_10px_rgba(0,188,212,0.2)]" alt="" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800 leading-tight">{member.full_name}</h3>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{member.role}</p>
                        </div>
                      </div>


                      <div className="space-y-5 pt-5 border-t border-white/20">
                        <div className="flex gap-4 justify-center mt-4 w-full">
                          <motion.button 
                            onClick={() => { setSelectedMember(member); setIsViewModalOpen(true); }} 
                            whileHover={{ scale: 1.1, y: -4, backgroundColor: 'rgba(0, 188, 212, 0.15)', borderColor: 'rgba(0, 188, 212, 0.5)', color: '#00BCD4', boxShadow: '0 8px 25px rgba(0,188,212,0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            className="w-11 h-11 rounded-2xl bg-white/20 text-slate-500 border border-white/40 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition-colors duration-300"
                          >
                            <Eye size={18} />
                          </motion.button>
                          
                          <motion.button 
                            onClick={() => {
                              const names = member.full_name.split(" ");
                              setFormData({ ...defaultForm, prenom: names[0] || "", nom: names.slice(1).join(" ") || "", email: member.email || "", role: member.position?.split(" - ")[0] || "Frontend Dev", grade: member.position?.split(" - ")[1] || "Junior", competences: member.skills || [] });
                              setEditId(member.id); setIsEdit(true); setWizardStep(1); setIsDialogOpen(true);
                            }} 
                            whileHover={{ scale: 1.1, y: -4, backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.5)', color: '#10b981', boxShadow: '0 8px 25px rgba(16,185,129,0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            className="w-11 h-11 rounded-2xl bg-white/20 text-slate-500 border border-white/40 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition-colors duration-300"
                          >
                            <Pencil size={18} />
                          </motion.button>
                          
                          <motion.button 
                            onClick={() => { setSelectedMember(member); setIsDeleteModalOpen(true); }} 
                            whileHover={{ scale: 1.1, y: -4, backgroundColor: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.5)', color: '#f43f5e', boxShadow: '0 8px 25px rgba(244,63,94,0.3)' }}
                            whileTap={{ scale: 0.95 }}
                            className="w-11 h-11 rounded-2xl bg-white/20 text-slate-500 border border-white/40 flex items-center justify-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] transition-colors duration-300"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CONFIRM LINK DIALOG (shows after approval) ─────────────────────── */}
        <AnimatePresence>
          {confirmLinkData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
              onClick={() => setConfirmLinkData(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2rem] p-8 max-w-[480px] w-full mx-4 shadow-2xl"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <UserCheck size={18} className="text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-[16px]">Compte approuvé ✅</h3>
                    <p className="text-[11px] text-slate-400 font-bold">{confirmLinkData.name}</p>
                  </div>
                  <button
                    onClick={() => setConfirmLinkData(null)}
                    className="ml-auto w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Email status */}
                <div className={`flex items-start gap-2 p-3 rounded-xl mb-4 text-[12px] font-bold ${confirmLinkData.emailSent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  {confirmLinkData.emailSent
                    ? "Email de confirmation envoyé avec succès."
                    : "L'envoi de l'email a échoué. Copiez et partagez ce lien manuellement :"}
                </div>

                {/* Fallback: show link only when email failed */}
                {!confirmLinkData.emailSent && confirmLinkData.link && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lien d'activation</p>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[11px] text-slate-600 font-mono flex-1 min-w-0 truncate">
                        {confirmLinkData.link}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(confirmLinkData.link)
                          const btn = document.getElementById('copy-link-btn')
                          if (btn) { btn.textContent = '✅'; setTimeout(() => { if (btn) btn.textContent = 'Copier' }, 2000) }
                        }}
                        id="copy-link-btn"
                        className="shrink-0 px-3 py-1.5 bg-[#00BCD4] text-white text-[10px] font-black rounded-lg hover:bg-[#0097a7] transition-all"
                      >
                        Copier
                      </button>
                    </div>
                    <a
                      href={confirmLinkData.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full text-center py-2.5 bg-slate-900 text-white text-[11px] font-black rounded-xl hover:bg-[#00BCD4] transition-all mt-2"
                    >
                      Ouvrir le lien →
                    </a>
                  </div>
                )}
              </motion.div>
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
          <DialogContent className="sm:max-w-[550px] p-0 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-[#00BCD4]/20 shadow-[0_0_40px_rgba(0,188,212,0.15)] overflow-hidden [&>button]:z-50 [&>button]:top-5 [&>button]:right-5 [&>button]:w-9 [&>button]:h-9 [&>button]:bg-rose-50/50 [&>button]:text-rose-400 [&>button]:border [&>button]:border-rose-200/50 [&>button]:shadow-[0_0_15px_rgba(251,113,133,0.2)] [&>button]:hover:bg-rose-100 [&>button]:hover:text-rose-500 [&>button]:hover:border-rose-300 [&>button]:hover:shadow-[0_0_20px_rgba(251,113,133,0.4)] [&>button]:rounded-full [&>button]:transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none" />
            <div className="relative p-10 z-10">
              <DialogHeader className="mb-8">
                <DialogTitle className="text-[26px] font-black text-slate-800 tracking-tight drop-shadow-sm">{isEdit ? (lang === 'fr' ? `Modifier ${formData.prenom} ${formData.nom}` : `Edit ${formData.prenom} ${formData.nom}`) : t.team.addMember}</DialogTitle>
              </DialogHeader>

              {/* Stepper */}
              <div className="flex items-center justify-between relative mb-10 px-2">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-slate-200/50 -translate-y-1/2 z-0" />
                <motion.div
                  className="absolute top-1/2 left-0 h-[2px] bg-[#00BCD4] -translate-y-1/2 z-0 origin-left"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: (wizardStep - 1) / 2 }}
                  transition={{ duration: 0.5 }}
                />
                {[1, 2, 3].map((s) => {
                  const done = wizardStep > s
                  const active = wizardStep === s
                  return (
                    <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                      <motion.div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 backdrop-blur-sm ${done ? "bg-[#00BCD4] border-[#00BCD4] text-white shadow-[0_0_15px_rgba(0,188,212,0.3)]" : active ? "bg-white border-[#00BCD4] text-[#00BCD4] shadow-[0_0_15px_rgba(0,188,212,0.3)]" : "bg-slate-50/50 border-slate-200 text-slate-400"}`}
                        animate={active ? { scale: [1, 1.1, 1] } : {}}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        {done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-black">{s}</span>}
                      </motion.div>
                    </div>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div key="step-1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-4">
                    <h3 className="font-bold text-[#1e293b] text-[15px] mb-4">{lang === "fr" ? "Étape 1 : Infos personnelles" : "Step 1: Personal Info"}</h3>

                    {/* Mode selector */}
                    <div className="flex gap-3 mb-4">
                      <button
                        type="button"
                        onClick={() => { setCvMode('manual'); setCvAnalyzed(false); setCvAnalysisError('') }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[12px] font-black border-2 transition-all duration-300 ${
                          cvMode === 'manual'
                            ? 'bg-[#1e293b] border-[#1e293b] text-white shadow-xl shadow-slate-900/20'
                            : 'bg-white/40 backdrop-blur-md text-slate-500 border-slate-200/50 hover:border-[#00BCD4]/40 hover:bg-white/60'
                        }`}
                      >
                        <ClipboardList size={16} /> {t.team.skipManual}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCvMode('auto'); setCvAnalysisError('') }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-[12px] font-black border-2 transition-all duration-300 ${
                          cvMode === 'auto'
                            ? 'bg-gradient-to-r from-[#00BCD4] to-[#84ffff] border-transparent text-white shadow-[0_8px_25px_rgba(0,188,212,0.4)]'
                            : 'bg-white/40 backdrop-blur-md text-slate-500 border-slate-200/50 hover:border-[#00BCD4]/40 hover:bg-white/60'
                        }`}
                      >
                        <Sparkles size={16} /> {t.team.aiAnalysis}
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                    {/* CV AUTO ANALYSIS PANEL */}
                    {cvMode === 'auto' && (
                      <motion.div key="cv-auto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                        {/* Drop zone */}
                        {/* Drop zone */}
                        {!cvAnalyzed && (
                          <div
                            {...getCVRootProps()}
                            className={`w-full relative overflow-hidden rounded-[24px] cursor-pointer transition-all duration-300 ease-out bg-white/40 backdrop-blur-sm ${
                              isCVDragActive ? 'scale-[1.02] shadow-[0_10px_30px_rgba(0,188,212,0.15)]' : 'hover:scale-[1.01] hover:shadow-[0_8px_25px_rgba(0,0,0,0.04)] shadow-[0_4px_15px_rgba(0,0,0,0.02)]'
                            }`}
                            style={{ minHeight: '190px' }}
                          >
                            {/* Light grid pattern overlay */}
                            <div className="absolute inset-0 opacity-[0.4]" 
                                 style={{ backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                 
                            {/* Soft Ambient glowing blob behind */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-[#00BCD4] rounded-full blur-[80px] opacity-10 pointer-events-none" />

                            {/* Scanner line animation when empty & not active */}
                            {!cvFile && !isCVDragActive && (
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
                                   isCVDragActive ? 'border-[#00BCD4]' 
                                   : cvFile ? 'border-[#00BCD4]/40 border-solid bg-[#00BCD4]/[0.02]' 
                                   : 'border-slate-200'
                                 }`} />
                            </div>

                            <div className="relative z-20 h-full py-8 px-6 flex flex-col items-center justify-center gap-3 text-center">
                              <input {...getCVInputProps()} />

                              {cvFile ? (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center w-full">
                                  <div className="w-16 h-16 mb-2 rounded-[18px] bg-white border border-slate-100 flex items-center justify-center relative shadow-[0_8px_20px_rgba(0,188,212,0.15)] group-hover:shadow-[0_10px_25px_rgba(0,188,212,0.25)] transition-all">
                                    <FileText className="w-8 h-8 text-[#00BCD4]" strokeWidth={1.5} />
                                    <motion.div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-[2.5px] border-white flex items-center justify-center shadow-sm"
                                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                    </motion.div>
                                  </div>
                                  <p className="text-[14px] font-black text-slate-800 truncate max-w-[90%] leading-tight">{cvFile.name}</p>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <span className="text-[10px] text-[#00BCD4] font-black bg-[#00BCD4]/10 px-2 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-md">
                                      PDF
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                                      {(cvFile.size / 1024).toFixed(0)} KB
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setCvFile(null); setCvAnalyzed(false) }}
                                    className="mt-3.5 px-4 py-1.5 rounded-full bg-white hover:bg-slate-50 text-slate-400 hover:text-red-500 text-[11px] font-bold transition-colors border border-slate-200 flex items-center gap-1.5 shadow-[0_2px_5px_rgba(0,0,0,0.02)]"
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
                                      <Upload className={`w-7 h-7 transition-colors duration-300 ${isCVDragActive ? 'text-[#00BCD4] scale-110' : 'text-[#00BCD4]/60'}`} strokeWidth={2} />
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
                                    <h3 className={`text-[15px] font-[900] tracking-wider uppercase mb-1 transition-colors ${isCVDragActive ? 'text-[#00BCD4]' : 'text-slate-800'}`}>
                                      {isCVDragActive ? 'Lâchez le fichier...' : 'Glissez votre CV ici'}
                                    </h3>
                                    <p className="text-[12px] text-slate-500 font-bold mt-0.5">
                                      Format PDF (Max 5 Mo)
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Analyze btn */}
                        {cvFile && !cvAnalyzed && (
                          <div className="flex gap-2">
                            <motion.button
                              whileHover={!cvAnalyzing ? { scale: 1.015 } : {}}
                              whileTap={!cvAnalyzing ? { scale: 0.98 } : {}}
                              onClick={analyzeCV}
                              disabled={cvAnalyzing}
                              className={`flex-1 relative rounded-[20px] h-[54px] overflow-hidden group transition-all duration-300 ${
                                !cvAnalyzing 
                                  ? 'bg-gradient-to-br from-[#00BCD4] to-[#0096a8] shadow-[0_8px_25px_rgba(0,188,212,0.3)] cursor-pointer' 
                                  : 'bg-[#00BCD4]/80 cursor-wait'
                              }`}
                            >
                              {!cvAnalyzing && (
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
                                {cvAnalyzing ? (
                                  <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    <span className="text-[14px] font-[900] text-white tracking-widest uppercase">Analyse en cours...</span>
                                  </>
                                ) : (
                                  <>
                                    <Cpu className="w-5 h-5 text-white" strokeWidth={2.5} />
                                    <span className="text-[14px] font-[900] text-white tracking-widest uppercase">Lancer l'Analyse</span>
                                  </>
                                )}
                              </div>
                            </motion.button>
                            {/* Mini Features column */}
                            <div className="w-[100px] flex flex-col gap-2">
                              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-[14px] px-2 h-full justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                <span className="text-[16px]">⚡</span>
                                <span className="text-[9px] font-[800] text-[#00BCD4] uppercase">Express</span>
                              </div>
                              <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-[14px] px-2 h-full justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                <span className="text-[16px]">🎯</span>
                                <span className="text-[9px] font-[800] text-[#ff0000] uppercase">Précis</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {cvAnalysisError && (
                          <p className="text-[12px] text-[#ff0000] font-black text-center">{cvAnalysisError}</p>
                        )}

                        {/* Success preview */}
                        {cvAnalyzed && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[24px] bg-gradient-to-br from-emerald-50 to-[#00BCD4]/10 border border-emerald-200/50 p-5 shadow-[0_8px_30px_rgba(0,188,212,0.05)] space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-white" />
                              </div>
                              <p className="font-black text-[#1e293b] text-[15px]">Profil I.A. chargé avec succès !</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(formData.prenom || formData.nom) && <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-100/50"><p className="text-[9px] text-[#00BCD4] font-black uppercase mb-0.5">Identité</p><p className="text-[13px] font-black text-slate-800">{formData.prenom} {formData.nom}</p></div>}
                              {formData.email && <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-100/50"><p className="text-[9px] text-[#00BCD4] font-black uppercase mb-0.5">Email</p><p className="text-[13px] font-bold text-slate-800 truncate">{formData.email}</p></div>}
                              {formData.role && <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-100/50"><p className="text-[9px] text-[#00BCD4] font-black uppercase mb-0.5">Rôle Global</p><p className="text-[13px] font-black text-slate-800">{formData.role}</p></div>}
                              {formData.grade && <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-100/50"><p className="text-[9px] text-[#00BCD4] font-black uppercase mb-0.5">Séniorité</p><p className="text-[13px] font-black text-slate-800">{formData.grade}</p></div>}
                            </div>
                            {formData.competences.length > 0 && (
                              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 shadow-sm border border-slate-100/50">
                                <p className="text-[9px] text-slate-400 font-black uppercase mb-2">{formData.competences.length} compétences techniques</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.competences.slice(0, 10).map(c => (
                                    <span key={c} className="px-2.5 py-1 bg-[#00BCD4]/10 text-[#00BCD4] rounded-full text-[10px] font-bold border border-[#00BCD4]/20 shadow-sm">{c}</span>
                                  ))}
                                  {formData.competences.length > 10 && <span className="text-[10px] text-slate-400 font-bold px-2 py-1">+{formData.competences.length - 10}</span>}
                                </div>
                              </div>
                            )}
                            <div className="flex gap-2 pt-2">
                              <button type="button" onClick={() => { setCvAnalyzed(false); setCvFile(null) }} className="flex-1 h-12 rounded-[16px] bg-white border-[1.5px] border-slate-200 text-[13px] font-black text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                                Ré-analyser
                              </button>
                              <button type="button" onClick={() => setWizardStep(2)} className="flex-1 h-12 rounded-[16px] bg-gradient-to-br from-[#00BCD4] to-[#0096a8] text-white text-[13px] font-black shadow-[0_4px_15px_rgba(0,188,212,0.25)] hover:shadow-[0_6px_20px_rgba(0,188,212,0.3)] transition-all">
                                Continuer →
                              </button>
                            </div>
                          </motion.div>
                        )}
                        {!cvAnalyzed && !cvFile && (
                          <div className="flex justify-center pt-2">
                            <button onClick={() => setCvMode('manual')} type="button" className="text-[12px] font-bold text-slate-400 hover:text-[#00BCD4] transition-colors underline-offset-4 hover:underline">
                              Ignorer et remplir à la main
                            </button>
                          </div>
                        )}

                      </motion.div>
                    )}

                    {/* MANUAL FORM */}
                    {cvMode === 'manual' && (
                      <motion.div key="manual" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">

                        <div className="grid grid-cols-2 gap-2 px-0.5 mt-1">
                          {(["Homme", "Femme"] as const).map((g) => {
                            const isSelected = formData.gender === g
                            const imgSrc = g === 'Homme' ? '/boy-removebg-preview.png' : '/girl-removebg-preview.png'
                            return (
                              <motion.button
                                key={g}
                                type="button"
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setFormData({ ...formData, gender: g })}
                                className={`relative flex items-center gap-1.5 py-1 px-2.5 rounded-[10px] border-[1.5px] transition-all duration-250 ${
                                  isSelected
                                    ? 'border-[#00BCD4] bg-[#00BCD4]/8 shadow-[0_0_0_2px_rgba(0,188,212,0.12)]'
                                    : 'border-slate-200 bg-white/60 hover:border-[#00BCD4]/40'
                                }`}
                              >
                                {isSelected && (
                                  <motion.div
                                    className="absolute inset-0 bg-gradient-to-r from-[#00BCD4]/8 to-transparent"
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  />
                                )}
                                <img src={imgSrc} alt={g}
                                  className={`w-5 h-5 object-contain z-10 transition-all duration-300 ${isSelected ? 'drop-shadow-[0_1px_2px_rgba(0,188,212,0.4)]' : 'opacity-60'}`}
                                />
                                <span className={`text-[11px] font-black z-10 ${isSelected ? 'text-[#00BCD4]' : 'text-slate-500'}`}>{g}</span>
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

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Prénom</label>
                            <Input placeholder="Jean" className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700" value={formData.prenom} onChange={e => setFormData({ ...formData, prenom: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Nom</label>
                            <Input placeholder="Dupont" className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700" value={formData.nom} onChange={e => setFormData({ ...formData, nom: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Email Professionnel</label>
                            <Input placeholder="jean@pfe.com" type="email" className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Téléphone</label>
                            <Input placeholder="+33 6..." className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700" value={formData.telephone} onChange={e => setFormData({ ...formData, telephone: e.target.value })} />
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Rôle</label>
                            <select className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-200 px-4 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] appearance-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                              <option>Frontend Dev</option><option>Backend Dev</option><option>Fullstack</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Grade</label>
                            <select className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-200 px-4 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] appearance-none" value={formData.grade} onChange={e => setFormData({ ...formData, grade: e.target.value })}>
                              <option>Junior</option><option>Mid</option><option>Senior</option><option>Lead</option>
                            </select>
                          </div>
                        </div>
                        <div className="pt-2">
                          <Button onClick={() => setWizardStep(2)} className="w-full h-14 bg-[#00BCD4] hover:bg-[#0097a7] font-black text-lg rounded-2xl text-white shadow-xl shadow-[#00BCD4]/20 transition-all active:scale-95">{lang === 'fr' ? 'Suivant' : 'Next'}</Button>
                        </div>
                      </motion.div>
                    )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div key="step-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
                    <h3 className="font-bold text-[#1e293b] text-[15px] mb-4">Étape 2 : Compétences</h3>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest pl-1 mb-2 block">{lang === 'fr' ? 'Ajouter une compétence' : 'Add a skill'}</label>
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
                      <Button onClick={() => setWizardStep(1)} variant="outline" className="flex-1 h-14 bg-slate-50/50 border border-slate-200 font-black text-base rounded-2xl text-slate-500 hover:bg-slate-100/80 transition-all">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                      <Button onClick={() => setWizardStep(3)} className="w-[65%] h-14 bg-[#00BCD4] hover:bg-[#0097a7] font-black text-lg rounded-2xl text-white shadow-xl shadow-[#00BCD4]/20 transition-all active:scale-95">{lang === 'fr' ? 'Suivant' : 'Next'}</Button>
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
                      <Button onClick={() => setWizardStep(2)} variant="outline" className="flex-1 h-14 bg-slate-50/50 border border-slate-200 font-black text-base rounded-2xl text-slate-500 hover:bg-slate-100/80 transition-all">{lang === 'fr' ? 'Retour' : 'Back'}</Button>
                      <Button onClick={isEdit ? handleUpdateMember : handleAddMember} className="w-[65%] h-14 bg-gradient-to-r from-[#00BCD4] to-[#0096a8] hover:shadow-[0_8px_25px_rgba(0,188,212,0.3)] font-black text-lg flex items-center justify-center gap-2 rounded-2xl text-white transition-all active:scale-95">
                        <CheckCircle2 className="w-5 h-5" strokeWidth={3} />
                        {isEdit ? (lang === 'fr' ? 'Modifier' : 'Edit') : (lang === 'fr' ? "Ajouter à l'équipe" : 'Add to team')}
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
          <DialogContent className="sm:max-w-[380px] p-0 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-[#00BCD4]/20 shadow-[0_0_40px_rgba(0,188,212,0.15)] overflow-hidden [&>button]:z-50 [&>button]:top-5 [&>button]:right-5 [&>button]:w-9 [&>button]:h-9 [&>button]:bg-rose-50/50 [&>button]:text-rose-400 [&>button]:border [&>button]:border-rose-200/50 [&>button]:shadow-[0_0_15px_rgba(251,113,133,0.2)] [&>button]:hover:bg-rose-100 [&>button]:hover:text-rose-500 [&>button]:hover:border-rose-300 [&>button]:hover:shadow-[0_0_20px_rgba(251,113,133,0.4)] [&>button]:rounded-full [&>button]:transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none" />
            <div className="pt-10 pb-6 px-7 flex flex-col items-center relative z-10">
              <div className="w-24 h-24 rounded-3xl border-4 border-sky-100 flex items-center justify-center overflow-hidden mb-4 shadow-xl">
                <img
                  src={getAvatar(selectedMember || { full_name: '' })}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-1.5">{selectedMember?.full_name}</h2>
              <div className="flex gap-2 mb-6">
                <span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">{selectedMember?.role?.replace("_", " ") || "Member"}</span>
                <span className="bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">{selectedMember?.grade || "Junior"}</span>
              </div>

              <div className="w-full space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Contact</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500"><ShieldCheck size={16} /></div>
                      {selectedMember?.email || "Non renseigné"}
                    </div>
                    <div className="flex items-center gap-3 text-slate-600 font-bold text-sm">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500"><Activity size={16} /></div>
                      {selectedMember?.phone_number || "Non renseigné"}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Compétences Techniques</h4>
                  <div className="flex flex-wrap gap-2">
                    {(selectedMember?.skills || []).slice(0, 5).map(s => (
                      <span key={s} className="px-4 py-1.5 rounded-full border border-slate-100 text-slate-500 text-[11px] font-bold">{s}</span>
                    ))}
                    {(!selectedMember?.skills || selectedMember.skills.length === 0) && (
                      <span className="text-[11px] text-slate-400 font-medium italic">Aucune compétence</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Expérience</p>
                    <p className="text-[13px] font-black text-slate-800">{selectedMember?.experience || "0"} années</p>
                  </div>
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">{lang === 'fr' ? 'Projets' : 'Projects'}</p>
                    <p className="text-[13px] font-black text-slate-800">{selectedMember?.project_count || 0} actif(s)</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Charge de Travail</h4>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      (selectedMember?.workload || 0) > 80 ? 'bg-rose-500' :
                      (selectedMember?.workload || 0) > 50 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`} style={{ width: `${selectedMember?.workload || 0}%` }} />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (selectedMember?.cv_url) window.open(selectedMember.cv_url, '_blank')
                      else {
                        setIsViewModalOpen(false);
                        setIsCvUploadModalOpen(true);
                      }
                    }}
                    className={`flex-1 h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] border transition-colors ${selectedMember?.cv_url ? 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100' : 'bg-[#00BCD4]/10 text-[#00BCD4] border-[#00BCD4]/20 hover:bg-[#00BCD4]/20'}`}
                  >
                    <Shield size={14} /> {selectedMember?.cv_url ? 'CV' : 'Joindre CV'}
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedMember?.linkedin_url) window.open(selectedMember.linkedin_url.startsWith('http') ? selectedMember.linkedin_url : `https://${selectedMember.linkedin_url}`, '_blank')
                      else alert("Aucun profil LinkedIn n'a été enregistré pour ce membre.")
                    }}
                    className={`flex-1 h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] border transition-colors ${selectedMember?.linkedin_url ? 'bg-[#0077b5]/10 text-[#0077b5] border-[#0077b5]/20 hover:bg-[#0077b5]/20' : 'bg-slate-50/50 text-slate-300 border-slate-50 cursor-not-allowed'}`}
                  >
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
        <Dialog open={isDeleteModalOpen} onOpenChange={(v) => { setIsDeleteModalOpen(v); if (!v) setDeleteError("") }}>
          <DialogContent className="sm:max-w-[400px] p-8 text-center bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none rounded-[2.5rem]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="relative z-10 flex flex-col items-center">
              <Trash2 size={56} className="text-rose-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse relative z-10" />
              <h2 className="text-2xl font-black mb-2 text-slate-800 drop-shadow-sm relative z-10">Retrait du membre</h2>
              <p className="text-sm text-slate-500 font-bold mb-6 italic px-2 relative z-10">
                Êtes-vous sûr de vouloir retirer <span className="text-slate-800">"{selectedMember?.full_name}"</span> de l'équipe du projet ?
              </p>

              <div className="w-full bg-white/40 backdrop-blur-sm p-4 rounded-3xl mb-6 flex items-center gap-4 border border-[#00BCD4]/20 shadow-[0_4px_15px_rgba(0,188,212,0.1)] relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00BCD4] to-[#00897b] flex items-center justify-center text-white font-black text-lg shadow-[0_4px_10px_rgba(0,188,212,0.3)] shrink-0">
                  {selectedMember?.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "M"}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-black text-slate-800 text-sm leading-tight truncate">{selectedMember?.full_name}</h3>
                  <p className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest mt-0.5 truncate">{selectedMember?.role}</p>
                </div>
              </div>

              <div className="bg-rose-50/50 backdrop-blur-sm p-4 rounded-2xl border border-rose-500/20 mb-6 shadow-sm w-full relative z-10">
                <p className="text-[11px] font-bold text-center leading-relaxed text-slate-600">
                  <span className="text-rose-500 font-black animate-pulse">Attention :</span> L'historique de ses tâches sera conservé, mais ses accès au projet seront révoqués.
                </p>
              </div>

              {/* Error message */}
              {deleteError && (
                <div className="w-full mb-6 flex items-center gap-2 px-4 py-3 bg-rose-50/80 border border-rose-200/50 rounded-2xl backdrop-blur-sm relative z-10">
                  <AlertCircle size={14} className="text-rose-500 shrink-0" />
                  <p className="text-[11px] font-bold text-rose-600 text-left">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-4 w-full relative z-10">
                <Button
                  onClick={() => setIsDeleteModalOpen(false)}
                  variant="outline"
                  className="flex-1 rounded-2xl h-12 font-black bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all uppercase tracking-wider text-[12px]"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => selectedMember && handleDeleteMember(selectedMember.id)}
                  className="flex-1 h-12 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:border-rose-500 text-rose-600 hover:text-white rounded-2xl font-black shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all uppercase tracking-wider text-[12px] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Retirer
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>

        {/* UPLOAD MISSING CV MODAL */}
        <Dialog open={isCvUploadModalOpen} onOpenChange={(v) => { setIsCvUploadModalOpen(v); if (!v) { setMissingCvFile(null); setSelectedMember(null); } }}>
          <DialogContent className="sm:max-w-[420px] p-8 bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-[#00BCD4]/20 shadow-[0_0_50px_rgba(0,188,212,0.15)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none" />
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-[#00BCD4] to-[#0096a8] flex items-center justify-center text-white shadow-[0_8px_25px_rgba(0,188,212,0.4)] mb-5">
                <FileText size={28} />
              </div>
              <h2 className="text-[20px] font-black text-slate-800 tracking-tight text-center mb-2">Ajouter un CV</h2>
              <p className="text-[12px] font-bold text-slate-500 text-center mb-6 max-w-[280px]">
                Importez le CV de <span className="text-[#00BCD4] font-black">{selectedMember?.full_name}</span> pour compléter son profil.
              </p>

              <div
                {...getMissingCvRootProps()}
                className={`w-full relative overflow-hidden rounded-[20px] cursor-pointer transition-all duration-300 ease-out bg-slate-50/50 backdrop-blur-sm border-2 border-dashed flex flex-col items-center justify-center p-6 ${
                  isMissingCvDragActive ? 'border-[#00BCD4] bg-[#00BCD4]/5 scale-[1.02]' : 'border-slate-200 hover:border-[#00BCD4]/50'
                }`}
                style={{ minHeight: '140px' }}
              >
                <input {...getMissingCvInputProps()} />
                {missingCvFile ? (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm mb-3">
                      <FileText className="w-6 h-6 text-[#00BCD4]" />
                    </div>
                    <p className="text-[13px] font-black text-slate-800 truncate max-w-full px-4">{missingCvFile.name}</p>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">{(missingCvFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    <Upload className={`w-8 h-8 mb-3 transition-colors ${isMissingCvDragActive ? 'text-[#00BCD4]' : 'text-slate-300'}`} />
                    <p className="text-[13px] font-black text-slate-600 mb-1">Glissez le PDF ici</p>
                    <p className="text-[10px] font-bold text-slate-400">ou cliquez pour parcourir</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 w-full mt-6">
                <Button onClick={() => setIsCvUploadModalOpen(false)} variant="outline" className="flex-1 rounded-2xl h-12 font-black bg-white border-slate-200 text-slate-500 hover:bg-slate-50 text-[12px] uppercase tracking-wider">
                  Annuler
                </Button>
                <Button 
                  onClick={handleUploadMissingCv} 
                  disabled={!missingCvFile || uploadingMissingCv}
                  className="flex-1 h-12 bg-gradient-to-r from-[#00BCD4] to-[#0096a8] hover:shadow-[0_8px_20px_rgba(0,188,212,0.3)] text-white rounded-2xl font-black text-[12px] uppercase tracking-wider disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {uploadingMissingCv ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi...</>
                  ) : (
                    <><CheckCircle2 size={16} /> Enregistrer</>
                  )}
                </Button>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}

function MemberPodCard({ member, size = "normal", haste, color = "cyan" }: any) {
  const isSmall = size === "small";
  const glowClass = `glow-${color}`;
  const dotColor = color === 'yellow' ? 'bg-amber-500' : color === 'red' ? 'bg-rose-500' : color === 'green' ? 'bg-emerald-500' : 'bg-sky-500';

  const getAvatarPod = (m: any) => {
    if (m.avatar_url && m.avatar_url !== '') return m.avatar_url
    const name = m.full_name || ''
    if (!name) return "/boy-removebg-preview.png"
    if (name.toLowerCase().includes('alice') || name.toLowerCase().includes('senior manager') || name.toLowerCase().includes('manager principal')) return "/manager.webp"
    if (m.gender === 'Femme') return "/girl-removebg-preview.png"
    if (m.gender === 'Homme') return "/boy-removebg-preview.png"
    const isFemale = name.toLowerCase().includes('charlie') || name.toLowerCase().endsWith('a') || name.toLowerCase().endsWith('e')
    return isFemale ? "/girl-removebg-preview.png" : "/boy-removebg-preview.png"
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4, boxShadow: "0 0 30px rgba(0, 188, 212, 0.2)" }}
      className={`relative transition-all duration-500 group/pod neon-box-cyan light-sweep-container ${isSmall ? 'w-[170px]' : 'w-[200px]'} bg-white/20 backdrop-blur-3xl shadow-[0_8px_20px_rgba(0,188,212,0.1),inset_0_0_0_1px_rgba(255,255,255,0.4)]`}
    >
      <div className={`relative z-10 flex items-center gap-3 ${isSmall ? 'p-2.5' : 'p-3.5'} rounded-[1.5rem] border-none overflow-hidden`}>

        <div className={`${isSmall ? 'w-[40px] h-[40px]' : 'w-[50px] h-[50px]'} rounded-full flex items-center justify-center relative transition-all shrink-0`}>
          <img src={getAvatarPod(member)} className="w-[115%] h-[115%] object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_4px_10px_rgba(0,188,212,0.2)]" alt="" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-black text-slate-800 truncate mb-0.5 ${isSmall ? 'text-[12px]' : 'text-[13px]'}`}>{member.full_name}</h4>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">{member.role}</p>
          <div className="flex gap-2 mt-2.5">
            <div className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase flex items-center gap-1.5 border bg-white/40 backdrop-blur-md text-sky-600 border-sky-300/40 shadow-sm`}>
              <Star size={8} fill="currentColor" /> {member.position || "Developer"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}


