#!/usr/bin/env python3
"""بازسازی download/taekwondo-bracket-project.zip — سورس + dist + dist-single."""
import os
import zipfile

ROOT = '/home/z/my-project'
OUT = '/home/z/my-project/download/taekwondo-bracket-project.zip'

INCLUDE_TOP = {
    'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.app.json',
    'tsconfig.node.json', 'index.html', 'vite.config.ts', 'vite.singlefile.config.ts',
    'agents.md', 'README.md', '.oxlintrc.json',
}
INCLUDE_DIRS = ['vite-plugins', 'public', 'scripts', 'src', 'dist', 'dist-single']
EXCLUDE_NAMES = {'seed-single.html'}
EXCLUDE_EXT = {'.log', '.pdf', '.png'}

if os.path.exists(OUT):
    os.remove(OUT)

count = 0
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for name in sorted(INCLUDE_TOP):
        path = os.path.join(ROOT, name)
        if os.path.isfile(path):
            z.write(path, name)
            count += 1
    for folder in INCLUDE_DIRS:
        base = os.path.join(ROOT, folder)
        for dirpath, dirnames, filenames in os.walk(base):
            # ابزار اتصال و وابستگی های آن — جزو تحویل پروژه نیست
            dirnames[:] = [d for d in sorted(dirnames) if d not in {'node_modules', 'git-ssh-bridge', 'keys'}]
            for filename in sorted(filenames):
                if filename in EXCLUDE_NAMES or os.path.splitext(filename)[1] in EXCLUDE_EXT:
                    continue
                full = os.path.join(dirpath, filename)
                rel = os.path.relpath(full, ROOT)
                z.write(full, rel)
                count += 1

size = os.path.getsize(OUT) / 1024 / 1024
print(f'{OUT} rewritten: {count} files, {size:.2f} MB')
