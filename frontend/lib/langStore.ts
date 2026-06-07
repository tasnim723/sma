import { create } from "zustand"
import { persist } from "zustand/middleware"

type Lang = "fr" | "en"

interface LangState {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "fr",
      setLang: (lang) => set({ lang }),
    }),
    {
      name: "lang-storage",
    }
  )
)
