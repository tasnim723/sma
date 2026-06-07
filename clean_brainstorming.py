path = "backend/app/api/endpoints/brainstorming.py"
content = open(path, "r", encoding="utf-8").read()

# The dead code starts right after the new veille_tech return and ends before analyze-trend
marker_start = "\n\n    project_name = req.project_name.strip()\n"
marker_end   = "\n\n@router.post(\"/analyze-trend\")"

idx_s = content.find(marker_start)
idx_e = content.find(marker_end)

if idx_s != -1 and idx_e != -1 and idx_s < idx_e:
    new_content = content[:idx_s] + "\n\n" + content[idx_e+2:]
    open(path, "w", encoding="utf-8").write(new_content)
    print(f"Cleaned {idx_e - idx_s} chars of dead code.")
else:
    print(f"Pattern not found: idx_s={idx_s}, idx_e={idx_e}")
    # Show 80 chars around where we expect the marker
    sample = content[550*50:550*50+200]
    print("Sample:", repr(sample[:300]))
