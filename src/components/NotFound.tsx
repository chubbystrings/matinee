import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[1240px] flex-col items-start justify-center gap-5 px-[clamp(16px,4vw,40px)]">
      <div className="font-mono text-xs uppercase tracking-[.14em] text-muted">Error 404</div>
      <h1 className="font-display text-[clamp(40px,7.4vw,96px)] font-extrabold uppercase leading-[.9]">
        Not showing
      </h1>
      <p className="max-w-[46ch] text-lg text-text-2">That page isn’t on the marquee. Head back to the lobby.</p>
      <Link
        to="/"
        className="inline-flex h-[52px] items-center rounded-pill bg-lime px-[26px] font-display text-[13px] font-semibold uppercase tracking-[.06em] text-on-accent hover:bg-lime-hover hover:shadow-cta"
      >
        Back to lobby
      </Link>
    </main>
  )
}
