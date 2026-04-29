import os

path = r'c:\marketing\public\index.html'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Remove Lucide
content = content.replace('<script src="/js/vendor/lucide.min.js"></script>', '')
# Remove duplicate link
content = content.replace('<link rel="icon" href="/assets/img/logo.png">\n    <link rel="icon" href="/assets/img/logo.png">', '<link rel="icon" href="/assets/img/logo.png">')

# Inline hero icons
facebook_svg = '<svg width="48" height="48" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
instagram_svg = '<svg width="48" height="48" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>'

content = content.replace('<i data-lucide="facebook" class="split-hero-icon"></i>', facebook_svg)
content = content.replace('<i data-lucide="instagram" class="split-hero-icon"></i>', instagram_svg)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
