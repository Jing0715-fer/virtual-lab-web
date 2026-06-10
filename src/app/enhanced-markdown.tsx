'use client'

import React, { useState, useCallback, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { CheckCircle2, Copy } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'

// ============================================================
// Language color mapping for code block backgrounds
// ============================================================

const LANG_COLORS: Record<string, string> = {
  javascript: 'rgba(247, 223, 30, 0.06)',
  js: 'rgba(247, 223, 30, 0.06)',
  typescript: 'rgba(49, 120, 198, 0.06)',
  ts: 'rgba(49, 120, 198, 0.06)',
  python: 'rgba(55, 118, 171, 0.06)',
  py: 'rgba(55, 118, 171, 0.06)',
  rust: 'rgba(222, 165, 132, 0.06)',
  go: 'rgba(0, 173, 216, 0.06)',
  bash: 'rgba(51, 51, 51, 0.06)',
  sh: 'rgba(51, 51, 51, 0.06)',
  sql: 'rgba(227, 119, 42, 0.06)',
  r: 'rgba(39, 128, 227, 0.06)',
  json: 'rgba(50, 116, 88, 0.06)',
  html: 'rgba(227, 79, 38, 0.06)',
  css: 'rgba(21, 114, 182, 0.06)',
  markdown: 'rgba(0, 0, 0, 0.03)',
  yaml: 'rgba(203, 65, 84, 0.06)',
  yml: 'rgba(203, 65, 84, 0.06)',
  java: 'rgba(176, 114, 25, 0.06)',
  cpp: 'rgba(0, 89, 156, 0.06)',
  c: 'rgba(85, 85, 85, 0.06)',
}

function getLangColor(className?: string): string {
  if (!className) return 'var(--vl-bg-inner)'
  const match = className.match(/language-(\w+)/)
  if (match && LANG_COLORS[match[1]]) return LANG_COLORS[match[1]]
  return 'var(--vl-bg-inner)'
}

function getLangName(className?: string): string {
  if (!className) return ''
  const match = className.match(/language-(\w+)/)
  return match ? match[1].toUpperCase() : ''
}

// ============================================================
// EnhancedCodeBlock — code blocks with copy button and language label
// ============================================================

function EnhancedCodeBlock({ className, children, ...props }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const codeText = String(children).replace(/\n$/, '')
  const isCodeBlock = className?.includes('language-')
  const lang = getLangName(className)
  const bgColor = getLangColor(className)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: create textarea
      const textarea = document.createElement('textarea')
      textarea.value = codeText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [codeText])

  if (isCodeBlock) {
    return (
      <div className="relative group/code my-3 rounded-lg overflow-hidden border border-[var(--vl-border-subtle)]">
        {/* Language label + Copy button bar */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--vl-border-subtle)]" style={{ background: 'var(--vl-bg-card)' }}>
          <span className="text-[10px] font-mono font-medium vl-text-muted tracking-wider">{lang}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] vl-text-muted hover:vl-text-body transition-colors hover:bg-[var(--vl-bg-inner)]"
            aria-label="Copy code"
          >
            {copied ? (
              <>
                <CheckCircle2 className="size-3 text-emerald-400" />
                <span className="text-emerald-400">{t('en', 'markdown.copied')}</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>{t('en', 'markdown.copyCode')}</span>
              </>
            )}
          </button>
        </div>
        <pre
          className={`${className || ''} p-4 overflow-x-auto text-xs leading-relaxed`}
          style={{ background: bgColor, margin: 0 }}
        >
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    )
  }

  // Inline code
  return (
    <code
      className={`${className || ''} px-1.5 py-0.5 rounded text-xs font-mono`}
      style={{
        background: 'var(--vl-bg-inner)',
        border: '1px solid var(--vl-border-subtle)',
      }}
      {...props}
    >
      {children}
    </code>
  )
}

// ============================================================
// Math rendering — lightweight LaTeX display without external libs
// ============================================================

