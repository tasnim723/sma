"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Zap, Search, CheckCircle2 } from 'lucide-react';

const stages = [
  { id: 'ideation', label: 'Idéation', icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50', count: 12 },
  { id: 'validation', label: 'Validation', icon: Search, color: 'text-sky-500', bg: 'bg-sky-50', count: 5 },
  { id: 'prototyping', label: 'Prototypage', icon: Zap, color: 'text-rose-500', bg: 'bg-rose-50', count: 3 },
  { id: 'implementation', label: 'Déploiement', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', count: 2 },
];

const InnovationFunnel: React.FC = () => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
      {stages.map((stage, idx) => (
        <motion.div 
          key={stage.id}
          whileHover={{ y: -5 }}
          className="relative flex flex-col items-center p-4 rounded-[2rem] bg-white border border-slate-100 shadow-sm"
        >
          <div className={`p-3 rounded-2xl ${stage.bg} ${stage.color} mb-3`}>
            <stage.icon size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{stage.label}</span>
          <span className="text-xl font-black text-slate-800">{stage.count}</span>
          
          {idx < stages.length - 1 && (
            <div className="hidden sm:block absolute top-1/2 -right-4 translate-y-[-50%] z-10">
              <div className="w-8 h-[2px] bg-gradient-to-r from-slate-200 to-transparent" />
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

export default InnovationFunnel;
