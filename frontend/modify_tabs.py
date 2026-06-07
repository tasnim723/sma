import re

with open('c:\\Users\\LENOVO\\Desktop\\pfe-main-1-\\pfe-main(1)(1)\\pfe-main(1)\\pfe-main\\frontend\\components\\projects\\CreateProjectWizard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1. Update DetailsTab type
for i in range(100):
    if 'type DetailsTab =' in lines[i]:
        lines[i] = 'type DetailsTab = "technique" | "planification"\n'
        break

# 2. Update default useState
for i in range(100, 500):
    if 'const [detailsTab, setDetailsTab] = useState<DetailsTab>("design")' in lines[i]:
        lines[i] = lines[i].replace('"design"', '"technique"')
        break

# 3. Update tabs array
start_tabs = -1
end_tabs = -1
for i in range(2500, 3100):
    if 'const tabs: { id: DetailsTab; label: string; icon: React.ReactNode }[] = [' in lines[i]:
        start_tabs = i
    if start_tabs != -1 and ']' in lines[i]:
        end_tabs = i
        break

if start_tabs != -1 and end_tabs != -1:
    lines[start_tabs:end_tabs+1] = [
        '                const tabs: { id: DetailsTab; label: string; icon: React.ReactNode }[] = [\n',
        '                  { id: "technique", label: "?? Technique", icon: <Cpu size={12} /> },\n',
        '                  { id: "planification", label: "?? Planning", icon: <Calendar size={12} /> },\n',
        '                ]\n'
    ]

# 4. Remove 'design', 'architecture', 'synthese' blocks
# Using a simple line parser to find blocks
out_lines = []
skip = False
block_depth = 0
for line in lines:
    if '{detailsTab === "design" && (() => {' in line or '{detailsTab === "architecture" && (() => {' in line or '{detailsTab === "synthese" && (() => {' in line:
        skip = True
        block_depth = 1
        continue
    
    if skip:
        if '{' in line:
            block_depth += line.count('{')
        if '}' in line:
            block_depth -= line.count('}')
            
        if block_depth <= 0:
            skip = False
        continue

    # Update planification button
    if 'Confirmer ce planning ? Synthèse' in line:
        line = line.replace('Confirmer ce planning ? Synthèse', 'Valider & Définir les fonctionnalités')
    if 'onClick={() => setDetailsTab("synthese")}' in line:
        line = line.replace('onClick={() => setDetailsTab("synthese")}', 'onClick={() => { setStep("fonctionnalites"); generateDetailedTasks(p, selectedScenario); }}')

    # Update bottom button
    if 'Planning & Synthèse' in line:
        line = line.replace('Planning & Synthèse', 'Planification')
    
    out_lines.append(line)

with open('c:\\Users\\LENOVO\\Desktop\\pfe-main-1-\\pfe-main(1)(1)\\pfe-main(1)\\pfe-main\\frontend\\components\\projects\\CreateProjectWizard.tsx', 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print("Done modifying.")
