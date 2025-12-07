import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-4xl font-bold text-white mb-6 mt-8">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-3xl font-semibold text-white mb-4 mt-6">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-2xl font-semibold text-slate-200 mb-3 mt-4">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="text-slate-300 mb-4 leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="ml-4">{children}</li>
    ),
    code: ({ children }) => (
      <code className="bg-slate-800 text-blue-400 px-2 py-1 rounded text-sm">{children}</code>
    ),
    pre: ({ children }) => (
      <pre className="bg-slate-800 p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>
    ),
    a: ({ href, children }) => (
      <a href={href} className="text-blue-400 hover:text-blue-300 underline">
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-600 pl-4 italic text-slate-400 my-4">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border border-slate-700">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className="bg-slate-800 text-white p-3 text-left border border-slate-700">{children}</th>
    ),
    td: ({ children }) => (
      <td className="p-3 border border-slate-700 text-slate-300">{children}</td>
    ),
    ...components,
  }
}
