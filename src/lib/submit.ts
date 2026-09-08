/**
 * Sends a guest response to the storage endpoint (Google Apps Script → Sheet).
 *
 * The request body is JSON sent as text/plain so the browser skips the CORS
 * preflight that Apps Script cannot answer. Each response carries a
 * submissionId generated in the browser; the script ignores repeats of the
 * same id, so a double-click or a retry never creates a second row.
 */

export interface ResponsePayload {
  submissionId: string
  name: string
  email: string
  mainCourse: string
  mainCourseLabel: string
  afterParty: 'yes' | 'no'
  dietary: string
  submittedAt: string
}

export interface SubmitResult {
  ok: true
  duplicate: boolean
}

export class SubmitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SubmitError'
  }
}

const TIMEOUT_MS = 20000

export async function submitResponse(payload: ResponsePayload, endpoint: string): Promise<SubmitResult> {
  if (!endpoint) {
    if (import.meta.env.DEV) return mockSubmit(payload)
    throw new SubmitError(
      'Responses are not connected to storage yet. Please let Albert & Nicole know, and try again later.',
    )
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) throw new SubmitError(`The storage service answered with status ${res.status}. Please try again.`)
    let data: { ok?: boolean; duplicate?: boolean; error?: string }
    try {
      data = (await res.json()) as typeof data
    } catch {
      throw new SubmitError('We could not read the reply from the storage service. Please try again.')
    }
    if (!data.ok) throw new SubmitError(data.error || 'The storage service could not save your response. Please try again.')
    return { ok: true, duplicate: Boolean(data.duplicate) }
  } catch (err) {
    if (err instanceof SubmitError) throw err
    if ((err as Error).name === 'AbortError') {
      throw new SubmitError('That took too long. Please check your connection and try again.')
    }
    throw new SubmitError('We could not reach the storage service. Please check your connection and try again.')
  } finally {
    window.clearTimeout(timer)
  }
}

/** Development-only stand-in used when no endpoint is configured. */
async function mockSubmit(payload: ResponsePayload): Promise<SubmitResult> {
  await new Promise((r) => window.setTimeout(r, 900))
  const params = new URLSearchParams(window.location.search)
  if (params.has('simulateFailure') && !sessionStorage.getItem('mock-failed-once')) {
    sessionStorage.setItem('mock-failed-once', '1')
    throw new SubmitError('Simulated failure (dev only). Try again to succeed.')
  }
  const key = 'mock-responses'
  const existing: ResponsePayload[] = JSON.parse(sessionStorage.getItem(key) || '[]')
  const duplicate = existing.some((r) => r.submissionId === payload.submissionId)
  if (!duplicate) sessionStorage.setItem(key, JSON.stringify([...existing, payload]))
  console.info('[dev] mock response saved', payload, { duplicate })
  return { ok: true, duplicate }
}
