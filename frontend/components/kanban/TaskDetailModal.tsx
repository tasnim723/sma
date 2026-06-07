"use client"
import { API_BASE_URL } from "@/lib/api"

import React, { useState, useEffect, ChangeEvent, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Calendar, Paperclip, Clock, Trash2, X, Plus, FileText,
  Upload, UserPlus, Github, Link2, CheckCircle2, XCircle,
  Loader2, Sparkles, FileCode, FileArchive, FileImage, AlertTriangle,
  Rocket, Send, RotateCcw, ArrowRight, Zap, Shield, Target,
  FileVideo, FolderArchive, File, Download, ExternalLink
} from "lucide-react"
import { Task } from "./KanbanBoard"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { useLang } from "@/lib/useLang"
import { motion, AnimatePresence } from "framer-motion"

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  teamMembers: any[]
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

const ALLOWED_LINK_PATTERNS = [
  { pattern: /github\.com/i, label: 'GitHub', icon: '🐙', color: 'text-slate-800' },
  { pattern: /canva\.com/i, label: 'Canva', icon: '🎨', color: 'text-purple-600' },
  { pattern: /figma\.com/i, label: 'Figma', icon: '🎨', color: 'text-purple-600' },
  { pattern: /drive\.google/i, label: 'Google Drive', icon: '📁', color: 'text-blue-600' },
]

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) return <FolderArchive size={16} className="text-amber-500" />
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')) return <FileImage size={16} className="text-pink-500" />
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return <FileVideo size={16} className="text-violet-500" />
  if (['py', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'java', 'c', 'cpp', 'php', 'go', 'rs'].includes(ext || ''))
    return <FileCode size={16} className="text-cyan-500" />
  if (['pdf'].includes(ext || '')) return <FileText size={16} className="text-red-500" />
  return <File size={16} className="text-[#00BCD4]" />
}

function getLinkMeta(url: string) {
  for (const p of ALLOWED_LINK_PATTERNS) {
    if (p.pattern.test(url)) return p
  }
  return null
}

