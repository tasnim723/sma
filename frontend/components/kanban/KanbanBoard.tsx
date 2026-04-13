"use client"

import React, { useState } from "react"
import { Calendar, Paperclip, MoreVertical, Plus, Sparkles, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/lib/store"

export interface Task {
  _id: string
  project_id: string
  title: string
  description?: string
  status: string
  priority: string
  deadline?: string
  assignee_ids?: string[]
  attachments?: string[]
  review_feedback?: string
}

const TaskCard = ({ task, teamMembers, onClick, onAIReview, isReviewing }: { 
  task: Task, 
  teamMembers?: any[], 
  onClick: () => void,
  onAIReview?: (task: Task) => void,
  isReviewing?: boolean
}) => {
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === "PROJECT_MANAGER"

  // Rarity based on priority
  const getRarityStyle = (priority: string) => {
    switch(priority) {
      case 'URGENT': return 'border-l-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)] hover:shadow-[0_0_15px_rgba(244,63,94,0.25)]'
      case 'HIGH': return 'border-l-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.1)] hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]'
      case 'MEDIUM': return 'border-l-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.1)] hover:shadow-[0_0_15px_rgba(56,189,248,0.25)]'
      default: return 'border-l-slate-300 hover:border-l-slate-400'
    }
  }

  // Determine an estimated XP value for the task (visual only)
  const taskXP = task.priority === 'URGENT' ? 500 : task.priority === 'HIGH' ? 300 : task.priority === 'MEDIUM' ? 150 : 50;

  return (
    <div
      onClick={onClick}
      className={`p-4 mb-3 bg-white/90 backdrop-blur-md rounded-xl border border-slate-100 cursor-pointer transition-all duration-300 group relative border-l-4 ${getRarityStyle(task.priority)} hover:-translate-y-1`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-black text-[13px] text-slate-800 leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-800 group-hover:to-slate-500 line-clamp-1">{task.title}</h4>
      </div>
      
      {task.description && (
        <p className="text-[11px] text-slate-500 line-clamp-2 mb-3 leading-tight font-semibold">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Gamified XP Indicator */}
            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">
               <span className="text-[9px] font-black text-amber-500">+{taskXP} XP</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {(() => {
              if (teamMembers && task.assignee_ids && task.assignee_ids.length > 0) {
                const member = teamMembers.find((m: any) => m.id === task.assignee_ids![0]);
                return (
                  <div className="relative group/avatar">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00BCD4] to-[#3b82f6] p-[2px] shadow-sm">
                      <div className="w-full h-full bg-white rounded-[6px] flex items-center justify-center text-[10px] font-black text-slate-800">
                        {member ? member.full_name.charAt(0) : 'U'}
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <div className="w-6 h-6 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 opacity-50">
                  <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                </div>
              )
            })()}
          </div>
        </div>

        {task.status === 'REVIEW' && onAIReview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIReview(task);
            }}
            disabled={isReviewing}
             className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 text-purple-600 hover:from-purple-500/20 hover:to-fuchsia-500/20 active:scale-[0.98] transition-all border border-purple-500/20 font-black text-[10px] uppercase tracking-widest"
            title="Lancer la revue IA"
          >
            {isReviewing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} className="text-purple-500" />
            )}
            <span>Revue IA</span>
          </button>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ initialTasks, teamMembers, onSelectTask, onAddTask, onAIReview, reviewingTaskId }: { 
  initialTasks: Task[], 
  teamMembers?: any[],
  onSelectTask: (task: Task) => void,
  onAddTask: (status: string) => void,
  onAIReview?: (task: Task) => void,
  reviewingTaskId?: string | null
}) {
  const tasks = initialTasks || []
  const user = useAuthStore(state => state.user)
  const isManager = user?.role === "PROJECT_MANAGER"
  const columns = isManager ? ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"] : ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]

  const getColumnTheme = (col: string) => {
    switch (col) {
      case 'BACKLOG':
        return { bg: 'bg-slate-100/50', border: 'border-slate-200/50', text: 'text-slate-500', badge: 'bg-slate-200 text-slate-700', icon: '🔒' }
      case 'TODO':
        return { bg: 'bg-sky-50/50', border: 'border-sky-200/50', text: 'text-sky-600', badge: 'bg-sky-200 text-sky-800', icon: '🎯' }
      case 'IN_PROGRESS':
        return { bg: 'bg-orange-50/50', border: 'border-orange-200/50', text: 'text-orange-600', badge: 'bg-orange-200 text-orange-800 animate-pulse shadow-[0_0_10px_rgba(251,146,60,0.4)]', icon: '🔥' }
      case 'REVIEW':
        return { bg: 'bg-purple-50/50', border: 'border-purple-200/50', text: 'text-purple-600', badge: 'bg-purple-200 text-purple-800 shadow-[0_0_10px_rgba(168,85,247,0.3)]', icon: '✨' }
      case 'DONE':
        return { bg: 'bg-emerald-50/50', border: 'border-emerald-200/50', text: 'text-emerald-600', badge: 'bg-emerald-200 text-emerald-800 shadow-[0_0_10px_rgba(16,185,129,0.3)]', icon: '🏆' }
      default:
        return { bg: 'bg-slate-50/50', border: 'border-slate-100', text: 'text-slate-400', badge: 'bg-slate-200 text-slate-500', icon: '📌' }
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 min-h-[600px] h-[calc(100vh-200px)]">
      {columns.map(column => {
        const columnTasks = tasks.filter(t => t.status === column)
        const theme = getColumnTheme(column)

        return (
           <div key={column} className={`flex-1 min-w-[280px] lg:min-w-0 ${theme.bg} rounded-[1.5rem] border ${theme.border} flex flex-col shadow-sm relative overflow-hidden h-full group/col transition-all duration-500`}>
            {/* Dynamic Column Background Glow */}
            <div className={`absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-white/60 to-transparent pointer-events-none opacity-50`}></div>

            <div className="p-4 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[16px] drop-shadow-sm">{theme.icon}</span>
                <h3 className={`font-black text-[11px] uppercase tracking-[0.15em] ${theme.text}`}>
                  {column.replace('_', ' ')}
                </h3>
              </div>
              <div className={`text-[10px] py-1 px-2.5 rounded-full font-black ${theme.badge}`}>
                {columnTasks.length}
              </div>
            </div>
            
            <div className="p-3 flex-1 overflow-y-auto space-y-2 relative z-10 w-full">
              {columnTasks.map(task => (
                <TaskCard 
                  key={task._id} 
                  task={task} 
                  teamMembers={teamMembers}
                  onClick={() => onSelectTask(task)}
                  onAIReview={onAIReview}
                  isReviewing={reviewingTaskId === task._id}
                />
              ))}
              
              {isManager && column !== 'REVIEW' && column !== 'DONE' && (
                 <button 
                  onClick={() => onAddTask(column)}
                  className={`w-full py-3.5 border-2 border-dashed border-white/60 rounded-xl flex items-center justify-center text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-${theme.text.split('-')[1]}-300 hover:${theme.text} hover:bg-white/40 transition-all duration-300 opacity-60 hover:opacity-100 group`}
                >
                  <Plus size={14} className="mr-2 group-hover:scale-125 transition-transform" />
                  Ajouter une Quête
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
