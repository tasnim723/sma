"use client"

import { useEffect, useState } from "react"
import { Trash2, AlertTriangle, FolderKanban, Users, CheckCircle2, X, Edit3, Clock, Zap, Plus } from "lucide-react"
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
import LeaderboardWidget from "@/components/gamification/LeaderboardWidget"
import NeuralQuestMap from "@/components/gamification/NeuralQuestMap"

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

  if (loading) return <div className="flex h-40 items-center justify-center font-black text-slate-400">CHARGEMENT DES PROJETS...</div>

  return (
    <div className="relative min-h-0 space-y-3 p-4 md:p-8">
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#00BCD4]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Area */}
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 leading-none mb-2">Projets</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">Gestion & Performance</p>
        </div>

        {isManager && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger 
              render={
                <Button className="bg-[#00BCD4] hover:bg-[#0097a7] text-white shadow-xl shadow-[#00BCD4]/30 rounded-2xl font-black py-6 px-8 text-base h-11 flex items-center gap-2 transition-all hover:scale-105 active:scale-95" />
              }
            >
              <Plus size={18} />
              Nouveau Projet
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 border-none bg-transparent shadow-none [&>button]:hidden">
              <CreateProjectWizard 
                onClose={() => setIsDialogOpen(false)} 
                onSuccess={() => fetchProjects()} 
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* PROJECTS GRID (xl:col-span-9) */}
        <div className="xl:col-span-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map(project => {
          const getStatusDisplay = (status: string) => {
            if (status === 'ON_TRACK') return { label: 'Active Quest', color: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' }
            if (status === 'AT_RISK') return { label: 'Danger Zone', color: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' }
            if (status === 'DELAYED') return { label: 'Critical Path', color: 'text-rose-500', bg: 'bg-rose-500/10', bar: 'bg-rose-500', glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]' }
            return { label: 'Side Quest', color: 'text-sky-500', bg: 'bg-sky-500/10', bar: 'bg-sky-500', glow: 'shadow-[0_0_15px_rgba(14,165,233,0.2)]' }
          }
          const st = getStatusDisplay(project.status)
          let dateStr = 'No deadline'
          if (project.timeline_end) {
            dateStr = new Date(project.timeline_end).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          }
          const totalTasks = project.stats?.total_tasks || 0
          const potentialXP = (totalTasks * 100) + 500;

          return (
            <Link href={`/projects/${project.id}`} key={project.id}>
              <motion.div
                whileHover={{ y: -6, scale: 1.015 }}
                className="group relative flex flex-col min-h-0 rounded-[2rem] overflow-hidden cursor-pointer transition-all duration-300 border border-sky-100/60 shadow-xl"
                style={{ background: 'linear-gradient(160deg, #dff4fb 0%, #e8f7fc 35%, #d6eefc 65%, #cde8f8 100%)' }}
              >
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

                <div className="relative z-20 p-6 flex flex-col gap-4">
                  {/* Status Badge */}
                  <div className="flex items-center">
                    <div className={`px-3 py-1.5 rounded-xl ${st.bg} ${st.color} flex items-center gap-2 backdrop-blur-sm`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${st.bar} animate-pulse`} />
                      <span className="text-[10px] font-black uppercase tracking-wider">{st.label}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-[17px] font-black text-slate-900 leading-tight drop-shadow-sm">
                    {project.name}
                  </h3>

                  {/* XP + Deadline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Récompense</p>
                      <div className="flex items-center gap-1.5 text-violet-700">
                        <Zap size={13} className="fill-violet-600" />
                        <span className="text-sm font-black">+{potentialXP} XP</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Échéance</p>
                      <div className="flex items-center gap-1 justify-end text-slate-700">
                        <Clock size={12} />
                        <span className="text-sm font-black">{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Avancement du projet — Gamified */}
                  <div className="space-y-2 pb-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">⚡ Avancement</span>
                      <span className="text-sm font-black text-[#0097a7]" style={{ textShadow: '0 0 8px rgba(0,188,212,0.5)' }}>{project.progress_percentage}%</span>
                    </div>
                    {/* Orb progress bar */}
                    <div className="flex items-center gap-0.5 bg-black/10 rounded-full px-2 py-1 border border-white/30 backdrop-blur-sm">
                      {Array.from({ length: 10 }).map((_, i) => {
                        const filled = i < Math.round(project.progress_percentage / 10)
                        return (
                          <motion.div
                            key={i}
                            animate={filled ? { scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] } : {}}
                            transition={{ duration: 1.5, delay: i * 0.1, repeat: Infinity }}
                            className="flex-1 h-2 rounded-full transition-all duration-500"
                            style={{
                              background: filled ? '#00d4ff' : 'rgba(0,212,255,0.2)',
                              boxShadow: filled ? '0 0 8px rgba(0,212,255,0.9), 0 0 3px rgba(0,212,255,0.6)' : '0 0 2px rgba(0,212,255,0.2)'
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {isManager && (
                    <div className="flex justify-end gap-2 pt-1 border-t border-white/40">
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl bg-white/60 text-amber-600 hover:bg-white/80 backdrop-blur-sm"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingProject(project); }}>
                        <Edit3 size={14} />
                      </Button>
                      <Button variant="ghost" size="icon"
                        className="h-8 w-8 rounded-xl bg-white/60 text-rose-500 hover:bg-white/80 backdrop-blur-sm"
                        onClick={(e) => handleDeleteProject(e, project.id, project.name)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            </Link>
          )
        })}
        </div>

        {/* WEEKLY LEADERBOARD CARD (xl:col-span-3) - Far right placement */}
        <div className="xl:col-span-3 space-y-4 pt-2">
           <LeaderboardWidget />
        </div>
      </div>

      {/* MODALS */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none rounded-2xl bg-white shadow-2xl">
          <div className="h-2 w-full bg-[#00BCD4]" />
          {editingProject && (
            <div className="p-8 space-y-5">
              <h2 className="text-xl font-black text-[#1e293b]">Modifier Projet</h2>
              <form onSubmit={handleUpdateProject} className="space-y-4">
                <div className="space-y-1.5">
                   <Label className="uppercase text-[10px] font-black text-slate-500">Nom du projet</Label>
                   <Input value={editingProject.name} onChange={(e) => setEditingProject({...editingProject, name: e.target.value})} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                   <Label className="uppercase text-[10px] font-black text-slate-500">Description</Label>
                   <Textarea value={editingProject.description || ''} onChange={(e) => setEditingProject({...editingProject, description: e.target.value})} rows={3} className="font-medium resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                     <Label className="uppercase text-[10px] font-black text-slate-500">Statut</Label>
                     <Select value={editingProject.status} onValueChange={(v) => setEditingProject({...editingProject, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ON_TRACK" className="font-bold">Active Quest ✅</SelectItem>
                          <SelectItem value="AT_RISK" className="font-bold">Danger Zone ⚠️</SelectItem>
                          <SelectItem value="DELAYED" className="font-bold">Critical Path 🔴</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="space-y-1.5">
                     <Label className="uppercase text-[10px] font-black text-slate-500">Progression (%)</Label>
                     <Input type="number" min={0} max={100} value={editingProject.progress_percentage} onChange={(e) => setEditingProject({...editingProject, progress_percentage: Number(e.target.value)})} className="font-bold" />
                  </div>
                </div>
                <div className="space-y-1.5">
                   <Label className="uppercase text-[10px] font-black text-slate-500">Date limite</Label>
                   <Input type="date" value={editingProject.timeline_end ? new Date(editingProject.timeline_end).toISOString().split('T')[0] : ''} onChange={(e) => setEditingProject({...editingProject, timeline_end: e.target.value})} className="font-bold" />
                </div>
                <div className="space-y-1.5">
                   <Label className="uppercase text-[10px] font-black text-slate-500">Chef de projet</Label>
                    <Select value={editingProject.lead_id || ''} onValueChange={(v) => setEditingProject({...editingProject, lead_id: v})}>
                       <SelectTrigger className="font-bold border-slate-200"><SelectValue placeholder="Sélectionner un chef" /></SelectTrigger>
                       <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-2xl rounded-2xl">
                         {members.map(m => (
                           <SelectItem key={m.id} value={m.id} className="font-bold focus:bg-slate-100 focus:text-slate-900 cursor-pointer">
                             {m.full_name}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                   <Button variant="outline" className="font-bold rounded-xl" onClick={() => setEditingProject(null)}>Annuler</Button>
                   <Button type="submit" className="bg-[#00BCD4] hover:bg-[#0097a7] text-white font-black rounded-xl px-6">Enregistrer</Button>
                </div>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] p-8 text-center bg-white rounded-3xl border-none shadow-2xl">
          <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">Confirmer Suppression</h2>
          <p className="text-sm text-slate-500 font-bold mb-6 italic">Supprimer le projet "{projectToDelete?.name}" ?</p>
          <div className="flex gap-4">
             <Button variant="outline" className="flex-1 rounded-xl font-bold" onClick={() => setProjectToDelete(null)}>Annuler</Button>
             <Button className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold" onClick={confirmDeleteProject}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
