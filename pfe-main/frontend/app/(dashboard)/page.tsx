"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"
import { 
  CheckSquare, Clock, BarChart3, TrendingUp, Activity, 
  Users, Zap, Bell, CheckCircle2, AlertTriangle, 
  ListChecks, ArrowRight, Layers, Bot, Sparkles,
  Search, Filter, MoreHorizontal
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import Link from "next/link"
import { motion, AnimatePresence, Variants } from "framer-motion"

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
     <div className="min-h-screen">
       {user.role === "PROJECT_MANAGER" ? (
         <ManagerDashboard user={user} token={token} />
       ) : (
         <MemberDashboard user={user} token={token} />
       )}
     </div>
   )
}

function MemberDashboard({ user, token }: any) {
   const [tasks, setTasks] = useState<any[]>([])
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      async function fetchMyTasks() {
         try {
            const res = await axios.get("http://localhost:8000/api/tasks/me/all", {
               headers: { Authorization: `Bearer ${token}` }
            })
            setTasks(res.data || [])
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

   return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-16">
         {/* Premium Welcome Header */}
         <motion.div variants={itemVariants} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00CCCC]/10 via-transparent to-[#FF0000]/5 rounded-[2rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative overflow-hidden rounded-[2rem] bg-white/80 backdrop-blur-xl border border-white/50 p-6 shadow-xl shadow-slate-200/40">
               <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#00CCCC]/10 to-[#FF0000]/5 rounded-full blur-[60px] -mr-16 -mt-16 pointer-events-none" />
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex-1">
                     <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-1">
                           Bienvenue, <span className="text-[#00CCCC]">{user.full_name?.split(' ')[0] || "Heros"}</span>.
                        </h1>
                        <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                           <Sparkles size={16} className="text-[#00CCCC]" /> 
                           SMA Connecté • Session Active
                        </p>
                     </motion.div>
                  </div>
               </div>
            </div>
         </motion.div>

         {/* Grid Content */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center justify-between px-4">
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                     <ListChecks size={24} className="text-[#00CCCC]" />
                     Priorités du Moment
                  </h2>
                  <Link href="/tasks" className="text-sm font-black text-[#00CCCC] hover:translate-x-1 transition-transform flex items-center gap-2">
                     Voir tout <ArrowRight size={16} />
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
                              className="group flex items-center p-6 bg-white hover:bg-slate-50/50 rounded-[2rem] border border-slate-100 shadow-sm transition-all cursor-pointer relative overflow-hidden"
                           >
                              <div className="w-1.5 h-12 rounded-full bg-[#00CCCC] group-hover:bg-[#FF0000] transition-colors mr-6" />
                              <div className="flex-1 min-w-0 pr-6">
                                 <h3 className="font-black text-xl text-slate-900 mb-1 truncate group-hover:text-[#00CCCC] transition-colors">{task.title}</h3>
                                 <div className="flex items-center gap-4 text-slate-400 font-bold text-[12px] uppercase tracking-wider">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-[#00CCCC]/10 text-[#00CCCC] rounded-md transition-colors hover:bg-[#00CCCC]/20">
                                       <Clock size={14} /> {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Pas de délai'}
                                    </span>
                                    <Badge variant="secondary" className="bg-slate-50 text-slate-500 border-none text-[10px] px-3 py-1 font-black leading-none uppercase tracking-tighter">
                                       {task.status?.replace('_', ' ') || 'BACKLOG'}
                                    </Badge>
                                 </div>
                              </div>
                              <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-[#00CCCC] group-hover:text-white transition-all shadow-inner">
                                 <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
                              </div>
                           </motion.div>
                           </Link>
                        ))
                     ) : (
                        <div className="py-12 bg-white/40 border-4 border-dashed border-slate-200 rounded-[2.5rem] text-center flex flex-col items-center">
                           <Sparkles size={48} className="text-[#00CCCC]/30 mb-4 animate-pulse" />
                           <p className="text-slate-500 font-black text-xl">Tout est à jour !</p>
                           <p className="text-slate-400 font-bold text-sm mt-1">Profitez d'un moment de calme.</p>
                        </div>
                     )}
                  </AnimatePresence>
               </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
               {/* AI Mini Card - Light Theme */}
               <motion.div 
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="relative group cursor-pointer"
               >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00CCCC]/20 to-[#FF0000]/10 rounded-[2rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 text-slate-800 overflow-hidden border border-white shadow-xl shadow-slate-200/50">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-[#00CCCC]/5 rounded-full blur-2xl -mr-12 -mt-12" />
                     <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center">
                              <Bot size={22} className="text-[#00CCCC]" />
                           </div>
                           <div>
                              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0000]/80">Insight Stratégique</p>
                              <h4 className="text-xs font-black text-slate-400">Assistant I.A.</h4>
                           </div>
                        </div>
                        <p className="text-[14px] font-bold leading-relaxed text-slate-700">
                           "Optimise tes blocs de temps. Finir la tâche '{activeTasks[0]?.title.slice(0, 15) || 'principale'}' libérera de la capacité."
                        </p>
                     </div>
                  </div>
               </motion.div>

               {/* Metrics Mini Grid */}
               <div className="grid grid-cols-2 gap-4">
                  <KPICard title="Terminé" value={doneCount} icon={<CheckCircle2 />} color="text-emerald-500" bg="bg-emerald-500/10" />
                  <KPICard title="En Cours" value={tasks.filter(t => t.status === "IN_PROGRESS").length} icon={<Zap />} color="text-[#00CCCC]" bg="bg-[#00CCCC]/10" />
               </div>
            </div>
         </div>
      </motion.div>
   )
}

