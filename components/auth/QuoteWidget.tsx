'use client'

import { useEffect, useState } from 'react'
import { Quote, getRandomQuote } from '@/lib/quotes'
import { useTranslation } from '@/hooks/useTranslation'

export default function QuoteWidget() {
  const [quote, setQuote] = useState<Quote | null>(null)
  const { lang } = useTranslation()

  useEffect(() => {
    setQuote(getRandomQuote())
  }, [])

  if (!quote) return null

  return (
    <div className="relative max-w-md mx-auto mt-6 p-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="absolute -top-4 -left-2 text-4xl text-blue-500/40 font-serif">"</div>
      
      <figure className="relative z-10">
        <blockquote className="text-lg text-slate-300 font-light leading-relaxed italic text-center">
          {quote.text[lang]}
        </blockquote>
        
        <figcaption className="mt-4 flex flex-col items-center">
          <div className="w-12 h-px bg-blue-500/30 mb-3"></div>
          <cite className="not-italic font-semibold text-blue-400 text-sm">
            {quote.author}
          </cite>
          {quote.role && (
            <span className="text-xs text-slate-500 mt-0.5">
              {quote.role}
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  )
}
