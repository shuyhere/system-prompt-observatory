import { useState, useEffect } from 'react'

interface VersionData {
  version: string
  bytes: number
  tokens: number
  components: Record<string, number>
  lines_added: number
  lines_removed: number
  lines_changed: number
}

interface Analysis {
  summary: {
    total_versions: number
    first_version: string
    last_version: string
    token_growth: { first: number; last: number; growth_pct: number }
    component_shift: { first: Record<string, number>; last: Record<string, number> }
    top_milestones: { version: string; lines_changed: number; added: number; removed: number }[]
  }
  versions: VersionData[]
}

const COMP_COLORS: Record<string, string> = {
  'Identity & Role': '#E54B6B',
  'Safety & Security': '#EF5350',
  'System & Infrastructure': '#90A4AE',
  'Task Execution': '#F4A156',
  'Coding Principles': '#AB47BC',
  'Caution & Confirmation': '#FF7043',
  'Tool Usage Policy': '#78909C',
  'Tool Definitions': '#546E7A',
  'Output Style & Tone': '#9575CD',
  'Memory System': '#4DB6AC',
  'Environment': '#3CB4A4',
  'Git & PR Workflow': '#66BB6A',
  'Session & Agents': '#EC407A',
  'Uncategorized': '#BDBDBD',
}

function BarChart({ data, getValue, getLabel, color, height = 140 }: {
  data: VersionData[]
  getValue: (v: VersionData) => number
  getLabel: (v: VersionData) => string
  color: string
  height?: number
}) {
  const max = Math.max(...data.map(getValue), 1)
  const W = 800
  const barW = W / data.length
  
  // Show version labels every ~10 bars
  const labelEvery = Math.max(1, Math.floor(data.length / 12))
  
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${height + 30}`} style={{ width: '100%', height: height + 30, display: 'block' }}>
        {data.map((v, i) => {
          const h = (getValue(v) / max) * height
          return (
            <g key={i}>
              <rect x={i * barW} y={height - h} width={Math.max(barW - 0.5, 1)} height={h} fill={color} rx={1}>
                <title>{getLabel(v)}</title>
              </rect>
            </g>
          )
        })}
        {/* Version labels */}
        {data.map((v, i) => (
          i % labelEvery === 0 ? (
            <text key={`l${i}`} x={i * barW + barW / 2} y={height + 14} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
              {v.version}
            </text>
          ) : null
        ))}
      </svg>
    </div>
  )
}

function DiffChart({ data, height = 120 }: { data: VersionData[]; height?: number }) {
  const maxAdded = Math.max(...data.map(v => v.lines_added || 0), 1)
  const maxRemoved = Math.max(...data.map(v => v.lines_removed || 0), 1)
  const maxVal = Math.max(maxAdded, maxRemoved)
  const W = 800
  const barW = W / data.length
  const mid = height / 2
  const labelEvery = Math.max(1, Math.floor(data.length / 12))

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${height + 30}`} style={{ width: '100%', height: height + 30, display: 'block' }}>
        {/* Center line */}
        <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--border)" strokeWidth="0.5" />
        {data.map((v, i) => {
          const addH = maxVal > 0 ? ((v.lines_added || 0) / maxVal) * mid : 0
          const remH = maxVal > 0 ? ((v.lines_removed || 0) / maxVal) * mid : 0
          return (
            <g key={i}>
              {/* Added: goes UP from center */}
              {addH > 0 && (
                <rect x={i * barW} y={mid - addH} width={Math.max(barW - 0.5, 1)} height={addH} fill="#2da44e" rx={1}>
                  <title>{v.version}: +{v.lines_added} -{v.lines_removed}</title>
                </rect>
              )}
              {/* Removed: goes DOWN from center */}
              {remH > 0 && (
                <rect x={i * barW} y={mid} width={Math.max(barW - 0.5, 1)} height={remH} fill="#cf222e" rx={1}>
                  <title>{v.version}: +{v.lines_added} -{v.lines_removed}</title>
                </rect>
              )}
            </g>
          )
        })}
        {/* Labels */}
        {data.map((v, i) => (
          i % labelEvery === 0 ? (
            <text key={`l${i}`} x={i * barW + barW / 2} y={height + 14} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
              {v.version}
            </text>
          ) : null
        ))}
      </svg>
    </div>
  )
}

export default function EvolutionAnalysis({ dark }: { dark: boolean }) {
  const [data, setData] = useState<Analysis | null>(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/claude-code-analysis.json?_=${Date.now()}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return <div style={{ color: 'var(--text-muted)', padding: 24 }}>Loading analysis...</div>

  const { summary, versions } = data
  // Sample ~60 points for charts
  const step = Math.max(1, Math.floor(versions.length / 60))
  const sampled = versions.filter((_, i) => i % step === 0 || i === versions.length - 1)

  const compKeys = Object.keys({ ...summary.component_shift.first, ...summary.component_shift.last })
    .filter(k => k !== 'Uncategorized')
    .sort((a, b) => {
      const va = (summary.component_shift.last[a] || 0) + (summary.component_shift.first[a] || 0)
      const vb = (summary.component_shift.last[b] || 0) + (summary.component_shift.first[b] || 0)
      return vb - va
    })

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto', color: 'var(--text)', fontFamily: 'system-ui' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Claude Code System Prompt Evolution</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
        {summary.total_versions} versions analyzed: v{summary.first_version} to v{summary.last_version}
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'Versions Tracked', value: String(summary.total_versions) },
          { label: 'Token Growth', value: `+${summary.token_growth.growth_pct}%` },
          { label: 'First Version', value: `${summary.token_growth.first.toLocaleString()} tok` },
          { label: 'Latest Version', value: `${summary.token_growth.last.toLocaleString()} tok` },
        ].map(c => (
          <div key={c.label} style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Token size chart */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Prompt Size Over Time (tokens)</h3>
      <BarChart
        data={sampled}
        getValue={v => v.tokens}
        getLabel={v => `${v.version}: ${v.tokens.toLocaleString()} tokens`}
        color="var(--accent)"
      />
      <div style={{ height: 24 }} />

      {/* Edit distance chart */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Lines Changed Per Version</h3>
      <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#2da44e', borderRadius: 2, marginRight: 3 }} />Added</span>
        <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#cf222e', borderRadius: 2, marginRight: 3 }} />Removed</span>
      </div>
      <DiffChart data={sampled} />
      <div style={{ height: 24 }} />

      {/* Component composition shift */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Component Composition: First vs Latest</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {(['first', 'last'] as const).map(which => {
          const comps = summary.component_shift[which]
          const ver = which === 'first' ? summary.first_version : summary.last_version
          return (
            <div key={which}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' }}>
                v{ver}
              </div>
              {compKeys.map(k => {
                const pct = comps[k] || 0
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: COMP_COLORS[k] || '#888', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, width: 130, color: 'var(--text-secondary)' }}>{k}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: COMP_COLORS[k] || '#888', borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 10, width: 36, textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{pct}%</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Top milestones table */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Biggest Changes (Top 10)</h3>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Version</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border)', color: '#2da44e' }}>+Added</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border)', color: '#cf222e' }}>-Removed</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.top_milestones.slice(0, 10).map(m => (
              <tr key={m.version} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '6px 12px', fontFamily: 'monospace' }}>{m.version}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#2da44e' }}>+{m.added}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: '#cf222e' }}>-{m.removed}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600 }}>{m.lines_changed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