/** Escape common LaTeX tokens so they render as visible text in code elements */
function escapeLatexDisplay(math: string): string {
  return math
    .replace(/\\_/g, '_')
    .replace(/\\\*/g, '*')
    .replace(/\\\\/g, '\\')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
    .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
    .replace(/\\sum/g, 'Σ')
    .replace(/\\prod/g, 'Π')
    .replace(/\\int/g, '∫')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\epsilon/g, 'ε')
    .replace(/\\theta/g, 'θ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\omega/g, 'ω')
    .replace(/\\pi/g, 'π')
    .replace(/\\infty/g, '∞')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\\approx/g, '≈')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\in/g, '∈')
    .replace(/\\notin/g, '∉')
    .replace(/\\subset/g, '⊂')
    .replace(/\\cup/g, '∪')
    .replace(/\\cap/g, '∩')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\leftarrow/g, '←')
    .replace(/\\Rightarrow/g, '⇒')
    .replace(/\\Leftrightarrow/g, '⇔')
    .replace(/\\cdot/g, '·')
    .replace(/\\ldots/g, '…')
    .replace(/\\cdots/g, '⋯')
    .replace(/\\hat\{([^}]*)\}/g, '$1̂')
    .replace(/\\bar\{([^}]*)\}/g, '$1̄')
    .replace(/\\vec\{([^}]*)\}/g, '$1⃗')
    .trim()
}

/** Split text into alternating plain-text and math segments */
function parseMathSegments(text: string): (string | { math: string; display: boolean })[] {
  const segments: (string | { math: string; display: boolean })[] = []
  // Match $$...$$ first (block), then $...$ (inline)
  const regex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index))
    }
    if (match[1] !== undefined) {
      segments.push({ math: match[1].trim(), display: true })
    } else if (match[2] !== undefined) {
      segments.push({ math: match[2].trim(), display: false })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex))
  }

  return segments
}

/** Render mixed text + math segments into React nodes */
function renderMathSegments(text: string): React.ReactNode[] {
  const segments = parseMathSegments(text)
  return segments.map((seg, i) => {
    if (typeof seg === 'string') {
      return <span key={i}>{seg}</span>
    }
    const display = escapeLatexDisplay(seg.math)
    if (seg.display) {
      return (
        <div
          key={i}
          className="my-3 py-2.5 px-4 overflow-x-auto"
          style={{
            background: 'var(--vl-bg-inner)',
            border: '1px solid var(--vl-border-subtle)',
            borderRadius: '6px',
            fontFamily: '"Courier New", Courier, monospace',
            fontSize: '0.875rem',
            lineHeight: '1.8',
            textAlign: 'center',
            color: 'var(--vl-text-heading)',
          }}
        >
          {display}
        </div>
      )
    }
    return (
      <code
        key={i}
        className="px-1 py-0.5 mx-0.5 rounded"
        style={{
          background: 'var(--vl-accent-bg)',
          border: '1px solid var(--vl-border-accent)',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.85em',
          fontStyle: 'italic',
          color: 'var(--vl-accent)',
          lineHeight: '1.4',
        }}
      >
        {display}
      </code>
    )
  })
}

// ============================================================
// Enhanced Markdown Components
// ============================================================

const enhancedComponents = {
  code: EnhancedCodeBlock,
  // Table styling
  table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-[var(--vl-border-subtle)]">
      <table className="w-full text-xs" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead style={{ background: 'var(--vl-bg-inner)' }} {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-3 py-2 text-left font-semibold text-xs vl-text-heading border-b border-[var(--vl-border)]"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      className="px-3 py-2 border-b border-[var(--vl-border-subtle)] vl-text-body"
      {...props}
    >
      {children}
    </td>
  ),
  tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="hover:bg-[var(--vl-bg-inner)]/50 transition-colors" {...props}>
      {children}
    </tr>
  ),
  // Blockquote styling
  blockquote: ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="my-3 pl-4 border-l-2 border-emerald-500/50 italic vl-text-muted"
      {...props}
    >
      {children}
    </blockquote>
  ),
  // Link styling — open in new tab
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
      {...props}
    >
      {children}
    </a>
  ),
  // Image with lazy loading
  img: ({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      className="my-2 rounded-lg max-w-full h-auto border border-[var(--vl-border-subtle)]"
      {...props}
    />
  ),
  // Headings
  h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-lg font-bold mt-4 mb-2 vl-text-heading" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="text-base font-bold mt-3 mb-1.5 vl-text-heading" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-sm font-bold mt-2 mb-1 vl-text-heading" {...props}>{children}</h3>
  ),
  // Lists
  ul: ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-1.5 ml-4 list-disc space-y-0.5 text-sm vl-text-body" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-1.5 ml-4 list-decimal space-y-0.5 text-sm vl-text-body" {...props}>{children}</ol>
  ),
  // Horizontal rule
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-3 border-[var(--vl-border-subtle)]" {...props} />
  ),
}

