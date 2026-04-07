"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Lightbulb } from "lucide-react"
import axios from "axios"
import FilterTabs from "@/components/veille/FilterTabs"
import InnovationScore from "@/components/veille/InnovationScore"
import { TechArticle } from "@/components/veille/TechCard"
import TechDetailModal from "@/components/veille/TechDetailModal"
import SuccessNotification from "@/components/veille/SuccessNotification"
import { useAuthStore } from "@/lib/store"
import TechGrid from "@/components/veille/TechGrid"
import LeadRadarView from "@/components/veille/LeadRadarView"

const CATEGORIES = [
  "Tout",
  "Dev Web & Mobile",
  "Gaming & Unreal Engine",
  "IT Management",
  "3D & Unreal Engine"
]

export default function VeilleTechPage() {
  const { token, user } = useAuthStore()
  const [activeCategory, setActiveCategory] = useState("Tout")
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
        ? "http://localhost:8000/api/tech" 
        : `http://localhost:8000/api/tech?category=${encodeURIComponent(category)}`
      
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      const response = await axios.get(endpoint, config)
      
      // If db is empty, inject mock data to look like the design while testing
      if (response.data.length === 0) {
          const now = new Date().toISOString();
          setArticles([
            {
              id: "gen1",
              title: "Unreal Engine 5.7+ Mover Framework Tutorial",
              description: "Learn how to use the Mover Framework in Unreal Engine 5.7+ to create complex character movements and interactions with cinematic fidelity...",
              category: "Gaming & Unreal Engine",
              type: "VIDEO",
              priority: "Haute priorité",
              link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              created_at: now
            },
            {
              id: "gen2",
              title: "Agentic Workflows for AI-First Web Development",
              description: "Discover how to use Agentic workflows to create AI-powered web applications that can learn and adapt to user behavior autonomously...",
              category: "Dev Web & Mobile",
              type: "ARTICLE",
              priority: "Vanguard",
              link: "https://dev.to/t/nextjs",
              created_at: now
            },
            {
              id: "gen3",
              title: "Modern IT Management Strategies for 2026",
              description: "Exploring the shift towards decentralized management and automated productivity tracking in global remote-first IT teams...",
              category: "IT Management",
              type: "ARTICLE",
              priority: "Priorité",
              link: "https://dev.to/t/management",
              created_at: now
            }
          ])
      } else {
        setArticles(response.data)
      }
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
              Veille Tech
            </h1>
            <p className="text-[14px] font-bold text-slate-400">
              Détectez et intégrez les tendances IT & Gaming instantanément.
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