export default function TaskDetailModal({ task, isOpen, teamMembers, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const { lang } = useLang()
  const [editedTask, setEditedTask] = useState<Partial<Task>>({})
  const [newLink, setNewLink] = useState("")
  const [linkError, setLinkError] = useState("")
  const [isAiReviewing, setIsAiReviewing] = useState(false)
  const [aiResult, setAiResult] = useState<{ decision: string; feedback: string; score: number } | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === "PROJECT_MANAGER"
  const isAssigned = task?.assignee_ids?.includes(user?.id as string) || false
  const canSubmit = isAssigned || isManager

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task })
      setAiResult(null)
      setUploadedFiles([])
      setNewLink("")
      setLinkError("")
      setShowReport(false)
    }
  }, [task])

  if (!task) return null

  const handleSave = async () => {
    setIsSaving(true)
    onUpdate(task._id, editedTask)
    onClose()
    setIsSaving(false)
  }

  // --- File drop zone ---
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setUploadedFiles(prev => [...prev, ...files])
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])
    }
  }

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx))
  }

  // --- Link handling ---
  const handleAddLink = () => {
    const url = newLink.trim()
    if (!url) return
    setLinkError("")
    const current = editedTask.attachments || []
    if (!current.includes(url)) {
      const updated = [...current, url]
      setEditedTask({ ...editedTask, attachments: updated })
      onUpdate(task._id, { attachments: updated })
    }
    setNewLink("")
  }

  const removeAttachment = (idx: number) => {
    const updated = (editedTask.attachments || []).filter((_, i) => i !== idx)
    setEditedTask({ ...editedTask, attachments: updated })
  }

  // --- Start task (TODO → IN_PROGRESS) ---
  const handleStartTask = () => {
    onUpdate(task._id, { status: "IN_PROGRESS" })
    onClose()
  }

  // --- Pass to review (IN_PROGRESS → REVIEW) ---
  const handlePassToReview = async () => {
    setIsSaving(true)
    try {
      let currentAttachments = [...(editedTask.attachments || [])]

      if (uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          const fd = new FormData()
          fd.append("task_id", task._id)
          fd.append("project_id", task.project_id || "")
          fd.append("file", f)
          
          await axios.post(`${API_BASE_URL}/api/upload/`, fd, {
            headers: { Authorization: `Bearer ${token || ""}`, "Content-Type": "multipart/form-data" }
          })
          currentAttachments.push(f.name)
        }
      }

      const updated = { status: "REVIEW", attachments: currentAttachments }
      onUpdate(task._id, updated)
      setEditedTask({ ...editedTask, ...updated })
      setUploadedFiles([])
    } catch (error) {
      console.error("Error passing to review", error)
    } finally {
      setIsSaving(false)
    }
  }

  // --- Smart AI Review ---
  const handleSmartAIReview = async () => {
    if (uploadedFiles.length === 0 && (editedTask.attachments || []).length === 0) {
      return
    }

    setIsAiReviewing(true)
    setAiResult(null)

    try {
      const formData = new FormData()
      uploadedFiles.forEach(f => formData.append("files", f))
      const links = (editedTask.attachments || []).join(",")
      formData.append("links", links)

      const res = await axios.post(
        `${API_BASE_URL}/api/tasks/${task._id}/ai-review-smart`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token || ""}`,
            "Content-Type": "multipart/form-data"
          }
        }
      )

      const { decision, feedback, score, task: updatedTask } = res.data
      setAiResult({ decision, feedback, score })
      if (updatedTask) {
        setEditedTask({ ...updatedTask })
        onUpdate(task._id, updatedTask)
      }

      if (uploadedFiles.length > 0) {
        const newNames = uploadedFiles.map(f => f.name)
        const allAttachments = [...new Set([...(editedTask.attachments || []), ...newNames])]
        setEditedTask(prev => ({ ...prev, attachments: allAttachments }))
      }
      setUploadedFiles([])
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "La revue IA a échoué."
      setAiResult({ decision: "ERROR", feedback: msg, score: 0 })
    } finally {
      setIsAiReviewing(false)
    }
  }

  const hasDeliverables = uploadedFiles.length > 0 || (editedTask.attachments || []).length > 0
  const currentStatus = editedTask.status || task.status

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 rounded-[2rem] bg-white/95 backdrop-blur-xl border border-[#00BCD4]/20 shadow-[0_0_60px_rgba(0,188,212,0.12)] max-h-[90vh] flex flex-col [&>button]:z-50 [&>button]:top-4 [&>button]:right-4 [&>button]:w-8 [&>button]:h-8 [&>button]:bg-rose-50/50 [&>button]:text-rose-400 [&>button]:border [&>button]:border-rose-200/50 [&>button]:hover:bg-rose-100 [&>button]:hover:text-rose-500 [&>button]:rounded-full [&>button]:transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none rounded-[2rem]" />
        
        {/* Top cyan bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00BCD4] to-[#84ffff] shadow-[0_0_15px_rgba(0,188,212,0.5)] rounded-t-[2rem] shrink-0" />

        {/* Scrollable content */}
        <div className="relative z-10 flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#00BCD4 transparent' }}>
          <div className="p-6 space-y-5">

            {/* Header */}
            <div>
              <DialogHeader>
                <div className="flex justify-between items-start pr-8">
                  <DialogTitle className="text-xl font-black text-slate-800 leading-tight">
                    {task.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-[#00BCD4] text-[10px] font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                  <Clock size={13} /> État de maturation :
                  <span className={`font-black px-2.5 py-0.5 rounded-full border text-[10px] ${
                    currentStatus === 'TODO' ? 'bg-sky-50 text-sky-600 border-sky-200' :
                    currentStatus === 'IN_PROGRESS' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                    currentStatus === 'REVIEW' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                    currentStatus === 'DONE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    'bg-[#00BCD4]/10 text-[#00BCD4] border-[#00BCD4]/20'
                  }`}>
                    {currentStatus}
                  </span>
                </DialogDescription>
              </DialogHeader>
             {/* ─── AI FEEDBACK PANEL ─── */}
            <AnimatePresence>
              {(editedTask.review_feedback || aiResult) && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className={`rounded-[1.5rem] border p-4 space-y-3 relative overflow-hidden ${
                    (aiResult?.decision === 'VALID' || (!aiResult && editedTask.status === 'DONE'))
                      ? 'bg-emerald-50/90 border-emerald-200/60 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
                      : (aiResult?.decision === 'ERROR' || aiResult?.decision === 'INVALID' || (!aiResult && editedTask.review_feedback && editedTask.status !== 'DONE'))
                      ? 'bg-rose-50/90 border-rose-200/60 shadow-[0_4px_20px_rgba(244,63,94,0.06)]'
                      : 'bg-amber-50/90 border-amber-200/60 shadow-[0_4px_20px_rgba(245,158,11,0.06)]'
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                        (aiResult?.decision === 'VALID' || (!aiResult && editedTask.status === 'DONE'))
                          ? 'bg-emerald-500 shadow-emerald-500/20' 
                          : (aiResult?.decision === 'ERROR' || aiResult?.decision === 'INVALID' || (!aiResult && editedTask.review_feedback && editedTask.status !== 'DONE'))
                          ? 'bg-rose-500 shadow-rose-500/20' 
                          : 'bg-amber-500 shadow-amber-500/20'
                      }`}>
                        <Sparkles size={13} />
                      </div>
                      <span className="font-black text-xs uppercase tracking-widest text-slate-700">Agent de Revue IA</span>
                    </div>
                    {((aiResult?.score !== undefined) || (editedTask.review_score !== undefined)) && (
                      <span className={`px-3 py-1 rounded-xl text-[11px] font-black border shadow-sm transition-colors ${
                        (aiResult?.score ?? editedTask.review_score ?? 0) >= 70 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : 'bg-rose-100 text-rose-700 border-rose-200'
                      }`}>
                        {aiResult?.score ?? editedTask.review_score}/100
                      </span>
                    )}
                  </div>

                  {/* Decision banner (live AI) */}
                  {aiResult && aiResult.decision !== 'ERROR' && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-black relative z-10 ${
                      aiResult.decision === 'VALID'
                        ? 'bg-emerald-100/80 text-emerald-700'
                        : 'bg-rose-100/80 text-rose-700'
                    }`}>
                      {aiResult.decision === 'VALID'
                        ? <><CheckCircle2 size={14} /> Livrable VALIDÉ ✅</>
                        : <><XCircle size={14} /> Livrable REFUSÉ ❌</>
                      }
                    </div>
                  )}
                  {/* Decision banner from DB */}
                  {!aiResult && editedTask.review_feedback && (
                    <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-black relative z-10 ${
                      editedTask.status === 'DONE'
                        ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50'
                        : editedTask.status === 'REVIEW'
                        ? 'bg-amber-100/80 text-amber-700 border border-amber-200/50'
                        : 'bg-rose-100/80 text-rose-700 border border-rose-200/50'
                    }`}>
                      {editedTask.status === 'DONE' ? (
                        <><CheckCircle2 size={14} /> Livrable VALIDÉ ✅</>
                      ) : editedTask.status === 'REVIEW' ? (
                        <><Clock size={14} /> Validé par l'IA — En attente du manager ⏳</>
                      ) : (
                        <><XCircle size={14} /> Livrable REFUSÉ ❌</>
                      )}
                    </div>
                  )}

                  {/* Feedback text — hidden behind Rapport button */}
                  {(() => {
                    const fb = aiResult?.feedback || editedTask.review_feedback || ''
                    if (!fb) return null;
                    if (editedTask.status === 'DONE' && (fb === 'Could not parse feedback.' || fb.startsWith("Le feedback est fourni") || fb.startsWith("Livrable refusé —"))) {
                      return null; // No need to show rapport if validated with a fallback message
                    }

                    const isFallback = fb === 'Could not parse feedback.' || fb.startsWith("Le feedback est fourni") || fb.startsWith("Livrable refusé —")
                    
                    const reportText = isFallback 
                      ? (isManager 
                          ? "Le livrable a été analysé et refusé par l'agent IA car les éléments soumis ne correspondent pas aux spécifications du projet. Le membre doit corriger les erreurs et soumettre à nouveau."
                          : "L'agent IA a analysé votre livrable et déterminé qu'il ne correspond pas aux attentes de la tâche. Veuillez corriger vos erreurs et soumettre à nouveau.")
                      : fb;

                    return (
                      <div className="mt-2 space-y-2 relative z-10">
                        <button
                          onClick={() => setShowReport(!showReport)}
                          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 hover:text-[#00BCD4] transition-all duration-300 shadow-sm active:scale-95"
                        >
                          <FileText size={13} className={showReport ? "text-[#00BCD4]" : "text-slate-400"} />
                          {showReport ? "Masquer le rapport" : "Voir le rapport d'analyse"}
                        </button>
                        
                        <AnimatePresence>
                          {showReport && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="bg-gradient-to-br from-white to-slate-50/50 rounded-xl p-4 border border-[#00BCD4]/15 shadow-inner mt-2 space-y-3">
                                <h4 className="text-[10px] uppercase font-black tracking-widest text-[#00BCD4] flex items-center gap-2">
                                  <Target size={12} className="animate-pulse" />
                                  Détails de l'analyse IA
                                </h4>
                                <div className="text-xs text-slate-600 leading-relaxed font-medium whitespace-pre-wrap pr-1">
                                  {reportText}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 flex items-center gap-2">
                <FileText size={14} /> Description
              </div>
              
              {(() => {
                const titleLower = task.title.toLowerCase();
                const isVeille = task.is_veille_task
                  || task.category === "VEILLE"
                  || titleLower.includes("[veille technologique]")
                  || titleLower.includes("veille technologique")
                  || titleLower.includes("consulter la veille")
                  || titleLower.includes("📡")
                  || titleLower.includes("🌟");
                if (isVeille) {
                  // 1. New format: ### 📰 Title\n- **Lien :** url
                  const textLinksMatches = Array.from((editedTask.description || "").matchAll(/### 📰 ([^\n]+)\n(?:[^\n]*\n)*?(?:- )?\*\*Lien :\*\* (https?:\/\/[^\n\s]+)/g));
                  // 2. Old markdown format with/without bullet: [Title](url) or - [Title](url)
                  const mdLinksMatches = Array.from((editedTask.description || "").matchAll(/(?:[-•]\s*)?\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g));

                  const cards: {title: string; url: string; isVideo: boolean}[] = [];
                  for (const m of textLinksMatches) cards.push({ title: m[1].trim(), url: m[2].trim(), isVideo: m[2].includes("youtube.com") || m[2].includes("youtu.be") });
                  for (const m of mdLinksMatches) cards.push({ title: m[1].trim(), url: m[2].trim(), isVideo: m[2].includes("youtube.com") || m[2].includes("youtu.be") });
                  // Deduplicate by URL
                  const seen = new Set<string>();
                  const uniqueCards = cards.filter(c => { if (seen.has(c.url)) return false; seen.add(c.url); return true; });

                  return (
                    <div className="space-y-2.5">
                      <div className="bg-cyan-50/50 border border-cyan-100 rounded-xl p-3 mb-1 flex items-start gap-2.5">
                        <div className="mt-0.5 text-cyan-500">
                          <FileText size={14} />
                        </div>
                        <p className="text-[11px] font-medium text-cyan-800/80 leading-relaxed">
                          Consultez cette veille technologique et intégrez ces recommandations techniques dans le développement de votre projet.
                        </p>
                      </div>
                      
                      {uniqueCards.length > 0 ? (
                        uniqueCards.map((card, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-4 p-4 rounded-2xl border-2 border-cyan-200/70 bg-gradient-to-r from-cyan-50/60 to-white shadow-[0_0_15px_rgba(34,211,238,0.08)] hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all duration-300"
                          >
                            {/* Icon + Title */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${card.isVideo ? "bg-gradient-to-br from-red-400 to-red-600 shadow-red-400/30" : "bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-400/30"}`}>
                                <span className="text-white text-[15px]">{card.isVideo ? "▶" : "🌟"}</span>
                              </div>
                              <p className="font-black text-slate-800 text-[13px] leading-tight line-clamp-2">
                                {card.title}
                              </p>
                            </div>
                            {/* Consulter button */}
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white text-[11px] font-black uppercase tracking-wider shadow-md shadow-cyan-500/25 hover:shadow-[0_0_20px_rgba(0,188,212,0.5)] hover:from-[#00d4ef] hover:to-[#00BCD4] transition-all duration-200 active:scale-95 whitespace-nowrap"
                            >
                              Consulter <ArrowRight size={12} />
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500 text-center">
                          Aucune ressource de veille disponible.
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <Textarea
                    disabled={!isManager}
                    className="min-h-[72px] rounded-xl bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-3 py-2.5 font-medium text-slate-700 transition-colors resize-none disabled:opacity-70 text-sm"
                    placeholder="Ajouter une description plus détaillée..."
                    value={editedTask.description || ""}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedTask({ ...editedTask, description: e.target.value })}
                  />
                )
              })()}
            </div>

            {/* Priority + Deadline */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Priorité</div>
                <Select
                  disabled={!isManager}
                  value={(editedTask.priority as string) || "MEDIUM"}
                  onValueChange={(v: string | null) => v && setEditedTask({ ...editedTask, priority: v })}
                >
                  <SelectTrigger className="w-full h-10 rounded-xl bg-slate-50/50 border-slate-200 px-3 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] disabled:opacity-70">
                    <SelectValue placeholder="Priorité" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                    <SelectItem value="LOW" className="font-bold">Basse</SelectItem>
                    <SelectItem value="MEDIUM" className="font-bold">Moyenne</SelectItem>
                    <SelectItem value="HIGH" className="font-bold">Haute</SelectItem>
                    <SelectItem value="URGENT" className="font-bold">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Échéance</div>
                <Input
                  disabled={!isManager}
                  type="date"
                  className="rounded-xl h-10 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-3 font-bold text-slate-700 disabled:opacity-70"
                  value={editedTask.deadline ? (editedTask.deadline as string).split('T')[0] : ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, deadline: e.target.value })}
                />
              </div>
            </div>

            {/* Maturity cycle */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1">Cycle de Maturation</div>
              <Select
                disabled={!isManager}
                value={(editedTask.status as string) || "TODO"}
                onValueChange={(v: string | null) => v && setEditedTask({ ...editedTask, status: v })}
              >
                <SelectTrigger className="w-full sm:w-1/2 h-10 rounded-xl bg-slate-50/50 border-slate-200 px-3 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] disabled:opacity-70">
                  <SelectValue placeholder="Maturation" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                  <SelectItem value="TODO" className="font-bold">TODO</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="font-bold">IN_PROGRESS</SelectItem>
                  <SelectItem value="REVIEW" className="font-bold">REVIEW</SelectItem>
                  <SelectItem value="DONE" className="font-bold">DONE</SelectItem>
                  <SelectItem value="SPARK" className="font-bold">Étincelle (Ideation)</SelectItem>
                  <SelectItem value="VALIDATION" className="font-bold">Validation (Market Fit)</SelectItem>
                  <SelectItem value="INCUBATION" className="font-bold">Incubation (Prototype)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assigned members */}
            {isManager && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 flex items-center gap-2">
                  <UserPlus size={14} /> Assigner un membre
                </div>
                <div className="flex flex-wrap gap-2 min-h-[36px]">
                  {editedTask.assignee_ids?.map((a_id: string) => {
                    const member = teamMembers.find((m: any) => m.id === a_id)
                    return (
                      <div key={a_id} className="flex items-center gap-1.5 bg-[#00BCD4]/10 text-[#00BCD4] px-3 py-1.5 rounded-full border border-[#00BCD4]/30 text-xs font-black">
                        <span className="truncate max-w-[100px]">{member?.full_name || "Inconnu"}</span>
                        <button onClick={() => {
                          const updated = (editedTask.assignee_ids || []).filter((id: string) => id !== a_id)
                          setEditedTask({ ...editedTask, assignee_ids: updated })
                        }} className="hover:text-rose-500 rounded-full p-0.5 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    )
                  })}
                  <Select onValueChange={(val: string | null) => {
                    if (val && !editedTask.assignee_ids?.includes(val)) {
                      setEditedTask({ ...editedTask, assignee_ids: [...(editedTask.assignee_ids || []), val] })
                    }
                  }}>
                    <SelectTrigger className="h-9 w-fit rounded-full border-dashed border-2 px-3 text-[11px] font-bold text-slate-400 bg-transparent border-slate-200 hover:border-[#00BCD4] hover:text-[#00BCD4] transition-colors focus:ring-0">
                      <Plus size={14} className="mr-1" /> {lang === 'fr' ? 'Ajouter un membre' : 'Add a member'}
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl shadow-xl">
                      {teamMembers.filter((m: any) => !editedTask.assignee_ids?.includes(m.id as string)).map((m: any) => (
                        <SelectItem key={m.id} value={m.id} className="font-bold">{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ─── DELIVERABLES SECTION ─── */}
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 flex items-center gap-2">
                <Paperclip size={14} /> Livrables & Délivrables
              </div>

              {/* Existing attachments */}
              {(editedTask.attachments || []).length > 0 && (
                <div className="space-y-2">
                  {(editedTask.attachments || []).map((att, idx) => {
                    const isLink = att.startsWith('http')
                    const meta = isLink ? getLinkMeta(att) : null
                    return (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl group hover:border-[#00BCD4]/30 hover:shadow-[0_4px_15px_rgba(0,188,212,0.05)] transition-all"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-[#00BCD4]/10 text-[#00BCD4] rounded-xl border border-[#00BCD4]/20 shrink-0">
                            {isLink
                              ? (meta?.icon ? <span className="text-sm">{meta.icon}</span> : <Link2 size={15} />)
                              : getFileIcon(att)
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-slate-700 text-sm truncate max-w-[380px] group-hover:text-[#00BCD4] transition-colors">{att}</p>
                            {isLink && meta && <p className="text-[10px] text-slate-400 font-bold uppercase">{meta.label}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Download button — visible to manager */}
                          {isManager && !isLink && (
                            <a
                              href={`${API_BASE_URL}/uploads/${encodeURIComponent(att)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="p-1.5 text-slate-300 hover:text-[#00BCD4] hover:bg-[#00BCD4]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Télécharger le livrable"
                            >
                              <Download size={14} />
                            </a>
                          )}
                          {isLink && (
                            <a
                              href={att}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-300 hover:text-[#00BCD4] hover:bg-[#00BCD4]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              title="Ouvrir le lien"
                            >
                              <ArrowRight size={14} />
                            </a>
                          )}
                          {isAssigned && (
                            <button onClick={() => removeAttachment(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Staged local files (not yet submitted) */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl border border-indigo-200 shrink-0">
                          {getFileIcon(file.name)}
                        </div>
                        <div>
                          <p className="font-black text-slate-700 text-sm truncate max-w-[320px]">{file.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">
                            {(file.size / 1024).toFixed(1)} KB — En attente d'envoi
                          </p>
                        </div>
                      </div>
                      <button onClick={() => removeFile(idx)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Drop zone — visible for TODO and IN_PROGRESS */}
              {!isManager && isAssigned && (currentStatus === 'TODO' || currentStatus === 'IN_PROGRESS' || currentStatus === 'REVIEW') && (
                <div className="space-y-3">
                  {/* ── Drop Zone ── */}
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-all ${
                      isDragging
                        ? 'border-[#00BCD4] bg-[#00BCD4]/5 scale-[1.01]'
                        : 'border-slate-200 hover:border-[#00BCD4]/50 hover:bg-slate-50/80'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".py,.js,.ts,.tsx,.jsx,.html,.css,.java,.c,.cpp,.cs,.php,.rb,.go,.rs,.swift,.json,.xml,.yaml,.yml,.md,.txt,.sql,.sh,.zip,.tar,.gz,.pdf,.mp4,.webm,.mov,.avi,.rar,.7z"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className={`p-3.5 rounded-2xl transition-colors ${isDragging ? 'bg-[#00BCD4]/20' : 'bg-slate-100'}`}>
                      <Upload size={24} className={isDragging ? 'text-[#00BCD4]' : 'text-slate-400'} />
                    </div>
                    <div className="text-center">
                      <p className="font-black text-slate-600 text-sm">Glisser-déposer ou cliquer pour joindre</p>
                      <p className="text-[11px] text-slate-400 mt-1 font-semibold">Code source · Archive ZIP · PDF · JSON · YAML</p>
                    </div>
                  </div>

                  {/* ── Link input ── */}
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Ajouter un lien (GitHub, Canva, Figma, Drive...)"
                          value={newLink}
                          onChange={e => { setNewLink(e.target.value); setLinkError("") }}
                          onKeyDown={e => e.key === 'Enter' && handleAddLink()}
                          className="rounded-xl h-10 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] font-bold text-slate-700 text-sm"
                        />
                      </div>
                      <Button onClick={handleAddLink} className="h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-[#00BCD4] hover:text-white transition-all font-black px-4 shrink-0">
                        <Plus size={15} />
                      </Button>
                    </div>
                    {linkError && (
                      <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold pl-1">
                        <AlertTriangle size={12} /> {linkError}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── AI Review Loading State ── */}
            <AnimatePresence>
              {isAiReviewing && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-6 text-center space-y-3"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 mx-auto rounded-full border-3 border-purple-200 border-t-purple-600 flex items-center justify-center"
                  >
                    <Sparkles size={20} className="text-purple-600" />
                  </motion.div>
                  <div>
                    <p className="font-black text-slate-700 text-sm">L'IA analyse vos livrables...</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-1">Comparaison avec la description de la tâche en cours</p>
                  </div>
                  <div className="flex justify-center gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        className="w-2 h-2 rounded-full bg-purple-400"
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* ─── Footer ─── */}
        <div className="px-6 pb-5 pt-3 flex flex-wrap gap-3 sm:justify-between items-center border-t border-slate-100 relative z-10 bg-white/80 backdrop-blur-sm rounded-b-[2rem] shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* ══════════════════════════════════════════════
                TODO → "Commencer la tâche" (member only)
            ══════════════════════════════════════════════ */}
            {!isManager && isAssigned && currentStatus === "TODO" && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button 
                  onClick={handleStartTask} 
                  className="bg-gradient-to-r from-[#00BCD4] to-[#0097a7] hover:from-[#00d4ef] hover:to-[#00BCD4] text-white shadow-lg shadow-[#00BCD4]/25 h-11 px-6 text-sm font-black rounded-2xl gap-2 transition-all"
                >
                  <Rocket size={16} /> Commencer la tâche
                </Button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════
                IN_PROGRESS → "Passer en Revue" (orange, member)
            ══════════════════════════════════════════════ */}
            {!isManager && isAssigned && currentStatus === "IN_PROGRESS" && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handlePassToReview}
                  disabled={isSaving || (!hasDeliverables && (editedTask.attachments || []).length === 0)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 h-11 px-6 text-sm font-black rounded-2xl gap-2 transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <><Loader2 size={15} className="animate-spin" /> Envoi...</>
                  ) : (
                    <><Send size={15} /> Passer en Revue</>
                  )}
                </Button>
              </motion.div>
            )}

            {/* ══════════════════════════════════════════════
                REVIEW → "Lancer la Revue IA" (purple, auto AI)
            ══════════════════════════════════════════════ */}
            {!isManager && isAssigned && currentStatus === "REVIEW" && !aiResult && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={handleSmartAIReview}
                  disabled={isAiReviewing}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 rounded-2xl font-black h-11 px-6 shrink-0 transition-all gap-2"
                >
                  {isAiReviewing ? (
                    <><Loader2 size={15} className="animate-spin" /> Analyse IA...</>
                  ) : (
                    <><Sparkles size={15} /> Revue IA</>
                  )}
                </Button>
              </motion.div>
            )}

            {/* Manager validate/reject buttons when AI has reviewed */}
            {isManager && currentStatus === "REVIEW" && (
              <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 shrink-0">
                <Button onClick={() => { onUpdate(task._id, { status: "DONE" }); onClose() }} className="bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white h-10 px-4 text-xs font-black rounded-xl">✅ Valider</Button>
                <Button onClick={() => { onUpdate(task._id, { status: "IN_PROGRESS" }); onClose() }} variant="ghost" className="text-rose-600 hover:bg-rose-50 h-10 px-4 text-xs font-black rounded-xl bg-white shadow-sm border border-slate-200">❌ Refuser</Button>
              </div>
            )}

            {isManager && currentStatus === "VALIDATION" && (
              <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 shrink-0">
                <Button onClick={() => { onUpdate(task._id, { status: "INCUBATION" }); onClose() }} className="bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white h-10 px-4 text-xs font-black rounded-xl">👍 Incuber</Button>
                <Button onClick={() => { onUpdate(task._id, { status: "SPARK" }); onClose() }} variant="ghost" className="text-rose-600 hover:bg-rose-50 h-10 px-4 text-xs font-black rounded-xl bg-white shadow-sm border border-slate-200">👎 Rejeter</Button>
              </div>
            )}

            {!isManager && isAssigned && currentStatus === "SPARK" && (
              <Button onClick={() => { onUpdate(task._id, { status: "VALIDATION" }); onClose() }} className="bg-[#00BCD4] hover:bg-[#0096a8] text-white shadow-md shadow-[#00BCD4]/20 h-10 px-5 text-xs font-black rounded-2xl">
                {lang === 'fr' ? 'Lancer la Validation' : 'Start Validation'}
              </Button>
            )}
          </div>

          <div className="flex gap-2.5 shrink-0">
            <Button variant="outline" onClick={onClose} className="h-10 rounded-xl font-black text-slate-500 bg-white border-slate-200 hover:bg-slate-50 px-5 text-sm">
              Fermer
            </Button>
            {isManager && (
              <Button onClick={handleSave} disabled={isSaving} className="h-10 rounded-xl bg-gradient-to-r from-[#00BCD4] to-[#0096a8] hover:shadow-[0_8px_25px_rgba(0,188,212,0.3)] text-white font-black px-6 text-sm transition-all active:scale-95">
                {lang === 'fr' ? 'Sauvegarder' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
