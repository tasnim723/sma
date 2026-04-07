"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User as UserIcon, AlertCircle, Mic, MicOff, Trash2, X } from "lucide-react"
import axios from "axios"
import { motion, AnimatePresence } from "framer-motion"
import { useAuthStore } from "@/lib/store"
import { useChatStore, Message } from "@/lib/chatStore"
import ReactMarkdown from "react-markdown"

const defaultMessage: Message = { role: "ai", content: "I am your AI Orchestrator. How can I help you manage your workspace today?" }

export default function MultiAgentChat() {
  const { messages, addMessage, clearMessages } = useChatStore()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [currentThinking, setCurrentThinking] = useState("")
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const token = useAuthStore(state => state.token)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isListening, setIsListening] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<any>(null)

  const shouldDiscardRef = useRef(false)

  const stopRecording = (discard: boolean = false) => {
    shouldDiscardRef.current = discard
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
    clearInterval(timerRef.current)
    setIsListening(false)
    setRecordingDuration(0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
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
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" })
        if (audioBlob.size > 1000) { 
          sendAudioToBackend(audioBlob)
        }
      }

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

  const sendAudioToBackend = async (blob: Blob) => {
    setLoading(true)
    try {
      console.log("📤 Sending audio to transcription...", blob.size, "bytes")
      const formData = new FormData()
      formData.append("file", blob, "vocal.webm")

      const res = await axios.post("http://127.0.0.1:8000/api/ai/voice", formData, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      })

      console.log("📥 Transcription result:", res.data)
      if (res.data && res.data.text) {
        // Automatically send the transcribed text to chat
        await submitMessage(res.data.text)
      } else {
        console.warn("⚠️ Empty transcription received.")
      }
    } catch (err: any) {
      console.error("❌ Transcription failed:", err.response?.data || err.message)
      addMessage({ role: "ai", content: "⚠️ Erreur lors de la transcription vocale. Veuillez réessayer." })
    } finally {
      setLoading(false)
    }
  }

  const toggleListening = () => {
    if (isListening) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  const submitMessage = async (text: string) => {
    if (!text.trim()) return
    await handleSendInternal(text)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Removed manual localStorage sync - handled by useChatStore persist middleware

  const [selectedFile, setSelectedFile] = useState<{ name: string, type: string, base64: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setSelectedFile({
        name: file.name,
        type: file.type,
        base64: base64
      })
    }
    reader.readAsDataURL(file)
  }

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
    if (!file) setInput("") // Only clear input if not file-only
    
    const currentFile = file
    setSelectedFile(null)
    setLoading(true)
    setStreamingMessage("")
    setCurrentThinking("")
    setCurrentAction(null)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const response = await fetch("http://127.0.0.1:8000/api/ai/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          message: text, 
          history,
          file: currentFile 
        })
      })
      // ... same streaming logic below

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

              // Extract thinking if any
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

      // Finalize message by removing thinking tags for display
      const finalDisplayContent = fullContent.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim()
      addMessage({ role: "ai", content: finalDisplayContent })
      setStreamingMessage("")
      setCurrentThinking("")
    } catch (err: any) {
      console.error(err)
      addMessage({ role: "ai", content: "Error communicating with AI backend." })
    } finally {
      setLoading(false)
      setCurrentAction(null)
    }
  }

  return (
    <div className="flex flex-col h-[650px] border border-slate-200/60 rounded-3xl overflow-hidden bg-white shadow-xl ring-1 ring-slate-900/5 relative">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-12">
              {/* Pulsing rings */}
              <motion.div 
                animate={{ scale: [1, 1.5], opacity: [0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full bg-[#00CCCC]/20"
              />
              <motion.div 
                animate={{ scale: [1, 2], opacity: [0.15, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                className="absolute inset-0 rounded-full bg-purple-500/10"
              />
              
              {/* Glow background */}
              <div className="absolute inset-[-40px] bg-gradient-to-br from-[#00CCCC]/20 to-purple-500/20 rounded-full blur-3xl" />
              
              {/* Central Mic Button (Click to STOP & SEND) */}
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => stopRecording(false)}
                className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_10px_40px_rgba(0,204,204,0.2)] border border-slate-100 z-10 cursor-pointer"
              >
                <div className="text-[#00CCCC]">
                  <Mic size={36} strokeWidth={2.5} />
                </div>
              </motion.button>
            </div>

            <div className="space-y-2 mb-16">
              <h2 className="text-[28px] font-black text-slate-800 tracking-tight">Je vous écoute...</h2>
              <p className="text-slate-500 font-bold text-sm">Cliquez sur le micro pour terminer</p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00CCCC] animate-pulse" />
                <span className="text-[11px] font-black text-[#00CCCC] uppercase tracking-[0.2em]">
                  {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')} / 1:00
                </span>
              </div>
            </div>

            <button 
              onClick={() => stopRecording(true)}
              className="px-10 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-sm transition-all active:scale-95"
            >
              Annuler / Discard
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-r from-[#f0fafa] to-white py-3 px-5 flex items-center justify-between border-b border-[#00CCCC]/10">
        <div className="flex items-center gap-3">
          <div className="bg-[#00CCCC]/10 p-2 rounded-xl border border-[#00CCCC]/20 shadow-inner shadow-[#00CCCC]/5">
            <Bot size={18} className="text-[#00CCCC]" />
          </div>
          <div>
            <h3 className="font-black text-[15px] tracking-tight leading-loose mb-0.5 mt-[-2px] text-[#111827]">Assistant I.A.</h3>
            <p className="text-[9px] text-[#00CCCC] font-[800] uppercase tracking-[0.1em] m-0">Multi-Agent Orchestrator</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => {
              clearMessages()
              setSelectedFile(null)
              setInput("")
            }}
            className="bg-[#FF0000]/5 hover:bg-[#FF0000]/10 text-[#FF0000] text-[10px] px-2.5 py-1.5 rounded-lg border border-[#FF0000]/10 flex items-center gap-1.5 transition-colors"
            title="Effacer l'historique"
          >
            <Trash2 size={12} />
            <span className="font-bold uppercase tracking-widest">Clear</span>
          </button>
          
          <div className="bg-[#00CCCC]/10 text-[9px] px-2.5 py-1.5 rounded-lg border border-[#00CCCC]/20 text-[#008f88] flex items-center gap-1.5 shadow-sm font-black uppercase tracking-[0.1em]">
            <AlertCircle size={12} className="text-[#00CCCC]" />
            <span>Multi-Agent Actif</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-slate-50/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 max-w-[90%] md:max-w-[88%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm
              ${m.role === 'user' ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white' : 'bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 text-white'}`}>
              {m.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
            </div>
            <div className={`rounded-2xl p-4 text-sm leading-relaxed shadow-sm markdown-content
              ${m.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm'
                : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-sm'}`}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex flex-col gap-4 max-w-[90%]">
            {(currentThinking || currentAction) && (
              <div className="flex gap-3 ml-4 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="w-1.5 bg-blue-500/30 rounded-full shrink-0" />
                <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3 text-[11px] leading-relaxed text-slate-500 shadow-sm backdrop-blur-sm">
                  {currentAction && (
                    <div className="flex items-center gap-2 mb-1.5 font-bold text-blue-600 uppercase tracking-widest text-[9px]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Executing {currentAction.replace(/_/g, ' ')}...
                    </div>
                  )}
                  {currentThinking && (
                    <div className="italic font-medium text-slate-400">
                      Thinking: {currentThinking}
                    </div>
                  )}
                </div>
              </div>
            )}

            {streamingMessage.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim() && (
              <div className="flex gap-3 animate-in fade-in duration-500">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Bot size={16} />
                </div>
                <div className="bg-white border border-slate-200/60 rounded-2xl rounded-tl-sm p-4 shadow-sm text-sm text-slate-800 leading-relaxed markdown-content">
                  <ReactMarkdown>
                    {streamingMessage.replace(/<thinking>[\s\S]*?<\/thinking>/g, "").trim()}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {loading && !streamingMessage && !currentAction && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm opacity-50">
                  <Bot size={16} />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75" />
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col">
        {selectedFile && (
          <div className="mx-4 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-bold text-slate-500 animate-in slide-in-from-bottom-2 fade-in">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 bg-[#00CCCC] rounded-full animate-pulse" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedFile(null)}
              className="text-red-500 hover:text-red-700 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
        <form onSubmit={handleSend} className="p-4 bg-white/50 backdrop-blur-sm border-t border-slate-200/60 flex gap-2 md:gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,.pdf,.txt,.docx"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all border bg-slate-50 border-slate-200 text-slate-400 hover:text-[#00CCCC] hover:border-[#00CCCC]/30"
          >
            <Send className="rotate-[-45deg]" size={18} />
          </button>
          <button
            type="button"
            onClick={toggleListening}
            className={`flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-xl transition-all border
              ${isListening
                ? 'bg-rose-500 border-rose-400 text-white animate-pulse shadow-lg'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-slate-600'}`}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Present your plan or ask for a critique..."
            className="flex-1 text-sm rounded-xl border border-slate-200/80 px-4 py-2 md:py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white shadow-sm transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || (!input.trim() && !selectedFile)}
            className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 md:px-5 py-2 rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0 font-medium flex items-center justify-center"
          >
            <Send size={18} className="drop-shadow-sm" />
          </button>
        </form>
      </div>
    </div>
  )
}
