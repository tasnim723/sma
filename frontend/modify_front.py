# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('components/projects/CreateProjectWizard.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Replace auditStack static with dynamic results mapping
old_audit_code = '''                        const auditStack = (stack: string[]) => {
                          const issues: string[] = [];
                          const success: string[] = [];
                          if (!stack || stack.length === 0) return { issues, success };

                          const s = stack.map(x => x.toLowerCase());

                          // Réelles règles d'audit technique (simulation)
                          if (s.includes('react') || s.includes('next.js')) {
                            success.push("L'écosystème React offre la meilleure compatibilité avec les UI modernes.");
                          }
                          if (s.includes('next.js') && (s.includes('express') || s.includes('nest.js'))) {
                            issues.push("Redondance détectée : Next.js intègre des API routes nativement. Un backend séparé ajoute de l'overhead réseau.");
                          }
                          if (s.includes('mongodb') && s.includes('prisma')) {
                            issues.push("Attention : Prisma supporte MongoDB, mais les transactions ACID complètes requièrent un Replica Set configuré.");
                          }
                          if (s.includes('django') && s.includes('react')) {
                            success.push("Excellent choix : Django API (robuste) + React (réactif) est un standard industriel.");
                          }
                          if (s.includes('flutter') && s.includes('react native')) {
                            issues.push("Conflit majeur : Deux frameworks mobiles cross-platform sélectionnés. Choisissez-en un seul.");
                          }
                          if (stack.length > 5) {
                            issues.push(Stack lourde ( technos). Risque accru pour la maintenabilité et la courbe d'apprentissage de l'équipe.);
                          }
                          if (s.includes('typescript')) {
                            success.push("TypeScript détecté : Forte garantie de typage et réduction des bugs en production.");
                          }

                          // Par défaut
                          if (success.length === 0) success.push("La stack sélectionnée est standard.");
                          if (issues.length === 0) success.push("Aucun conflit majeur détecté dans les dépendances.");

                          return { issues, success };
                        };

                        const { issues, success } = auditStack(p.stack || []);

                        return (
                          <motion.div key="technique" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                            <div className="rounded-[2rem] border border-cyan-200/40 bg-white/10 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                              <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Cpu size={14} /> Audit de Compatibilité Stack
                              </p>

                              <div className="flex flex-wrap gap-2 mb-5">
                                {p.stack?.map((t, i) => (
                                  <span key={i} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg">{t}</span>
                                ))}
                              </div>

                              <div className="space-y-2.5">
                                {issues.map((msg, i) => (
                                  <div key={i} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                    <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{msg}</p>
                                  </div>
                                ))}
                                {success.map((msg, i) => (
                                  <div key={i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{msg}</p>
                                  </div>
                                ))}
                              </div>'''

new_audit_code = '''                        const issues = auditResult?.issues || [];
                        const success = auditResult?.success || [];

                        return (
                          <motion.div key="technique" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                            <div className="rounded-[2rem] border border-cyan-200/40 bg-white/10 backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                              <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Cpu size={14} /> Audit de Compatibilité Stack
                              </p>

                              <div className="flex flex-wrap gap-2 mb-5">
                                {p.stack?.map((t, i) => (
                                  <span key={i} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg">{t}</span>
                                ))}
                              </div>

                              <div className="space-y-2.5 min-h-[80px]">
                                <AnimatePresence mode="wait">
                                  {isAuditing ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center p-4">
                                      <RefreshCw size={24} className="text-cyan-500 animate-spin mb-2" />
                                      <p className="text-xs text-cyan-600 font-semibold animate-pulse">L'IA analyse les dépendances...</p>
                                    </motion.div>
                                  ) : (
                                    <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                                      {issues.map((msg, i) => (
                                        <div key={'i-'+i} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                                          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">{msg}</p>
                                        </div>
                                      ))}
                                      {success.map((msg, i) => (
                                        <div key={'s-'+i} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex gap-3 items-start backdrop-blur-sm">
                                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{msg}</p>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>'''

content = content.replace(old_audit_code, new_audit_code)

# 2. Replace planfication colors
old_plan_code = '''                            <div className="rounded-[2rem] border border-cyan-200/40 bg-[#0f172a] backdrop-blur-xl p-5 shadow-[0_0_30px_rgba(34,211,238,0.1)] flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Semaine {timeLapseWeek} / {totalWeeks}</span>
                                <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Progression : {Math.round((timeLapseWeek / totalWeeks) * 100)}%</Badge>
                              </div>

                              <input
                                type="range"
                                min="1" max={totalWeeks}
                                value={timeLapseWeek}
                                onChange={(e) => setTimeLapseWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                              />

                              <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-xs text-emerald-400 h-32 overflow-y-auto shadow-inner flex flex-col gap-2">
                                {logs.slice(0, timeLapseWeek).map((log, i) => (
                                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                    <span className="text-slate-500">[{log.week < 10 ? '0' + log.week : log.week}/12]</span> <span className={log.text.includes('Alerte') ? 'text-amber-400' : 'text-emerald-400'}>{log.text}</span>
                                  </motion.div>
                                ))}
                                <motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="inline-block w-2 h-3 bg-emerald-400 mt-1" />
                              </div>
                            </div>'''

new_plan_code = '''                            <div className="rounded-[2rem] border border-cyan-200/40 bg-white/70 backdrop-blur-xl p-5 shadow-[0_10px_40px_rgba(34,211,238,0.15)] flex flex-col gap-4">
                              <div className="flex items-center justify-between">
                                <span className="text-cyan-800 font-bold text-xs uppercase tracking-wider">Semaine {timeLapseWeek} / {totalWeeks}</span>
                                <Badge className="bg-cyan-50 text-cyan-600 border border-cyan-200">Progression : {Math.round((timeLapseWeek / totalWeeks) * 100)}%</Badge>
                              </div>

                              <input
                                type="range"
                                min="1" max={totalWeeks}
                                value={timeLapseWeek}
                                onChange={(e) => setTimeLapseWeek(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
                              />

                              <div className="bg-slate-50/80 p-4 rounded-xl border border-cyan-100 font-medium text-xs text-slate-600 h-40 overflow-y-auto shadow-inner flex flex-col gap-3 relative scroll-smooth">
                                <AnimatePresence mode="popLayout">
                                  {logs.slice(0, timeLapseWeek).map((log, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex items-start gap-3 p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                                      <div className={w-6 h-6 rounded-full flex items-center justify-center shrink-0 }>
                                        {log.text.includes('Alerte') ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Semaine {log.week}</p>
                                        <p className={log.text.includes('Alerte') ? 'text-amber-700 font-semibold' : 'text-slate-700'}>{log.text}</p>
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>
                            </div>'''

content = content.replace(old_plan_code, new_plan_code)

with codecs.open('components/projects/CreateProjectWizard.tsx', 'w', 'utf-8') as f:
    f.write(content)
