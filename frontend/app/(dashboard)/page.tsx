"use client"

import React, { useEffect, useState } from "react"
import { useAuthStore } from "@/lib/store"
import { 
  CheckSquare, Clock, BarChart3, TrendingUp, Activity, 
  Users, Zap, Bell, CheckCircle2, AlertTriangle, 
  ListChecks, ArrowRight, Layers, Bot, Sparkles,
  Search, Filter, MoreHorizontal, LayoutDashboard, Settings, Edit3, Award, Code, Rocket, FlaskConical, Boxes, Palette,
  Check, Trash2, Star, Lightbulb
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import Link from "next/link"
import { motion, AnimatePresence, Variants } from "framer-motion"
import BenchmarkingRadar from "@/components/benchmarking/BenchmarkingRadar"
import InnovationFunnel from "@/components/innovation/InnovationFunnel"

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
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="p-4 md:p-8 space-y-8 pb-32">
         {/* Premium Welcome Header */}
         <motion.div variants={itemVariants} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00CCCC]/10 via-transparent to-[#FF0000]/5 rounded-[2rem] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
            <div className="relative overflow-hidden rounded-[2rem] bg-white/70 backdrop-blur-xl border border-white/50 p-6 shadow-xl shadow-slate-200/40">
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
                              className="group flex items-center p-6 bg-white/60 backdrop-blur-xl hover:bg-white/80 rounded-[2rem] border border-white shadow-lg shadow-slate-200/50 transition-all cursor-pointer relative overflow-hidden"
                           >
                              {/* Neon Track Effect */}
                              <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#00CCCC]/20 rounded-[2rem] pointer-events-none transition-all" />
                              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00CCCC] to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-pulse" />
                              
                              <div className="w-1.5 h-12 rounded-full bg-[#00CCCC] group-hover:shadow-[0_0_15px_#00CCCC] transition-all mr-6" />
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
                              <div className="h-14 w-14 rounded-2xl bg-white/50 border border-slate-100 flex items-center justify-center group-hover:bg-[#00CCCC] group-hover:text-white transition-all shadow-inner">
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
                         <p className="text-[14px] font-bold leading-relaxed text-slate-700 italic">
                            "Concentrez-vous sur '{activeTasks[0]?.title.slice(0, 20) || 'la mission actuelle'}' pour franchir le prochain palier d'XP."
                         </p>
                      </div>
                   </div>
                </motion.div>

                <div className="grid grid-cols-2 gap-4">
                   <KPICard title="Terminé" value={doneCount} icon={<CheckCircle2 />} color="text-emerald-500" bg="glow-green" />
                   <KPICard title="XP Bonus" value={doneCount * 125} icon={<Zap />} color="text-amber-500" bg="glow-yellow" />
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
   const [activeProjectTasks, setActiveProjectTasks] = useState<any[]>([])
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
            const loadedProjects = projectsRes.data || [];
            setProjects(loadedProjects)

            const activeProject = loadedProjects.find((p: any) => p.status !== 'COMPLETED');
            if (activeProject) {
                try {
                    const tasksRes = await axios.get(`http://localhost:8000/api/tasks/project/${activeProject.id}`, { headers: { Authorization: `Bearer ${token}` }});
                    setActiveProjectTasks(tasksRes.data || []);
                } catch (e) {
                    console.error("Failed to fetch active project tasks for XP", e);
                }
            }
         } catch (err) {
            console.error("Failed to fetch dashboard data", err)
         } finally {
            setLoading(false)
         }
      }
      if (token) fetchData()
   }, [token])

   return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col h-full p-4 md:p-8 space-y-6 pb-2 min-h-0">
         {/* Stats Row */}
         <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="TREATS DETECTED" value={stats.activeProjects + 4} icon={<FlaskConical />} color="text-amber-500" bg="glow-yellow" />
            <KPICard title="INNOVATIONS" value={stats.completedTasks + 12} icon={<Lightbulb />} color="text-rose-500" bg="glow-red" />
            <KPICard title="MARKET TRENDS" value={stats.upcomingDeadlines + 8} icon={<TrendingUp />} color="text-sky-500" bg="glow-blue" />
            <KPICard title="BENCHMARK SCORE" value="84%" icon={<Award />} color="text-emerald-500" bg="glow-green" />
         </motion.div>

         {/* Innovation Funnel Section */}
         <motion.div variants={itemVariants} className="px-2">
            <h2 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase mb-4 flex items-center gap-2">
               <Rocket size={14} className="text-[#00CCCC]" /> Pipeline d'Innovation
            </h2>
            <InnovationFunnel />
         </motion.div>

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch flex-1 min-h-0">
            {/* Main Content Area */}
            <div className="xl:col-span-8 flex flex-col">
               {/* Live Feed with Timeline UI */}
               <div className="flex flex-col gap-4 flex-1 min-h-0">
                  <div className="flex items-center justify-between px-4 text-center sm:text-left">
                     <h2 className="text-xl font-bold tracking-wide text-slate-800 flex items-center gap-3">
                        Activité Pulsée
                     </h2>
                  </div>
                  
                  <div className="relative rounded-[2rem] p-6 backdrop-blur-3xl border border-sky-100 bg-white/70 shadow-[0_10px_40px_rgba(0,0,0,0.03)] flex flex-col flex-1 min-h-0">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-sky-400/5 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none" />
                     <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 relative z-10 p-2">
                        <AnimatePresence>
                           {loading ? (
                              [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-2xl" />)
                           ) : history.length > 0 ? (
                              history.map((line, idx) => {
                                 const getActivityStyle = (msg: string) => {
                                    const lower = msg.toLowerCase();
                                    if (lower.includes('added') || lower.includes('créé') || lower.includes('création') || lower.includes('terminé') || lower.includes('completed')) {
                                       return { 
                                          color: 'bg-emerald-500', 
                                          border: 'border-emerald-200',
                                          icon: <Check size={14} strokeWidth={4} className="text-white" />,
                                          badge: 'AJOUT'
                                       };
                                    }
                                    if (lower.includes('delete') || lower.includes('supprimé') || lower.includes('removal')) {
                                       return { 
                                          color: 'bg-rose-500', 
                                          border: 'border-rose-200',
                                          icon: <Trash2 size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'SUPPRESSION'
                                       };
                                    }
                                    if (lower.includes('alerte') || lower.includes('deadline') || lower.includes('urgent') || lower.includes('attention')) {
                                       return { 
                                          color: 'bg-rose-400', 
                                          border: 'border-rose-100',
                                          icon: <AlertTriangle size={14} strokeWidth={2.5} className="text-white" />,
                                          badge: 'ALERTE'
                                       };
                                    }
                                    if (lower.includes('innovation') || lower.includes('insight') || lower.includes('ia') || lower.includes('veille')) {
                                       return { 
                                          color: 'bg-amber-400', 
                                          border: 'border-amber-200',
                                          icon: <Star size={14} fill="white" className="text-white" />,
                                          badge: 'INNOVATION'
                                       };
                                    }
                                    return { 
                                       color: 'bg-[#00BCD4]', 
                                       border: 'border-[#00BCD4]/30',
                                       icon: <Zap size={14} strokeWidth={2.5} className="text-white" />,
                                       badge: 'SIGNAL'
                                    };
                                 };

                                 const style = getActivityStyle(line);

                                 return (
                                 <motion.div 
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                    key={idx} 
                                    className="flex gap-6 group relative"
                                 >
                                    <div className="flex flex-col items-center">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${style.border} ${style.color} shadow-lg z-10 transform group-hover:scale-110 transition-transform`}>
                                          {style.icon}
                                       </div>
                                       <div className="w-[1.5px] flex-1 bg-gradient-to-b from-slate-200 to-transparent my-2" />
                                    </div>
                                    <div className="flex-1 pb-8">
                                       <div className="flex items-center gap-3 mb-2">
                                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none ${style.color.replace('bg-', 'text-')}`}>
                                             {style.badge}
                                          </span>
                                          <div className="h-[1px] flex-1 bg-slate-100" />
                                       </div>
                                       <p className="text-[15px] font-bold text-slate-700 group-hover:text-slate-900 transition-colors leading-relaxed">
                                          {line}
                                       </p>
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
               </div>
            </div>

            {/* Right Aside Info */}
            <div className="xl:col-span-4 flex flex-col gap-6">
               <motion.div 
                  whileHover={{ y: -2 }}
                  className="relative group cursor-pointer shrink-0"
               >
                     <div className="relative nexus-glass rounded-[2rem] px-6 py-6 text-slate-800 overflow-hidden bg-white/40 backdrop-blur-2xl border border-white/50">
                        <div className="flex justify-between items-center mb-4">
                           <h3 className="font-black tracking-widest text-[12px] text-slate-700 uppercase">Benchmarking Radar</h3>
                           <Badge className="bg-[#00CCCC] text-white border-none text-[10px]">ALPHA v2</Badge>
                        </div>
                        <BenchmarkingRadar data={[
                           { subject: 'Perf', A: 8, B: 6, fullMark: 10 },
                           { subject: 'Innov', A: 9, B: 5, fullMark: 10 },
                           { subject: 'UX', A: 7, B: 8, fullMark: 10 },
                           { subject: 'Coût', A: 6, B: 7, fullMark: 10 },
                           { subject: 'Délai', A: 8, B: 4, fullMark: 10 }
                        ]} />
                        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">
                           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00CCCC]" /> Notre Projet</div>
                           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FF0000]/40" /> Industrie</div>
                        </div>
                     </div>
               </motion.div>

               <motion.div 
                  whileHover={{ y: -2 }}
                  className="relative group cursor-pointer shrink-0"
               >
                     <div className="relative nexus-glass rounded-[2rem] px-5 py-4 text-slate-800 overflow-hidden min-h-[130px] flex flex-col justify-center bg-white/40 backdrop-blur-2xl border border-white/50">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00BCD4]/5 rounded-full blur-3xl -mr-16 -mt-16" />
                        
                        <div className="relative z-10 w-[70%]">
                           <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mb-2">Analyse de l'Innovation</p>
                           <div className="relative">
                              <span className="absolute -left-2 top-0 text-2xl text-[#00BCD4]/20 font-serif">"</span>
                              <p className="text-[13px] font-bold text-slate-700 leading-snug pl-4 pr-2 italic">
                                 {insights[0]?.description || "L'équilibre des équipes est optimal. Maintenez le rythme sur les objectifs prioritaires."}
                              </p>
                           </div>
                        </div>

                        {/* Moving robot icon to middle-right as requested */}
                        <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-28 h-28 flex items-center justify-center opacity-90 group-hover:opacity-100 transition-all duration-300">
                           <div className="relative">
                              <Bot size={75} className="text-[#00BCD4] drop-shadow-[0_0_15px_rgba(0,188,212,0.4)] transform group-hover:rotate-12 transition-transform" />
                              <div className="absolute inset-0 bg-[#00BCD4]/5 blur-2xl -z-10 rounded-full" />
                           </div>
                        </div>
                     </div>
               </motion.div>

               {/* MILESTONE PROJECT LIST */}
               {(() => {
                  const activeProject = projects.find(p => p.status !== 'COMPLETED');
                  if (!activeProject) return null;
                  
                  // Calculate dynamic XP
                  let earnedXP = 0;
                  let totalXP = 0;
                  activeProjectTasks.forEach(task => {
                     const xpInfo = task.priority === 'URGENT' ? 500 : task.priority === 'HIGH' ? 300 : task.priority === 'MEDIUM' ? 150 : 50;
                     totalXP += xpInfo;
                     if (task.status === 'DONE') earnedXP += xpInfo;
                  });
                  if (totalXP === 0) totalXP = 1000; // prevent divide by zero, show empty bar
                  const xpPercent = Math.min(100, Math.max(0, Math.round((earnedXP / totalXP) * 100)));
                  const displayProgress = activeProjectTasks.length > 0 ? xpPercent : 0;

                  
                  // Use real milestones if available, otherwise fallback to default empty state
                  const projectMilestones = activeProject.milestones && activeProject.milestones.length > 0 
                     ? activeProject.milestones 
                     : [
                        { title: "Planification", completed: true },
                        { title: "Développement", completed: displayProgress > 30 },
                        { title: "Tests", completed: displayProgress > 70 },
                        { title: "Livraison", completed: displayProgress >= 100 }
                       ];
                       
                  const getMilestoneStyles = (title: string, isCompleted: boolean) => {
                     const lowerTitle = title.toLowerCase();
                     
                     // 1. Definition / Plan -> ALWAYS BLUE
                     if (lowerTitle.includes('plan') || lowerTitle.includes('défini')) {
                        return { 
                           icon: <LayoutDashboard size={20} />, 
                           bg: isCompleted ? 'bg-blue-100 border-blue-300' : 'bg-blue-50/50 border-blue-100', 
                           text: 'text-blue-500', 
                           glow: isCompleted ? 'shadow-[0_0_15px_rgba(59,130,246,0.3)]' : '',
                           dot: isCompleted ? 'bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-blue-200',
                           label: isCompleted ? 'text-blue-600 font-black' : 'text-blue-400 font-bold'
                        };
                     }
                     // 2. Conception / UI -> ALWAYS ROSE
                     if (lowerTitle.includes('dev') || lowerTitle.includes('concep') || lowerTitle.includes('ui') || lowerTitle.includes('design')) {
                        return { 
                           icon: <Palette size={20} />, 
                           bg: isCompleted ? 'bg-rose-100 border-rose-300' : 'bg-rose-50/50 border-rose-100', 
                           text: 'text-rose-500', 
                           glow: isCompleted ? 'shadow-[0_0_15px_rgba(244,63,94,0.3)]' : '',
                           dot: isCompleted ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-rose-200',
                           label: isCompleted ? 'text-rose-600 font-black' : 'text-rose-400 font-bold'
                        };
                     }
                     // 3. Development / Code -> ALWAYS INDIGO
                     if (lowerTitle.includes('code') || lowerTitle.includes('eng') || lowerTitle.includes('prog')) {
                        return { 
                           icon: <Code size={20} />, 
                           bg: isCompleted ? 'bg-indigo-100 border-indigo-300' : 'bg-indigo-50/50 border-indigo-100', 
                           text: 'text-indigo-500', 
                           glow: isCompleted ? 'shadow-[0_0_15px_rgba(99,102,241,0.3)]' : '',
                           dot: isCompleted ? 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-indigo-200',
                           label: isCompleted ? 'text-indigo-600 font-black' : 'text-indigo-400 font-bold'
                        };
                     }
                     // 4. Test / QA -> ALWAYS EMERALD
                     if (lowerTitle.includes('test') || lowerTitle.includes('qa')) {
                        return { 
                           icon: <FlaskConical size={20} />, 
                           bg: isCompleted ? 'bg-emerald-100 border-emerald-300' : 'bg-emerald-50/50 border-emerald-100', 
                           text: 'text-emerald-500', 
                           glow: isCompleted ? 'shadow-[0_0_15px_rgba(16,185,129,0.3)]' : '',
                           dot: isCompleted ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-emerald-200',
                           label: isCompleted ? 'text-emerald-600 font-black' : 'text-emerald-500 font-bold'
                        };
                     }
                     // Default / Final -> ALWAYS CYAN
                     return { 
                        icon: <Boxes size={20} />, 
                        bg: isCompleted ? 'bg-cyan-100 border-cyan-300' : 'bg-cyan-50/50 border-cyan-100', 
                        text: 'text-cyan-500', 
                        glow: isCompleted ? 'shadow-[0_0_15px_rgba(6,182,212,0.3)]' : '',
                        dot: isCompleted ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' : 'bg-cyan-200',
                        label: isCompleted ? 'text-cyan-600 font-black' : 'text-cyan-400 font-bold'
                     };
                  };

                  return (
                     <Link href={`/projects/${activeProject.id || activeProject._id}`} className="flex-1 flex flex-col nexus-glass rounded-[2rem] p-6 text-slate-800 relative bg-white/40 backdrop-blur-2xl border border-white/50 block group hover:bg-white/60 hover:shadow-2xl transition-all cursor-pointer">
                        {/* OVERALL PROGRESS */}
                        <div className="flex justify-between items-center mb-2">
                           <p className="font-bold text-slate-700 w-3/4 truncate">{activeProject.name}</p>
                           <p className="font-black text-[#00BCD4] uppercase tracking-widest text-[11px] shrink-0">Progression {activeProject.progress_percentage}%</p>
                        </div>
                        <div className="w-full h-2 bg-slate-200/50 rounded-full overflow-hidden mb-8 shadow-inner">
                           <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${activeProject.progress_percentage}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="h-full bg-[#00BCD4] rounded-full shadow-[0_0_10px_rgba(0,188,212,0.5)]" 
                           />
                        </div>

                        {/* MILESTONES HEADER */}
                        <div className="mb-6">
                           <h3 className="font-black tracking-widest text-[14px] text-slate-700 uppercase">MILESTONES</h3>
                        </div>

                        {/* HEXAGON STEPPER */}
                        <div className="flex justify-between items-center relative mb-8 px-2">
                           {/* connecting line */}
                           <div className="absolute left-[30px] right-[30px] h-1 bg-slate-200 -z-10 translate-y-[-10px]" />
                           <motion.div 
                              initial={{ right: '100%' }}
                              animate={{ right: `${100 - activeProject.progress_percentage}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className="absolute left-[30px] h-1 bg-[#00BCD4] -z-10 translate-y-[-10px]" 
                           />

                           {projectMilestones.slice(0, 4).map((milestone: any, index: number) => {
                              const isCompleted = milestone.completed !== undefined ? milestone.completed : (index < (activeProject.progress_percentage / 25));
                              const isLast = index === Math.min(3, projectMilestones.length - 1);
                              
                              if (isLast) {
                                 // Render the gold hexagon for the last milestone
                                 return (
                                    <React.Fragment key={index}>
                                       {index > 0 && <span className="text-slate-200 text-[10px] tracking-[0.2em] font-black self-start mt-6">{'>>'}</span>}
                                       <div className="flex flex-col items-center gap-3 w-16">
                                          <div className={`w-[60px] h-[60px] rounded-2xl rotate-45 flex items-center justify-center border-2 relative z-10 mb-2 transition-all duration-500 shadow-sm
                                             ${isCompleted ? 'bg-[#fffbf0] border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                                             <div className="-rotate-45">
                                                <Award size={26} className={isCompleted ? 'text-amber-500 fill-amber-400 drop-shadow-sm' : 'text-slate-300'} />
                                             </div>
                                          </div>
                                          <div className={`w-2.5 h-2.5 rounded-full z-10 ${isCompleted ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : 'bg-slate-300'}`} />
                                          <span className={`text-[12px] font-bold truncate w-[80px] text-center ${isCompleted ? 'text-amber-500' : 'text-slate-400'}`}>{milestone.title}</span>
                                       </div>
                                    </React.Fragment>
                                 );
                              }

                                 const styles = getMilestoneStyles(milestone.title, isCompleted as boolean);
                                 return (
                                 <React.Fragment key={index}>
                                    {index > 0 && <span className="text-slate-200 text-[10px] tracking-[0.2em] font-black self-start mt-6 group-hover:text-slate-300 transition-colors">{'>>'}</span>}
                                    <div className="flex flex-col items-center gap-3 w-16 text-center">
                                       <div className={`w-[52px] h-[52px] rounded-[14px] rotate-45 flex items-center justify-center border-2 relative z-10 mb-2 transition-all duration-500 
                                          ${styles.bg} ${styles.glow} group-hover:scale-110`}>
                                          <div className="-rotate-45">
                                             {React.cloneElement(styles.icon as React.ReactElement, { className: styles.text, size: 22 })}
                                          </div>
                                       </div>
                                       <div className={`w-2.5 h-2.5 rounded-full z-10 transition-all duration-500 ${styles.dot}`} />
                                       <span className={`text-[10px] font-black truncate w-[80px] uppercase tracking-tighter ${styles.label}`} title={milestone.title}>{milestone.title}</span>
                                    </div>
                                 </React.Fragment>
                                 );
                           })}
                        </div>
                        
                        {/* XP BAR at very bottom */}
                        <div className="flex justify-between items-center mb-1">
                           <p className="font-bold text-slate-600 text-[11px] tracking-widest font-black uppercase">XP</p>
                           <p className="font-bold text-slate-600 justify-self-end text-[11px] tracking-widest text-right w-full">{earnedXP}/{totalXP}</p>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200/50 rounded-full overflow-hidden shadow-inner flex items-center mb-2">
                           <div className="h-1 bg-[#00BCD4] rounded-full shadow-[0_0_5px_rgba(0,188,212,0.5)] transition-all duration-1000" style={{ width: `${xpPercent}%` }} />
                        </div>
                     </Link>
                  );
               })() }
            </div>
         </div>
      </motion.div>
   )
}

function KPICard({ title, value, icon, bg, color }: any) {
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
         className={`rounded-[2rem] p-5 transition-all duration-300 relative group flex gap-3 items-center bg-white/40 backdrop-blur-2xl border border-white/50 shadow-sm ${bg}`}
      >
         <div className={`p-4 rounded-xl bg-white/30 shrink-0 ${color} group-hover:scale-110 transition-transform`}>
            {React.cloneElement(icon, { size: 22, strokeWidth: 2 })}
         </div>
         <div className="flex flex-col justify-center">
            <h3 className="text-3xl font-black text-slate-800 leading-none tracking-tighter mb-1">
               {typeof value === 'string' && value.includes('%') ? `${displayValue}%` : displayValue}
            </h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
               {title}
            </p>
         </div>
         {/* Decorative Corner */}
         <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
            <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')} opacity-20 group-hover:opacity-100 transition-opacity`} />
         </div>
      </motion.div>
   )
}
