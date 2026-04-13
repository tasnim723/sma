"use client"

import { useEffect, useState } from "react"
import { Users, UserPlus, Shield, Settings, Trash2, LayoutGrid, List, Eye, Pencil, UserMinus } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import TeamOrganigramme from "@/components/team/TeamOrganigramme"
import { motion, AnimatePresence } from "framer-motion"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  position?: string
  phone_number?: string
  skills?: string[]
  cv_url?: string
  linkedin_url?: string
  github_url?: string
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'org'>('org')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [memberDetails, setMemberDetails] = useState<{tasks: any[]} | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)

  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    role: "",
    grade: "",
    status: "Actif",
    skills: ""
  })

  const [step, setStep] = useState(1)
  const [newDev, setNewDev] = useState({ 
    first_name: "Jean",
    last_name: "Dupont",
    email: "jean@pfe.com", 
    phone: "+33 6...",
    role: "Frontend Dev", 
    grade: "Junior",
    skills: [] as string[],
    experience: 2,
    availability: "Disponible",
    linkedin: "",
    github: "",
    notes: "",
    cv_file: null as File | null,
    cv_filename: ""
  })
  
  const [customSkill, setCustomSkill] = useState("")
  const predefinedSkills = ["React", "Vue", "Angular", "Node.js", "Python", "FastAPI", "Django", "PostgreSQL", "MongoDB", "Docker", "AWS", "Git", "Figma", "TypeScript"]
  
  const toggleSkill = (skill: string) => {
    setNewDev(prev => ({
      ...prev,
      skills: prev.skills.includes(skill) 
        ? prev.skills.filter(s => s !== skill) 
        : [...prev.skills, skill]
    }))
  }

  const token = useAuthStore(state => state.token)
  const currentUser = useAuthStore(state => state.user)

  const fetchMembers = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/members/", {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setMembers(res.data)
    } catch (err) {
      console.error("Failed to fetch members", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMemberDetails = async (member: Member) => {
    setSelectedMember(member)
    setIsDetailsOpen(true)
    setLoadingDetails(true)
    try {
      const res = await axios.get(`http://localhost:8000/api/members/${member.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMemberDetails(res.data)
    } catch (err) {
      console.error("Failed to fetch member details", err)
    } finally {
      setLoadingDetails(false)
    }
  }

  useEffect(() => {
    if (token) fetchMembers()
  }, [token])

  const handleCreateMember = async () => {
    try {
      let cv_url = ""
      if (newDev.cv_file) {
        const formData = new FormData()
        formData.append("file", newDev.cv_file)
        const uploadRes = await axios.post("http://localhost:8000/api/upload/cv", formData, {
          headers: { 
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token || ""}`
          }
        })
        cv_url = uploadRes.data.url
      }

      const payload = {
        full_name: `${newDev.first_name} ${newDev.last_name}`,
        email: newDev.email,
        role: "TEAM_MEMBER",
        position: `${newDev.role} - ${newDev.grade}`,
        phone_number: newDev.phone,
        password: "password123",
        skills: newDev.skills,
        linkedin_url: newDev.linkedin,
        github_url: newDev.github,
        cv_url: cv_url
      }
      const res = await axios.post("http://localhost:8000/api/members/", payload, {
        headers: { Authorization: `Bearer ${token || ""}` }
      })
      setIsDialogOpen(false)
      setStep(1)
      setNewDev({ ...newDev, skills: [] }) 
      fetchMembers()
    } catch (err) {
      alert("Échec de l'ajout du membre")
    }
  }

  const confirmDelete = (member: Member) => {
    setMemberToDelete(member)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!memberToDelete) return;
    try {
      await axios.delete(`http://localhost:8000/api/members/${memberToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMembers(members.filter(m => m.id !== memberToDelete.id))
      setIsDeleteDialogOpen(false)
      setMemberToDelete(null)
    } catch (err) {
      alert("Échec de la suppression du membre. Assurez-vous d'être Chef de Projet.")
    }
  }

  const getCharge = (name: string) => {
    if (!name) return { label: 'Modéré', color: 'text-[#3b82f6]', barColor: 'bg-[#3b82f6]', width: 'w-1/2', bg: 'bg-[#eff6ff]' };
    const l = name.length;
    if (l % 3 === 0) return { label: 'Libre', color: 'text-[#10b981]', barColor: 'bg-[#10b981]', width: 'w-1/3', bg: 'bg-[#ecfdf5]' };
    if (l % 3 === 1) return { label: 'Élevé', color: 'text-[#f59e0b]', barColor: 'bg-[#f59e0b]', width: 'w-[80%]', bg: 'bg-[#fffbeb]' };
    return { label: 'Modéré', color: 'text-[#3b82f6]', barColor: 'bg-[#3b82f6]', width: 'w-1/2', bg: 'bg-[#eff6ff]' };
  }

  const getLevel = (position: string) => {
    if (!position) return "Mid"
    const p = position.toLowerCase()
    if (p.includes("senior") || p.includes("lead") || p.includes("manager")) return "Senior"
    if (p.includes("junior")) return "Junior"
    return "Mid"
  }

  const openEditDialog = (member: Member) => {
    const parts = member.full_name ? member.full_name.split(' ') : ["", ""]
    setMemberToEdit(member)
    setEditForm({
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
      role: member.position ? member.position.split(' - ')[0] : (member.role || "Frontend Dev"),
      grade: getLevel(member.position || ""),
      status: "Actif",
      skills: (member.skills || []).join(", ")
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateMember = async () => {
    if (!memberToEdit) return;
    try {
      const position = `${editForm.role} - ${editForm.grade}`;
      const payload = {
        full_name: `${editForm.first_name} ${editForm.last_name}`,
        role: "TEAM_MEMBER",
        position: position,
        skills: editForm.skills.split(",").map(s => s.trim()).filter(Boolean)
      }
      await axios.put(`http://localhost:8000/api/members/${memberToEdit.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setIsEditDialogOpen(false)
      setMemberToEdit(null)
      fetchMembers()
    } catch (err) {
      alert("Échec de la mise à jour du membre.")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  )

  return (
    <div className="bg-[#f8fafc] min-h-screen pb-20">
      <div className="px-6 md:px-10 py-8 max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[#94a3b8] text-[12px] font-[800] uppercase tracking-widest mb-1">Vue Effectif & Surcharge</h2>
            <h1 className="text-[28px] font-[900] text-[#1e293b] tracking-tight">Gestion de l'Équipe</h1>
          </div>
          
          {currentUser?.role === 'PROJECT_MANAGER' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={
                <button className="bg-[#2ebccb] hover:bg-[#28aab8] text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                  <span className="text-lg leading-none font-normal relative bottom-[1px]">+</span> Ajouter un Développeur
                </button>
              } />
              <DialogContent className="sm:max-w-[550px] p-8 rounded-3xl border-none shadow-2xl">
                <DialogHeader className="mb-0">
                  <DialogTitle className="text-[22px] font-[800] text-[#1f2937]">Ajouter un Développeur</DialogTitle>
                </DialogHeader>
                
                {/* Stepper */}
                <div className="flex gap-2 mt-4 mb-8">
                  <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-[#00b5c5]' : 'bg-gray-100'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-[#00b5c5]' : 'bg-gray-100'}`}></div>
                  <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? 'bg-[#00b5c5]' : 'bg-gray-100'}`}></div>
                </div>

                {step === 1 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="font-[800] text-[#1f2937] text-[15px] mb-5">Étape 1 : Infos personnelles</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Prénom</Label>
                        <Input 
                          value={newDev.first_name} onChange={e => setNewDev({...newDev, first_name: e.target.value})}
                          placeholder="Jean" className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Nom</Label>
                        <Input 
                          value={newDev.last_name} onChange={e => setNewDev({...newDev, last_name: e.target.value})}
                          placeholder="Dupont" className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Email professionnel</Label>
                        <Input 
                          value={newDev.email} onChange={e => setNewDev({...newDev, email: e.target.value})}
                          placeholder="jean@pfe.com" className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Téléphone</Label>
                        <Input 
                          value={newDev.phone} onChange={e => setNewDev({...newDev, phone: e.target.value})}
                          placeholder="+33 6..." className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Rôle</Label>
                        <Select value={newDev.role} onValueChange={v => setNewDev({...newDev, role: v || ""})}>
                          <SelectTrigger className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Frontend Dev">Frontend Dev</SelectItem><SelectItem value="Backend Dev">Backend Dev</SelectItem><SelectItem value="Fullstack Dev">Fullstack Dev</SelectItem><SelectItem value="Data Scientist">Data Scientist</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Grade</Label>
                        <Select value={newDev.grade} onValueChange={v => setNewDev({...newDev, grade: v || ""})}>
                          <SelectTrigger className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Junior">Junior</SelectItem><SelectItem value="Mid">Mid</SelectItem><SelectItem value="Senior">Senior</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-1.5 mt-1">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Photo de profil</Label>
                        <div className="border border-dashed border-gray-300 rounded-xl h-12 flex items-center justify-center text-[13px] font-[600] text-[#6b7280] cursor-pointer hover:bg-gray-50 transition-colors">
                          Téléverser une image
                        </div>
                      </div>
                    </div>
                    <div className="mt-8">
                       <Button onClick={() => setStep(2)} className="w-full h-11 bg-[#00b5c5] hover:bg-[#00a3b3] rounded-xl font-[700] text-[14px] text-white transition-colors duration-200 shadow-sm border-none">Suivant</Button>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="font-[800] text-[#1f2937] text-[15px] mb-5">Étape 2 : Compétences</h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Ajouter une compétence</Label>
                        <Input 
                          placeholder="Entrez une compétence (Ex: React)..." 
                          value={customSkill}
                          onChange={e => setCustomSkill(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && customSkill.trim()) {
                              e.preventDefault()
                              toggleSkill(customSkill.trim())
                              setCustomSkill("")
                            }
                          }}
                          className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px]" 
                        />
                        <div className="flex flex-wrap gap-2 pt-3">
                          {predefinedSkills.map(s => {
                             const isSel = newDev.skills.includes(s);
                             return (
                               <button key={s} onClick={() => toggleSkill(s)} 
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-[700] transition-colors border shadow-xs ${isSel ? 'bg-[#f0fcfd] text-[#00b5c5] border-[#00b5c5]' : 'bg-white text-[#6b7280] border-gray-200 hover:border-[#00b5c5]'}`}>
                                 {s}
                               </button>
                             )
                          })}
                        </div>
                      </div>
                      
                      <div className="space-y-3 pt-2">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Expérience ({newDev.experience} ans)</Label>
                        <div className="relative h-[6px] bg-gray-200 rounded-full w-full mt-2">
                           <div className="absolute top-0 left-0 h-full bg-[#1d4ed8] rounded-full" style={{ width: `${(newDev.experience/10)*100}%` }}></div>
                           <input type="range" min="0" max="10" value={newDev.experience} onChange={e => setNewDev({...newDev, experience: parseInt(e.target.value)})}
                              className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" />
                           <div className="absolute top-1/2 -mt-[8px] w-4 h-4 bg-[#1d4ed8] rounded-full shadow-md border-2 border-white pointer-events-none" style={{ left: `calc(${(newDev.experience/10)*100}% - 8px)` }}></div>
                        </div>
                      </div>

                      <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-between mt-4">
                        <Label className="text-[13px] font-[700] text-[#1f2937] m-0 uppercase">Disponibilité Actuelle</Label>
                        <Select value={newDev.availability} onValueChange={v => setNewDev({...newDev, availability: v || ""})}>
                          <SelectTrigger className="w-32 bg-white rounded-lg border-gray-200 h-9 text-[12px] font-[600] text-[#374151] shadow-sm"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Disponible">Disponible</SelectItem><SelectItem value="Occupé">Occupé</SelectItem></SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-8">
                       <Button onClick={() => setStep(1)} variant="outline" className="w-[120px] h-11 border-gray-200 hover:bg-gray-50 rounded-xl font-[700] text-[14px] text-[#4b5563]">Retour</Button>
                       <Button onClick={() => setStep(3)} className="flex-1 h-11 bg-[#00b5c5] hover:bg-[#00a3b3] rounded-xl font-[700] text-[14px] text-white border-none shadow-sm transition-colors duration-200">Suivant</Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="font-[800] text-[#1f2937] text-[15px] mb-5">Étape 3 : Documents & Liens</h3>
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="border border-dashed border-gray-300 rounded-xl h-[60px] flex items-center justify-center gap-2 text-[13px] font-[600] text-[#6b7280] cursor-pointer hover:bg-gray-50 transition-colors">
                          <input type="file" className="hidden" accept=".pdf" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setNewDev({...newDev, cv_file: e.target.files[0], cv_filename: e.target.files[0].name})
                            }
                          }} />
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2-2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
                          Téléverser le CV (PDF)
                        </label>
                        {newDev.cv_filename && (
                          <p className="text-[12px] font-[600] text-[#10b981] flex items-center gap-1.5 mt-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {newDev.cv_filename}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-[700] text-[#374151] uppercase">LinkedIn</Label>
                          <Input 
                            value={newDev.linkedin} onChange={e => setNewDev({...newDev, linkedin: e.target.value})}
                            placeholder="https://linkedin.com/in/..." className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px] bg-gray-50/50" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[12px] font-[700] text-[#374151] uppercase">GitHub</Label>
                          <Input 
                            value={newDev.github} onChange={e => setNewDev({...newDev, github: e.target.value})}
                            placeholder="https://github.com/..." className="rounded-xl border-gray-200 focus:ring-[#00b5c5] h-11 text-[13px] bg-gray-50/50" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[12px] font-[700] text-[#374151] uppercase">Notes et commentaires</Label>
                        <textarea 
                          value={newDev.notes} onChange={e => setNewDev({...newDev, notes: e.target.value})}
                          placeholder="Infos utiles..." 
                          className="w-full rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00b5c5] p-3 text-[13px] min-h-[90px] resize-none text-gray-700 bg-white" 
                        ></textarea>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-8">
                       <Button onClick={() => setStep(2)} variant="outline" className="w-[120px] h-11 border-gray-200 hover:bg-gray-50 rounded-xl font-[700] text-[14px] text-[#4b5563]">Retour</Button>
                       <Button onClick={handleCreateMember} className="flex-1 h-11 bg-[#00b5c5] hover:bg-[#00a3b3] rounded-xl font-[700] text-[14px] text-white flex items-center justify-center gap-2 border-none shadow-sm transition-colors duration-200">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                         Ajouter à l'équipe
                       </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-gray-100">
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[22%] pl-6">Membre</th>
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[22%]">Rôle / Spécialité</th>
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[24%]">Compétences</th>
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[12%]">Charge</th>
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[10%]">Statut</th>
                <th className="pb-4 font-[800] text-[#a1a1aa] text-[11px] uppercase tracking-wider w-[10%] text-right pr-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-500">Aucun membre trouvé</td></tr>
              ) : (
                members.map((member) => {
                  const charge = getCharge(member.full_name)
                  const level = getLevel(member.position || "")
                  const initials = member.full_name ? member.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?'
                  
                  return (
                    <motion.tr 
                      key={member.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: members.indexOf(member) * 0.08, duration: 0.4, ease: "easeOut" }}
                      className="border-b-[1.5px] border-gray-50 hover:bg-gray-50/40 transition-colors group"
                    >
                      <td className="py-5 pl-6">
                        <div className="flex items-center gap-4">
                          <div className="w-[42px] h-[42px] rounded-full bg-[#f0f9fa] text-[#2ebccb] flex items-center justify-center font-[800] text-[15px] shrink-0">
                            {initials}
                          </div>
                          <span className="font-[800] text-[#4b5563] text-[15px]">
                            {member.full_name || "Utilisateur"}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-5">
                        <div className="flex flex-col">
                          <span className="font-[800] text-[#4b5563] text-[14px]">
                            {member.position || "Staff"}
                          </span>
                          <span className="text-[#a1a1aa] text-[12.5px] font-[600] mt-0.5">
                            {level}
                          </span>
                        </div>
                      </td>
                      
                      <td className="py-5">
                        <div className="flex gap-2 flex-wrap pr-4">
                          {(member.skills?.length || 0) > 0 ? member.skills?.slice(0,4)?.map((skill, i) => (
                            <span key={i} className="bg-[#f4f4f5] text-[#71717a] px-3 py-1 rounded-[8px] text-[11.5px] font-[800] shadow-sm">
                              {skill}
                            </span>
                          )) : (
                            <span className="text-slate-300 italic text-[11px]">Non renseignées</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="py-5">
                        <div className="flex flex-col w-[85px]">
                          <span className={`${charge.color} text-[12px] font-[800] mb-2`}>
                            {charge.label}
                          </span>
                          <div className={`h-1.5 w-full rounded-full ${charge.bg}`}>
                            <div className={`h-full rounded-full ${charge.barColor} ${charge.width}`}></div>
                          </div>
                        </div>
                      </td>

                      <td className="py-5">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ecfdf4] border-[1.5px] border-[#d1fae5]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                          <span className="text-[#10b981] text-[11px] font-[800] uppercase tracking-wide">Actif</span>
                        </div>
                      </td>
                      
                      <td className="py-5 text-right pr-6">
                        <div className="flex items-center justify-end gap-2.5">
                          <button 
                            onClick={() => fetchMemberDetails(member)}
                            className="w-[34px] h-[34px] rounded-full border-[1.5px] border-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                          >
                            <Eye size={15} strokeWidth={2.5} />
                          </button>
                          
                          {currentUser?.role === 'PROJECT_MANAGER' && (
                            <>
                              <button 
                                onClick={() => openEditDialog(member)}
                                className="w-[34px] h-[34px] rounded-full border-[1.5px] border-[#fef3c7] bg-[#fffbeb] text-[#f59e0b] flex items-center justify-center hover:bg-[#fef3c7] transition-colors shadow-sm"
                              >
                                <Pencil size={14} strokeWidth={2.5} />
                              </button>
                              <button 
                                onClick={() => confirmDelete(member)}
                                disabled={currentUser.email === member.email}
                                className="w-[34px] h-[34px] rounded-full border-[1.5px] border-[#fee2e2] bg-[#fef2f2] text-[#ef4444] flex items-center justify-center hover:bg-[#fee2e2] transition-colors disabled:opacity-50 shadow-sm"
                              >
                                <Trash2 size={15} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

         <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="fixed z-50 !right-0 !left-auto !top-0 !bottom-0 !translate-x-0 !translate-y-0 h-full w-full sm:!max-w-[420px] p-0 !rounded-none !rounded-l-3xl border-none shadow-[-10px_0_40px_rgba(0,0,0,0.08)] bg-white overflow-y-auto duration-300 ease-in-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right outline-none">
          {selectedMember && (
            <div className="flex flex-col min-h-full bg-white relative">
              
              {/* Avatar and Name */}
              <div className="pt-16 pb-6 px-8 flex flex-col items-center">
                <div className="w-[85px] h-[85px] mb-4 bg-white border-[2.5px] border-[#2ebccb] rounded-[24px] flex items-center justify-center shadow-sm relative">
                  <span className="text-[28px] font-[800] text-[#2ebccb]">
                    {selectedMember.full_name.charAt(0).toUpperCase()}
                    {selectedMember.full_name.split(' ')[1] ? selectedMember.full_name.split(' ')[1].charAt(0).toUpperCase() : ''}
                  </span>
                </div>
                <h2 className="text-[24px] font-[900] text-[#1f2937] tracking-tight mb-3">{selectedMember.full_name}</h2>
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-gray-50 text-gray-500 text-[11.5px] font-[700] border border-gray-100">
                    {selectedMember.position ? selectedMember.position.split(' - ')[0] : (selectedMember.role || "Dev")}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#eff6ff] text-[#3b82f6] text-[11.5px] font-[700] border border-[#dbeafe]">
                    {getLevel(selectedMember.position || "")}
                  </span>
                </div>
              </div>

              {/* Info Sections */}
              <div className="flex-1 px-8 py-4 space-y-7">
                
                {/* Contact */}
                <div className="space-y-3.5">
                  <h4 className="text-[10.5px] font-[800] text-[#9ca3af] uppercase tracking-wider">Contact</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5 text-[13px] font-[700] text-[#1f2937]">
                      <span className="w-[22px] h-[22px] rounded-md bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center text-[11px]">@</span>
                      {selectedMember.email}
                    </div>
                    <div className="flex items-center gap-3.5 text-[13px] font-[700] text-[#1f2937]">
                      <span className="w-[22px] h-[22px] rounded-md bg-[#ffedd5] text-[#ea580c] flex items-center justify-center">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                      </span>
                      {selectedMember.phone_number || "+33 6 12 34 56 78"}
                    </div>
                  </div>
                </div>

                {/* Compétences Techniques */}
                <div className="space-y-3.5">
                  <h4 className="text-[10.5px] font-[800] text-[#9ca3af] uppercase tracking-wider">Compétences Techniques</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMember.skills?.map((s, i) => (
                      <span key={i} className="bg-white border-[1.5px] border-gray-100 text-[#4b5563] px-3.5 py-1.5 rounded-full text-[11px] font-[800] shadow-sm">
                        {s}
                      </span>
                    ))}
                    {(!selectedMember.skills || selectedMember.skills.length === 0) && (
                       <span className="text-gray-400 text-xs italic">Aucune compétence listée</span>
                    )}
                  </div>
                </div>

                {/* Infos Complémentaires */}
                <div className="space-y-3.5">
                  <h4 className="text-[10.5px] font-[800] text-[#9ca3af] uppercase tracking-wider">Infos Complémentaires</h4>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-white border-[1.5px] border-gray-50 rounded-2xl p-4 shadow-sm hover:border-gray-100 transition-colors">
                      <p className="text-[10.5px] font-[700] text-[#9ca3af] mb-1">Expérience</p>
                      <p className="text-[15px] font-[900] text-[#1f2937]">4+ années</p>
                    </div>
                    <div className="flex-1 bg-white border-[1.5px] border-gray-50 rounded-2xl p-4 shadow-sm hover:border-gray-100 transition-colors">
                      <p className="text-[10.5px] font-[700] text-[#9ca3af] mb-1">Projets en cours</p>
                      <p className="text-[15px] font-[900] text-[#1f2937]">
                         {loadingDetails ? "..." : (memberDetails?.tasks?.length || "0")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Charge de Travail */}
                <div className="space-y-3.5">
                  <h4 className="text-[10.5px] font-[800] text-[#9ca3af] uppercase tracking-wider">Charge de Travail</h4>
                  {(() => {
                    const charge = getCharge(selectedMember.full_name);
                    return (
                      <div className="h-[9px] w-full rounded-full bg-[#f3f4f6]">
                        <div className={`h-full rounded-full ${charge.barColor} ${charge.width}`}></div>
                      </div>
                    )
                  })()}
                </div>

                {/* Actions / Documents */}
                <div className="flex gap-3 pt-3">
                  <button 
                    onClick={() => { if (selectedMember.cv_url) window.open(`http://localhost:8000${selectedMember.cv_url}`, "_blank") }}
                    disabled={!selectedMember.cv_url}
                    className="flex-1 h-12 bg-white border-[1.5px] border-gray-100 rounded-xl flex items-center justify-center gap-2 text-[12px] font-[800] text-[#1f2937] hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {selectedMember.cv_url ? "Voir le CV (PDF)" : "Aucun CV"}
                  </button>
                  <button 
                    onClick={() => { if (selectedMember.linkedin_url) window.open(selectedMember.linkedin_url, "_blank") }}
                    disabled={!selectedMember.linkedin_url}
                    className="flex-1 h-12 bg-white border-[1.5px] border-gray-100 rounded-xl flex items-center justify-center gap-2 text-[12px] font-[800] text-[#1f2937] hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    LinkedIn
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                  </button>
                </div>
              </div>

              {/* Bottom Sticky Action */}
              <div className="p-8 pt-4 mt-auto">
                {currentUser?.role === 'PROJECT_MANAGER' && (
                  <button 
                    onClick={() => {
                       setIsDetailsOpen(false);
                       setTimeout(() => confirmDelete(selectedMember), 300);
                    }}
                    className="w-full h-[52px] bg-[#fef2f2] hover:bg-[#fee2e2] text-[#ef4444] rounded-[14px] flex items-center justify-center gap-2.5 text-[14px] font-[800] border-[1.5px] border-[#fee2e2] transition-colors shadow-sm"
                  >
                    <Trash2 size={16} strokeWidth={3} />
                    Retirer de l'équipe
                  </button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white outline-none">
          {/* Top Border Bar */}
          <div className="flex h-1.5 w-full">
            <div className="flex-1 bg-[#00b5c5]"></div>
            <div className="flex-1 bg-[#d41f1f]"></div>
          </div>
          
          <div className="p-8 flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-5 w-16 h-16 bg-[#fef2f2] rounded-2xl flex items-center justify-center border border-[#fee2e2]">
              <UserMinus className="text-[#ef4444] w-8 h-8" strokeWidth={2.5} />
            </div>
            
            {/* Title & Desc */}
            <h2 className="text-[20px] font-[800] text-[#1f2937] mb-3">Retrait du membre</h2>
            <p className="text-[13px] text-[#6b7280] font-[600] mb-6 px-2 leading-relaxed">
              Êtes-vous sûr de vouloir retirer ce membre de l'équipe du projet ?
            </p>
            
            {/* User Card */}
            {memberToDelete && (
              <div className="w-full bg-[#fafafa] border border-gray-100 rounded-xl p-3.5 flex items-center gap-3.5 mb-6 relative overflow-hidden">
                 <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#fef2f2] to-transparent opacity-80 pointer-events-none"></div>
                 
                 <div className="w-10 h-10 rounded-[10px] bg-[#00b5c5] flex items-center justify-center text-white font-[800] text-[14px] shadow-sm z-10">
                   {memberToDelete.full_name.charAt(0).toUpperCase()}
                   {memberToDelete.full_name.split(' ')[1] ? memberToDelete.full_name.split(' ')[1].charAt(0).toUpperCase() : ''}
                 </div>
                 <div className="flex flex-col items-start z-10">
                   <span className="text-[14px] font-[800] text-[#1f2937]">{memberToDelete.full_name}</span>
                   <span className="text-[10.5px] font-[800] text-[#00b5c5] uppercase tracking-wider mt-0.5">
                     {memberToDelete.position ? memberToDelete.position.split(' - ')[0] : (memberToDelete.role || "Dev")}
                   </span>
                 </div>
              </div>
            )}
            
            {/* Warning Text */}
            <p className="text-[11.5px] text-[#6b7280] font-[600] leading-relaxed mb-8 px-4">
              <span className="text-[#d41f1f] font-[800]">Attention :</span> L'historique de ses tâches sera conservé, mais ses accès au projet seront révoqués.
            </p>
            
            {/* Actions */}
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setIsDeleteDialogOpen(false)}
                className="flex-1 h-12 bg-white border-[1.5px] border-gray-200 rounded-[14px] text-[13.5px] font-[800] text-[#00b5c5] hover:bg-gray-50 transition-colors shadow-sm"
              >
                Annuler
              </button>
              <button 
                onClick={handleDelete}
                className="flex-[1.2] h-12 bg-[#d41f1f] hover:bg-[#b91c1c] shadow-md border border-[#b91c1c] rounded-[14px] text-[13.5px] font-[800] text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} strokeWidth={2.5} />
                Retirer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-8 rounded-[24px] border-none shadow-2xl bg-white outline-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[20px]">✏️</span>
            <h2 className="text-[20px] font-[900] text-[#1f2937] tracking-tight">Modifier le Membre</h2>
          </div>
          {memberToEdit && (
             <p className="text-[#00b5c5] text-[12px] font-[600] mb-6">{memberToEdit.full_name}</p>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Prénom</Label>
                <Input 
                  value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                  className="rounded-xl border-[1.5px] border-gray-100 focus-visible:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Nom</Label>
                <Input 
                  value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                  className="rounded-xl border-[1.5px] border-gray-100 focus-visible:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Rôle</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({...editForm, role: v || ""})}>
                  <SelectTrigger className="rounded-xl border-[1.5px] border-gray-100 focus:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Frontend Dev">Frontend Dev</SelectItem>
                    <SelectItem value="Backend Dev">Backend Dev</SelectItem>
                    <SelectItem value="Full Stack">Full Stack</SelectItem>
                    <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                    <SelectItem value="Data Scientist">Data Scientist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Niveau</Label>
                <Select value={editForm.grade} onValueChange={v => setEditForm({...editForm, grade: v || ""})}>
                  <SelectTrigger className="rounded-xl border-[1.5px] border-gray-100 focus:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junior">Junior</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Statut</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v || ""})}>
                <SelectTrigger className="rounded-xl border-[1.5px] border-gray-100 focus:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Actif">Actif</SelectItem><SelectItem value="Inactif">Inactif</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10.5px] font-[800] text-[#94a3b8] uppercase tracking-wider">Compétences (virgule entre chaque)</Label>
              <Input 
                value={editForm.skills} onChange={e => setEditForm({...editForm, skills: e.target.value})}
                placeholder="React, FastAPI, Python, Docker"
                className="rounded-xl border-[1.5px] border-gray-100 focus-visible:ring-[#00b5c5] h-11 text-[13px] font-[600] text-[#1f2937] bg-white shadow-sm" />
            </div>
          </div>
          
          <div className="flex gap-3 mt-8">
            <button 
              onClick={() => setIsEditDialogOpen(false)}
              className="flex-1 h-[42px] bg-white border-[1.5px] border-gray-200 rounded-[12px] text-[13px] font-[800] text-[#4b5563] hover:bg-gray-50 transition-colors shadow-sm"
            >
              Annuler
            </button>
            <button 
              onClick={handleUpdateMember}
              className="flex-[1.5] h-[42px] bg-[#00b5c5] hover:bg-[#00a3b3] shadow-md border-none rounded-[12px] text-[13px] font-[800] text-white transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
