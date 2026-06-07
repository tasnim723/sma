import re
import os

filepath = r"C:\Users\yassi\OneDrive\Desktop\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend\components\projects\CreateProjectWizard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Add detailArticle state if it's missing
if 'const [detailArticle' not in text:
    print("Need to add detailArticle state")
    text = text.replace('const [selectedArticle, setSelectedArticle] = useState<TechArticle | null>(null)',
                        'const [selectedArticle, setSelectedArticle] = useState<TechArticle | null>(null)\n  const [detailArticle, setDetailArticle] = useState<TechArticle | null>(null)')

# Add dialogue component at the end of tech step
dialog_code = '''
                {/* ─── DETAILS MODAL ─── */}
                <Dialog open={!!detailArticle} onOpenChange={(open) => !open && setDetailArticle(null)}>
                  <DialogContent className="max-w-[720px] p-0 overflow-hidden border-none rounded-[32px] bg-white shadow-2xl">
                    {detailArticle && (
                      <div className="flex flex-col">
                        {/* Modal Header Media */}
                        <div className="relative h-48 sm:h-64 overflow-hidden bg-slate-900">
                          <img src={detailArticle.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&q=80"} alt={detailArticle.title} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                          <div className="absolute bottom-6 left-8 right-8">
                            <div className="flex gap-2 mb-3">
                              <Badge className={`border-none px-4 py-1 text-[10px] font-black tracking-widest uppercase ${detailArticle.type === 'VIDEO' ? 'bg-red-500 text-white' : 'bg-[#00BCD4] text-white'}`}>{detailArticle.type}</Badge>
                              <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 border px-4 py-1 text-[10px] font-black tracking-widest uppercase">{detailArticle.category}</Badge>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">{detailArticle.title}</h2>
                          </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 flex flex-col sm:flex-row gap-8 bg-slate-50">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-4 text-slate-400">
                               <div className="flex items-center gap-1.5 font-bold text-xs">
                                 <RefreshCw size={14} /> PUBLIÉ PAR {detailArticle.author.toUpperCase()} · {detailArticle.date.toUpperCase()}
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
                                onClick={() => setDetailArticle(null)}
                                className="bg-[#111827] hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg hover:shadow-xl shadow-black/10"
                              >
                                <ExternalLink size={16} /> CONSULTER LA SOURCE
                              </a>
                            </div>
                          </div>

                          {/* Action Sidebar */}
                          <div className="w-full sm:w-[220px] space-y-4 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={16} className="text-[#00BCD4]" />  
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Innovation</h4>
                            </div>
                            <div className="text-4xl font-black text-[#00BCD4]">{detailArticle.innovation_score}%</div>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-[160px]">Cette technologie est hautement recommandée pour votre projet.</p>
                            
                            <div className="mt-auto pt-4 border-t border-slate-50">
                              <Button 
                                onClick={() => {
                                  setSelectedArticle(detailArticle);
                                  setDetailArticle(null);
                                  // Wait for state to settle, then analyze
                                  setTimeout(() => analyzeTrend(detailArticle), 50);
                                }}
                                className="w-full bg-cyan-50 hover:bg-cyan-100 text-[#00BCD4] rounded-xl font-black text-xs h-12 shadow-sm"
                              >
                                SÉLECTIONNER
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
'''

if 'DETAILS MODAL' not in text:
    text = text.replace('              </motion.div>\n            )}\n\n            {/* ─── IMPORT DETAILS ─── */}', dialog_code + '\n              </motion.div>\n            )}\n\n            {/* ─── IMPORT DETAILS ─── */}')

# Now add the Details button to the card replacing "Consulter"
old_card_footer = '''<div className="flex items-center gap-3 mt-1.5">
                                  <span className="text-[10px] text-slate-400 font-bold">Par {article.author} · {article.date}</span>
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-[10px] font-black text-[#00BCD4] hover:underline flex items-center gap-1 uppercase tracking-wider"
                                  >
                                    Consulter <ExternalLink size={10} />
                                  </a>
                                </div>'''

new_card_footer = '''<div className="flex items-center gap-3 mt-2">
                                  <span className="text-[10px] text-slate-400 font-bold flex-1 truncate">Par {article.author} · {article.date}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailArticle(article);
                                    }}
                                    className="text-[9px] font-black text-slate-500 hover:text-[#00BCD4] transition-colors flex items-center gap-1 uppercase tracking-widest bg-slate-50 hover:bg-cyan-50 px-2.5 py-1.5 rounded-lg border border-slate-100"
                                  >
                                    Détails
                                  </button>
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-[9px] font-black text-white bg-[#00BCD4] hover:bg-[#0097a7] transition-colors flex items-center gap-1 uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-sm shadow-cyan-500/20"
                                  >
                                    Ouvrir <ExternalLink size={10} />
                                  </a>
                                </div>'''

if old_card_footer in text:
    text = text.replace(old_card_footer, new_card_footer)
    print("Replaced footer!")
else:
    print("WARN: Could not find exactly old_card_footer.")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Modal added and card button updated.")