function ManagerDashboard({ user, token }: any) {
   const [history, setHistory] = useState<string[]>([])
   const [insights, setInsights] = useState<any[]>([])
   const [projects, setProjects] = useState<any[]>([])
   const [stats, setStats] = useState({
      activeProjects: 0,
      completedTasks: 0,
      upcomingDeadlines: 0,
      teamCapacity: "0%"
   })
   const [loading, setLoading] = useState(true)

   useEffect(() => {
      async function fetchData() {
         try {
            const [hubRes, projectsRes] = await Promise.all([
               axios.get("http://localhost:8000/api/hub/history", {
                  headers: { Authorization: `Bearer ${token}` }
               }),
               axios.get("http://localhost:8000/api/projects/", {
                  headers: { Authorization: `Bearer ${token}` }
               })
            ])
            setHistory(hubRes.data.history || [])
            setInsights(hubRes.data.insights || [])
            if (hubRes.data.stats) setStats(hubRes.data.stats)
            setProjects(projectsRes.data || [])
         } catch (err) {
            console.error("Failed to fetch dashboard data", err)
         } finally {
            setLoading(false)
         }
      }
      if (token) fetchData()
   }, [token])

   return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-16">
         {/* Stats Row */}
         <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard title="Projets Actifs" value={stats.activeProjects} icon={<BarChart3 />} color="text-[#00CCCC]" bg="bg-[#00CCCC]/10" />
            <KPICard title="Tâches Réussies" value={stats.completedTasks} icon={<CheckCircle2 />} color="text-slate-800" bg="bg-slate-100" />
            <KPICard title="Alertes Délais" value={stats.upcomingDeadlines} icon={<Clock />} color="text-[#FF0000]" bg="bg-[#FF0000]/10" alert={stats.upcomingDeadlines > 0} />
            <KPICard title="Charge Équipe" value={stats.teamCapacity} icon={<Users />} color="text-[#00CCCC]" bg="bg-[#00CCCC]/10" />
         </motion.div>

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* Main Content Area */}
            <div className="xl:col-span-8 space-y-8">
               {/* Live Feed with Timeline UI */}
               <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between px-4 text-center sm:text-left">
                     <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Activity size={24} className="text-[#FF0000] animate-pulse" />
                        Activité Pulsée
                     </h2>
                     <div className="hidden sm:flex gap-2">
                        <button className="p-2 bg-white rounded-xl border border-slate-100 text-slate-400 hover:text-[#00CCCC] transition-colors shadow-sm"><Filter size={16} /></button>
                     </div>
                  </div>
                  
                  <div className="relative overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 p-8 shadow-xl shadow-slate-200/40">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#00CCCC]/5 to-transparent rounded-full blur-3xl" />
                     <div className="max-h-[520px] overflow-y-auto pr-2 custom-scrollbar space-y-6 relative z-10 p-2">
                        <AnimatePresence>
                           {loading ? (
                              [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl" />)
                           ) : history.length > 0 ? (
                              history.map((line, idx) => (
                                 <motion.div 
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                    key={idx} 
                                    className="flex gap-6 group relative"
                                 >
                                    <div className="flex flex-col items-center">
                                       <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl transition-all duration-500 scale-100 group-hover:scale-125
                                          ${line.includes('DELETED') || line.includes('FAILED') ? 'bg-[#FF0000]' : 'bg-[#00CCCC]'}`} 
                                       />
                                       <div className="w-[2px] flex-1 bg-gradient-to-b from-slate-100 to-transparent my-2" />
                                    </div>
                                    <div className="flex-1 pb-6">
                                       <div className="flex items-center gap-3 mb-1">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                             Flux SMA
                                          </span>
                                          <div className="h-[1px] flex-1 bg-slate-50" />
                                       </div>
                                       <p className="text-[15px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors leading-relaxed">
                                          {line}
                                       </p>
                                    </div>
                                 </motion.div>
                              ))
                           ) : (
                              <div className="text-center py-20 opacity-50"><p className="font-black text-slate-300">CALME GÉNÉRAL</p></div>
                           )}
                        </AnimatePresence>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right Aside Info */}
            <div className="xl:col-span-4 space-y-8">
               {/* AI Mini Card - Light Theme */}
               <motion.div 
                  whileHover={{ y: -5 }}
                  className="relative group cursor-pointer"
               >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00CCCC]/20 to-[#FF0000]/10 rounded-[2rem] blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 text-slate-800 overflow-hidden border border-white shadow-xl shadow-slate-200/50">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-[#00CCCC]/5 rounded-full blur-2xl -mr-12 -mt-12" />
                     <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                           <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center shadow-sm">
                              <Bot size={24} className="text-[#00CCCC]" />
                           </div>
                           <Badge className="bg-[#00CCCC]/10 text-[#00CCCC] font-black border-none px-3 uppercase text-[9px] tracking-widest">En Ligne</Badge>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FF0000]/80">Vision IA Augmentée</p>
                           <p className="text-[14px] font-bold text-slate-700 leading-snug tracking-tight">
                              "{insights[0]?.description || "L'équilibre des équipes est optimal. Maintenez le rythme sur les objectifs prioritaires."}"
                           </p>
                        </div>
                     </div>
                  </div>
               </motion.div>

               {/* Modern Project List */}
               <div className="flex flex-col gap-4">
                  <div className="px-4"><h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={16} /> Focus Projets</h3></div>
                  <div className="grid grid-cols-1 gap-3">
                     {projects.filter(p => p.status !== 'COMPLETED').slice(0, 3).map((project) => (
                        <Link 
                           key={project.id} 
                           href={`/projects/${project.id || project._id}`} 
                           className="group flex flex-col p-5 bg-white border border-slate-100 rounded-[2rem] hover:border-[#00CCCC]/40 hover:shadow-xl hover:shadow-slate-200/50 transition-all font-sans"
                        >
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="font-black text-lg text-slate-800 group-hover:text-[#00CCCC] transition-colors truncate">{project.name}</h4>
                              <MoreHorizontal size={18} className="text-slate-300" />
                           </div>
                           <div className="space-y-3">
                              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider">
                                 <span className="text-[#00CCCC]">Avancement Global</span>
                                 <span className="text-slate-900">{project.progress_percentage}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                                 <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${project.progress_percentage}%` }}
                                    transition={{ duration: 1.5, ease: "circOut" }}
                                    className="h-full bg-gradient-to-r from-[#00CCCC] to-[#FF0000] rounded-full" 
                                 />
                              </div>
                           </div>
                        </Link>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </motion.div>
   )
}

function KPICard({ title, value, icon, bg, color, alert = false }: any) {
   return (
      <motion.div 
         whileHover={{ y: -8, scale: 1.025 }}
         className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-xl shadow-slate-200/30 hover:shadow-2xl transition-all duration-500 relative overflow-hidden group"
      >
         <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-[#00CCCC]/5 transition-colors" />
         
         <div className="flex items-center gap-5 relative z-10">
            <div className={`p-4 rounded-2xl ${bg} ${color} shadow-sm group-hover:rotate-12 transition-transform duration-500`}>
               {React.cloneElement(icon, { size: 24 })}
            </div>
            <div>
               <h3 className="text-3xl font-black text-slate-800 leading-none mb-1">{value}</h3>
               <p className={`text-[10px] font-black uppercase tracking-widest ${alert ? 'text-[#FF0000]' : 'text-slate-400'}`}>
                  {title}
               </p>
            </div>
         </div>
         {alert && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF0000] animate-pulse" />}
      </motion.div>
   )
}
