#!/usr/bin/env python3
"""Remove stub/blank/tiny prompt files that aren't full system prompts."""

import os, re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

MIN_SIZE = 500  # bytes - anything below is definitely a stub/fragment

# Patterns that indicate a file is NOT a full system prompt
STUB_PATTERNS = [
    re.compile(r'^Knowledge cutoff:', re.M),  # bare API header without substance
    re.compile(r'^\s*```\s*markdown\s*$', re.M),  # just a markdown wrapper
    re.compile(r'^Yap score', re.M),
    re.compile(r'^# Valid channels:', re.M),
    re.compile(r'^# Juice:', re.M),
]

def is_stub(path: Path) -> tuple[bool, str]:
    """Check if file is a stub/fragment. Returns (is_stub, reason)."""
    size = path.stat().st_size
    
    # Very small files are fragments
    if size < MIN_SIZE:
        return True, f"too small ({size}B)"
    
    content = path.read_text(errors='replace')
    lines = [l for l in content.strip().split('\n') if l.strip()]
    
    # Files with only 1-3 meaningful lines under 1KB
    if size < 1000 and len(lines) <= 3:
        return True, f"stub ({len(lines)} lines, {size}B)"
    
    # Check for known stub patterns in small files
    if size < 1000:
        for pat in STUB_PATTERNS:
            if pat.search(content):
                # Only if the file is JUST the stub (not a real prompt that happens to contain it)
                if size < 800:
                    return True, f"stub pattern match ({size}B)"
    
    return False, ""

removed = 0
kept = 0
for agent_dir in sorted(DATA_DIR.iterdir()):
    if not agent_dir.is_dir():
        continue
    
    agent_removed = 0
    for f in sorted(agent_dir.glob("prompts-*")):
        is_s, reason = is_stub(f)
        if is_s:
            f.unlink()
            agent_removed += 1
    
    if agent_removed:
        remaining = len(list(agent_dir.glob("prompts-*")))
        print(f"  {agent_dir.name}: removed {agent_removed} stubs ({remaining} remaining)")
        removed += agent_removed

print(f"\nTotal removed: {removed}")

# Final count
total = 0
for agent_dir in sorted(DATA_DIR.iterdir()):
    if not agent_dir.is_dir():
        continue
    count = len(list(agent_dir.glob("prompts-*")))
    if count > 0:
        total += count
print(f"Total remaining: {total}")
