"use client"
import { API_BASE_URL } from "@/lib/api"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User as UserIcon, AlertCircle, Mic, Square, Trash2, X, MessageSquare, Paperclip } from "lucide-react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/lib/store"
import { useLang } from "@/lib/useLang"
import { useChatStore, Message } from "@/lib/chatStore"
import ReactMarkdown from "react-markdown"

const defaultMessage: Message = { role: "ai", content: "Je suis votre AI Orchestrator. Comment puis-je vous aider à gérer votre espace de travail aujourd'hui ?" }

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { messages, addMessage, clearMessages } = useChatStore()
  const { lang } = useLang()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [currentThinking, setCurrentThinking] = useState("")
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const token = useAuthStore(state => state.token)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Voice Recording State
  const [isListening, setIsListening] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<any>(null)
  const shouldDiscardRef = useRef(false)

  // File State
  const [selectedFile, setSelectedFile] = useState<{ name: string, type: string, base64: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Voice Recording Logic
  const stopRecording = (discard: boolean = false) => {
    shouldDiscardRef.current = discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    // Note: Do NOT stop tracks here. They are stopped inside onstop after the blob is saved.
    clearInterval(timerRef.current)
    setIsListening(false)
    setRecordingDuration(0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      streamRef.current = stream
      
      // Force Opus codec if available to prevent Chrome from creating unparseable files
      let options = {}
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' }
      }
      
      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder
      chunksRef.current = []
      shouldDiscardRef.current = false

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        if (shouldDiscardRef.current) {
          chunksRef.current = []
          return
        }
        // Use the actual mimeType used by the browser (crucial for Safari/Firefox compatibility)
        const mimeType = recorder.mimeType || "audio/webm"
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        
        // A completely empty WebM/MP4 header is around 200-300 bytes.
        // We use 500 bytes to allow highly compressed (Opus) short voice clips while preventing empty crashes.
        if (audioBlob.size > 500) {  
          sendAudioToBackend(audioBlob, mimeType)
        } else {
          addMessage({ role: "ai", content: "Enregistrement trop court. Parlez un peu plus longtemps." })
        }
        
        // Kill tracks AFTER we've secured the blob (prevents truncation bugs)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      // Start recording normally without timeslice to ensure a single, valid, unfragmented WebM/MP4 file is generated.
      // (Fragmented chunks can sometimes confuse external Whisper APIs).
      recorder.start()
      setIsListening(true)
      setRecordingDuration(0)

      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 59) {
            stopRecording()
            return 60
          }
          return prev + 1
        })
      }, 1000)

    } catch (err) {
      console.error("Microphone access denied:", err)
      alert("Microphone access denied.")
    }
  }

  const sendAudioToBackend = async (blob: Blob, mimeType: string = "audio/webm") => {
    setLoading(true)
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm"
      const formData = new FormData()
      formData.append("file", blob, `vocal.${ext}`)
      
      const res = await axios.post(`${API_BASE_URL}/api/ai/voice`, formData, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      })

      if (res.data && res.data.text) {
        const transcribedText = res.data.text.trim();
        // Filter out common Whisper hallucinations for silence/noise
        const lowerText = transcribedText.toLowerCase().replace(/[^a-z]/g, '');
        const rawLower = transcribedText.toLowerCase();
        
        const isHallucination = 
            lowerText === 'you' || 
            lowerText === 'thankyou' || 
            rawLower.includes('sous-titrage') || 
            rawLower.includes('radio-canada') || 
            rawLower.includes('amara.org') ||
            transcribedText.length === 0;

        if (isHallucination) {
          addMessage({ role: "ai", content: "Je n'ai pas bien compris. Veuillez parler plus fort ou plus longtemps." });
          return;
        }
        
        setInput(transcribedText)
        await handleSendInternal(transcribedText)
      }
    } catch (err: any) {
      console.error("Transcription failed:", err)
      addMessage({ role: "ai", content: "⚠️ Erreur lors de la transcription vocale." })
    } finally {
      setLoading(false)
    }
  }

  const toggleListening = () => {
    if (isListening) stopRecording()
    else startRecording()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setSelectedFile({ name: file.name, type: file.type, base64: base64 })
    }
    reader.readAsDataURL(file)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    const handleTrigger = (e: any) => {
      const { query } = e.detail;
      setIsOpen(true);
      if (query) {
        // Use a small delay to ensure the window is open before sending
        setTimeout(() => {
          handleSendInternal(query);
        }, 100);
      }
    };
    window.addEventListener("trigger-ai-chat", handleTrigger);
    return () => window.removeEventListener("trigger-ai-chat", handleTrigger);
  }, [messages, token]); // Re-bind if dependencies change

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleSendInternal(input, selectedFile)
  }

  const handleSendInternal = async (text: string, file: any = null) => {
    if (!text.trim() && !file) return

    const userMsg: Message = { 
      role: "user", 
      content: text + (file ? `\n\n[Attached File: ${file.name}]` : "") 
    }
    
    addMessage(userMsg)
    setInput("")
    setSelectedFile(null)
    setLoading(true)
    setStreamingMessage("")
    setCurrentThinking("")
    setCurrentAction(null)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: text, 
          history,
          file: file 
        })
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        console.error(`AI Chat HTTP ${response.status}:`, errText)
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`)
      }
      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const dataStr = line.replace("data: ", "").trim()

          if (dataStr === "[DONE]") {
            setLoading(false)
            break
          }

          try {
            const data = JSON.parse(dataStr)
            if (data.type === "token") {
              fullContent += data.content
              setStreamingMessage(fullContent)

              const thinkingMatch = fullContent.match(/<thinking>([\s\S]*?)<\/thinking>/)
              if (thinkingMatch) {
                setCurrentThinking(thinkingMatch[1])
              }
            } else if (data.type === "tool_start") {
              setCurrentAction(data.tool)
            } else if (data.type === "tool_end") {
              setCurrentAction(null)
            } else if (data.type === "error") {
              addMessage({ role: "ai", content: `Error: ${data.content}` })
            }
          } catch (e) {
            console.error("Error parsing JSON chunk", e)
          }
        }
      }

      const finalDisplayContent = fullContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim()
      addMessage({ role: "ai", content: finalDisplayContent })
      setStreamingMessage("")
      setCurrentThinking("")
    } catch (err: any) {
      console.error("AI Chat Error:", err)
      let errorMsg = "Désolé, une erreur de communication est survenue. Veuillez réessayer."
      if (err?.message === "No response body") {
        errorMsg = "Le serveur IA n'a pas renvoyé de réponse. Vérifiez que le backend est démarré."
      } else if (err?.name === "TypeError" && err?.message?.includes("fetch")) {
        errorMsg = "Impossible de contacter le serveur backend. Vérifiez qu'il est démarré."
      }
      addMessage({ role: "ai", content: errorMsg })
    } finally {
      setLoading(false)
      setCurrentAction(null)
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-6 w-[550px] max-w-[calc(100vw-4rem)] h-[800px] max-h-[calc(100vh-10rem)] bg-white rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500 ease-out ring-1 ring-slate-900/5">
          {/* Header */}
          <div className="bg-[#00BCD4] p-6 flex items-center justify-between text-white shadow-lg relative z-10 shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-xl border border-white/30 shadow-inner">
                <Bot size={28} />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight leading-none mb-1">AI Orchestrator</h3>
                <p className="text-[11px] font-black opacity-80 uppercase tracking-[0.2em]">Multi-Agent Intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all"
                title={lang === 'fr' ? "Effacer l'historique" : "Clear History"}
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col">
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="relative mb-8">
                    <motion.div 
                      animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-[#00BCD4]/20"
                    />
                    <button 
                      onClick={() => stopRecording(false)}
                      className="relative w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100 z-10 cursor-pointer hover:scale-105 transition-transform"
                    >
                      <Mic size={32} className="text-[#00BCD4]" />
                    </button>
                  </div>
                  <h4 className="text-xl font-black text-slate-800 mb-2">Je vous écoute...</h4>
                  <p className="text-slate-500 font-bold text-[10px] uppercase mb-4 tracking-widest">Cliquez sur le micro pour terminer</p>
                  <div className="text-[11px] font-black text-[#00BCD4] uppercase tracking-widest bg-cyan-50 px-3 py-1 rounded-full border border-cyan-100 mb-8">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                  </div>
                  <button
                    onClick={() => stopRecording(true)}
                    className="mt-4 px-6 py-2 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs uppercase hover:bg-slate-50 transition-all"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#f8fafc]">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <Bot size={48} className="mb-4" />
                  <p className="font-bold text-sm uppercase tracking-[0.2em]">{defaultMessage.content}</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-4 max-w-[90%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${m.role === 'user' ? 'bg-[#00BCD4] text-white' : 'bg-white border border-slate-100 text-[#00BCD4]'}`}>
                    {m.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                  </div>
                  <div className={`rounded-3xl p-5 text-[15px] font-medium leading-relaxed shadow-sm markdown-content group relative ${m.role === 'user' ? 'bg-[#00BCD4] text-white rounded-tr-sm' : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-sm'}`}>
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    
                    {/* Individual Message Deletion */}
                    <button 
                      onClick={() => {
                        const newMessages = [...messages]
                        newMessages.splice(i, 1)
                        useChatStore.getState().setMessages(newMessages)
                      }}
                      className={`absolute -top-2 ${m.role === 'user' ? '-left-2' : '-right-2'} p-1.5 bg-white border border-slate-100 text-slate-400 hover:text-rose-500 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all z-20`}
                      title={lang === 'fr' ? "Supprimer ce message" : "Delete message"}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            
              {(loading || streamingMessage) && (
                <div className="flex flex-col gap-4 max-w-[90%]">
                  {(currentThinking || currentAction) && (
                    <div className="ml-14 bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-slate-500 italic shadow-sm backdrop-blur-sm">
                        {currentAction && (
                          <div className="flex items-center gap-2 mb-2 font-black text-[#00BCD4] uppercase tracking-widest text-[10px]">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                            </span>
                            Executing {currentAction.replace(/_/g, ' ')}...
                          </div>
                        )}
                        {currentThinking && <p className="leading-relaxed">Thinking: {currentThinking}</p>}
                    </div>
                  )}
                  {streamingMessage.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim() && (
                      <div className="flex gap-4 animate-in fade-in duration-500">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-[#00BCD4] flex items-center justify-center shrink-0 shadow-md">
                          <Bot size={18} />
                        </div>
                        <div className="bg-white border border-slate-200/60 rounded-3xl rounded-tl-sm p-5 shadow-sm text-[15px] font-medium text-slate-800 leading-relaxed">
                          {streamingMessage.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim()}
                        </div>
                      </div>
                  )}
                  {loading && !streamingMessage && !currentAction && (
                      <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-[#00BCD4] flex items-center justify-center shrink-0 shadow-md opacity-50">
                          <Bot size={18} />
                        </div>
                        <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 flex gap-1.5 items-center">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                        </div>
                      </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Footer Input */}
          <div className="flex flex-col bg-white shrink-0">
            {selectedFile && (
              <div className="mx-6 p-2.5 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-center justify-between text-xs font-bold text-cyan-600 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  <span className="truncate max-w-[300px]">{selectedFile.name}</span>
                </div>
                <button type="button" onClick={() => setSelectedFile(null)} className="p-1 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleSend} className="p-6 flex gap-3 relative border-t border-slate-100">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.txt,.docx" />
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-[#00BCD4] hover:border-[#00BCD4]/30 hover:bg-[#00BCD4]/5 transition-all shadow-sm"
                  title="Joindre un fichier"
                >
                  <Paperclip size={20} strokeWidth={2.5} />
                </button>
                
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all border shadow-sm
                    ${isListening ? 'bg-rose-50 border-rose-200 text-rose-500 animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-[#00BCD4] hover:bg-[#00BCD4]/5'}`}
                  title={isListening ? "Arrêter l'enregistrement" : "Enregistrement vocal"}
                >
                  {isListening ? <Square size={18} fill="currentColor" /> : <Mic size={20} strokeWidth={2.5} />}
                </button>
              </div>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Un message ou une commande..."
                className="flex-1 text-sm rounded-2xl border border-slate-200 px-5 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/20 bg-slate-50 transition-all font-semibold text-slate-700 shadow-inner"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || (!input.trim() && !selectedFile)}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#00BCD4] text-white shadow-xl shadow-[#00BCD4]/30 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
              >
                <Send size={22} strokeWidth={2.5} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onClick={() => setShowDeleteConfirm(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-[340px] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
              style={{ background: "linear-gradient(145deg, #0e7490 0%, #155e75 40%, #164e63 100%)" }}
            >
              {/* Decorative top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

              <div className="p-8 text-center">
                {/* Icon */}
                <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-5 shadow-lg">
                  <Trash2 size={28} className="text-rose-300 drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
                </div>

                <h3 className="text-white font-black text-lg tracking-tight mb-2">
                  {lang === 'fr' ? "Effacer l'historique ?" : "Clear history?"}
                </h3>
                <p className="text-cyan-100/70 text-sm font-medium leading-relaxed mb-8">
                  {lang === 'fr'
                    ? "Cette action supprimera toutes les conversations avec l'AI Orchestrator."
                    : "This will delete all conversations with the AI Orchestrator."}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-cyan-100 bg-white/10 border border-white/15 hover:bg-white/20 transition-all"
                  >
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      clearMessages()
                      setShowDeleteConfirm(false)
                    }}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-lg shadow-rose-500/30 transition-all hover:shadow-rose-500/50 active:scale-95"
                  >
                    {lang === 'fr' ? 'Supprimer' : 'Delete'}
                  </button>
                </div>
              </div>

              {/* Decorative bottom glow */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button Gamified */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-[72px] h-[72px] flex items-center justify-center rounded-full transition-all duration-500 hover:scale-105 group active:scale-95 z-50
          ${isOpen ? 'rotate-90 scale-90 opacity-100' : 'opacity-50 hover:opacity-100'}`}
      >
        {/* Glow behind the button */}
        <div className="absolute inset-[-5px] bg-[#22d3ee] rounded-full blur-[15px] opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none"></div>

        {/* Outer Glassy Ring (Background Wrapper) - Thick Padding */}
        <div className="absolute inset-0 rounded-full border-[1.5px] border-[#a5f3fc]/30 bg-gradient-to-br from-[#164e63]/50 to-[#155e75]/50 backdrop-blur-md shadow-[inset_0_0_15px_rgba(34,211,238,0.2)]"></div>
        
        {/* Inner Glowing Circle - Smaller to create thick ring aesthetic */}
        <div className="relative w-[42px] h-[42px] rounded-full border border-cyan-400/50 bg-gradient-to-b from-[#155e75]/90 to-[#164e63]/90 shadow-[inset_0_0_20px_rgba(34,211,238,0.5),0_0_10px_rgba(34,211,238,0.4)] flex items-center justify-center overflow-hidden backdrop-blur-sm z-10 hover:shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-all">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-white/5 rounded-t-full pointer-events-none"></div>
            {isOpen ? (
              <X size={24} className="text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)] relative z-10" />
            ) : (
              <MessageSquare size={22} className="text-cyan-100 drop-shadow-[0_0_6px_rgba(34,211,238,1)] relative z-10 group-hover:scale-110 transition-transform duration-300 translate-y-[-1px] translate-x-[0.5px]" strokeWidth={2.5} />
            )}
        </div>

        {/* Notification Dot - perfectly centered inside the thick outer ring */}
        {!isOpen && (
           <div className="absolute top-[8px] right-[8px] flex h-[12px] w-[12px] z-20">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#67e8f9] opacity-80"></span>
             <span className="relative inline-flex rounded-full h-[12px] w-[12px] bg-[#cffafe] border-[1.5px] border-[#164e63] shadow-[0_0_8px_rgba(103,232,249,1)]"></span>
           </div>
        )}
      </button>
    </div>
  )
}
