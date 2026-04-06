# System Prompt Observatory

Track and compare system prompts across all major AI agents. Git-style diffs powered by Monaco Editor, with component analysis and evolution tracking.

## Live Site

Deployed via GitHub Pages.

## Agents Tracked (670 prompt files)

| Agent | Provider | Versions |
|-------|----------|----------|
| Claude Code | Anthropic | 275 |
| Gemini CLI | Google | 133 |
| Codex CLI | OpenAI | 53 |
| ChatGPT | OpenAI | 46 |
| Claude.ai | Anthropic | 32 |
| Kimi CLI | Moonshot | 32 |
| Other Agents | Various | 29 |
| OpenHands | Open Source | 22 |
| Grok | xAI | 14 |
| Gemini Web | Google | 13 |
| Cursor | Cursor | 11 |
| Perplexity | Perplexity | 10 |

## Features

- **Diff Viewer** — Monaco-powered side-by-side diffs between any two versions
- **Component Analysis** — Token-counted breakdown into 16 categories (Identity, Safety, Tools, Memory, etc.)
- **Evolution Dashboard** — Claude Code prompt size, churn, and composition over 275 versions
- **Multi-source** — Data from cchistory, system_prompts_leaks, jujumilk3, LouisShark, git histories
- **Dark/Light mode**

## Development

```bash
cd web
npm install
npx vite dev        # dev server on :3000
npx vite build      # production build to dist/
```

## Data Sources

- [cchistory](https://github.com/badlogic/cchistory) — Claude Code versions
- [system_prompts_leaks](https://github.com/asgeirtj/system_prompts_leaks) — Multi-agent leaks
- [jujumilk3/leaked-system-prompts](https://github.com/jujumilk3/leaked-system-prompts) — Historical captures
- [LouisShark/chatgpt_system_prompt](https://github.com/LouisShark/chatgpt_system_prompt) — ChatGPT history
- [openai/codex](https://github.com/openai/codex) — Codex CLI git history
- [google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli) — Gemini CLI git history
- [MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli) — Kimi CLI git history
- [All-Hands-AI/OpenHands](https://github.com/All-Hands-AI/OpenHands) — OpenHands git history

## Inspired By

- [cchistory.mariozechner.at](https://cchistory.mariozechner.at)
- [How System Prompts Define Agent Behavior](https://www.dbreunig.com/2026/02/10/system-prompts-define-the-agent-as-much-as-the-model.html) by Drew Breunig
- [nilenso/context-viewer](https://github.com/nilenso/context-viewer)

## License

Data sourced from public repositories under their respective licenses. Site code is MIT.
