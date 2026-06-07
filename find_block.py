"""Script to rewrite the project card block in CreateProjectWizard.tsx"""

path = "frontend/components/projects/CreateProjectWizard.tsx"
content = open(path, "r", encoding="utf-8").read()
lines = content.split("\n")

# Find start line (0-indexed): the line with "generatedProjects.map"
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if "generatedProjects.map((proj, i) =>" in line and start_idx is None:
        start_idx = i
    if start_idx and i > start_idx and "motion.button>" in line and "key={proj.id}" not in line:
        # find the closing of the map
        # we look for the closing brace of the map callback
        pass

# Better approach: find lines by unique content
for i, line in enumerate(lines):
    if "{generatedProjects.map((proj, i) => {" in line:
        start_idx = i
        break

# Find the matching closing }) of the .map()
if start_idx is not None:
    depth = 0
    for i in range(start_idx, len(lines)):
        depth += lines[i].count("{") - lines[i].count("}")
        if i > start_idx and depth <= 0:
            end_idx = i
            break

print(f"start_idx={start_idx}, end_idx={end_idx}")
if start_idx and end_idx:
    print("START:", repr(lines[start_idx][:80]))
    print("END  :", repr(lines[end_idx][:80]))
