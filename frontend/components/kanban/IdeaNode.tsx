"use client"

import React, { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { motion } from 'framer-motion'
import { Zap, Target, Rocket, Lightbulb } from 'lucide-react'

const IdeaNode = ({ data }: any) => {
  const { title, status, votes, audacity_score } = data
  const voteCount = votes?.length || 0
  
  // Scale based on votes (Spark effect)
  const scale = 1 + Math.min(voteCount * 0.05, 0.4)
  const glow = voteCount > 5 ? 'shadow-[0_0_20px_rgba(244,63,94,0.4)]' : ''

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'SPARK':
        return { icon: <Lightbulb size={14} />, color: 'bg-amber-400', label: 'Étincelle' }
      case 'VALIDATION':
        return { icon: <Target size={14} />, color: 'bg-sky-400', label: 'Validation' }
      case 'INCUBATION':
        return { icon: <Rocket size={14} />, color: 'bg-emerald-400', label: 'Incubation' }
      default:
        return { icon: <Zap size={14} />, color: 'bg-slate-400', label: status }
    }
  }

  const config = getStatusConfig(status)

  return (
    <motion.div
      style={{ scale }}
      className={`px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60 shadow-lg min-w-[180px] ${glow} transition-all`}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-slate-300" />
      
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className={`px-2 py-0.5 rounded-full ${config.color} text-white flex items-center gap-1 text-[10px] font-black uppercase tracking-wider`}>
            {config.icon}
            {config.label}
          </div>
          {audacity_score > 70 && (
             <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-1.5 rounded-md border border-rose-100 italic">
               Disruptif
             </div>
          )}
        </div>
        
        <h3 className="text-sm font-bold text-slate-800 leading-tight">{title}</h3>
        
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
           <div className="flex items-center gap-1">
             <Zap size={12} className={voteCount > 0 ? "text-rose-500 fill-rose-500" : "text-slate-300"} />
             <span className="text-[11px] font-bold text-slate-500">{voteCount} Étincelles</span>
           </div>
           
           <div className="flex -space-x-2">
             <div className="w-5 h-5 rounded-full border border-white bg-slate-200" />
           </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-slate-300" />
    </motion.div>
  )
}

export default memo(IdeaNode)
