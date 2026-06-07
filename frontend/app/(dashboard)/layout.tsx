"use client"

import React, { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import Link from "next/link"
import { LayoutDashboard, CheckSquare, MessageSquare, LogOut, Bell, Users, BarChart3, Layers, Bot, BookOpen, Menu, ChevronLeft, ChevronRight, Calendar, Zap, Trophy, Rocket, Flame, Shield, Sun, Moon } from "lucide-react"
import FloatingAIChat from "@/components/ai/FloatingAIChat"
import AlertCenter from "@/components/alerts/AlertCenter"
import WebAuthnRegister from "@/components/auth/WebAuthnRegister"
import { motion, AnimatePresence } from "framer-motion"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { token, user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { t, lang, setLang } = useLang()
  const { theme, toggleTheme } = useThemeStore()

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [theme])

  // Wait for zustand to finish hydrating from localStorage before checking auth
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        setHydrated(true)
      })
      return () => unsub()
    }
  }, [])

  // Only redirect to login AFTER hydration is complete and token is still null
  useEffect(() => {
    if (hydrated && !token) {
      router.push("/login")
    }
  }, [hydrated, token, router])

  if (!hydrated || !token) return null

  const navLinks = user?.role === "PROJECT_MANAGER" ? [
    { name: t.nav.dashboard, href: "/", icon: <BarChart3 size={20} /> },
    { name: t.nav.challenges, href: "/projects", icon: <Layers size={20} /> },
    { name: t.nav.team, href: "/team", icon: <Users size={20} /> },
  ] : [
    { name: t.nav.dashboard, href: "/", icon: <BarChart3 size={20} /> },
    { name: t.nav.challenges, href: "/projects", icon: <Layers size={20} /> },
    { name: lang === "fr" ? "Calendrier" : "Calendar", href: "/calendar", icon: <Calendar size={20} /> },
    { name: t.nav.brainstormingSpace, href: "/espace-brainstorming", icon: <MessageSquare size={20} /> },
  ]

  return (
    <div className="flex h-screen w-screen font-sans overflow-hidden relative bg-[#f0f9ff]">

      {/* ── ANIMATED BACKGROUND ─────────────────────────────────────────── */}
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#e0f7fa] via-[#f0f9ff] to-[#ede9fe] pointer-events-none" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Aurora wave 1 */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '70vw', height: '50vw',
          top: '-15vw', left: '-10vw',
          background: 'radial-gradient(ellipse at center, rgba(0,188,212,0.18) 0%, rgba(99,102,241,0.10) 50%, transparent 75%)',
          filter: 'blur(40px)',
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Aurora wave 2 */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '60vw', height: '45vw',
          bottom: '-10vw', right: '-10vw',
          background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.14) 0%, rgba(0,188,212,0.10) 50%, transparent 75%)',
          filter: 'blur(50px)',
        }}
        animate={{ x: [0, -30, 0], y: [0, -25, 0], scale: [1, 1.06, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Aurora wave 3 — warm accent */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: '40vw', height: '35vw',
          top: '30%', left: '30%',
          background: 'radial-gradient(ellipse at center, rgba(244,63,94,0.07) 0%, rgba(251,191,36,0.06) 50%, transparent 75%)',
          filter: 'blur(60px)',
        }}
        animate={{ x: [0, 20, -20, 0], y: [0, -20, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      {/* Floating orbs */}
      {[
        { size: 180, top: '8%',  left: '5%',  color: 'rgba(0,188,212,0.15)',   dur: 14, delay: 0 },
        { size: 120, top: '60%', left: '2%',  color: 'rgba(99,102,241,0.12)',  dur: 18, delay: 2 },
        { size: 200, top: '15%', left: '75%', color: 'rgba(139,92,246,0.10)',  dur: 20, delay: 4 },
        { size: 90,  top: '75%', left: '80%', color: 'rgba(0,188,212,0.13)',   dur: 12, delay: 1 },
        { size: 140, top: '45%', left: '55%', color: 'rgba(244,63,94,0.07)',   dur: 16, delay: 5 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orb.size, height: orb.size,
            top: orb.top, left: orb.left,
            background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{ y: [0, -25, 0], x: [0, 15, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: orb.dur, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
        />
      ))}

      {/* Floating sparkle particles */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute pointer-events-none rounded-full"
          style={{
            width: i % 3 === 0 ? 4 : 2,
            height: i % 3 === 0 ? 4 : 2,
            top: `${10 + i * 8}%`,
            left: `${5 + i * 9}%`,
            background: i % 2 === 0 ? '#00BCD4' : '#6366f1',
            boxShadow: `0 0 ${i % 3 === 0 ? 8 : 4}px ${i % 2 === 0 ? '#00BCD4' : '#6366f1'}`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, i % 2 === 0 ? 12 : -12, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{ duration: 6 + i * 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }}
        />
      ))}

      {/* Thin animated diagonal lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="diag" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <line x1="0" y1="0" x2="0" y2="60" stroke="#00BCD4" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#diag)" />
      </svg>

      {/* Sidebar - Collapsible & Responsive */}
    <div className={`hidden lg:flex transition-all duration-300 ease-in-out ${isCollapsed ? 'w-22' : 'w-[230px]'} flex-col relative z-20 border-r border-white/60`}
      style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
    >
      <div className={`p-8 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-center'}`}>
        {!isCollapsed && (
          <div className="flex flex-col items-center justify-center text-center mt-2">
            <div className="relative mb-1" style={{ width: '14px', height: '14px' }}>
              <div className="absolute top-0 left-0 bg-[#FF0000] rounded-[1px]" style={{ width: '9px', height: '9px' }}></div>
              <div className="absolute bottom-0 right-0 bg-[#00BCD4] rounded-[1px] mix-blend-multiply opacity-90" style={{ width: '9px', height: '9px' }}></div>
            </div>
            <h1 className="text-[22px] font-[900] text-[#111111] dark:text-blue-50 tracking-[0.1em] mr-[-0.1em] leading-none uppercase mb-1 transition-colors" style={theme === 'light' ? { WebkitTextStroke: "1px #111111" } : {}}>NETINFO</h1>
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
              key={link.href}
              href={link.href}
              title={isCollapsed ? link.name : ""}
              className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-semibold transition-all group relative overflow-hidden
                ${pathname === link.href
                  ? "text-slate-800 dark:text-blue-50 bg-slate-200/50 dark:bg-blue-900/40 shadow-inner backdrop-blur-md border border-white/40 dark:border-blue-500/20"
                  : "text-slate-600 dark:text-blue-400 hover:text-slate-800 dark:hover:text-blue-50 hover:bg-white/10"
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
            >
               <span className={`shrink-0 transition-all duration-300 ${pathname === link.href ? "text-rose-400 scale-105" : "text-sky-300 group-hover:text-rose-300 group-hover:scale-105"}`}>
                {link.icon && React.cloneElement(link.icon as React.ReactElement, { size: 20, strokeWidth: 2 } as any)}
               </span>
              {!isCollapsed && <span className="text-[16px] tracking-tight">{link.name}</span>}
            </Link>
          ))}
        </div>

        {/* INTELLIGENCE SECTION — only for PROJECT_MANAGER */}
        {user?.role === "PROJECT_MANAGER" && (
          <div className="mt-6 pt-4">
            {!isCollapsed && <p className="px-5 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">{t.nav.intelligence}</p>}
            <div className="space-y-2">
              {user?.role === "PROJECT_MANAGER" && (
                 <>
                   <Link
                     href="/brainstorming"
                     className={`flex items-center gap-4 px-5 py-3 rounded-2xl font-semibold transition-all group border border-transparent transition-all ${
                       theme === 'dark' 
                         ? 'text-blue-400 hover:text-cyan-400 hover:bg-cyan-950/20 hover:border-cyan-900' 
                         : 'text-slate-600 hover:text-[#00CCCC] hover:bg-cyan-50 hover:border-cyan-100 shadow-sm'
                     } ${isCollapsed ? 'justify-center px-2' : ''}`}
                   >
                     <span className="shrink-0 transition-transform group-hover:scale-110 text-[#00CCCC]"><Flame size={20} strokeWidth={2} /></span>
                     {!isCollapsed && <span className="text-[16px] tracking-tight">{t.nav.warRoom}</span>}
                   </Link>
                 </>
              )}

            </div>
          </div>
        )}

      </nav>

      <div className="p-4 mt-auto space-y-4">
        <button
          onClick={() => { logout(); router.push("/login") }}
          className={`flex items-center gap-3 w-full p-4 rounded-[1.5rem] transition-all duration-300 group
            ${isCollapsed 
              ? 'justify-center bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
              : (theme === 'dark' ? 'bg-blue-900/20 border border-blue-500/10 text-blue-400 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-500' : 'bg-white/40 backdrop-blur-md border border-slate-200/50 text-slate-600 hover:border-rose-400/50 hover:bg-rose-50/50 hover:text-rose-600 shadow-sm')}`}
          title={t.nav.logout}
        >
          <span className={`shrink-0 transition-transform group-hover:rotate-12 ${isCollapsed ? '' : 'text-rose-500'}`}>
            <LogOut size={22} strokeWidth={2.5} />
          </span>
          {!isCollapsed && <span className="font-bold tracking-tight text-[16px]">{t.nav.logout}</span>}
        </button>
      </div>
    </div>

    <div className="flex-1 h-full overflow-hidden relative z-20">
      <header className="absolute top-0 left-0 right-0 h-16 z-50 border-b border-white/50 flex items-center justify-between px-8"
        style={{ background: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2.5 rounded-xl transition-all hidden lg:block ${
              theme === 'dark' ? 'hover:bg-blue-900/40 text-blue-400' : 'hover:bg-white/50 text-slate-500'
            }`}
          >
            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Middle Area */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
           {/* Badges moved to Leaderboard as requested */}
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
          
          <AlertCenter />


          {/* MINIMAL PREMIUM PROFILE */}
          <div className="flex items-center gap-3 group cursor-pointer">
             <div className="flex flex-col justify-center items-end gap-0">
                <span className="text-[12px] font-black text-slate-800 dark:text-blue-50 uppercase tracking-tight leading-none transition-colors">
                  {user?.full_name || (lang === 'fr' ? 'Utilisateur' : 'User')}
                </span>
                <div className="flex items-center gap-1 opacity-70">
                   <Zap size={8} className="text-rose-500 fill-rose-500" />
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                     {user?.role === "PROJECT_MANAGER" ? "Senior Manager" : "Fast Deliver"}
                   </span>
                </div>
             </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden shadow-lg bg-slate-100 z-10 transition-transform group-hover:scale-105">
                   <img 
                      src={(() => {
                        const u = user as any;
                        if (u?.avatar_url && u.avatar_url !== '') return u.avatar_url;
                        if (u?.gender === 'Femme') return '/girl-removebg-preview.png';
                        if (u?.gender === 'Homme') return '/boy-removebg-preview.png';
                        if (u?.role === 'PROJECT_MANAGER') return '/manager.webp';
                        const name = (u?.full_name || '').toLowerCase();
                        const isFemale = name.includes('charlie') || name.endsWith('a') || name.endsWith('e') || name.includes('tasnim') || name.includes('hajri');
                        return isFemale ? '/girl-removebg-preview.png' : '/boy-removebg-preview.png';
                      })()}
                      className="w-full h-full object-cover" 
                      alt="avatar" 
                   />
                </div>
          </div>
        </div>
      </header>
      <main className="absolute top-16 left-0 right-0 bottom-0 overflow-hidden flex flex-col z-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#00BCD4]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-float"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-[#00BCD4]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10 animate-pulse"></div>
        
        <div className="flex-1 h-full min-h-0 relative z-10 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.4, ease: "backOut" }}
              className={`h-full flex flex-col ${pathname === "/ai-insights" || pathname === "/brainstorming" || pathname === "/espace-brainstorming" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}
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

