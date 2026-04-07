import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, Check, Play, FileText, ExternalLink, Sparkles, Clock } from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/lib/store";
import { TechArticle } from "./TechCard";

interface TechDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: TechArticle | null;
  onSuccess: () => void;
}

const TechDetailModal: React.FC<TechDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  article,
  onSuccess
}) => {
  const { token } = useAuthStore();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [confirmingProjectId, setConfirmingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchProjects();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (!isOpen) {
      setConfirmingProjectId(null);
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:8000/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyToProject = async (projectId: string) => {
    if (!article) return;
    setIsApplying(true);
    try {
      await axios.post("http://localhost:8000/api/tasks", {
        title: `Explorer la technologie : ${article.title}`,
        description: `Il a été décidé d'étudier ou d'intégrer cette technologie.\n\nDescription: ${article.description}\nLien: ${article.link}`,
        project_id: projectId,
        priority: "MEDIUM",
        status: "TODO"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to apply to project", error);
    } finally {
      setIsApplying(false);
    }
  };

  const getYoutubeId = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    } catch {
      return null;
    }
  };

  if (!article) return null;

  const videoId = article.type === "VIDEO" ? getYoutubeId(article.link) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100]"
            onClick={onClose}
          />
          <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-[101] p-4 md:p-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white pointer-events-auto rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
            >
              {/* Header with Background/Media */}
              <div className="relative h-64 md:h-80 bg-slate-900 overflow-hidden shrink-0">
                {videoId ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : article.image ? (
                  <img src={article.image} alt={article.title} className="w-full h-full object-cover opacity-80" />
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white/20">
                      {article.type === "VIDEO" ? <Play size={80} fill="currentColor" opacity={0.1} /> : <FileText size={80} opacity={0.1} />}
                   </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute top-6 right-6">
                  <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-xl"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="absolute bottom-6 left-6 right-6">
                   <div className="flex items-center gap-2 mb-2">
                     <span className="bg-[#00BCD4] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-[#00BCD4]/40">
                       {article.category}
                     </span>
                     <span className="bg-white/10 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-white/20">
                       {article.type}
                     </span>
                   </div>
                   <h2 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-lg">
                     {article.title}
                   </h2>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 flex flex-col md:flex-row gap-8">
                {/* Left Side: Info */}
                <div className="flex-1 space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 mb-4">
                       <Clock size={16} />
                       <span className="text-xs font-bold uppercase tracking-wider">
                         Publié le {new Date(article.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                       </span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed text-lg">
                      {article.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-4">
                    <a 
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                    >
                      <ExternalLink size={16} />
                      Consulter la source
                    </a>
                    
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-widest border border-slate-100">
                      <Sparkles size={16} className="text-[#00BCD4]" />
                      {article.priority}
                    </div>
                  </div>
                </div>

                {/* Right Side: Project Selection */}
                <div className="w-full md:w-80 shrink-0 border-l border-slate-100 md:pl-8 space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                     <Layers size={18} className="text-[#00BCD4]" />
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Appliquer au projet</h3>
                   </div>
                   <p className="text-xs font-bold text-slate-400 mb-4 leading-tight">
                     Ajoutez cette technologie comme tâche d'exploration dans l'un de vos projets actifs.
                   </p>

                   <div className="space-y-2">
                     {isLoading ? (
                       <div className="space-y-2">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="h-14 bg-slate-50 rounded-2xl animate-pulse border border-slate-100" />
                         ))}
                       </div>
                     ) : projects.length === 0 ? (
                       <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                         <p className="text-xs font-bold text-slate-400 italic">Aucun projet trouvé</p>
                       </div>
                     ) : (
                       projects.map(project => (
                        <div key={project.id} className="relative overflow-hidden group">
                           <button 
                             onClick={() => setConfirmingProjectId(project.id)}
                             disabled={isApplying || (confirmingProjectId === project.id)}
                             className={`w-full p-4 rounded-2xl border transition-all text-left relative overflow-hidden ${
                               confirmingProjectId === project.id 
                               ? 'border-[#00BCD4] bg-[#00BCD4]/5 ring-2 ring-[#00BCD4]/20' 
                               : 'border-slate-100 hover:border-[#00BCD4] hover:bg-[#00BCD4]/5'
                             } ${isApplying ? 'opacity-50 pointer-events-none' : ''}`}
                           >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-slate-700 group-hover:text-[#00BCD4] text-xs truncate transition-colors">{project.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{project.status}</p>
                                </div>
                                <div className={`w-6 h-6 rounded-lg border transition-all transform group-hover:rotate-12 flex items-center justify-center ${
                                  confirmingProjectId === project.id 
                                  ? 'bg-[#00BCD4] text-white border-[#00BCD4]' 
                                  : 'bg-slate-50 border-slate-100 text-transparent group-hover:bg-[#00BCD4] group-hover:text-white'
                                }`}>
                                  <Check size={12} />
                                </div>
                              </div>
                           </button>

                           <AnimatePresence>
                             {confirmingProjectId === project.id && (
                               <motion.div 
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: 10 }}
                                 className="absolute inset-0 bg-[#00BCD4] z-10 flex items-center justify-between px-4"
                               >
                                 <span className="text-[10px] font-bold text-white uppercase tracking-widest italic">Confirmer l'ajout ?</span>
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => setConfirmingProjectId(null)}
                                     className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
                                   >
                                     <X size={14} />
                                   </button>
                                   <button 
                                     onClick={() => applyToProject(project.id)}
                                     className="px-3 py-1.5 rounded-lg bg-white text-[#00BCD4] font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-50 active:scale-95 transition-all"
                                   >
                                     OUI
                                   </button>
                                 </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TechDetailModal;
