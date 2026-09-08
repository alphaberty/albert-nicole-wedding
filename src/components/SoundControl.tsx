import { chimeAudio, useChimeAudio } from '../lib/audio'
import { music } from '../config/wedding'

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5H4z" />
      {muted ? (
        <>
          <path d="M17 9l4 6" />
          <path d="M21 9l-4 6" />
        </>
      ) : (
        <>
          <path d="M16.5 8.8a4.5 4.5 0 0 1 0 6.4" />
          <path d="M19 6.2a8 8 0 0 1 0 11.6" />
        </>
      )}
    </svg>
  )
}

export function SoundControl() {
  const { enabled, muted } = useChimeAudio()
  if (!enabled) {
    return (
      <button type="button" className="sound sound--enable" onClick={() => void chimeAudio.enable()}>
        <SpeakerIcon muted={false} />
        <span>Enable sound</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      className="sound"
      onClick={() => chimeAudio.toggleMute()}
      aria-pressed={!muted}
      aria-label={muted ? 'Sound is off. Turn sound on' : 'Sound is on. Turn sound off'}
      title={(muted ? 'Unmute' : 'Mute') + (music.title ? ` · ${music.title}` : '')}
    >
      <SpeakerIcon muted={muted} />
    </button>
  )
}
