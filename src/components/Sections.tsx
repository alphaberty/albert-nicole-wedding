import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { afterParty, menu, wedding } from '../config/wedding'
import { useResponse } from '../lib/store'
import { SECTION } from '../scene/sections'
import { ChimeHitArea } from './ChimeHitArea'
import type { GoTo } from '../App'

type Register = (el: HTMLElement | null) => void

interface StepProps {
  register: Register
  goTo: GoTo
}

/* ───────────────────────── shared pieces ───────────────────────── */

function Step({
  index,
  register,
  className = '',
  children,
  labelledBy,
}: {
  index: number
  register: Register
  className?: string
  children: ReactNode
  labelledBy: string
}) {
  return (
    <section
      className={`step ${className}`}
      ref={register}
      data-index={index}
      aria-labelledby={labelledBy}
    >
      <div className="step__inner">{children}</div>
    </section>
  )
}

function StepNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  error,
  busy,
}: {
  onBack: () => void
  onNext: () => void
  nextLabel?: string
  error?: string | null
  busy?: boolean
}) {
  return (
    <div className="nav">
      <div className="nav__status" aria-live="polite">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="nav__row">
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn--primary" onClick={onNext} disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" /> Saving…
            </>
          ) : (
            nextLabel
          )}
        </button>
      </div>
    </div>
  )
}

function Ornament() {
  return (
    <span className="ornament" aria-hidden="true">
      <span />囍<span />
    </span>
  )
}

/* ───────────────────────── landing ───────────────────────── */

export function Landing({ register, goTo }: StepProps) {
  const id = useId()
  return (
    <Step index={SECTION.landing} register={register} className="step--landing" labelledBy={id}>
      <ChimeHitArea />
      <div className="landing">
        <p className="landing__glyph" aria-hidden="true">
          囍
        </p>
        <h1 className="names" id={id} tabIndex={-1}>
          <span className="names__script">{wedding.couple.first}</span>
          <span className="names__amp"> &amp; </span>
          <span className="names__script">{wedding.couple.second}</span>
        </h1>
        <p className="landing__date">
          <span>{wedding.date.long}</span>
          <span className="dot" aria-hidden="true">
            ·
          </span>
          <span>{wedding.venue.name}, Singapore</span>
        </p>
        <p className="landing__welcome">{wedding.welcome}</p>
        {wedding.responseDeadline && <p className="landing__deadline">{wedding.responseDeadline}</p>}
        <div className="landing__actions">
          <button type="button" className="btn btn--primary btn--lg" onClick={() => goTo(SECTION.meal)}>
            Choose your meal
          </button>
        </div>
        <button type="button" className="scroll-cue" onClick={() => goTo(SECTION.meal)}>
          <span className="scroll-cue__line" aria-hidden="true" />
          <span>Scroll</span>
        </button>
      </div>
    </Step>
  )
}

/* ───────────────────────── 1 · main course ───────────────────────── */

