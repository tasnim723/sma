"use client"
import { API_BASE_URL } from "@/lib/api"

import { useEffect, useState } from "react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ListTodo } from "lucide-react"
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"
import TaskDetailModal from "@/components/kanban/TaskDetailModal"
import { Task } from "@/components/kanban/KanbanBoard"
import { useLang } from "@/lib/useLang"

export default function CalendarPage() {
  const token = useAuthStore(state => state.token)
  const { t, lang } = useLang()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/tasks/me/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE_URL}/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTasks(tasksRes.data || [])
      setTeamMembers(usersRes.data || [])
    } catch (err) {
      console.error("Error fetching tasks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchData()
  }, [token])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/api/tasks/${taskId}`, 
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.map((t: any) => t._id === taskId ? res.data : t))
    } catch (err) {
      alert("Failed to update task")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return
    try {
      await axios.delete(`${API_BASE_URL}/api/tasks/${taskId}`, 
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.filter((t: any) => t._id !== taskId))
      setIsModalOpen(false)
    } catch (err) {
      alert("Failed to delete task")
    }
  }

  const renderHeader = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <CalendarIcon className="text-blue-600" size={24}/> 
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors bg-white">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>
    )
  }

  const renderDays = () => {
    const dateFormat = "EEEE"
    const days = []
    let startDate = startOfWeek(currentMonth)

    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="flex-1 text-center font-bold text-xs uppercase tracking-widest text-slate-400 py-3" key={i}>
          {format(addDays(startDate, i), dateFormat)}
        </div>
      )
    }
    return <div className="flex bg-slate-50 rounded-t-2xl border border-slate-200 border-b-0">{days}</div>
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const dateFormat = "d"
    const rows = []
    let days = []
    let day = startDate
    let formattedDate = ""

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat)
        const cloneDay = day

        // Find tasks for this day
        const dayTasks = tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), cloneDay))

        days.push(
          <div
            className={`flex-1 min-h-[120px] p-2 border border-slate-100 bg-white transition-all 
              ${!isSameMonth(day, monthStart) ? "opacity-40 bg-slate-50" : "hover:bg-slate-50"}
            `}
            key={day.toString()}
          >
            <div className="text-right">
              <span className={`text-xs font-bold inline-flex items-center justify-center w-6 h-6 rounded-full ${isSameDay(day, new Date()) ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>
                {formattedDate}
              </span>
            </div>
            <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
              {dayTasks.map(task => {
                const isDone = task.status === "DONE"
                return (
                  <div 
                    key={task._id} 
                    onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                    className={`text-[10px] p-1.5 px-2 rounded-lg cursor-pointer truncate font-semibold border shadow-sm transition-transform hover:scale-[1.02]
                      ${isDone 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                        : "bg-rose-50 text-rose-700 border-rose-100"}`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <ListTodo size={10} className="shrink-0" />
                      <span className="truncate">{task.title}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
        day = addDays(day, 1)
      }
      rows.push(
        <div className="flex w-full min-h-[120px]" key={day.toString()}>
          {days}
        </div>
      )
      days = []
    }
    return <div className="border border-slate-200 rounded-b-2xl bg-white overflow-hidden shadow-sm">{rows}</div>
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100/50 rounded-2xl">
               <CalendarIcon size={24} className="text-blue-600" />
            </div>
            <div>
               <h2 className="text-2xl font-bold text-slate-800">{lang === 'fr' ? 'Mes Échéances' : 'My Deadlines'}</h2>
               <p className="text-slate-500 font-medium text-sm">{lang === 'fr' ? 'Suivez vos prochaines livraisons.' : 'Keep track of your upcoming task deliveries.'}</p>
            </div>
         </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">{lang === 'fr' ? 'Chargement du calendrier...' : 'Loading calendar...'}</div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 max-w-6xl mx-auto">
          {renderHeader()}
          {renderDays()}
          {renderCells()}
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          isOpen={isModalOpen}
          task={selectedTask}
          teamMembers={teamMembers}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  )
}
