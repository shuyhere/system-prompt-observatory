#!/usr/bin/env python3
"""Remove duplicate files and clean up naming across all agents."""

import hashlib, os, json
from pathlib import Path
from collections import defaultdict

DATA_DIR = Path(__file__).parent.parent / "data"

def md5(path):
    return hashlib.md5(path.read_bytes()).hexdigest()

removed = 0
for agent_dir in sorted(DATA_DIR.iterdir()):
    if not agent_dir.is_dir():
        continue
    
    # Group files by content hash
    hash_to_files = defaultdict(list)
    for f in sorted(agent_dir.glob("prompts-*")):
        h = md5(f)
        hash_to_files[h].append(f)
    
    agent_removed = 0
    for h, files in hash_to_files.items():
        if len(files) <= 1:
            continue
        
        # Keep the one with the most specific name (dated > undated, git history > plain)
        def score(f):
            name = f.name
            s = 0
            # Prefer dated versions
            if any(c.isdigit() for c in name[-20:]):
                s += 1
            # Prefer git history (has commit hash)
            import re
            if re.search(r'-[a-f0-9]{7}\.md$', name):
                s += 2
            # Prefer shorter names (cleaner)
            s -= len(name) / 1000
            return s
        
        files.sort(key=score, reverse=True)
        keep = files[0]
        for dup in files[1:]:
            dup.unlink()
            agent_removed += 1
    
    if agent_removed:
        print(f"  {agent_dir.name}: removed {agent_removed} duplicates")
        removed += agent_removed

print(f"\nTotal removed: {removed}")

# Recount
total = 0
for agent_dir in sorted(DATA_DIR.iterdir()):
    if not agent_dir.is_dir():
        continue
    count = len(list(agent_dir.glob("prompts-*")))
    if count > 0:
        print(f"  {agent_dir.name}: {count}")
        total += count
print(f"  TOTAL: {total}")