export function MealStep({ register, goTo }: StepProps) {
  const { draft, update, validation } = useResponse()
  const [error, setError] = useState<string | null>(null)
  const [dietaryOpen, setDietaryOpen] = useState(draft.dietary.length > 0)
  const id = useId()
  const dietaryId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (draft.dietary.length > 0) setDietaryOpen(true)
  }, [draft.dietary])

  // A fresh response (e.g. "Submit for another guest") starts with the field folded away.
  useEffect(() => {
    setDietaryOpen(draft.dietary.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.submissionId])

  const next = () => {
    if (!validation.mainCourse) {
      setError('Please choose one main course to continue.')
      return
    }
    setError(null)
    goTo(SECTION.afterParty)
  }

  return (
    <Step index={SECTION.meal} register={register} labelledBy={id}>
      <div className="card">
        <p className="eyebrow">Main course</p>
        <h2 id={id} tabIndex={-1}>
          {menu.question}
        </h2>
        <p className="hint">{menu.hint}</p>

        <fieldset className="options">
          <legend className="visually-hidden">Main course</legend>
          {menu.options.map((o, i) => {
            const selected = draft.mainCourse === o.id
            return (
              <label key={o.id} className={`option ${selected ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="mainCourse"
                  value={o.id}
                  checked={selected}
                  onChange={() => {
                    update({ mainCourse: o.id })
                    setError(null)
                  }}
                />
                <span className="option__index" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="option__body">
                  <span className="option__name">{o.name}</span>
                  {o.description && <span className="option__desc">{o.description}</span>}
                </span>
                <span className="option__check" aria-hidden="true" />
              </label>
            )
          })}
        </fieldset>

        <div className="dietary">
          <button
            type="button"
            className="link-btn"
            aria-expanded={dietaryOpen}
            aria-controls={dietaryId}
            onClick={() => {
              setDietaryOpen((v) => !v)
              if (!dietaryOpen) window.setTimeout(() => textareaRef.current?.focus(), 50)
            }}
          >
            <span className="link-btn__icon" aria-hidden="true">
              {dietaryOpen ? '−' : '+'}
            </span>
            {menu.dietaryLabel} <span className="optional">(optional)</span>
          </button>
          {dietaryOpen && (
            <div className="field" id={dietaryId}>
              <label className="visually-hidden" htmlFor={`${dietaryId}-input`}>
                {menu.dietaryLabel}
              </label>
              <textarea
                id={`${dietaryId}-input`}
                ref={textareaRef}
                rows={3}
                maxLength={500}
                value={draft.dietary}
                placeholder={menu.dietaryPlaceholder}
                onChange={(e) => update({ dietary: e.target.value })}
              />
            </div>
          )}
        </div>

        <StepNav onBack={() => goTo(SECTION.landing)} onNext={next} error={error} />
      </div>
    </Step>
  )
}

/* ───────────────────────── 2 · after-party ───────────────────────── */

export function AfterPartyStep({ register, goTo }: StepProps) {
  const { draft, update, validation } = useResponse()
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  const next = () => {
    if (!validation.afterParty) {
      setError('Please let us know either way to continue.')
      return
    }
    setError(null)
    goTo(SECTION.name)
  }

  const choices: { value: 'yes' | 'no'; label: string }[] = [
    { value: 'yes', label: afterParty.yesLabel },
    { value: 'no', label: afterParty.noLabel },
  ]

  return (
    <Step index={SECTION.afterParty} register={register} labelledBy={id}>
      <div className="card">
        <p className="eyebrow">After-party</p>
        <h2 id={id} tabIndex={-1}>
          {afterParty.question}
        </h2>
        <p className="hint">{afterParty.blurb}</p>
        {afterParty.details && (
          <p className="hint">
            {[afterParty.details.time, afterParty.details.place, afterParty.details.note].filter(Boolean).join(' · ')}
          </p>
        )}

        <fieldset className="options options--row">
          <legend className="visually-hidden">After-party interest</legend>
          {choices.map((c) => {
            const selected = draft.afterParty === c.value
            return (
              <label key={c.value} className={`option ${selected ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="afterParty"
                  value={c.value}
                  checked={selected}
                  onChange={() => {
                    update({ afterParty: c.value })
                    setError(null)
                  }}
                />
                <span className="option__body">
                  <span className="option__name">{c.label}</span>
                </span>
                <span className="option__check" aria-hidden="true" />
              </label>
            )
          })}
        </fieldset>

        <StepNav onBack={() => goTo(SECTION.meal)} onNext={next} error={error} />
      </div>
    </Step>
  )
}

/* ───────────────────────── 3 · name ───────────────────────── */

export function NameStep({ register, goTo }: StepProps) {
  const { draft, update, validation } = useResponse()
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const inputId = useId()

  const next = () => {
    if (!validation.name) {
      setError('Please enter your full name.')
      return
    }
    setError(null)
    goTo(SECTION.email)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      next()
    }
  }

  return (
    <Step index={SECTION.name} register={register} labelledBy={id}>
      <div className="card">
        <p className="eyebrow">Your name</p>
        <h2 id={id} tabIndex={-1}>
          Who are we celebrating with?
        </h2>
        <div className="field">
          <label htmlFor={inputId}>Full name</label>
          <input
            id={inputId}
            type="text"
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            required
            maxLength={120}
            value={draft.name}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              update({ name: e.target.value })
              setError(null)
            }}
            onKeyDown={onKey}
          />
        </div>
        <p className="subtext">Please submit once per person. For your +1, submit another response.</p>
        <StepNav onBack={() => goTo(SECTION.afterParty)} onNext={next} error={error} />
      </div>
    </Step>
  )
}

