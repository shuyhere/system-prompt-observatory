#!/usr/bin/env python3
"""
Analyze Claude Code system prompt evolution across all versions.
Uses tiktoken for accurate token counts and improved classification.
"""
import json, re, difflib
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "claude-code"
OUT_FILE = Path(__file__).parent.parent / "data" / "claude-code-analysis.json"

# Use tiktoken for accurate token counting
try:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")
    def count_tokens(text): return len(enc.encode(text))
except ImportError:
    def count_tokens(text): return len(text.split()) * 4 // 3  # rough fallback

def parse_semver(v):
    return tuple(int(x) for x in v.split('.'))

# ── Improved component classification ──
# Each component has header patterns (strong) and content patterns
COMPONENTS = {
    'Identity & Role': {
        'headers': [r'# System Prompt', r'# Claude Code Version', r'# User Message'],
        'patterns': [r'you are (?:a |an )?(?:claude|interactive|coding)', r'built on', r'agent sdk',
                     r'billing.header', r'cc_version', r'deferred tools', r'skills are available',
                     r'system-reminder', r'write a haiku'],
    },
    'Safety & Security': {
        'headers': [],
        'patterns': [r'IMPORTANT:', r'must NEVER', r'security vulnerab', r'owasp', r'injection',
                     r'prompt injection', r'malicious', r'destructive technique', r'DoS attack',
                     r'mass targeting', r'supply chain', r'detection evasion',
                     r'be careful not to introduce', r'insecure code'],
    },
    'System & Infrastructure': {
        'headers': [r'## System'],
        'patterns': [r'tool use is displayed', r'permission mode', r'tool results',
                     r'system-reminder.*tags', r'hooks.*shell command', r'user-prompt-submit',
                     r'automatically compress', r'context limit'],
    },
    'Task Execution': {
        'headers': [r'## Doing tasks'],
        'patterns': [r'software engineering tasks', r'solving bugs', r'adding new functionality',
                     r'refactoring', r'unclear.*instruction', r'ambitious tasks',
                     r'read it first', r'understand existing', r'approach fails',
                     r'diagnose why', r'do not create files unless',
                     r'avoid giving time estimates'],
    },
    'Coding Principles': {
        'headers': [],
        'patterns': [r"don't add features", r"don't add error handling", r"don't create helpers",
                     r'no speculative', r'premature abstraction', r'three similar lines',
                     r'backwards.compatibility', r'only add comments', r'hypothetical future',
                     r'no unnecessary', r'minimize file creation'],
    },
    'Caution & Confirmation': {
        'headers': [r'## Executing actions with care'],
        'patterns': [r'reversibility', r'blast radius', r'hard to reverse', r'confirm',
                     r'force.push', r'rm -rf', r'git reset --hard', r'shared.*state',
                     r'visible to others', r'measure twice', r'cut once', r'when in doubt',
                     r'investigate before', r'user.*in-progress work', r'root cause'],
    },
    'Tool Usage Policy': {
        'headers': [r'## Using your tools'],
        'patterns': [r'do NOT use the Bash', r'dedicated tool', r'use Read instead',
                     r'use Edit instead', r'use Write instead', r'use Glob instead',
                     r'use Grep instead', r'reserve.*Bash', r'TodoWrite',
                     r'parallel.*tool', r'multiple tools', r'independent tool calls'],
    },
    'Tool Definitions': {
        'headers': [r'## (?:Bash|Edit|Glob|Grep|Read|Write|Agent|Skill|ToolSearch|TodoWrite)',
                    r'# Tools'],
        'patterns': [r'input_schema', r'"type":\s*"(?:string|integer|boolean|object|array)"',
                     r'"description":', r'"required":', r'"properties":',
                     r'#### Writing the prompt', r'subagent_type'],
    },
    'Output Style & Tone': {
        'headers': [r'## Tone and style', r'## Output efficiency'],
        'patterns': [r'emoji', r'concise', r'short and concise', r'brief and direct',
                     r'go straight', r'filler words', r'preamble', r'one sentence',
                     r'markdown', r'monospace', r'github.flavored', r'code block',
                     r'file_path:line_number', r'owner/repo#'],
    },
    'Memory System': {
        'headers': [r'## auto memory', r'### Types of memory', r'### What NOT to save',
                    r'### How to save', r'### When to access', r'### Before recommending',
                    r'### Memory and other'],
        'patterns': [r'persistent.*memory', r'file.based memory', r'memory system',
                     r'user.*memory', r'feedback.*memory', r'project.*memory',
                     r'reference.*memory', r'when_to_save', r'how_to_use',
                     r'save.*immediately', r'remember something'],
    },
    'Environment': {
        'headers': [r'## Environment'],
        'patterns': [r'operating system', r'working directory', r'home directory',
                     r'platform', r'shell:', r'uname', r'hostname'],
    },
    'Git & PR Workflow': {
        'headers': [r'### Committing changes', r'### Creating pull requests',
                    r'### Other common operations'],
        'patterns': [r'git commit', r'git push', r'git diff', r'git log', r'git status',
                     r'pull request', r'PR title', r'PR body', r'conventional commit',
                     r'Co-Authored-By', r'commit message'],
    },
    'Session & Agents': {
        'headers': [r'## Session-specific'],
        'patterns': [r'Agent tool', r'subagent_type=Explore', r'Glob or Grep directly',
                     r'slash command', r'Skill tool', r'codebase.*exploration',
                     r'AskUserQuestion', r'user-invocable'],
    },
}

