"""Patch progress steps UI."""

NEW_PROGRESS_BLOCK = r"""          {progressSteps.map(s => {
            const done = currentProgress > s.id
            const active = currentProgress === s.id
            return (
              <div key={s.id} className={`relative z-10 flex flex-col items-center gap-2 ${active ? 'w-14' : 'w-10'} transition-all duration-500`}>
                <motion.div
                  className={`rounded-full flex items-center justify-center border-2 transition-all duration-500 backdrop-blur-sm ${
                    done
                      ? "w-10 h-10 bg-emerald-500 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      : active
                        ? "w-12 h-12 bg-white dark:bg-blue-900 border-[#00BCD4] text-[#00BCD4] shadow-[0_0_25px_rgba(0,188,212,0.5)] z-20"
                        : "w-10 h-10 bg-slate-50/80 dark:bg-blue-950/40 border-slate-200 dark:border-blue-900 text-slate-400 dark:text-blue-800"
                  }`}
                  initial={false}
                  animate={active ? { scale: [1, 1.05, 1] } : done ? { scale: 1 } : { scale: 0.95 }}
                  transition={active ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : { duration: 0.3 }}
                >
                  {done ? <Check className="w-5 h-5" /> : <span className={`font-black ${active ? "text-lg" : "text-sm"}`}>{s.id}</span>}
                </motion.div>
                <motion.span
                  className={`text-[9px] uppercase font-black tracking-widest transition-all duration-300 ${
                    active ? "text-[#00BCD4] drop-shadow-[0_0_8px_rgba(0,188,212,0.8)] scale-110" : done ? "text-emerald-500" : "text-slate-400 dark:text-blue-900"
                  }`}
                  animate={{ y: active ? 2 : 0 }}
                >
                  {s.label}
                </motion.span>
              </div>
            )
          })}"""

path = "frontend/components/projects/CreateProjectWizard.tsx"
content = open(path, "r", encoding="utf-8").read()
lines = content.split("\n")

start_idx = None
for i, line in enumerate(lines):
    if "{progressSteps.map(s => {" in line:
        start_idx = i
        break

if start_idx is None:
    print("ERROR: progressSteps start not found")
    exit(1)

depth = 0
end_idx = None
for i in range(start_idx, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if i > start_idx and depth <= 0:
        end_idx = i
        break

print(f"Replacing lines {start_idx+1}–{end_idx+1}")

new_lines = lines[:start_idx] + [NEW_PROGRESS_BLOCK] + lines[end_idx+1:]
open(path, "w", encoding="utf-8").write("\n".join(new_lines))
print("Done.")
