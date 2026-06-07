"use client"

import React, { useEffect, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { Users, MessageSquare, ArrowRight, Bell } from "lucide-react"
import axios from "axios"
import { useSearchParams } from "next/navigation"
import { useAuthStore } from "@/lib/store"
import { useLang } from "@/lib/useLang"
import { API_BASE_URL } from "@/lib/api"
import TeamBrainstormRoom, { type TeamSession } from "@/components/brainstorming/TeamBrainstormRoom"

export default function EspaceBrainstormingPage() {
  const { token, user } = useAuthStore()
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const urlSessionId = searchParams.get("session_id")

  const [sessions, setSessions] = useState<TeamSession[]>([])
  const [activeSession, setActiveSession] = useState<TeamSession | null>(null)
  const [loading, setLoading] = useState(true)

  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  const fetchSessions = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE_URL}/api/brainstorming/team/sessions`, {
        headers,
      })
      const teamOnly = res.data.filter((s: TeamSession) => s.mode === "TEAM")
      setSessions(teamOnly)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadSession = async (id: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/brainstorming/team/${id}`, {
        headers,
      })
      setActiveSession(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (!token) return
    fetchSessions()
  }, [token, fetchSessions])

  useEffect(() => {
    if (urlSessionId && token) {
      loadSession(urlSessionId)
    }
  }, [urlSessionId, token])

  if (!user || !token) return null

  if (user.role === "PROJECT_MANAGER") {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <p className="text-slate-500 font-bold text-center">
          {lang === "fr"
            ? "Utilisez la War Room pour gérer les sessions avec agents IA."
            : "Use the War Room to manage sessions with AI agents."}
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-6 lg:p-8 min-h-0 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="shrink-0 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#FF007F]/10 border border-[#FF007F]/30 flex items-center justify-center">
            <MessageSquare size={22} className="text-[#FF007F]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              {lang === "fr" ? "Espace Brainstorming" : "Brainstorming Space"}
            </h1>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              {lang === "fr"
                ? "Communication équipe & manager"
                : "Team & manager communication"}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 max-w-xl">
          {lang === "fr"
            ? "Rejoignez les sessions lancées par votre manager."
            : "Join sessions started by your manager."}
        </p>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0 overflow-hidden">
        <div className="lg:col-span-4 flex flex-col min-h-0 rounded-[2rem] border border-white/60 bg-white/50 backdrop-blur-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-white/40 flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
              {lang === "fr" ? "Sessions actives" : "Active sessions"}
            </h2>
            <Bell size={14} className="text-[#FF007F]" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#FF007F]/30 border-t-[#FF007F] rounded-full animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-bold text-slate-400">
                  {lang === "fr"
                    ? "Aucune session pour le moment. Vous serez notifié quand le manager lance une session."
                    : "No sessions yet. You will be notified when the manager starts one."}
                </p>
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setActiveSession(s)
                    loadSession(s.id)
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    activeSession?.id === s.id
                      ? "border-[#FF007F] bg-[#FF007F]/5 shadow-md"
                      : "border-white/60 bg-white/40 hover:border-[#FF007F]/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        s.status === "RUNNING" ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-black text-sm text-slate-800 truncate flex-1">
                      {s.topic}
                    </span>
                    <ArrowRight size={14} className="text-[#FF007F] shrink-0" />
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-4">
                    {s.participants?.length || 0}{" "}
                    {lang === "fr" ? "participant(s)" : "participant(s)"} ·{" "}
                    {s.messages?.filter((m) => m.role !== "AI").length || 0}{" "}
                    {lang === "fr" ? "messages" : "messages"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col min-h-0 rounded-[2rem] border border-white/60 bg-white/50 backdrop-blur-xl shadow-sm overflow-hidden">
          {activeSession ? (
            <TeamBrainstormRoom
              session={activeSession}
              token={token}
              userId={user.id}
              userName={user.full_name || "Membre"}
              userRole={user.role}
              lang={lang}
              onSessionUpdate={setActiveSession}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <Users size={56} className="text-[#FF007F]/25 mb-4" />
              <p className="font-black text-slate-600 mb-2">
                {lang === "fr" ? "Sélectionnez une session" : "Select a session"}
              </p>
              <p className="text-sm text-slate-400 max-w-sm">
                {lang === "fr"
                  ? "Cliquez sur une invitation à gauche ou ouvrez une notification pour rejoindre."
                  : "Click an invitation on the left or open a notification to join."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
