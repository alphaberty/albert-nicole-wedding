/**
 * ─────────────────────────────────────────────────────────────
 *  WEDDING CONFIGURATION
 *  Everything guests read about the wedding lives in this file.
 *  Edit the text below and redeploy; no other code changes needed.
 * ─────────────────────────────────────────────────────────────
 */

export interface MenuOption {
  /** Stored in the responses sheet. Keep short and stable (e.g. "A", "B"). */
  id: string
  /** Shown as the option title. */
  name: string
  /** Optional one-line description under the title. Use "" to hide it. */
  description: string
}

export const menu = {
  question: 'What would you like for dinner?',
  hint: 'Choose one main course. You can change your mind until you submit.',
  options: [
    { id: 'A', name: 'Option A', description: 'Details to be announced' },
    { id: 'B', name: 'Option B', description: 'Details to be announced' },
  ] satisfies MenuOption[],
  dietaryLabel: 'Dietary requirements or allergies',
  dietaryPlaceholder: 'e.g. no shellfish, vegetarian, nut allergy',
}

export const afterParty = {
  question: 'Keep the celebration going?',
  /** Shown under the heading. No time or place has been set yet, so the copy only gathers interest. */
  blurb:
    'We’re thinking about an after-party once dinner winds down. Nothing is fixed yet; we’re simply gathering interest and will share details closer to the day.',
  yesLabel: 'Yes, I’m interested',
  noLabel: 'No, thank you',
  /** Optional. When known, set e.g. { time: '10.30 pm onwards', place: 'Hotel bar' }. Leave undefined until confirmed. */
  details: undefined as { time?: string; place?: string; note?: string } | undefined,
}

export const wedding = {
  couple: {
    first: 'Albert',
    second: 'Nicole',
    fullNames: 'Albert Li & Nicole Lee',
  },
  date: {
    iso: '2026-11-21',
    long: 'Saturday, 21 November 2026',
    short: '21 November 2026',
  },
  timezoneNote: 'All times are Singapore time.',
  schedule: [
    { label: 'Cocktail reception', time: '6 – 7 pm' },
    { label: 'Dinner', time: '7 – 10 pm' },
  ],
  venue: {
    name: '1-Flowerhill',
    address: '6 Imbiah Road, Singapore 099696',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=1-Flowerhill%2C+6+Imbiah+Road%2C+Singapore+099696',
  },
  dressCode: 'Smart casual · Garden Monet-inspired hues',
  /** Landing page welcome copy. */
  welcome:
    'We’re looking forward to having you there on the big day. Before then, please tell us what you’d like for dinner and whether you’d stay on for the after-party.',
  /** Optional. When set it is shown on the landing and review screens, e.g. 'Please respond by 1 October 2026'. */
  responseDeadline: undefined as string | undefined,
}

/**
 * Optional background music, played on loop once a guest enables sound.
 * Put the file in public/audio/ (e.g. public/audio/background.mp3) and set
 * src to 'audio/background.mp3'. Leave src empty for no music.
 */
export const music = {
  src: '',
  /** 0–1. Keep it well under the chime so the tones stay audible. */
  volume: 0.3,
  /** Shown as the sound button's tooltip when set, e.g. 'Music: Song title'. */
  title: '',
}

/**
 * Where responses are saved. The Apps Script web-app URL is injected at build
 * time from the VITE_RESPONSES_ENDPOINT environment variable (see README).
 */
export const storage = {
  endpoint: (import.meta.env.VITE_RESPONSES_ENDPOINT as string | undefined)?.trim() || '',
}
