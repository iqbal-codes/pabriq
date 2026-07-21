import { createContext, useContext } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '#/lib/utils'

type AssistantMessageContentProps = {
  content: string
  className?: string
}

const PreContext = createContext(false)

const markdownComponents: Components = {
  h1: ({ node, className, children, ...props }) => (
    <h1
      className={cn(
        'mt-3 mb-1.5 text-base font-semibold font-heading tracking-tight text-foreground first:mt-0',
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ node, className, children, ...props }) => (
    <h2
      className={cn(
        'mt-3 mb-1.5 text-sm font-semibold font-heading tracking-tight text-foreground first:mt-0',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ node, className, children, ...props }) => (
    <h3
      className={cn(
        'mt-2.5 mb-1 text-xs font-semibold font-heading text-foreground first:mt-0',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
  p: ({ node, className, children, ...props }) => (
    <p
      className={cn(
        'mb-2 text-xs/relaxed text-foreground last:mb-0',
        className,
      )}
      {...props}
    >
      {children}
    </p>
  ),
  ul: ({ node, className, children, ...props }) => (
    <ul
      className={cn(
        'mb-2 pl-4 list-disc list-outside space-y-1 text-xs/relaxed text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ node, className, children, ...props }) => (
    <ol
      className={cn(
        'mb-2 pl-4 list-decimal list-outside space-y-1 text-xs/relaxed text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ node, className, children, ...props }) => (
    <li className={cn('text-xs/relaxed leading-normal', className)} {...props}>
      {children}
    </li>
  ),
  a: ({ node, className, children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'font-medium text-primary underline underline-offset-2 hover:text-primary/80 transition-colors break-all',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  ),
  blockquote: ({ node, className, children, ...props }) => (
    <blockquote
      className={cn(
        'my-2 rounded-none border-l-2 border-primary/50 bg-muted/30 py-1 pl-3 text-xs italic text-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </blockquote>
  ),
  pre: ({ node, className, children, ...props }) => (
    <PreContext.Provider value={true}>
      <pre
        className={cn(
          'my-2 max-w-full overflow-x-auto rounded-none border border-border bg-muted/60 p-2.5 font-mono text-xs text-foreground leading-relaxed scrollbar-thin',
          className,
        )}
        {...props}
      >
        {children}
      </pre>
    </PreContext.Provider>
  ),
  code: ({ node, className, children, ...props }) => {
    const isInsidePre = useContext(PreContext)

    if (isInsidePre) {
      return (
        <code
          className={cn(
            'bg-transparent border-0 p-0 font-mono text-xs whitespace-pre',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <code
        className={cn(
          'rounded-none border border-border/40 bg-muted px-1 py-0.5 font-mono text-[0.85em] font-medium text-foreground break-all',
          className,
        )}
        {...props}
      >
        {children}
      </code>
    )
  },
  table: ({ node, className, children, ...props }) => (
    <div className="my-2 max-w-full overflow-x-auto border border-border">
      <table
        className={cn(
          'w-full text-left font-mono text-xs text-foreground border-collapse',
          className,
        )}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ node, className, children, ...props }) => (
    <thead
      className={cn('bg-muted/60 border-b border-border', className)}
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ node, className, children, ...props }) => (
    <tbody className={cn('divide-y divide-border/60', className)} {...props}>
      {children}
    </tbody>
  ),
  tr: ({ node, className, children, ...props }) => (
    <tr
      className={cn('hover:bg-muted/30 transition-colors', className)}
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ node, className, children, ...props }) => (
    <th
      className={cn(
        'px-2.5 py-1.5 font-semibold text-foreground border-r border-border/40 last:border-r-0',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ node, className, children, ...props }) => (
    <td
      className={cn(
        'px-2.5 py-1.5 text-foreground/90 border-r border-border/40 last:border-r-0',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  ),
}

export default function AssistantMessageContent({
  content,
  className,
}: AssistantMessageContentProps) {
  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none text-xs/relaxed',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
