"use client"

import { useEffect, useState } from "react"
import KanbanBoard, { Task } from "@/components/kanban/KanbanBoard"
import TaskDetailModal from "@/components/kanban/TaskDetailModal"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { CheckSquare } from "lucide-react"

export default function GlobalTasksPage() {
  const token = useAuthStore(state => state.token)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [reviewingTaskId, setReviewingTaskId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`http://localhost:8000/api/tasks/me/all`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`http://localhost:8000/api/members/`, { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTasks(tasksRes.data || [])
      setTeamMembers(usersRes.data || [])
    } catch (err) {
      console.error("Error fetching global tasks:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchData()
  }, [token])

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await axios.put(`http://localhost:8000/api/tasks/${taskId}`,
        updates,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.map((t: any) => t._id === taskId ? res.data : t))
    } catch (err) {
      alert("Failed to update task")
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette tâche ?")) return
    try {
      await axios.delete(`http://localhost:8000/api/tasks/${taskId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setTasks(tasks.filter((t: any) => t._id !== taskId))
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

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100/50 rounded-2xl">
            <CheckSquare size={24} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Mes Tâches</h2>
            <p className="text-slate-500 font-medium text-sm">Votre tableau Kanban global personnel à travers tous les projets.</p>
          </div>
        </div>
        <button onClick={fetchData} className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 font-medium">Chargement de vos tâches...</div>
      ) : (
        <div className="bg-transparent h-full">
          <KanbanBoard
            initialTasks={tasks}
            teamMembers={teamMembers}
            onSelectTask={(task) => { setSelectedTask(task); setIsModalOpen(true) }}
            onAddTask={() => { }}
            onAIReview={handleAIReview}
            reviewingTaskId={reviewingTaskId}
          />
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
