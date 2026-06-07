import os

root_dir = r"c:\Users\LENOVO\Downloads\PROJET_SMA (2)\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend"
bad_pattern = '"${API_BASE_URL}'
good_pattern = '`${API_BASE_URL}'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if bad_pattern in content:
                # Replace "${API_BASE_URL}/api/..." with `${API_BASE_URL}/api/...`
                # We need to find the matching closing quote and change it to backtick
                import re
                new_content = re.sub(r'"\$\{API_BASE_URL\}([^"]*)"', r'`${API_BASE_URL}\1`', content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed quotes: {path}")
