"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Users, Mic, RefreshCw } from "lucide-react"
import axios from "axios"
import { API_BASE_URL } from "@/lib/api"
import { useAuthStore } from "@/lib/store"

interface Message {
  agent_name: string
  content: string
  phase: string
  role?: string
  user_id?: string
  timestamp: string
}

interface Participant {
  id: string
  name: string
  avatar?: string
  gender?: string
  avatar_url?: string
  role: string
}

export interface TeamSession {
  id: string
  topic: string
  mode?: string
  status: string
  messages: Message[]
  participants: Participant[]
  typing_users: string[]
}

interface TeamBrainstormRoomProps {
  session: TeamSession
  token: string
  userId: string
  userName: string
  userRole: string
  lang: "fr" | "en"
  onSessionUpdate?: (session: TeamSession) => void
}

function participantRole(userRole: string): string {
  return userRole === "PROJECT_MANAGER" ? "MANAGER" : "TEAM"
}

function getAvatarSrc(p: { avatar_url?: string; gender?: string; name?: string; role?: string }): string {
  if (p.avatar_url && p.avatar_url !== '') return p.avatar_url
  // Manager always uses manager avatar
  if (p.role === 'MANAGER') return '/manager.webp'
  if (p.gender === 'Femme') return '/girl-removebg-preview.png'
  // Name-based fallback: many French female names end in 'a' or 'e'
  const name = (p.name || '').toLowerCase()
  const isFemale = name.endsWith('a') || name.endsWith('e') || name.includes('samia') || name.includes('alice') || name.includes('charlie')
  if (isFemale) return '/girl-removebg-preview.png'
  return '/boy-removebg-preview.png'
}

