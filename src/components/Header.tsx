import { Link } from '@tanstack/react-router'
import { toggleTheme, useTheme } from '#/store/theme'

export function Header() {
  const theme = useTheme()
  return (
    <header className="sticky top-0 z-20 border-b border-ink-hair bg-[var(--mt-header)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="size-3 rounded-full bg-lime shadow-[0_0_14px_#C8F031]" />
          <span className="font-display text-lg font-extrabold tracking-[.06em]">MATINEE</span>
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="grid size-9 cursor-pointer place-items-center rounded-full border border-ink-500 text-paper"
        >
          <span
            aria-hidden
            className="size-4 rounded-full border-[1.5px] border-current"
            style={{ background: 'linear-gradient(90deg,currentColor 50%,transparent 50%)' }}
          />
        </button>
      </div>
    </header>
  )
}
