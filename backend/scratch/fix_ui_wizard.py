import os

filepath = r"c:\Users\yassi\OneDrive\Desktop\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend\components\projects\CreateProjectWizard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = """                {isFetchingTech ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <RefreshCw size={32} className="text-[#00BCD4] animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">Recherche des tendances pour votre projet...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar pr-2">
                    <div className="flex flex-col gap-4">
                      {articles.map((article, i) => {
                        const isSelected = selectedArticle?.id === article.id;
                        return (
                          <motion.div
                            key={article.id}
                            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                            onClick={() => setSelectedArticle(article)}
                            className={`w-full bg-white rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 relative group flex items-stretch ${isSelected ? "ring-[2px] ring-[#00BCD4] shadow-lg shadow-cyan-500/15 scale-[1.01]" : "shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5"}`}
                          >
                            <div className="w-2 bg-[#D32F2F] shrink-0 transition-transform group-hover:scale-x-150" />
                            
                            <div className="p-4 sm:p-5 flex items-center gap-4 flex-1">
                              <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${article.type === "VIDEO" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                                    {article.type}
                                  </span>
                                  <span className="text-[9px] font-black tracking-widest text-[#00BCD4] uppercase">{article.category}</span>
                                </div>
                                <h3 className="text-sm sm:text-base leading-tight font-black text-[#111827] mb-1 truncate">{article.title}</h3>
                                <p className="text-xs font-bold text-[#6B7280] leading-snug line-clamp-2 mb-2">{article.snippet}</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}&background=111827&color=fff&bold=true`} alt={article.author} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-[10px] font-black text-[#111827]">{article.author}</p>
                                    <span className="text-slate-300 text-[10px]">●</span>
                                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">{article.date}</p>
                                  </div>
                                  <a 
                                    href={article.url}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[9px] font-black text-[#00BCD4] hover:text-white hover:bg-[#00BCD4] transition-colors uppercase tracking-widest flex items-center gap-1 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded"
                                  >
                                    Consulter <span className="text-[10px] leading-none mb-[1px]">↗</span>
                                  </a>
                                </div>
                              </div>
                            </div>
                            
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 transform ${isSelected ? "bg-[#00BCD4] text-white shadow-md shadow-cyan-500/40" : "bg-slate-50 text-slate-300 border border-slate-100 group-hover:bg-slate-100"}`}>
                              <Check size={16} className={`transition-opacity duration-300 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-50"}`} />
                            </div>
                          </div>
                          
                          {isSelected && <div className="absolute inset-0 bg-[#00BCD4]/5 pointer-events-none rounded-[24px]" />}
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              )}"""

new_block = """                {isFetchingTech ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                    <RefreshCw size={32} className="text-[#00BCD4] animate-spin" />
                    <p className="text-sm font-bold text-slate-500 animate-pulse">Recherche des tendances pour votre projet...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar pr-2">
                    <div className="flex flex-col gap-4">
                      {articles.map((article, i) => {
                        const isSelected = selectedArticle?.id === article.id;
                        return (
                          <motion.div
                            key={article.id}
                            initial={{ opacity: 0, x: -20 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            transition={{ delay: i * 0.1 }}
                            className={`w-full bg-white rounded-[24px] overflow-hidden transition-all duration-300 relative group flex flex-col shadow-sm border ${isSelected ? "ring-[2px] ring-[#00BCD4] border-transparent scale-[1.01]" : "border-slate-100/80 hover:shadow-md hover:border-slate-200"}`}
                          >
                            <div className="flex items-stretch p-4 sm:p-5 gap-4">
                              <div className="w-2 bg-[#D32F2F] self-stretch rounded-full shrink-0" />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={article.type === "VIDEO" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"}>
                                    {article.type}
                                  </Badge>
                                  <span className="text-[10px] font-black tracking-widest text-[#00BCD4] uppercase">{article.category}</span>
                                </div>
                                
                                <h3 className="text-base font-black text-[#111827] mb-1 line-clamp-1 group-hover:text-[#00BCD4] transition-colors">{article.title}</h3>
                                <p className="text-xs font-bold text-[#6B7280] leading-relaxed mb-4 line-clamp-2">{article.snippet}</p>
                                
                                <div className="flex items-center justify-between mt-auto">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden ring-2 ring-white shadow-sm shrink-0">
                                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(article.author)}&background=111827&color=fff&bold=true`} alt={article.author} className="w-full h-full object-cover" />
                                    </div>
                                    <p className="text-[11px] font-black text-[#111827]">{article.author}</p>
                                    <span className="text-slate-300 text-[10px]">●</span>
                                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tighter">{article.date}</p>
                                  </div>
                                  
                                  <button 
                                    onClick={() => setSelectedArticle(article)}
                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${isSelected ? "bg-[#00BCD4] text-white shadow-lg shadow-cyan-500/30" : "bg-slate-50 text-slate-300 hover:bg-slate-100"}`}
                                  >
                                    <Check size={18} className={isSelected ? "opacity-100" : "opacity-0"} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex border-t border-slate-50 bg-slate-50/50 p-2 gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setDetailArticle(article)}
                                className="flex-1 bg-white hover:bg-cyan-50 text-slate-600 hover:text-[#00BCD4] font-black text-[10px] uppercase tracking-wider h-9 rounded-xl border border-slate-100"
                              >
                                <Eye size={14} className="mr-1.5" /> Voir Détails
                              </Button>
                              <a 
                                href={article.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1.5 bg-[#00BCD4] hover:bg-[#0097a7] text-white font-black text-[10px] uppercase tracking-wider h-9 rounded-xl transition-all shadow-sm hover:shadow-md"
                              >
                                <ExternalLink size={14} /> Consulter
                              </a>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <Dialog open={!!detailArticle} onOpenChange={(open) => !open && setDetailArticle(null)}>
                  <DialogContent className="max-w-2xl p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl">
                    {detailArticle && (
                      <>
                        <div className="relative h-48 bg-[#111827] flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-transparent to-transparent" />
                          <Badge className="mb-4 bg-[#00BCD4] text-white border-none px-4 py-1">{detailArticle.type}</Badge>
                          <h2 className="text-xl sm:text-2xl font-black text-white leading-tight z-10">{detailArticle.title}</h2>
                        </div>
                        
                        <div className="p-8 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(detailArticle.author)}&background=111827&color=fff&bold=true`} alt={detailArticle.author} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{detailArticle.author}</p>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{detailArticle.date}</p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Innovation</div>
                              <div className="text-2xl font-black text-[#00BCD4]">{detailArticle.innovation_score}%</div>
                            </div>
                          </div>
                          
                          <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100">
                            <h4 className="text-[11px] font-black text-[#00BCD4] uppercase tracking-widest mb-3">Résumé du contenu</h4>
                            <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                              "{detailArticle.snippet}"
                            </p>
                          </div>
                          
                          <div className="flex gap-4 pt-2">
                             <Button 
                              variant="outline"
                              onClick={() => {
                                setSelectedArticle(detailArticle)
                                setDetailArticle(null)
                              }}
                              className="flex-1 h-12 rounded-2xl border-2 border-slate-100 font-black text-slate-500 hover:bg-slate-100"
                            >
                              SÉLECTIONNER
                            </Button>
                            <a 
                              href={detailArticle.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-[#00BCD4] hover:bg-[#0097a7] text-white font-black h-12 rounded-2xl shadow-lg shadow-cyan-500/20 transition-all uppercase tracking-widest text-xs"
                            >
                              <ExternalLink size={16} /> Ouvrir la source
                            </a>
                          </div>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>"""

if old_block in content:
    new_content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS")
else:
    # Try with normalized line endings
    content_norm = content.replace('\\r\\n', '\\n')
    old_block_norm = old_block.replace('\\r\\n', '\\n')
    if old_block_norm in content_norm:
        new_content = content_norm.replace(old_block_norm, new_block.replace('\\r\\n', '\\n'))
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("SUCCESS NORMALIZED")
    else:
        print("FAILURE: Block not found")
