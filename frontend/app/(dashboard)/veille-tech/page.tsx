"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Lightbulb, RefreshCw } from "lucide-react"
import axios from "axios"
import FilterTabs from "@/components/veille/FilterTabs"
import InnovationScore from "@/components/veille/InnovationScore"
import { TechArticle } from "@/components/veille/TechCard"
import TechDetailModal from "@/components/veille/TechDetailModal"
import SuccessNotification from "@/components/veille/SuccessNotification"
import { useAuthStore } from "@/lib/store"
import TechGrid from "@/components/veille/TechGrid"
import LeadRadarView from "@/components/veille/LeadRadarView"
import { API_BASE_URL } from "@/lib/api"
import { useLang } from "@/lib/useLang"

const CATEGORIES = [
  "Tout",
  "Développement",
  "AI & Data",
  "Infrastructure",
  "Cybersécurité",
  "Innovation"
]

export default function VeilleTechPage() {
  const { token, user } = useAuthStore()
  const { t, lang } = useLang()

  const CATEGORIES = lang === 'fr'
    ? ["Tout", "Développement", "AI & Data", "Infrastructure", "Cybersécurité", "Innovation"]
    : ["All", "Development", "AI & Data", "Infrastructure", "Cybersecurity", "Innovation"]

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [articles, setArticles] = useState<TechArticle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<TechArticle | null>(null)

  // Success state
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const fetchArticles = async (category: string) => {
    setIsLoading(true)
    try {
      const endpoint = category === "Tout" 
        ? `${API_BASE_URL}/api/tech?t=${Date.now()}` 
        : `${API_BASE_URL}/api/tech?category=${encodeURIComponent(category)}&t=${Date.now()}`
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const response = await axios.get(endpoint, config)
      
      // Use the real AI-powered backend data
      console.log("Articles fetched:", response.data.length, "articles")
      setArticles(response.data)
    } catch (error) {
      console.error("Error fetching tech articles:", error)
      setArticles([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchArticles(activeCategory)
  }, [activeCategory, token])

  const handleFilterChange = (category: string) => {
    setActiveCategory(category)
  }

  const handleApply = (article: TechArticle) => {
    setSelectedArticle(article)
    setIsModalOpen(true)
  }

  const handleModalSuccess = () => {
    setSuccessMessage(`Technologie "${selectedArticle?.title}" appliquée avec succès !`)
    setShowSuccess(true)
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      await axios.post(`${API_BASE_URL}/api/tech/refresh`, config)
      // Wait a moment for the background task to complete
      setTimeout(() => {
        fetchArticles(activeCategory)
      }, 2000)
      setSuccessMessage(lang === 'fr' ? "Veille Tech actualisée avec des contenus IA spécifiques au projet !" : "Tech Watch refreshed with AI project-specific content!")
      setShowSuccess(true)
    } catch (error) {
      console.error("Error refreshing tech articles:", error)
      setSuccessMessage(lang === 'fr' ? "Erreur lors de l'actualisation" : "Error during refresh")
      setShowSuccess(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Notifications */}
      <SuccessNotification 
        isVisible={showSuccess} 
        message={successMessage} 
        onClose={() => setShowSuccess(false)} 
      />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 mb-8 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center self-start xl:self-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00BCD4] flex items-center justify-center text-white shadow-lg shadow-[#00BCD4]/30 shrink-0">
            <Lightbulb size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              {t.veilleTech.title}
            </h1>
            <p className="text-[14px] font-bold text-slate-400">
              {lang === 'fr' ? "Détectez et intégrez les tendances IT & Gaming instantanément." : "Detect and integrate IT & Gaming trends instantly."}
            </p>
          </div>
        </div>

        {user?.role?.toUpperCase() !== 'TEAM_LEAD' && (
          <FilterTabs 
            categories={CATEGORIES} 
            activeCategory={activeCategory} 
            onFilterChange={handleFilterChange} 
          />
        )}

        {user?.role?.toUpperCase() !== 'TEAM_LEAD' && (
          <div className="self-end xl:self-center flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-[#00BCD4] text-white rounded-xl hover:bg-[#00BCD4]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                <span className="text-sm font-black">{lang === 'fr' ? "Actualiser IA" : "Refresh AI"}</span>
              </button>
              <InnovationScore score={88} />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mx-4 px-4 pb-12">
        {user?.role?.toUpperCase() === 'TEAM_LEAD' ? (
          <LeadRadarView />
        ) : (
          <TechGrid articles={articles} isLoading={isLoading} onApply={handleApply} />
        )}
      </div>

      {/* Modal */}
      <TechDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        article={selectedArticle}
        onSuccess={handleModalSuccess}
      />
    </div>
  )
}
