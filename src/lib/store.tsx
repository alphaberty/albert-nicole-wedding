import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { menu, storage } from '../config/wedding'
import { submitResponse, SubmitError, type ResponsePayload } from './submit'

export type AfterPartyAnswer = 'yes' | 'no'

export interface Draft {
  submissionId: string
  name: string
  email: string
  mainCourse: string | null
  afterParty: AfterPartyAnswer | null
  dietary: string
}

export type Status = 'idle' | 'submitting' | 'error' | 'success'

export interface SavedResponse extends ResponsePayload {
  duplicate: boolean
}

interface ResponseContextValue {
  draft: Draft
  status: Status
  error: string | null
  saved: SavedResponse | null
  update: (patch: Partial<Omit<Draft, 'submissionId'>>) => void
  submit: () => Promise<boolean>
  startAnother: () => void
  clearError: () => void
  validation: {
    mainCourse: boolean
    afterParty: boolean
    name: boolean
    email: boolean
    complete: boolean
  }
}

const DRAFT_KEY = 'wedding-response-draft'

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

function emptyDraft(email = ''): Draft {
  return { submissionId: newId(), name: '', email, mainCourse: null, afterParty: null, dietary: '' }
}

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw) as Partial<Draft>
    const base = emptyDraft()
    return {
      ...base,
      ...parsed,
      submissionId: typeof parsed.submissionId === 'string' ? parsed.submissionId : base.submissionId,
      mainCourse: menu.options.some((o) => o.id === parsed.mainCourse) ? (parsed.mainCourse as string) : null,
      afterParty: parsed.afterParty === 'yes' || parsed.afterParty === 'no' ? parsed.afterParty : null,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      dietary: typeof parsed.dietary === 'string' ? parsed.dietary : '',
    }
  } catch {
    return emptyDraft()
  }
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const ResponseContext = createContext<ResponseContextValue | null>(null)

export function ResponseProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedResponse | null>(null)
  const inFlight = useRef(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* private mode etc. */
    }
  }, [draft])

  const update = useCallback((patch: Partial<Omit<Draft, 'submissionId'>>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(null)
    setStatus((s) => (s === 'error' ? 'idle' : s))
  }, [])

  const validation = useMemo(() => {
    const mainCourse = draft.mainCourse !== null
    const afterParty = draft.afterParty !== null
    const name = draft.name.trim().length >= 2
    const email = EMAIL_RE.test(draft.email.trim())
    return { mainCourse, afterParty, name, email, complete: mainCourse && afterParty && name && email }
  }, [draft])

  const submit = useCallback(async () => {
    if (inFlight.current || status === 'submitting') return false
    if (!validation.complete || !draft.mainCourse || !draft.afterParty) return false
    inFlight.current = true
    setStatus('submitting')
    setError(null)
    const option = menu.options.find((o) => o.id === draft.mainCourse)
    const payload: ResponsePayload = {
      submissionId: draft.submissionId,
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      mainCourse: draft.mainCourse,
      mainCourseLabel: option?.name ?? draft.mainCourse,
      afterParty: draft.afterParty,
      dietary: draft.dietary.trim(),
      submittedAt: new Date().toISOString(),
    }
    try {
      const result = await submitResponse(payload, storage.endpoint)
      setSaved({ ...payload, duplicate: result.duplicate })
      setStatus('success')
      return true
    } catch (err) {
      const message = err instanceof SubmitError ? err.message : 'Something went wrong. Please try again.'
      setError(message)
      setStatus('error')
      return false
    } finally {
      inFlight.current = false
    }
  }, [draft, status, validation.complete])

  const startAnother = useCallback(() => {
    setDraft((d) => emptyDraft(d.email))
    setSaved(null)
    setError(null)
    setStatus('idle')
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    setStatus((s) => (s === 'error' ? 'idle' : s))
  }, [])

  const value = useMemo<ResponseContextValue>(
    () => ({ draft, status, error, saved, update, submit, startAnother, clearError, validation }),
    [draft, status, error, saved, update, submit, startAnother, clearError, validation],
  )

  return <ResponseContext.Provider value={value}>{children}</ResponseContext.Provider>
}

export function useResponse(): ResponseContextValue {
  const ctx = useContext(ResponseContext)
  if (!ctx) throw new Error('useResponse must be used inside ResponseProvider')
  return ctx
}