// ============================================================
// EnhancedMarkdown Component
// ============================================================

export function EnhancedMarkdown({ content, className = '' }: { content: string; className?: string }) {
  // Process math expressions before passing to ReactMarkdown.
  // We extract math into placeholder tokens so ReactMarkdown doesn't
  // mangle the dollar signs, then replace them back in a custom 'p' renderer.
  const processedContent = useMemo(() => {
    let counter = 0
    const mathMap = new Map<string, { math: string; display: boolean }>()

    // Replace $$...$$ (block math)
    const withBlockMath = content.replace(/\$\$([\s\S]+?)\$\$/g, (_match, math: string) => {
      const token = `%%MATH_BLOCK_${counter++}%%`
      mathMap.set(token, { math: math.trim(), display: true })
      return token
    })

    // Replace $...$ (inline math)
    const withInlineMath = withBlockMath.replace(/\$([^\$\n]+?)\$/g, (_match, math: string) => {
      const token = `%%MATH_INLINE_${counter++}%%`
      mathMap.set(token, { math: math.trim(), display: false })
      return token
    })

    return { text: withInlineMath, mathMap }
  }, [content])

  // Build components with access to the current math map
  const componentsWithMath = useMemo(() => {
    return {
      ...enhancedComponents,
      // Override paragraph to resolve math tokens
      p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <p {...props}>{resolved}</p>
      },
      // Also resolve math inside table cells, list items, etc.
      td: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <td {...props}>{resolved}</td>
      },
      th: ({ children, ...props }: React.HTMLAttributes<HTMLTableCellElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <th {...props}>{resolved}</th>
      },
      li: ({ children, ...props }: React.HTMLAttributes<HTMLLIElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <li {...props}>{resolved}</li>
      },
      strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <strong {...props}>{resolved}</strong>
      },
      em: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => {
        const resolved = resolveMathInChildren(children, processedContent.mathMap)
        return <em {...props}>{resolved}</em>
      },
    }
  }, [processedContent.mathMap])

  return (
    <div className={`vl-prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown components={componentsWithMath}>
        {processedContent.text}
      </ReactMarkdown>
    </div>
  )
}

/** Walk React children and resolve any math token strings into rendered math */
function resolveMathInChildren(
  children: React.ReactNode,
  mathMap: Map<string, { math: string; display: boolean }>
): React.ReactNode {
  if (typeof children === 'string') {
    // Check if the string contains a math token
    const parts = children.split(/(%%MATH_(?:BLOCK|INLINE)_\d+%%)/)
    if (parts.length === 1) return children
    return parts.map((part, i) => {
      const entry = mathMap.get(part)
      if (entry) {
        return <MathDisplay key={i} math={entry.math} display={entry.display} />
      }
      return part
    })
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      <React.Fragment key={i}>{resolveMathInChildren(child, mathMap)}</React.Fragment>
    ))
  }
  return children
}

/** Render a single math expression */
function MathDisplay({ math, display }: { math: string; display: boolean }) {
  const displayText = escapeLatexDisplay(math)
  if (display) {
    return (
      <div
        className="my-3 py-2.5 px-4 overflow-x-auto"
        style={{
          background: 'var(--vl-bg-inner)',
          border: '1px solid var(--vl-border-subtle)',
          borderRadius: '6px',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '0.875rem',
          lineHeight: '1.8',
          textAlign: 'center',
          color: 'var(--vl-text-heading)',
        }}
      >
        {displayText}
      </div>
    )
  }
  return (
    <code
      className="px-1 py-0.5 mx-0.5 rounded"
      style={{
        background: 'var(--vl-accent-bg)',
        border: '1px solid var(--vl-border-accent)',
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '0.85em',
        fontStyle: 'italic',
        color: 'var(--vl-accent)',
        lineHeight: '1.4',
      }}
    >
      {displayText}
    </code>
  )
}

// Export the components object for backward compatibility
export const enhancedMarkdownComponents = enhancedComponents

// Re-export EnhancedCodeBlock for direct use
export { EnhancedCodeBlock }
