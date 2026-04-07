import React from "react";
import { ArrowUpRight, Play, FileText, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export interface TechArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string; // "VIDEO" | "ARTICLE"
  priority: string; // "Haute priorité" | "Priorité" | "Vanguard"
  image?: string;
  link: string;
  created_at: string;
}

interface TechCardProps {
  article: TechArticle;
  onApply: (article: TechArticle) => void;
}

const TechCard: React.FC<TechCardProps> = ({ article, onApply }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Haute priorité":
        return "text-[#00BCD4]";
      case "Vanguard":
        return "text-[#00BCD4]";
      case "Priorité":
        return "text-[#00BCD4]";
      default:
        return "text-slate-400";
    }
  };

  const isNew = () => {
    try {
      const createdDate = new Date(article.created_at);
      const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 3;
    } catch {
      return false;
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: "0 20px 40px -15px rgba(0,0,0,0.05)" }}
      onClick={() => onApply(article)}
      className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col h-full relative group transition-all duration-300 cursor-pointer"
    >
      {/* Media Box */}
      <div className="h-48 bg-slate-200/50 relative overflow-hidden flex items-center justify-center">
        {article.image ? (
          <img src={article.image} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-16 h-10 bg-black/20 rounded-xl flex items-center justify-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80"></div>
          </div>
        )}
        
        {/* Type Badge */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm text-slate-800">
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{article.type}</span>
          </div>
          {isNew() && (
            <div className="bg-[#FFD700] px-3 py-1.5 rounded-lg flex items-center shadow-md animate-pulse">
              <span className="text-[9px] font-black uppercase tracking-widest leading-none text-black">NOUVEAU</span>
            </div>
          )}
        </div>

        {/* Visual feedback icon for interaction */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
          <div className="w-12 h-12 bg-white/30 backdrop-blur-md border border-white/40 rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform duration-300 shadow-xl">
             {article.type === "VIDEO" ? (
               <Play size={20} fill="white" className="text-white ml-1" />
             ) : (
               <FileText size={20} className="text-white" />
             )}
          </div>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#00BCD4] mb-2 block truncate">
          {article.category}
        </span>
        <h3 className="text-xl font-black text-slate-800 leading-tight mb-3 line-clamp-2 group-hover:text-[#00BCD4] transition-colors">
          {article.title}
        </h3>
        <p className="text-sm font-semibold text-slate-400 leading-relaxed mb-6 line-clamp-3">
          {article.description}
        </p>
        
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${getPriorityColor(article.priority)}`}>
            <Sparkles size={12} />
            {article.priority}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">VOIR DÉTAILS</div>
            <ArrowUpRight size={14} className="text-slate-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TechCard;
