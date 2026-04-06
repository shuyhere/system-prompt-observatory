import { useState, useEffect, useMemo, useRef } from 'react'
import { encode } from 'gpt-tokenizer'
import { TAXONOMY, type ComponentKey } from './taxonomy'

interface ClassifiedSection {
  components: { key: ComponentKey; score: number }[]
  tokens: number
  text: string
  index: number
}

function classifyPrompt(text: string): ClassifiedSection[] {
  // Split on markdown headers (# ## ### ####)
  const sections = text.split(/\n(?=#{1,4}\s)/).filter(s => s.trim().length > 0)
  const results: ClassifiedSection[] = []

  for (let idx = 0; idx < sections.length; idx++) {
    const section = sections[idx]
    const tokens = encode(section).length
    const firstLine = section.split('\n')[0]

    const scores: { key: ComponentKey; score: number }[] = []

    for (const [key, def] of Object.entries(TAXONOMY)) {
      if (key === 'uncategorized') continue
      let score = 0

      // Header matching — very strong signal
      for (const hdr of def.headers) {
        if (hdr.test(firstLine)) score += 10
      }

      // Content pattern matching
      for (const { regex, weight } of def.patterns) {
        // Reset lastIndex for global regexes
        regex.lastIndex = 0
        const matches = section.match(regex)
        if (matches) score += matches.length * weight
      }

      if (score > 0) scores.push({ key: key as ComponentKey, score })
    }

    scores.sort((a, b) => b.score - a.score)

    // Keep top matches: primary + any with ≥30% of primary score (multi-label)
    const components = scores.length > 0
      ? scores.filter((s, i) => i === 0 || s.score >= scores[0].score * 0.3).slice(0, 4)
      : [{ key: 'uncategorized' as ComponentKey, score: 0 }]

    results.push({ components, tokens, text: section, index: idx })
  }

  return results
}

interface Props {
  promptUrl: string
  label: string
  dark: boolean
}

export default function ComponentAnalysis({ promptUrl, label }: Props) {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedComponent, setSelectedComponent] = useState<ComponentKey | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const promptViewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setSelectedComponent(null)
    setShowPrompt(false)
    fetch(promptUrl)
      .then(r => r.ok ? r.text() : '')
      .then(t => { setText(t); setLoading(false) })
      .catch(() => { setText(''); setLoading(false) })
  }, [promptUrl])

  const analysis = useMemo(() => {
    if (!text) return null
    const parts = classifyPrompt(text)
    const totals: Record<string, number> = {}
    let totalTokens = 0
    for (const p of parts) {
      const totalScore = p.components.reduce((a, c) => a + c.score, 0) || 1
      for (const c of p.components) {
        const share = Math.round(p.tokens * (c.score / totalScore))
        totals[c.key] = (totals[c.key] || 0) + share
      }
      totalTokens += p.tokens
    }
    return { parts, totals, totalTokens }
  }, [text])

  const handleComponentClick = (comp: ComponentKey) => {
    if (selectedComponent === comp && showPrompt) {
      setSelectedComponent(null)
      setShowPrompt(false)
      return
    }
    setSelectedComponent(comp)
    setShowPrompt(true)
    requestAnimationFrame(() => {
      const el = promptViewRef.current?.querySelector(`[data-highlight="${comp}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  if (loading || !analysis) {
    return <div className="text-sm p-4" style={{ color: 'var(--text-muted)' }}>Analyzing...</div>
  }

  const { parts, totals, totalTokens } = analysis
  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a).filter(([, v]) => v > 0)

  // Waffle grid — in DOCUMENT ORDER (start to end of prompt)
  const CELLS = 100
  const waffle: { comp: ComponentKey; sectionIdx: number }[] = []
  for (const part of parts) {
    const primary = part.components[0]?.key || 'uncategorized'
    const count = Math.max(1, Math.round((part.tokens / totalTokens) * CELLS))
    for (let i = 0; i < count && waffle.length < CELLS; i++) {
      waffle.push({ comp: primary, sectionIdx: part.index })
    }
  }
  // Trim to exactly CELLS
  while (waffle.length > CELLS) waffle.pop()
  while (waffle.length < CELLS) {
    const last = parts.at(-1)
    waffle.push({ comp: last?.components[0]?.key || 'uncategorized', sectionIdx: last?.index || 0 })
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</h3>

      {/* Waffle Chart */}
      <div className="grid grid-cols-10 gap-[2px] w-fit">
        {waffle.map((cell, i) => (
          <div
            key={i}
            className="w-[14px] h-[14px] rounded-[2px] cursor-pointer transition-all"
            style={{
              backgroundColor: TAXONOMY[cell.comp]?.color || '#616161',
              opacity: selectedComponent && selectedComponent !== cell.comp ? 0.15 : 1,
              transform: selectedComponent === cell.comp ? 'scale(1.2)' : 'scale(1)',
            }}
            title={`${TAXONOMY[cell.comp]?.label} (section ${cell.sectionIdx + 1})`}
            onClick={() => handleComponentClick(cell.comp)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-0.5">
        {sorted.map(([comp, tokens]) => {
          const def = TAXONOMY[comp]
          const pct = ((tokens / totalTokens) * 100).toFixed(1)
          const isSelected = selectedComponent === comp
          return (
            <div
              key={comp}
              className="flex items-center gap-1.5 text-[10px] cursor-pointer rounded px-1 py-[2px] transition-colors"
              style={{ background: isSelected ? 'var(--bg-active)' : 'transparent' }}
              onClick={() => handleComponentClick(comp as ComponentKey)}
            >
              <div className="w-2 h-2 rounded-[2px] flex-shrink-0" style={{ backgroundColor: def?.color }} />
              <span className="w-32 truncate" style={{ color: isSelected ? 'var(--text)' : 'var(--text-secondary)' }}>{def?.label}</span>
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: def?.color }} />
              </div>
              <span className="w-14 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>{tokens}t</span>
              <span className="w-8 text-right" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
            </div>
          )
        })}
      </div>
      <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{totalTokens} tokens</div>

      {/* Prompt viewer with highlights */}
      {showPrompt && (
        <div ref={promptViewRef} className="rounded max-h-72 overflow-y-auto" style={{ border: '1px solid var(--border)', background: 'var(--prompt-bg)' }}>
          {parts.map((part, i) => {
            const matchesSelected = selectedComponent && part.components.some(c => c.key === selectedComponent)
            const primaryColor = TAXONOMY[part.components[0]?.key]?.color || '#616161'

            return (
              <div
                key={i}
                data-highlight={matchesSelected ? selectedComponent : undefined}
                className="relative transition-all"
                style={{ borderBottom: '1px solid var(--border)' }}
                style={{
                  borderLeft: `3px solid ${matchesSelected ? TAXONOMY[selectedComponent!]?.color : primaryColor}`,
                  backgroundColor: matchesSelected ? `${TAXONOMY[selectedComponent!]?.color}15` : 'transparent',
                }}
              >
                {/* Multi-color component tags */}
                <div className="absolute top-0 right-0 flex gap-[1px]">
                  {part.components.map((c, j) => (
                    <div
                      key={j}
                      className="text-[7px] leading-none px-1 py-[2px] font-medium cursor-pointer hover:brightness-110"
                      style={{ backgroundColor: TAXONOMY[c.key]?.color, color: '#fff' }}
                      onClick={(e) => { e.stopPropagation(); handleComponentClick(c.key) }}
                      title={`${TAXONOMY[c.key]?.label} (score: ${c.score})`}
                    >
                      {TAXONOMY[c.key]?.label}
                    </div>
                  ))}
                </div>
                <pre
                  className="text-[10px] p-1.5 pr-20 whitespace-pre-wrap break-words font-mono leading-snug"
                  style={{ color: matchesSelected ? 'var(--prompt-highlight)' : selectedComponent ? 'var(--prompt-dim)' : 'var(--prompt-text)' }}
                >
                  {part.text.length > 600 ? part.text.slice(0, 600) + '\n...' : part.text}
                </pre>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