/* ───────────────────────── 4 · email ───────────────────────── */

export function EmailStep({ register, goTo }: StepProps) {
  const { draft, update, validation } = useResponse()
  const [error, setError] = useState<string | null>(null)
  const id = useId()
  const inputId = useId()

  const next = () => {
    if (!validation.email) {
      setError(draft.email.trim() ? 'That email address doesn’t look right. Please check it.' : 'Please enter your email address.')
      return
    }
    setError(null)
    goTo(SECTION.review)
  }
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      next()
    }
  }

  return (
    <Step index={SECTION.email} register={register} labelledBy={id}>
      <div className="card">
        <p className="eyebrow">Contact</p>
        <h2 id={id} tabIndex={-1}>
          Your email address
        </h2>
        <div className="field">
          <label htmlFor={inputId}>Email</label>
          <input
            id={inputId}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            required
            maxLength={160}
            value={draft.email}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              update({ email: e.target.value })
              setError(null)
            }}
            onKeyDown={onKey}
          />
        </div>
        <p className="subtext">We’ll use this to identify your response. No confirmation email will be sent.</p>
        <StepNav onBack={() => goTo(SECTION.name)} onNext={next} nextLabel="Review" error={error} />
      </div>
    </Step>
  )
}

/* ───────────────────────── 5 · review & submit ───────────────────────── */

export function ReviewStep({ register, goTo }: StepProps) {
  const { draft, validation, status, error, submit } = useResponse()
  const [localError, setLocalError] = useState<string | null>(null)
  const id = useId()
  const option = menu.options.find((o) => o.id === draft.mainCourse)
  const busy = status === 'submitting'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!validation.complete) {
      const missing = [
        !validation.mainCourse && 'your main course',
        !validation.afterParty && 'the after-party question',
        !validation.name && 'your name',
        !validation.email && 'a valid email address',
      ].filter(Boolean)
      setLocalError(`Please complete ${missing.join(', ')} before submitting.`)
      return
    }
    setLocalError(null)
    await submit()
  }

  const rows: { label: string; value: string | null; edit: number; missing: boolean }[] = [
    { label: 'Name', value: draft.name.trim() || null, edit: SECTION.name, missing: !validation.name },
    { label: 'Email', value: draft.email.trim() || null, edit: SECTION.email, missing: !validation.email },
    { label: 'Main course', value: option?.name ?? null, edit: SECTION.meal, missing: !validation.mainCourse },
    {
      label: 'After-party',
      value: draft.afterParty === 'yes' ? afterParty.yesLabel : draft.afterParty === 'no' ? afterParty.noLabel : null,
      edit: SECTION.afterParty,
      missing: !validation.afterParty,
    },
  ]
  if (draft.dietary.trim()) rows.push({ label: 'Dietary notes', value: draft.dietary.trim(), edit: SECTION.meal, missing: false })

  return (
    <Step index={SECTION.review} register={register} labelledBy={id}>
      <form className="card" onSubmit={onSubmit} noValidate>
        <p className="eyebrow">Almost there</p>
        <h2 id={id} tabIndex={-1}>
          Does this look right?
        </h2>
        <dl className="summary">
          {rows.map((r) => (
            <div key={r.label} className={`summary__row ${r.missing ? 'is-missing' : ''}`}>
              <dt>{r.label}</dt>
              <dd>
                <span>{r.value ?? 'Not answered yet'}</span>
                <button type="button" className="edit-btn" onClick={() => goTo(r.edit)}>
                  Edit<span className="visually-hidden"> {r.label}</span>
                </button>
              </dd>
            </div>
          ))}
        </dl>
        {wedding.responseDeadline && <p className="subtext">{wedding.responseDeadline}</p>}
        <div className="nav">
          <div className="nav__status" aria-live="polite">
            {(localError || error) && (
              <p className="error" role="alert">
                {localError || error}
                {error && !localError && <span className="error__hint"> Your answers are still here; please try again.</span>}
              </p>
            )}
          </div>
          <div className="nav__row">
            <button type="button" className="btn btn--ghost" onClick={() => goTo(SECTION.email)} disabled={busy}>
              Back
            </button>
            <button type="submit" className="btn btn--primary" disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <span className="spinner" aria-hidden="true" /> Saving…
                </>
              ) : error ? (
                'Try again'
              ) : (
                'Submit response'
              )}
            </button>
          </div>
        </div>
      </form>
    </Step>
  )
}

