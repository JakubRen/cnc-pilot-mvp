import type { MDXComponents } from 'mdx/types'
import MermaidDiagram from '@/components/docs/MermaidDiagram'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-6 mt-8">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4 mt-6">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-3 mt-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-slate-600 dark:text-slate-300 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 mb-4 space-y-2">{children}</ol>
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
        <code className="bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-sm">{children}</code>
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
        <pre className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto mb-4 text-slate-800 dark:text-slate-200">{children}</pre>
      )
    },
    a: ({ href, children }) => (
      <a href={href} className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-600 pl-4 italic text-slate-500 dark:text-slate-400 my-4">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-slate-200 dark:border-slate-700">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white p-3 text-left border border-slate-200 dark:border-slate-700">{children}</th>
    ),
    td: ({ children }) => (
      <td className="p-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{children}</td>
    ),
    ...components,
  }
}
