'use client'

import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface MermaidDiagramProps {
  chart: string
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (containerRef.current) {
      // Lazy load mermaid library (~200KB) only when diagram is rendered
      const renderDiagram = async () => {
        try {
          setIsLoading(true)

          // Dynamic import - loads mermaid only when needed
          const mermaid = (await import('mermaid')).default

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
            containerRef.current.innerHTML = `<pre class="text-red-400">${chart}</pre>`
          }
        } finally {
          setIsLoading(false)
        }
      }

      renderDiagram()
    }
  }, [chart])

  return (
    <div className="my-6 p-4 bg-white dark:bg-slate-800 rounded-lg overflow-x-auto">
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-500 dark:text-slate-400">Ładowanie diagramu...</span>
        </div>
      )}
      <div ref={containerRef} />
    </div>
  )
}
