import os
import re

target_dir = r"c:\course_marketplace\frontend\src"

modified_files = []

for root, _, files in os.walk(target_dir):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            # Fix the corrupted template literals
            content = content.replace('₹({', '${')
            content = content.replace('₹(', '$(')
            
            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                modified_files.append(f)

print("Fixed files:", modified_files)
