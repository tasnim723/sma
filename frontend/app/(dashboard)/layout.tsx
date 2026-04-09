"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { LayoutDashboard, CheckSquare, MessageSquare, LogOut, Bell, Users, BarChart3, Layers, Bot, BookOpen, Menu, ChevronLeft, ChevronRight, Calendar, Zap } from "lucide-react"
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
    <div className="flex h-screen bg-aurora font-sans">
      {/* Sidebar - Collapsible & Responsive */}
    <div className={`hidden lg:flex transition-all duration-300 ease-in-out ${isCollapsed ? 'w-24' : 'w-64'} bg-white/40 backdrop-blur-3xl border-r border-slate-100 flex-col shadow-[1px_0_20px_rgba(0,0,0,0.02)] relative z-20`}>
      <div className={`p-5 pb-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center'}`}>
        {!isCollapsed && (
          <div className="flex flex-col items-center justify-center text-center mt-2">
            <div className="relative mb-1" style={{ width: '14px', height: '14px' }}>
              <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[1px]" style={{ width: '9px', height: '9px' }}></div>
              <div className="absolute bottom-0 right-0 bg-[#00CCCC] rounded-[1px] mix-blend-multiply opacity-90" style={{ width: '9px', height: '9px' }}></div>
            </div>
            <h1 className="text-[20px] font-[900] text-[#111111] tracking-[0.15em] mr-[-0.15em] leading-none uppercase mb-1" style={{ WebkitTextStroke: "1.5px #111111" }}>NetInfo</h1>
            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-[-0.2em] opacity-90">École d'art et de technologie</p>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 bg-white rounded-xl flex flex-col items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-slate-100 mt-2">
             <div className="relative flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[1px]" style={{ width: '7px', height: '7px' }}></div>
                <div className="absolute bottom-0 right-0 bg-[#00CCCC] rounded-[1px] mix-blend-multiply opacity-90" style={{ width: '7px', height: '7px' }}></div>
             </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-6 pt-6 space-y-3 overflow-y-auto custom-scrollbar">
        <div className="space-y-1.5">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              title={isCollapsed ? link.name : ""}
              className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] font-black transition-all group text-[14px] relative overflow-hidden
                ${pathname === link.href
                  ? "text-slate-900 bg-white shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-[#00CCCC]/20"
                  : "text-slate-400 hover:text-slate-800 hover:bg-white/60"
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
              {pathname === link.href && <div className="absolute left-0 top-3 bottom-3 w-1 bg-[#00CCCC] rounded-full shadow-[0_0_8px_rgba(0,204,204,0.6)]" />}
              <span className={`shrink-0 transition-all duration-300 ${pathname === link.href ? "text-[#00CCCC] scale-110" : "group-hover:scale-110"}`}>
                {link.icon && React.cloneElement(link.icon as React.ReactElement, { size: 20 } as any)}
              </span>
              {!isCollapsed && <span className="truncate tracking-tight">{link.name}</span>}
            </Link>
          ))}
        </div>

        {/* INTELLIGENCE SECTION - Role-based filtering */}
        {(user?.role === "PROJECT_MANAGER" || user?.role === "TEAM_LEAD") && (
          <div className="mt-8 pt-6 border-t border-slate-200/50">
            {!isCollapsed && <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Intelligence</p>}
            <div className="space-y-1.5">
              {user?.role === "PROJECT_MANAGER" && (
                <Link
                  href="/ai-insights"
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all group text-[15px] text-slate-500 hover:text-[#00CCCC] hover:bg-white/40 border border-transparent ${isCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <span className="shrink-0 transition-transform group-hover:scale-110 text-amber-500"><Zap size={22} fill="currentColor" /></span>
                  {!isCollapsed && <span className="truncate">Orchestrateur IA</span>}
                </Link>
              )}
              
              <Link
                href="/veille-tech"
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl font-bold transition-all group text-[15px] text-slate-500 hover:text-[#00CCCC] hover:bg-white/40 border border-transparent ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <span className="shrink-0 transition-transform group-hover:scale-110 text-[#00BCD4]"><BookOpen size={21} strokeWidth={2.5} /></span>
                {!isCollapsed && <span className="truncate">Veille Tech</span>}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <div className="p-5 border-t border-slate-200/50 bg-slate-50/80">
        <button
          onClick={() => { logout(); router.push("/login") }}
          className={`flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors text-sm font-bold w-full px-3 py-2 rounded-xl hover:bg-red-50 ${isCollapsed ? 'justify-center' : ''}`}
          title="Se déconnecter"
        >
          <LogOut size={18} /> {!isCollapsed && "Déconnexion"}
        </button>
      </div>
    </div>

    <div className="flex-1 flex flex-col overflow-hidden relative">
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 relative z-[100]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2.5 rounded-xl hover:bg-white text-slate-400 hover:text-[#00BCD4] transition-all bg-slate-50 border border-slate-100 shadow-sm hidden lg:block"
          >
            {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
          </button>
          <div className="lg:hidden flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00CCCC] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#00CCCC]/20">N</div>
            <h1 className="text-xl font-black text-slate-800">NetInfo</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <AlertCenter />
          <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00CCCC] to-[#FF0000] flex items-center justify-center text-white font-black shrink-0 shadow-[0_4px_12px_rgba(0,204,204,0.3)] border-2 border-white ring-1 ring-slate-100 cursor-pointer hover:scale-105 transition-transform">
            {user?.role.charAt(0)}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-4 bg-slate-50/50 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#00BCD4]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
        
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
