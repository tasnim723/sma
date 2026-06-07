"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Paperclip, FileText } from "lucide-react"
import { useLang } from "@/lib/useLang"

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
    start_date: string | null
    deadline: string | null
    assignee_ids: string[]
    attachments: string[]
  }) => void
}

export default function AddTaskModal({ isOpen, initialStatus, teamMembers, onClose, onCreate }: AddTaskModalProps) {
  const { lang } = useLang()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [startDate, setStartDate] = useState("")
  const [deadline, setDeadline] = useState("")
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [titleError, setTitleError] = useState(false)

  const resetForm = () => {
    setTitle("")
    setDescription("")
    setPriority("MEDIUM")
    setStartDate("")
    setDeadline("")
    setAssigneeIds([])
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
      status: initialStatus === "BACKLOG" ? "TODO" : initialStatus,
      priority,
      start_date: startDate || null,
      deadline: deadline || null,
      assignee_ids: assigneeIds,
      attachments: [],
    })
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-[#00BCD4]/20 shadow-[0_0_40px_rgba(0,188,212,0.15)] overflow-hidden [&>button]:z-50 [&>button]:top-5 [&>button]:right-5 [&>button]:w-9 [&>button]:h-9 [&>button]:bg-rose-50/50 [&>button]:text-rose-400 [&>button]:border [&>button]:border-rose-200/50 [&>button]:shadow-[0_0_15px_rgba(251,113,133,0.2)] [&>button]:hover:bg-rose-100 [&>button]:hover:text-rose-500 [&>button]:hover:border-rose-300 [&>button]:hover:shadow-[0_0_20px_rgba(251,113,133,0.4)] [&>button]:rounded-full [&>button]:transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00BCD4]/5 to-transparent pointer-events-none" />
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00BCD4] to-[#84ffff] shadow-[0_0_15px_rgba(0,188,212,0.5)]" />
        
        <div className="relative z-10 p-8 flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="mb-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-slate-800 drop-shadow-sm">Nouvelle Tâche</DialogTitle>
              <DialogDescription className="text-[#00BCD4] text-[10px] font-black uppercase tracking-widest mt-1">
                Ajout à la colonne :{" "}
                <span className="font-black bg-[#00BCD4]/10 px-2 py-0.5 rounded-full border border-[#00BCD4]/20">
                  {initialStatus === "BACKLOG" ? "TODO" : initialStatus.replace("_", " ")}
                </span>
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">
              Titre <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="Entrer le titre de la tâche..."
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
              className={`rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700 transition-colors ${titleError ? "border-rose-400 bg-rose-50" : ""}`}
            />
            {titleError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider pl-1 mt-1">Le titre est requis.</p>}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Description</label>
            <Textarea
              placeholder="Décrivez la tâche en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] rounded-2xl bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 py-3 font-medium text-slate-700 transition-colors resize-none"
            />
          </div>

          {/* Priority + Assignee */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Priorité</label>
              <Select onValueChange={(val: string | null) => { if (val) setPriority(val) }}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-200 px-4 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]">
                  <SelectValue placeholder="Priorité" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                  <SelectItem value="LOW" className="font-bold focus:bg-[#00BCD4]/10">Basse</SelectItem>
                  <SelectItem value="MEDIUM" className="font-bold focus:bg-[#00BCD4]/10">Moyenne</SelectItem>
                  <SelectItem value="HIGH" className="font-bold focus:bg-amber-500/10">Haute</SelectItem>
                  <SelectItem value="URGENT" className="font-bold focus:bg-rose-500/10">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Assigner à</label>
              <Select onValueChange={(val: string | null) => { if (val) setAssigneeIds([val]) }}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-slate-50/50 border-slate-200 px-4 font-bold text-slate-700 outline-none focus:border-[#00BCD4] focus:ring-1 focus:ring-[#00BCD4]">
                  <SelectValue placeholder="Membre de l'équipe..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-xl">
                  {teamMembers.map(m => (
                    <SelectItem key={m.id} value={m.id} className="font-bold focus:bg-[#00BCD4]/10">{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-5 mt-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Date de début</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-[#00BCD4] tracking-widest pl-1 mb-1.5 block">Date de fin</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="rounded-2xl h-12 bg-slate-50/50 border-slate-200 outline-none focus-visible:ring-1 focus-visible:ring-[#00BCD4] focus:border-[#00BCD4] px-4 font-bold text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 flex gap-4 sm:justify-end relative z-10 rounded-b-[2.5rem]">
          <Button variant="outline" onClick={handleClose} className="h-12 rounded-2xl font-black text-slate-500 bg-white border-slate-200 hover:bg-slate-50 px-6">
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            className="h-12 rounded-2xl bg-gradient-to-r from-[#00BCD4] to-[#0096a8] hover:shadow-[0_8px_25px_rgba(0,188,212,0.3)] text-white font-black px-8 transition-all active:scale-95"
          >
            {lang === 'fr' ? 'Créer la Tâche' : 'Create Task'}
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

