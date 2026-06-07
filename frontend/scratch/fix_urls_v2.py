import os
import re

root_dir = r"c:\Users\LENOVO\Downloads\PROJET_SMA (2)\PROJET_SMA\pfe-main (2)\pfe-main\pfe-main\frontend"
# Target both http and https versions of localhost:8000
target_pattern = r'http://localhost:8000/api'
target_pattern_v2 = r'https://localhost:8000/api'

# Replacement should use backticks for template literals
replacement = '`${API_BASE_URL}/api`'

for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith(('.tsx', '.ts', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Simplified replacement logic:
            # If it's "http://localhost:8000/api", replace with `${API_BASE_URL}/api`
            new_content = content
            if f'"{target_pattern}' in content:
                new_content = new_content.replace(f'"{target_pattern}', f'`${{API_BASE_URL}}/api')
                # Clean up closing quote
                # This is tricky because the closing quote might be at the end of the URL.
                # Let's use regex instead.
            
            # Using regex to find "http://localhost:8000/api/..." and replace with `${API_BASE_URL}/api/...`
            new_content = re.sub(r'"https?://localhost:8000/api/([^"]*)"', r'`${API_BASE_URL}/api/\1`', new_content)
            # Handle trailing slash versions
            new_content = re.sub(r'"https?://localhost:8000/api"', r'`${API_BASE_URL}/api`', new_content)
            
            if new_content != content:
                # Add import if missing
                if 'API_BASE_URL' not in content:
                    import_line = 'import { API_BASE_URL } from "@/lib/api"\n'
                    new_content = import_line + new_content
                
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Fixed: {path}")
