"use client"

import MultiAgentChat from "@/components/ai/MultiAgentChat"
import { Calendar, Activity, Lightbulb, ShieldAlert, MessageCircle, Zap, Bot } from "lucide-react"

const AVAILABLE_AGENTS = [
  { id: 'ai', title: 'Assistant I.A.', subtitle: 'Orchestrateur Global', icon: Bot, color: 'bg-[#00CCCC]', shadow: 'shadow-[#00CCCC]/30' },
  { id: 'plan', title: 'Planification', subtitle: 'Sprints & Dépend.', icon: Calendar, color: 'bg-[#008f88]', shadow: 'shadow-[#008f88]/30' },
  { id: 'kpi', title: 'Suivi & KPI', subtitle: 'Alertes & Dashboards', icon: Activity, color: 'bg-[#138d58]', shadow: 'shadow-[#138d58]/30' },
  { id: 'inno', title: 'Innovation', subtitle: 'Veille Tech', icon: Lightbulb, color: 'bg-[#c3821a]', shadow: 'shadow-[#c3821a]/30' },
  { id: 'risk', title: 'Risques', subtitle: 'Couverture Risques', icon: ShieldAlert, color: 'bg-[#bc3234]', shadow: 'shadow-[#bc3234]/30' },
  { id: 'comm', title: 'Communication', subtitle: 'Reporting Auto', icon: MessageCircle, color: 'bg-[#a52c2d]', shadow: 'shadow-[#a52c2d]/30' },
  { id: 'deci', title: 'Décision', subtitle: 'Recommandations', icon: Zap, color: 'bg-[#bb3072]', shadow: 'shadow-[#bb3072]/30' }
]

export default function AIInsightsPage() {
  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative">
          <MultiAgentChat />
        </div>

        <div className="space-y-4 bg-white/40 p-4 rounded-[1.5rem] border border-white backdrop-blur-xl shadow-[0_8px_30px_-5px_rgba(0,0,0,0.02)]">
          <div>
            <h3 className="font-[900] text-slate-500 text-[11px] uppercase tracking-[0.1em] mb-3">Agents Disponibles</h3>
            <div className="space-y-1.5">
              {AVAILABLE_AGENTS.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between py-2 px-3 bg-white rounded-[14px] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.04)] border border-slate-50 group hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-5px_rgba(0,0,0,0.08)] transition-all duration-300">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 shrink-0 rounded-[10px] ${agent.color} flex items-center justify-center text-white shadow-sm ${agent.shadow} group-hover:scale-105 transition-transform duration-300`}>
                      <agent.icon size={15} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-[800] text-[#111827] leading-none mb-0.5 group-hover:text-[#00CCCC] transition-colors">{agent.title}</h4>
                      <p className="text-[9px] font-[700] text-slate-400 m-0">{agent.subtitle}</p>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-center w-4 h-4 mr-0.5">
                     <div className="absolute w-[12px] h-[12px] bg-[#2ed89b]/40 rounded-full blur-[2px]"></div>
                     <div className="w-[6px] h-[6px] bg-[#2ed89b] rounded-full shadow-[0_0_6px_#2ed89b] z-10 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 shadow-sm mt-6">
            <h3 className="font-bold text-slate-700 mb-2 text-[13px]">💡 Astuces</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold italic">
              Essayez de demander : &quot;Quels sont les risques majeurs sur ce sprint ?&quot; ou &quot;Peux-tu challenger mon planning pour finir vendredi ?&quot;
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
