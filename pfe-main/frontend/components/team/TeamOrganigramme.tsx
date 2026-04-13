"use client"

import React from 'react'
import { Shield, User, ChevronDown } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  email: string
  role: string
  position?: string
  phone_number?: string
  skills?: string[]
}

export default function TeamOrganigramme({ members, onMemberClick }: { members: Member[], onMemberClick?: (m: Member) => void }) {
  const managers = members.filter(m => m.role === 'PROJECT_MANAGER')
  const leads = members.filter(m => m.role === 'TEAM_LEAD')
  const staff = members.filter(m => m.role === 'TEAM_MEMBER')

  return (
    <div className="p-8 bg-slate-50/50 rounded-3xl border border-slate-200/60 shadow-inner overflow-x-auto min-w-max">
      <div className="flex flex-col items-center gap-12">
        {/* Managers Level */}
        <div className="flex gap-8 justify-center">
          {managers.map(m => (
            <OrgNode key={m.id} member={m} variant="manager" onClick={() => onMemberClick?.(m)} />
          ))}
        </div>

        {managers.length > 0 && (leads.length > 0 || staff.length > 0) && (
          <div className="w-px h-8 bg-slate-300 -my-8"></div>
        )}

        {/* Leads Level */}
        <div className="flex gap-12 justify-center relative">
           {leads.length > 1 && (
             <div className="absolute top-0 left-[10%] right-[10%] h-px bg-slate-300 -mt-6"></div>
           )}
            {leads.map(m => (
              <div key={m.id} className="flex flex-col items-center gap-6">
                 {leads.length > 0 && <div className="w-px h-6 bg-slate-300 -mt-6"></div>}
                 <OrgNode member={m} variant="lead" onClick={() => onMemberClick?.(m)} />
              </div>
            ))}
         </div>

         {leads.length > 0 && staff.length > 0 && (
           <div className="w-px h-8 bg-slate-300 -my-8"></div>
         )}

         {/* Staff Level */}
         <div className="flex gap-6 justify-center relative flex-wrap max-w-4xl">
            {staff.length > 1 && (
              <div className="absolute top-0 left-[5%] right-[5%] h-px bg-slate-300 -mt-4"></div>
            )}
            {staff.map(m => (
               <div key={m.id} className="flex flex-col items-center gap-4">
                 <div className="w-px h-4 bg-slate-300 -mt-4"></div>
                 <OrgNode member={m} variant="staff" onClick={() => onMemberClick?.(m)} />
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}

function OrgNode({ member, variant, onClick }: { member: Member, variant: 'manager' | 'lead' | 'staff', onClick?: () => void }) {
  const styles = {
    manager: "bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-indigo-200 border-indigo-400/30 cursor-pointer hover:shadow-indigo-300",
    lead: "bg-white border-blue-200 text-slate-800 shadow-blue-100 cursor-pointer hover:shadow-blue-200",
    staff: "bg-white border-slate-200 text-slate-700 shadow-slate-100 scale-90 cursor-pointer hover:shadow-slate-200"
  }

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center p-4 rounded-2xl border-2 shadow-lg transition-all hover:scale-105 active:scale-95 ${styles[variant]} w-48`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-inner
        ${variant === 'manager' ? 'bg-white/20' : 'bg-slate-100'}`}>
        {variant === 'manager' ? <Shield size={20} /> : <User size={20} className="text-slate-500" />}
      </div>
      <p className="font-bold text-sm text-center truncate w-full">{member.full_name}</p>
      <p className={`text-[10px] uppercase tracking-widest font-bold mt-1 
        ${variant === 'manager' ? 'text-blue-100' : 'text-slate-400'}`}>
        {member.role.replace('_', ' ')}
      </p>
    </div>
  )
}
