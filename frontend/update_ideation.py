# -*- coding: utf-8 -*-
import sys

file_path = r"c:\Users\yassi\Downloads\pfe-main(1)(1)\pfe-main(1)\pfe-main\frontend\components\projects\CreateProjectWizard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

start_line = 2153 # 0-indexed
end_line = 2435 # 0-indexed (the duplicate })()} line)

new_block = """                  ) : (() => {
                    // ── Comparison table data ──────────────────────────────
                    const riskLabel = (c:string) => c==='LOW'?'Accessible':c==='MEDIUM'?'Moyen':'Complexe'
                    const riskColor = (c:string) => c==='LOW'?'text-emerald-600 bg-emerald-50':c==='MEDIUM'?'text-amber-600 bg-amber-50':'text-rose-600 bg-rose-50'

                    return (
                      <div className="space-y-6">

                        {/* ── 1. HEADER ULTRA CLAIR ─────────────────────────────────── */}
                        <div className="flex flex-col gap-3 pb-2 border-b border-slate-100">
                          <div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Choisissez le projet à développer</h2>
                            <p className="text-sm text-slate-500 font-medium">3 concepts générés et évalués par l'IA</p>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {scored.length>0 && (() => {
                              const fastest = scored.reduce((a,b)=>(a.fast>b.fast?a:b))
                              const bestROI  = scored.reduce((a,b)=>(a.roi>b.roi?a:b))
                              const mostInn  = scored.reduce((a,b)=>(a.innov>b.innov?a:b))
                              return <>
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">⚡ Plus rapide : <span className="font-black">{fastest.proj.title.split(' ').slice(0,3).join(' ')}</span></span>
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">💰 Meilleur ROI : <span className="font-black">{bestROI.proj.title.split(' ').slice(0,3).join(' ')}</span></span>
                                <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-100">🚀 Plus innovant : <span className="font-black">{mostInn.proj.title.split(' ').slice(0,3).join(' ')}</span></span>
                              </>
                            })()}
                          </div>
                        </div>

                        {/* ── 2. RECOMMANDATION IA DÉCISIONNELLE ─────────────────── */}
                        {topRec && (
                          <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}
                            className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50 p-6 shadow-[0_8px_30px_rgba(34,211,238,0.12)]">
                            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                                <span className="text-8xl">🏆</span>
                            </div>
                            <div className="relative flex flex-col md:flex-row items-start gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-2xl">🏆</span>
                                  <p className="text-[14px] font-black text-cyan-600 uppercase tracking-widest">Recommandation IA</p>
                                </div>
                                <p className="text-sm font-bold text-slate-500 mb-1">Projet conseillé :</p>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight mb-4">{topRec.proj.title}</h3>
                                
                                <div className="space-y-2">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pourquoi ?</p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {whyText(topRec).map((r,j)=>(
                                      <span key={j} className="text-xs font-bold text-cyan-800 flex items-start gap-2 bg-white/60 p-2 rounded-xl">
                                        <span className="text-cyan-500 mt-0.5">•</span><span className="leading-snug">{r}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="shrink-0 bg-white/80 p-5 rounded-2xl border border-white/40 shadow-sm flex flex-col items-center justify-center min-w-[140px]">
                                <div className="relative w-20 h-20 mb-2">
                                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 48 48">
                                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="4"/>
                                    <motion.circle cx="24" cy="24" r="20" fill="none" stroke="#06b6d4" strokeWidth="4" strokeLinecap="round"
                                      initial={{strokeDasharray:'0 126'}} animate={{strokeDasharray:`${(topRec.successPct/100)*126} 126`}}
                                      transition={{duration:1.5,ease:'easeOut'}}/>
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-black text-cyan-700">{topRec.successPct}%</span>
                                  </div>
                                </div>
                                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest text-center">Confiance IA</p>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* ── 3. SCANNABLE PROJECT CARDS ─────────────────────────── */}
                        <div className="space-y-8">
                          {scored.map((s,i)=>{
                            const isSelected = selectedProject?.id===s.proj.id
                            const isTop = topRec?.proj.id===s.proj.id
                            const bdg = BADGE_CFG[s.badgeKey]
                            const kpis = [
                              {icon:'🚀',label:'Innovation',val:s.innov,desc:s.innov>=80?'Bon potentiel différenciant':s.innov>=65?'Potentiel correct':'Potentiel modéré', color:'bg-violet-500'},
                              {icon:'💰',label:'ROI',val:s.roi,desc:s.roi>=80?'Rentabilité élevée':s.roi>=65?'Rentabilité moyenne/haute':'Rentabilité modérée', color:'bg-amber-400'},
                              {icon:'⚙️',label:'Faisabilité',val:s.feasib,desc:s.feasib>=80?'Très réalisable rapidement':s.feasib>=65?'Réalisable':'Complexe à livrer', color:'bg-emerald-500'},
                            ]
                            return (
                              <motion.div key={s.proj.id} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:i*0.1}}
                                className={`rounded-3xl border-2 overflow-hidden bg-white shadow-sm transition-all duration-300 ${
                                  isSelected?'border-cyan-400 shadow-[0_8px_30px_rgba(34,211,238,0.2)] ring-4 ring-cyan-50':
                                  isTop?'border-cyan-200 hover:border-cyan-300':'border-slate-200 hover:border-slate-300'}`}
                                >

                                {/* HERO SECTION Image + overlay */}
                                <div className="relative h-56 overflow-hidden bg-slate-900 group">
                                  <img src={`https://image.pollinations.ai/prompt/${getDynamicImagePrompt(s.proj)}?width=1200&height=400&nologo=true&model=flux&seed=${s.proj.id||i}`}
                                    alt={s.proj.title} loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                                    onError={e=>{(e.target as HTMLImageElement).src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80'}}/>
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"/>
                                  
                                  {isTop && (
                                    <div className="absolute top-4 left-4">
                                      <span className="text-[10px] font-black px-3 py-1.5 rounded-full bg-cyan-500 text-white uppercase tracking-wider shadow-lg">🏆 Recommandé</span>
                                    </div>
                                  )}
                                  
                                  <div className="absolute bottom-4 left-6 right-6">
                                    <h3 className="font-black text-2xl text-white drop-shadow-md leading-tight">{s.proj.title}</h3>
                                    <p className="text-sm font-medium text-white/80 mt-1">{s.proj.description?.split('.')[0]}.</p>
                                  </div>
                                </div>

                                {/* QUICK STATS BELOW HERO */}
                                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50">
                                  <div className="py-3 px-4 flex items-center gap-3"><span className="text-xl">⏱</span><div><p className="text-sm font-black text-slate-800">{s.proj.scenarios?.balanced?.duration_weeks} semaines</p></div></div>
                                  <div className="py-3 px-4 flex items-center gap-3"><span className="text-xl">💰</span><div><p className={`text-sm font-black ${s.roi>=75?'text-emerald-600':'text-amber-600'}`}>ROI {s.roi>=80?'élevé':s.roi>=65?'moyen':'modéré'}</p></div></div>
                                  <div className="py-3 px-4 flex items-center gap-3"><span className="text-xl">🧩</span><div><p className={`text-sm font-black ${s.proj.complexity==='LOW'?'text-emerald-600':s.proj.complexity==='MEDIUM'?'text-amber-600':'text-rose-600'}`}>Complexité {riskLabel(s.proj.complexity)}</p></div></div>
                                  <div className="py-3 px-4 flex items-center gap-3"><span className="text-xl">👥</span><div><p className="text-sm font-black text-slate-800">Cible : {(industry||'Général').substring(0,15)}</p></div></div>
                                </div>

                                <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-6">
                                    {/* OBJECTIF ET VALEUR AJOUTEE */}
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><span className="text-lg">🎯</span> Objectif</h4>
                                        <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                          {s.proj.description}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><span className="text-lg">📌</span> Valeur ajoutée</h4>
                                        <ul className="space-y-2">
                                          {whyText(s).slice(0,3).map((r,j)=>(
                                            <li key={j} className="text-sm text-slate-600 font-medium flex items-start gap-2">
                                              <span className="text-cyan-500 font-bold mt-0.5">✓</span>{r}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>

                                    {/* STACK PROPOSEE */}
                                    <div className="pt-4 border-t border-slate-100">
                                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">🛠 Stack proposée</h4>
                                      <div className="flex flex-wrap gap-2 mb-4">
                                        {s.proj.stack?.map((t,j)=>(
                                          <span key={j} className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-black rounded-lg">{t}</span>
                                        ))}
                                      </div>
                                      <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                        Niveau technique : 
                                        <span className={`px-2 py-0.5 rounded-md ${riskColor(s.proj.complexity)}`}>
                                          {s.proj.complexity==='LOW'?'🟢 Accessible':s.proj.complexity==='MEDIUM'?'🟡 Moyen':'🔴 Complexe'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="space-y-6">
                                    {/* KPI CARDS */}
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">📊 Métriques Clés</h4>
                                    <div className="space-y-3">
                                      {kpis.map(k=>(
                                        <div key={k.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 flex items-center gap-4">
                                          <div className="text-2xl bg-white w-12 h-12 rounded-xl shadow-sm flex items-center justify-center shrink-0">{k.icon}</div>
                                          <div className="flex-1">
                                            <div className="flex justify-between items-end mb-1">
                                              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">{k.label}</p>
                                              <p className="text-sm font-black text-slate-800">{k.val}%</p>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                                              <motion.div initial={{width:0}} animate={{width:`${k.val}%`}} transition={{delay:i*0.1+0.3,duration:0.7}} className={`h-full rounded-full ${k.color}`}/>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-500">{k.desc}</p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>

                                    {/* RAISONNEMENT IA */}
                                    <div className="rounded-xl bg-violet-50/50 border border-violet-100 p-4 relative overflow-hidden">
                                      <div className="absolute -right-4 -top-4 text-6xl opacity-5 pointer-events-none">🧠</div>
                                      <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"/>🧠 Analyse IA
                                      </h4>
                                      <p className="text-xs font-bold text-slate-600 mb-2">Ce projet a été généré car :</p>
                                      <ul className="space-y-1.5">
                                        <li className="text-[11px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">•</span> Compatible avec vos contraintes ({riskLabel(s.proj.complexity)})</li>
                                        <li className="text-[11px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">•</span> Temps de développement maîtrisé ({s.proj.scenarios?.balanced?.duration_weeks} sem)</li>
                                        <li className="text-[11px] text-slate-600 flex items-start gap-1.5"><span className="text-violet-400 mt-0.5">•</span> Stack {s.proj.stack?.slice(0,2).join(', ')} alignée</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>

                                {/* ACTIONS CTA */}
                                <div className="p-4 md:px-8 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
                                  <div className="flex gap-2 w-full md:w-auto order-2 md:order-1">
                                    <Button variant="outline" className="bg-white rounded-xl text-xs font-bold text-slate-600">
                                      📊 Comparer
                                    </Button>
                                    <Button variant="outline" className="bg-white rounded-xl text-xs font-bold text-slate-600">
                                      🔄 Régénérer une variante
                                    </Button>
                                  </div>
                                  <Button 
                                    className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-8 py-5 text-sm font-black shadow-lg shadow-cyan-500/20 order-1 md:order-2"
                                    onClick={()=>{setSelectedProject(s.proj);setManagerFeatures([]);setManagerDeliverables(s.proj.deliverables||[]);setStep("concept-validation")}}>
                                    Continuer avec ce projet <ArrowRight size={16} className="ml-2" />
                                  </Button>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>

                        {/* ── 4. WHAT IF ? / SIMULATION (Mockup) ─────────────────────────── */}
                        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
                          <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                              <span className="text-xl text-white">🔮</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-slate-800">What if ?</h3>
                              <p className="text-xs font-bold text-slate-500">Demandez à l'IA de simuler des scénarios alternatifs</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {['Et si on réduit le budget ?', 'Et si on veut un MVP en 4 semaines ?', 'Et si on cible un autre marché ?', 'Et si l\\'équipe est junior ?'].map((q,i)=>(
                              <button key={i} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-bold text-slate-600 text-left">
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── 5. COMPARISON TABLE ─────────────────────── */}
                        {scored.length>1 && (
                          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.4}}
                            className="mt-8 rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                              <div>
                                <h3 className="text-base font-black text-slate-800">Comparaison Intelligente</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Vue d'ensemble des métriques</p>
                              </div>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100">
                                    <th className="text-left px-6 py-4 font-black text-slate-400 text-xs uppercase">Projet</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-xs uppercase text-center">Innovation</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-xs uppercase text-center">Temps</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-xs uppercase text-center">ROI</th>
                                    <th className="px-4 py-4 font-black text-slate-400 text-xs uppercase text-center">Risque</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {scored.map((s,i)=>(
                                    <tr key={s.proj.id} onClick={()=>{setSelectedProject(s.proj);setManagerFeatures([]);setManagerDeliverables(s.proj.deliverables||[])}}
                                      className={`border-b border-slate-50 cursor-pointer transition-colors ${selectedProject?.id===s.proj.id?'bg-cyan-50':i%2===0?'bg-white':'bg-slate-50/50'} hover:bg-cyan-50/50`}>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          {topRec?.proj.id===s.proj.id && <span className="text-lg">🏆</span>}
                                          <span className="font-black text-slate-700">{s.proj.title}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-center"><span className="font-black text-violet-600">{s.innov}%</span></td>
                                      <td className="px-4 py-4 text-center"><span className="font-black text-slate-600">{s.proj.scenarios?.balanced?.duration_weeks} sem</span></td>
                                      <td className="px-4 py-4 text-center"><span className={`font-black ${s.roi>=75?'text-emerald-600':'text-amber-600'}`}>{s.roi>=80?'Élevé':s.roi>=65?'Moyen':'Modéré'}</span></td>
                                      <td className="px-4 py-4 text-center"><span className={`text-[10px] font-black px-3 py-1 rounded-full ${riskColor(s.proj.complexity)}`}>{riskLabel(s.proj.complexity)}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}

                      </div>
                    )
                  })()}
"""

new_lines = lines[:start_line] + [l + "\\n" for l in new_block.split("\\n")] + lines[end_line + 1:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print("Done via python")
