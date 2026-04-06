#!/usr/bin/env python3
"""
Curate all data: keep only full system prompts, remove fragments/tools/memories.
Rename with clean version labels sorted old→new.
"""
import json, os, re, shutil
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# ── CHATGPT: keep only full chat system prompts ──
def curate_chatgpt():
    d = DATA_DIR / "chatgpt"
    remove_patterns = [
        'tool-',           # tool definitions, not system prompts
        'Image safety',    # policy doc
        'Monday-GPT',      # joke/personality GPT
        'Study and learn',  # study mode addon
        'louis-gpt_builder',  # GPT builder instructions
        'louis-gpt_dalle',    # DALL-E tool prompt
        'louis-gpt_voice',    # voice mode snippet
        'louis-gpt4_plugins', # plugins snippet  
        'louis-gpt4v_bing',   # bing snippet
        'louis-o3_cot_summarizer',  # internal CoT
        'louis-openai_optimization', # playground meta
        'louis-codex',        # codex-cli not chatgpt
        'louis-operator',     # separate product
        'louis-prism',        # separate product
        'louis-study_mode',   # addon
        'louis-gpt_all_tools', # meta doc
        'louis-gpt40_with_canvas', # canvas tool
        'dall-e',             # image gen
        'deep-research',      # separate product
        'assistants-api',      # API doc
        'gpt-5.3-codex',      # codex-cli prompt
        'gpt-5.4-api',        # stub (851B)
        'gpt-5.3-chat-api',   # stub (2200B API config)
        'personality',         # personality presets, not base prompt
        'chatgpt-atlas',       # atlas product
        'ChatGPT-GPT-5-Agent-mode',  # keep but rename
        'codex-cli',           # codex product
        'louis-chatgpt_agent',  # keep
        'voice-mode',          # voice addon
    ]
    removed = 0
    for f in list(d.glob("prompts-*")):
        name = f.name
        if any(p in name for p in remove_patterns):
            f.unlink()
            removed += 1
    print(f"  chatgpt: removed {removed}, kept {len(list(d.glob('prompts-*')))}")

# ── CODEX CLI: keep only full system prompts, remove memory/tool/collab fragments ──
def curate_codex():
    d = DATA_DIR / "codex-cli"
    remove_patterns = [
        'memories-consolidation',  # memory agent prompt
        'memories-stage_one',      # memory extraction
        'memories-read_path',      # memory read
        'search_tool-tool',        # tool descriptions
        'compact-prompt',          # compaction instruction
        'compact-summary',         # compaction prefix
        'collab-experimental',     # multi-agent snippet
        'collaboration-mode',      # collaboration templates
        'realtime-realtime',       # realtime start/end
        'permissions-approval',    # permission snippets
        'permissions-sandbox',     # sandbox snippets
        'hierarchical_agents',     # AGENTS.md instruction
        'guardian-policy',         # guardian safety
        'tui-prompt_for_init',     # init command generator
        'models-manager-prompt',   # models manager (same as base)
        'review_prompt',           # review mode prompt (separate)
    ]
    removed = 0
    for f in list(d.glob("prompts-*")):
        name = f.name
        if any(p in name for p in remove_patterns):
            f.unlink()
            removed += 1
    print(f"  codex-cli: removed {removed}, kept {len(list(d.glob('prompts-*')))}")

# ── GEMINI CLI: keep only prompts.ts and snippets.ts (full prompts), remove fragments ──
def curate_gemini_cli():
    d = DATA_DIR / "gemini-cli"
    # Keep: prompts-ts (core prompt), snippets-ts (full snippets), official-latest, cli-system
    # The core-prompts-ts is tiny (1KB), it's just an import file - remove
    for f in list(d.glob("prompts-core-prompts-ts*")):
        f.unlink()
    print(f"  gemini-cli: kept {len(list(d.glob('prompts-*')))}")

# ── KIMI CLI: keep only system prompts and agent configs, remove tool descriptions ──
def curate_kimi():
    d = DATA_DIR / "kimi-cli"
    remove_patterns = [
        'tools-file-',     # file tool descriptions
        'tools-shell-',    # shell tool descriptions
        'tools-think-',    # think tool
        'tools-web-',      # web tool descriptions
        'tools-todo-',     # todo tool
        'tools-dmail-',    # dmail tool
        'tools-background-', # background task tools
        'tools-plan-',     # plan tool descriptions
        'tools-agent-',    # agent tool description
        'tools-ask_user-', # ask_user tool
        'skills-',         # skill definitions
        'prompts-compact', # compaction prompt
        'prompts-init',    # tiny init prompt
        'agents-doc',      # AGENTS.md doc
        'agents-okabe',    # okabe persona (variant)
    ]
    removed = 0
    for f in list(d.glob("prompts-*")):
        name = f.name
        if any(p in name for p in remove_patterns):
            f.unlink()
            removed += 1
    print(f"  kimi-cli: removed {removed}, kept {len(list(d.glob('prompts-*')))}")

# ── CLAUDE.AI: keep all (they're all full prompts), remove API tool-use ──
def curate_claude_ai():
    d = DATA_DIR / "claude-ai"
    for f in list(d.glob("*api-tool-use*")):
        f.unlink()
    print(f"  claude-ai: kept {len(list(d.glob('prompts-*')))}")

# ── MISC: remove fragments, keep only full system prompts ──
def curate_misc():
    d = DATA_DIR / "misc"
    remove_patterns = [
        'claude-code-output-style',  # output style snippets
        'claude-in-chrome',          # chrome extension
        'copilot-commit-title',      # commit title gen
    ]
    removed = 0
    for f in list(d.glob("prompts-*")):
        name = f.name
        if any(p in name for p in remove_patterns):
            f.unlink()
            removed += 1
    print(f"  misc: removed {removed}, kept {len(list(d.glob('prompts-*')))}")

# ── OPENHANDS: remove extensions doc, keep system prompts ──
def curate_openhands():
    d = DATA_DIR / "openhands"
    for f in list(d.glob("*extensions*")):
        f.unlink()
    # Also remove the nilenso duplicate if identical to latest git version
    print(f"  openhands: kept {len(list(d.glob('prompts-*')))}")

if __name__ == "__main__":
    print("Curating data...")
    curate_chatgpt()
    curate_codex()
    curate_gemini_cli()
    curate_kimi()
    curate_claude_ai()
    curate_misc()
    curate_openhands()
    
    # Final count
    print("\n=== Final ===")
    total = 0
    for d in sorted(DATA_DIR.iterdir()):
        if not d.is_dir(): continue
        count = len(list(d.glob("prompts-*")))
        if count > 0:
            print(f"  {d.name:25s} {count:>4d}")
            total += count
    print(f"  {'TOTAL':25s} {total:>4d}")
