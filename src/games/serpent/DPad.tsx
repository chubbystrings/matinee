import type { Dir } from '#/hooks/useKeyDirection'

const BTN =
  'grid size-14 cursor-pointer place-items-center rounded-[14px] border border-ink-600 bg-ink-800 text-xl text-paper active:border-paper'

function Key({ dir, label, glyph, onDir }: { dir: Dir; label: string; glyph: string; onDir: (d: Dir) => void }) {
  return (
    <button type="button" aria-label={label} className={BTN} onPointerDown={() => onDir(dir)}>
      {glyph}
    </button>
  )
}

export function DPad({ onDir }: { onDir: (dir: Dir) => void }) {
  return (
    <div className="grid grid-cols-[repeat(3,56px)] grid-rows-[repeat(2,56px)] gap-2">
      <span />
      <Key dir="up" label="Up" glyph="↑" onDir={onDir} />
      <span />
      <Key dir="left" label="Left" glyph="←" onDir={onDir} />
      <Key dir="down" label="Down" glyph="↓" onDir={onDir} />
      <Key dir="right" label="Right" glyph="→" onDir={onDir} />
    </div>
  )
}
