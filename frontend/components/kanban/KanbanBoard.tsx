"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, XCircle, Sparkles, Loader2, Clock, Paperclip } from "lucide-react"
import { useAuthStore } from "@/lib/store"
import axios from "axios"
import { API_BASE_URL } from "@/lib/api"

// ── Types ──────────────────────────────────────────────────────────────────────
export interface Task {
  _id: string; project_id: string; title: string; description?: string
  status: string; priority: string; start_date?: string; deadline?: string
  assignee_ids?: string[]; attachments?: string[]; review_feedback?: string; review_score?: number; votes?: string[]
  is_veille_task?: boolean; category?: string;
}

// ── Regular task card ──────────────────────────────────────────────────────────
const TaskCard = ({ task, teamMembers, onClick, onAIReview, isReviewing, isManager }: {
  task: Task; teamMembers?: any[]; onClick: () => void;
  onAIReview?: (task: Task) => void; isReviewing?: boolean; isManager?: boolean
}) => {
  const s: Record<string, string> = { 
    URGENT: "border-l-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]", 
    HIGH: "border-l-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)]", 
    MEDIUM: "border-l-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.1)]",
    LOW: "border-l-slate-300"
  }

  const hasAttachments = (task.attachments || []).length > 0
  const hasFeedback = !!task.review_feedback
  const _t = task.title.toLowerCase()
  const isVeille = task.is_veille_task
    || task.category === "VEILLE"
    || _t.includes("[veille technologique]")
    || _t.includes("veille technologique")
    || _t.includes("consulter la veille")
    || _t.includes("📡")
    || _t.includes("🌟")

  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ y: -3, boxShadow: isVeille ? "0 0 25px rgba(34, 211, 238, 0.4)" : "0 8px 25px rgba(0,0,0,0.08)" }}
      className={`p-4 mb-3 bg-white/90 backdrop-blur-md rounded-xl border border-slate-100 cursor-pointer transition-all duration-300 group relative border-l-4 ${
        isVeille ? "border-l-cyan-400 border-t-cyan-400/30 border-r-cyan-400/30 border-b-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)] bg-gradient-to-br from-cyan-50/50 to-white" : (s[task.priority] || "border-l-slate-300")
      }`}
    >
      {/* Animated neon edge for Veille tasks */}
      {isVeille && (
        <div className="absolute inset-0 rounded-xl border border-cyan-400 opacity-20 pointer-events-none" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }} />
      )}

      {/* Title */}
      <h4 className={`font-black text-[13px] leading-tight line-clamp-1 mb-1 ${isVeille ? "text-cyan-700 drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]" : "text-slate-800"}`}>
        {task.title}
      </h4>
      
      {/* Description */}
      {task.description && <p className="text-[11px] text-slate-500 line-clamp-2 mb-2.5 leading-tight font-semibold">{task.description.replace(/#+/g, '').trim()}</p>}

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Deadline badge */}
        {task.deadline && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
            <Clock size={9} /> {new Date(task.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </span>
        )}
        
        {/* Attachments count */}
        {hasAttachments && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-[#00BCD4] bg-[#00BCD4]/10 px-2 py-0.5 rounded-full border border-[#00BCD4]/20">
            <Paperclip size={9} /> {task.attachments!.length}
          </span>
        )}
      </div>

      {/* REVIEW column — "REVUE IA" badge */}
      {task.status === "REVIEW" && onAIReview && (
        <motion.button 
          onClick={e => { e.stopPropagation(); onAIReview(task) }} 
          disabled={isReviewing}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-100 to-fuchsia-100 text-purple-700 hover:from-purple-200 hover:to-fuchsia-200 transition-all border border-purple-200/60 font-black text-[10px] uppercase tracking-widest shadow-sm"
        >
          {isReviewing ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} className="text-purple-500" />
          )}
          <span>Revue IA</span>
        </motion.button>
      )}

      {/* AI Feedback indicator on card if rejected (back to IN_PROGRESS with feedback) */}
      {hasFeedback && task.status === "IN_PROGRESS" && (
        <div className="mt-2.5 flex items-start gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100">
          <Sparkles size={11} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-700 font-semibold line-clamp-2 leading-tight">
            {task.review_feedback === 'Could not parse feedback.' || task.review_feedback?.startsWith("Livrable refusé")
              ? (isManager ? "Livrable refusé par l'IA — Le membre doit corriger et resoumettre." : "Livrable refusé — Veuillez corriger et resoumettre.") 
              : task.review_feedback}
          </p>
        </div>
      )}
    </motion.div>
  )
}

