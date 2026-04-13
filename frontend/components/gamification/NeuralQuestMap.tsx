"use client"

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check } from "lucide-react"

interface QuestMapProps {
    progress: number  // 0-100
    status: string
}

// 4 milestones positioned on a winding path (% of container)
const STAGES = [
    { id: "research", label: "Research", emoji: "📚", x: 14, y: 72 },
    { id: "dev",      label: "Dev",      emoji: "⚙️",  x: 48, y: 30 },
    { id: "build",    label: "Build",    emoji: "🛸",  x: 65, y: 65 },
    { id: "deploy",   label: "Deploy",   emoji: "🚀",  x: 85, y: 22 },
]

export default function NeuralQuestMap({ progress, status }: QuestMapProps) {
    const donCount = Math.floor(progress / 25)   // 0 → 4

    // Path accent color based on status
    const accent = status === 'AT_RISK' ? '#f59e0b' : status === 'DELAYED' ? '#f43f5e' : '#22d3ee'
    const xpColor = '#FFB800'

    // Build a smooth SVG polyline through the 4 nodes
    const pts = STAGES.map(s => `${s.x},${s.y}`).join(' ')

    return (
        <div className="relative w-full overflow-hidden rounded-2xl" style={{ minHeight: 140 }}>

            {/* ─── BACKGROUND: teal space gradient ─── */}
            <div className="absolute inset-0 rounded-2xl" style={{
                background: 'linear-gradient(160deg, #74c4d4 0%, #91d4e0 25%, #6bbfd8 55%, #5ab0cc 100%)'
            }} />

            {/* Subtle star dots */}
            <div className="absolute inset-0 opacity-30 rounded-2xl" style={{
                backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
                backgroundSize: '28px 28px'
            }} />

            {/* Atmospheric clouds / light blobs */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute" style={{ left: '5%', top: '55%', width: 90, height: 55, background: 'radial-gradient(ellipse, rgba(255,255,255,0.35) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div className="absolute" style={{ left: '35%', top: '15%', width: 80, height: 50, background: 'radial-gradient(ellipse, rgba(255,255,255,0.25) 0%, transparent 70%)', borderRadius: '50%' }} />
                <div className="absolute" style={{ left: '70%', top: '55%', width: 70, height: 45, background: 'radial-gradient(ellipse, rgba(255,255,255,0.30) 0%, transparent 70%)', borderRadius: '50%' }} />
            </div>

            {/* Circuit border corners */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M87,1 L99,1 L99,13" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8"/>
                <path d="M1,87 L1,99 L13,99" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8"/>
                <path d="M1,13 L1,1 L13,1" fill="none" stroke="rgba(255,215,0,0.6)" strokeWidth="0.6"/>
                <path d="M87,99 L99,99 L99,87" fill="none" stroke="rgba(255,215,0,0.5)" strokeWidth="0.6"/>
                <line x1="68" y1="1" x2="85" y2="1" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5"/>
                <circle cx="69.5" cy="1" r="0.9" fill="rgba(255,255,255,0.8)"/>
                <rect x="97.5" y="38" width="2" height="18" rx="1" fill="rgba(255,215,0,0.7)"/>
            </svg>

            {/* ─── SVG PATHS between nodes ─── */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1.5" result="blur"/>
                        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%"   stopColor="#c084fc" stopOpacity="0.9"/>
                        <stop offset="40%"  stopColor="#67e8f9" stopOpacity="0.9"/>
                        <stop offset="70%"  stopColor="#a78bfa" stopOpacity="0.7"/>
                        <stop offset="100%" stopColor={accent}  stopOpacity="0.8"/>
                    </linearGradient>
                </defs>

                {STAGES.map((stage, i) => {
                    if (i === 0) return null
                    const prev = STAGES[i - 1]
                    // Bezier control point — slight arc
                    const cpx = (prev.x + stage.x) / 2 + (i % 2 === 0 ? -8 : 8)
                    const cpy = (prev.y + stage.y) / 2 + (i % 2 === 0 ? -15 : 10)
                    const d = `M${prev.x},${prev.y} Q${cpx},${cpy} ${stage.x},${stage.y}`
                    const isLit  = donCount > i - 1
                    const isActive = donCount === i - 1 && progress > 0

                    return (
                        <g key={`path-${i}`}>
                            {/* dim base path */}
                            <path d={d} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
                            {/* lit/rainbow glow when completed */}
                            {isLit && (
                                <motion.path
                                    d={d} fill="none"
                                    stroke="url(#pathGrad)"
                                    strokeWidth="2.5" strokeLinecap="round"
                                    filter="url(#glow)"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.2, ease: "easeOut" }}
                                />
                            )}
                            {/* animated dashes for in-progress segment */}
                            {isActive && (
                                <motion.path
                                    d={d} fill="none"
                                    stroke={accent}
                                    strokeWidth="1.8" strokeLinecap="round"
                                    strokeDasharray="3 2"
                                    animate={{ strokeDashoffset: [0, -20] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                                    style={{ opacity: 0.7 }}
                                />
                            )}
                        </g>
                    )
                })}
            </svg>

            {/* ─── NODES ─── */}
            {STAGES.map((stage, i) => {
                const done   = donCount > i
                const active = donCount === i && progress > 0

                return (
                    <div key={stage.id}
                        className="absolute flex flex-col items-center"
                        style={{ left: `${stage.x}%`, top: `${stage.y}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        {/* Flag */}
                        <span className="text-[11px] -mb-0.5 drop-shadow-sm">
                            {done ? '🏳️' : i % 2 === 0 ? '🚩' : '🏴'}
                        </span>

                        {/* Node circle */}
                        <motion.div
                            animate={active ? {
                                boxShadow: [`0 0 8px ${accent}80`, `0 0 18px ${accent}cc`, `0 0 8px ${accent}80`],
                                scale: [1, 1.12, 1]
                            } : {}}
                            transition={{ duration: 1.6, repeat: Infinity }}
                            className="flex items-center justify-center rounded-full border-2 text-[14px] shadow-md"
                            style={{
                                width: 34, height: 34,
                                background: done   ? 'linear-gradient(135deg,#22c55e,#16a34a)' :
                                            active ? 'rgba(255,255,255,0.85)' :
                                                     'rgba(255,255,255,0.55)',
                                borderColor: done   ? '#22c55e' :
                                              active ? accent :
                                                       'rgba(255,255,255,0.6)',
                            }}
                        >
                            {done
                                ? <Check size={14} strokeWidth={3} className="text-white"/>
                                : <span>{stage.emoji}</span>
                            }
                        </motion.div>

                        <span className="text-[7.5px] font-black text-white mt-0.5 drop-shadow"
                              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                            {stage.label}
                        </span>
                    </div>
                )
            })}

            {/* ─── Floating XP reward ─── */}
            {donCount > 0 && donCount < 4 && (
                <motion.p
                    animate={{ y: [0, -6, 0], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute font-black right-4 bottom-4"
                    style={{
                        fontSize: 18,
                        color: xpColor,
                        textShadow: `0 0 12px ${xpColor}99, 0 0 6px ${xpColor}66`
                    }}
                >
                    +{progress * 10} XP
                </motion.p>
            )}

            {/* Scanning light sweep */}
            <motion.div
                animate={{ x: ['0%', '110%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{ width: 3, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.35), transparent)' }}
            />
        </div>
    )
}
