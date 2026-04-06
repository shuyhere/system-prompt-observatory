#!/usr/bin/env python3
"""Reorganize versions.json: clean labels, add source tags, sort newest-first."""

import json, re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

def detect_source(stem):
    if stem.startswith('juju-'): return 'jujumilk3'
    if stem.startswith('louis-'): return 'LouisShark'
    if stem.startswith('gist-'): return 'gist'
    if stem.startswith('api-'): return 'API'
    if stem.startswith('old-'): return 'archive'
    return 'leak'

def extract_date(stem):
    # YYYYMMDD pattern
    m = re.search(r'(\d{4})(\d{2})(\d{2})(?!\d)', stem)
    if m:
        y, mo, d = m.groups()
        if 2020 <= int(y) <= 2030 and 1 <= int(mo) <= 12:
            return f"{y}-{mo}-{d}"
    # YYYY-MM-DD pattern
    m = re.search(r'(\d{4})-(\d{2})-(\d{2})', stem)
    if m:
        return m.group(0)
    return None

def clean_label(stem, source, date):
    """Build a human-readable label."""
    label = stem
    # Strip source prefixes
    for pfx in ['juju-openai-', 'juju-anthropic-', 'juju-xAI-', 'juju-', 'louis-', 'api-', 'old-']:
        if label.startswith(pfx):
            label = label[len(pfx):]
            break
    
    # Remove date suffixes like _20250807 or -2025-09-03
    label = re.sub(r'[_-]\d{8}$', '', label)
    label = re.sub(r'-\d{4}-\d{2}-\d{2}-[a-f0-9]{7}$', '', label)  # git hash
    
    # Capitalize nicely
    label = label.replace('-', ' ').replace('_', ' ')
    # Fix common patterns
    label = re.sub(r'\bgpt\b', 'GPT', label, flags=re.I)
    label = re.sub(r'\bgpt (\d)', r'GPT-\1', label)
    label = re.sub(r'\bo(\d)', r'o\1', label)
    label = re.sub(r'\bchatgpt\b', 'ChatGPT', label, flags=re.I)
    label = re.sub(r'\bcodex\b', 'Codex', label, flags=re.I)
    label = re.sub(r'\bgrok\b', 'Grok', label, flags=re.I)
    label = re.sub(r'\bclaude\b', 'Claude', label, flags=re.I)
    label = re.sub(r'\bsonnet\b', 'Sonnet', label, flags=re.I)
    label = re.sub(r'\bopus\b', 'Opus', label, flags=re.I)
    label = re.sub(r'\bhaiku\b', 'Haiku', label, flags=re.I)
    label = re.sub(r'\bapi\b', 'API', label, flags=re.I)
    label = re.sub(r'\bcli\b', 'CLI', label, flags=re.I)
    label = re.sub(r'\bios\b', 'iOS', label, flags=re.I)
    label = re.sub(r'\bdalle?\b', 'DALL-E', label, flags=re.I)
    label = re.sub(r'\bwhatsapp\b', 'WhatsApp', label, flags=re.I)
    label = label.strip()
    
    # Build final label
    parts = [label]
    if date:
        parts.append(f"({date})")
    parts.append(f"[{source}]")
    return ' '.join(parts)


def organize_agent(agent_id, strip_prefixes=None):
    agent_dir = DATA_DIR / agent_id
    if not agent_dir.exists():
        return
    
    strip_prefixes = strip_prefixes or []
    versions = []
    
    for f in sorted(agent_dir.glob("prompts-*")):
        fn = f.name
        stem = fn.replace('prompts-', '')
        # Remove extension
        for ext in ['.md', '.txt']:
            if stem.endswith(ext):
                stem = stem[:-len(ext)]
        
        source = detect_source(stem)
        date = extract_date(stem)
        
        # For git-history files, detect source
        if re.search(r'-\d{4}-\d{2}-\d{2}-[a-f0-9]{7}$', stem):
            source = 'git history'
        
        # Official source files
        if any(x in stem for x in ['official', 'core-prompts', 'snippets-ts', 'codeact']):
            source = 'official'
        
        label = clean_label(stem, source, date)
        
        entry = {
            "version": stem,
            "file": fn,
            "label": label,
        }
        if date:
            entry["date"] = date
        versions.append(entry)
    
    # Sort: newest first, undated at the end
    versions.sort(key=lambda v: v.get('date', '0000-00-00'), reverse=True)
    
    with open(agent_dir / "versions.json", 'w') as f:
        json.dump({"versions": versions}, f, indent=2)
    print(f"  {agent_id}: {len(versions)} versions")


if __name__ == "__main__":
    print("Organizing all agents...")
    
    # Skip claude-code (uses cchistory's own versions.json)
    for agent_dir in sorted(DATA_DIR.iterdir()):
        if not agent_dir.is_dir():
            continue
        agent_id = agent_dir.name
        if agent_id == 'claude-code':
            print(f"  claude-code: skipped (cchistory)")
            continue
        organize_agent(agent_id)
    
    print("\nDone. Run generate-versions.py to update agents.json")