/* ───────────────────────── 6 · thank you ───────────────────────── */

export function ThankYou({ register, goTo, reduced }: StepProps & { reduced: boolean }) {
  const { saved, startAnother } = useResponse()
  const id = useId()
  if (!saved) return null
  const firstName = saved.name.split(/\s+/)[0]

  const another = () => {
    startAnother()
    window.requestAnimationFrame(() => goTo(SECTION.meal))
  }

  return (
    <Step index={SECTION.thanks} register={register} className="step--thanks" labelledBy={id}>
      {!reduced && <Petals />}
      <div className="card card--thanks">
        <p className="eyebrow">Saved</p>
        <h2 id={id} tabIndex={-1}>
          Thank you, {firstName}
        </h2>
        <p className="hint">
          Your response is in. We’ll see you at the garden{saved.afterParty === 'yes' ? ', and hopefully after' : ''}.
        </p>
        <dl className="summary summary--compact">
          <div className="summary__row">
            <dt>Main course</dt>
            <dd>{saved.mainCourseLabel}</dd>
          </div>
          <div className="summary__row">
            <dt>After-party</dt>
            <dd>{saved.afterParty === 'yes' ? afterParty.yesLabel : afterParty.noLabel}</dd>
          </div>
          {saved.dietary && (
            <div className="summary__row">
              <dt>Dietary notes</dt>
              <dd>{saved.dietary}</dd>
            </div>
          )}
        </dl>

        <Ornament />

        <div className="details">
          <p className="details__date">{wedding.date.long}</p>
          <ul className="details__list">
            {wedding.schedule.map((s) => (
              <li key={s.label}>
                <span>{s.label}</span>
                <span>{s.time}</span>
              </li>
            ))}
          </ul>
          <p className="details__venue">
            <strong>{wedding.venue.name}</strong>
            <br />
            {wedding.venue.address}
          </p>
          <p className="details__meta">
            {wedding.timezoneNote}
            <br />
            {wedding.dressCode}
          </p>
          <a className="btn btn--ghost" href={wedding.venue.mapUrl} target="_blank" rel="noopener noreferrer">
            Open in Maps
          </a>
        </div>

        <div className="nav">
          <div className="nav__row nav__row--single">
            <button type="button" className="btn btn--primary" onClick={another}>
              Submit for another guest
            </button>
          </div>
          <p className="subtext">Their name and choices start fresh; your email stays filled in and can be changed.</p>
        </div>
      </div>
    </Step>
  )
}

function Petals() {
  const petals = Array.from({ length: 22 }, (_, i) => ({
    left: (i * 37 + 11) % 100,
    delay: (i * 0.37) % 2.6,
    duration: 5.5 + ((i * 1.7) % 3),
    size: 9 + ((i * 5) % 8),
    hue: i % 3,
  }))
  return (
    <div className="petals" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className={`petal petal--${p.hue}`}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: p.size,
            height: p.size * 1.35,
          }}
        />
      ))}
    </div>
  )
}
