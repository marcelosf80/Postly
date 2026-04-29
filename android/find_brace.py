import sys
import re

if len(sys.argv) < 2:
    print("Usage: python find_brace.py <file_path>")
    sys.exit(1)

file_path = sys.argv[1]

with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Naive cleanup
text = re.sub(r'//.*', '', text)
text = re.sub(r'/\*[\s\S]*?\*/', lambda m: '\n' * m.group(0).count('\n'), text)
text = re.sub(r'\'[^\']*\'', '""', text)
text = re.sub(r'\"[^\"]*\"', '""', text)
text = re.sub(r'\`[\s\S]*?\`', lambda m: '`' + ('\n' * m.group(0).count('\n')) + '`', text)

balance = 0
lines = text.split('\n')
for i, line in enumerate(lines):
    for char in line:
        if char == '{':
            balance += 1
            if balance == 1:
                print(f"L{i+1} OPEN: {line.strip()[:40]}")
        elif char == '}':
            balance -= 1
            if balance == 0:
                print(f"L{i+1} CLOSE")
            if balance < 0:
                print(f"L{i+1} ERROR: Negative balance")
                balance = 0

print(f"Final balance: {balance}")
