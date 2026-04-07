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
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Link href="/projects" className="text-xs font-black text-slate-400 hover:text-[#00BCD4] flex items-center gap-1.5 w-fit uppercase tracking-widest transition-colors mb-2">
          <ArrowLeft size={14} /> Projets
        </Link>
        <div className="flex justify-between items-start">
          <div className="min-w-0">
            <h2 className="text-2xl font-black tracking-tight text-slate-800 leading-none mb-2 truncate">{project.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full text-white ${project.status === 'ON_TRACK' ? 'bg-emerald-500' : 'bg-red-500'}`}>
                {project.status.replace('_', ' ')}
              </span>
              <p className="text-slate-500 text-sm font-medium truncate max-w-md">{project.description}</p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="outline" size="sm" className="h-10 text-xs font-black px-4" onClick={() => window.location.reload()}>Rafraîchir</Button>
            <Button size="sm" className="h-10 text-xs font-black bg-[#00BCD4] hover:bg-[#0097a7] px-4" onClick={() => handleAddTask("BACKLOG")}>+ Tâche</Button>
          </div>
        </div>
      </div>

       <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <KanbanBoard 
              initialTasks={tasks} 
              teamMembers={allUsers}
              onSelectTask={(task) => { setSelectedTask(task); setIsModalOpen(true) }}
              onAddTask={handleAddTask}
              onAIReview={handleAIReview}
              reviewingTaskId={reviewingTaskId}
            />
          </div>

           <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TeamIcon size={14} className="text-[#00BCD4]" /> Équipe du Projet
              </h3>
              
              <div className="space-y-4">
                 <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1.5">Chef de Projet</label>
                  <div className="mt-1">
                    <Select 
                      value={project.lead_id || "unassigned"} 
                      onValueChange={handleUpdateLead}
                      disabled={!isManager}
                    >
                       <SelectTrigger className={`w-full h-auto p-2.5 bg-slate-50 border-slate-100 transition-colors rounded-xl ${isManager ? "hover:bg-white cursor-pointer" : "cursor-default"}`}>
                        <div className="flex items-center gap-3 w-full text-left">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-[#00BCD4] text-white text-xs font-black">
                              {project.lead_info?.full_name.charAt(0) || "L"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900 truncate tracking-tight">{project.lead_info?.full_name || "Non assigné"}</p>
                            <p className="text-[11px] text-slate-500 truncate leading-none">{project.lead_info?.email || "Pas d'email"}</p>
                          </div>
                          {isManager && <div className="text-[10px] font-bold text-[#00BCD4] uppercase">Modifier</div>}
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" disabled>Sélectionner un chef</SelectItem>
                        {allUsers.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                 <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1.5">Membres</label>
                    {isManager && (
                      <Select onValueChange={handleAddMember}>
                        <SelectTrigger className="w-8 h-8 p-0 border-none bg-slate-100 hover:bg-slate-200 rounded-lg">
                          <UserPlus size={14} className="mx-auto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsersToAdd.map(user => (
                            <SelectItem key={user.id} value={user.id} className="text-xs">{user.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                   <div className="space-y-2">
                    {project.team_members_info.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl group transition-all">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px] font-black">{member.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate leading-tight">{member.full_name}</p>
                          <p className="text-[10px] text-slate-400 truncate leading-none">{member.email}</p>
                        </div>
                        {isManager && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleRemoveMember(member.id)}>
                            <Trash2 size={14} className="text-red-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

             <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Statistiques</h3>
                <div className="text-3xl font-black text-[#00BCD4] leading-none mb-3">{project.progress_percentage}%</div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mb-4">
                  <div className="bg-[#00BCD4] h-1.5 rounded-full shadow-[0_0_10px_rgba(0,188,212,0.6)]" style={{ width: `${project.progress_percentage}%` }}></div>
                </div>
                <div className="text-xs font-bold text-slate-400 flex justify-between">
                  <span>{tasks.filter(t => t.status === 'DONE').length} Terminé</span>
                  <span>{tasks.length} Total</span>
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
