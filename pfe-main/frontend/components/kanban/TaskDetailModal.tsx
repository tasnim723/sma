"use client"

import React, { useState, useEffect, ChangeEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Paperclip, Clock, Trash2, X, Plus, FileText, Download, Upload } from "lucide-react"
import { Task } from "./KanbanBoard"
import { format } from "date-fns"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

interface TaskDetailModalProps {
  task: Task | null
  isOpen: boolean
  teamMembers: any[]
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
}

export default function TaskDetailModal({ task, isOpen, teamMembers, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [editedTask, setEditedTask] = useState<Partial<Task>>({})
  const [newAttachment, setNewAttachment] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const token = useAuthStore(state => state.token)
  const user = useAuthStore(state => state.user)
  const [isAiReviewing, setIsAiReviewing] = useState(false)
  const isManager = user?.role === "PROJECT_MANAGER"
  const isAssigned = task?.assignee_ids?.includes(user?.id as string) || false

  useEffect(() => {
    if (task) {
      setEditedTask({ ...task })
    }
  }, [task])

  if (!task) return null

  const handleSave = () => {
    onUpdate(task._id, editedTask)
    onClose()
  }

  const handleAIReview = async () => {
    if (!task) return
    setIsAiReviewing(true)
    try {
      const res = await axios.post(`http://localhost:8000/api/tasks/${task._id}/ai-review`, {}, {
        headers: { "Authorization": `Bearer ${token || ""}` }
      })
      setEditedTask({ ...res.data })
      onUpdate(task._id, res.data)
    } catch (err) {
      alert("La revue IA a échoué")
    } finally {
      setIsAiReviewing(false)
    }
  }

  const handleAddAttachment = () => {
    if (newAttachment.trim()) {
      const updatedAttachments = [...(editedTask.attachments || []), newAttachment.trim()]
      setEditedTask({ ...editedTask, attachments: updatedAttachments, status: "REVIEW" })
      setNewAttachment("")
      onUpdate(task._id, { status: "REVIEW", attachments: updatedAttachments })
    }
  }

  const removeAttachment = (index: number) => {
    const updatedAttachments = (editedTask.attachments || []).filter((_, i) => i !== index)
    setEditedTask({ ...editedTask, attachments: updatedAttachments })
  }

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && task) {
      const file = e.target.files[0]
      const formData = new FormData()
      formData.append("file", file)
      formData.append("task_id", task._id)
      formData.append("project_id", task.project_id)
      
      setIsUploading(true)
      try {
        await axios.post("http://localhost:8000/api/upload/", formData, {
          headers: {
            "Authorization": `Bearer ${token || ""}`,
            "Content-Type": "multipart/form-data"
          }
        })
        const updatedAttachments = [...(editedTask.attachments || []), file.name]
        setEditedTask({ ...editedTask, attachments: updatedAttachments, status: "REVIEW" })
        onUpdate(task._id, { status: "REVIEW", attachments: updatedAttachments })
      } catch (err) {
        alert("L'upload du fichier a échoué")
      } finally {
        setIsUploading(false)
        e.target.value = ""
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        <div className="bg-slate-50 p-6 border-b border-slate-200">
          <DialogHeader>
            <div className="flex justify-between items-start pr-8">
               <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                 {task.title}
               </DialogTitle>
            </div>
            <DialogDescription className="text-slate-500 mt-1 flex items-center gap-2">
              <Clock size={14} /> Dans la colonne <span className="font-bold text-blue-600">{task.status}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          {/* AI Review Feedback if exists */}
          {editedTask.review_feedback && (
            <div className={`p-4 rounded-xl border flex flex-col gap-2 ${editedTask.status === 'DONE' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                 <div className={`p-1 rounded ${editedTask.status === 'DONE' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>AI</div> 
                 Retour de l'Agent de Revue
              </div>
              <p className="text-sm italic">"{editedTask.review_feedback}"</p>
            </div>
          )}

          {/* Description Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
               <FileText size={18} className="text-blue-600" /> Description
            </div>
            <Textarea
              disabled={!isManager}
              className="min-h-[120px] bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-colors text-sm leading-relaxed"
              placeholder="Ajouter une description plus détaillée..."
              value={editedTask.description || ""}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setEditedTask({ ...editedTask, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            {/* Priority and Deadline */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  Priorité
               </div>
                <Select 
                  disabled={!isManager}
                  value={(editedTask.priority as string) || "MEDIUM"} 
                  onValueChange={(v: string | null) => v && setEditedTask({ ...editedTask, priority: v })}
                >
                 <SelectTrigger className="bg-slate-50 border-slate-200">
                   <SelectValue placeholder="Priorité" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="LOW">Basse</SelectItem>
                   <SelectItem value="MEDIUM">Moyenne</SelectItem>
                   <SelectItem value="HIGH">Haute</SelectItem>
                   <SelectItem value="URGENT">Urgente</SelectItem>
                 </SelectContent>
               </Select>
            </div>

            <div className="space-y-3">
               <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  Échéance
               </div>
               <Input
                 disabled={!isManager}
                 type="date"
                 className="bg-slate-50 border-slate-200"
                 value={editedTask.deadline ? (editedTask.deadline as string).split('T')[0] : ""}
                 onChange={(e: ChangeEvent<HTMLInputElement>) => setEditedTask({ ...editedTask, deadline: e.target.value })}
               />
            </div>
          </div>

          {/* Assignees Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
                  <Clock size={18} className="text-blue-600" /> Assignés
               </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {editedTask.assignee_ids?.map((a_id: string) => {
                const member = teamMembers.find((m: any) => m.id === a_id)
                return (
                  <div key={a_id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 text-xs font-bold shadow-sm">
                    <span className="truncate max-w-[100px]">{member?.full_name || "Inconnu"}</span>
                    {isManager && (
                      <button onClick={() => {
                         const updated = (editedTask.assignee_ids || []).filter((id: string) => id !== a_id)
                         setEditedTask({...editedTask, assignee_ids: updated})
                      }} className="hover:text-red-500 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
              {isManager && (
                <Select onValueChange={(val: string | null) => {
                  if (val && !editedTask.assignee_ids?.includes(val)) {
                    setEditedTask({...editedTask, assignee_ids: [...(editedTask.assignee_ids || []), val]})
                  }
                }}>
                  <SelectTrigger className="w-fit h-8 rounded-full border-dashed border-2 px-3 text-[10px] font-bold text-slate-400">
                    <Plus size={14} className="mr-1" /> Ajouter un membre
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.filter((m: any) => !editedTask.assignee_ids?.includes(m.id as string)).map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Attachments Section (Délivrables) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wider">
                  <Paperclip size={18} className="text-blue-600" /> Attachments (Délivrables)
               </div>
            </div>
            
            <div className="space-y-2">
               {editedTask.attachments?.map((file, idx) => (
                 <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group hover:bg-slate-100 transition-colors">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                         <FileText size={16} />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-slate-800 truncate max-w-[300px]">{file}</p>
                      </div>
                   </div>
                   {isAssigned && (
                     <button 
                       onClick={() => removeAttachment(idx)}
                       className="p-1 px-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                     >
                       <Trash2 size={14} />
                     </button>
                   )}
                 </div>
               ))}
            </div>

            {isAssigned && (
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ajouter un lien ou un nom de livrable..."
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    className="bg-slate-50 border-slate-200 text-sm"
                  />
                  <Button onClick={handleAddAttachment} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                    <Plus size={16} className="mr-2" /> Ajouter Lien
                  </Button>
                </div>
                
                <div className="flex items-center mt-2">
                   <Label htmlFor={`file-upload-${task._id}`} className={`cursor-pointer inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                     <Upload size={16} /> {isUploading ? "Upload en cours..." : "Téléverser un Fichier"}
                   </Label>
                   <Input 
                     id={`file-upload-${task._id}`} 
                     type="file" 
                     className="hidden" 
                     onChange={handleFileUpload} 
                     disabled={isUploading}
                   />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-200 flex sm:justify-between items-center sm:gap-2">
          <div className="flex items-center gap-4">
            {isManager && (
              <Button 
                variant="ghost" 
                onClick={() => onDelete(task._id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold border border-transparent hover:border-red-100 rounded-xl"
              >
                <Trash2 size={16} className="mr-2" /> Supprimer la Tâche
              </Button>
            )}
            {isManager && task.status === "REVIEW" && (
              <div className="flex gap-2 bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                <Button onClick={() => { onUpdate(task._id, {status: "DONE"}); onClose(); }} className="bg-emerald-500 hover:bg-emerald-600 shadow-sm text-white h-9 px-4 text-xs font-bold rounded-lg transition-colors">👍 Approuver</Button>
                <Button onClick={() => { onUpdate(task._id, {status: "IN_PROGRESS"}); onClose(); }} variant="ghost" className="text-red-600 hover:bg-red-50 h-9 px-4 text-xs font-bold rounded-lg transition-colors bg-white shadow-sm border border-slate-200">👎 Rejeter</Button>
              </div>
            )}
            {!isManager && isAssigned && task.status === "TODO" && (
              <Button onClick={() => { onUpdate(task._id, {status: "IN_PROGRESS"}); onClose(); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-4 text-xs font-bold rounded-lg transition-colors">
                Démarrer le travail (Déplacer vers En cours)
              </Button>
            )}
            {task.status === "REVIEW" && (
              <Button 
                onClick={handleAIReview} 
                disabled={isAiReviewing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-none rounded-xl font-bold h-9 px-4"
              >
                {isAiReviewing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Revue IA en cours...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    ✨ Lancer la Revue IA
                  </div>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-bold border-slate-200 hover:bg-white">
              {isManager ? "Annuler" : "Fermer"}
            </Button>
            {isManager && (
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-indigo-100 transition-all">
                Sauvegarder
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
