#!/bin/bash
# Import prompts from all sources into data/ directory
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"

echo "=== System Prompt Observatory: Data Import ==="

# ─────────────────────────────────────────────────────
# 1. Claude Code from cchistory (250+ versions)
# ─────────────────────────────────────────────────────
echo ""
echo "--- Importing Claude Code from cchistory.mariozechner.at ---"
CC_DIR="$DATA_DIR/claude-code"

# Fetch versions list
VERSIONS_JSON=$(curl -s 'https://cchistory.mariozechner.at/data/versions.json')
echo "$VERSIONS_JSON" > "$CC_DIR/versions.json"

# Count versions
NUM_VERSIONS=$(echo "$VERSIONS_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['versions']))")
echo "Found $NUM_VERSIONS Claude Code versions"

# Download each prompt file
echo "$VERSIONS_JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for v in data['versions']:
    print(v['version'])
" | while read -r version; do
    OUTFILE="$CC_DIR/prompts-${version}.md"
    if [ ! -f "$OUTFILE" ]; then
        echo "  Downloading prompts-${version}.md..."
        curl -s "https://cchistory.mariozechner.at/data/prompts-${version}.md" -o "$OUTFILE"
        sleep 0.1
    fi
done
echo "Claude Code: done"

# ─────────────────────────────────────────────────────
# 2. From system_prompts_leaks repo
# ─────────────────────────────────────────────────────
LEAKS_DIR="/tmp/system_prompts_leaks"
if [ ! -d "$LEAKS_DIR" ]; then
    echo ""
    echo "--- Cloning system_prompts_leaks ---"
    git clone --depth 1 https://github.com/asgeirtj/system_prompts_leaks "$LEAKS_DIR"
fi

# --- Claude.ai ---
echo ""
echo "--- Importing Claude.ai prompts ---"
CLAUDE_AI_DIR="$DATA_DIR/claude-ai"
declare -A CLAUDE_AI_FILES=(
    ["opus-4.6"]="$LEAKS_DIR/Anthropic/claude-opus-4.6.md"
    ["opus-4.6-no-tools"]="$LEAKS_DIR/Anthropic/claude-opus-4.6-no-tools.md"
    ["sonnet-4.6"]="$LEAKS_DIR/Anthropic/claude-sonnet-4.6.md"
    ["sonnet-4.6-no-tools"]="$LEAKS_DIR/Anthropic/claude-sonnet-4.6-no-tools.md"
    ["opus-4.5"]="$LEAKS_DIR/Anthropic/old/claude-opus-4.5.md"
    ["sonnet-4"]="$LEAKS_DIR/Anthropic/old/claude-sonnet-4.md"
    ["sonnet-4.5"]="$LEAKS_DIR/Anthropic/old/claude-4.5-sonnet.md"
    ["opus-4.1-thinking"]="$LEAKS_DIR/Anthropic/old/claude-4.1-opus-thinking.md"
    ["sonnet-3.7"]="$LEAKS_DIR/Anthropic/old/claude-3.7-sonnet.md"
)
for ver in "${!CLAUDE_AI_FILES[@]}"; do
    src="${CLAUDE_AI_FILES[$ver]}"
    if [ -f "$src" ]; then
        cp "$src" "$CLAUDE_AI_DIR/prompts-${ver}.md"
        echo "  Copied claude-ai/$ver"
    fi
done

# --- Grok ---
echo ""
echo "--- Importing Grok prompts ---"
GROK_DIR="$DATA_DIR/grok"
for f in "$LEAKS_DIR"/xAI/grok-*.md; do
    basename=$(basename "$f" .md)
    ver="${basename#grok-}"
    # Skip non-version files
    case "$ver" in
        account|api|personas|com-post-new-safety-instructions) continue ;;
    esac
    cp "$f" "$GROK_DIR/prompts-${ver}.md"
    echo "  Copied grok/$ver"
done

# --- Gemini Web ---
echo ""
echo "--- Importing Gemini Web prompts ---"
GEMINI_WEB_DIR="$DATA_DIR/gemini-web"
for f in "$LEAKS_DIR"/Google/gemini-*.md; do
    basename=$(basename "$f" .md)
    # Skip CLI
    [[ "$basename" == *"CLI"* ]] && continue
    ver="${basename#gemini-}"
    cp "$f" "$GEMINI_WEB_DIR/prompts-${ver}.md"
    echo "  Copied gemini-web/$ver"
done

# --- ChatGPT / OpenAI ---
echo ""
echo "--- Importing ChatGPT/OpenAI prompts ---"
CHATGPT_DIR="$DATA_DIR/chatgpt"
for f in "$LEAKS_DIR"/OpenAI/o3.md "$LEAKS_DIR"/OpenAI/o4-mini.md "$LEAKS_DIR"/OpenAI/o4-mini-high.md; do
    if [ -f "$f" ]; then
        basename=$(basename "$f" .md)
        cp "$f" "$CHATGPT_DIR/prompts-${basename}.md"
        echo "  Copied chatgpt/$basename"
    fi
