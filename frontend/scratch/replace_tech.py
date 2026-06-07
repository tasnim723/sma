import re

filepath = r"C:\Users\yassi\OneDrive\Desktop\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend\components\projects\CreateProjectWizard.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start marker
start_marker = '{/* ─── WAR ROOM TECH WATCH ─── */}'
end_marker = '{/* ─── IMPORT DETAILS ─── */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1:
    print("ERROR: Start marker not found!")
    print("Looking for:", repr(start_marker[:30]))
    # Try finding it differently
    for i, line in enumerate(content.split('\n')):
        if 'WAR ROOM TECH WATCH' in line:
            print(f"Found at line {i+1}: {repr(line[:80])}")
    exit(1)

if end_idx == -1:
    print("ERROR: End marker not found!")
    exit(1)

print(f"Start: char {start_idx}, End: char {end_idx}")

new_section = '''            {/* ─── WAR ROOM TECH WATCH ─── */}
            {step === "warroom-tech" && (
              <motion.div key="warroom-tech" variants={fade} initial="initial" animate="animate" exit="exit" className="space-y-4">
                
                {/* Header compact */}
                <div className="flex items-center gap-3 pb-1">
                  <div className="w-9 h-9 rounded-xl bg-[#00BCD4] flex items-center justify-center shadow shrink-0">
                    <BrainCircuit size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-black text-slate-900">Veille Technologique</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tendances réelles · Mise à jour quotidienne · Liées à votre projet</p>
                  </div>
                  {globalScore > 0 && (
                    <div className="flex items-center gap-1.5 bg-cyan-50 border border-cyan-100 px-3 py-1.5 rounded-full shrink-0">
                      <TrendingUp size={13} className="text-[#00BCD4]" />
                      <span className="text-[11px] font-black text-[#00BCD4]">{globalScore}%</span>
                    </div>
                  )}
                </div>

                {/* SUB-PHASE: PICK */}
                {techSubPhase === "pick" && (
                  <>
                    {isFetchingTech ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <RefreshCw size={28} className="text-[#00BCD4] animate-spin" />
                        <p className="text-sm font-black text-slate-400 animate-pulse">Scan des tendances en temps réel pour votre projet...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {articles.map((article, i) => {
                          const isSelected = selectedArticle?.id === article.id
                          const isVideo = article.type === "VIDEO"
                          return (
                            <motion.div
                              key={article.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.08 }}
                              onClick={() => setSelectedArticle(isSelected ? null : article)}
                              className={`flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${isSelected ? "border-[#00BCD4] bg-cyan-50/60 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"}`}
                            >
                              {/* Type icon */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isVideo ? "bg-red-100" : "bg-blue-50"}`}>
                                {isVideo
                                  ? <PlayCircle size={18} className="text-red-500" />
                                  : <BookOpen size={18} className="text-blue-500" />
                                }
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isVideo ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                                    {article.type}
                                  </span>
                                  <span className="text-[9px] font-black text-[#00BCD4] uppercase tracking-wider">{article.category}</span>
                                  {i === 0 && <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full uppercase">NOUVEAU</span>}
                                </div>
                                <p className="text-sm font-black text-slate-800 leading-snug line-clamp-2">{article.title}</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5 line-clamp-2 leading-relaxed">{article.snippet}</p>
                                <div className="flex items-center gap-3 mt-1.5">
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
                                </div>
                              </div>

                              {/* Score + selection */}
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className={`text-[11px] font-black px-2 py-1 rounded-lg ${article.innovation_score >= 90 ? "bg-emerald-100 text-emerald-700" : article.innovation_score >= 80 ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                                  {article.innovation_score}%
                                </div>
                                {isSelected && <CheckCircle2 size={16} className="text-[#00BCD4]" />}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <Button variant="ghost" onClick={() => setStep("warroom-params")} className="rounded-xl font-black text-slate-400">Retour</Button>
                      <Button
                        disabled={isFetchingTech || !selectedArticle}
                        onClick={() => selectedArticle && analyzeTrend(selectedArticle)}
                        className={`flex-1 py-5 rounded-xl font-black text-sm transition-all duration-300 ${isFetchingTech || !selectedArticle ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white shadow-lg shadow-cyan-400/20 hover:-translate-y-0.5"}`}
                      >
                        <Sparkles size={15} className="mr-2" />
                        Analyser cette tendance <ArrowRight size={15} className="ml-1.5" />
                      </Button>
                    </div>
                  </>
                )}

                {/* SUB-PHASE: ANALYZING */}
                {techSubPhase === "analyzing" && (
                  <div className="flex flex-col items-center justify-center py-10 space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-cyan-100 border-t-[#00BCD4] animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lightbulb size={20} className="text-[#00BCD4]" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-slate-700">Analyse d\'intégration en cours...</p>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">L\'IA étudie comment intégrer cette tendance à votre projet</p>
                    </div>
                    <div className="flex gap-1.5">
                      {["Extraction du contexte", "Planification", "Génération du plan"].map((label, i) => (
                        <motion.div
                          key={i}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                          className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full"
                        >
                          {label}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUB-PHASE: PLAN */}
                {techSubPhase === "plan" && analysisPlan && selectedArticle && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {/* Selected trend recap */}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedArticle.type === "VIDEO" ? "bg-red-100" : "bg-blue-50"}`}>
                        {selectedArticle.type === "VIDEO" ? <PlayCircle size={15} className="text-red-500" /> : <BookOpen size={15} className="text-blue-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{selectedArticle.category}</p>
                        <p className="text-xs font-black text-slate-700 truncate">{selectedArticle.title}</p>
                      </div>
                      <a href={selectedArticle.url} target="_blank" rel="noopener noreferrer" className="text-[#00BCD4] hover:text-[#0097a7]">
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {/* Plan d\'intégration */}
                    <div className="rounded-2xl border border-[#00BCD4]/20 bg-gradient-to-br from-cyan-50/50 to-white p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <Target size={14} className="text-[#00BCD4]" />
                            <span className="text-[10px] font-black text-[#00BCD4] uppercase tracking-widest">Plan d\'intégration</span>
                            <span className="text-[10px] font-black bg-[#00BCD4] text-white px-2 py-0.5 rounded-full">{analysisPlan.impact_score}% impact</span>
                          </div>
                          <p className="text-sm font-black text-slate-900">{analysisPlan.integration_title}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed italic">"{analysisPlan.one_liner}"</p>
                      <div className="grid grid-cols-3 gap-2">
                        {analysisPlan.innovations.map((inno, i) => (
                          <div key={i} className="bg-white rounded-xl p-2.5 border border-slate-100 space-y-1">
                            <p className="text-base">{inno.icon}</p>
                            <p className="text-[10px] font-black text-slate-800 leading-tight">{inno.label}</p>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed">{inno.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="ghost" onClick={() => setTechSubPhase("pick")} className="rounded-xl font-black text-slate-400 text-sm">
                        ← Changer
                      </Button>
                      <Button
                        onClick={() => {
                          const enrichedDesc = analysisPlan.enriched_description || (selectedIdea ? `${selectedIdea.title} — ${selectedIdea.description}` : rawIdea)
                          handleAnalyze(enrichedDesc)
                        }}
                        className="flex-1 bg-gradient-to-r from-[#00BCD4] to-[#0097a7] text-white py-5 rounded-xl font-black text-sm shadow-lg shadow-cyan-400/20 hover:-translate-y-0.5 transition-all"
                      >
                        <Sparkles size={15} className="mr-2" />
                        Générer mon Projet Innovant <ArrowRight size={15} className="ml-1.5" />
                      </Button>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            )}

'''

# Replace old section with new one
new_content = content[:start_idx] + new_section + content[end_idx:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"SUCCESS: Replaced warroom-tech section. New file size: {len(new_content)} chars")
