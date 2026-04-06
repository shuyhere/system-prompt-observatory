import { useEffect, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

interface Props {
  fromUrl: string
  toUrl: string
  fromLabel: string
  toLabel: string
  dark: boolean
}

export default function DiffViewer({ fromUrl, toUrl, dark }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const [ready, setReady] = useState(false)

  // Create/recreate editor when URLs change
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setReady(false)

    if (editorRef.current) {
      const model = editorRef.current.getModel()
      editorRef.current.dispose()
      model?.original.dispose()
      model?.modified.dispose()
      editorRef.current = null
    }

    Promise.all([
      fetch(fromUrl).then(r => r.ok ? r.text() : ''),
      fetch(toUrl).then(r => r.ok ? r.text() : ''),
    ]).then(([original, modified]) => {
      if (!containerRef.current) return

      const editor = monaco.editor.createDiffEditor(container, {
        theme: dark ? 'vs-dark' : 'vs',
        readOnly: true,
        renderSideBySide: window.innerWidth >= 768,
        minimap: { enabled: false },
        lineNumbers: 'off',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        overviewRulerLanes: 0,
        renderIndicators: false,
        folding: false,
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        stickyScroll: { enabled: false },
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
      })

      editor.setModel({
        original: monaco.editor.createModel(original, 'plaintext'),
        modified: monaco.editor.createModel(modified, 'plaintext'),
      })

      editorRef.current = editor

      const poll = () => {
        try {
          if (editor.getLineChanges() !== null) setReady(true)
          else setTimeout(poll, 50)
        } catch { setTimeout(poll, 50) }
      }
      poll()
    })

    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel()
        editorRef.current.dispose()
        model?.original.dispose()
        model?.modified.dispose()
        editorRef.current = null
      }
    }
  }, [fromUrl, toUrl, dark])

  // Update theme when dark mode toggles (without recreating editor)
  useEffect(() => {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
  }, [dark])

  useEffect(() => {
    const handler = () => {
      editorRef.current?.updateOptions({ renderSideBySide: window.innerWidth >= 768 })
    }
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="relative w-full h-full">
      <div
        className="absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-200"
        style={{
          background: dark ? '#1e1e1e' : '#ffffff',
          opacity: ready ? 0 : 1,
          pointerEvents: ready ? 'none' : 'auto',
        }}
      >
        <div style={{ color: dark ? '#666' : '#aaa' }} className="flex items-center gap-3">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading diff...
        </div>
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
