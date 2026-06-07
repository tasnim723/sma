"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, AlertTriangle, UserPlus, UserCheck, UserX, X, RefreshCw, CheckCheck, Trash2, Users, Sparkles, Lightbulb } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { API_BASE_URL } from "@/lib/api"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"

function brainstormingPathForRole(role?: string, sessionId?: string): string {
  const base = role === "PROJECT_MANAGER" ? "/brainstorming" : "/espace-brainstorming"
  return sessionId ? `${base}?session_id=${sessionId}` : base
}


interface AlertData {
  _id: string
  title: string
  message: string
  urgency: string
  is_read: boolean
  created_at?: string
  project_id?: string
  task_id?: string
  session_id?: string
}

function getAlertIcon(title: string, urgency: string) {
  const t = title.toLowerCase()
  if (t.includes("nouveau projet") || t.includes("projet"))
    return { icon: Sparkles, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-200" }
  if (t.includes("tâche") || t.includes("tache"))
    return { icon: CheckCheck, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" }
  if (t.includes("nouvelle demande") || t.includes("nouveau compte") || t.includes("🆕"))
    return { icon: UserPlus, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" }
  if (t.includes("approuv") || t.includes("✅"))
    return { icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" }
  if (t.includes("refus") || t.includes("❌"))
    return { icon: UserX, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-200" }
  if (t.includes("brainstorm") || t.includes("session") || t.includes("équipe") || t.includes("espace") || t.includes("idée") || t.includes("idea"))
    return { icon: Lightbulb, color: "text-[#00BCD4]", bg: "bg-[#00BCD4]/10", border: "border-[#00BCD4]/30" }
  if (urgency === "RED_CRITICAL" || urgency === "HIGH")
    return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", border: "border-red-200" }
  if (urgency === "ORANGE")
    return { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-200" }
  return { icon: Bell, color: "text-[#00BCD4]", bg: "bg-[#00BCD4]/10", border: "border-[#00BCD4]/20" }
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return ""
  
  // Si le backend renvoie une date UTC sans spécifier le fuseau (ex: "2026-04-25T14:30:00")
  // On s'assure que JS la traite comme de l'UTC en ajoutant le "Z" à la fin
  let safeDateStr = dateStr;
  if (!/(Z|[+-]\d{2}(:\d{2})?)$/.test(safeDateStr) && safeDateStr.includes('T')) {
    safeDateStr += 'Z';
  }
  
  const diff = Math.floor((Date.now() - new Date(safeDateStr).getTime()) / 1000)
  
  if (diff < 0) return "À l'instant" // Gère les légers décalages d'horloge
  if (diff < 60) return "À l'instant"
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return `Il y a ${Math.floor(diff / 86400)}j`
}

export default function AlertCenter() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null)
  const { token, user } = useAuthStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (token) fetchAlerts()
  }, [token])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!token) return
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [token])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const fetchAlerts = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/alerts/`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      // Sort newest first
      const sorted = res.data.sort((a: AlertData, b: AlertData) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )
      setAlerts(sorted)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        window.location.href = "/login"
      }
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/alerts/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(prev => prev.map(a => a._id === id ? { ...a, is_read: true } : a))
    } catch { }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await axios.patch(`${API_BASE_URL}/api/alerts/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    } catch {
      // fallback: mark individually
      await Promise.all(alerts.filter(a => !a.is_read).map(a => markAsRead(a._id)))
    } finally {
      setMarkingAll(false)
    }
  }

  const handleConfirmClear = async () => {
    setShowClearConfirm(false)
    try {
      await axios.delete(`${API_BASE_URL}/api/alerts/clear/all`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlerts([])
    } catch (err) {
      console.error("Failed to clear alerts", err)
    }
  }

  const visibleAlerts = alerts.filter(a => !a.title.toLowerCase().includes("approuv"))
  const unreadCount = visibleAlerts.filter(a => !a.is_read).length

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(!open); if (!open) fetchAlerts() }}
        className={`relative w-11 h-11 flex items-center justify-center rounded-[1.2rem] border transition-all duration-300 focus:outline-none ${
          unreadCount > 0 
            ? 'bg-[#00BCD4]/10 border-[#00BCD4]/30 text-[#00BCD4] shadow-[0_4px_15px_rgba(0,188,212,0.15)] hover:shadow-[0_6px_20px_rgba(0,188,212,0.25)]' 
            : 'bg-white/60 backdrop-blur-md border-white/50 text-slate-400 hover:text-[#00BCD4] hover:bg-white hover:shadow-sm'
        }`}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite]" : ""} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full border-2 border-white flex items-center justify-center"
            >
              <span className="text-[9px] font-black text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
            className="absolute right-0 mt-4 w-[380px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_15px_50px_rgba(0,188,212,0.15),inset_0_0_0_1px_rgba(255,255,255,0.6)] border border-white/60 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-5 py-5 flex items-center justify-between border-b border-white/20 bg-transparent">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-[#00BCD4]/20 to-[#00BCD4]/5 flex items-center justify-center shadow-inner border border-white/50">
                    <Bell size={16} className="text-[#00BCD4]" />
                  </div>
                  {/* Small neon accent */}
                  {unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00BCD4] blur-[2px] opacity-80 animate-pulse"></div>}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-[16px] tracking-tight leading-none">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-[10px] text-[#00BCD4] font-black uppercase tracking-[0.1em] mt-1">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    disabled={markingAll}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-[#00BCD4] transition-all px-3 py-2 rounded-xl bg-white/60 hover:bg-white border border-white/50 shadow-sm disabled:opacity-50"
                  >
                    {markingAll
                      ? <RefreshCw size={12} className="animate-spin text-[#00BCD4]" />
                      : <CheckCheck size={12} />
                    }
                    Tout lire
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white border border-white/50 shadow-sm transition-all"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Alerts list */}
            <div className="max-h-[420px] overflow-y-auto custom-scrollbar-visible">
              {loading && visibleAlerts.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-[#00BCD4]/30 border-t-[#00BCD4] rounded-full animate-spin" />
                </div>
              ) : visibleAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-white/50 border border-white/50 shadow-sm flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[#00BCD4]/5 rounded-[1.5rem] blur-xl"></div>
                    <Bell size={24} className="text-slate-300 relative z-10" />
                  </div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Aucune notification</p>
                </div>
              ) : (
                <AnimatePresence>
                  {visibleAlerts.map((alert, i) => {
                    const { icon: Icon, color, bg, border } = getAlertIcon(alert.title, alert.urgency)
                    return (
                      <motion.div
                        key={alert._id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => {
                          if (!alert.is_read) markAsRead(alert._id)

                          const titleLower = alert.title.toLowerCase()
                          const messageLower = alert.message.toLowerCase()

                          // Direct redirection based on project_id or task_id
                          if (alert.project_id) {
                            setOpen(false)
                            router.push(`/projects/${alert.project_id}`)
                          } else if (
                            alert.session_id ||
                            titleLower.includes("brainstorming") ||
                            titleLower.includes("session")
                          ) {
                            setOpen(false)
                            router.push(
                              brainstormingPathForRole(user?.role, alert.session_id)
                            )
                          } else if (
                            titleLower.includes("demande") ||
                            titleLower.includes("compte") ||
                            titleLower.includes("accès") ||
                            titleLower.includes("🆕")
                          ) {
                            setOpen(false)
                            router.push('/team')
                          } else if (
                            titleLower.includes("message") ||
                            titleLower.includes("alerte")
                          ) {
                            setOpen(false)
                            setSelectedAlert(alert)
                          } else if (messageLower.includes("projet") && !alert.project_id && titleLower.includes("nouveau")) {
                             // Fallback for old alerts without project_id
                             setOpen(false)
                             router.push('/projects')
                          } else {
                            setOpen(false) // close the dropdown
                            setSelectedAlert(alert)
                          }
                        }}
                        className={`flex gap-3 p-4 border-b border-white/20 cursor-pointer transition-all duration-300 relative group/item
                          ${!alert.is_read
                            ? "bg-gradient-to-r from-[#00BCD4]/10 to-transparent hover:from-[#00BCD4]/20 shadow-[inset_4px_0_0_#00BCD4] relative"
                            : "bg-white/10 hover:bg-white/30"
                          }`}
                      >
                        {/* Icon */}
                        <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center shrink-0 mt-0.5 shadow-sm`}>
                          {Icon && <Icon size={15} className={color} />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-[12.5px] leading-tight ${!alert.is_read ? "font-black text-slate-800" : "font-bold text-slate-500"}`}>
                              {alert.title}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                               {!alert.is_read && (
                                 <div className="w-2 h-2 rounded-full bg-[#00BCD4] mt-1 animate-pulse shadow-[0_0_6px_rgba(0,188,212,0.6)]" />
                               )}
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   // Function to delete single alert
                                   const deleteSingle = async () => {
                                      try {
                                         await axios.delete(`${API_BASE_URL}/api/alerts/${alert._id}`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                         })
                                         setAlerts(prev => prev.filter(a => a._id !== alert._id))
                                      } catch {}
                                   }
                                   deleteSingle();
                                 }}
                                 className="opacity-0 group-hover/item:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                               >
                                 <Trash2 size={12} />
                               </button>
                            </div>
                          </div>
                          <p className={`text-[11.5px] leading-snug mt-1 transition-all duration-300 line-clamp-2 ${!alert.is_read ? "text-slate-600" : "text-slate-400"}`}>
                            {alert.message}
                          </p>
                          {alert.created_at && (
                            <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase tracking-wider">{timeAgo(alert.created_at)}</p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
            </div>

            <div className="px-5 py-3.5 bg-transparent border-t border-white/20 flex items-center justify-between">
              <div 
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all"
                onClick={fetchAlerts}
              >
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">
                  {loading ? "Actualisation..." : "Actualiser"}
                </span>
                <RefreshCw size={12} className={`text-[#00BCD4] ${loading ? "animate-spin" : "opacity-70"}`} />
              </div>

              {visibleAlerts.length > 0 && (
                <button 
                  onClick={() => setShowClearConfirm(true)}
                  className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest flex items-center gap-1.5 transition-all"
                >
                   <Trash2 size={12} /> Tout effacer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full screen modal for the selected alert */}
      {selectedAlert && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAlert(null)}
              className="absolute inset-0 backdrop-blur-sm bg-slate-900/20"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md rounded-[2.5rem] overflow-hidden z-10 bg-white/95 backdrop-blur-3xl shadow-[0_0_0_1px_rgba(0,188,212,0.3),_0_20px_60px_rgba(0,188,212,0.25)]"
            >
              {/* Animated neon top bar */}
              <motion.div
                className="absolute top-0 left-0 w-full h-[4px]"
                style={{ background: "linear-gradient(90deg, #00BCD4, #8B5CF6, #00BCD4)", backgroundSize: "200% 100%" }}
                animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />

              {/* Glowing blobs in the background */}
              <div className="absolute -top-12 -left-12 w-40 h-40 bg-[#00BCD4]/20 rounded-full blur-[40px] pointer-events-none" />
              <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-purple-500/15 rounded-full blur-[40px] pointer-events-none" />

              {/* Removed decorative corners per user request */}
              
              <div className="p-8 relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <motion.div 
                    animate={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className={`w-14 h-14 rounded-2xl ${getAlertIcon(selectedAlert.title, selectedAlert.urgency).bg} border ${getAlertIcon(selectedAlert.title, selectedAlert.urgency).border} flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.3)] relative`}
                  >
                    <motion.div
                      className="absolute inset-0 rounded-2xl"
                      animate={{ boxShadow: ["0 0 0px rgba(0,188,212,0)", "0 0 20px rgba(0,188,212,0.4)", "0 0 0px rgba(0,188,212,0)"] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    {(() => {
                       const { icon: Icon, color } = getAlertIcon(selectedAlert.title, selectedAlert.urgency);
                       return Icon && <Icon size={28} className={color} />
                    })()}
                  </motion.div>
                  <button onClick={() => setSelectedAlert(null)} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all shadow-sm">
                    <X size={16} strokeWidth={3} />
                  </button>
                </div>
                
                <h3 className="text-xl font-black text-slate-800 mb-5 tracking-tight leading-tight">{selectedAlert.title}</h3>
                
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-[#00BCD4]/20 mb-6 shadow-[inset_0_0_20px_rgba(0,188,212,0.05)] custom-scrollbar-visible max-h-[40vh] overflow-y-auto">
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed font-semibold">
                    {selectedAlert.message}
                  </p>
                </div>
                
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-black uppercase tracking-widest">
                   <span>
                     {selectedAlert.created_at ? new Date(selectedAlert.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ""}
                   </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {/* Full screen modal for clear all confirmation */}
      {showClearConfirm && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 backdrop-blur-md bg-slate-900/40"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm rounded-[2rem] overflow-hidden z-10 bg-white shadow-[0_0_0_1px_rgba(244,63,94,0.2),_0_20px_60px_rgba(244,63,94,0.15)] p-8 text-center"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl animate-pulse"></div>
                 <Trash2 size={28} className="text-rose-500 relative z-10" />
              </div>
              
              <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Vider les notifications</h3>
              <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer toutes vos notifications ? Cette action est irréversible.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmClear}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-[13px] font-bold tracking-wide transition-all shadow-[0_4px_15px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  OUI, TOUT SUPPRIMER
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[13px] font-bold tracking-wide transition-all"
                >
                  ANNULER
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
