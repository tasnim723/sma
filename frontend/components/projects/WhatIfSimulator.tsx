"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RefreshCw, Target, ChevronDown, ChevronUp, Sparkles, Info } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────
export type WhatIfOverrides = {
  resourceLimit?: boolean
  mvpSpeed?: boolean
  b2b?: boolean
  junior?: boolean
}

export type WhatIfWeights = {
  roi: number
  fast: number
  innov: number
  feasib: number
  scalab: number
}

export type WhatIfProjectPayload = {
  id: number
  title: string
  description?: string
  complexity?: "LOW" | "MEDIUM" | "HIGH"
  stack?: string[]
  scenarios?: { balanced?: { duration_weeks: number } }
  innovation_score?: number
  comparison_score?: number
  modules?: string[]
  [key: string]: unknown
}

type WhatIfApiRow = {
  project_id: number
  project_title: string
  complexity: string
  baseline: {
    roi: number
    fast: number
    feasib: number
    scalab: number
    innov: number
    success: number
  }
  simulated: {
    roi: number
    fast: number
    feasib: number
    scalab: number
    innov: number
    success: number
    confidence: number
  }
  delta: number
  is_top: boolean
  ai_insight: string
  impact_tags: string[]
  suited_if: string[]
  careful_if: string[]
  task_ideas: string[]
}

type WhatIfSimulatorProps = {
  token: string | null
  projects: WhatIfProjectPayload[]
  constraints: Record<string, string | undefined>
  whatIfOverrides: WhatIfOverrides
  setWhatIfOverrides: React.Dispatch<React.SetStateAction<WhatIfOverrides>>
  whatIfWeights: WhatIfWeights
  confidenceScore?: number
  onSimulationUpdate?: (rows: any) => void
}

// ─── Chip Config ─────────────────────────────────────────────────────────────
const CHIPS: {
  key: keyof WhatIfOverrides
  emoji: string
  label: string
  tooltipBody: string
  activeBorder: string
  activeBg: string
  activeText: string
  activeGlow: string
  dotColor: string
}[] = [
  {
    key: "resourceLimit",
    emoji: "⚙️",
    label: "Ressources limitées",
    tooltipBody:
      "Simule un contexte où les ressources disponibles sont contraintes. Le ROI est réduit, et la faisabilité est ajustée selon la complexité du projet.",
    activeBorder: "border-orange-400",
    activeBg: "bg-orange-50",
    activeText: "text-orange-700",
    activeGlow: "shadow-[0_0_14px_rgba(249,115,22,0.35)]",
    dotColor: "bg-orange-400",
  },
  {
    key: "mvpSpeed",
    emoji: "⚡",
    label: "Lancement 4 sem.",
    tooltipBody:
      "Impose un objectif de lancement en 4 semaines. Booste la vitesse des projets simples, et pénalise fortement les projets complexes difficiles à accélérer.",
    activeBorder: "border-emerald-400",
    activeBg: "bg-emerald-50",
    activeText: "text-emerald-700",
    activeGlow: "shadow-[0_0_14px_rgba(16,185,129,0.35)]",
    dotColor: "bg-emerald-400",
  },
  {
    key: "b2b",
    emoji: "🏢",
    label: "Cible B2B",
    tooltipBody:
      "Oriente le projet vers une clientèle professionnelle. Augmente le ROI (+12 pts) et la scalabilité (+10 pts), car les modèles B2B ont un panier moyen plus élevé.",
    activeBorder: "border-blue-400",
    activeBg: "bg-blue-50",
    activeText: "text-blue-700",
    activeGlow: "shadow-[0_0_14px_rgba(59,130,246,0.35)]",
    dotColor: "bg-blue-400",
  },
  {
    key: "junior",
    emoji: "👨‍💻",
    label: "Équipe junior",
    tooltipBody:
      "Simule une équipe sans expérience senior. Réduit la faisabilité et le score de confiance, particulièrement sur les projets à haute complexité technique.",
    activeBorder: "border-violet-400",
    activeBg: "bg-violet-50",
    activeText: "text-violet-700",
    activeGlow: "shadow-[0_0_14px_rgba(139,92,246,0.35)]",
    dotColor: "bg-violet-400",
  },
]