def classify_section(text):
    """Classify a text section into components. Returns dict of {component: score}."""
    scores = {}
    text_lower = text.lower()
    first_line = text.split('\n')[0]
    
    for comp, rules in COMPONENTS.items():
        score = 0
        for hdr in rules['headers']:
            if re.search(hdr, first_line, re.IGNORECASE):
                score += 10
        for pat in rules['patterns']:
            matches = re.findall(pat, text, re.IGNORECASE)
            score += len(matches)
        if score > 0:
            scores[comp] = score
    
    return scores

def classify_prompt(text):
    """Break prompt into sections and classify each."""
    sections = re.split(r'\n(?=#{1,4}\s)', text)
    totals = {}
    total_tokens = 0
    
    for section in sections:
        if not section.strip():
            continue
        tokens = count_tokens(section)
        total_tokens += tokens
        scores = classify_section(section)
        
        if not scores:
            totals['Uncategorized'] = totals.get('Uncategorized', 0) + tokens
        else:
            total_score = sum(scores.values())
            for comp, score in scores.items():
                share = int(tokens * score / total_score)
                totals[comp] = totals.get(comp, 0) + share
    
    # Convert to percentages
    if total_tokens == 0:
        return {}, 0
    pcts = {k: round(v / total_tokens * 100, 1) for k, v in totals.items() if v > 0}
    return pcts, total_tokens

def edit_distance_lines(a, b):
    a_lines = a.splitlines()
    b_lines = b.splitlines()
    diff = list(difflib.unified_diff(a_lines, b_lines, lineterm=''))
    added = sum(1 for l in diff if l.startswith('+') and not l.startswith('+++'))
    removed = sum(1 for l in diff if l.startswith('-') and not l.startswith('---'))
    return added, removed

# ── Main ──
files = sorted(DATA_DIR.glob("prompts-*.md"), key=lambda f: parse_semver(f.stem.replace('prompts-', '')))

versions = []
prev_text = None
prev_ver = None

for f in files:
    ver = f.stem.replace('prompts-', '')
    text = f.read_text(errors='replace')
    
    tokens = count_tokens(text)
    components, _ = classify_prompt(text)
    
    entry = {
        'version': ver,
        'bytes': len(text),
        'tokens': tokens,
        'components': components,
    }
    
    if prev_text is not None:
        added, removed = edit_distance_lines(prev_text, text)
        entry['diff_from'] = prev_ver
        entry['lines_added'] = added
        entry['lines_removed'] = removed
        entry['lines_changed'] = added + removed
    else:
        entry['lines_added'] = 0
        entry['lines_removed'] = 0
        entry['lines_changed'] = 0
    
    versions.append(entry)
    prev_text = text
    prev_ver = ver

# Milestones
milestones = sorted(
    [v for v in versions if v['lines_changed'] > 50],
    key=lambda v: v['lines_changed'], reverse=True
)

first, last = versions[0], versions[-1]
summary = {
    'total_versions': len(versions),
    'first_version': first['version'],
    'last_version': last['version'],
    'token_growth': {
        'first': first['tokens'],
        'last': last['tokens'],
        'growth_pct': round((last['tokens'] - first['tokens']) / first['tokens'] * 100, 1),
    },
    'component_shift': {
        'first': first['components'],
        'last': last['components'],
    },
    'top_milestones': [{'version': m['version'], 'lines_changed': m['lines_changed'],
                        'added': m['lines_added'], 'removed': m['lines_removed']} for m in milestones[:15]],
}

OUT_FILE.write_text(json.dumps({'summary': summary, 'versions': versions}, indent=2))
print(f"Done: {len(versions)} versions")
print(f"  Tokens: {first['tokens']} -> {last['tokens']} ({summary['token_growth']['growth_pct']}%)")
print(f"  First components: {first['components']}")
print(f"  Last  components: {last['components']}")
