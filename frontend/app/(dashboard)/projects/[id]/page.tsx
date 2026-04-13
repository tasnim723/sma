"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import KanbanBoard, { Task } from "@/components/kanban/KanbanBoard"
import TaskDetailModal from "@/components/kanban/TaskDetailModal"
import AddTaskModal from "@/components/kanban/AddTaskModal"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ArrowLeft, UserPlus, Trash2, ShieldCheck, User as UserIcon, Download, Upload, Trash, FileText, LayoutDashboard, Sparkles } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import ReactMarkdown from 'react-markdown'
import mermaid from 'mermaid'
import { BookOpen, Kanban, Users as TeamIcon, CalendarDays, LifeBuoy } from "lucide-react"

interface User {
  id: string
  email: string
  phone_number?: string
  full_name: string
  role: string
  skills: string[]
  xp?: number
  level?: number
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
}

export default function ProjectDetailPage() {
  const { id } = useParams()
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

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'neutral',
      securityLevel: 'loose',
    })
  }, [])

  const Mermaid = ({ node, inline, className, children, ...props }: any) => {
    const code = String(children).replace(/\n$/, '')
    const isMermaid = className === 'language-mermaid'

    useEffect(() => {
      if (isMermaid) {
        mermaid.contentLoaded()
      }
    }, [isMermaid, code])

    if (isMermaid) {
      return <div className="mermaid outline-none border-none py-4 flex justify-center bg-slate-50 rounded-lg my-4">{code}</div>
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  }

  const fetchData = async () => {
    try {
      const [projRes, tasksRes, usersRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:8000/api/tasks/project/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:8000/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
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

  const handleUpdateLead = async (leadId: string | null) => {
    if (!leadId) return
    try {
      const res = await axios.put(`http://localhost:8000/api/projects/${id}`, 
        { lead_id: leadId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProject(res.data)
    } catch (err) {
      alert("Failed to update team lead")
    }
  }

  const handleAddMember = async (userId: string | null) => {
    if (!userId) return
    try {
      const res = await axios.post(`http://localhost:8000/api/projects/${id}/members`, 
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
      const res = await axios.delete(`http://localhost:8000/api/projects/${id}/members/${userId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setProject(res.data)
    } catch (err) {
      alert("Failed to remove team member")
    }
  }

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await axios.put(`http://localhost:8000/api/tasks/${taskId}`, 
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
      const res = await axios.post(`http://localhost:8000/api/projects/${id}/reassign`, {}, {
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
      await axios.delete(`http://localhost:8000/api/tasks/${taskId}`, 
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
      const res = await axios.post(`http://localhost:8000/api/tasks/${task._id}/ai-review`, {}, {
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
      const res = await axios.post(`http://localhost:8000/api/tasks/`,
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
      const response = await axios.get(`http://localhost:8000/api/specifications/${project.specification.id}/pdf`, {
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
      await axios.delete(`http://localhost:8000/api/specifications/${project.specification.id}`, {
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
      await axios.post(`http://localhost:8000/api/specifications/import`, formData, {
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
            <h2 className="text-3xl font-black tracking-tight text-slate-800 leading-none mb-2 truncate">{project.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full text-white shadow-sm ${project.status === 'ON_TRACK' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {project.status.replace('_', ' ')}
              </span>
              <p className="text-slate-500 text-[15px] font-medium truncate max-w-xl">{project.description}</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0 ml-4 mt-1">
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
            className={`px-6 py-3 font-black text-sm transition-colors border-b-2 whitespace-nowrap uppercase tracking-widest flex items-center gap-2.5 ${activeTab === tab.id ? "border-[#00BCD4] text-[#00BCD4]" : "border-transparent text-slate-400 hover:text-slate-600"}`}
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
              teamMembers={allUsers}
              onSelectTask={(task) => { setSelectedTask(task); setIsModalOpen(true) }}
              onAddTask={handleAddTask}
              onAIReview={handleAIReview}
              reviewingTaskId={reviewingTaskId}
            />
          </div>

           <div className="xl:col-span-1 flex flex-col gap-4 min-h-[600px] h-[calc(100vh-200px)]">
            {/* GAMIFIED NEON PASTEL BLUE TEAM BOX -> DARK TEAL NEON */}
            <div className="bg-gradient-to-br from-[#155e75] to-[#164e63] p-3 rounded-3xl border-[1.5px] border-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.4),0_8px_30px_rgba(8,145,178,0.6)] flex flex-col flex-1 min-h-0 relative overflow-hidden group">
              
              {/* Circuit Board Decals / Holographic lines */}
              <div className="absolute top-0 left-4 w-px h-full bg-gradient-to-b from-transparent via-cyan-300/60 to-transparent pointer-events-none"></div>
              <div className="absolute top-10 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent pointer-events-none"></div>
              
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2 shrink-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">
                <ShieldCheck size={14} className="text-cyan-300" /> Équipe du Projet
              </h3>
              
              <div className="flex flex-col flex-1 min-h-0 space-y-3 relative z-10">
                 {/* CHEF DE PROJET */}
                 <div className="shrink-0 p-2 bg-[#083344]/50 backdrop-blur-sm rounded-2xl border border-cyan-500/50 shadow-[inset_0_0_10px_rgba(34,211,238,0.2)] relative transition-all duration-300 hover:border-cyan-300 hover:shadow-[inset_0_0_15px_rgba(34,211,238,0.4)]">
                  <label className="text-[8px] font-black uppercase tracking-widest text-cyan-300 ml-1 flex items-center gap-1.5 mb-1 drop-shadow-[0_0_2px_rgba(34,211,238,0.6)]">
                    Chef de Projet
                  </label>
                  <div>
                    <Select 
                      value={project.lead_id || "unassigned"} 
                      onValueChange={handleUpdateLead}
                      disabled={!isManager}
                    >
                       <SelectTrigger className={`w-full h-auto p-1.5 bg-transparent border-none shadow-none focus:ring-0 hover:bg-[#164e63]/80 rounded-xl transition-all ${isManager ? "cursor-pointer" : "cursor-default"}`}>
                        <div className="flex items-center gap-2.5 w-full text-left">
                          {/* Holographic Gear Avatar */}
                          <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
                            <div className="absolute inset-0 bg-cyan-400 rounded-full blur-[6px] opacity-60 animate-pulse"></div>
                            <div className="absolute inset-0 border-[1.5px] border-dashed border-cyan-300 rounded-full animate-[spin_12s_linear_infinite]"></div>
                            <Avatar className="h-5 w-5 shrink-0 relative z-10 border border-cyan-200 bg-[#083344]">
                               <AvatarFallback className="bg-transparent text-white text-[9px] font-black drop-shadow-[0_0_4px_rgba(34,211,238,1)]">
                                {project.lead_info?.full_name.charAt(0) || "L"}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-white truncate tracking-tight">
                              {project.lead_info?.full_name || "Non assigné"}
                            </p>
                            <p className="text-[8px] text-cyan-200/70 font-bold truncate mt-0.5 uppercase tracking-wider">{project.lead_info?.email}</p>
                          </div>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl">
                        <SelectItem value="unassigned" disabled className="text-slate-400 focus:bg-slate-50">Sélectionner un chef</SelectItem>
                        {allUsers.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs font-bold focus:bg-slate-100 focus:text-slate-900">{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                 {/* MEMBRES */}
                 <div className="flex flex-col flex-1 min-h-0 pt-2 border-t border-cyan-500/30 relative">
                  <div className="flex justify-between items-center mb-2 shrink-0">
                    <label className="text-[9px] font-black uppercase tracking-[0.15em] text-cyan-300 drop-shadow-[0_0_3px_rgba(34,211,238,0.5)] ml-1 flex items-center gap-1.5">Membres</label>
                    {isManager && (
                      <Select onValueChange={handleAddMember}>
                        <SelectTrigger className="w-6 h-6 p-0 border border-cyan-400/50 bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 rounded-lg transition-all focus:ring-0 shadow-[0_0_5px_rgba(34,211,238,0.3)]">
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
                      const userXP = member.xp || 0;
                      const userLevel = member.level || 1;
                      const progress = Math.min(100, Math.max(0, (userXP % 1000) / 10));
                      
                      return (
                      <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-[#083344]/80 rounded-xl group transition-all duration-300 border border-transparent hover:border-cyan-400/50 hover:shadow-[inset_0_0_8px_rgba(34,211,238,0.2)] relative overflow-hidden backdrop-blur-sm">
                        {/* Unified Gamified Shield Icon - Cyber Neon */}
                        <div className="relative w-8 h-8 shrink-0 flex items-center justify-center bg-[#155e75] border-[1.5px] border-amber-400 rounded-[10px] shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#67e8f9" stroke="#22d3ee" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_3px_rgba(34,211,238,0.8)]"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div className="flex-1 min-w-0 transition-opacity duration-300">
                          <div className="flex justify-between items-baseline">
                            <p className="text-[11px] font-bold text-white truncate leading-tight drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">{member.full_name}</p>
                            {/* Hide Niv on hover */}
                            <span className="text-[8px] font-black text-amber-300 bg-amber-900/40 px-1.5 py-0.5 rounded-full border border-amber-500/50 shadow-[0_0_5px_rgba(251,191,36,0.3)] opacity-100 group-hover:opacity-0 transition-opacity duration-300">Niv {userLevel}</span>
                          </div>
                          
                          {/* Mini HP/XP Bar Functional - Hide on hover */}
                          <div className="mt-1.5 flex items-center gap-1.5 opacity-100 group-hover:opacity-0 transition-opacity duration-300">
                            <span className="text-[7px] text-cyan-300 font-black p-0 m-0 drop-shadow-[0_0_3px_rgba(34,211,238,1)]">♥</span>
                            <div className="h-1 flex-1 bg-[#083344] rounded-full flex overflow-hidden border border-cyan-500/30 shadow-inner relative">
                              <div className="h-full bg-gradient-to-r from-amber-400 to-amber-300 shadow-[0_0_5px_rgba(251,191,36,0.6)]" style={{width: `${progress}%`}}></div>
                            </div>
                            <span className="text-[8px] font-bold text-cyan-200 leading-none shrink-0 w-6 text-right drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">{userXP}XP</span>
                          </div>
                        </div>
                        {/* Show Trash explicitly centered/positioned on hover */}
                        {isManager && (
                           <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center">
                             <Button variant="ghost" size="icon" className="h-7 w-7 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg shadow-[0_0_8px_rgba(244,63,94,0.3)] transition-all" onClick={() => handleRemoveMember(member.id)}>
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

            {/* GAMIFIED RPG STATS BOX -> DARK TEAL NEON */}
             <div className="bg-gradient-to-br from-[#164e63] to-[#155e75] text-white p-4 rounded-3xl border-[1.5px] border-cyan-400 shadow-[inset_0_0_20px_rgba(34,211,238,0.3),0_8px_30px_rgba(8,145,178,0.5)] relative overflow-hidden shrink-0 group">
              {/* Magic Circle BG decoration */}
              <div className="absolute top-1/2 left-[75%] -translate-y-1/2 w-40 h-40 border-[1px] border-cyan-300/20 rounded-full flex items-center justify-center animate-[spin_40s_linear_infinite] pointer-events-none opacity-60 transition-opacity group-hover:opacity-100">
                <div className="w-32 h-32 border-[1px] border-cyan-300/40 rounded-full border-dashed flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                  <div className="w-24 h-24 border-[1px] border-cyan-300/10 rounded-full"></div>
                </div>
              </div>

              {/* Sparkles */}
              <div className="absolute top-6 left-6 w-1 h-1 bg-cyan-200 rounded-full blur-[1px] shadow-[0_0_10px_3px_#22d3ee] animate-pulse"></div>
              <div className="absolute bottom-6 right-16 w-1.5 h-1.5 bg-cyan-100 rounded-full blur-[1px] shadow-[0_0_12px_3px_#67e8f9] animate-pulse" style={{animationDelay: '1s'}}></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200 mb-2 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]">Statistiques</h3>
                  
                  <div className="flex items-end gap-2 mb-4 mt-1">
                    <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-100 leading-none drop-shadow-[0_0_10px_rgba(207,250,254,0.3)] filter">
                       {project.progress_percentage}%
                    </div>
                  </div>
                </div>

                {/* RPG Path/Node Progress Bar */}
                <div className="relative w-full h-6 mb-3 mt-1">
                  {/* Glowing end node / chest */}
                   <div className="absolute right-0 top-[-22px] z-20 text-xl drop-shadow-[0_0_6px_rgba(103,232,249,0.8)] filter">
                     🏆
                   </div>

                  {/* Connected Path Line Base */}
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-900 rounded-full -translate-y-1/2 border border-slate-700 shadow-inner"></div>
                  
                  {/* Progress Line Active */}
                  <div 
                    className="absolute top-1/2 left-0 h-1 rounded-full bg-gradient-to-r from-[#00BCD4] to-[#84ffff] -translate-y-1/2 shadow-[0_0_8px_rgba(103,232,249,0.8)] transition-all duration-1000 origin-left"
                    style={{ width: `${project.progress_percentage}%` }}
                  ></div>
                  
                  {/* Node points */}
                  <div className="absolute inset-0 flex justify-between items-center z-10">
                    {[0, 25, 50, 75, 100].map((nodePoint) => (
                      <div key={nodePoint} className="relative flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full border-[1.5px] transition-all duration-1000 ${project.progress_percentage >= nodePoint ? 'bg-white border-cyan-300 shadow-[0_0_8px_rgba(103,232,249,1)] scale-125' : 'bg-slate-900 border-slate-700'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-[9px] font-bold text-cyan-400/80 flex justify-between uppercase tracking-widest mt-1 border-t border-slate-700/50 pt-3">
                  <span className="flex items-center gap-1.5 drop-shadow-[0_0_2px_rgba(34,211,238,0.5)]">
                    <span className="text-cyan-300">✓</span> {tasks.filter(t => t.status === 'DONE').length} Terminé
                  </span>
                  <span className="flex items-center gap-1.5">
                    {tasks.length} Total <span className="text-cyan-300 animate-pulse">✦</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "roadmap" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-black mb-4 flex items-center gap-1.5 uppercase tracking-widest">
              <CalendarDays className="text-[#00BCD4]" size={16} /> Roadmap
            </h3>
            <div className="space-y-4 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50">
              {project.milestones && project.milestones.length > 0 ? (
                project.milestones.map((m, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute left-0 top-1 h-4.5 w-4.5 bg-white border-2 border-[#00BCD4] rounded-full flex items-center justify-center z-10 shadow-sm">
                      <div className="h-1.5 w-1.5 bg-[#00BCD4] rounded-full"></div>
                    </div>
                    <div className="bg-slate-50/50 p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-white transition-all">
                      <h4 className="font-black text-xs text-slate-800">{m.title}</h4>
                      <p className="text-[9px] font-bold text-slate-400 mt-0.5 flex items-center gap-1 uppercase">
                        <CalendarDays size={10} /> {new Date(m.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun jalon défini.</div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm h-fit">
            <h3 className="text-sm font-black mb-3 flex items-center gap-1.5 uppercase tracking-widest">
              <LifeBuoy className="text-amber-500" size={16} /> Stratégie
            </h3>
            <div className="prose prose-sm text-slate-600 max-w-none text-[11px] leading-relaxed">
              {project.backup_plan ? (
                <ReactMarkdown>{project.backup_plan}</ReactMarkdown>
              ) : (
                <p className="text-slate-400 italic">Aucune stratégie alternative documentée.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "specification" && (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm min-h-[400px]">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Cahier des charges</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exigences officielles du projet.</p>
            </div>
            <div className="flex gap-1.5">
              {project.specification ? (
                <>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-black gap-1.5 px-2" onClick={handleDownloadPDF}>
                    <Download size={12} /> PDF
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-[10px] font-black text-red-400 hover:bg-red-50 gap-1.5 px-2 border-red-50" onClick={handleDeleteSpec}>
                    <Trash size={12} /> Supprimer
                  </Button>
                </>
              ) : (
                <div className="relative">
                  <input 
                    type="file" 
                    id="import-spec" 
                    className="hidden" 
                    accept=".md,.txt" 
                    onChange={handleImportSpec} 
                    disabled={uploading}
                  />
                  <Button size="sm" className="h-8 text-[10px] font-black bg-[#00BCD4] hover:bg-[#0097a7] gap-1.5" disabled={uploading}>
                    <label htmlFor="import-spec" className="cursor-pointer flex items-center gap-1.5">
                      <Upload size={14} /> {uploading ? "Import..." : "Importer"}
                    </label>
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="prose prose-slate prose-xs max-w-none">
            {project.specification ? (
              <div className="markdown-content text-xs leading-relaxed">
                <ReactMarkdown components={{ code: Mermaid }}>
                  {project.specification.markdown_content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="py-12 text-center flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-50 rounded-2xl">
                <div className="p-3 bg-slate-50 rounded-full mb-3">
                  <FileText size={24} className="opacity-40" />
                </div>
                <h4 className="text-slate-900 font-black text-xs uppercase tracking-tight">Aucune Documentation</h4>
                <p className="max-w-xs mt-1 text-[10px] font-medium leading-tight">Importez un cahier des charges Markdown pour générer automatiquement les tâches.</p>
              </div>
            )}
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
