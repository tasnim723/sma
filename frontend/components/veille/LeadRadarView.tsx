import { API_BASE_URL } from "@/lib/api"
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { 
  Zap, Cpu, Globe, Database, Share2, Palette, 
  ExternalLink, BookOpen, Laptop, Monitor, Layout, 
  Box, Terminal, PenTool, GitBranch, TerminalSquare,
  Sparkles, History, X, ArrowRight, Clock, Info
} from "lucide-react";
import { useAuthStore } from "@/lib/store";

interface RadarStat {
  title: string;
  count: number;
  icon: React.ReactNode;
  bgColor: string;
  categoryKey: string;
}

const INITIAL_RADAR_ITEMS: RadarStat[] = [
  { 
    title: "IA Générative (LLMs)", 
    count: 0, 
    icon: <Cpu className="text-cyan-500" size={18} />, 
    bgColor: "bg-cyan-50",
    categoryKey: "IA Générative (LLMs)"
  },
  { 
    title: "Serverless Functions", 
    count: 0, 
    icon: <Globe className="text-red-500" size={18} />, 
    bgColor: "bg-red-50",
    categoryKey: "Serverless Functions"
  },
  { 
    title: "Vector Databases", 
    count: 0, 
    icon: <Database className="text-amber-500" size={18} />, 
    bgColor: "bg-amber-50",
    categoryKey: "Vector Databases"
  },
  { 
    title: "GraphQL & Apollo", 
    count: 0, 
    icon: <Zap className="text-indigo-500" size={18} />, 
    bgColor: "bg-indigo-50",
    categoryKey: "GraphQL & Apollo"
  },
  { 
    title: "Tailwind CSS v4", 
    count: 0, 
    icon: <Palette className="text-emerald-500" size={18} />, 
    bgColor: "bg-emerald-50",
    categoryKey: "Tailwind CSS v4"
  },
];

const TOOL_ITEMS = [
  { id: 1, name: "Cursor (AI Editor)", category: "Développement", link: "https://cursor.sh" },
  { id: 2, name: "Supabase", category: "Backend SaaS", link: "https://supabase.com" },
  { id: 3, name: "Raycast", category: "Productivité", link: "https://raycast.com" },
  { id: 4, name: "Vercel / Next.js", category: "Déploiement", link: "https://nextjs.org" },
  { id: 5, name: "Docker Desktop", category: "Containerisation", link: "https://docker.com" },
  { id: 6, name: "Postman", category: "Tests API", link: "https://postman.com" },
  { id: 7, name: "Figma Desktop", category: "Design", link: "https://figma.com" },
  { id: 8, name: "GitKraken", category: "Versionning", link: "https://gitkraken.com" },
];