// ─── Metric bar ───────────────────────────────────────────────────────────────
const METRICS: { key: string; label: string; icon: string; color: string }[] = [
  { key: "roi", label: "ROI", icon: "💰", color: "bg-amber-400" },
  { key: "fast", label: "Vitesse", icon: "⚡", color: "bg-emerald-400" },
  { key: "feasib", label: "Faisabilité", icon: "⚙️", color: "bg-blue-400" },
  { key: "scalab", label: "Scalabilité", icon: "📈", color: "bg-violet-400" },
  { key: "innov", label: "Innovation", icon: "🚀", color: "bg-fuchsia-400" },
]

function MetricBar({
  icon, label, color, baseline, simulated,
}: { icon: string; label: string; color: string; baseline: number; simulated: number }) {
  const delta = simulated - baseline
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-black text-slate-500 uppercase tracking-wider">
          {icon} {label}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 line-through font-mono">{baseline}%</span>
          <span
            className={`font-black font-mono flex items-center gap-1 ${
              delta > 0 ? "text-emerald-600" : delta < 0 ? "text-rose-500" : "text-slate-500"
            }`}
          >
            <span>{delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {simulated}%</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-md border shadow-sm ${
              delta > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : delta < 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-slate-50 border-slate-200 text-slate-600"
            }`}>
              {delta > 0 ? "+" : ""}{delta}%
            </span>
          </span>
        </div>
      </div>
      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-slate-200 rounded-full"
          style={{ width: `${baseline}%` }}
        />
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          initial={{ width: `${baseline}%` }}
          animate={{ width: `${simulated}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

// ─── Dot indicator ────────────────────────────────────────────────────────────
function ScoreDot({ score }: { score: number }) {
  const cls =
    score < 40 ? "bg-rose-500" : score < 60 ? "bg-cyan-300" : "bg-[#00BCD4]"
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${cls}`}
      title={`${score}%`}
    />
  )
}

// ─── AI Insight Panel ─────────────────────────────────────────────────────────
function AIInsightPanel({ row, confidenceScore }: { row: WhatIfApiRow; confidenceScore?: number }) {
  const baseScore = confidenceScore ?? row.baseline.success
  const simulatedSuccess = confidenceScore ? Math.min(100, Math.max(0, confidenceScore + row.delta)) : row.simulated.success
  const delta = row.delta

  // ── Fallback: generate smart recommendations from row data when LLM is empty ──
  const hasLLMData = !!(row.ai_insight || row.impact_tags.length > 0 || row.suited_if.length > 0 || row.careful_if.length > 0 || row.task_ideas.length > 0)

  const fallback = useMemo(() => {
    if (hasLLMData) return null
    const complexity = row.complexity
    const sim = row.simulated
    const bl = row.baseline

    // Impact tags based on biggest metric changes
    const metricDeltas = [
      { key: "ROI", delta: sim.roi - bl.roi },
      { key: "Vitesse", delta: sim.fast - bl.fast },
      { key: "Faisabilité", delta: sim.feasib - bl.feasib },
      { key: "Scalabilité", delta: sim.scalab - bl.scalab },
      { key: "Innovation", delta: sim.innov - bl.innov },
    ]
    const impactTags = metricDeltas
      .filter(m => m.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 3)
      .map(m => `${m.delta > 0 ? "↑" : "↓"} ${m.key} ${m.delta > 0 ? "+" : ""}${m.delta}%`)

    // AI Insight
    let insight = ""
    if (delta > 0) {
      insight = `Ce scénario améliore le score stratégique de ${delta} points. `
      if (sim.fast > bl.fast) insight += "La vitesse de livraison est significativement améliorée. "
      if (sim.feasib > bl.feasib) insight += "La faisabilité technique est renforcée. "
      if (sim.scalab > bl.scalab) insight += "Le potentiel de scalabilité augmente. "
    } else if (delta < 0) {
      insight = `Ce scénario réduit le score stratégique de ${Math.abs(delta)} points. `
      if (sim.roi < bl.roi) insight += "Le ROI est impacté à la baisse. "
      if (sim.feasib < bl.feasib) insight += "La faisabilité technique devient un risque. "
    } else {
      insight = "Ce scénario n'a pas d'impact significatif sur le score stratégique global. Les métriques restent stables."
    }

    // Suited if / Careful if
    const suitedIf: string[] = []
    const carefulIf: string[] = []
    if (complexity === "LOW") {
      suitedIf.push("ressources limitées", "objectif simple")
    } else if (complexity === "MEDIUM") {
      suitedIf.push("équipe expérimentée", "délai flexible")
    } else {
      suitedIf.push("budget conséquent", "équipe senior disponible")
    }
    if (sim.fast < 50) carefulIf.push("risque de retard de livraison")
    if (sim.feasib < 60) carefulIf.push("risque de complexité technique")
    if (sim.roi < 50) carefulIf.push("retour sur investissement faible")
    if (sim.scalab < 50) carefulIf.push("scalabilité limitée")
    if (carefulIf.length === 0) carefulIf.push("aucun risque majeur identifié")

    // Task ideas
    const taskIdeas: string[] = []
    if (sim.fast > bl.fast) taskIdeas.push("Définir les objectifs clairs")
    if (sim.feasib !== bl.feasib) taskIdeas.push("Identifier les ressources disponibles")
    if (delta !== 0) taskIdeas.push("Créer un plan de stratégie")
    if (sim.roi !== bl.roi) taskIdeas.push("Analyser le retour sur investissement")
    if (taskIdeas.length === 0) taskIdeas.push("Maintenir la stratégie actuelle", "Surveiller les indicateurs clés")

    return { insight, impactTags, suitedIf, carefulIf, taskIdeas }
  }, [hasLLMData, row, delta])

  const displayInsight = row.ai_insight || fallback?.insight || ""
  const displayTags = row.impact_tags.length > 0 ? row.impact_tags : (fallback?.impactTags || [])
  const displaySuited = row.suited_if.length > 0 ? row.suited_if : (fallback?.suitedIf || [])
  const displayCareful = row.careful_if.length > 0 ? row.careful_if : (fallback?.carefulIf || [])
  const displayTasks = row.task_ideas.length > 0 ? row.task_ideas : (fallback?.taskIdeas || [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25 }}
      className="mt-3 p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50/40 border border-cyan-100 space-y-4"
    >
      {/* Strategic Score */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[11px] font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-cyan-100">
          <span className="uppercase tracking-wider">Score Stratégique Global</span>
          <span className="font-black font-mono text-sm">
            {simulatedSuccess}%
          </span>
          {delta !== 0 && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md border shadow-sm ${
              delta > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}>
              {delta > 0 ? "+" : ""}{delta}%
            </span>
          )}
        </div>
      </div>

      {/* Impact tags */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayTags.map((tag, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-700 border border-cyan-200"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Analysis */}
      {displayInsight && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} className="text-cyan-500" />
            <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Analyse IA</p>
          </div>
          <p className="text-[12px] text-slate-600 font-medium leading-relaxed">{displayInsight}</p>
        </div>
      )}

      {/* Suited / Careful */}
      {(displaySuited.length > 0 || displayCareful.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {displaySuited.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">
                ✅ Adapté si
              </p>
              <ul className="space-y-1">
                {displaySuited.map((s, i) => (
                  <li key={i} className="text-[11px] text-slate-600 font-medium flex items-start gap-1">
                    <span className="text-emerald-500 shrink-0 mt-0.5">·</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {displayCareful.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">
                ⚠️ Attention si
              </p>
              <ul className="space-y-1">
                {displayCareful.map((c, i) => (
                  <li key={i} className="text-[11px] text-slate-600 font-medium flex items-start gap-1">
                    <span className="text-amber-500 shrink-0 mt-0.5">·</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Task ideas */}
      {displayTasks.length > 0 && (
        <div>
          <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1.5">
            💡 Idées de tâches
          </p>
          <div className="flex flex-wrap gap-1.5">
            {displayTasks.map((t, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-xl text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-100"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({
  token,
  projects,
  constraints,
  whatIfOverrides,
  setWhatIfOverrides,
  whatIfWeights,
  confidenceScore,
  onSimulationUpdate,
}) => {
  const [apiRows, setApiRows] = useState<WhatIfApiRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState<keyof WhatIfOverrides | null>(null)

  // Active scenario keys
  const activeKeys = useMemo(
    () =>
      Object.keys(whatIfOverrides).filter(
        (k) => (whatIfOverrides as Record<string, boolean | undefined>)[k]
      ),
    [whatIfOverrides]
  )

  const sig = activeKeys.sort().join(",")

  // ── Fetch simulation with 480ms debounce ──────────────────────────────────
  useEffect(() => {
    if (activeKeys.length === 0 || !token || projects.length === 0) {
      setApiRows(null)
      onSimulationUpdate?.(null)
      setLoading(false)
      setError(null)
      return
    }

    const ac = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/api/wizard/what-if-simulate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projects: projects.map((p) => JSON.parse(JSON.stringify(p))),
            constraints: {
              budget: constraints.budget ?? "",
              mainObjective: constraints.mainObjective ?? "",
              teamSize: constraints.teamSize ?? "",
              deadline: constraints.deadline ?? "",
            },
            what_if_overrides: {
              resourceLimit: !!whatIfOverrides.resourceLimit,
              mvpSpeed: !!whatIfOverrides.mvpSpeed,
              b2b: !!whatIfOverrides.b2b,
              junior: !!whatIfOverrides.junior,
            },
            what_if_weights: { ...whatIfWeights },
          }),
          signal: ac.signal,
        })
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText))
        const data = await res.json()
        if (data.rows && Array.isArray(data.rows)) {
          setApiRows(data.rows)
          onSimulationUpdate?.(data.rows)
        } else {
          setApiRows([])
          onSimulationUpdate?.([])
        }
      } catch (e: unknown) {
        if ((e as Error).name === "AbortError") return
        setError(e instanceof Error ? e.message : "Erreur réseau")
        setApiRows(null)
        onSimulationUpdate?.(null)
      } finally {
        setLoading(false)
      }
    }, 480)

    return () => {
      ac.abort()
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, token, projects.length])

  const resetAll = () => {
    setWhatIfOverrides({})
    setExpandedId(null)
    setApiRows(null)
    setError(null)
  }

  const toggleChip = (key: keyof WhatIfOverrides) => {
    setWhatIfOverrides((prev) => ({ ...prev, [key]: !prev[key] }))
    setExpandedId(null)
  }

  return (
    <div className="mt-8 rounded-3xl border border-black/10 bg-gradient-to-br from-blue-500/15 via-white/50 to-rose-500/15 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.04)] relative overflow-hidden">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-black/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              <Target size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Simulateur What-If
                {loading && (
                  <RefreshCw size={12} className="text-[#00BCD4] animate-spin" />
                )}
                {!loading && activeKeys.length > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00BCD4] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00BCD4]" />
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Activez des scénarios · Impact simulé en temps réel
              </p>
            </div>
          </div>

          {activeKeys.length > 0 && (
            <button
              onClick={resetAll}
              className="text-[10px] font-black text-rose-500 border border-rose-200 rounded-full px-3 py-1.5 hover:bg-rose-50 transition-colors"
            >
              ✕ RESET ({activeKeys.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Chips ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CHIPS.map((chip, chipIdx) => {
            const active = !!whatIfOverrides[chip.key]
            // Chips at index 2+ are on the right side of the grid — open tooltip to the left
            const tooltipAlign = chipIdx >= 2 ? "right-0" : "left-0"
            return (
              <div key={chip.key} className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleChip(chip.key)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleChip(chip.key)}
                  className={`w-full h-full flex flex-col justify-between items-start gap-1.5 px-3.5 py-3 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                    active
                      ? `${chip.activeBorder} ${chip.activeBg} ${chip.activeText} ${chip.activeGlow} scale-[1.02]`
                      : "border-slate-200 bg-white/60 text-slate-500 hover:border-slate-300 hover:bg-white/80 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">{chip.emoji}</span>
                    <div className="flex items-center gap-1">
                      {active && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-1.5 h-1.5 rounded-full ${chip.dotColor} animate-pulse`}
                        />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowTooltip(showTooltip === chip.key ? null : chip.key)
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <Info size={11} />
                      </button>
                    </div>
                  </div>
                  <span className="text-[11px] font-black leading-tight">{chip.label}</span>
                </div>

                {/* Tooltip — positioned left or right based on chip column */}
                <AnimatePresence>
                  {showTooltip === chip.key && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowTooltip(null)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute z-50 ${tooltipAlign} top-full mt-2 w-60 p-3 rounded-xl bg-slate-900 text-white text-[11px] font-medium leading-relaxed shadow-2xl`}
                      >
                        {chip.tooltipBody}
                        <div
                          className={`absolute -top-1.5 w-3 h-3 bg-slate-900 rotate-45 ${
                            chipIdx >= 2 ? "right-4" : "left-4"
                          }`}
                        />
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {activeKeys.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="overflow-hidden rounded-b-3xl"
          >
            <div className="px-6 pb-6 space-y-3">
              {/* Loading */}
              {loading && !apiRows && (
                <div className="flex items-center justify-center gap-2 py-8 text-[12px] font-black text-slate-400 uppercase tracking-widest">
                  <RefreshCw size={14} className="animate-spin text-[#00BCD4]" />
                  Système en cours d'analyse…
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="py-3 px-4 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-bold text-rose-600">
                  ⚠️ {error}
                </div>
              )}

              {/* Rows */}
              {!loading && apiRows && apiRows.map((row, idx) => {
                const isExpanded = expandedId === row.project_id
                const baseScore = confidenceScore ?? row.baseline.success
                const simulatedSuccess = confidenceScore ? Math.min(100, Math.max(0, confidenceScore + row.delta)) : row.simulated.success
                const delta = row.delta

                return (
                  <motion.div
                    key={row.project_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className={`rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                      row.is_top
                        ? "border-[#00BCD4] bg-gradient-to-br from-cyan-50/70 to-white shadow-[0_4px_20px_rgba(0,188,212,0.15)]"
                        : "border-slate-100 bg-white/60 hover:border-slate-200"
                    }`}
                  >
                    {/* Row click header */}
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      onClick={() => setExpandedId(isExpanded ? null : row.project_id)}
                    >
                      {/* Status dots */}
                      <div className="flex items-center gap-1 shrink-0">
                        <ScoreDot score={row.simulated.feasib} />
                        <ScoreDot score={row.simulated.fast} />
                        <ScoreDot score={row.simulated.roi} />
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                            {row.project_title}
                          </p>
                          {row.is_top && (
                            <span className="shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#00BCD4] text-white uppercase tracking-widest">
                              TOP
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-bold ${row.complexity === "LOW" ? "text-emerald-500" : row.complexity === "MEDIUM" ? "text-amber-500" : "text-rose-500"}`}>
                          {row.complexity}
                        </p>
                      </div>

                      {/* Score */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            {delta !== 0 && (
                              <span className="text-slate-400 line-through font-mono text-[11px]">{baseScore}%</span>
                            )}
                            <span className="text-[14px] font-black font-mono text-cyan-600">
                              {simulatedSuccess}%
                            </span>
                            {delta !== 0 && (
                              <span className={`text-[9px] px-1 py-0.5 rounded-md border shadow-sm ${
                                delta > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700"
                              }`}>
                                {delta > 0 ? "+" : ""}{delta}%
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold text-right uppercase tracking-wider">
                            Score Stratégique
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        )}
                      </div>
                    </button>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden border-t border-slate-100"
                        >
                          <div className="px-4 pb-4 pt-3 space-y-2.5">
                            {/* Metric bars */}
                            {METRICS.map((m) => (
                              <MetricBar
                                key={m.key}
                                icon={m.icon}
                                label={m.label}
                                color={m.color}
                                baseline={(row.baseline as Record<string, number>)[m.key]}
                                simulated={(row.simulated as Record<string, number>)[m.key]}
                              />
                            ))}

                            {/* AI Insight */}
                            <AIInsightPanel row={row} confidenceScore={confidenceScore} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default WhatIfSimulator
