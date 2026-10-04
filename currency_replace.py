import os
import re

target_dir = r"c:\course_marketplace\frontend\src"

patterns = [
    (r'`\$\$', r'`₹$'),      # template literal `$${...}` -> `₹${...}`
    (r'>\$(\{)', r'>₹\1'),    # jsx text >${...} -> >₹{...}
    (r'\(\$\)', r'(₹)'),      # label (Price ($)) -> Price (₹)
    (r'>\$([0-9])', r'>₹\1'), # jsx text >$10 -> >₹10
    (r'"\$', r'"₹'),          # inside strings like "$10" -> "₹10"
    (r"'\$'", r"'₹'"),        # single quotes
    (r' \$\$', ' ₹$'),        # space before `$${` 
    (r' \$\(?', ' ₹('),       # space before $( (like ` $(amount)`)
]

modified_files = []

for root, _, files in os.walk(target_dir):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            path = os.path.join(root, f)
            with open(path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            orig_content = content
            for pat, repl in patterns:
                content = re.sub(pat, repl, content)
            
            # Additional targeted string replacements
            content = content.replace("Price ($)", "Price (₹)")
            content = content.replace("Earnings = course.price", "Earnings = course.price") # noop
            
            if content != orig_content:
                with open(path, 'w', encoding='utf-8') as file:
                    file.write(content)
                modified_files.append(f)

print("Modified files:", modified_files)
