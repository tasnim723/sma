import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface Message {
  role: "user" | "ai"
  content: string
}

const defaultMessage: Message = { 
  role: "ai", 
  content: "I am your AI Orchestrator. How can I help you manage your workspace today?" 
}

interface ChatState {
  messages: Message[]
  addMessage: (message: Message) => void
  setMessages: (messages: Message[]) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [defaultMessage],
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      setMessages: (messages) => set({ messages }),
      clearMessages: () => set({ messages: [defaultMessage] }),
    }),
    {
      name: "sm_pm_chat_history_v2", // Force NEW storage key to fix persistence issues
    }
  )
)
