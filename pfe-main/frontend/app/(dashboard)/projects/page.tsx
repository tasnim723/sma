"use client"

import { useEffect, useState } from "react"
import { Trash2, AlertTriangle, FolderKanban, Users, CheckCircle2, X } from "lucide-react"
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
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    status: "ON_TRACK",
    progress_percentage: 0,
    timeline_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default to 7 days from now
  })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string, name: string } | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const { token, user } = useAuthStore()
  const isManager = user?.role === "PROJECT_MANAGER"

  const fetchProjects = async () => {
    try {
      const [projRes, membersRes] = await Promise.all([
        axios.get("http://localhost:8000/api/projects/", { headers: { Authorization: `Bearer ${token || ""}` } }),
        axios.get("http://localhost:8000/api/members/", { headers: { Authorization: `Bearer ${token || ""}` } })
      ])
      setProjects(projRes.data)
      setMembers(membersRes.data)
    } catch (err) {
      console.error("Failed to fetch projects")
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
      await axios.put(`http://localhost:8000/api/projects/${editingProject.id}`, {
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post("http://localhost:8000/api/projects/", newProject, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setIsDialogOpen(false)
      setNewProject({
        name: "",
        description: "",
        status: "ON_TRACK",
        progress_percentage: 0,
        timeline_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      fetchProjects()
    } catch (err) {
      alert("Failed to create project. Please ensure all fields are correct.")
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
      await axios.delete(`http://localhost:8000/api/projects/${projectToDelete.id}`, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setProjectToDelete(null)
      fetchProjects()
    } catch (err) {
      alert("Failed to delete project")
    }
  }

  if (loading) return <div className="flex h-40 items-center justify-center">Chargement des projets...</div>

   return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 leading-none mb-1.5">Projets</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">Opérations & Suivi d'équipe</p>
        </div>

        {isManager && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-[#00BCD4] hover:bg-[#0097a7] text-white shadow-lg shadow-[#00BCD4]/20 rounded-xl font-black py-5 px-6 text-base h-12">
                  Nouveau Projet
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

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-2xl bg-white shadow-2xl [&>button]:hidden">
          {/* Top cyan/red gradient line */}
          <div className="h-2 w-full bg-gradient-to-r from-[#00BCD4] to-[#dc2626]" />
          
          {editingProject && (
            <div className="p-8 pt-7 h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-[#e0f7fa] rounded-2xl flex items-center justify-center text-[#00BCD4] shadow-sm">
                      <FolderKanban className="w-7 h-7" />
                   </div>
                   <div>
                      <h2 className="text-[20px] font-black text-[#1e293b] leading-tight">Paramètres du projet</h2>
                      <p className="text-[12px] font-bold text-slate-400 mt-0.5">Modifier la configuration et l'équipe</p>
                   </div>
                </div>
                <button type="button" onClick={() => setEditingProject(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateProject} className="space-y-6">
                <div className="grid gap-2">
                  <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Nom du Projet</Label>
                  <Input 
                    className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-[#1e293b] px-4 shadow-sm" 
                    value={editingProject.name} 
                    onChange={(e) => setEditingProject(p => p ? {...p, name: e.target.value} : null)} 
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Statut</Label>
                    <Select value={editingProject.status} onValueChange={(v) => setEditingProject(p => p ? {...p, status: v || ""} : null)}>
                      <SelectTrigger className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-[#1e293b] px-4 shadow-sm"><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ON_TRACK" className="font-bold">En cours</SelectItem>
                        <SelectItem value="AT_RISK" className="font-bold">À Risque</SelectItem>
                        <SelectItem value="DELAYED" className="font-bold">En retard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500">Date Limite</Label>
                    <Input 
                      type="date" 
                      className="h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold text-[#1e293b] px-4 shadow-sm" 
                      value={editingProject.timeline_end ? new Date(editingProject.timeline_end).toISOString().slice(0, 10) : ""} 
                      onChange={(e) => setEditingProject(p => p ? {...p, timeline_end: e.target.value} : null)} 
                    />
                  </div>
                </div>

                {/* Hide text area visually to keep payload consistent but follow new design */}
                <textarea 
                  className="hidden" 
                  value={editingProject.description || ""} 
                  onChange={(e) => setEditingProject(p => p ? {...p, description: e.target.value} : null)} 
                />
                
                <div className="grid gap-2 hidden">
                  <Label>Avancement (%)</Label>
                  <Input type="number" min="0" max="100" value={editingProject.progress_percentage?.toString() || "0"} onChange={(e) => setEditingProject(p => p ? {...p, progress_percentage: parseInt(e.target.value) || 0} : null)} />
                </div>

                <div className="border border-slate-100/80 rounded-2xl p-5 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#00BCD4]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                  
                  <div className="flex items-center gap-2 mb-6">
                    <Users className="w-5 h-5 text-[#00BCD4]" />
                    <h3 className="font-black text-[15px] text-[#1e293b]">Équipe et Responsabilités</h3>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Team Leader (Chef de projet)</Label>
                      <Select value={editingProject.lead_id || "none"} onValueChange={(v) => setEditingProject(p => p ? { ...p, lead_id: v === "none" ? "" : v } as Project : null)}>
                        <SelectTrigger className="h-12 border-[#e0f7fa] bg-[#e0f7fa]/30 text-[#00BCD4] rounded-xl font-bold shadow-sm px-4">
                          <SelectValue placeholder="-- Aucun Team Leader défini --">
                            {editingProject.lead_id && editingProject.lead_id !== "none"
                              ? members.find(m => m.id === editingProject.lead_id)?.full_name || "Chargement..."
                              : "-- Aucun Team Leader défini --"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="font-bold text-slate-400 italic">-- Aucun Team Leader défini --</SelectItem>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id} className="font-bold">{m.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-3">
                      <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Membres Assignés</Label>
                      <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-2 custom-scrollbar">
                        {members.map(m => {
                          const isSelected = editingProject.team_members?.includes(m.id)
                          return (
                            <label key={m.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-pointer group shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                              <input 
                                type="checkbox"
                                className="w-4 h-4 rounded border-slate-300 text-[#00BCD4] focus:ring-[#00BCD4] focus:ring-offset-0 bg-white shrink-0 cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => {
                                  setEditingProject(p => {
                                    if (!p) return null
                                    const current = p.team_members || []
                                    const updated = e.target.checked ? Array.from(new Set([...current, m.id])) : current.filter(id => id !== m.id)
                                    return { ...p, team_members: updated }
                                  })
                                }}
                              />
                              <div className="w-[36px] h-[36px] rounded-xl bg-[#00BCD4] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                                {m.full_name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-black text-[13px] text-[#1e293b] leading-tight truncate">{m.full_name}</span>
                                <span className="text-[11px] font-bold text-slate-400 leading-tight mt-0.5 truncate">{m.skills?.join(", ") || m.role}</span>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <Button type="button" variant="outline" className="flex-1 h-14 rounded-xl font-black text-slate-600 border-slate-200 hover:bg-slate-50 text-[15px]" onClick={() => setEditingProject(null)}>
                    Annuler
                  </Button>
                  <Button type="submit" className="flex-[1.5] h-14 rounded-xl font-black bg-[#00BCD4] hover:bg-[#0097a7] text-white flex justify-center items-center gap-2 text-[15px] shadow-[0_4px_14px_0_rgba(0,188,212,0.35)]">
                    <CheckCircle2 className="w-[18px] h-[18px]" />
                    Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none rounded-2xl bg-white shadow-2xl [&>button]:hidden">
          {/* Top red header line */}
          <div className="h-1.5 w-full bg-[#dc2626]" />
          
          <div className="p-8 flex flex-col items-center text-center">
            {/* Alert Icon */}
            <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-5 text-[#dc2626] ring-1 ring-red-100 shadow-[0_0_15px_rgba(220,38,38,0.1)]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title */}
            <h2 className="text-[22px] font-black text-[#1e293b] mb-6">Supprimer ce projet ?</h2>

            {/* Project Box */}
            <div className="w-full bg-[#fef2f2] border border-red-100 rounded-xl p-4 flex items-center gap-4 mb-6 shadow-inner">
              <div className="w-12 h-12 bg-[#dc2626] rounded-lg flex items-center justify-center shrink-0 shadow-md">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex flex-col justify-center">
                <span className="font-black text-sm text-[#1e293b] line-clamp-1">{projectToDelete?.name}</span>
                <span className="text-[10px] font-black uppercase text-[#dc2626] tracking-wider mt-0.5">PROJET COMPLET</span>
              </div>
            </div>

            {/* Warning Text */}
            <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-8 px-2">
              Cette action est <span className="font-bold text-[#dc2626]">irréversible</span>. Toutes les tâches associées, l'historique et les affectations seront définitivement supprimés de la plateforme.
            </p>

            {/* Buttons */}
            <div className="w-full flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl py-6 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 text-[15px]"
                onClick={() => setProjectToDelete(null)}
              >
                Annuler
              </Button>
              <Button 
                className="flex-[1.5] rounded-xl py-6 font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white flex items-center justify-center gap-2 text-[15px] shadow-[0_4px_14px_0_rgba(220,38,38,0.39)]"
                onClick={confirmDeleteProject}
              >
                <Trash2 className="w-5 h-5" />
                Supprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold">
            Aucun projet trouvé.
          </div>
        ) : (
          projects.map(project => {
            const getStatusDisplay = (status: string) => {
              if (status === 'ON_TRACK') return { label: 'En cours', color: 'text-[#00BCD4]', bg: 'bg-[#00BCD4]/10', bar: 'bg-[#00BCD4]' }
              if (status === 'AT_RISK') return { label: 'À Risque', color: 'text-amber-500', bg: 'bg-amber-50', bar: 'bg-amber-500' }
              if (status === 'DELAYED') return { label: 'En retard', color: 'text-red-500', bg: 'bg-red-50', bar: 'bg-red-500' }
              return { label: status, color: 'text-[#00BCD4]', bg: 'bg-[#00BCD4]/10', bar: 'bg-[#00BCD4]' }
            }
            const st = getStatusDisplay(project.status)
            
            // Format deadline date if available, else a fallback or "Indéfini"
            let dateStr = 'Indéfini'
            if (project.timeline_end) {
               dateStr = new Date(project.timeline_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            }

            const doneTasks = project.stats?.done_tasks || 0
            const totalTasks = project.stats?.total_tasks || 0

            return (
              <Link href={`/projects/${project.id}`} key={project.id}>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col rounded-xl border-slate-100/60 overflow-hidden group hover:-translate-y-1 bg-white shadow-sm ring-1 ring-slate-100/50">
                  <CardContent className="p-6 flex flex-col h-full relative">
                    <div className="flex justify-between items-start">
                      <div className="p-2 rounded-[10px] bg-[#00BCD4]/10 text-[#00BCD4]">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><path d="M8 10v4"></path><path d="M12 10v4"></path><path d="M16 10v4"></path></svg>
                      </div>
                      <span className={`text-[11px] font-black uppercase px-3 py-1 rounded-full ${st.bg} ${st.color}`}>
                        {st.label}
                      </span>
                    </div>

                    <div className="mt-5 mb-1.5">
                       <h3 className="text-[18px] font-black text-[#1e293b] leading-tight group-hover:text-[#00BCD4] transition-colors line-clamp-2">
                         {project.name}
                       </h3>
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-400 mb-5">
                       <span>{doneTasks}/{totalTasks} tâches terminées</span>
                       <div className="flex items-center gap-1 text-[#00BCD4]">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                         {dateStr}
                       </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[12px] font-bold text-slate-500">Avancement</span>
                        <span className={`text-[12px] font-black ${st.color}`}>{project.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${st.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${project.progress_percentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {isManager && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-slate-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600 transition-colors"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProject(project); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                          onClick={(e) => handleDeleteProject(e, project.id, project.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
