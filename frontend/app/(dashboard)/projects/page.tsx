"use client"
import { API_BASE_URL } from "@/lib/api"

import { useEffect, useState } from "react"
import { Trash2, AlertTriangle, FolderKanban, Users, CheckCircle2, X, Edit3, Clock, Zap, Plus, Archive, ArchiveRestore, Search, ChevronRight } from "lucide-react"
import CreateProjectWizard from "@/components/projects/CreateProjectWizard"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import axios from "axios"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuthStore } from "@/lib/store"
import { motion } from "framer-motion"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  skills: string[]
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress_percentage: number
  lead_id?: string
  team_members: string[]
  lead_info?: User
  team_members_info: User[]
  readable_id?: string
  current_risk?: string
  stats?: {
    total_tasks: number
    done_tasks: number
  }
  timeline_end?: string
  archived?: boolean
}

export default function ProjectsPage() {
  const { user, token } = useAuthStore()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [showArchives, setShowArchives] = useState(false)
  const [archiveSearch, setArchiveSearch] = useState("")
  const isManager = user?.role === "PROJECT_MANAGER"
  const { t } = useLang()
  const { theme } = useThemeStore()

  const activeProjects = projects.filter(p => !p.archived)
  const archivedProjects = projects.filter(p => p.archived === true)
  const filteredArchived = archivedProjects.filter(p =>
    p.name.toLowerCase().includes(archiveSearch.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(archiveSearch.toLowerCase())
  )

  const fetchProjects = async () => {
    try {
      setError(null)
      const [projRes, membersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/projects/`, { headers: { Authorization: `Bearer ${token || ""}` } }),
        axios.get(`${API_BASE_URL}/api/members/`, { headers: { Authorization: `Bearer ${token || ""}` } })
      ])
      setProjects(projRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error("Failed to fetch projects:", errorMessage)
      let displayError = "Failed to load projects"
      if (axios.isAxiosError(err)) {
        console.error("Status:", err.response?.status, "Data:", err.response?.data)
        if (err.response?.status === 401) {
          displayError = "Session expired. Please log in again."
        } else if (err.response?.status === 403) {
          displayError = "You don't have permission to view projects."
        } else if (err.code === 'ECONNREFUSED') {
          displayError = "Cannot connect to backend server. Make sure it's running on port 8001."
        } else if (err.response?.status) {
          displayError = `Server error (${err.response.status}). Please try again.`
        }
      }
      setError(displayError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchProjects()
  }, [token])

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject) return
    try {
      await axios.put(`${API_BASE_URL}/api/projects/${editingProject.id}`, {
        name: editingProject.name,
        description: editingProject.description,
        status: editingProject.status,
        progress_percentage: editingProject.progress_percentage,
        timeline_end: editingProject.timeline_end ? new Date(editingProject.timeline_end).toISOString() : undefined,
        lead_id: editingProject.lead_id,
        team_members: editingProject.team_members || []
      }, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setEditingProject(null)
      fetchProjects()
    } catch (err) {
      alert("Failed to update project.")
    }
  }

  const handleDeleteProject = (e: React.MouseEvent, projectId: string, projectName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setProjectToDelete({ id: projectId, name: projectName })
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return
    try {
      await axios.delete(`${API_BASE_URL}/api/projects/${projectToDelete.id}`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setProjectToDelete(null)
      fetchProjects()
    } catch (err) {
      alert("Failed to delete project")
    }
  }

  const handleArchiveProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await axios.post(`${API_BASE_URL}/api/projects/${projectId}/archive`, {}, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchProjects()
    } catch (err) {
      alert("Erreur lors de l'archivage du projet")
    }
  }

  const handleUnarchiveProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await axios.post(`${API_BASE_URL}/api/projects/${projectId}/unarchive`, {}, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      fetchProjects()
    } catch (err) {
      alert("Erreur lors du désarchivage du projet")
    }
  }

  if (loading) return <div className="flex h-40 items-center justify-center font-black text-slate-400">{t.projects.loading}</div>

  if (error) return (
    <div className="flex h-40 items-center justify-center font-black text-red-500">
      <div className="text-center">
        <p>{error}</p>
        <button 
          onClick={() => { setLoading(true); fetchProjects(); }} 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-0 space-y-3 p-4 md:p-8">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00BCD4]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Area */}
      <div className={`flex justify-between items-center pb-2 border-b transition-colors ${theme === 'dark' ? 'border-blue-900' : 'border-slate-100'}`}>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-blue-50 leading-none mb-2 transition-colors">{t.projects.title}</h2>
          <p className="text-xs font-bold text-slate-400 dark:text-blue-800 uppercase tracking-widest leading-none transition-colors">{t.projects.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Archives Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowArchives(true)}
            className={`relative flex items-center gap-2 px-4 h-11 rounded-2xl border transition-all ${
              theme === 'dark' 
                ? 'border-blue-900 bg-blue-950/40 text-blue-400 hover:border-blue-500/60 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                : 'border-slate-200 bg-white/50 backdrop-blur-md text-slate-700 hover:border-[#00BCD4]/60 hover:bg-white/80 hover:shadow-[0_0_15px_rgba(0,188,212,0.3)]'
            } font-black text-sm`}
          >
            <Archive size={16} />
            Archives
            {archivedProjects.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#00BCD4] shadow-[0_0_10px_rgba(0,188,212,0.8)] text-white text-[10px] font-black flex items-center justify-center">
                {archivedProjects.length}
              </span>
            )}
          </motion.button>

          {isManager && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger 
                render={
                  <Button className="bg-[#00BCD4] hover:bg-[#0097a7] text-white shadow-xl shadow-[#00BCD4]/30 rounded-2xl font-black py-6 px-8 text-base h-11 flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
                    <Plus size={18} />
                    {t.projects.newProject}
                  </Button>
                }
              />

              <DialogContent className="sm:max-w-[700px] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
                <CreateProjectWizard 
                  onClose={() => setIsDialogOpen(false)} 
                  onSuccess={() => fetchProjects()} 
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── ARCHIVES OVERLAY PANEL ── */}
      {showArchives && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex justify-end"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-400/20 backdrop-blur-sm" onClick={() => setShowArchives(false)} />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={`relative w-full max-w-[480px] h-full backdrop-blur-2xl border-l shadow-2xl flex flex-col overflow-hidden transition-all duration-500 ${
              theme === 'dark' ? 'bg-[#0f172a]/95 border-blue-900 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]' : 'bg-white/40 border-[#00BCD4]/30 shadow-[-20px_0_50px_rgba(0,188,212,0.1)]'
            }`}
          >
            {/* Panel header */}
            <div className={`px-6 py-6 border-b transition-colors ${theme === 'dark' ? 'border-blue-900 bg-gradient-to-b from-blue-950/50 to-transparent' : 'border-slate-200 bg-gradient-to-b from-white/50 to-transparent'}`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    theme === 'dark' ? 'bg-blue-900/40 border border-blue-400/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-white border border-[#00BCD4]/30 shadow-[0_4px_15px_rgba(0,188,212,0.15)]'
                  }`}>
                    <Archive size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-[#00BCD4]'} />
                  </div>
                  <div>
                    <h3 className={`font-black text-lg leading-none transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>Archives</h3>
                    <p className={`text-xs font-bold mt-0.5 transition-colors ${theme === 'dark' ? 'text-blue-400' : 'text-[#00BCD4]'}`}>{archivedProjects.length} projet{archivedProjects.length !== 1 ? "s" : ""} terminé{archivedProjects.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchives(false)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    theme === 'dark' ? 'bg-blue-900/40 border border-blue-800 text-blue-400 hover:bg-rose-500/20 hover:border-rose-500 hover:text-rose-400' : 'bg-slate-50/50 border border-slate-200 text-slate-400 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-500'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-blue-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Rechercher un projet archivé..."
                  value={archiveSearch}
                  onChange={e => setArchiveSearch(e.target.value)}
                  className={`w-full pl-9 pr-4 py-3 rounded-xl border transition-all text-sm font-semibold focus:outline-none ${
                    theme === 'dark' 
                      ? 'bg-blue-950/40 border-blue-900 text-blue-50 placeholder:text-blue-900 focus:border-blue-400 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                      : 'bg-white/50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#00BCD4] focus:shadow-[0_0_15px_rgba(0,188,212,0.15)]'
                  }`}
                />
                {archiveSearch && (
                  <button onClick={() => setArchiveSearch("")} className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Archived projects list */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
              {filteredArchived.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-500 mt-10">
                  <Archive size={42} className="text-[#00BCD4]/40 drop-shadow-[0_4px_15px_rgba(0,188,212,0.1)]" />
                  <p className="font-bold text-sm text-slate-500">
                    {archiveSearch ? "Aucun résultat trouvé" : "Aucun projet archivé"}
                  </p>
                </div>
              ) : (
                filteredArchived.map((project, idx) => {
                  const totalTasks = project.stats?.total_tasks || 0
                  const doneTasks = project.stats?.done_tasks || 0
                  const dateStr = project.timeline_end
                    ? new Date(project.timeline_end).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                    : "—"
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      <Link href={`/projects/${project.id}`} onClick={() => setShowArchives(false)}>
                        <div className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-sm ${
                          theme === 'dark' 
                            ? 'border-blue-900 bg-blue-950/40 hover:bg-blue-900/40 hover:border-blue-500/40 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)]' 
                            : 'border-[#00BCD4]/20 bg-white/40 hover:bg-white/80 hover:border-[#00BCD4]/40 hover:shadow-[0_8px_30px_rgba(0,188,212,0.1)]'
                        }`}>
                          {/* Icon */}
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                            theme === 'dark' 
                              ? 'bg-blue-900/40 border border-blue-500/30 shadow-[0_4px_10px_rgba(59,130,246,0.1)] group-hover:shadow-[0_4px_15px_rgba(59,130,246,0.2)]' 
                              : 'bg-white border border-[#00BCD4]/30 shadow-[0_4px_10px_rgba(0,188,212,0.1)] group-hover:shadow-[0_4px_15px_rgba(0,188,212,0.2)]'
                          }`}>
                            <Archive size={18} className={theme === 'dark' ? 'text-blue-400' : 'text-[#00BCD4]'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-black text-sm truncate transition-colors ${
                              theme === 'dark' ? 'text-blue-50 group-hover:text-blue-300' : 'text-slate-800 group-hover:text-[#00BCD4]'
                            }`}>{project.name}</p>
                            <p className={`text-xs font-semibold truncate mt-0.5 ${theme === 'dark' ? 'text-blue-400' : 'text-slate-500'}`}>{project.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                theme === 'dark' 
                                  ? 'text-blue-300 bg-blue-500/10 border border-blue-500/30 shadow-[0_2px_5px_rgba(59,130,246,0.1)]' 
                                  : 'text-[#00BCD4] bg-[#00BCD4]/10 border border-[#00BCD4]/30 shadow-[0_2px_5px_rgba(0,188,212,0.1)]'
                              }`}>📦 Archivé</span>
                              <span className={`text-[10px] font-bold flex items-center gap-1 ${theme === 'dark' ? 'text-blue-500' : 'text-slate-500'}`}><Clock size={9} /> {dateStr}</span>
                              {totalTasks > 0 && (
                                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-slate-500'}`}>{doneTasks}/{totalTasks} tâches</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 mt-1">
                            {isManager && (
                              <motion.button
                                whileHover={{ scale: 1.1, boxShadow: '0 4px 15px rgba(0,188,212,0.3)' }}
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => handleUnarchiveProject(e, project.id)}
                                className={`h-8 px-3 rounded-xl flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all border ${
                                  theme === 'dark' 
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400' 
                                    : 'bg-[#00BCD4]/10 border-[#00BCD4]/30 text-[#00BCD4] hover:bg-[#00BCD4]/20 hover:border-[#00BCD4]'
                                }`}
                                title="Désarchiver le projet"
                              >
                                <ArchiveRestore size={13} />
                                Restaurer
                              </motion.button>
                            )}
                            <ChevronRight size={16} className={`transition-colors drop-shadow-sm ${theme === 'dark' ? 'text-blue-500 group-hover:text-blue-300' : 'text-slate-400 group-hover:text-[#00BCD4]'}`} />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* PROJECTS GRID (xl:col-span-9) */}
        <div className="xl:col-span-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {activeProjects.map(project => {
          const getStatusDisplay = (status: string) => {
            if (status === 'ON_TRACK') return { label: 'Active Quest', color: 'text-[#00BCD4]', bg: 'bg-[#00BCD4]/10', bar: 'bg-[#00BCD4]', glow: 'shadow-[0_0_15px_rgba(0,188,212,0.2)]' }
            if (status === 'AT_RISK') return { label: 'Danger Zone', color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' }
            if (status === 'DELAYED') return { label: 'Critical Path', color: 'text-rose-500', bg: 'bg-rose-500/10', bar: 'bg-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]' }
            return { label: 'Side Quest', color: 'text-sky-500', bg: 'bg-sky-500/10', bar: 'bg-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.2)]' }
          }
          const st = getStatusDisplay(project.status)
          let dateStr = t.projects.noDeadline
          if (project.timeline_end) {
            dateStr = new Date(project.timeline_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          }
          const totalTasks = project.stats?.total_tasks || 0
          const projectId = project.id || (project as any)._id || project.readable_id;

          return (
            <Link href={`/projects/${projectId}`} key={projectId}>

              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className={`group relative h-[380px] cursor-pointer transition-all duration-500 shadow-2xl overflow-hidden rounded-[2rem] border neon-box-cyan light-sweep-container ${
                  theme === 'dark' 
                    ? 'bg-[#0f172a]/60 border-blue-500/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)]' 
                    : 'bg-white/60 backdrop-blur-xl border-white shadow-[0_10px_30px_rgba(0,188,212,0.15)]'
                }`}
              >
                <div className="relative z-10 w-full h-full border-none overflow-hidden flex flex-col">
                  {/* Top status color strip */}
                  <div className={`absolute top-0 inset-x-0 h-1 ${st.bar} opacity-80 z-20`} />

                {/* Subtle star sparkles */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
                  {[
                    { top: '12%', left: '80%', size: 3, opacity: 0.5 },
                    { top: '28%', left: '15%', size: 2, opacity: 0.4 },
                    { top: '55%', left: '90%', size: 2.5, opacity: 0.45 },
                    { top: '70%', left: '40%', size: 2, opacity: 0.35 },
                    { top: '85%', left: '70%', size: 3.5, opacity: 0.5 },
                    { top: '40%', left: '55%', size: 2, opacity: 0.3 },
                    { top: '18%', left: '45%', size: 2.5, opacity: 0.4 },
                    { top: '90%', left: '20%', size: 2, opacity: 0.35 },
                  ].map((star, i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [star.opacity, star.opacity * 0.3, star.opacity], scale: [1, 1.4, 1] }}
                      transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3 }}
                      className="absolute rounded-full bg-white"
                      style={{ top: star.top, left: star.left, width: star.size, height: star.size, boxShadow: `0 0 4px rgba(255,255,255,0.9)` }}
                    />
                  ))}
                </div>

                <div className="relative z-20 p-6 h-full flex flex-col gap-4">
                  {/* Status Badge */}
                  <div className="flex items-center">
                    <div className={`px-3 py-1.5 rounded-xl ${st.bg} ${st.color} flex items-center gap-2 backdrop-blur-sm`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${st.bar} animate-pulse`} />
                      <span className="text-[10px] font-black uppercase tracking-wider">{st.label}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className={`text-2xl font-black leading-tight tracking-tight transition-colors mb-2 ${
                    theme === 'dark' ? 'text-blue-50 group-hover:text-blue-300' : 'text-slate-800'
                  }`}>
                    {project.name}
                  </h3>

                  {/* Deadline */}
                  <div className="flex items-center justify-between">
                     <div className="flex flex-col">
                       <p className="text-[8px] font-black text-slate-500 dark:text-blue-800 uppercase tracking-widest mb-1 transition-colors">{t.projects.deadline}</p>
                       <div className="flex items-center gap-1 text-slate-700 dark:text-blue-300 transition-colors">
                         <Clock size={12} />
                         <span className="text-sm font-black">{dateStr}</span>
                       </div>
                     </div>
                  </div>

                  {/* Avancement gamifié */}
                  <div className="space-y-2 pb-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-600 dark:text-blue-500 uppercase tracking-widest transition-colors">⚡ {t.projects.progress}</span>
                      <span className="text-sm font-black text-[#0097a7] dark:text-blue-400" style={{ textShadow: theme === 'dark' ? '0 0 12px rgba(59,130,246,0.6)' : '0 0 8px rgba(0,188,212,0.5)' }}>{project.progress_percentage}%</span>
                    </div>
                    {/* Orb progress bar */}
                    <div className={`flex items-center gap-0.5 rounded-full px-2 py-1 border backdrop-blur-sm transition-colors ${
                      theme === 'dark' ? 'bg-blue-900/20 border-blue-500/20' : 'bg-black/10 border-white/30'
                    }`}>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const filled = i < Math.round(project.progress_percentage / 10)
                        return (
                          <motion.div
                            key={i}
                            animate={filled ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] } : {}}
                            transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity }}
                            className="flex-1 h-2 rounded-full transition-all duration-500"
                            style={{
                              background: filled ? (theme === 'dark' ? '#3b82f6' : '#00BCD4') : (theme === 'dark' ? 'rgba(30,58,138,0.2)' : 'rgba(0,0,0,0.05)'),
                              boxShadow: filled ? (theme === 'dark' ? '0 0 12px rgba(59,130,246,0.8), inset 0 0 4px rgba(255,255,255,0.4)' : '0 0 12px rgba(0,188,212,0.6), inset 0 0 4px rgba(255,255,255,0.4)') : 'none'
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={`flex justify-between items-center mt-auto pt-4 pb-2 border-t transition-colors ${theme === 'dark' ? 'border-blue-500/10' : 'border-slate-200/50'}`}>
                    <div className="flex -space-x-2">
                      {(project.team_members_info || []).slice(0, 3).map((m, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black overflow-hidden"
                          style={{
                            background: 'linear-gradient(135deg, #e0f7ff 0%, #7dd3fc 40%, #38bdf8 100%)',
                            borderColor: '#ffffff',
                            boxShadow: '0 0 12px rgba(125,211,252,0.7), 0 2px 8px rgba(56,189,248,0.4)',
                            color: '#0369a1',
                          }}
                          title={m.full_name || 'Membre'}
                        >
                          {(m.full_name || 'M').charAt(0).toUpperCase()}
                        </div>
                      ))}

                      {project.team_members?.length > 3 && (
                        <div
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[8px] font-black"
                          style={{
                            background: 'linear-gradient(135deg, #f0fbff 0%, #bae6fd 50%, #7dd3fc 100%)',
                            borderColor: '#ffffff',
                            boxShadow: '0 0 10px rgba(125,211,252,0.6)',
                            color: '#0369a1',
                          }}
                        >
                          +{project.team_members.length - 3}
                        </div>
                      )}
                    </div>
                    {isManager && (
                      <div className="flex gap-2 relative z-30">
                        <motion.button
                          whileHover={{ scale: 1.1, y: -4, backgroundColor: theme === 'dark' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.15)', borderColor: '#f59e0b', color: '#f59e0b', boxShadow: '0 8px 25px rgba(251,191,36,0.3)' }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            theme === 'dark' ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-white/40 text-slate-500 border border-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                          }`}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProject(project); }}
                        >
                          <Edit3 size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1, y: -4, backgroundColor: theme === 'dark' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(244, 63, 94, 0.15)', borderColor: '#f43f5e', color: '#f43f5e', boxShadow: '0 8px 25px rgba(244,63,94,0.3)' }}
                          whileTap={{ scale: 0.95 }}
                          className={`h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                            theme === 'dark' ? 'bg-blue-900/40 text-blue-400 border-blue-800' : 'bg-white/40 text-slate-500 border border-white/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                          }`}
                          onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    )}
                  </div>

                </div>
                </div>
              </motion.div>
            </Link>
          )
        })}
        </div>

      </div>

      {/* MODALS */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border border-[#00BCD4]/20 rounded-[2.5rem] bg-white/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,188,212,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none" />
          <div className="h-1.5 w-full bg-gradient-to-r from-[#00BCD4] to-[#84ffff] shadow-[0_0_15px_rgba(0,188,212,0.5)]" />
          {editingProject && (
            <div className="p-8 space-y-6 relative z-10">
              <h2 className="text-2xl font-black text-slate-800 drop-shadow-sm">{t.projects.editProject}</h2>
              <form onSubmit={handleUpdateProject} className="space-y-5">
                <div className="space-y-2">
                   <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.projectName}</Label>
                   <Input value={editingProject.name} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} className="font-bold bg-slate-50/50 border-slate-200 text-slate-800 focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] rounded-xl" />
                </div>
                <div className="space-y-2">
                   <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.description}</Label>
                   <Textarea value={editingProject.description || ''} onChange={(e) => setEditingProject({...editingProject, description: e.target.value})} rows={3} className="font-medium resize-none bg-slate-50/50 border-slate-200 text-slate-800 focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.status}</Label>
                     <Select value={editingProject.status} onValueChange={(v) => setEditingProject({...editingProject, status: v as any})}>
                        <SelectTrigger className="font-bold bg-slate-50/50 border-slate-200 text-slate-800 rounded-xl focus:ring-[#00BCD4]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                          <SelectItem value="ON_TRACK" className="font-bold focus:bg-[#00BCD4]/10">Active Quest ✅</SelectItem>
                          <SelectItem value="AT_RISK" className="font-bold focus:bg-amber-500/10">Danger Zone ⚠️</SelectItem>
                          <SelectItem value="DELAYED" className="font-bold focus:bg-rose-500/10">Critical Path 🔴</SelectItem>
                          <SelectItem value="DONE" className="font-bold focus:bg-emerald-500/10">Terminé ✔️</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-2">
                     <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.progress} (%)</Label>
                     <Input type="number" min={0} max={100} value={editingProject.progress_percentage} onChange={(e) => setEditingProject({...editingProject, progress_percentage: Number(e.target.value)})} className="font-bold bg-slate-50/50 border-slate-200 text-slate-800 focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                   <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.deadline}</Label>
                   <Input type="date" value={editingProject.timeline_end ? new Date(editingProject.timeline_end).toISOString().split('T')[0] : ''} onChange={(e) => setEditingProject({...editingProject, timeline_end: e.target.value})} className="font-bold bg-slate-50/50 border-slate-200 text-slate-800 focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4] rounded-xl" />
                </div>
                <div className="space-y-2">
                   <Label className="uppercase text-[10px] font-black text-[#00BCD4]">{t.projects.projectLead}</Label>
                    <Select value={editingProject.lead_id ?? ''} onValueChange={(v) => setEditingProject({...editingProject, lead_id: v || undefined})}>
                       <SelectTrigger className="font-bold bg-slate-50/50 border-slate-200 text-slate-800 rounded-xl focus:ring-[#00BCD4]"><SelectValue placeholder={t.projects.selectLead} /></SelectTrigger>
                       <SelectContent className="bg-white border-slate-200 text-slate-800 shadow-2xl rounded-2xl">
                         {members.map(m => (
                           <SelectItem key={m.id} value={m.id} className="font-bold focus:bg-[#00BCD4]/10 cursor-pointer">
                             {m.full_name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                </div>
                <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                   <Button variant="outline" className="font-black rounded-2xl bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all" onClick={() => setEditingProject(null)}>{t.projects.cancel}</Button>
                   <Button type="submit" className="bg-[#00BCD4]/10 border border-[#00BCD4]/30 hover:bg-[#00BCD4] hover:border-[#00BCD4] text-[#00BCD4] hover:text-white rounded-2xl px-6 font-black shadow-[0_0_15px_rgba(0,188,212,0.2)] transition-all">{t.projects.save}</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none rounded-[2.5rem]" />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }} className="relative z-10 flex flex-col items-center">
            <AlertTriangle size={56} className="text-rose-500 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse relative z-10" />
            <h2 className="text-2xl font-black mb-2 text-slate-800 drop-shadow-sm relative z-10">{t.projects.confirmDelete}</h2>
            <p className="text-sm text-slate-500 font-bold mb-8 italic relative z-10">{t.projects.confirmDeleteMsg} <span className="text-slate-800">"{projectToDelete?.name}"</span> ?</p>
            <div className="flex gap-4 relative z-10 w-full">
               <Button variant="outline" className="flex-1 rounded-2xl font-black bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all" onClick={() => setProjectToDelete(null)}>{t.projects.cancel}</Button>
               <Button className="flex-1 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:border-rose-500 text-rose-600 hover:text-white rounded-2xl font-black shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all" onClick={confirmDeleteProject}>{t.projects.delete}</Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
