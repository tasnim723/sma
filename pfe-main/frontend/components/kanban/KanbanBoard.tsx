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

  return (
    <div
      onClick={onClick}
      className={`p-4 mb-3 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-[#00BCD4]/30 transition-all group relative border-l-4 border-l-transparent`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-black text-sm text-slate-800 leading-tight group-hover:text-[#00BCD4] line-clamp-1">{task.title}</h4>
        <button className="text-slate-400 hover:text-slate-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical size={14} />
        </button>
      </div>
      
      {task.description && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-tight font-medium">
          {task.description}
        </p>
      )}

      <div className="mt-2 flex flex-col gap-2">
        {task.status === 'REVIEW' && onAIReview && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAIReview(task);
            }}
            disabled={isReviewing}
             className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#00BCD4]/5 text-[#00BCD4] hover:bg-[#00BCD4]/10 active:scale-[0.98] transition-all border border-[#00BCD4]/10 font-black text-[10px] uppercase tracking-widest shadow-none"
            title="Lancer la revue IA"
          >
            {isReviewing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
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
  const columns = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-220px)] custom-scrollbar">
      {columns.map(column => {
        const columnTasks = tasks.filter(t => t.status === column)
        return (
           <div key={column} className="flex-1 min-w-[280px] bg-slate-50/50 flex flex-col rounded-xl border border-slate-100 shadow-tiny overflow-hidden h-full">
            <div className="p-4 flex justify-between items-center bg-white/50 border-b border-slate-50 backdrop-blur-sm">
              <div className="flex items-center gap-2.5">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">{column.replace('_', ' ')}</h3>
                <span className="bg-[#00BCD4]/10 text-[#00BCD4] text-[10px] py-0.5 px-2 rounded-md font-black">
                  {columnTasks.length}
                </span>
              </div>
              {isManager && (
                <button 
                  onClick={() => onAddTask(column)}
                  className="text-slate-300 hover:text-[#00BCD4] hover:bg-white p-1.5 rounded-lg transition-all shadow-tiny border border-transparent hover:border-[#00BCD4]/10"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            
            <div className="p-2 flex-1 overflow-y-auto space-y-0.5 custom-scrollbar bg-white/20">
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
              
              {isManager && (
                 <button 
                  onClick={() => onAddTask(column)}
                  className="w-full py-3 border border-dashed border-slate-200/40 rounded-lg flex items-center justify-center text-slate-300 text-xs font-black uppercase tracking-widest hover:border-[#00BCD4]/30 hover:text-[#00BCD4] hover:bg-white/50 transition-all group"
                >
                  <Plus size={14} className="mr-2" />
                  Ajouter une Tâche
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
