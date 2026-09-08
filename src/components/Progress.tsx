import { SECTION } from '../scene/sections'
import type { GoTo } from '../App'

const STEPS = [
  { index: SECTION.meal, label: 'Meal' },
  { index: SECTION.afterParty, label: 'After-party' },
  { index: SECTION.name, label: 'Name' },
  { index: SECTION.email, label: 'Email' },
  { index: SECTION.review, label: 'Review' },
]

export function Progress({ active, goTo }: { active: number; goTo: GoTo }) {
  const position = STEPS.findIndex((s) => s.index === active)
  const visible = position >= 0
  return (
    <nav className={`progress ${visible ? 'is-visible' : ''}`} aria-label="Progress" aria-hidden={!visible}>
      <p className="progress__count">
        <span>{Math.max(1, position + 1)}</span> / {STEPS.length}
      </p>
      <ol className="progress__dots">
        {STEPS.map((s, i) => (
          <li key={s.index}>
            <button
              type="button"
              className={`progress__dot ${i === position ? 'is-active' : ''} ${i < position ? 'is-done' : ''}`}
              onClick={() => goTo(s.index)}
              aria-current={i === position ? 'step' : undefined}
              tabIndex={visible ? 0 : -1}
            >
              <span className="progress__label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
