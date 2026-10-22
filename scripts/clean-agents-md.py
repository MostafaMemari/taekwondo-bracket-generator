#!/usr/bin/env python3
"""پاکسازی agents.md از نیم‌فاصله و همزه — طبق قانون خود پروژه.
خط های «غلط:» (نمونه های اشتباه برای آموزش) و خط های که خود کاراکتر را
نام می برند (ZWNJ / U+0654) مستثنی می مانند."""
import re

PATH = '/home/z/my-project/taekwondo-project/agents.md'
data = open(PATH, encoding='utf-8').read()

out_lines = []
changed = 0
for line in data.split('\n'):
    if 'غلط:' in line or 'ZWNJ' in line or 'U+0654' in line:
        out_lines.append(line)
        continue
    new = line.replace('\u200c', ' ').replace('\u0654', '')
    if new != line:
        changed += 1
    out_lines.append(new)

open(PATH, 'w', encoding='utf-8').write('\n'.join(out_lines))
print(f'normalized {changed} lines')

# sanity re-check
check = open(PATH, encoding='utf-8').read()
remaining_zwnj = 0
remaining_hamza = 0
for i, line in enumerate(check.split('\n'), 1):
    if 'غلط:' in line or 'ZWNJ' in line or 'U+0654' in line:
        continue
    remaining_zwnj += line.count('\u200c')
    remaining_hamza += line.count('\u0654')
print('outside exception lines — zwnj:', remaining_zwnj, 'hamza:', remaining_hamza)
