import { SettingsMenu } from '#/components/SettingsMenu'

export function Footer() {
  return (
    <footer className="border-t border-ink-hair">
      <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] py-6 font-mono text-xs uppercase tracking-[.08em] text-dim">
        <span>Matinee · short features, no downloads</span>
        <SettingsMenu />
      </div>
    </footer>
  )
}
