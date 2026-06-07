"use client"
import { API_BASE_URL } from "@/lib/api"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import KanbanBoard, { Task } from "@/components/kanban/KanbanBoard"
import TaskDetailModal from "@/components/kanban/TaskDetailModal"
import AddTaskModal from "@/components/kanban/AddTaskModal"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserPlus, Trash2, ShieldCheck, User as UserIcon, Download, Upload, Trash, FileText, LayoutDashboard, Sparkles, Zap, AlertTriangle, Archive, ArchiveRestore } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import mermaid from 'mermaid'
import { BookOpen, Kanban, Users as TeamIcon, CalendarDays, LifeBuoy } from "lucide-react"
import { useThemeStore } from "@/lib/themeStore"
import ModernRoadmap from "@/components/projects/ModernRoadmap"

interface User {
  id: string
  email: string
  phone_number?: string
  full_name: string
  role: string
  skills: string[]
  avatar_url?: string
}

interface Project {
  id: string
  name: string
  description: string
  status: string
  progress_percentage: number
  lead_id?: string
  team_members: string[]
  milestones: { title: string; date: string }[]
  backup_plan?: string
  lead_info?: User
  team_members_info: User[]
  specification?: {
    id: string
    project_title: string
    project_summary: string
    markdown_content: string
    methodology: string
    created_at: string
  }
  archived?: boolean
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { theme } = useThemeStore()
  const { token, user } = useAuthStore()
  const isManager = user?.role === "PROJECT_MANAGER"
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState<"general" | "specification" | "roadmap">("general")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [addTaskStatus, setAddTaskStatus] = useState("TODO")
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isGeneratingSpec, setIsGeneratingSpec] = useState(false)

  const handleToggleArchive = async () => {
    if (!project) return
    const action = project.archived ? 'unarchive' : 'archive'
    try {
      const res = await axios.post(`${API_BASE_URL}/api/projects/${id}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProject(res.data)
    } catch (err) {
      alert(`Erreur lors de ${project.archived ? 'la désarchivation' : "l'archivage"} du projet`)
    }
  }

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
    })
  }, [])

  const Mermaid = ({ children, className }: any) => {
    const isMermaid = className === 'language-mermaid'
    const [svg, setSvg] = useState<string>('')
    const [error, setError] = useState<boolean>(false)

    useEffect(() => {
      if (isMermaid) {
        const renderMermaid = async () => {
          try {
            // Sanitize: strip markdown fences if AI accidentally included them
            let code = String(children).trim()
            code = code.replace(/^```mermaid\n?/, '').replace(/```$/, '').trim()
            
            // Fix common AI errors in Mermaid
            code = code.replace(/\|([^|]+)\|>/g, '|$1|') // Fix |text|> -> |text|
            code = code.replace(/\|([^|]+)\|-/g, '|$1|') // Fix |text|- -> |text|
            
            if (!code.startsWith('graph') && !code.startsWith('flowchart') && !code.startsWith('sequenceDiagram') && !code.startsWith('classDiagram') && !code.startsWith('stateDiagram') && !code.startsWith('erDiagram')) {
               code = 'flowchart TD\n' + code
            }

            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
            const { svg } = await mermaid.render(id, code)
            setSvg(svg)
            setError(false)
          } catch (err) {
            console.error("Mermaid error:", err)
            setError(true)
          }
        }
        renderMermaid()
      }
    }, [isMermaid, children])

    if (isMermaid) {
      if (error) return (
        <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] my-8 text-center shadow-inner">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
             <AlertTriangle size={18} className="text-rose-500" />
          </div>
          <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Erreur de syntaxe du diagramme</p>
          <div className="mt-4 p-3 bg-white/50 rounded-xl text-left overflow-x-auto">
             <pre className="text-[9px] text-rose-300 leading-tight">{String(children).trim()}</pre>
          </div>
        </div>
      )
      return (
        <div 
          className="flex justify-center bg-white/40 backdrop-blur-sm border border-slate-200/50 rounded-[2.5rem] my-10 p-10 shadow-xl overflow-hidden group hover:border-[#00BCD4]/30 transition-all duration-500" 
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      )
    }

    return (
      <code className={className}>
        {children}
      </code>
    )
  }

  const fetchData = async () => {
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/tasks/project/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      setProject(projRes.data)
      setTasks(tasksRes.data)
      setAllUsers(usersRes.data)
    } catch (err) {
      console.error("Error fetching project details:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token && id) fetchData()
  }, [id, token])

  const [isGeneratingMilestones, setIsGeneratingMilestones] = useState(false)

  // Auto-generate spec when tab opens and none exists OR spec has empty content
  useEffect(() => {
    const specMissing = !project?.specification || !project.specification.markdown_content || project.specification.markdown_content.trim().length < 50
    if (activeTab === "specification" && project && specMissing && !isGeneratingSpec && token) {
      setIsGeneratingSpec(true)
      axios.post(`${API_BASE_URL}/api/specifications/generate/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setProject(prev => prev ? { ...prev, specification: res.data } : prev)
        })
        .catch(err => console.error("Auto-generate spec error:", err))
        .finally(() => setIsGeneratingSpec(false))
    }
  }, [activeTab, project, token, id])

  // Auto-generate milestones when roadmap tab opens and none exist
  useEffect(() => {
    const noMilestones = !project?.milestones || project.milestones.length === 0
    if (activeTab === "roadmap" && project && noMilestones && !isGeneratingMilestones && token) {
      setIsGeneratingMilestones(true)
      axios.post(`${API_BASE_URL}/api/specifications/generate-milestones/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          if (res.data.milestones) {
            setProject(prev => prev ? { ...prev, milestones: res.data.milestones } : prev)
          }
        })
        .catch(err => console.error("Auto-generate milestones error:", err))
        .finally(() => setIsGeneratingMilestones(false))
    }
  }, [activeTab, project, token, id])

  const handleUpdateLead = async (leadId: string | null) => {
    if (!leadId || leadId === "unassigned") return
    try {
      const res = await axios.put(`${API_BASE_URL}/api/projects/${id}`, 
        { lead_id: leadId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProject(res.data)
    } catch (err: any) {
      console.error("Failed to update team lead:", err?.response?.data || err)
      alert("Impossible de mettre à jour le chef de projet.")
    }
  }

  const handleAddMember = async (userId: string | null) => {
    if (!userId) return
    try {
      const res = await axios.post(`${API_BASE_URL}/api/projects/${id}/members`, 
        { user_id: userId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProject(res.data)
    } catch (err) {
      alert("Failed to add team member")
    }
  }

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await axios.delete(`${API_BASE_URL}/api/projects/${id}/members/${userId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProject(res.data)
    } catch (err) {
      alert("Failed to remove team member")
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/tasks/${taskId}`, 
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.map(t => t._id === taskId ? res.data : t))
    } catch (err) {
      alert("Failed to update task")
    }
  }

  const handleReassignTasks = async () => {
    if (!confirm("Voulez-vous que l'IA analyse les membres et assigne automatiquement les tâches non assignées ?")) return
    setIsReassigning(true)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/projects/${id}/reassign`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      alert(res.data.message)
      fetchData()
    } catch (err) {
      alert("Erreur lors de la réassignation des tâches")
    } finally {
      setIsReassigning(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette tâche ?")) return
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.filter(t => t._id !== taskId))
      setIsModalOpen(false)
    } catch (err) {
      alert("Failed to delete task")
    }
  }

  const handleAIReview = async (task: Task) => {
    setReviewingTaskId(task._id)
    try {
      const res = await axios.post(`${API_BASE_URL}/api/tasks/${task._id}/ai-review`, {}, {
        headers: { "Authorization": `Bearer ${token || ""}` }
      })
      setTasks(tasks.map((t: any) => t._id === task._id ? res.data : t))
      if (selectedTask?._id === task._id) {
        setSelectedTask(res.data)
      }
    } catch (err) {
      alert("AI Review failed")
    } finally {
      setReviewingTaskId(null)
    }
  }

  const handleAddTask = (status: string) => {
    setAddTaskStatus(status)
    setIsAddTaskOpen(true)
  }

  const handleCreateTask = async (taskData: {
    title: string
    description: string
    status: string
    priority: string
    deadline: string | null
    assignee_ids: string[]
    attachments: string[]
  }) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/tasks/`,
        { ...taskData, project_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks([...tasks, res.data])
    } catch (err) {
      alert("Failed to create task")
    }
  }

  const handleDownloadPDF = async () => {
    if (!project?.specification) return
    try {
      const response = await axios.get(`${API_BASE_URL}/api/specifications/${project.specification.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `specification_${project.name.replace(/\s+/g, '_')}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert("Failed to download PDF")
    }
  }

  const handleDeleteSpec = async () => {
    if (!project?.specification) return
    if (!confirm("Voulez-vous vraiment supprimer ce cahier des charges ? Cela ne supprimera pas les tâches, mais la documentation sera perdue.")) return
    try {
      await axios.delete(`${API_BASE_URL}/api/specifications/${project.specification.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData() // Refresh project data
    } catch (err) {
      alert("Failed to delete specification")
    }
  }

  const handleImportSpec = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("project_id", id as string)

    try {
      await axios.post(`${API_BASE_URL}/api/specifications/import`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      alert("Cahier des charges importé et les tâches sont en cours de mise à jour !")
      fetchData() // Refresh everything
    } catch (err) {
      alert("Failed to import specification")
    } finally {
      setUploading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des détails du projet...</div>
  if (!project) return <div className="p-8 text-center text-red-500">Projet non trouvé</div>

  const availableUsersToAdd = allUsers.filter(u => !project.team_members.includes(u.id))

   return (
    <div className="space-y-6 lg:space-y-8 p-1">
      <div className="flex flex-col gap-4">
        <Link href="/projects" className="text-xs font-black text-slate-400 hover:text-[#00BCD4] flex items-center gap-1.5 w-fit uppercase tracking-widest transition-colors mb-6">
          <ArrowLeft size={14} /> Projets
        </Link>
        <div className="flex justify-between items-start">
          <div className="min-w-0 text-left">
            <h2 className={`text-3xl font-black tracking-tight leading-none mb-2 truncate transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>{project.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white shadow-sm ${project.status === 'ON_TRACK' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {project.status.replace('_', ' ')}
              </span>
              {project.archived && (
                <span className="text-[10px] font-black uppercase px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
                  <Archive size={11} /> Archivé
                </span>
              )}
              <p className={`text-[15px] font-medium truncate max-w-xl transition-colors ${theme === 'dark' ? 'text-blue-300' : 'text-slate-500'}`}>{project.description}</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 ml-4 mt-1">
            {isManager && (
              <Button 
                size="sm" 
                variant="outline"
                className={`h-10 text-xs font-black px-4 rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 ${
                  project.archived 
                    ? 'border-[#00BCD4]/40 text-[#00BCD4] hover:bg-[#00BCD4]/10 hover:border-[#00BCD4] shadow-[0_0_15px_rgba(0,188,212,0.1)]' 
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                }`}
                onClick={handleToggleArchive}
              >
                {project.archived ? <><ArchiveRestore size={14} /> Désarchiver</> : <><Archive size={14} /> Archiver</>}
              </Button>
            )}
            <Button size="sm" className="h-10 text-xs font-black bg-[#00BCD4] hover:bg-[#0097a7] px-5 shadow-md shadow-cyan-500/20 transition-all hover:scale-105 active:scale-95" onClick={() => handleAddTask("BACKLOG")}>+ Tâche</Button>
          </div>
        </div>
      </div>

       <div className="flex border-b border-slate-200 mb-4 overflow-x-auto">
        {[
          { id: "general", label: "Tableau Kanban", icon: <Kanban size={18} /> },
          { id: "roadmap", label: "Feuille de Route", icon: <CalendarDays size={18} /> },
          { id: "specification", label: "Spécification", icon: <BookOpen size={18} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-3 font-black text-sm transition-colors border-b-2 whitespace-nowrap uppercase tracking-widest flex items-center gap-2.5 ${activeTab === tab.id ? "border-[#00BCD4] text-[#00BCD4]" : `border-transparent transition-colors ${theme === 'dark' ? 'text-blue-400 hover:text-blue-200' : 'text-slate-400 hover:text-slate-600'}`}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-4 space-y-4 min-w-0">
            <KanbanBoard 
              initialTasks={tasks} 
              teamMembers={project.team_members_info || allUsers}
              onSelectTask={(task) => { setSelectedTask(task); setIsModalOpen(true) }}
              onAddTask={handleAddTask}
              onAIReview={handleAIReview}
              reviewingTaskId={reviewingTaskId}
              project={{
                id: project.id,
                name: project.name,
                description: project.description,
                stack: (project as any).stack || "",
                duration_weeks: (project as any).duration_weeks || 8,
              }}
              onTasksAccepted={() => fetchData()}
            />
          </div>

           <div className="xl:col-span-1 flex flex-col gap-4 min-h-[600px] h-[calc(100vh-200px)]">
            {/* GAMIFIED LIGHT NEON TEAM BOX */}
            <div className={`p-4 rounded-3xl border shadow-[0_8px_30px_rgba(0,188,212,0.1)] flex flex-col flex-1 min-h-0 relative overflow-hidden group transition-all duration-500 ${
              theme === 'dark' ? 'bg-[#0f172a]/80 border-blue-500/20 shadow-blue-900/40' : 'bg-white/40 backdrop-blur-2xl border-[#00BCD4]/30'
            }`}>
              
              {/* Circuit Board Decals / Holographic lines */}
              <div className="absolute top-0 left-4 w-px h-full bg-gradient-to-b from-transparent via-[#00BCD4]/20 to-transparent pointer-events-none"></div>
              <div className="absolute top-10 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#00BCD4]/10 to-transparent pointer-events-none"></div>
              
              <h3 className="text-[11px] font-black text-[#00BCD4] uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0">
                <ShieldCheck size={14} className="text-[#00BCD4]" /> Équipe du Projet
              </h3>
              
              <div className="flex flex-col flex-1 min-h-0 space-y-3 relative z-10">

                 {/* CHEF DE PROJET — choisi manuellement par le manager */}
                 <div className={`shrink-0 p-2 rounded-2xl border shadow-sm relative transition-all duration-300 hover:border-[#00BCD4]/40 hover:shadow-[0_4px_15px_rgba(0,188,212,0.1)] ${
                    theme === 'dark' ? 'bg-blue-950/40 border-blue-500/10' : 'bg-slate-50/50 backdrop-blur-sm border-slate-200'
                 }`}>
                  <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-1.5 mb-1">
                    Chef de Projet
                  </label>
                  <div>
                    <Select
                      value={project.lead_id || "unassigned"}
                      onValueChange={handleUpdateLead}
                      disabled={!isManager}
                    >
                      <SelectTrigger className={`w-full h-auto p-1.5 bg-transparent border-none shadow-none focus:ring-0 hover:bg-slate-100 rounded-xl transition-all ${isManager ? "cursor-pointer" : "cursor-default"}`}>
                        <div className="flex items-center gap-2.5 w-full text-left">
                          <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                            <div className="absolute inset-0 bg-[#00BCD4] rounded-full blur-[6px] opacity-30 animate-pulse"></div>
                            <div className="absolute inset-0 border-[1.5px] border-dashed border-[#00BCD4] rounded-full animate-[spin_12s_linear_infinite]"></div>
                            <Avatar className="h-5 w-5 shrink-0 relative z-10 border border-[#00BCD4]/50 bg-slate-100">
                              {project.lead_info?.avatar_url && <AvatarImage src={project.lead_info.avatar_url} />}
                              <AvatarFallback className="bg-transparent text-slate-700 text-[9px] font-black">
                                {project.lead_info?.full_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-black truncate tracking-tight transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                              {project.lead_info?.full_name || "Non assigné"}
                            </p>
                            <p className="text-[8px] text-slate-500 font-bold truncate mt-0.5 uppercase tracking-wider">{project.lead_info?.email || "Choisir un chef de projet"}</p>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl">
                        <SelectItem value="unassigned" className="text-slate-400 focus:bg-slate-50">— Non assigné —</SelectItem>
                        {allUsers.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs font-bold focus:bg-slate-100 focus:text-slate-900">{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                 {/* MEMBRES */}
                 <div className="flex flex-col flex-1 min-h-0 pt-2 border-t border-slate-100 relative">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 ml-1 flex items-center gap-1.5">Membres</label>
                    {isManager && (
                      <Select onValueChange={handleAddMember}>
                        <SelectTrigger className="w-6 h-6 p-0 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all focus:ring-0 shadow-sm">
                          <UserPlus size={12} className="mx-auto" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl">
                          {availableUsersToAdd.map(user => (
                            <SelectItem key={user.id} value={user.id} className="text-xs font-bold focus:bg-slate-100 focus:text-slate-900">{user.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                   <div className="space-y-1.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                    {project.team_members_info.map((member, i) => {
                      
                      return (
                      <div key={member.id} className={`flex items-center gap-3 p-2 rounded-xl group transition-all duration-300 border border-transparent hover:border-[#00BCD4]/30 hover:shadow-[0_2px_10px_rgba(0,188,212,0.05)] relative overflow-hidden backdrop-blur-sm ${
                         theme === 'dark' ? 'hover:bg-blue-900/20' : 'hover:bg-slate-50/80'
                      }`}>
                        {/* Member Avatar instead of Shield */}
                        <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                           <div className="absolute inset-0 bg-[#00BCD4] rounded-xl blur-[4px] opacity-20 group-hover:opacity-40 transition-opacity"></div>
                           <Avatar className="h-full w-full rounded-xl border-2 border-white shadow-sm relative z-10 transition-transform group-hover:scale-105">
                              {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} className="object-cover" />}
                              <AvatarFallback className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase">
                                 {member.full_name?.charAt(0) || "M"}
                              </AvatarFallback>
                           </Avatar>
                        </div>
                        <div className="flex-1 min-w-0 transition-opacity duration-300">
                          <div className="flex justify-between items-baseline">
                            <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{member.full_name}</p>
                          </div>
                          
                        </div>
                        {/* Show Trash explicitly centered/positioned on hover */}
                        {isManager && (
                           <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
                             <Button variant="ghost" size="icon" className="h-7 w-7 bg-rose-50 border border-rose-100 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg shadow-sm transition-all" onClick={() => handleRemoveMember(member.id)}>
                              <Trash2 size={14} className="stroke-[2.5px]" />
                            </Button>
                           </div>
                        )}
                      </div>
                    )})}
                  </div>
                 </div>
              </div>
            </div>

            {/* GAMIFIED RPG STATS BOX -> LIGHT NEON */}
             <div className={`p-4 rounded-3xl border shadow-[0_8px_30px_rgba(0,188,212,0.1)] relative overflow-hidden shrink-0 group transition-all duration-500 ${
                 theme === 'dark' ? 'bg-[#0f172a]/80 border-blue-500/20 shadow-blue-900/40 text-blue-50' : 'bg-white/40 backdrop-blur-2xl text-slate-800 border-[#00BCD4]/30'
              }`}>
              {/* Magic Circle BG decoration */}
              <div className="absolute top-1/2 left-[75%] -translate-y-1/2 w-40 h-40 border-[1px] border-[#00BCD4]/10 rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite] pointer-events-none opacity-60 transition-opacity group-hover:opacity-100">
                <div className="w-32 h-32 border-[1px] border-[#00BCD4]/20 rounded-full border-dashed flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.05)]">
                  <div className="w-24 h-24 border-[1px] border-[#00BCD4]/5 rounded-full"></div>
                </div>
              </div>

              {/* Sparkles */}
              <div className="absolute top-6 left-6 w-1 h-1 bg-[#00BCD4] rounded-full blur-[1px] shadow-[0_0_10px_2px_#00BCD4] animate-pulse"></div>
              <div className="absolute bottom-6 right-16 w-1.5 h-1.5 bg-[#00BCD4]/60 rounded-full blur-[1px] shadow-[0_0_12px_2px_#00BCD4] animate-pulse" style={{animationDelay: '1s'}}></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00BCD4] mb-2 drop-shadow-sm">Statistiques</h3>
                  
                  <div className="flex items-end gap-2 mb-4 mt-1">
                    <div className={`text-5xl font-black leading-none drop-shadow-sm filter transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                       {project.progress_percentage}%
                    </div>
                  </div>
                </div>

                {/* RPG Path/Node Progress Bar */}
                <div className="relative w-full h-6 mb-3 mt-1">
                  {/* Glowing end node / chest */}
                   <div className="absolute right-0 top-[-22px] z-20 text-xl drop-shadow-md filter">
                     🏆
                   </div>

                  {/* Connected Path Line Base */}
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 rounded-full -translate-y-1/2 border border-slate-300 shadow-inner"></div>
                  
                  {/* Progress Line Active */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 rounded-full bg-gradient-to-r from-[#00BCD4] to-[#84ffff] -translate-y-1/2 shadow-[0_0_8px_rgba(0,188,212,0.6)] transition-all duration-1000 origin-left"
                    style={{ width: `${project.progress_percentage}%` }}
                  ></div>
                  
                  {/* Node points */}
                  <div className="absolute inset-0 flex justify-between items-center z-10">
                    {[0, 25, 50, 75, 100].map((nodePoint) => (
                      <div key={nodePoint} className="relative flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full border-[1.5px] transition-all duration-1000 ${project.progress_percentage >= nodePoint ? 'bg-white border-[#00BCD4] shadow-[0_0_8px_rgba(0,188,212,0.6)] scale-125' : 'bg-slate-200 border-slate-300'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] font-bold text-slate-500 flex justify-between uppercase tracking-widest mt-1 border-t border-slate-200 pt-3">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[#00BCD4]">✓</span> {tasks.filter(t => t.status === 'DONE').length} Terminé
                  </span>
                  <span className="flex items-center gap-1.5">
                    {tasks.length} Total <span className="text-[#00BCD4] animate-pulse">✦</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "roadmap" && (
        <ModernRoadmap 
          project={project} 
          tasks={tasks} 
          theme={theme} 
          isGeneratingMilestones={isGeneratingMilestones} 
        />
      )}

      {activeTab === "specification" && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Quick Nav / Meta Sidebar */}
          <div className="w-full lg:w-72 shrink-0 space-y-4">
            <div className={`p-6 rounded-[2rem] border transition-all duration-500 shadow-xl overflow-hidden relative group ${
              theme === 'dark' ? 'bg-[#0f172a]/80 border-blue-500/20 shadow-blue-900/40' : 'bg-white/60 backdrop-blur-xl border-[#00BCD4]/30'
            }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#00BCD4]/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-[#00BCD4]/10 transition-colors" />
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00BCD4] mb-4 flex items-center gap-2">
                <FileText size={14} /> Document Info
              </h4>
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Dernière Mise à jour</p>
                  <p className={`text-xs font-bold transition-colors ${theme === 'dark' ? 'text-blue-100' : 'text-slate-800'}`}>
                    {project.specification ? new Date(project.specification.created_at).toLocaleDateString() : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Méthodologie</p>
                  <p className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg w-fit border border-emerald-500/20">
                    {project.specification?.methodology || 'SCRUM'}
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100/10 space-y-2">
                  <Button variant="outline" className="w-full h-10 text-[10px] font-black gap-2 rounded-xl border-slate-200 hover:bg-[#00BCD4]/10 hover:border-[#00BCD4]/30 transition-all" onClick={handleDownloadPDF}>
                    <Download size={14} /> Télécharger PDF
                  </Button>
                  {isManager && project.specification && (
                    <Button variant="outline" className="w-full h-10 text-[10px] font-black text-rose-500 gap-2 rounded-xl border-rose-100 hover:bg-rose-50 transition-all" onClick={handleDeleteSpec}>
                      <Trash size={14} /> Supprimer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {!project.specification && isManager && (
              <div className={`p-6 rounded-[2rem] border-2 border-dashed transition-all duration-300 flex flex-col items-center text-center group ${
                theme === 'dark' ? 'border-blue-500/20 bg-blue-950/20 hover:border-blue-500/40' : 'border-slate-200 bg-slate-50/50 hover:border-[#00BCD4]/40 hover:bg-white'
              }`}>
                <div className="w-12 h-12 rounded-2xl bg-[#00BCD4]/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <Upload size={24} className="text-[#00BCD4]" />
                </div>
                <h5 className="text-[11px] font-black uppercase tracking-tight mb-2">Importer Spécification</h5>
                <p className="text-[10px] text-slate-400 font-bold mb-4 leading-tight">Glissez un fichier Markdown (.md) pour initialiser le projet.</p>
                <input 
                  type="file" 
                  id="import-spec-sidebar" 
                  className="hidden" 
                  accept=".md,.txt" 
                  onChange={handleImportSpec} 
                  disabled={uploading}
                />
                <Button size="sm" className="w-full h-10 text-[10px] font-black bg-[#00BCD4] hover:bg-[#0097a7] rounded-xl" disabled={uploading}>
                  <label htmlFor="import-spec-sidebar" className="cursor-pointer flex items-center justify-center gap-1.5 w-full h-full">
                    {uploading ? "Importation..." : "Choisir un fichier"}
                  </label>
                </Button>
              </div>
            )}
          </div>

          {/* Main Document Content */}
          <div className={`flex-1 rounded-[2.5rem] border shadow-2xl overflow-hidden transition-all duration-500 relative ${
            theme === 'dark' ? 'bg-[#0f172a]/60 border-blue-500/10' : 'bg-white/70 backdrop-blur-3xl border-white shadow-slate-200/40'
          }`}>
             {/* Header Stripe */}
             <div className="h-1.5 w-full bg-gradient-to-r from-[#00BCD4] to-[#8B5CF6] opacity-80" />
             
             <div className="p-8 lg:p-12">
                <div className="flex justify-between items-start mb-12">
                   <div>
                      <h3 className={`text-3xl font-black tracking-tighter mb-2 transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-900'}`}>Cahier des Charges</h3>
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-[#00BCD4] animate-pulse" />
                         <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Documentation Technique Officielle</p>
                      </div>
                   </div>
                   <div className="hidden sm:block">
                      <div className="px-4 py-2 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center gap-2">
                         <ShieldCheck size={16} className="text-emerald-500" />
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Version 1.0 — IA Approuvée</span>
                      </div>
                   </div>
                </div>

                <div className="prose prose-slate prose-lg max-w-none">
                  {project.specification ? (
                    <div className={`markdown-content leading-relaxed transition-colors ${theme === 'dark' ? 'text-blue-100' : 'text-slate-800'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: Mermaid }}>
                        {project.specification.markdown_content
                          // Remove raw AI section markers that bleed into markdown
                          .replace(/---MILESTONES---[\s\S]*?(?=##|$)/gi, '')
                          .replace(/---METADATA---[\s\S]*?(?=##|---|$)/gi, '')
                          .replace(/---SPEC---/gi, '')
                          .replace(/---BACKUP---[\s\S]*?(?=##|---|$)/gi, '')
                          // Remove raw JSON arrays at end of doc (milestone JSON bleed-through)
                          .replace(/\n\s*\[[\s\S]*?\]\s*$/g, '')
                          .trim()
                        }
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="py-32 text-center flex flex-col items-center justify-center">
                      {isGeneratingSpec ? (
                        <>
                          <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-[#00BCD4]/20 border-t-[#00BCD4] animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Sparkles size={28} className="text-[#00BCD4] animate-pulse" />
                            </div>
                          </div>
                          <h4 className="text-slate-900 dark:text-blue-50 font-black text-xl uppercase tracking-tighter mb-2">Génération en cours...</h4>
                          <p className="max-w-xs text-sm font-bold text-slate-400 leading-snug">L'IA analyse le projet et rédige le cahier des charges. Cela prend quelques secondes.</p>
                          <div className="flex gap-2 mt-4 flex-wrap justify-center">
                            {["Analyse du projet", "Rédaction IA", "Structuration", "Finalisation"].map((l, i) => (
                              <span key={i} className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>{l}</span>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                            <FileText size={40} className="text-slate-200" />
                          </div>
                          <h4 className="text-slate-900 dark:text-blue-50 font-black text-xl uppercase tracking-tighter mb-2">Aucune Documentation</h4>
                          <p className="max-w-xs text-sm font-bold text-slate-400 leading-snug">Ce projet ne possède pas encore de cahier des charges détaillé. Importez-en un pour activer les fonctionnalités IA avancées.</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                {project.specification && (
                   <div className="mt-20 pt-8 border-t border-slate-100/10 flex justify-between items-center opacity-40 grayscale hover:grayscale-0 transition-all">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMA NetInfo — Système de Management Agilisé</p>
                      <div className="flex gap-4">
                         <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Zap size={14} className="text-amber-500 fill-amber-400" />
                         </div>
                         <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <Sparkles size={14} className="text-[#00BCD4]" />
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        </div>
      )}
      <TaskDetailModal
        isOpen={isModalOpen}
        task={selectedTask}
        teamMembers={project.team_members_info}
        onClose={() => setIsModalOpen(false)}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
      <AddTaskModal
        isOpen={isAddTaskOpen}
        initialStatus={addTaskStatus}
        teamMembers={project.team_members_info}
        onClose={() => setIsAddTaskOpen(false)}
        onCreate={handleCreateTask}
      />
    </div>
  )
}
