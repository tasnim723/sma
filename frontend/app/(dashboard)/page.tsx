"use client"

import React, { useEffect, useState, useCallback } from "react"
import { usePathname } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { 
  CheckSquare, Clock, BarChart3, TrendingUp, Activity, 
  Users, Zap, Bell, CheckCircle2, AlertTriangle, 
  ListChecks, ArrowRight, Layers, Bot, Sparkles,
  Search, Filter, MoreHorizontal, LayoutDashboard, Settings, Edit3, Award, Code, Rocket, FlaskConical, Boxes, Palette,
  Check, Trash2, Star, Lightbulb, Gamepad2, BookOpen, FolderOpen, CalendarDays, ExternalLink
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import axios from "axios"
import Link from "next/link"
import { motion, AnimatePresence, Variants } from "framer-motion"
import BenchmarkingRadar from "@/components/benchmarking/BenchmarkingRadar"
import InnovationFunnel from "@/components/innovation/InnovationFunnel"
import ProjectHealth from "@/components/dashboard/ProjectHealth"
import { API_BASE_URL } from "@/lib/api"
import { useLang } from "@/lib/useLang"
import { useThemeStore } from "@/lib/themeStore"

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
     opacity: 1, 
     transition: { staggerChildren: 0.08, delayChildren: 0.1 } 
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 12 } 
  }
}

export default function DashboardPage() {
   const user = useAuthStore(state => state.user)
   const token = useAuthStore(state => state.token)

   if (!user || !token) return null;

   return (
    <div className="h-full">
       {user.role === "PROJECT_MANAGER" ? (
         <ManagerDashboard user={user} token={token} />
       ) : (
         <MemberDashboard user={user} token={token} />
       )}
     </div>
   )
}

