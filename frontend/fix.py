# -*- coding: utf-8 -*-
import codecs
import re

with codecs.open('components/projects/CreateProjectWizard.tsx', 'r', 'utf-8') as f:
    c = f.read()

# Replace the broken syntax block
pattern = r'<div className="space-y-2\.5 min-h-\[80px\]"><AnimatePresence mode="wait">\{isAuditing \? \(\<motion\.div key="loading"[\s\S]*?className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">\{msg\}</p>\s*</div>\s*\)\)}\s*</div>'

replacement = '''<div className="space-y-2.5 min-h-[80px]">
                                <AnimatePresence mode="wait">
                                  {isAuditing ? (
                                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center p-4">
                                      <RefreshCw size={24} className="text-cyan-500 animate-spin mb-2" />
                                      <p className="text-xs text-cyan-600 font-semibold animate-pulse">L'IA analyse les dépendances et l'architecture...</p>
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

c = re.sub(pattern, replacement, c)

with codecs.open('components/projects/CreateProjectWizard.tsx', 'w', 'utf-8') as f:
    f.write(c)
