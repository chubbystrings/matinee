import type { ComponentProps } from 'react'

/** Native select with a custom chevron, inset from the edge so it never touches the border. */
export function Select({ className = '', children, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative inline-flex">
      <select
        className={`h-9 cursor-pointer appearance-none rounded-pill border border-ink-500 bg-ink-800 py-0 pl-3.5 pr-9 font-mono text-xs uppercase tracking-[.08em] text-paper hover:border-paper ${className}`}
        {...props}
      >
        {children}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 size-1.5 -translate-y-[65%] rotate-45 border-b-[1.5px] border-r-[1.5px] border-current text-muted"
      />
    </span>
  )
}
