'use client'

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { logger } from '@/lib/logger'

interface MermaidDiagramProps {
  chart: string
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      // Initialize mermaid with dark theme
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        flowchart: {
          curve: 'basis',
          padding: 20,
        },
      })

      // Render the diagram
      const renderDiagram = async () => {
        try {
          const { svg } = await mermaid.render(
            `mermaid-${Math.random().toString(36).substr(2, 9)}`,
            chart
          )
          if (containerRef.current) {
            containerRef.current.innerHTML = svg
          }
        } catch (error) {
          logger.error('Mermaid rendering error', { error })
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre className="text-red-400">${chart}</pre>`
          }
        }
      }

      renderDiagram()
    }
  }, [chart])

  return (
    <div
      ref={containerRef}
      className="my-6 p-4 bg-white dark:bg-slate-800 rounded-lg overflow-x-auto"
    />
  )
}
