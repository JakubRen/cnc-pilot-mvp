import type { MDXComponents } from 'mdx/types'
import MermaidDiagram from '@/components/docs/MermaidDiagram'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-foreground mb-6 mt-8">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-foreground mb-4 mt-6">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-semibold text-foreground mb-3 mt-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-muted-foreground mb-4 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-muted-foreground mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-muted-foreground mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="ml-4">{children}</li>
    ),
    code: ({ children, className }) => {
      // Check if this is a mermaid code block
      const isMermaid = className?.includes('language-mermaid')
      if (isMermaid && typeof children === 'string') {
        return <MermaidDiagram chart={children} />
      }
      // Regular inline code
      return (
        <code className="bg-muted text-primary px-2 py-1 rounded text-sm">{children}</code>
      )
    },
    pre: ({ children }: { children?: React.ReactElement<{ className?: string }> }) => {
      // Check if the code block is mermaid (handled by code component above)
      const childProps = children?.props
      if (childProps?.className?.includes('language-mermaid')) {
        return <>{children}</>
      }
      // Regular code block
      return (
        <pre className="bg-muted p-4 rounded-lg overflow-x-auto mb-4 text-foreground">{children}</pre>
      )
    },
    a: ({ href, children }) => (
      <a href={href} className="text-primary hover:text-primary/80 underline">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-border">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-muted text-foreground p-3 text-left border border-border">{children}</th>
    ),
    td: ({ children }) => (
      <td className="p-3 border border-border text-muted-foreground">{children}</td>
    ),
    ...components,
  }
}
