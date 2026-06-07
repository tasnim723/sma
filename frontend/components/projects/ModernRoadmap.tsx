"use client"

import React, { useMemo, useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CalendarDays, Zap, AlertTriangle, CheckCircle2, CircleDashed, Users, Bot, Rocket, Target, Clock, Activity, Flag, Lock, X, Mail, Send, Check } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import axios from "axios"

interface ModernRoadmapProps {
  project: any
  tasks: any[]
  theme: string
  isGeneratingMilestones: boolean
}

export default function ModernRoadmap({ project, tasks, theme, isGeneratingMilestones }: ModernRoadmapProps) {
  
  const { token, user: currentUser } = useAuthStore()
  const isManager = currentUser?.role === "PROJECT_MANAGER"
  const [membersPopup, setMembersPopup] = useState<{ sprintId: string; members: any[] } | null>(null)
  const [blockagePopup, setBlockagePopup] = useState<{ sprintId: string; blockingTasks: any[] } | null>(null)
  
  // Message box state
  const [messageBox, setMessageBox] = useState<{ userId: string; userName: string; message: string } | null>(null)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [messageSent, setMessageSent] = useState(false)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const sprints = useMemo(() => {
    if (!project?.milestones || project.milestones.length === 0) return []
    
    const sortedMilestones = [...project.milestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let lastEndDate = project.timeline_start 
        ? new Date(project.timeline_start) 
        : new Date(new Date(sortedMilestones[0].date).getTime() - 14 * 24 * 60 * 60 * 1000)

    const baseStartTime = lastEndDate.getTime();
    
    // Find the maximum deadline among all tasks
    const maxTaskTime = tasks.reduce((max: number, t: any) => {
      if (!t.deadline) return max;
      const tTime = new Date(t.deadline).getTime();
      return tTime > max ? tTime : max;
    }, 0);

    const lastMilestoneTime = new Date(sortedMilestones[sortedMilestones.length - 1].date).getTime();
    const shouldStretch = maxTaskTime > lastMilestoneTime;
    const totalOriginalDuration = lastMilestoneTime - baseStartTime;
    const totalTargetDuration = maxTaskTime - baseStartTime;

    return sortedMilestones.map((m, index) => {
      const startDate = new Date(lastEndDate)
      let date = new Date(m.date)

      // Stretch milestone dates if tasks span further than the AI's milestones
      if (shouldStretch && totalOriginalDuration > 0) {
         const originalOffset = date.getTime() - baseStartTime;
         date = new Date(baseStartTime + (originalOffset / totalOriginalDuration) * totalTargetDuration);
      }

      // Fix: Ensure sprint has a minimum duration (e.g., 7 days) if AI generated a short/0-day milestone
      if (date.getTime() - startDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        date = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000)
      }

      lastEndDate = new Date(date) // Save for the next sprint's start date

      const now = new Date()
      const daysUntil = Math.ceil((date.getTime() - now.getTime()) / (1000 * 3600 * 24))

      // Evenly distribute tasks across the sprints based on their logical order
      const tasksPerSprint = Math.ceil(tasks.length / sortedMilestones.length);
      const sprintTasks = tasks.slice(index * tasksPerSprint, (index + 1) * tasksPerSprint);
      
      const totalSprintTasks = sprintTasks.length
      const completedSprintTasks = sprintTasks.filter((t: any) => t.status === "DONE").length
      
      let status = "TODO"
      if (daysUntil < 0) {
        status = completedSprintTasks === totalSprintTasks && totalSprintTasks > 0 ? "COMPLETED" : "OVERDUE"
      } else if (daysUntil <= 14) {
        status = "IN_PROGRESS"
      }
      
      const completionRate = totalSprintTasks > 0 ? completedSprintTasks / totalSprintTasks : 0
      const isAtRisk = status === "IN_PROGRESS" && daysUntil < 5 && completionRate < 0.5
      
      const assigneeSet = new Set<string>()
      sprintTasks.forEach(t => {
        if (t.assignee_ids) {
          t.assignee_ids.forEach((id: string) => assigneeSet.add(id))
        }
      })
      
      const assignees = project.team_members_info ? 
        project.team_members_info.filter((user: any) => assigneeSet.has(user.id)) 
        : []

      const blockingTasks = sprintTasks.filter(t => t.priority === "URGENT" || t.priority === "HIGH")
      const bugs = sprintTasks.filter(t => t.title.toLowerCase().includes('bug') || t.title.toLowerCase().includes('fix') || t.category === 'Testing').length

      const totalSP = sprintTasks.reduce((acc, t) => acc + (t.duration_hours ? Math.ceil(t.duration_hours / 4) : 3), 0)

      let sprintHealth = "GREEN"
      if (status === "OVERDUE") {
        sprintHealth = "RED"
      } else if (status === "IN_PROGRESS") {
        if (isAtRisk) sprintHealth = "RED"
        else if (bugs > 2) sprintHealth = "ORANGE"
      } else if (status === "TODO") {
        sprintHealth = bugs > 2 ? "ORANGE" : "GREEN"
      }

      let iaRisk = null;
      if (status === "OVERDUE") {
        iaRisk = "Sprint en retard. Les tâches inachevées doivent être reportées."
      } else if (sprintHealth === "RED") {
        iaRisk = "Risque de retard critique. Vélocité insuffisante."
      } else if (sprintHealth === "ORANGE") {
        if (bugs > 2) iaRisk = "Charge de correction de bugs élevée."
        else iaRisk = "Charge de travail potentiellement critique."
      }

      return {
        id: `sprint-${index + 1}`,
        name: `Sprint ${index + 1}`,
        goal: m.title,
        startDate: startDate,
        date: date,
        daysUntil,
        status,
        isAtRisk,
        sprintHealth,
        iaRisk,
        totalTasks: totalSprintTasks,
        completedTasks: completedSprintTasks,
        assignees: assignees.slice(0, 4),
        allAssignees: assignees,
        hasDependencies: blockingTasks.length > 0,
        blockingTasks: blockingTasks,
        mainTasks: sprintTasks.slice(0, 3),
        bugs: bugs,
        storyPoints: totalSP
      }
    })
  }, [project?.milestones, project?.team_members_info, tasks])

  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.15 } }
  }
  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  const activeSprint = sprints.find(s => s.status === "IN_PROGRESS") || sprints.find(s => s.status === "TODO")
  const completedSprints = sprints.filter(s => s.status === "COMPLETED").length
  const completedSP = sprints.filter(s => s.status === "COMPLETED").reduce((acc, s) => acc + (s.totalTasks * 3), 0)
  const averageVelocity = completedSprints > 0 ? Math.round(completedSP / completedSprints) : 12

  // Generate AI alert message for a member — uses the sprint the user clicked on
  const generateAIMessage = (userName: string, sprintId?: string) => {
    const targetSprint = sprintId ? sprints.find(s => s.id === sprintId) : activeSprint
    const sprintName = targetSprint?.name || "Sprint actuel"
    const goal = targetSprint?.goal || "les objectifs du projet"
    const tasksCount = targetSprint?.totalTasks || 0
    const completedCount = targetSprint?.completedTasks || 0
    const startStr = targetSprint?.startDate ? new Date(targetSprint.startDate).toLocaleDateString('fr-FR') : ''
    const endStr = targetSprint?.date ? new Date(targetSprint.date).toLocaleDateString('fr-FR') : ''
    const deadlineText = endStr ? ` avant le ${endStr}` : ''
    return `Bonjour ${userName},\n\nJe souhaite attirer votre attention sur le ${sprintName} — objectif : ${goal}.\n\nAvancement actuel : ${completedCount}/${tasksCount} tâches complétées. Merci de mettre à jour l'avancement de vos tâches assignées dans le tableau Kanban afin que l'équipe puisse suivre la progression globale${deadlineText}.\n\nCordialement,\nChef de Projet`
  }

  // Send notification via API
  const handleSendMessage = async () => {
    if (!messageBox || !messageBox.message.trim()) return
    setSendingMessage(true)
    try {
      await axios.post(`${API_BASE_URL}/api/alerts/send`, {
        target_user_id: messageBox.userId,
        title: `📢 Message du Chef de Projet — ${project.name}`,
        message: messageBox.message,
        urgency: "ORANGE"
      }, { headers: { Authorization: `Bearer ${token}` } })
      setMessageSent(true)
      setTimeout(() => {
        setMessageBox(null)
        setMessageSent(false)
      }, 1500)
    } catch (err) {
      console.error("Failed to send notification:", err)
    } finally {
      setSendingMessage(false)
    }
  }

  if (isGeneratingMilestones) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-[#00BCD4]/10 border-t-[#00BCD4] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <Bot size={32} className="text-[#00BCD4] animate-pulse" />
          </div>
        </div>
        <h4 className={`font-black text-xl tracking-widest uppercase mb-3 ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
          IA Générative en cours
        </h4>
        <p className="text-sm font-bold text-slate-400 max-w-sm text-center">
          Analyse des tâches et création automatique des sprints optimisés...
        </p>
      </div>
    )
  }

  if (sprints.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertTriangle size={32} className="mx-auto text-slate-300 mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aucune donnée de roadmap disponible</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8 items-start">
      
      {/* LEFT: Sprints Timeline */}
      <div className="xl:col-span-2 space-y-6 relative">
        <div className="absolute left-[27px] top-6 bottom-10 w-[2px] bg-gradient-to-b from-[#00BCD4]/60 via-slate-200 to-transparent dark:from-[#00BCD4]/40 dark:via-blue-900/40 z-0"></div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
          {sprints.map((sprint, idx) => {
            let dotColor = "bg-slate-200 border-white dark:border-[#0f172a] dark:bg-blue-900/50"
            let bgStyle = "bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-xl"

            if (sprint.status === "COMPLETED") {
              dotColor = "bg-emerald-500 border-white dark:border-[#0f172a]"
              bgStyle = "bg-slate-50/50 dark:bg-[#0f172a]/30 opacity-70"
            } else if (sprint.sprintHealth === "RED" || sprint.status === "OVERDUE") {
              dotColor = "bg-rose-500 border-white dark:border-[#0f172a] shadow-[0_0_15px_rgba(244,63,94,0.8)] animate-pulse"
            } else if (sprint.sprintHealth === "ORANGE") {
              dotColor = "bg-amber-500 border-white dark:border-[#0f172a] shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-pulse"
            } else if (sprint.status === "IN_PROGRESS") {
              dotColor = "bg-[#00BCD4] border-white dark:border-[#0f172a] shadow-[0_0_15px_rgba(0,188,212,0.8)] animate-pulse"
            }

            // Determine animated neon borders and shadows for each sprint status
            let neonAnimate = {}
            let neonTransition = {}
            let borderStyle = ""

            if (sprint.status === "COMPLETED") {
              // Dimmer emerald pulsing neon frame for completed sprints
              neonAnimate = {
                borderColor: [
                  theme === 'dark' ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.25)",
                  theme === 'dark' ? "rgba(16, 185, 129, 0.45)" : "rgba(16, 185, 129, 0.55)",
                  theme === 'dark' ? "rgba(16, 185, 129, 0.15)" : "rgba(16, 185, 129, 0.25)"
                ],
                boxShadow: [
                  "0 4px 20px rgba(0, 0, 0, 0.01)",
                  "0 0 15px rgba(16, 185, 129, 0.12), 0 4px 20px rgba(0, 0, 0, 0.01)",
                  "0 4px 20px rgba(0, 0, 0, 0.01)"
                ]
              }
              neonTransition = {
                borderColor: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }
              borderStyle = "border-2"
            } else if (sprint.status === "IN_PROGRESS") {
              // Bright cybernetic cyan pulsing neon frame for active sprint
              neonAnimate = {
                borderColor: [
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)",
                  theme === 'dark' ? "rgba(0, 188, 212, 0.9)" : "rgba(0, 188, 212, 1)",
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)"
                ],
                boxShadow: [
                  theme === 'dark'
                    ? "0 0 15px rgba(0, 188, 212, 0.15), inset 0 0 5px rgba(0, 188, 212, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.2)"
                    : "0 0 20px rgba(0, 188, 212, 0.2), inset 0 0 8px rgba(0, 188, 212, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.03)",
                  theme === 'dark'
                    ? "0 0 30px rgba(0, 188, 212, 0.5), inset 0 0 10px rgba(0, 188, 212, 0.25), 0 15px 30px -5px rgba(0, 0, 0, 0.3)"
                    : "0 0 35px rgba(0, 188, 212, 0.4), inset 0 0 12px rgba(0, 188, 212, 0.18), 0 15px 30px -5px rgba(0, 0, 0, 0.06)",
                  theme === 'dark'
                    ? "0 0 15px rgba(0, 188, 212, 0.15), inset 0 0 5px rgba(0, 188, 212, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.2)"
                    : "0 0 20px rgba(0, 188, 212, 0.2), inset 0 0 8px rgba(0, 188, 212, 0.08), 0 10px 25px -5px rgba(0, 0, 0, 0.03)"
                ]
              }
              neonTransition = {
                borderColor: { repeat: Infinity, duration: 3, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 3, ease: "easeInOut" }
              }
              borderStyle = "border-2"
            } else {
              // Subtle indigo pulsing neon frame for planned sprints
              neonAnimate = {
                borderColor: [
                  theme === 'dark' ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.2)",
                  theme === 'dark' ? "rgba(99, 102, 241, 0.35)" : "rgba(99, 102, 241, 0.45)",
                  theme === 'dark' ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.2)"
                ],
                boxShadow: [
                  "0 4px 20px rgba(0, 0, 0, 0.01)",
                  "0 0 12px rgba(99, 102, 241, 0.12), 0 4px 20px rgba(0, 0, 0, 0.01)",
                  "0 4px 20px rgba(0, 0, 0, 0.01)"
                ]
              }
              neonTransition = {
                borderColor: { repeat: Infinity, duration: 5, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 5, ease: "easeInOut" }
              }
              borderStyle = "border-2"
            }

            return (
              <motion.div key={sprint.id} variants={itemVariants} className="relative flex gap-6 z-10 group">
                
                <div className="shrink-0 mt-6 relative flex justify-center w-14">
                  <div className={`w-4 h-4 rounded-full border-4 z-10 transition-all duration-500 ${dotColor}`}></div>
                  {sprint.status === "IN_PROGRESS" && (
                     <div className="absolute top-0 w-8 h-8 bg-[#00BCD4]/20 rounded-full blur-md animate-ping"></div>
                  )}
                </div>

                <motion.div
                  animate={neonAnimate}
                  transition={neonTransition}
                  className={`flex-1 rounded-[1.5rem] p-6 transition-all duration-500 hover:shadow-lg relative overflow-hidden ${borderStyle} ${bgStyle}`}
                >
                  {/* Subtle sci-fi grid overlay for active sprint card background */}
                  {sprint.status === "IN_PROGRESS" && (
                    <div className="absolute inset-0 sci-fi-grid opacity-10 pointer-events-none rounded-[1.5rem]" />
                  )}

                  <div className="relative z-10 flex flex-wrap gap-3 justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-3">
                        <h4 className={`text-sm font-black uppercase tracking-widest ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                          {sprint.name}
                        </h4>
                        
                        {sprint.status === "COMPLETED" && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 size={12} /> Terminé
                          </span>
                        )}
                        {sprint.status === "OVERDUE" && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                            <AlertTriangle size={12} className="fill-current" /> En Retard
                          </span>
                        )}
                        {sprint.status === "IN_PROGRESS" && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-[#00BCD4]/10 text-[#00BCD4] border border-[#00BCD4]/20">
                            <Zap size={12} className="fill-current" /> En Cours
                          </span>
                        )}
                        {sprint.status === "TODO" && (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-slate-100 dark:bg-blue-900/30 text-slate-500 dark:text-blue-300">
                            <CircleDashed size={12} /> Planifié
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <CalendarDays size={12} />
                        {sprint.startDate.toLocaleDateString()} — {sprint.date.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {sprint.status === "COMPLETED" ? (
                          "Livré"
                        ) : sprint.status === "OVERDUE" ? (
                          "Délai Dépassé"
                        ) : (
                          sprint.daysUntil > 0 ? `ETA: ${sprint.daysUntil} jours` : "En retard"
                        )}
                      </div>
                      {sprint.isAtRisk && sprint.status !== "OVERDUE" && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                          <AlertTriangle size={12} /> At Risk
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 mb-4">
                     <p className="text-[10px] font-black uppercase tracking-widest text-[#00BCD4] mb-1">Objectif du Sprint</p>
                     <p className={`text-base font-bold leading-relaxed ${sprint.status === "COMPLETED" ? "text-slate-400 dark:text-slate-500" : (theme === 'dark' ? 'text-blue-100' : 'text-slate-700')}`}>
                       {sprint.goal}
                     </p>
                  </div>

                  {sprint.iaRisk && sprint.status !== "COMPLETED" && (
                    <div className={`relative z-10 mb-4 p-2.5 rounded-xl border flex items-start gap-2 ${
                      sprint.sprintHealth === 'RED' ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/30' : 'bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/30'
                    }`}>
                      <Bot size={14} className={`shrink-0 mt-0.5 ${sprint.sprintHealth === 'RED' ? 'text-rose-500' : 'text-amber-500'}`} />
                      <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${sprint.sprintHealth === 'RED' ? 'text-rose-500' : 'text-amber-600'}`}>Alerte IA</p>
                        <p className={`text-[11px] font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{sprint.iaRisk}</p>
                      </div>
                    </div>
                  )}

                  {/* Progress Bar Neon */}
                  <div className="relative z-10 mb-5">
                    <div className="flex justify-between items-end mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                        <Activity size={12} className={sprint.status === "COMPLETED" ? "text-emerald-500" : "text-[#00BCD4]"} /> 
                        Avancement
                      </span>

                      {/* Removed Mini Burndown SVG */}

                      <span className="text-[10px] font-black tracking-widest text-slate-500">
                        {Math.round((sprint.totalTasks > 0 ? sprint.completedTasks / sprint.totalTasks : 0) * 100)}% ({sprint.completedTasks}/{sprint.totalTasks})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-blue-900/30 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          sprint.status === "COMPLETED" 
                            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
                            : sprint.status === "IN_PROGRESS"
                            ? "bg-[#00BCD4] shadow-[0_0_10px_rgba(0,188,212,0.8)]"
                            : "bg-slate-300 dark:bg-blue-600"
                        }`}
                        style={{ width: `${Math.round((sprint.totalTasks > 0 ? sprint.completedTasks / sprint.totalTasks : 0) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Main Tasks Preview */}
                  {sprint.mainTasks.length > 0 && (
                    <div className="relative z-10 mb-5 space-y-1.5">
                      {sprint.mainTasks.map((t: any, i: number) => (
                        <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme === 'dark' ? 'bg-blue-950/20 border-blue-900/40' : 'bg-slate-50 border-slate-100'}`}>
                          <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${t.status === 'DONE' ? 'bg-emerald-500' : t.status === 'IN_PROGRESS' ? 'bg-[#00BCD4]' : 'bg-slate-300'}`} />
                          <p className={`text-[11px] font-bold truncate flex-1 ${t.status === 'DONE' ? 'text-slate-400 line-through' : theme === 'dark' ? 'text-blue-100' : 'text-slate-700'}`}>
                            {t.title}
                          </p>
                          {t.assignee_ids && t.assignee_ids.length > 0 && (
                            <div className="flex -space-x-1 shrink-0">
                              {sprint.allAssignees.filter((u: any) => t.assignee_ids.includes(u.id)).slice(0, 2).map((user: any, ui: number) => (
                                <Avatar key={ui} className="h-4 w-4 border border-white dark:border-[#0f172a] shadow-sm">
                                  <AvatarImage src={user.avatar_url} />
                                  <AvatarFallback className="bg-slate-200 text-[6px] font-black">{user.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-3 pt-4 border-t border-slate-100 dark:border-blue-900/30">
                    
                    <span className="flex items-center gap-1 text-[9px] font-black tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                      <Target size={12} /> {sprint.storyPoints} SP
                    </span>

                    {sprint.bugs > 0 && (
                      <span className="flex items-center gap-1 text-[9px] font-black tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded-lg border border-amber-100 dark:border-amber-900/40">
                        <AlertTriangle size={12} /> {sprint.bugs} BUG{sprint.bugs > 1 ? "S" : ""}
                      </span>
                    )}

                    {sprint.status === "IN_PROGRESS" && (
                      <span className="flex items-center gap-1 text-[9px] font-black tracking-widest text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900/40">
                        <Bot size={12} /> IA: PRÊT
                      </span>
                    )}

                    <button 
                      onClick={() => setMembersPopup({ sprintId: sprint.id, members: sprint.allAssignees })}
                      className="ml-auto flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity group/avatars"
                    >
                      {sprint.assignees.map((user: any, i: number) => (
                        <Avatar key={i} className="h-6 w-6 border-2 border-white dark:border-[#0f172a] shadow-sm group-hover/avatars:scale-110 transition-transform">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-slate-100 text-[8px] font-black text-slate-700">
                            {user.full_name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {sprint.allAssignees.length > 4 && (
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-blue-900/50 border-2 border-white dark:border-[#0f172a] flex items-center justify-center text-[8px] font-black text-slate-500">
                          +{sprint.allAssignees.length - 4}
                        </div>
                      )}
                    </button>

                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* RIGHT: Stratégie IA Panel */}
      <div className="xl:col-span-1 relative">
        <div className={`sticky top-6 rounded-[2rem] border shadow-2xl p-6 overflow-hidden transition-all duration-500 ${
          theme === 'dark' ? 'bg-[#0f172a]/80 border-blue-500/20 shadow-blue-900/40' : 'bg-white/80 backdrop-blur-2xl border-[#00BCD4]/30 shadow-slate-200'
        }`}>
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#00BCD4]/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-[#00BCD4]/10 rounded-xl border border-[#00BCD4]/20">
              <Bot size={20} className="text-[#00BCD4]" />
            </div>
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Project Manager Virtuel</h3>
              <p className={`text-base font-black tracking-tight ${theme === 'dark' ? 'text-blue-50' : 'text-slate-900'}`}>Stratégie IA</p>
            </div>
          </div>

          <div className="space-y-6">
            
            <div className={`p-4 rounded-2xl border relative overflow-hidden ${
              activeSprint?.isAtRisk 
                ? 'bg-rose-50/50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30' 
                : 'bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30'
            }`}>
              <h4 className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-2 ${
                activeSprint?.isAtRisk ? 'text-rose-500' : 'text-emerald-500'
              }`}>
                {activeSprint?.isAtRisk ? <AlertTriangle size={12}/> : <Zap size={12} className="fill-current"/>}
                Analyse Active
              </h4>
              <p className={`text-sm font-semibold leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {activeSprint?.isAtRisk 
                  ? "Risque de débordement détecté sur le sprint actuel. Je recommande de reporter les tâches de faible priorité au prochain sprint."
                  : "La vélocité de l'équipe est excellente. L'objectif du sprint est sur la bonne voie pour être atteint en avance."
                }
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-blue-950/30 border border-slate-100 dark:border-blue-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                  <Activity size={10} /> Vélocité
                </p>
                <p className={`text-lg font-black ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                  {averageVelocity} <span className="text-[10px] text-slate-400">SP/Sprint</span>
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-blue-950/30 border border-slate-100 dark:border-blue-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                  <Users size={10} /> Charge Équipe
                </p>
                <p className="text-lg font-black text-emerald-500">
                  Équilibrée
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-blue-900/30">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                <Rocket size={12} /> Projection MVP
              </h4>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-[#00BCD4]/10 flex items-center justify-center shrink-0">
                  <Flag size={18} className="text-[#00BCD4]" />
                </div>
                <div>
                  <p className={`text-sm font-black ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                    {sprints[sprints.length - 1]?.date.toLocaleDateString() || "Non définie"}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                    Dans {Math.max(0, sprints[sprints.length - 1]?.daysUntil || 0)} jours
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ===== MEMBERS POPUP (Enhanced Neon UI) ===== */}
      {mounted && createPortal(
        <AnimatePresence>
          {membersPopup && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-auto"
              onClick={() => setMembersPopup(null)}
            >
              <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.9, 
                y: 20,
                borderColor: theme === 'dark' ? "rgba(0, 188, 212, 0.2)" : "rgba(0, 188, 212, 0.4)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                borderColor: [
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)",
                  theme === 'dark' ? "rgba(0, 188, 212, 0.8)" : "rgba(0, 188, 212, 0.9)",
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)"
                ],
                boxShadow: [
                  theme === 'dark' 
                    ? "0 0 15px rgba(0, 188, 212, 0.25), inset 0 0 8px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(0, 188, 212, 0.3), inset 0 0 10px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  theme === 'dark' 
                    ? "0 0 35px rgba(0, 188, 212, 0.65), inset 0 0 18px rgba(0, 188, 212, 0.4), 0 25px 30px -5px rgba(0, 0, 0, 0.6)" 
                    : "0 0 40px rgba(0, 188, 212, 0.55), inset 0 0 20px rgba(0, 188, 212, 0.3), 0 25px 30px -5px rgba(0, 0, 0, 0.15)",
                  theme === 'dark' 
                    ? "0 0 15px rgba(0, 188, 212, 0.25), inset 0 0 8px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(0, 188, 212, 0.3), inset 0 0 10px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                ]
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                default: { type: "spring", stiffness: 400, damping: 25 },
                borderColor: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`pointer-events-auto w-full max-w-md mx-4 rounded-[2rem] border-2 shadow-[0_0_40px_rgba(0,188,212,0.3)] overflow-hidden relative ${
                theme === 'dark' ? 'bg-[#0f172a]/95 backdrop-blur-2xl' : 'bg-white/95 backdrop-blur-2xl'
              }`}
            >
              {/* Sci-fi background grid */}
              <div className="absolute inset-0 sci-fi-grid opacity-20 pointer-events-none rounded-[2rem]" />

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-[#00BCD4] to-[#0097A7] p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-white" />
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">
                    Membres du {sprints.find(s => s.id === membersPopup.sprintId)?.name}
                  </h3>
                </div>
                <button onClick={() => setMembersPopup(null)} className="text-white/70 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Members List */}
              <div className="relative z-10 p-5 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {membersPopup.members.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4 font-bold">Aucun membre assigné</p>
                ) : (
                  membersPopup.members.map((user: any, i: number) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,188,212,0.3)] ${
                      theme === 'dark' ? 'border-blue-900/30 hover:bg-blue-950/50 hover:border-[#00BCD4]/50' : 'border-slate-100 hover:bg-slate-50 hover:border-[#00BCD4]/30'
                    }`}>
                      <Avatar className="h-10 w-10 border-2 border-[#00BCD4]/40 shadow-[0_0_10px_rgba(0,188,212,0.2)]">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-[#00BCD4]/10 text-[#00BCD4] text-sm font-black">
                          {user.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                          {user.full_name}
                        </p>
                        <p className="text-[10px] font-bold text-[#00BCD4] uppercase tracking-widest mt-0.5 drop-shadow-[0_0_2px_rgba(0,188,212,0.8)]">
                          {user.role === "PROJECT_MANAGER" ? "Chef de Projet" : "Membre"}
                        </p>
                      </div>
                      {/* Mail icon — opens message box (manager only) */}
                      {isManager && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMembersPopup(null) // Automatically close members popup
                          setMessageBox({
                            userId: user.id,
                            userName: user.full_name,
                            message: generateAIMessage(user.full_name, membersPopup?.sprintId)
                          })
                        }}
                        className="w-8 h-8 rounded-xl bg-[#00BCD4]/10 hover:bg-[#00BCD4] flex items-center justify-center transition-all duration-300 shadow-[0_0_10px_rgba(0,188,212,0.2)] hover:shadow-[0_0_20px_rgba(0,188,212,0.6)] group"
                        title={`Envoyer un message à ${user.full_name}`}
                      >
                        <Mail size={14} className="text-[#00BCD4] group-hover:text-white transition-colors" />
                      </button>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* ===== BLOCKAGE POPUP (no dark overlay) ===== */}
      {mounted && createPortal(
        <AnimatePresence>
          {blockagePopup && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent pointer-events-auto"
              onClick={() => setBlockagePopup(null)}
            >
              <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.9, 
                y: 20,
                borderColor: theme === 'dark' ? "rgba(245, 158, 11, 0.2)" : "rgba(245, 158, 11, 0.4)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                borderColor: [
                  theme === 'dark' ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.5)",
                  theme === 'dark' ? "rgba(245, 158, 11, 0.8)" : "rgba(245, 158, 11, 0.9)",
                  theme === 'dark' ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.5)"
                ],
                boxShadow: [
                  theme === 'dark' 
                    ? "0 0 15px rgba(245, 158, 11, 0.2), inset 0 0 8px rgba(245, 158, 11, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(245, 158, 11, 0.25), inset 0 0 10px rgba(245, 158, 11, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  theme === 'dark' 
                    ? "0 0 35px rgba(245, 158, 11, 0.55), inset 0 0 18px rgba(245, 158, 11, 0.35), 0 25px 30px -5px rgba(0, 0, 0, 0.6)" 
                    : "0 0 40px rgba(245, 158, 11, 0.45), inset 0 0 20px rgba(245, 158, 11, 0.25), 0 25px 30px -5px rgba(0, 0, 0, 0.15)",
                  theme === 'dark' 
                    ? "0 0 15px rgba(245, 158, 11, 0.2), inset 0 0 8px rgba(245, 158, 11, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(245, 158, 11, 0.25), inset 0 0 10px rgba(245, 158, 11, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                ]
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                default: { type: "spring", stiffness: 400, damping: 25 },
                borderColor: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-lg mx-4 rounded-[2rem] border-2 shadow-2xl overflow-hidden relative ${
                theme === 'dark' ? 'bg-[#0f172a]/95 backdrop-blur-2xl' : 'bg-white/95 backdrop-blur-2xl'
              }`}
            >
              {/* Sci-fi background grid */}
              <div className="absolute inset-0 sci-fi-grid opacity-20 pointer-events-none rounded-[2rem]" />

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-amber-500 to-orange-500 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-white" />
                  <h3 className="text-white font-black text-sm uppercase tracking-widest">
                    Blocages — {sprints.find(s => s.id === blockagePopup.sprintId)?.name}
                  </h3>
                </div>
                <button onClick={() => setBlockagePopup(null)} className="text-white/70 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="relative z-10 p-5 space-y-3 max-h-96 overflow-y-auto">
                {blockagePopup.blockingTasks.map((task, i) => (
                  <div key={i} className={`p-4 rounded-xl border transition-all ${
                    theme === 'dark' ? 'border-blue-900/30 bg-blue-950/20' : 'border-slate-100 bg-slate-50/50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${task.priority === "URGENT" ? "bg-rose-500" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black mb-1 ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-slate-400 font-medium leading-relaxed line-clamp-2 mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            task.priority === "URGENT" 
                              ? "bg-rose-500/10 text-rose-500" 
                              : "bg-amber-500/10 text-amber-600"
                          }`}>
                            {task.priority}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            task.status === "DONE" 
                              ? "bg-emerald-500/10 text-emerald-500" 
                              : task.status === "IN_PROGRESS" 
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-slate-100 text-slate-500 dark:bg-blue-900/30 dark:text-blue-300"
                          }`}>
                            {task.status === "DONE" ? "Terminé" : task.status === "IN_PROGRESS" ? "En Cours" : task.status}
                          </span>
                          {task.deadline && (
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                              <Clock size={10} /> {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ===== MESSAGE BOX POPUP ===== */}
      {mounted && createPortal(
        <AnimatePresence>
          {messageBox && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent pointer-events-auto"
              onClick={() => { if (!sendingMessage) { setMessageBox(null); setMessageSent(false) } }}
            >
              <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.9, 
                y: 20,
                borderColor: theme === 'dark' ? "rgba(139, 92, 246, 0.2)" : "rgba(139, 92, 246, 0.4)",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0,
                borderColor: [
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)",
                  theme === 'dark' ? "rgba(139, 92, 246, 0.8)" : "rgba(139, 92, 246, 0.9)",
                  theme === 'dark' ? "rgba(0, 188, 212, 0.3)" : "rgba(0, 188, 212, 0.5)"
                ],
                boxShadow: [
                  theme === 'dark' 
                    ? "0 0 15px rgba(139, 92, 246, 0.25), inset 0 0 8px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                  theme === 'dark' 
                    ? "0 0 35px rgba(0, 188, 212, 0.65), inset 0 0 18px rgba(139, 92, 246, 0.4), 0 25px 30px -5px rgba(0, 0, 0, 0.6)" 
                    : "0 0 40px rgba(0, 188, 212, 0.55), inset 0 0 20px rgba(139, 92, 246, 0.3), 0 25px 30px -5px rgba(0, 0, 0, 0.15)",
                  theme === 'dark' 
                    ? "0 0 15px rgba(139, 92, 246, 0.25), inset 0 0 8px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.5)" 
                    : "0 0 20px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(0, 188, 212, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                ]
              }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                default: { type: "spring", stiffness: 400, damping: 25 },
                borderColor: { repeat: Infinity, duration: 4, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              onClick={(e) => e.stopPropagation()}
              className={`pointer-events-auto w-full max-w-md mx-4 rounded-[2rem] border-2 overflow-hidden relative shadow-[0_0_40px_rgba(139,92,246,0.3)] ${
                theme === 'dark' ? 'bg-[#0f172a]/95 backdrop-blur-2xl' : 'bg-white/95 backdrop-blur-2xl'
              }`}
            >
              <div className="absolute inset-0 sci-fi-grid opacity-20 pointer-events-none rounded-[2rem]" />

              <div className="relative z-10 bg-gradient-to-r from-[#00BCD4] to-[#8B5CF6] p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail size={20} className="text-white" />
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">
                      Envoyer une Alerte
                    </h3>
                    <p className="text-white/70 text-[10px] font-bold mt-0.5">
                      À : {messageBox.userName}
                    </p>
                  </div>
                </div>
                <button onClick={() => { setMessageBox(null); setMessageSent(false) }} className="text-white/70 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="relative z-10 p-5">
                {messageSent ? (
                  <div className="flex flex-col items-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                      <Check size={28} className="text-emerald-500" />
                    </div>
                    <p className={`text-sm font-black ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
                      Notification envoyée !
                    </p>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      {messageBox.userName} recevra cette alerte dans ses notifications.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <Bot size={14} className="text-[#00BCD4]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Message généré par IA — modifiable
                      </span>
                    </div>
                    <textarea
                      value={messageBox.message}
                      onChange={(e) => setMessageBox({ ...messageBox, message: e.target.value })}
                      rows={7}
                      className={`w-full rounded-xl border p-4 text-sm font-medium leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/30 transition-all ${
                        theme === 'dark' 
                          ? 'bg-blue-950/30 border-blue-900/30 text-blue-100' 
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !messageBox.message.trim()}
                      className="mt-4 w-full h-11 bg-gradient-to-r from-[#00BCD4] to-[#0097A7] hover:from-[#0097A7] hover:to-[#00838F] text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={14} /> Envoyer la Notification
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  )
}
