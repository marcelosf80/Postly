import os
import re

path = r'c:\marketing\public\js\app.js'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Global Mojibake Fix
replacements = {
    'Ã‚Â¡': '¡',
    'ÃƒÂ³': 'ó',
    'ÃƒÂ©': 'é',
    'ÃƒÂ­': 'í',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ±': 'ñ',
    'Ã°Å¸â€™Â³': '💳',
    'Ã¢Å"â€¢': '✕',
    'Ã°Å¸â€ºÂ¡Ã¯Â¸Â ': '🛡️',
    'Ã°Å¸â€œÂ¸': '📸',
    'Ã°Å¸â€œËœ': '📘',
    'Ã°Å¸â€œâ€¦': '📅',
    'Ã°Å¸Å¡â‚¬': '🚀',
    'Ã¢Å“Â Ã¯Â¸Â ': '✍️',
    'Ã°Å¸â€”â€˜Ã¯Â¸Â ': '🗑️',
    'Ã¢Â­Â ': '⭐',
    'Ã°Å¸â€¢â€™': '🕒',
    'Ã¢â‚¬â€': '—',
    'Ã‚Â¿': '¿',
    'ÃƒÂº': 'ú',
    'ÃƒÅ¡': 'Ú',
    'ÃƒÂ³': 'ó',
    'Ã°Å¸Å’Â ': '🌐',
    'Ã°Å¸â€˜Â¥': '👥',
    'Ã¢â€žÂ¹Ã¯Â¸Â ': 'ℹ️',
    'Ã°Å¸â€œÅ ': '📊',
    'Ã°Å¸â€ â€”': '🔗',
    'Ã°Å¸â€ºÂ Ã¯Â¸Â ': '🛠️',
    'Ã°Å¸â€ Â ': '🔍',
    'Ã°Å¸â€œÂ±': '📱',
    'Ã¢â€ â€”': '→'
}
for k, v in replacements.items():
    content = content.replace(k, v)

# 2. Global Lucide -> renderIcons
content = content.replace("if (typeof lucide !== 'undefined') lucide.createIcons();", "renderIcons();")
content = content.replace("if (typeof lucide !== 'undefined') lucide.createIcons()", "renderIcons()")
content = content.replace("lucide.createIcons()", "renderIcons()")

# 3. Consolidate renderAdmin
# We'll remove the second renderAdmin block which starts around line 1949
# and any subsequent helper functions that might be duplicates.
# Actually, let's keep the helpers if they are unique.

# For now, let's just remove the exact duplicate function definition of renderAdmin.
# We'll use a regex to find the second occurrence.

matches = list(re.finditer(r'async function renderAdmin\(\) \{', content))
if len(matches) > 1:
    second_start = matches[1].start()
    # Find the end of this function (this is tricky with nested braces, but we'll try)
    # Since we know the structure, we can look for the next "async function" or end of file
    next_func = content.find('async function', second_start + 1)
    if next_func == -1:
        content = content[:second_start]
    else:
        # Check if the next function is loadAdminStats, if so, keep it but remove renderAdmin
        content = content[:second_start] + content[next_func:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
