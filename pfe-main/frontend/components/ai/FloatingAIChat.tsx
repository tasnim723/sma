"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User as UserIcon, AlertCircle, Mic, MicOff, Trash2, X, MessageSquare, Minimize2, Maximize2 } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"
import { useChatStore, Message } from "@/lib/chatStore"

const defaultMessage: Message = { role: "ai", content: "I am your AI Orchestrator. How can I help you manage your workspace today?" }

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const { messages, addMessage, clearMessages } = useChatStore()
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [currentThinking, setCurrentThinking] = useState("")
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const token = useAuthStore(state => state.token)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }
      recognitionRef.current.onerror = () => setIsListening(false)
      recognitionRef.current.onend = () => setIsListening(false)
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  // Removed manual localStorage sync - handled by useChatStore persist middleware

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = { role: "user", content: input }
    addMessage(userMsg)
    setInput("")
    setLoading(true)
    setStreamingMessage("")
    setCurrentThinking("")
    setCurrentAction(null)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))

      const response = await fetch("http://localhost:8000/api/ai/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: input, history })
      })

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
      console.error(err)
      addMessage({ role: "ai", content: "Error communicating with AI backend." })
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
          <div className="bg-[#00BCD4] p-6 flex items-center justify-between text-white shadow-lg relative z-10">
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
                onClick={() => {
                  if (confirm("Are you sure you want to clear the chat history?")) {
                    clearMessages()
                  }
                }}
                className="p-2.5 hover:bg-white/10 rounded-xl transition-all"
                title="Clear History"
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

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#f8fafc]">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 max-w-[90%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-md
                  ${m.role === 'user' ? 'bg-[#00BCD4] text-white' : 'bg-white border border-slate-100 text-[#00BCD4]'}`}>
                  {m.role === 'user' ? <UserIcon size={18} /> : <Bot size={18} />}
                </div>
                <div className={`rounded-3xl p-5 text-[15px] font-medium leading-relaxed shadow-sm
                  ${m.role === 'user'
                    ? 'bg-[#00BCD4] text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-sm'}`}>
                  {m.content}
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

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex gap-4">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-3.5 rounded-2xl transition-all border shadow-sm
                ${isListening ? 'bg-red-500 border-red-400 text-white animate-pulse' : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-[#00BCD4] hover:bg-[#00BCD4]/5'}`}
            >
              {isListening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Message your orchestrator..."
              className="flex-1 text-base rounded-2xl border border-slate-200/80 px-6 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/30 bg-slate-50 transition-all font-semibold text-slate-700 shadow-inner placeholder:text-slate-400 placeholder:font-medium"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-[#00BCD4] text-white p-3.5 rounded-2xl shadow-xl shadow-[#00BCD4]/30 disabled:opacity-30 transition-all hover:scale-105 active:scale-95 hover:shadow-[#00BCD4]/40"
            >
              <Send size={24} />
            </button>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-95 group
          ${isOpen ? 'bg-slate-900 text-white rotate-90 scale-90' : 'bg-[#00BCD4] text-white shadow-[#00BCD4]/40'}`}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} className="group-hover:animate-bounce" />}
        {!isOpen && (
           <span className="absolute -top-1 -right-1 flex h-5 w-5">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500 border-2 border-white"></span>
           </span>
        )}
      </button>
    </div>
  )
}
