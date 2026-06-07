import os
import re

filepath = r"c:\Users\yassi\OneDrive\Desktop\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend\components\projects\CreateProjectWizard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the new article mapping and dialog
new_ui_block = """                      {articles.map((article, i) => {
                        const isSelected = selectedArticle?.id === article.id;
                        return (
                          <motion.div
                            key={article.id}
                            initial={{ opacity: 0, scale: 0.95 }} 
                            animate={{ opacity: 1, scale: 1 }} 
                            transition={{ delay: i * 0.1 }}
                            className={`w-full bg-white rounded-[32px] overflow-hidden transition-all duration-300 relative group flex flex-col shadow-sm border ${isSelected ? "ring-2 ring-[#00BCD4] border-transparent shadow-xl" : "border-slate-100 hover:shadow-lg hover:border-slate-200"}`}
                          >
                            {/* Card Media Header */}
                            <div className="relative h-44 overflow-hidden">
                              <img src={article.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80"} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-3 left-3 flex gap-2">
                                <Badge className="bg-white/90 backdrop-blur-md text-slate-800 border-none px-3 font-black text-[9px] uppercase tracking-wider">{article.type}</Badge>
                                {i === 0 && <Badge className="bg-[#FFEB3B] text-slate-900 border-none px-3 font-black text-[9px] uppercase tracking-wider">NOUVEAU</Badge>}
                              </div>
                              {/* Selection overlay */}
                              <div 
                                onClick={() => setSelectedArticle(article)}
                                className={`absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-20"}`}
                              >
                                {isSelected && <Check size={48} className="text-white" />}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col">
                              <p className="text-[10px] font-black text-[#00BCD4] uppercase tracking-[0.15em] mb-2">{article.category}</p>
                              <h3 className="text-base font-black text-[#111827] line-clamp-2 leading-tight mb-2 group-hover:text-[#00BCD4] transition-colors">
                                {article.title}
                              </h3>
                              <p className="text-xs font-medium text-slate-500 line-clamp-3 leading-relaxed mb-4">
                                {article.snippet}
                              </p>
                              
                              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[#00BCD4]">
                                  <Zap size={14} fill="currentColor" />
                                  <span className="text-[10px] font-black uppercase tracking-wider">PRIORITÉ</span>
                                </div>
                                <button 
                                  onClick={() => setDetailArticle(article)}
                                  className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-1.5"
                                >
                                  VOIR DÉTAILS <span className="text-xs">↗</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Dialog open={!!detailArticle} onOpenChange={(open) => !open && setDetailArticle(null)}>
                  <DialogContent className="max-w-[720px] p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-3xl">
                    {detailArticle && (
                      <div className="flex flex-col">
                        {/* Modal Header Media */}
                        <div className="relative h-64 sm:h-80 overflow-hidden">
                          <img src={detailArticle.image} alt={detailArticle.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          <div className="absolute bottom-6 left-8 right-8">
                            <div className="flex gap-2 mb-3">
                              <Badge className="bg-[#00BCD4] text-white border-none px-4 py-1 text-[10px] font-black tracking-widest uppercase">{detailArticle.category}</Badge>
                              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 border px-4 py-1 text-[10px] font-black tracking-widest uppercase">{detailArticle.type}</Badge>
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{detailArticle.title}</h2>
                          </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 flex flex-col sm:flex-row gap-8">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4 text-slate-400">
                               <div className="flex items-center gap-1.5 font-bold text-xs">
                                 <RefreshCw size={14} /> PUBLIÉ LE {detailArticle.date.toUpperCase()}
                               </div>
                            </div>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed text-justify">
                              {detailArticle.snippet}
                            </p>
                            
                            <div className="flex gap-4 pt-4">
                              <a 
                                href={detailArticle.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="bg-[#111827] hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg hover:shadow-xl shadow-black/10"
                              >
                                <ExternalLink size={16} /> CONSULTER LA SOURCE
                              </a>
                              <div className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest">
                                <Zap size={16} className="text-[#00BCD4]" /> PRIORITÉ
                              </div>
                            </div>
                          </div>

                          {/* Action Sidebar */}
                          <div className="w-full sm:w-[240px] space-y-4">
                            <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 border-b pb-3 border-slate-100">
                              <Sparkles size={14} className="text-[#00BCD4]" /> APPLIQUER AU PROJET
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">Ajoutez cette technologie comme tâche d'exploration dans l'un de vos projets actifs.</p>
                            
                            <div className="space-y-2">
                               {["3d", "SMA"].map(tech => (
                                  <div key={tech} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50">
                                    <div className="flex flex-col">
                                      <span className="text-[11px] font-black text-slate-700">{tech}</span>
                                      <span className="text-[8px] font-black text-slate-400 uppercase">ON_TRACK</span>
                                    </div>
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                                  </div>
                               ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>"""

# Using regex to replace the old articles mapping and the dialog modal
# Looking for the marker of the map start
pattern = r'\{articles\.map\(.*?</Dialog>'
content = re.sub(pattern, new_ui_block, content, flags=re.DOTALL)

# Also update the article interface to include 'image'
content = content.replace("category: string", "category: string\\n  image: string")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content.replace("\\\\n", "\\n"))

print("SUCCESS: Frontend Redesign applied.")
