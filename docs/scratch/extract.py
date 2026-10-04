import ast
import os
import glob

router_dir = r'c:\course_marketplace\backend\app\routers'
docs_dir = r'c:\course_marketplace\docs'
os.makedirs(docs_dir, exist_ok=True)
files = sorted(glob.glob(os.path.join(router_dir, '*.py')))

md_content = '# API Reference\n\n'
counts = {}

for fpath in files:
    fname = os.path.basename(fpath)
    if fname == '__init__.py': continue
    
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
    except:
        continue
        
    endpoints = []
    
    for node in ast.walk(tree):
        if getattr(node, '__class__', None) in (ast.FunctionDef, ast.AsyncFunctionDef):
            methods_paths = []
            roles = []
            
            for dec in node.decorator_list:
                if isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute):
                    if isinstance(dec.func.value, ast.Name) and dec.func.value.id == 'router':
                        method = dec.func.attr.upper()
                        path = 'unknown'
                        if dec.args and isinstance(dec.args[0], ast.Constant):
                            path = dec.args[0].value
                        methods_paths.append((method, path))
            
            defaults = getattr(node.args, 'defaults', []) + getattr(node.args, 'kw_defaults', [])
            for default in defaults:
                if default and isinstance(default, ast.Call) and getattr(default.func, 'id', '') == 'Depends':
                    if default.args and isinstance(default.args[0], ast.Call) and getattr(default.args[0].func, 'id', '') == 'require_role':
                        role_arg = default.args[0].args[0]
                        if isinstance(role_arg, ast.List):
                            roles.extend([getattr(elt, 'value', '') for elt in role_arg.elts])
                        elif isinstance(role_arg, ast.Constant):
                            roles.append(role_arg.value)
                            
            if methods_paths:
                for m, p in methods_paths:
                    endpoints.append({'method': m, 'path': p, 'roles': roles, 'name': node.name})
                    
    counts[fname] = len(endpoints)
    if endpoints:
        md_content += f'## {fname}\n\n'
        md_content += '| Method | Path | Function | Required Roles |\n'
        md_content += '|--------|------|----------|----------------|\n'
        for ep in endpoints:
            roles_str = ', '.join(ep['roles']) if ep['roles'] else 'None'
            md_content += f"| {ep['method']} | `{ep['path']}` | `{ep['name']}` | {roles_str} |\n"
        md_content += '\n'

with open(os.path.join(docs_dir, 'API_REFERENCE.md'), 'w', encoding='utf-8') as f:
    f.write(md_content)

for fname, count in counts.items():
    print(f'{fname}: {count} endpoints')
