"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { LayoutDashboard, CheckSquare, MessageSquare, LogOut, Bell, Users, BarChart3, Layers, Bot, BookOpen, Menu, ChevronLeft, ChevronRight, Calendar, Zap, Trophy, Rocket, Flame, Shield } from "lucide-react"
import FloatingAIChat from "@/components/ai/FloatingAIChat"
import AlertCenter from "@/components/alerts/AlertCenter"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!token) {
      router.push("/login")
    }
  }, [token, router])

  if (!mounted || !token) return null

  const navLinks = user?.role === "PROJECT_MANAGER" ? [
    { name: "Dashboard", href: "/", icon: <BarChart3 size={20} /> },
    { name: "Projets", href: "/projects", icon: <Layers size={20} /> },
    { name: "Équipe", href: "/team", icon: <Users size={20} /> },
  ] : [
    { name: "Dashboard", href: "/", icon: <BarChart3 size={20} /> },
    { name: "Projets", href: "/projects", icon: <Layers size={20} /> },
    { name: "Tâches", href: "/tasks", icon: <CheckSquare size={20} /> },
    { name: "Calendrier", href: "/calendar", icon: <Calendar size={20} /> },
  ]

  return (
    <div className="flex h-screen bg-nexus-room font-sans overflow-hidden relative">
      {/* 3D Orbs/Particles purely aesthetic */}
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-gradient-to-br from-[#00BCD4] to-[#8B5CF6] rounded-full blur-[80px] opacity-40 mix-blend-screen pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-gradient-to-br from-[#F43F5E] to-transparent rounded-full blur-[100px] opacity-30 mix-blend-screen pointer-events-none" />
      
      {/* Floating Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            rotate: [0, 180, 360],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: 10 + i * 2,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute w-2 h-2 bg-white/20 rounded-full blur-[1px] pointer-events-none shadow-[0_0_10px_white]"
          style={{
            top: `${20 + i * 15}%`,
            left: `${10 + i * 12}%`,
          }}
        />
      ))}

      {/* Sidebar - Collapsible & Responsive */}
    <div className={`hidden lg:flex transition-all duration-300 ease-in-out ${isCollapsed ? 'w-22' : 'w-[230px]'} nexus-glass border-r border-white/40 flex-col relative z-20`}>
      <div className={`p-8 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center'}`}>
        {!isCollapsed && (
          <div className="flex flex-col items-center justify-center text-center mt-2">
            <div className="relative mb-1" style={{ width: '14px', height: '14px' }}>
              <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[1px]" style={{ width: '9px', height: '9px' }}></div>
              <div className="absolute bottom-0 right-0 bg-[#00BCD4] rounded-[1px] mix-blend-multiply opacity-90" style={{ width: '9px', height: '9px' }}></div>
            </div>
            <h1 className="text-[22px] font-[900] text-[#111111] tracking-[0.1em] mr-[-0.1em] leading-none uppercase mb-1" style={{ WebkitTextStroke: "1px #111111" }}>NETINFO</h1>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center shadow-sm border border-slate-100 mt-2">
             <div className="relative flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[1px]" style={{ width: '7px', height: '7px' }}></div>
                <div className="absolute bottom-0 right-0 bg-[#00BCD4] rounded-[1px] mix-blend-multiply opacity-90" style={{ width: '7px', height: '7px' }}></div>
             </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 pt-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              title={isCollapsed ? link.name : ""}
              className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-semibold transition-all group relative overflow-hidden
                ${pathname === link.href
                  ? "text-slate-800 bg-slate-200/50 shadow-inner backdrop-blur-md border border-white/40"
                  : "text-slate-600 hover:text-slate-800 hover:bg-white/10"
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
               <span className={`shrink-0 transition-all duration-300 ${pathname === link.href ? "text-rose-400 scale-105" : "text-sky-300 group-hover:text-rose-300 group-hover:scale-105"}`}>
                {link.icon && React.cloneElement(link.icon as React.ReactElement, { size: 20, strokeWidth: 2 } as any)}
               </span>
              {!isCollapsed && <span className="text-[16px] tracking-tight">{link.name}</span>}
            </Link>
          ))}
        </div>

        {/* INTELLIGENCE SECTION */}
        {(user?.role === "PROJECT_MANAGER" || user?.role === "TEAM_LEAD") && (
          <div className="mt-6 pt-4">
            {!isCollapsed && <p className="px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Intelligence</p>}
            <div className="space-y-2">
              {user?.role === "PROJECT_MANAGER" && (
                 <Link
                   href="/ai-insights"
                   className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-semibold transition-all group text-slate-600 hover:text-rose-600 hover:bg-rose-50 shadow-sm border border-transparent hover:border-rose-100 ${isCollapsed ? 'justify-center px-2' : ''}`}
                 >
                   <span className="shrink-0 transition-transform group-hover:scale-110 text-rose-400"><Zap size={20} strokeWidth={2} /></span>
                   {!isCollapsed && <span className="text-[16px] tracking-tight">Orchestrateur IA</span>}
                 </Link>
              )}
              
               <Link
                 href="/veille-tech"
                 className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-semibold transition-all group text-slate-600 hover:text-sky-600 hover:bg-sky-50 shadow-sm border border-transparent hover:border-sky-100 ${isCollapsed ? 'justify-center px-2' : ''}`}
               >
                 <span className="shrink-0 transition-transform group-hover:scale-110 text-sky-400"><BookOpen size={20} strokeWidth={2} /></span>
                 {!isCollapsed && <span className="text-[16px] tracking-tight">Veille Tech</span>}
               </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 mt-auto">
        <button
          onClick={() => { logout(); router.push("/login") }}
          className={`flex items-center gap-3 w-full p-4 rounded-[1.5rem] transition-all duration-300 group
            ${isCollapsed 
              ? 'justify-center bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' 
              : 'bg-white/40 backdrop-blur-md border border-slate-200/50 text-slate-600 hover:border-rose-400/50 hover:bg-rose-50/50 hover:text-rose-600 shadow-sm'}`}
          title="Se déconnecter"
        >
          <span className={`shrink-0 transition-transform group-hover:rotate-12 ${isCollapsed ? '' : 'text-rose-500'}`}>
            <LogOut size={22} strokeWidth={2.5} />
          </span>
          {!isCollapsed && <span className="font-bold tracking-tight text-[16px]">Déconnexion</span>}
        </button>
      </div>
    </div>

    <div className="flex-1 flex flex-col overflow-hidden relative z-20">
      <header className="h-24 nexus-glass flex items-center justify-between px-8 relative shrink-0 rounded-b-3xl mx-4 mt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2.5 rounded-xl hover:bg-white/50 text-slate-500 transition-all hidden lg:block"
          >
            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* RESTORING FIRST VERSION OF BADGES (SIMPLE) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-80">Badges</span>
              <div className="flex items-center gap-3">
                 {[
                    { icon: <Rocket size={14} />, color: 'bg-rose-100', glow: 'shadow-[0_0_12px_rgba(251,207,232,0.4)]', label: 'Starter', iconColor: 'text-rose-500' },
                    { icon: <Flame size={14} />, color: 'bg-orange-100', glow: 'shadow-[0_0_12px_rgba(255,237,213,0.4)]', label: 'Machine', iconColor: 'text-orange-500' },
                    { icon: <Shield size={14} />, color: 'bg-sky-100', glow: 'shadow-[0_0_12px_rgba(224,242,254,0.4)]', label: 'Architect', iconColor: 'text-sky-500' }
                 ].map((badge, idx) => (
                    <div key={idx} className="group relative flex flex-col items-center">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${badge.iconColor} ${badge.color} ${badge.glow} border-2 border-white/90 transform hover:scale-110 transition-all cursor-help`}>
                          {badge.icon}
                       </div>
                       {/* Tooltip on hover */}
                       <div className="absolute top-full mt-2 bg-slate-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                          {badge.label}
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
          <AlertCenter />
          
          {/* MINIMAL PREMIUM PROFILE - COMPACTED & REPOSITIONED */}
          <div className="flex items-center gap-3 group cursor-pointer">
             <div className="flex flex-col justify-center items-end gap-0">
                <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-none">
                  {user?.full_name || 'Utilisateur'}
                </span>
                <div className="flex items-center gap-1 opacity-70">
                   <Zap size={8} className="text-rose-500 fill-rose-500" />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                     {user?.role === "PROJECT_MANAGER" ? "Senior Manager" : "Fast Deliver"}
                   </span>
                </div>
             </div>

             <div className="relative w-12 h-12 flex items-center justify-center">
                {/* SVG Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle 
                      cx="24" cy="24" r="21" 
                      stroke="currentColor" strokeWidth="2" 
                      fill="transparent" 
                      className="text-white/20" 
                   />
                   <motion.circle 
                      initial={{ strokeDashoffset: 132 }}
                      animate={{ strokeDashoffset: 40 }}
                      cx="24" cy="24" r="21" 
                      stroke="currentColor" strokeWidth="2" 
                      strokeDasharray="131.9" 
                      fill="transparent" 
                      className="text-purple-500 drop-shadow-[0_0_5px_rgba(168,85,247,0.6)]" 
                   />
                </svg>
                
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full border border-white overflow-hidden shadow-lg bg-slate-100 z-10 transition-transform group-hover:scale-105">
                   <img 
                      src="/avatar-woman.png?v=1" 
                      className="w-full h-full object-cover" 
                      alt="avatar" 
                   />
                </div>
                
                {/* Level Badge Hooked on Ring */}
                <div className="absolute top-0 right-0 w-4 h-4 bg-white text-slate-800 rounded-full flex items-center justify-center text-[8px] font-black shadow-md border border-slate-100 z-20">
                   {user?.level || 12}
                </div>
             </div>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto relative p-4 md:p-8">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#00BCD4]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#00BCD4]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
        
        <div className="w-full h-full relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    {user?.role === "PROJECT_MANAGER" && <FloatingAIChat />}
    </div>
  )
}