const LeadRadarView: React.FC = () => {
  const { token } = useAuthStore();
  const [radarItems, setRadarItems] = useState<RadarStat[]>(INITIAL_RADAR_ITEMS);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicArticles, setTopicArticles] = useState<any[]>([]);
  const [isFetchingArticles, setIsFetchingArticles] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tech/radar-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const stats = response.data;
      
      setRadarItems(prev => prev.map(item => ({
        ...item,
        count: stats[item.categoryKey] || 0
      })));
    } catch (error) {
      console.error("Failed to fetch radar stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exploreTopic = async (topic: string) => {
    setSelectedTopic(topic);
    setIsFetchingArticles(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tech?category=${encodeURIComponent(topic)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTopicArticles(response.data);
    } catch (error) {
      console.error("Failed to fetch topic articles", error);
    } finally {
      setIsFetchingArticles(false);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 pb-12">
        {/* Radar Section */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 flex items-center justify-center text-[#00BCD4]">
                <Zap size={22} fill="currentColor" />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Radar Technologique</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100/50">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Actualisé par IA</span>
            </div>
          </div>

          <div className="space-y-4">
            {radarItems.map((item, index) => (
              <motion.div
                key={item.categoryKey}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 8 }}
                onClick={() => exploreTopic(item.categoryKey)}
                className={`group flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm border transition-all cursor-pointer rounded-2xl ${
                  selectedTopic === item.categoryKey 
                  ? 'border-cyan-400 bg-cyan-50/50 ring-2 ring-cyan-100 shadow-xl shadow-cyan-500/10' 
                  : 'border-slate-100 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/5'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.bgColor} flex items-center justify-center shadow-inner transition-transform group-hover:scale-110`}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-700 text-sm group-hover:text-cyan-600 transition-colors uppercase tracking-tight">{item.title}</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                      {isLoading ? "..." : item.count} ressource(s) d'apprentissage
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                   selectedTopic === item.categoryKey 
                   ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/40' 
                   : 'bg-white border-slate-50 text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-100 group-hover:scale-110'
                }`}>
                  <BookOpen size={18} />
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tools Section */}
        <section>
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                <Laptop size={22} />
              </div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Outils Dev & Productivité</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-100/50">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Curé par IA</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {TOOL_ITEMS.map((tool, index) => (
              <motion.a
                key={tool.id}
                href={tool.link}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01, x: 5 }}
                className="group flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm border border-slate-100 rounded-2xl hover:border-red-200 hover:shadow-xl hover:shadow-red-500/5 transition-all"
              >
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-red-400/20 group-hover:bg-red-400 transition-colors" />
                   <div>
                     <h4 className="font-black text-slate-700 text-sm group-hover:text-red-600 transition-colors flex items-center gap-1.5 uppercase tracking-tight">
                       {tool.name}
                       <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-all" />
                     </h4>
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{tool.category}</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-50 flex items-center justify-center text-slate-200 group-hover:text-red-400 group-hover:border-red-100 transition-all group-hover:scale-110">
                  <ExternalLink size={18} />
                </div>
              </motion.a>
            ))}
          </div>
        </section>
      </div>

      {/* MODAL - Information impossible à rater */}
      <AnimatePresence>
        {selectedTopic && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTopic(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[150]"
            />
            
            {/* Modal Container */}
            <div className="fixed inset-0 flex items-center justify-center z-[151] p-4 md:p-8 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white pointer-events-auto w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20"
              >
                {/* Modal Header */}
                <div className="bg-[#00BCD4] p-8 md:p-10 text-white relative">
                   <button 
                     onClick={() => setSelectedTopic(null)}
                     className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center text-white"
                   >
                     <X size={20} />
                   </button>
                   
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
                        <BookOpen size={30} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Ressources & Tendances</span>
                        <h3 className="text-3xl md:text-4xl font-black tracking-tight">{selectedTopic}</h3>
                      </div>
                   </div>
                   
                   <div className="flex flex-wrap gap-3">
                      <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/10">Detection IA</span>
                      <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider backdrop-blur-md border border-white/10">Nouveautés Mars 2026</span>
                   </div>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 bg-slate-50/50">
                  {isFetchingArticles ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-44 bg-white border border-slate-100 rounded-3xl animate-pulse" />
                      ))}
                    </div>
                  ) : topicArticles.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center">
                       <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
                          <Info size={40} />
                       </div>
                       <h4 className="text-xl font-black text-slate-800 mb-2 tracking-tight">Aucun contenu trouvé</h4>
                       <p className="text-slate-400 font-bold max-w-xs mx-auto text-sm">Le scraper IA n'a pas encore indexé de ressources pour ce sujet précis aujourd'hui.</p>
                       <button 
                         onClick={fetchStats}
                         className="mt-8 px-8 py-3 bg-[#00BCD4] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-[#00BCD4]/30 hover:scale-105 active:scale-95 transition-all"
                       >
                         Actualiser le radar
                       </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {topicArticles.map((article: any, idx: number) => (
                        <motion.a
                          key={article.id}
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          whileHover={{ y: -5, scale: 1.02 }}
                          className="group p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col h-full"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-[#00BCD4] bg-[#00BCD4]/5 px-4 py-1.5 rounded-full uppercase tracking-widest border border-[#00BCD4]/10">
                              {article.type}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#00BCD4] group-hover:text-white transition-all">
                               <ArrowRight size={14} />
                            </div>
                          </div>
                          <h4 className="font-black text-slate-800 text-base mb-3 line-clamp-2 leading-tight group-hover:text-[#00BCD4] transition-colors">
                            {article.title}
                          </h4>
                          <p className="text-xs text-slate-400 font-bold line-clamp-3 mb-6 flex-1 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center gap-2 pt-4 border-t border-slate-50 text-[10px] font-black text-[#00BCD4] uppercase tracking-widest italic group-hover:translate-x-2 transition-transform">
                             Consulter la ressource <ArrowRight size={10} />
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeadRadarView;
