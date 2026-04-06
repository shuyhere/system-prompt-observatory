import { useState, useEffect, useRef } from 'react'
import type { AgentInfo, VersionEntry } from './types'
import DiffViewer from './DiffViewer'
import ComponentAnalysis from './ComponentAnalysis'
import EvolutionAnalysis from './EvolutionAnalysis'

function groupByProvider(agents: AgentInfo[]): Map<string, AgentInfo[]> {
  const m = new Map<string, AgentInfo[]>()
  for (const a of agents) {
    const list = m.get(a.provider) || []
    list.push(a)
    m.set(a.provider, list)
  }
  return m
}

export default function App() {
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [currentAgent, setCurrentAgent] = useState('')
  const [versions, setVersions] = useState<VersionEntry[]>([])
  const [fromVersion, setFromVersion] = useState('')
  const [toVersion, setToVersion] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [showEvolution, setShowEvolution] = useState(false)
  const [dark, setDark] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)
  const initialLoadRef = useRef(true)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/agents.json?_=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        setAgents(data.agents)
        const params = new URLSearchParams(window.location.search)
        const agentParam = params.get('agent')
        const found = data.agents.find((a: AgentInfo) => a.id === agentParam)
        setCurrentAgent(found?.id || data.agents.find((a: AgentInfo) => a.id === 'claude-code')?.id || data.agents[0]?.id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!currentAgent) return
    setLoading(true)
    fetch(`${import.meta.env.BASE_URL}data/${currentAgent}/versions.json?_=${Date.now()}`)
      .then(r => r.json())
      .then(data => {
        const vers: VersionEntry[] = data.versions || []
        setVersions(vers)
        if (vers.length === 0) { setFromVersion(''); setToVersion(''); setLoading(false); return }
        if (initialLoadRef.current) {
          initialLoadRef.current = false
          const params = new URLSearchParams(window.location.search)
          const fromP = params.get('from'), toP = params.get('to')
          setFromVersion(vers.find(v => v.version === fromP) ? fromP! : vers[0].version)
          setToVersion(vers.find(v => v.version === toP) ? toP! : vers[vers.length - 1].version)
        } else {
          setFromVersion(vers[0].version)
          setToVersion(vers[vers.length - 1].version)
        }
        setLoading(false)
      })
      .catch(() => { setVersions([]); setLoading(false) })
  }, [currentAgent])

  useEffect(() => {
    if (!currentAgent || !fromVersion || !toVersion) return
    const params = new URLSearchParams()
    params.set('agent', currentAgent); params.set('from', fromVersion); params.set('to', toVersion)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }, [currentAgent, fromVersion, toVersion])

  const getPromptUrl = (version: string) => {
    const entry = versions.find(v => v.version === version)
    if (entry?.file) return `${import.meta.env.BASE_URL}data/${currentAgent}/${entry.file}`
    return `${import.meta.env.BASE_URL}data/${currentAgent}/prompts-${version}.md`
  }

  const handleAgentChange = (id: string) => {
    if (id === currentAgent) { setMenuOpen(false); return }
    setCurrentAgent(id); setMenuOpen(false)
  }

  const agentInfo = agents.find(a => a.id === currentAgent)
  const grouped = groupByProvider(agents)
  const canShowDiff = !loading && fromVersion && toVersion && versions.length >= 1
  const theme = dark ? 'theme-dark' : 'theme-light'

  return (
    <div className={`${theme} flex flex-col h-screen`} style={{ background: 'var(--bg)' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex-shrink-0" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div className="px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>System Prompt Observatory</h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Track system prompt changes across AI agents</p>
              </div>

              {/* Agent Selector */}
              <div className="relative" ref={menuRef}>
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm cursor-pointer transition-colors"
                  style={{ background: 'var(--bg)', border: '1px solid var(--select-border)', color: 'var(--text)' }}
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <span className="font-medium">{agentInfo?.name || 'Select Agent'}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{agentInfo ? `${agentInfo.versionCount}v` : ''}</span>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {menuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 rounded-lg shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    {Array.from(grouped.entries()).map(([provider, agentList]) => (
                      <div key={provider} style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="px-3 py-1.5 text-xs font-semibold" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)' }}>{provider}</div>
                        {agentList.map(a => (
                          <button
                            key={a.id}
                            className="w-full text-left px-3 py-2 text-sm flex items-center justify-between cursor-pointer transition-colors"
                            style={{ color: a.id === currentAgent ? 'var(--accent)' : 'var(--text)', background: a.id === currentAgent ? 'var(--bg-active)' : 'transparent' }}
                            onMouseEnter={e => { if (a.id !== currentAgent) (e.target as HTMLElement).style.background = 'var(--bg-hover)' }}
                            onMouseLeave={e => { if (a.id !== currentAgent) (e.target as HTMLElement).style.background = 'transparent' }}
                            onClick={() => handleAgentChange(a.id)}
                          >
                            <span>{a.name}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{a.versionCount}v</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />

              {/* Version Selectors */}
              <div className="flex items-center gap-2">
                <select className="rounded px-2.5 py-1.5 text-sm font-mono cursor-pointer" style={{ background: 'var(--select-bg)', color: 'var(--select-text)', border: '1px solid var(--select-border)' }}
                  value={fromVersion} onChange={e => setFromVersion(e.target.value)} disabled={loading}>
                  {versions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
                </select>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--text-muted)' }}>
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14m0 0l-6-6m6 6l-6 6"/>
                </svg>
                <select className="rounded px-2.5 py-1.5 text-sm font-mono cursor-pointer" style={{ background: 'var(--select-bg)', color: 'var(--select-text)', border: '1px solid var(--select-border)' }}
                  value={toVersion} onChange={e => setToVersion(e.target.value)} disabled={loading}>
                  {versions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
                </select>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              <button className="px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
                style={showAnalysis ? { background: 'var(--accent)', color: 'var(--accent-text)', border: '1px solid var(--accent)' } : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onClick={() => { setShowAnalysis(!showAnalysis); if (!showAnalysis) setShowEvolution(false) }}>
                {showAnalysis ? 'Components x' : 'Components'}
              </button>
              <button className="px-2.5 py-1 rounded text-xs cursor-pointer transition-colors"
                style={showEvolution ? { background: 'var(--accent)', color: 'var(--accent-text)', border: '1px solid var(--accent)' } : { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onClick={() => { setShowEvolution(!showEvolution); if (!showEvolution) setShowAnalysis(false) }}>
                {showEvolution ? 'Evolution x' : 'Evolution'}
              </button>
              <button className="p-1.5 rounded cursor-pointer transition-colors"
                style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                onClick={() => setDark(!dark)}
                title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
                {dark ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
              <a href="https://www.dbreunig.com/2026/02/10/system-prompts-define-the-agent-as-much-as-the-model.html"
                target="_blank" rel="noopener" className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>About</a>
            </div>
          </div>

          {/* Mobile */}
          <div className="flex sm:hidden flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>SPO</h1>
              <div className="flex gap-2">
                <button className="p-1.5 rounded cursor-pointer" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }} onClick={() => setDark(!dark)}>
                  {dark ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                  )}
                </button>
                <button className="rounded px-2 py-1 text-sm cursor-pointer" style={{ border: '1px solid var(--select-border)', color: 'var(--text)' }} onClick={() => setMenuOpen(!menuOpen)}>
                  {agentInfo?.name || 'Agent'} ▾
                </button>
              </div>
              {menuOpen && (
                <div className="absolute top-14 right-4 w-64 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  {agents.map(a => (
                    <button key={a.id} className="w-full text-left px-3 py-2 text-sm cursor-pointer" style={{ color: a.id === currentAgent ? 'var(--accent)' : 'var(--text)' }} onClick={() => handleAgentChange(a.id)}>
                      {a.name} <span style={{ color: 'var(--text-muted)' }}>({a.versionCount})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select className="flex-1 rounded px-2 py-1 text-sm font-mono" style={{ background: 'var(--select-bg)', color: 'var(--select-text)', border: '1px solid var(--select-border)' }} value={fromVersion} onChange={e => setFromVersion(e.target.value)}>
                {versions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
              </select>
              <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
              <select className="flex-1 rounded px-2 py-1 text-sm font-mono" style={{ background: 'var(--select-bg)', color: 'var(--select-text)', border: '1px solid var(--select-border)' }} value={toVersion} onChange={e => setToVersion(e.target.value)}>
                {versions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 overflow-hidden flex" style={{ background: 'var(--bg)' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full w-full" style={{ color: 'var(--text-muted)' }}>Loading...</div>
        ) : showEvolution ? (
          <div className="w-full overflow-y-auto">
            <EvolutionAnalysis dark={dark} />
          </div>
        ) : !canShowDiff ? (
          <div className="flex items-center justify-center h-full w-full" style={{ color: 'var(--text-muted)' }}>No versions available.</div>
        ) : (
          <>
            <div className={showAnalysis ? 'flex-1 overflow-hidden' : 'w-full overflow-hidden'}>
              <DiffViewer key={`${currentAgent}-${fromVersion}-${toVersion}`} fromUrl={getPromptUrl(fromVersion)} toUrl={getPromptUrl(toVersion)} fromLabel={fromVersion} toLabel={toVersion} dark={dark} />
            </div>
            {showAnalysis && (
              <div className="w-80 overflow-y-auto flex-shrink-0" style={{ borderLeft: '1px solid var(--border)', background: 'var(--panel-bg)' }}>
                <ComponentAnalysis key={`from-${currentAgent}-${fromVersion}`} promptUrl={getPromptUrl(fromVersion)} label={fromVersion} dark={dark} />
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <ComponentAnalysis key={`to-${currentAgent}-${toVersion}`} promptUrl={getPromptUrl(toVersion)} label={toVersion} dark={dark} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
