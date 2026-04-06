#!/usr/bin/env python3
"""Generate versions.json for each agent directory based on prompt files found."""

import json
import os
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

def parse_semver(version_str):
    """Parse semantic version for sorting."""
    parts = re.findall(r'\d+', version_str)
    return tuple(int(p) for p in parts) if parts else (0,)

def natural_sort_key(s):
    """Sort key that handles mixed strings/numbers naturally."""
    return [int(c) if c.isdigit() else c.lower() for c in re.split(r'(\d+)', s)]

def extract_version_from_filename(filename, agent_id):
    """Extract version string from a prompt filename."""
    name = filename
    # Remove extension
    for ext in ['.md', '.txt']:
        if name.endswith(ext):
            name = name[:-len(ext)]
    # Remove 'prompts-' prefix
    if name.startswith('prompts-'):
        name = name[len('prompts-'):]
    return name

def is_semver(version):
    """Check if version looks like semantic versioning."""
    return bool(re.match(r'^\d+\.\d+\.\d+$', version))

def generate_for_agent(agent_dir):
    """Generate versions.json for a single agent."""
    agent_id = agent_dir.name
    
    # Special case: claude-code already has versions.json from cchistory
    if agent_id == "claude-code":
        existing = agent_dir / "versions.json"
        if existing.exists():
            print(f"  {agent_id}: keeping existing versions.json")
            return
    
    # Find all prompt files
    prompt_files = sorted(
        [f.name for f in agent_dir.iterdir() if f.name.startswith('prompts-')],
        key=natural_sort_key
    )
    
    if not prompt_files:
        return
    
    versions = []
    for f in prompt_files:
        ver = extract_version_from_filename(f, agent_id)
        
        # Try to extract date from filename patterns like "2026-01-12_87_..."
        date_match = re.match(r'^(\d{4}-\d{2}-\d{2})', ver)
        date = date_match.group(1) if date_match else None
        
        # Also check "na_YYYY-MM-DD" pattern
        if not date:
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', ver)
            date = date_match.group(1) if date_match else None
        
        entry = {"version": ver, "file": f}
        if date:
            entry["date"] = date
        
        # Create a human-readable label
        label = ver.replace('-', ' ').replace('_', ' ').title()
        entry["label"] = label
        
        versions.append(entry)
    
    # Sort: semver-style if applicable, otherwise natural sort
    if versions and is_semver(versions[0]["version"]):
        versions.sort(key=lambda v: parse_semver(v["version"]))
    
    data = {"versions": versions}
    
    out_path = agent_dir / "versions.json"
    with open(out_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"  {agent_id}: {len(versions)} versions")

def generate_agents_json():
    """Generate the top-level agents.json registry."""
    agents = []
    
    agent_metadata = {
        "claude-code": {"name": "Claude Code", "provider": "Anthropic", "type": "coding-agent"},
        "claude-ai": {"name": "Claude.ai", "provider": "Anthropic", "type": "chat-assistant"},
        "cursor": {"name": "Cursor", "provider": "Cursor/Anysphere", "type": "coding-agent"},
        "codex-cli": {"name": "Codex CLI", "provider": "OpenAI", "type": "coding-agent"},
        "gemini-cli": {"name": "Gemini CLI", "provider": "Google", "type": "coding-agent"},
        "gemini-web": {"name": "Gemini Web", "provider": "Google", "type": "chat-assistant"},
        "grok": {"name": "Grok", "provider": "xAI", "type": "chat-assistant"},
        "chatgpt": {"name": "ChatGPT", "provider": "OpenAI", "type": "chat-assistant"},
        "openhands": {"name": "OpenHands", "provider": "Open Source", "type": "coding-agent"},
        "kimi-cli": {"name": "Kimi CLI", "provider": "Moonshot", "type": "coding-agent"},
        "jules": {"name": "Jules", "provider": "Google", "type": "coding-agent"},
        "perplexity": {"name": "Perplexity", "provider": "Perplexity", "type": "search-assistant"},
        "misc": {"name": "Other Agents", "provider": "Various", "type": "misc"},
    }
    
    for agent_dir in sorted(DATA_DIR.iterdir()):
        if not agent_dir.is_dir():
            continue
        
        agent_id = agent_dir.name
        versions_file = agent_dir / "versions.json"
        
        if not versions_file.exists():
            continue
        
        with open(versions_file) as f:
            versions_data = json.load(f)
        
        num_versions = len(versions_data.get("versions", []))
        if num_versions == 0:
            continue
        
        meta = agent_metadata.get(agent_id, {
            "name": agent_id.replace('-', ' ').title(),
            "provider": "Unknown",
            "type": "unknown"
        })
        
        agents.append({
            "id": agent_id,
            "name": meta["name"],
            "provider": meta["provider"],
            "type": meta["type"],
            "versionCount": num_versions,
        })
    
    with open(DATA_DIR / "agents.json", 'w') as f:
        json.dump({"agents": agents}, f, indent=2)
    
    print(f"\n  agents.json: {len(agents)} agents registered")

if __name__ == "__main__":
    for agent_dir in sorted(DATA_DIR.iterdir()):
        if agent_dir.is_dir():
            generate_for_agent(agent_dir)
    
    generate_agents_json()
