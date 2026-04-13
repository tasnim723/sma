"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, ChevronDown } from "lucide-react"
import axios from "axios"
import { useAuthStore } from "@/lib/store"

interface LeaderboardUser {
    id: string
    full_name: string
    level: number
    xp: number
    weekly_xp: number
    role: string
    is_me: boolean
}

export default function LeaderboardWidget() {
    const [users, setUsers] = useState<LeaderboardUser[]>([])
    const [loading, setLoading] = useState(true)
    const { token } = useAuthStore()

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await axios.get("http://localhost:8000/api/members/leaderboard", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setUsers(res.data)
            } catch (err) {
                console.error("Failed to fetch leaderboard", err)
            } finally {
                setLoading(false)
            }
        }
        if (token) fetchLeaderboard()
    }, [token])

    if (loading) {
        return (
            <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white h-full animate-pulse shadow-xl shadow-slate-200/50">
                <div className="h-4 w-24 bg-slate-200 mx-auto mb-6 rounded-full" />
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100/50 rounded-2xl" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-full pt-2">
            {/* Decorative Ribbon Header - Super Compact */}
            <div className="absolute -top-1 right-6 z-20 scale-75">
                <div className="bg-[#8DA3A6] w-7 h-11 rounded-t-sm clip-ribbon shadow-sm flex items-center justify-center pt-1">
                    <ChevronDown size={11} className="text-white opacity-60" />
                </div>
            </div>
            
            <div className="absolute top-1 left-4 z-20 scale-75">
                <div className="bg-[#8DA3A6] w-6 h-6 clip-flag shadow-sm" />
            </div>

            {/* Main Widget Container */}
            <div className="bg-[#F1F5F9]/90 backdrop-blur-3xl rounded-[2rem] p-4 pt-8 border border-white shadow-xl shadow-slate-200/40 h-full flex flex-col relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
                
                <div className="text-center mb-4 relative z-10">
                    <h3 className="text-[10px] font-black tracking-[0.2em] text-[#334155] uppercase leading-tight flex flex-col items-center">
                        Classement
                        <span className="text-[11px] mt-0.5">Hebdomadaire</span>
                    </h3>
                    
                    {/* Integrated Badges Row */}
                    <div className="flex items-center justify-center gap-2 mt-4 pb-2 border-b border-white/50">
                        {[
                            { color: "bg-rose-200",   shadow: "shadow-rose-200",   icon: "🚀", label: "Starter" },
                            { color: "bg-orange-200", shadow: "shadow-orange-200", icon: "🔥", label: "Machine" },
                            { color: "bg-sky-200",    shadow: "shadow-sky-200",    icon: "🛡️", label: "Architect" },
                            { color: "bg-amber-200",  shadow: "shadow-amber-200",  icon: "🏆", label: "MVP" }
                        ].map((b, i) => (
                            <div key={i} className="relative group/badge">
                                <div className={`w-10 h-10 rounded-xl ${b.color} ${b.shadow} shadow-md flex items-center justify-center text-[18px] border border-white/60 cursor-pointer transition-transform hover:scale-110 hover:-translate-y-1 duration-200`}>
                                    {b.icon}
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800/90 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none shadow-lg">
                                    {b.label}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/90" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-0.5 relative z-10 flex-1 overflow-y-auto custom-scrollbar">
                    <AnimatePresence>
                        {users.slice(0, 3).map((user, idx) => (
                            <motion.div 
                                key={user.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center gap-3 p-2.5 rounded-[1.25rem] relative transition-all duration-500
                                    ${idx === 0 ? "bg-white/80 shadow-sm border border-amber-200/40" : 
                                      idx === 1 ? "bg-white/60 shadow-sm border border-slate-200/40" : 
                                      idx === 2 ? "bg-white/40 shadow-sm border border-orange-200/40" : 
                                      "hover:bg-white/40"}
                                    ${user.is_me ? "ring-2 ring-[#00BCD4]/40 z-10" : ""}
                                `}
                            >
                                <div className="w-4 text-[11px] font-black text-slate-700">
                                    {idx + 1}.
                                </div>

                                <div className="relative">
                                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-sm
                                        ${idx === 0 ? "border-[#D4AF37]" : "border-white"}
                                    `}>
                                        <img 
                                            src={`https://ui-avatars.com/api/?name=${user.full_name}&background=random`} 
                                            className="w-full h-full object-cover" 
                                            alt={user.full_name} 
                                        />
                                    </div>
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white border border-slate-50 rounded-full flex items-center justify-center text-[7px] font-black text-slate-800 shadow-sm">
                                        {user.level}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-slate-800 truncate leading-none mb-0.5">
                                        {user.is_me ? "Vous" : user.full_name.split(' ')[0]}
                                    </p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">LVL {user.level}</p>
                                </div>

                                <div className="text-right shrink-0">
                                    <p className="text-[11px] font-black text-slate-800 tabular-nums">
                                        {user.weekly_xp} <span className="text-[8px] text-amber-500">XP</span>
                                    </p>
                                </div>

                                {user.is_me && (
                                    <div className="absolute left-0 top-1/4 bottom-1/4 w-0.5 bg-emerald-400 rounded-r-full" />
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <style jsx>{`
                .clip-ribbon {
                    clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
                }
                .clip-flag {
                    clip-path: polygon(0 0, 100% 0, 75% 50%, 100% 100%, 0 100%);
                }
            `}</style>
        </div>
    )
}
