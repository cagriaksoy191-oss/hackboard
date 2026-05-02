import sys

def read_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"File: {filepath}")
            print(f"Length: {len(content)} characters")
            print("--- START ---")
            print(content)
            print("--- END ---")
    except Exception as e:
        print(f"Error reading {filepath}: {e}", file=sys.stderr)

read_file('client/src/pages/Team.jsx')
