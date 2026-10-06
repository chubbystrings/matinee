import type { ComponentProps } from 'react'

type Variant = 'primary' | 'secondary'

const base =
  'inline-flex items-center justify-center gap-2.5 rounded-pill px-[26px] font-display text-[13px] font-semibold uppercase tracking-[.06em] transition-[background-color,box-shadow,border-color] duration-150 cursor-pointer'

const variants: Record<Variant, string> = {
  primary: 'bg-lime text-on-accent hover:bg-lime-hover hover:shadow-cta',
  secondary: 'border border-ink-500 bg-transparent text-paper hover:border-paper',
}

export function Button({
  variant = 'primary',
  compact = false,
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; compact?: boolean }) {
  return (
    <button
      type="button"
      className={`${base} ${variants[variant]} ${compact ? 'h-12' : 'h-[52px]'} ${className}`}
      {...props}
    />
  )
}

export function IconButton({ className = '', ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={`grid size-10 cursor-pointer place-items-center rounded-full border border-ink-500 text-paper hover:border-paper ${className}`}
      {...props}
    />
  )
}
