"use client"

import { useLangStore } from "./langStore"
import { translations } from "./translations"

export function useLang() {
  const lang = useLangStore((state) => state.lang)
  const setLang = useLangStore((state) => state.setLang)
  const t = translations[lang]
  return { t, lang, setLang }
}
