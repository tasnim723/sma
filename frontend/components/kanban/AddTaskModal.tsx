"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Paperclip, FileText } from "lucide-react"

interface Member {
  id: string
  full_name: string
  email?: string
}

interface AddTaskModalProps {
  isOpen: boolean
  initialStatus: string
  teamMembers: Member[]
  onClose: () => void
  onCreate: (taskData: {
    title: string
    description: string
    status: string
    priority: string
    deadline: string | null
    assignee_ids: string[]
    attachments: string[]
  }) => void
}

export default function AddTaskModal({ isOpen, initialStatus, teamMembers, onClose, onCreate }: AddTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [deadline, setDeadline] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [attachments, setAttachments] = useState<string[]>([])
  const [newAttachment, setNewAttachment] = useState("")
  const [titleError, setTitleError] = useState(false)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPriority("MEDIUM")
    setDeadline("")
    setAssigneeIds([])
    setAttachments([])
    setNewAttachment("")
    setTitleError(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleCreate = () => {
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      status: initialStatus,
      priority,
      deadline: deadline || null,
      assignee_ids: assigneeIds,
      attachments,
    })
    resetForm()
    onClose()
  }

  const handleAddAttachment = () => {
    if (newAttachment.trim()) {
      setAttachments([...attachments, newAttachment.trim()])
      setNewAttachment("")
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(attachments.filter((_, i) => i !== idx))
  }

  const handleAddAssignee = (memberId: string) => {
    if (!assigneeIds.includes(memberId)) {
      setAssigneeIds([...assigneeIds, memberId])
    }
  }

  const removeAssignee = (memberId: string) => {
    setAssigneeIds(assigneeIds.filter((id) => id !== memberId))
  }

  const availableMembers = teamMembers.filter((m) => !assigneeIds.includes(m.id))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-none shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 rounded-t-2xl">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-bold">Nouvelle Tâche</DialogTitle>
            <DialogDescription className="text-indigo-200 text-sm mt-0.5">
              Ajout à la colonne :{" "}
              <span className="font-bold text-white">{initialStatus.replace("_", " ")}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Titre <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Entrer le titre de la tâche..."
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
              className={`bg-slate-50 border-slate-200 text-slate-900 font-medium focus:bg-white transition-colors ${titleError ? "border-red-400 bg-red-50" : ""}`}
            />
            {titleError && <p className="text-xs text-red-500">Le titre est requis.</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</label>
            <Textarea
              placeholder="Décrivez la tâche en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] bg-slate-50 border-slate-200 text-slate-800 focus:bg-white transition-colors text-sm leading-relaxed resize-none"
            />
          </div>

          {/* Priority + Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priorité</label>
              <Select onValueChange={(val: string | null) => { if (val) setPriority(val) }}>
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
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Échéance</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Assignés</label>
            <div className="flex flex-wrap gap-2 min-h-[36px]">
              {assigneeIds.map((aid) => {
                const member = teamMembers.find((m) => m.id === aid)
                return (
                  <span
                    key={aid}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 text-xs font-bold"
                  >
                    {member?.full_name || "Inconnu"}
                    <button onClick={() => removeAssignee(aid)} className="hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </span>
                )
              })}
              {availableMembers.length > 0 && (
                <Select onValueChange={(val: string | null) => { if (val) handleAddAssignee(val) }}>
                  <SelectTrigger className="h-8 w-fit rounded-full border-dashed border-2 px-3 text-[11px] font-bold text-slate-400 bg-transparent">
                    <Plus size={12} className="mr-1" /> Ajouter un membre
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {teamMembers.length === 0 && (
                <p className="text-xs text-slate-400 italic">Aucun membre d'équipe disponible.</p>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Livrables</label>
            <div className="space-y-2">
              {attachments.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl group hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                      <FileText size={14} />
                    </div>
                    <p className="text-xs font-medium text-slate-700 truncate max-w-[360px]">{file}</p>
                  </div>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ajouter un lien ou un nom de livrable..."
                value={newAttachment}
                onChange={(e) => setNewAttachment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddAttachment()}
                className="bg-slate-50 border-slate-200 text-sm"
              />
              <Button type="button" onClick={handleAddAttachment} variant="outline" className="shrink-0">
                <Paperclip size={15} className="mr-1.5" /> Ajouter
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 pt-0 flex gap-3 sm:justify-end">
          <Button variant="outline" onClick={handleClose} className="rounded-xl font-semibold">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-indigo-100"
          >
            Créer la Tâche
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
