/**
 * System prompt component taxonomy.
 * Derived from manual analysis of Claude Code 2.1.92, Codex CLI, Gemini CLI,
 * Grok 4.2, and ChatGPT GPT-5 system prompts.
 * 
 * Each section can match multiple components (multi-label).
 * Classification uses section-header matching + semantic keyword patterns.
 */

export interface ComponentDef {
  label: string
  color: string
  /** Header patterns: if a section heading matches, it's a strong signal */
  headers: RegExp[]
  /** Content patterns: weighted keyword/phrase matches */
  patterns: { regex: RegExp; weight: number }[]
}

export const TAXONOMY: Record<string, ComponentDef> = {
  // ── WHO THE AGENT IS ──
  identity: {
    label: 'Identity & Role',
    color: '#E54B6B',
    headers: [/^#.*version/i, /^you are/i],
    patterns: [
      { regex: /you are (?:a |an )?[\w\s]+(agent|assistant|model|grok|codex|chatgpt|claude)/gi, weight: 5 },
      { regex: /built on|trained by|based on|running as/gi, weight: 3 },
      { regex: /your (?:name|role|purpose|primary goal)/gi, weight: 4 },
      { regex: /you operate|you help|you assist/gi, weight: 3 },
      { regex: /knowledge cutoff|current date|image input/gi, weight: 2 },
      { regex: /personality:\s*\w+/gi, weight: 3 },
    ],
  },

  // ── SAFETY, REFUSALS, CONTENT POLICY ──
  safety: {
    label: 'Safety & Content Policy',
    color: '#EF5350',
    headers: [/safety/i, /security.*rules/i, /content.*policy/i, /guardian/i],
    patterns: [
      { regex: /\bIMPORTANT:/g, weight: 2 },
      { regex: /must never|must not|do not (?:provide|generate|assist|engage)/gi, weight: 4 },
      { regex: /refuse|decline|forbidden|prohibited/gi, weight: 3 },
      { regex: /harmful|malicious|dangerous|destructive|criminal/gi, weight: 3 },
      { regex: /security vulnerabilit|owasp|injection|xss|sql injection/gi, weight: 4 },
      { regex: /jailbreak|prompt injection/gi, weight: 4 },
      { regex: /mass targeting|supply chain|DoS attack|detection evasion/gi, weight: 4 },
      { regex: /content policy|guardian_tool|election_voting/gi, weight: 3 },
      { regex: /sexual content|minor/gi, weight: 3 },
    ],
  },

  // ── CODING PRINCIPLES: what to do and not do when writing code ──
  principles: {
    label: 'Coding Principles',
    color: '#AB47BC',
    headers: [/core mandates/i, /editing constraints/i, /general coding/i],
    patterns: [
      { regex: /don['']t (?:add|create|introduce|design for|dump)/gi, weight: 3 },
      { regex: /avoid (?:backwards|unnecessary|premature|speculative)/gi, weight: 3 },
      { regex: /prefer (?:editing|using|short|simple)/gi, weight: 2 },
      { regex: /do not (?:add|create) (?:files|helpers|utilities|abstractions)/gi, weight: 3 },
      { regex: /only add comments|no unnecessary|minimize/gi, weight: 2 },
      { regex: /three similar lines|premature abstraction|hypothetical future/gi, weight: 4 },
      { regex: /rigorously adhere|conventions|existing (?:code|project|style)/gi, weight: 3 },
      { regex: /mimic the style|idiomatic/gi, weight: 3 },
      { regex: /clean code|best practice|code quality/gi, weight: 2 },
      { regex: /ASCII|non-ASCII|Unicode/gi, weight: 2 },
    ],
  },

  // ── HOW TO APPROACH AND EXECUTE TASKS ──
  task_strategy: {
    label: 'Task Strategy & Workflow',
    color: '#F4A156',
    headers: [/doing tasks/i, /primary workflow/i, /software engineering tasks/i, /new applications/i],
    patterns: [
      { regex: /understand.*(?:request|requirements|codebase)/gi, weight: 3 },
      { regex: /plan|strategize|break.*down|subtask/gi, weight: 2 },
      { regex: /implement|verify|finalize/gi, weight: 1 },
      { regex: /read (?:it |the file )?first|understand.*before/gi, weight: 3 },
      { regex: /approach fails|diagnose|root cause|investigate/gi, weight: 3 },
      { regex: /iterative|step.by.step|sequence/gi, weight: 2 },
      { regex: /ambitious tasks|too (?:large|complex)/gi, weight: 2 },
      { regex: /if (?:asked|the user asks)/gi, weight: 1 },
      { regex: /simple request|straightforward/gi, weight: 1 },
    ],
  },

  // ── CAUTION, REVERSIBILITY, CONFIRMATION ──
  caution: {
    label: 'Caution & Confirmation',
    color: '#FF7043',
    headers: [/executing actions with care/i, /caution/i, /reversibility/i],
    patterns: [
      { regex: /reversib|blast radius|risky|destructive/gi, weight: 4 },
      { regex: /confirm(?:ation)?|check with the user/gi, weight: 3 },
      { regex: /hard.to.reverse|force.push|rm -rf|git reset --hard/gi, weight: 4 },
      { regex: /shared (?:state|systems)|visible to others/gi, weight: 3 },
      { regex: /measure twice|cut once|when in doubt/gi, weight: 4 },
      { regex: /investigate before|do not (?:revert|delete)/gi, weight: 3 },
      { regex: /user['']s (?:in-progress )?work/gi, weight: 2 },
      { regex: /approval|approve|deny|cancel/gi, weight: 2 },
      { regex: /never push.*without.*asked/gi, weight: 4 },
    ],
  },

  // ── TOOL USAGE RULES AND PREFERENCES ──
  tool_policy: {
    label: 'Tool Usage Policy',
    color: '#78909C',
    headers: [/using your tools/i, /tool usage/i, /available tools/i],
    patterns: [
      { regex: /do (?:not|NOT) use (?:the )?bash/gi, weight: 4 },
      { regex: /use (\w+) instead of/gi, weight: 4 },
      { regex: /dedicated tool|reserve.*(?:bash|shell)/gi, weight: 3 },
      { regex: /parallel.*tool|multiple.*tool.*parallel/gi, weight: 4 },
      { regex: /independent tool calls/gi, weight: 3 },
      { regex: /break down.*TodoWrite|mark.*completed/gi, weight: 2 },
      { regex: /tool calls.*depend/gi, weight: 3 },
      { regex: /parallelism|execute.*independent.*parallel/gi, weight: 3 },
    ],
  },

  // ── TOOL DEFINITIONS: the actual tool specs ──
  tool_definitions: {
    label: 'Tool Definitions',
    color: '#546E7A',
    headers: [/^## (?:bash|edit|glob|grep|read|write|agent|skill|toolsearch)/i, /^# tools/i],
    patterns: [
      { regex: /"(?:name|description|parameters|type)":/gi, weight: 4 },
      { regex: /input_schema|required:|properties:/gi, weight: 4 },
      { regex: /\bcommand\b.*\bstring\b|\btimeout\b.*\binteger\b/gi, weight: 3 },
      { regex: /## (?:Bash|Edit|Glob|Grep|Read|Write|Agent|Skill)/g, weight: 5 },
      { regex: /code_execution|browse_page|web_search|file_search/gi, weight: 3 },
      { regex: /```\s*\{[\s\S]*?"name"/g, weight: 5 },
    ],
  },

  // ── OUTPUT FORMATTING, TONE, STYLE ──
  output_style: {
    label: 'Output Style & Tone',
    color: '#9575CD',
    headers: [/tone and style/i, /output efficiency/i, /presenting.*work/i, /final.*(?:answer|message)/i, /formatting/i],
    patterns: [
      { regex: /emoji|concise|brief|direct|short/gi, weight: 2 },
      { regex: /go straight|filler words|preamble|no chitchat/gi, weight: 4 },
      { regex: /one sentence|don['']t use three/gi, weight: 3 },
      { regex: /markdown|monospace|github.flavored|code block/gi, weight: 2 },
      { regex: /collaborative.*tone|professional.*tone|friendly/gi, weight: 3 },
      { regex: /formatting|headers|bullets|backticks/gi, weight: 2 },
      { regex: /file.*reference|clickable|line.*number/gi, weight: 2 },
      { regex: /minimal output|fewer than \d+ lines/gi, weight: 3 },
    ],
  },

  // ── MEMORY AND PERSISTENCE ──
  memory: {
    label: 'Memory & Persistence',
    color: '#4DB6AC',
    headers: [/auto memory/i, /types of memory/i, /what not to save/i, /how to save/i, /when to access/i, /remember/i],
    patterns: [
      { regex: /\bmemory\b/gi, weight: 2 },
      { regex: /persistent|file.based memory|remember|forget/gi, weight: 3 },
      { regex: /user.*memory|feedback.*memory|project.*memory|reference.*memory/gi, weight: 5 },
      { regex: /when_to_save|how_to_use|body_structure/gi, weight: 4 },
      { regex: /save (?:it )?immediately|save.*memory/gi, weight: 3 },
      { regex: /bio.*tool|personalization.*memory/gi, weight: 3 },
    ],
  },

  // ── ENVIRONMENT, PLATFORM, SYSTEM INFO ──
  environment: {
    label: 'Environment & Platform',
    color: '#3CB4A4',
    headers: [/^## environment/i, /working environment/i, /operating system/i, /sandbox/i, /seatbelt/i],
    patterns: [
      { regex: /operating (?:system|environment)/gi, weight: 3 },
      { regex: /working directory|project root|\$\{?\w*(?:DIR|CWD|HOME)\}?/gi, weight: 3 },
      { regex: /platform|linux|macos|windows|darwin/gi, weight: 2 },
      { regex: /sandbox|seatbelt|container|isolation/gi, weight: 3 },
      { regex: /shell:|bash|powershell|zsh/gi, weight: 1 },
      { regex: /current date|hostname|uname/gi, weight: 2 },
      { regex: /pre-installed|libraries|packages/gi, weight: 2 },
    ],
  },

  // ── PERMISSIONS, HOOKS, SETTINGS ──
  permissions: {
    label: 'Permissions & Hooks',
    color: '#FFB74D',
    headers: [/permission/i, /hooks/i],
    patterns: [
      { regex: /permission mode|automatically allowed/gi, weight: 4 },
      { regex: /approve or deny|user.*denied/gi, weight: 3 },
      { regex: /hooks?.*shell command|user-prompt-submit/gi, weight: 4 },
      { regex: /settings|configuration/gi, weight: 1 },
      { regex: /escalat|consent/gi, weight: 2 },
      { regex: /user.*cancel.*function call/gi, weight: 3 },
    ],
  },

  // ── GIT, COMMITS, PR WORKFLOW ──
  git_workflow: {
    label: 'Git & Version Control',
    color: '#66BB6A',
    headers: [/committing changes/i, /creating pull requests/i, /git repository/i, /other common operations/i],
    patterns: [
      { regex: /\bgit\b(?! reset| checkout)/gi, weight: 2 },
      { regex: /commit|push|pull request|branch|merge|rebase/gi, weight: 2 },
      { regex: /git (?:status|diff|log|add|commit|push|pull|merge|rebase|cherry)/gi, weight: 4 },
      { regex: /conventional commit|co-authored|commit message/gi, weight: 3 },
      { regex: /PR (?:title|body|description|template)/gi, weight: 3 },
      { regex: /git diff|staged|unstaged/gi, weight: 3 },
    ],
  },

  // ── CONTEXT WINDOW, COMPRESSION, SYSTEM-REMINDERS ──
  context_management: {
    label: 'Context & Compression',
    color: '#29B6F6',
    headers: [/context/i, /compression/i, /state_snapshot/i],
    patterns: [
      { regex: /context (?:window|limit|length)/gi, weight: 4 },
      { regex: /compress|compaction|prior messages|conversation.*limit/gi, weight: 4 },
      { regex: /system-reminder|<system|<\/system>/gi, weight: 3 },
      { regex: /state_snapshot|overall_goal|key_knowledge|file_system_state/gi, weight: 5 },
      { regex: /scratchpad|distill.*history|resume.*work/gi, weight: 3 },
      { regex: /token.*consumption|output token/gi, weight: 2 },
    ],
  },

  // ── SKILLS, SUBAGENTS, DELEGATION ──
  agents_skills: {
    label: 'Agents & Skills',
    color: '#EC407A',
    headers: [/session.specific/i, /skills/i, /agent tool/i, /sub.?agent/i, /delegate/i, /codebase_investigator/i],
    patterns: [
      { regex: /\bskill\b|\/\w+.*shorthand/gi, weight: 3 },
      { regex: /sub.?agent|agent.*tool|specialized agent/gi, weight: 4 },
      { regex: /delegate|delegation|codebase_investigator/gi, weight: 4 },
      { regex: /explore|Explore|subagent_type/gi, weight: 2 },
      { regex: /slash command|user-invocable/gi, weight: 2 },
      { regex: /team.*leader|collaborat.*with/gi, weight: 3 },
    ],
  },

  // ── USER MESSAGE TEMPLATE / HARNESS INJECTION ──
  harness_meta: {
    label: 'Harness & Metadata',
    color: '#8D6E63',
    headers: [/^# user message/i, /^# system prompt/i, /billing/i],
    patterns: [
      { regex: /deferred tools|ToolSearch/gi, weight: 4 },
      { regex: /skills are available/gi, weight: 3 },
      { regex: /x-anthropic|billing.header|cc_version/gi, weight: 5 },
      { regex: /write a haiku/gi, weight: 3 },
      { regex: /# User Message|# System Prompt/g, weight: 5 },
      { regex: /release date:/gi, weight: 3 },
    ],
  },

  // ── VALUES, ETHICS, WORLD-VIEW (especially for chat models) ──
  values_ethics: {
    label: 'Values & Ethics',
    color: '#7E57C2',
    headers: [],
    patterns: [
      { regex: /humanist|truth.seeking|understand the universe/gi, weight: 5 },
      { regex: /moral|ethical|normative|values/gi, weight: 3 },
      { regex: /politica|religion|partis?an|endorse/gi, weight: 3 },
      { regex: /slurs?|tropes?|group.*averages/gi, weight: 4 },
      { regex: /uncertainty|acknowledge.*wrong|push back/gi, weight: 2 },
      { regex: /truthful|capabilities/gi, weight: 2 },
    ],
  },

  uncategorized: {
    label: 'Other',
    color: '#616161',
    headers: [],
    patterns: [],
  },
}

export type ComponentKey = keyof typeof TAXONOMY
