import { Button } from '#/components/Button'

export function GameOverlay({
  kicker,
  headline,
  action,
  onAction,
}: {
  kicker?: string
  headline: string
  action: string
  onAction: () => void
}) {
  return (
    <div
      role="status"
      className="absolute inset-0 z-10 flex animate-fade flex-col items-center justify-center gap-4 rounded-[inherit] bg-(--mt-overlay) text-center"
    >
      {kicker ? <div className="font-mono text-xs uppercase tracking-[.14em] text-muted">{kicker}</div> : null}
      <div className="font-display text-[clamp(26px,5vw,40px)] font-extrabold uppercase">{headline}</div>
      <Button compact onClick={onAction}>
        {action}
      </Button>
    </div>
  )
}
