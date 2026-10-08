export function StatPill({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  /** game accent; becomes ink in light mode (accent-as-text rule) */
  accent?: string
}) {
  return (
    <div className="min-w-12 rounded-[10px] bg-ink-800 px-2 py-1 text-right sm:min-w-14 sm:px-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[.1em] text-dim">{label}</div>
      <div
        className={`font-mono text-[15px] font-medium ${accent ? 'text-(--accent) light:text-on-accent' : ''}`}
        style={accent ? ({ '--accent': accent } as React.CSSProperties) : undefined}
      >
        {value}
      </div>
    </div>
  )
}
