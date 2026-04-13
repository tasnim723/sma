import React from "react";
import { TrendingUp } from "lucide-react";

interface InnovationScoreProps {
  score: number;
}

const InnovationScore: React.FC<InnovationScoreProps> = ({ score }) => {
  return (
    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-md px-6 py-2 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Score</span>
        <span className="text-[10px] uppercase tracking-widest font-black text-slate-400 leading-none">Innovation</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-black text-[#00BCD4]">{score}%</span>
        <div className="h-10 w-10 rounded-full bg-[#00BCD4]/10 border border-[#00BCD4]/20 flex items-center justify-center">
          <TrendingUp size={18} className="text-[#00BCD4]" />
        </div>
      </div>
    </div>
  );
};

export default InnovationScore;
