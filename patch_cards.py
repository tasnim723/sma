"""Replace the project card block with premium UI."""

NEW_CARD_BLOCK = r"""                      {generatedProjects.map((proj, i) => {
                        const cfg = COMPLEXITY_CFG[proj.complexity] || COMPLEXITY_CFG.MEDIUM
                        const isSelected = selectedProject?.id === proj.id
                        const weeks = proj.scenarios?.balanced?.duration_weeks ?? "?"
                        const innovScore = proj.innovation_score ?? 75
                        const uxScore     = Math.min(100, Math.round(innovScore * 1.07))
                        const techScore   = Math.round(innovScore * 0.97)
                        const visualScore = Math.round(innovScore * 0.89)
                        const hasGPU = proj.stack?.some((s: string) => /nvidia|gpu|rtx|cuda|unreal|unity/i.test(s))
                        const hasAI  = proj.stack?.some((s: string) => /ai|ml|llm|groq|openai|transformer/i.test(s))
                        const complexityMap: Record<string,string> = {LOW:"Easy", MEDIUM:"Medium", HIGH:"Advanced"}
                        const complexityLabel = complexityMap[proj.complexity] ?? "Medium"
                        const fullDesc = proj.description ?? ""
                        return (
                          <motion.button
                            key={proj.id}
                            initial={{opacity:0, y:16}} animate={{opacity:1, y:0}} transition={{delay:i*0.12}}
                            onClick={() => { setSelectedProject(proj); setManagerFeatures(proj.modules||[]); }}
                            className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all duration-300 group
                              ${isSelected
                                ? "border-[#00BCD4] shadow-[0_0_28px_rgba(0,188,212,0.30)] bg-cyan-50/40 dark:bg-blue-900/20"
                                : "border-slate-200 dark:border-blue-900/60 hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-[0_0_18px_rgba(0,188,212,0.15)] hover:scale-[1.015]"
                              } bg-white/70 dark:bg-blue-950/30 backdrop-blur-sm`}
                          >
                            {/* IMAGE HEADER */}
                            <div className="relative h-32 overflow-hidden bg-slate-100 dark:bg-blue-900/30">
                              <img src={getImg(proj)} alt={proj.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={e => { (e.target as HTMLImageElement).style.display="none" }} />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"/>
                              <div className="absolute top-2.5 left-3 flex gap-1.5">
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{cfg.icon} {cfg.label}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${innovScore>=85?"bg-emerald-100 text-emerald-700 border-emerald-200":innovScore>=70?"bg-blue-100 text-blue-700 border-blue-200":"bg-slate-100 text-slate-600 border-slate-200"}`}>&#11088; {innovScore}%</span>
                              </div>
                              <div className="absolute top-2.5 right-10 flex items-center gap-1.5">
                                <div className="w-14 h-1.5 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-[#00BCD4] rounded-full" style={{width:`${innovScore}%`}}/></div>
                              </div>
                              {isSelected && <div className="absolute top-2.5 right-3 w-6 h-6 rounded-full bg-[#00BCD4] flex items-center justify-center shadow-lg"><Check size={12} className="text-white"/></div>}
                              <div className="absolute bottom-2.5 left-3 right-3">
                                <p className="text-white font-black text-[15px] leading-tight drop-shadow-md">{proj.title}</p>
                              </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-3.5 space-y-2.5">
                              {/* 1. Description 2 lines */}
                              <p className="text-[11px] text-slate-600 dark:text-blue-300 font-medium leading-relaxed line-clamp-2">{fullDesc}</p>

                              {/* 2. Tech Stack chips compact */}
                              <div className="flex flex-wrap gap-1">
                                {proj.stack?.slice(0,5).map((s:string,j:number)=>(
                                  <span key={j} className="px-1.5 py-0.5 bg-slate-800 dark:bg-blue-950/80 text-white text-[9px] font-black rounded-md tracking-wide">{s}</span>
                                ))}
                                {(proj.stack?.length??0)>5 && <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-blue-900 text-slate-500 text-[9px] font-black rounded-md">+{(proj.stack?.length??0)-5}</span>}
                              </div>

                              {/* 3. KPI Dashboard */}
                              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100 dark:border-blue-800/50">
                                <div className="bg-slate-50 dark:bg-blue-900/30 rounded-xl p-2 text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">&#9201; Duree</p>
                                  <p className="text-[13px] font-black text-slate-700 dark:text-blue-200 mt-0.5">{weeks}<span className="text-[9px] text-slate-400"> sem</span></p>
                                </div>
                                <div className={`rounded-xl p-2 text-center ${proj.complexity==="HIGH"?"bg-rose-50 dark:bg-rose-900/20":proj.complexity==="LOW"?"bg-emerald-50 dark:bg-emerald-900/20":"bg-amber-50 dark:bg-amber-900/20"}`}>
                                  <p className="text-[8px] font-black text-slate-400 uppercase">&#127919; Niveau</p>
                                  <p className={`text-[11px] font-black mt-0.5 ${proj.complexity==="HIGH"?"text-rose-600":proj.complexity==="LOW"?"text-emerald-600":"text-amber-600"}`}>{complexityLabel}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-blue-900/30 rounded-xl p-2 text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase">&#128230; Modules</p>
                                  <p className="text-[13px] font-black text-slate-700 dark:text-blue-200 mt-0.5">{proj.modules?.length??0}</p>
                                </div>
                              </div>

                              {/* 4. Innovation Breakdown */}
                              <div className="space-y-1">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Innovation Breakdown</p>
                                {[
                                  {label:"UX",    score:uxScore,    color:"bg-cyan-400"},
                                  {label:"Tech",   score:techScore,  color:"bg-violet-400"},
                                  {label:"Visual", score:visualScore,color:"bg-pink-400"},
                                ].map(b=>(
                                  <div key={b.label} className="flex items-center gap-2">
                                    <span className="text-[8px] font-black text-slate-400 w-8 shrink-0">{b.label}</span>
                                    <div className="flex-1 h-1 bg-slate-100 dark:bg-blue-900 rounded-full overflow-hidden">
                                      <div className={`h-full ${b.color} rounded-full`} style={{width:`${b.score}%`}}/>
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 w-6 text-right">{b.score}%</span>
                                  </div>
                                ))}
                              </div>

                              {/* 5. Impact & Tech badges */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {hasGPU && <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[8px] font-black rounded-full border border-green-200 dark:border-green-700">&#9889; GPU Accelerated</span>}
                                {hasAI  && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[8px] font-black rounded-full border border-purple-200 dark:border-purple-700">&#129504; AI Powered</span>}
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[8px] font-black rounded-full border border-blue-200 dark:border-blue-700">&#128200; -40% design time</span>
                              </div>
                            </div>
                          </motion.button>
                        )
                      })}"""

path = "frontend/components/projects/CreateProjectWizard.tsx"
content = open(path, "r", encoding="utf-8").read()
lines = content.split("\n")

# Find exact boundaries
start_idx = None
for i, line in enumerate(lines):
    if "{generatedProjects.map((proj, i) => {" in line:
        start_idx = i
        break

if start_idx is None:
    print("ERROR: start not found")
    exit(1)

# Find end: track depth from start
depth = 0
end_idx = None
for i in range(start_idx, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if i > start_idx and depth <= 0:
        end_idx = i
        break

print(f"Replacing lines {start_idx+1}–{end_idx+1}")

new_lines = lines[:start_idx] + [NEW_CARD_BLOCK] + lines[end_idx+1:]
open(path, "w", encoding="utf-8").write("\n".join(new_lines))
print("Done.")