function MemberDashboard({ user, token }: any) {
   const { theme } = useThemeStore()
   const [tasks, setTasks] = useState<any[]>([])
   const [projects, setProjects] = useState<any[]>([])
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      async function fetchMyTasks() {
         try {
            const [tasksRes, projRes] = await Promise.all([
               axios.get(`${API_BASE_URL}/api/tasks/me/all`, { headers: { Authorization: `Bearer ${token}` } }),
               axios.get(`${API_BASE_URL}/api/projects/`, { headers: { Authorization: `Bearer ${token}` } })
            ])
            setTasks(tasksRes.data || [])
            setProjects(projRes.data || [])
         } catch (err) {
            console.error("Failed to fetch personal tasks", err)
         } finally {
            setLoading(false)
         }
      }
      fetchMyTasks()
   }, [token])

   const activeTasks = tasks.filter(t => t.status !== "DONE").slice(0, 8)
   const doneCount = tasks.filter(t => t.status === "DONE").length;
   const efficiency = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

   const { t } = useLang()

   return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-4 md:p-8 space-y-8 pb-32">
         {/* Premium Welcome Header */}
         <motion.div variants={itemVariants} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00CCCC]/10 via-transparent to-[#FF0000]/5 rounded-[2rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className={`relative overflow-hidden rounded-[2rem] p-6 shadow-xl transition-all duration-500 border ${
               theme === 'dark' ? 'bg-[#0f172a]/60 backdrop-blur-xl border-blue-500/20 shadow-blue-900/20' : 'bg-white/70 backdrop-blur-xl border-white/50 shadow-slate-200/40'
            }`}>
               <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#00CCCC]/10 to-[#FF0000]/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1">
                     <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className={`text-3xl lg:text-4xl font-black tracking-tight leading-tight mb-1 transition-colors ${
                           theme === 'dark' ? 'text-blue-50' : 'text-slate-900'
                        }`}>
                           {t.dashboard.welcome}, <span className="text-[#00CCCC]">{user.full_name?.split(' ')[0] || "Heros"}</span>.
                        </h1>
                        <p className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
                           <Sparkles size={16} className="text-[#00CCCC]" /> 
                           {t.dashboard.session}
                        </p>
                        <div className="max-w-md">
                           <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#00CCCC]">Progression Globale</span>
                              <span className="text-[10px] font-black text-slate-400">{efficiency}%</span>
                           </div>
                           <div className="w-full h-2 bg-slate-200/20 rounded-full overflow-hidden border border-white/10 shadow-inner">
                              <motion.div 
                                 initial={{ width: 0 }}
                                 animate={{ width: `${efficiency}%` }}
                                 transition={{ duration: 2, ease: "easeOut" }}
                                 className="h-full bg-gradient-to-r from-[#00CCCC] to-blue-500 shadow-[0_0_15px_rgba(0,204,204,0.4)]"
                              />
                           </div>
                        </div>
                     </motion.div>
                  </div>
               </div>
            </div>
         </motion.div>

         {/* Grid Content */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center justify-between px-4">
                  <h2 className={`text-xl font-black flex items-center gap-3 transition-colors ${theme === 'dark' ? 'text-blue-100' : 'text-slate-900'}`}>
                     <ListChecks size={24} className="text-[#00CCCC]" />
                     {t.dashboard.priorities}
                  </h2>
                  <Link href="/tasks" className="text-sm font-black text-[#00CCCC] hover:translate-x-1 transition-transform flex items-center gap-2">
                     {t.dashboard.seeAll} <ArrowRight size={16} />
                  </Link>
               </div>
               
               <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                     {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-28 bg-white/50 animate-pulse rounded-3xl border border-slate-100" />)
                     ) : activeTasks.length > 0 ? (
                        activeTasks.map((task, idx) => (
                           <Link key={task._id || idx} href={`/projects/${task.project_id}`}>
                           <motion.div 
                              variants={itemVariants}
                              whileHover={{ scale: 1.015, y: -2 }}
                              className={`group flex items-center p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden neon-box-cyan ${
                                 theme === 'dark' ? 'bg-[#0f172a]/60 border-blue-500/10 shadow-xl' : 'bg-white/60 backdrop-blur-xl hover:bg-white/80 border-white shadow-lg shadow-slate-200/50'
                              }`}
                           >
                              {/* Neon Track Effect */}
                              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#00CCCC]/20 rounded-[2rem] pointer-events-none transition-all" />
                              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00CCCC] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
                              
                              <div className="w-1.5 h-16 rounded-full bg-[#00CCCC] group-hover:shadow-[0_0_15px_#00CCCC] transition-all mr-6" />
                              <div className="flex-1 min-w-0 pr-6 py-2">
                                  <h3 className={`font-black text-xl mb-1 truncate group-hover:text-[#00CCCC] transition-colors ${
                                     theme === 'dark' ? 'text-blue-50' : 'text-slate-900'
                                  }`}>{task.title}</h3>
                                  
                                  {task.description && (
                                     <p className="text-[11px] font-semibold text-slate-500 line-clamp-1 mb-3">
                                        {task.description.replace(/#+/g, '').trim()}
                                     </p>
                                  )}

                                 <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-4 text-slate-400 font-bold text-[12px] uppercase tracking-wider">
                                       <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00CCCC]/10 text-[#00CCCC] rounded-md transition-colors hover:bg-[#00CCCC]/20">
                                          <Clock size={14} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Pas de délai'}
                                       </span>
                                       <Badge variant="secondary" className={`border-none text-[10px] px-3 py-1 font-black leading-none uppercase tracking-tighter transition-colors ${
                                          theme === 'dark' ? 'bg-blue-950 text-blue-400' : 'bg-slate-50 text-slate-500'
                                       }`}>
                                          {task.status?.replace('_', ' ') || 'BACKLOG'}
                                       </Badge>
                                    </div>
                                    
                                 </div>
                              </div>

                              <div className="flex items-center gap-4">
                                 {/* Member Avatar */}
                                 <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#00CCCC] to-[#3b82f6] p-[2px] shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Avatar className="h-full w-full rounded-[14px] border border-white">
                                       {user.avatar_url && <AvatarImage src={user.avatar_url} alt={user.full_name} className="object-cover" />}
                                       <AvatarFallback className="bg-white text-xs font-black text-slate-700">
                                          {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                       </AvatarFallback>
                                    </Avatar>
                                 </div>

                                 <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all shadow-inner ${
                                    theme === 'dark' ? 'bg-blue-900/40 border border-blue-500/20 text-blue-400 group-hover:bg-[#00CCCC] group-hover:text-white' : 'bg-white/50 border border-slate-100 group-hover:bg-[#00CCCC] group-hover:text-white'
                                 }`}>
                                    <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                                 </div>
                              </div>

                           </motion.div>
                           </Link>
                        ))
                     ) : (
                        <div className="py-12 bg-white/40 border-4 border-dashed border-slate-200 rounded-[2.5rem] text-center flex flex-col items-center">
                           <Sparkles size={48} className="text-[#00CCCC]/30 mb-4 animate-pulse" />
                           <p className="text-slate-500 font-black text-xl">Tout est à jour !</p>
                           <p className="text-slate-400 font-bold text-sm mt-1">{t.dashboard.allDoneSubtitle}</p>
                        </div>
                     )}
                  </AnimatePresence>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
                {/* Projet Récent Card */}
                {(() => {
                   const recentProject = [...projects].sort((a, b) => {
                      const dateA = new Date(a.updated_at || a.created_at || 0).getTime()
                      const dateB = new Date(b.updated_at || b.created_at || 0).getTime()
                      return dateB - dateA
                   })[0]

                   if (!recentProject) return null

                   const lastUpdate = recentProject.updated_at || recentProject.created_at
                   const formattedDate = lastUpdate
                      ? new Date(lastUpdate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Récemment'
                   const members = recentProject.team_members_info || []
                   const displayMembers = members.slice(0, 4)
                   const extraCount = members.length - 4

                   return (
                      <Link href={`/projects/${recentProject.id}`}>
                      <motion.div
                         whileHover={{ y: -8, scale: 1.02, boxShadow: "0 0 50px rgba(0, 204, 204, 0.25), 0 0 100px rgba(0, 204, 204, 0.08)" }}
                         className="neon-box-cyan light-sweep-container shrink-0 frosted-glass group cursor-pointer relative"
                      >
                         <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00CCCC] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                         <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#00CCCC]/8 rounded-full blur-[40px] group-hover:bg-[#00CCCC]/15 transition-all duration-700 pointer-events-none" />
                         <div className="relative px-5 py-4 min-h-[140px] flex flex-col justify-between">
                            <div className="relative z-10">
                               <div className="flex items-center gap-2 mb-3">
                                  <motion.div
                                     animate={{ rotate: [0, -8, 8, 0] }}
                                     transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                     className="p-1.5 rounded-lg bg-[#00CCCC]/10 border border-[#00CCCC]/20"
                                  >
                                     <FolderOpen size={14} className="text-[#00CCCC]" />
                                  </motion.div>
                                  <p className="text-[10px] font-black tracking-[0.2em] text-[#00CCCC] uppercase">Projet Récent</p>
                                  <div className="ml-auto">
                                     <ExternalLink size={12} className="text-[#00CCCC] opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                               </div>
                               <h3 className={`text-[16px] font-black leading-tight truncate group-hover:text-[#00CCCC] transition-colors duration-300 ${
                                  theme === 'dark' ? 'text-blue-50' : 'text-slate-800'
                               }`}>{recentProject.name}</h3>
                               <div className="flex items-center gap-1.5 mt-1.5">
                                  <CalendarDays size={12} className="text-slate-400" />
                                  <span className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-blue-300/60' : 'text-slate-400'}`}>
                                     Mis à jour le {formattedDate}
                                  </span>
                               </div>
                            </div>
                            <div className="relative z-10 flex items-center justify-between mt-3">
                               <div className="flex items-center -space-x-2">
                                  {displayMembers.map((member: any, i: number) => (
                                     <div key={i} className={`w-8 h-8 rounded-full border-2 overflow-hidden shadow-md ${theme === 'dark' ? 'border-[#0f172a]' : 'border-white'}`}>
                                        <Avatar className="h-full w-full">
                                           <AvatarFallback className="bg-gradient-to-br from-[#00CCCC] to-[#3b82f6] text-[10px] font-black text-white">
                                              {member.full_name?.charAt(0).toUpperCase() || '?'}
                                           </AvatarFallback>
                                        </Avatar>
                                     </div>
                                  ))}
                                  {extraCount > 0 && (
                                     <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-md ${
                                        theme === 'dark' ? 'bg-blue-900/80 border-[#0f172a] text-blue-300' : 'bg-slate-100 border-white text-slate-500'
                                     }`}>+{extraCount}</div>
                                  )}
                               </div>
                               <motion.div
                                  whileHover={{ scale: 1.08 }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00CCCC] to-[#0891b2] text-white text-[10px] font-black uppercase tracking-wider shadow-lg"
                               >
                                  <Rocket size={11} />
                                  Accéder
                                  <ArrowRight size={11} />
                               </motion.div>
                            </div>
                         </div>
                         <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00CCCC]/30 to-transparent" />
                      </motion.div>
                      </Link>
                   )
                })()}

                <div className="grid grid-cols-2 gap-4 mt-6">
                   <KPICard title={t.dashboard.completedTasks} value={doneCount} icon={<CheckCircle2 />} color="text-emerald-500" bg="glow-green" />
                   <KPICard title={(t.dashboard as any).activeTasks ?? 'Tâches actives'} value={activeTasks.length} icon={<ListChecks />} color="text-[#00CCCC]" bg="glow-cyan" />
                </div>
             </div>
         </div>
      </motion.div>
   )
}

function Sparkline({ data, color }: { data: number[], color: string }) {
   if (!data || data.length < 2) return null;
   const min = Math.min(...data);
   const max = Math.max(...data);
   const range = max - min || 1;
   const width = 100;
   const height = 30;
   
   const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
   }).join(' ');

   return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-16 h-8 opacity-60">
         <motion.polyline
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            points={points}
            className={`sparkline-path ${color}`}
            style={{ stroke: 'currentColor' }}
         />
      </svg>
   );
}

function KPICard({ title, value, icon, bg, color, sparkData }: any) {
   const { theme } = useThemeStore()
   const [displayValue, setDisplayValue] = useState(0);
   
   useEffect(() => {
      const target = parseInt(value.toString().replace(/[^0-9]/g, '')) || 0;
      if (target === 0) return;
      
      let start = 0;
      const duration = 1000;
      const step = target / (duration / 16);
      
      const timer = setInterval(() => {
         start += step;
         if (start >= target) {
            setDisplayValue(target);
            clearInterval(timer);
         } else {
            setDisplayValue(Math.floor(start));
         }
      }, 16);
      
      return () => clearInterval(timer);
   }, [value]);

   return (
      <motion.div 
         whileHover={{ y: -5, scale: 1.02 }}
         className={`rounded-[2rem] p-5 transition-all duration-300 relative group flex gap-3 items-center frosted-glass border border-white/20 shadow-xl ${bg}`}
      >
         <div className={`p-4 rounded-xl bg-white/10 shrink-0 ${color} group-hover:scale-110 transition-transform border border-white/10`}>
            {React.cloneElement(icon, { size: 22, strokeWidth: 2 })}
         </div>
         <div className="flex-1 flex flex-col justify-center">
            <h3 className={`text-3xl font-black leading-none tracking-tighter mb-1 transition-colors ${theme === 'dark' ? 'text-blue-50' : 'text-slate-800'}`}>
               {typeof value === 'string' && value.includes('%') ? `${displayValue}%` : displayValue}
            </h3>
            <p className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${theme === 'dark' ? 'text-blue-400' : 'text-slate-500'}`}>
               {title}
            </p>
         </div>
         
         <div className="hidden sm:block">
            <Sparkline data={sparkData} color={color} />
         </div>

         <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
            <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')} opacity-20 group-hover:opacity-100 transition-opacity`} />
         </div>
      </motion.div>
   )
}

function ManagerDashboard({ user, token }: any) {
   const pathname = usePathname()
   const [history, setHistory] = useState<string[]>([])
   const [insights, setInsights] = useState<any[]>([])
   const [projects, setProjects] = useState<any[]>([])
   const [activeProjectTasks, setActiveProjectTasks] = useState<any[]>([])
   const [stats, setStats] = useState<any>({
      activeProjects: 0,
      completedTasks: 0,
      upcomingDeadlines: 0,
      teamCapacity: "0%",
      sparklines: {}
   })
   const [loading, setLoading] = useState(true)

   const fetchData = useCallback(async () => {
      try {
         const [hubRes, projectsRes] = await Promise.all([
            axios.get(`${API_BASE_URL}/api/hub/history`, {
               headers: { Authorization: `Bearer ${token}` }
            }),
            axios.get(`${API_BASE_URL}/api/projects/`, {
               headers: { Authorization: `Bearer ${token}` }
            })
         ])
         setHistory(hubRes.data.history || [])
         setInsights(hubRes.data.insights || [])
         if (hubRes.data.stats) setStats(hubRes.data.stats)
         const loadedProjects = projectsRes.data || [];
         setProjects(loadedProjects)

         const activeProject = loadedProjects.find((p: any) => p.status !== 'COMPLETED');
         if (activeProject) {
             try {
                 const tasksRes = await axios.get(`${API_BASE_URL}/api/tasks/project/${activeProject.id}`, { headers: { Authorization: `Bearer ${token}` }});
                 setActiveProjectTasks(tasksRes.data || []);
             } catch (e) {
                 // Non-critical: XP data unavailable
             }
         }
      } catch (err) {
         if (axios.isAxiosError(err)) {
            if (err.response?.status === 401 || !err.response) {
               window.location.href = "/login";
               return;
            }
            console.error("Dashboard API error:", err.response?.status, err.response?.data)
         } else {
            console.error("Dashboard unexpected error:", err)
         }
      } finally {
         setLoading(false)
      }
   }, [token])

   // Fetch on mount and every time user navigates back to dashboard
   useEffect(() => {
      if (token) fetchData()
   }, [token, pathname, fetchData])

   const { t } = useLang()
   const { theme } = useThemeStore()

   const handleActionInsight = (query: string) => {
      window.dispatchEvent(new CustomEvent('trigger-ai-chat', { detail: { query } }));
   };

   return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full p-4 md:p-8 space-y-6 pb-2 min-h-0">
         <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KPICard title={t.dashboard.treats} value={stats.activeProjects} sparkData={stats.sparklines?.activeProjects} icon={<FlaskConical />} color="text-amber-500" bg="glow-yellow" />
            <KPICard title={t.dashboard.innovations} value={stats.completedTasks} sparkData={stats.sparklines?.completedTasks} icon={<Lightbulb />} color="text-rose-500" bg="glow-red" />
            <KPICard title={t.dashboard.trends} value={stats.upcomingDeadlines} sparkData={stats.sparklines?.upcomingDeadlines} icon={<TrendingUp />} color="text-sky-500" bg="glow-blue" />
         </motion.div>


         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch flex-1 min-h-0">
            <div className="xl:col-span-8 flex flex-col">
               <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="flex items-center justify-between px-4 text-center sm:text-left">
                     <h2 className={`text-xl font-bold tracking-wide flex items-center gap-3 transition-colors ${theme === 'dark' ? 'text-blue-100' : 'text-slate-800'}`}>
                        {t.dashboard.activityFeed}
                     </h2>
                  </div>
                  
                  <motion.div 
                     whileHover={{ y: -8, scale: 1.01, boxShadow: "0 0 40px rgba(0, 188, 212, 0.2)" }}
                     className="neon-box-cyan light-sweep-container flex-1 flex flex-col min-h-0 frosted-glass"
                  >
                     <div className="relative flex-1 p-6 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 relative z-10 p-2">
                        <AnimatePresence>
                           {loading ? (
                              [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50/10 animate-pulse rounded-2xl" />)
                           ) : history.length > 0 ? (
                              history.slice(0, 5).map((line, idx) => {
                                 const getActivityStyle = (msg: string) => {
                                    const lower = msg.toLowerCase();
                                    if (lower.includes('archived') || lower.includes('archivé') || lower.includes('_archived')) {
                                       return { 
                                          color: 'bg-amber-500', 
                                          border: 'border-amber-200',
                                          icon: <Star size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'ARCHIVE',
                                          hoverHex: '#f59e0b'
                                       };
                                    }
                                    if (lower.includes('unarchived') || lower.includes('désarchivé') || lower.includes('_unarchived')) {
                                       return { 
                                          color: 'bg-sky-500', 
                                          border: 'border-sky-200',
                                          icon: <ArrowRight size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'DÉSARCHIVÉ',
                                          hoverHex: '#0ea5e9'
                                       };
                                    }
                                    if (lower.includes('added') || lower.includes('créé') || lower.includes('création') || lower.includes('completed')) {
                                       return { 
                                          color: 'bg-emerald-500', 
                                          border: 'border-emerald-200',
                                          icon: <Check size={14} strokeWidth={4} className="text-white" />,
                                          badge: 'AJOUT',
                                          hoverHex: '#10b981'
                                       };
                                    }
                                    if (lower.includes('delete') || lower.includes('supprimé') || lower.includes('removal')) {
                                       return { 
                                          color: 'bg-rose-500', 
                                          border: 'border-rose-200',
                                          icon: <Trash2 size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'SUPPRESSION',
                                          hoverHex: '#f43f5e'
                                       };
                                    }
                                    if (lower.includes('alerte') || lower.includes('deadline') || lower.includes('urgent') || lower.includes('attention')) {
                                       return { 
                                          color: 'bg-rose-400', 
                                          border: 'border-rose-100',
                                          icon: <AlertTriangle size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'ALERTE',
                                          hoverHex: '#fb7185'
                                       };
                                    }
                                    if (lower.includes('tech') || lower.includes('stack') || lower.includes('architecture') || lower.includes('bim')) {
                                       return { 
                                          color: 'bg-cyan-500', 
                                          border: 'border-cyan-200',
                                          icon: <Boxes size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'ARCHITECTURE / BIM',
                                          hoverHex: '#06b6d4'
                                       };
                                    }
                                    if (lower.includes('art') || lower.includes('3d') || lower.includes('vfx') || lower.includes('animation')) {
                                       return { 
                                          color: 'bg-purple-500', 
                                          border: 'border-purple-200',
                                          icon: <Palette size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'ARTS NUMÉRIQUES',
                                          hoverHex: '#a855f7'
                                       };
                                    }
                                    if (lower.includes('edu') || lower.includes('formation') || lower.includes('cours') || lower.includes('lms')) {
                                       return { 
                                          color: 'bg-amber-500', 
                                          border: 'border-amber-200',
                                          icon: <BookOpen size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'FORMATION / EDTECH',
                                          hoverHex: '#f59e0b'
                                       };
                                    }
                                    if (lower.includes('dev') || lower.includes('game') || lower.includes('code')) {
                                       return { 
                                          color: 'bg-rose-500', 
                                          border: 'border-rose-200',
                                          icon: <Gamepad2 size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'GAME DEV',
                                          hoverHex: '#f43f5e'
                                       };
                                    }
                                    return { 
                                       color: 'bg-[#00BCD4]', 
                                       border: 'border-[#00BCD4]/30',
                                       icon: <Zap size={14} strokeWidth={2.5} className="text-white" />,
                                       badge: 'SIGNAL',
                                       hoverHex: '#00BCD4'
                                    };
                                 };

                                 const style = getActivityStyle(line);

                                 return (
                                 <motion.div 
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                    whileHover="hover"
                                    key={idx} 
                                    className="flex gap-6 group relative"
                                 >
                                    <div className="flex flex-col items-center">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${style.border} ${style.color} shadow-lg z-10 transform group-hover:scale-110 transition-transform`}>
                                          {style.icon}
                                       </div>
                                       <div className="w-[1.5px] flex-1 bg-gradient-to-b from-slate-200/20 to-transparent my-2" />
                                    </div>
                                    <div className="flex-1 pb-8 relative">
                                       <div className="flex items-center gap-3 mb-2">
                                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${style.color.replace('bg-', 'text-')}`}>
                                             {style.badge}
                                          </span>
                                          <div className="h-[1px] flex-1 bg-slate-100/10" />
                                       </div>
                                       <motion.p 
                                          variants={{ hover: { color: style.hoverHex } }}
                                          className={`text-[15px] font-bold leading-relaxed transition-colors ${theme === 'dark' ? 'text-blue-100' : 'text-slate-700'}`}
                                       >
                                          {line}
                                       </motion.p>
                                       <div className={`absolute bottom-4 left-0 right-0 h-[1px] transition-colors ${theme === 'dark' ? 'bg-blue-900/50' : 'bg-slate-400/50'}`} />
                                    </div>
                                 </motion.div>
                                 );
                              })
                           ) : (
                              <div className="text-center py-20 opacity-50"><p className="font-black text-slate-300">CALME GÉNÉRAL</p></div>
                           )}
                        </AnimatePresence>
                        </div>
                     </div>
                  </motion.div>
               </div>
            </div>

            <div className="xl:col-span-4 flex flex-col gap-6">
                {/* Recent Project Card */}
                {(() => {
                   // Find the most recently created/updated project
                   const recentProject = [...projects].sort((a, b) => {
                      const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
                      const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
                      return dateB - dateA;
                   })[0];

                   if (!recentProject) return null;

                   const lastUpdate = recentProject.updated_at || recentProject.created_at;
                   const formattedDate = lastUpdate
                      ? new Date(lastUpdate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Récemment';
                   const members = recentProject.team_members_info || [];
                   const displayMembers = members.slice(0, 4);
                   const extraCount = members.length - 4;

                   return (
                      <Link href={`/projects/${recentProject.id}`}>
                      <motion.div 
                         whileHover={{ y: -8, scale: 1.02, boxShadow: "0 0 50px rgba(0, 204, 204, 0.25), 0 0 100px rgba(0, 204, 204, 0.08)" }}
                         className="neon-box-cyan light-sweep-container shrink-0 frosted-glass group cursor-pointer relative"
                      >
                         {/* Top neon sweep line */}
                         <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00CCCC] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                         {/* Glow orb */}
                         <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#00CCCC]/8 rounded-full blur-[40px] group-hover:bg-[#00CCCC]/15 transition-all duration-700 pointer-events-none" />

                         <div className="relative px-5 py-4 min-h-[140px] flex flex-col justify-between">
                            {/* Header */}
                            <div className="relative z-10">
                               <div className="flex items-center gap-2 mb-3">
                                  <motion.div
                                     animate={{ rotate: [0, -8, 8, 0] }}
                                     transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                     className="p-1.5 rounded-lg bg-[#00CCCC]/10 border border-[#00CCCC]/20"
                                  >
                                     <FolderOpen size={14} className="text-[#00CCCC]" />
                                  </motion.div>
                                  <p className="text-[10px] font-black tracking-[0.2em] text-[#00CCCC] uppercase">Projet Récent</p>
                                  <div className="ml-auto">
                                     <motion.div
                                        animate={{ x: [0, 4, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        className="p-1 rounded-full bg-[#00CCCC]/10 border border-[#00CCCC]/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                     >
                                        <ExternalLink size={12} className="text-[#00CCCC]" />
                                     </motion.div>
                                  </div>
                               </div>

                               {/* Project name */}
                               <h3 className={`text-[16px] font-black leading-tight truncate group-hover:text-[#00CCCC] transition-colors duration-300 ${
                                  theme === 'dark' ? 'text-blue-50' : 'text-slate-800'
                               }`}>
                                  {recentProject.name}
                               </h3>

                               {/* Last update */}
                               <div className="flex items-center gap-1.5 mt-1.5">
                                  <CalendarDays size={12} className="text-slate-400" />
                                  <span className={`text-[11px] font-bold transition-colors ${theme === 'dark' ? 'text-blue-300/60' : 'text-slate-400'}`}>
                                     Mis à jour le {formattedDate}
                                  </span>
                               </div>
                            </div>

                            {/* Bottom row: avatars + button */}
                            <div className="relative z-10 flex items-center justify-between mt-3">
                               {/* Member avatars */}
                               <div className="flex items-center -space-x-2">
                                  {displayMembers.map((member: any, i: number) => (
                                     <motion.div
                                        key={member.id || i}
                                        initial={{ opacity: 0, scale: 0, x: -10 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200 }}
                                        className="relative group/avatar"
                                     >
                                        <div className={`w-8 h-8 rounded-full border-2 overflow-hidden shadow-md transition-transform hover:scale-110 hover:z-10 ${
                                           theme === 'dark' ? 'border-[#0f172a]' : 'border-white'
                                        }`}>
                                           <Avatar className="h-full w-full">
                                              {member.avatar_url && <AvatarImage src={member.avatar_url.startsWith('http') ? member.avatar_url : `${API_BASE_URL}/${member.avatar_url}`} alt={member.full_name} className="object-cover" />}
                                              <AvatarFallback className="bg-gradient-to-br from-[#00CCCC] to-[#3b82f6] text-[10px] font-black text-white">
                                                 {member.full_name?.charAt(0).toUpperCase() || '?'}
                                              </AvatarFallback>
                                           </Avatar>
                                        </div>
                                     </motion.div>
                                  ))}
                                  {extraCount > 0 && (
                                     <motion.div
                                        initial={{ opacity: 0, scale: 0 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-md ${
                                           theme === 'dark'
                                              ? 'bg-blue-900/80 border-[#0f172a] text-blue-300'
                                              : 'bg-slate-100 border-white text-slate-500'
                                        }`}
                                     >
                                        +{extraCount}
                                     </motion.div>
                                  )}
                                  {members.length === 0 && (
                                     <span className={`text-[10px] font-bold italic ${theme === 'dark' ? 'text-blue-400/50' : 'text-slate-400'}`}>Aucun membre</span>
                                  )}
                               </div>

                               {/* Access button */}
                               <motion.div
                                  whileHover={{ scale: 1.08, boxShadow: "0 0 20px rgba(0,204,204,0.4)" }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00CCCC] to-[#0891b2] text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-cyan-500/25 border border-white/20 transition-all"
                               >
                                  <Rocket size={11} />
                                  Accéder
                                  <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                               </motion.div>
                            </div>
                         </div>

                         {/* Bottom neon sweep line */}
                         <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00CCCC]/30 to-transparent" />
                      </motion.div>
                      </Link>
                   );
                })()}

               {(() => {
                  const activeProject = projects.find(p => p.status !== 'COMPLETED');
                  if (!activeProject) {
                     return <ProjectHealth token={token} />;
                  }
                  
                  return <ProjectHealth token={token} />;
               })() }
            </div>
         </div>
      </motion.div>
   )
}