export default function TeamBrainstormRoom({
  session,
  token,
  userId,
  userName,
  userRole,
  lang,
  onSessionUpdate,
}: TeamBrainstormRoomProps) {
  const { user: authUser } = useAuthStore()
  const [liveSession, setLiveSession] = useState<TeamSession>(session)
  const [messageInput, setMessageInput] = useState("")
  const [sending, setSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const headers = { Authorization: `Bearer ${token}` }

  const refreshSession = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/brainstorming/team/${session.id}`,
        { headers }
      )
      setLiveSession(res.data)
      onSessionUpdate?.(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [session.id, token, onSessionUpdate])

  useEffect(() => {
    setLiveSession(session)
  }, [session.id, session.messages?.length])

  useEffect(() => {
    if (!token || !userId) return
    const isParticipant = liveSession.participants?.some((p) => p.id === userId)
    if (!isParticipant) {
      axios
        .post(
          `${API_BASE_URL}/api/brainstorming/${liveSession.id}/join`,
          {
            user_id: userId,
            name: userName,
            role: participantRole(userRole),
            gender: (authUser as any)?.gender || "",
            avatar_url: (authUser as any)?.avatar_url || "",
          },
          { headers }
        )
        .then(() => refreshSession())
        .catch(console.error)
    }
  }, [liveSession.id, userId, userName, userRole, token])

  useEffect(() => {
    if (liveSession.status !== "RUNNING") return
    const interval = setInterval(refreshSession, 3000)
    return () => clearInterval(interval)
  }, [liveSession.id, liveSession.status, refreshSession])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [liveSession.messages])

  const humanMessages = (liveSession.messages || []).filter((m) => m.role !== "AI")

  const handleTyping = (isTyping: boolean) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    axios
      .post(
        `${API_BASE_URL}/api/brainstorming/${liveSession.id}/typing`,
        { user_name: userName, is_typing: isTyping },
        { headers }
      )
      .catch(console.error)
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000)
    }
  }

  const sendMessage = async () => {
    if (!messageInput.trim() || sending) return
    setSending(true)
    try {
      await axios.post(
        `${API_BASE_URL}/api/brainstorming/${liveSession.id}/message`,
        {
          content: messageInput.trim(),
          user_id: userId,
          agent_name: userName,
          role: participantRole(userRole),
          phase: "Live",
        },
        { headers }
      )
      setMessageInput("")
      handleTyping(false)
      await refreshSession()
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const startVoiceInput = () => {
    const SR = (window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    if (!SR) {
      alert(lang === "fr" ? "Reconnaissance vocale non supportée." : "Speech not supported.")
      return
    }
    const recognition = new (SR as new () => {
      lang: string
      onstart: () => void
      onend: () => void
      onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void
      start: () => void
    })()
    recognition.lang = lang === "fr" ? "fr-FR" : "en-US"
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setMessageInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.start()
  }

  const isManager = userRole === "PROJECT_MANAGER"

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/40 backdrop-blur-md">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#FF007F] mb-1">
            {lang === "fr" ? "Session équipe" : "Team session"}
          </p>
          <h2 className="font-black text-lg text-slate-800">{liveSession.topic}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`w-2 h-2 rounded-full ${
                liveSession.status === "RUNNING" ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
              }`}
            />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {liveSession.status === "RUNNING"
                ? lang === "fr"
                  ? "En direct"
                  : "Live"
                : lang === "fr"
                  ? "Terminée"
                  : "Ended"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {liveSession.participants?.map((p) => {
              return (
                <img
                  key={p.id}
                  src={getAvatarSrc(p)}
                  alt={p.name}
                  title={p.name}
                  className={`w-8 h-8 rounded-full border-2 border-white object-cover ${p.role === 'MANAGER' ? 'ring-2 ring-indigo-400' : ''}`}
                />
              )
            })}
          </div>
          <Users size={18} className="text-[#FF007F]" />
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar min-h-0"
      >
        {humanMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-16">
            <Users size={48} className="text-[#FF007F]/30 mb-4" />
            <p className="text-sm font-bold text-slate-500">
              {lang === "fr"
                ? "Échangez avec votre équipe et le manager."
                : "Chat with your team and manager."}
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {humanMessages.map((msg, i) => {
              const isMine = msg.user_id === userId
              const isManagerMsg = msg.role === "MANAGER"
              return (
                <motion.div
                  key={`${msg.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${isMine ? "flex-row-reverse" : ""}`}
                >
                  <img
                    src={(() => {
                      const participant = liveSession.participants?.find(pp => pp.id === msg.user_id)
                      return getAvatarSrc(participant || {})
                    })()}
                    alt={msg.agent_name}
                    className={`w-9 h-9 rounded-xl object-cover shrink-0 ${isManagerMsg ? 'ring-2 ring-indigo-400' : ''}`}
                  />
                  <div className={`max-w-[75%] ${isMine ? "items-end" : ""}`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      {msg.agent_name}
                      {isManagerMsg && (
                        <span className="ml-2 text-indigo-500">
                          {lang === "fr" ? "· Manager" : "· Manager"}
                        </span>
                      )}
                    </p>
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? "bg-[#00BCD4]/15 text-slate-800 border border-[#00BCD4]/20"
                          : isManagerMsg
                            ? "bg-indigo-50 text-slate-700 border border-indigo-100"
                            : "bg-white/80 text-slate-700 border border-white/60 shadow-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {(liveSession.typing_users?.length ?? 0) > 0 && (
        <p className="px-6 text-[10px] text-slate-400 font-bold italic shrink-0">
          {liveSession.typing_users.join(", ")}{" "}
          {lang === "fr" ? "écrit..." : "is typing..."}
        </p>
      )}

      {liveSession.status === "RUNNING" && (
        <div className="shrink-0 p-4 border-t border-white/30 bg-white/50 backdrop-blur-xl">
          <div className="flex gap-2 items-center p-2 bg-white/70 border border-white/80 rounded-2xl shadow-sm">
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isListening}
              className={`p-2.5 rounded-xl shrink-0 transition-all ${
                isListening ? "bg-rose-100 text-rose-500" : "bg-slate-100 text-slate-500 hover:bg-[#00BCD4]/10 hover:text-[#00BCD4]"
              }`}
            >
              <Mic size={15} />
            </button>
            <input
              value={messageInput}
              onChange={(e) => {
                setMessageInput(e.target.value)
                handleTyping(true)
              }}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={
                isManager
                  ? lang === "fr"
                    ? "Message à l'équipe..."
                    : "Message to the team..."
                  : lang === "fr"
                    ? "Votre message..."
                    : "Your message..."
              }
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!messageInput.trim() || sending}
              className="p-2.5 bg-[#FF007F] text-white rounded-xl hover:opacity-90 disabled:opacity-40 shrink-0"
            >
              {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