done
# GPT-5.2 codex from nilenso
if [ -f "/tmp/long-prompts-analysis/data/prompts/filtered/2026-01-12_87_gpt-5.2-codex_prompt.txt" ]; then
    cp "/tmp/long-prompts-analysis/data/prompts/filtered/2026-01-12_87_gpt-5.2-codex_prompt.txt" "$CHATGPT_DIR/prompts-gpt-5.2-codex.md"
    echo "  Copied chatgpt/gpt-5.2-codex"
fi

# --- Jules ---
echo ""
echo "--- Importing Jules prompt ---"
JULES_DIR="$DATA_DIR/jules"
if [ -f "$LEAKS_DIR/Google/jules.md" ]; then
    cp "$LEAKS_DIR/Google/jules.md" "$JULES_DIR/prompts-latest.md"
    echo "  Copied jules/latest"
fi

# --- Perplexity ---
echo ""
echo "--- Importing Perplexity prompts ---"
PERP_DIR="$DATA_DIR/perplexity"
for f in "$LEAKS_DIR"/Perplexity/*.md; do
    basename=$(basename "$f" .md)
    cp "$f" "$PERP_DIR/prompts-${basename}.md"
    echo "  Copied perplexity/$basename"
done

# ─────────────────────────────────────────────────────
# 3. From nilenso long-prompts-analysis (filtered)
# ─────────────────────────────────────────────────────
NILENSO_DIR="/tmp/long-prompts-analysis/data/prompts/filtered"
if [ ! -d "$NILENSO_DIR" ]; then
    echo ""
    echo "--- Cloning long-prompts-analysis ---"
    git clone --depth 1 https://github.com/nilenso/long-prompts-analysis /tmp/long-prompts-analysis
fi

# --- Cursor ---
echo ""
echo "--- Importing Cursor prompts ---"
CURSOR_DIR="$DATA_DIR/cursor"
for f in "$NILENSO_DIR"/cursor-*.md "$NILENSO_DIR"/cursor-*.txt; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    cp "$f" "$CURSOR_DIR/prompts-${basename}"
    echo "  Copied cursor/$basename"
done

# --- Codex CLI ---
echo ""
echo "--- Importing Codex CLI prompts ---"
CODEX_DIR="$DATA_DIR/codex-cli"
for f in "$NILENSO_DIR"/openai-codex-*.txt; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    cp "$f" "$CODEX_DIR/prompts-${basename}"
    echo "  Copied codex-cli/$basename"
done

# --- Gemini CLI ---
echo ""
echo "--- Importing Gemini CLI prompts ---"
GCLI_DIR="$DATA_DIR/gemini-cli"
for f in "$NILENSO_DIR"/google-gemini-cli-*.md "$NILENSO_DIR"/google-gemini-cli-*.txt; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    cp "$f" "$GCLI_DIR/prompts-${basename}"
    echo "  Copied gemini-cli/$basename"
done

# --- OpenHands ---
echo ""
echo "--- Importing OpenHands prompts ---"
OH_DIR="$DATA_DIR/openhands"
for f in "$NILENSO_DIR"/openhands-*.txt; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    cp "$f" "$OH_DIR/prompts-${basename}"
    echo "  Copied openhands/$basename"
done

# --- Kimi CLI ---
echo ""
echo "--- Importing Kimi CLI prompts ---"
KIMI_DIR="$DATA_DIR/kimi-cli"
for f in "$NILENSO_DIR"/moonshot-kimi-*.md "$NILENSO_DIR"/moonshot-kimi-*.txt; do
    [ -f "$f" ] || continue
    basename=$(basename "$f")
    cp "$f" "$KIMI_DIR/prompts-${basename}"
    echo "  Copied kimi-cli/$basename"
done

# --- Misc agents ---
echo ""
echo "--- Importing misc agent prompts ---"
MISC_DIR="$DATA_DIR/misc"
for f in "$LEAKS_DIR"/Misc/*.md; do
    basename=$(basename "$f" .md)
    cp "$f" "$MISC_DIR/prompts-${basename}.md"
    echo "  Copied misc/$basename"
done

# ─────────────────────────────────────────────────────
# 4. Generate versions.json for each agent
# ─────────────────────────────────────────────────────
echo ""
echo "--- Generating versions.json for each agent ---"

python3 "$SCRIPT_DIR/generate-versions.py"

echo ""
echo "=== Import complete! ==="
echo ""
# Summary
for agent_dir in "$DATA_DIR"/*/; do
    agent=$(basename "$agent_dir")
    count=$(ls "$agent_dir"/prompts-* 2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        echo "  $agent: $count prompt files"
    fi
done