// ── Clear Backlog Confirm Modal ────────────────────────────────────────────────
function ClearBacklogModal({ count, onConfirm, onCancel, loading }: {
  count: number; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 backdrop-blur-[2px]"
      />

      {/* Card */}
      <motion.div
        initial={{ scale: 0.88, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 22, stiffness: 320 }}
        className="relative w-full max-w-sm rounded-[2rem] overflow-hidden z-10 backdrop-blur-2xl"
        style={{
          background: "rgba(245,247,250,0.75)",
          boxShadow: "0 0 0 1px rgba(244,63,94,0.25), 0 0 32px rgba(244,63,94,0.12), 0 0 60px rgba(0,188,212,0.08), 0 20px 50px rgba(0,0,0,0.12)",
        }}
      >
        {/* Animated neon top bar */}
        <motion.div
          className="h-[3px] w-full"
          style={{ background: "linear-gradient(90deg, #e63946, #00BCD4, #e63946)" }}
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />

        {/* Corner accents */}
        <div className="absolute top-[3px] left-0 w-8 h-8 border-t-2 border-l-2 border-[#e63946]/60 rounded-tl-[2rem] pointer-events-none" />
        <div className="absolute top-[3px] right-0 w-8 h-8 border-t-2 border-r-2 border-[#00BCD4]/60 rounded-tr-[2rem] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00BCD4]/40 rounded-bl-[2rem] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#e63946]/40 rounded-br-[2rem] pointer-events-none" />

        {/* Glow blobs */}
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-rose-400/8 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-[#00BCD4]/8 rounded-full blur-2xl pointer-events-none" />

        <div className="p-7 relative z-10">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <motion.div
              animate={{ scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{ background: "linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))", border: "1px solid rgba(244,63,94,0.3)", boxShadow: "0 0 20px rgba(244,63,94,0.2)" }}
            >
              <XCircle size={26} className="text-rose-400" />
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{ boxShadow: ["0 0 0px rgba(244,63,94,0)", "0 0 16px rgba(244,63,94,0.4)", "0 0 0px rgba(244,63,94,0)"] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
          </div>

          {/* Text */}
          <div className="text-center mb-6">
            <h3 className="text-[17px] font-black text-slate-800 mb-2 tracking-tight">
              Vider le <span className="text-rose-500">Backlog</span>
            </h3>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Cette action supprimera définitivement{" "}
              <span className="text-slate-800 font-black">{count} tâche{count > 1 ? "s" : ""}</span>{" "}
              du backlog. Cette opération est irréversible.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-5" />

          {/* Buttons */}
          <div className="flex gap-3">
            {/* Cancel */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all duration-200 hover:bg-slate-100"
              style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}
            >
              Annuler
            </motion.button>

            {/* Confirm */}
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(244,63,94,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #e63946, #c1121f)", boxShadow: "0 0 16px rgba(244,63,94,0.35)" }}
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <XCircle size={13} />
              )}
              {loading ? "Suppression..." : "Confirmer"}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main KanbanBoard ───────────────────────────────────────────────────────────
export default function KanbanBoard({
  initialTasks, teamMembers, onSelectTask, onAddTask, onAIReview, reviewingTaskId,
  project, onTasksAccepted,
}: {
  initialTasks: Task[]
  teamMembers?: any[]
  onSelectTask: (task: Task) => void
  onAddTask: (status: string) => void
  onAIReview?: (task: Task) => void
  reviewingTaskId?: string | null
  project?: { id: string; name: string; description: string; stack?: string; duration_weeks?: number; lead_id?: string }
  onTasksAccepted?: () => void
}) {
  const tasks = initialTasks || []
  const { token, user } = useAuthStore()
  const isManager = user?.role === "PROJECT_MANAGER" || user?.role === "MANAGER"
  const canManageTasks = isManager || user?.role === "TEAM_LEAD"
  const columns = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]

  // Clear modal state
  const [showClearModal, setShowClearModal] = useState(false)
  const [clearing, setClearing] = useState(false)

  const getColumnTheme = (col: string) => {
    switch (col) {
      case "BACKLOG":     return { bg: "bg-slate-100/50",  border: "border-slate-200/50",  text: "text-slate-500",  badge: "bg-slate-200 text-slate-700", icon: "🔒", headerBg: "" }
      case "TODO":        return { bg: "bg-sky-50/50",     border: "border-sky-200/50",    text: "text-sky-600",    badge: "bg-sky-200 text-sky-800", icon: "🎯", headerBg: "" }
      case "IN_PROGRESS": return { bg: "bg-orange-50/50",  border: "border-orange-200/50", text: "text-orange-600", badge: "bg-orange-200 text-orange-800 animate-pulse shadow-[0_0_10px_rgba(251,146,60,0.4)]", icon: "🔥", headerBg: "" }
      case "REVIEW":      return { bg: "bg-purple-50/50",  border: "border-purple-200/50", text: "text-purple-600", badge: "bg-purple-200 text-purple-800 shadow-[0_0_10px_rgba(168,85,247,0.3)]", icon: "✨", headerBg: "" }
      case "DONE":        return { bg: "bg-emerald-50/50", border: "border-emerald-200/50",text: "text-emerald-600",badge: "bg-emerald-200 text-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.3)]", icon: "🏆", headerBg: "" }
      default:            return { bg: "bg-slate-50/50",   border: "border-slate-100",     text: "text-slate-400",  badge: "bg-slate-200 text-slate-500", icon: "📌", headerBg: "" }
    }
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 min-h-[600px] h-[calc(100vh-200px)]">
        {columns.map(column => {
          const isTodo = column === "TODO"
          const colTasks = isTodo
            ? tasks.filter(t => t.status === "TODO").sort((a, b) => {
                const w: Record<string, number> = { "URGENT": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1 }
                return (w[b.priority] || 0) - (w[a.priority] || 0)
              })
            : tasks.filter(t => t.status === column)
          const theme = getColumnTheme(column)

          return (
            <div key={column}
              className={`flex-1 min-w-[280px] lg:min-w-0 ${theme.bg} rounded-[1.5rem] border ${theme.border} flex flex-col shadow-sm relative overflow-hidden h-full transition-all duration-500`}>
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white/60 to-transparent pointer-events-none opacity-50" />

              {/* Column header */}
              <div className="p-4 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{theme.icon}</span>
                  <h3 className={`font-black text-[11px] uppercase tracking-[0.15em] ${theme.text}`}>{column.replace("_", " ")}</h3>
                </div>
                <div className={`text-[10px] py-1 px-2.5 rounded-full font-black ${theme.badge}`}>
                  {colTasks.length}
                </div>
              </div>

              <div className="p-3 flex-1 overflow-y-auto relative z-10 w-full">
                {/* Regular tasks */}
                <AnimatePresence>
                  {colTasks.map((task, i) => (
                    <motion.div
                      key={task._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <TaskCard 
                        task={task} 
                        teamMembers={teamMembers}
                        onClick={() => onSelectTask(task)} 
                        onAIReview={onAIReview}
                        isReviewing={reviewingTaskId === task._id} 
                        isManager={isManager}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add task button — all columns except REVIEW and DONE */}
                {canManageTasks && column !== "REVIEW" && column !== "DONE" && (
                  <button onClick={() => onAddTask(column)}
                    className="w-full py-3 mt-3 bg-white/40 border-2 border-dashed border-[#00BCD4]/40 rounded-xl flex items-center justify-center text-[#00BCD4] text-[11px] font-black uppercase tracking-widest hover:border-[#00BCD4] hover:bg-[#00BCD4] hover:text-white hover:shadow-[0_4px_15px_rgba(0,188,212,0.3)] transition-all opacity-80 hover:opacity-100 group">
                    <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform duration-300" /> Ajouter une tâche
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Clear TODO Modal */}
      <AnimatePresence>
        {showClearModal && (
          <ClearBacklogModal
            count={tasks.filter(t => t.status === "TODO").length}
            loading={clearing}
            onCancel={() => setShowClearModal(false)}
            onConfirm={async () => {
              setClearing(true)
              try {
                const todo = tasks.filter(t => t.status === "TODO")
                for (const t of todo) {
                  await axios.delete(`${API_BASE_URL}/api/tasks/${t._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  })
                }
                onTasksAccepted?.()
                setShowClearModal(false)
              } catch (err) { console.error(err) }
              finally { setClearing(false) }
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
