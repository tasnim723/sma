import os
import re

root_dir = r"c:\Users\LENOVO\Downloads\PROJET_SMA (2)\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend"
target_pattern = r'http://localhost:8000/api'
replacement = '${API_BASE_URL}/api'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            if target_pattern in content:
                new_content = content.replace(target_pattern, replacement)
                
                # Check if API_BASE_URL is imported, if not add it
                if 'API_BASE_URL' not in content:
                    # Look for where to insert import. Usually after other imports.
                    import_line = 'import { API_BASE_URL } from "@/lib/api"\n'
                    if 'import' in new_content:
                        # Find the first import and prepend to it? Or after the last one?
                        # Let's just prepend it to the top of the file for simplicity.
                        new_content = import_line + new_content
                
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {path}")
