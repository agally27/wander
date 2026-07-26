import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import { VIBES } from '../lib/vibes'
import { searchPlaces, reverseGeocode } from '../lib/api/geocode'
import type { LngLat, Place } from '../lib/types'
import { formatDistance } from '../lib/units'
import { Btn, Header } from './ui'
import MapCanvas from './MapCanvas'

export default function CreateFlow() {
  const { draft, setDraft, goto, generate, genError } = useApp()
  const step = draft.step

  const next = () => setDraft({ step: step + 1 })
  const back = () => (step === 0 ? goto('home') : setDraft({ step: step - 1 }))

  return (
    <div className="screen create">
      <Header title="Plan a walk" onBack={back} right={<span className="steps">{step + 1}/3</span>} />
      {genError && <div className="banner banner--err">{genError}</div>}

      {step === 0 && <VibeStep onNext={next} />}
      {step === 1 && <LocationStep onNext={next} />}
      {step === 2 && <LengthStep onGenerate={generate} />}
    </div>
  )
}

function VibeStep({ onNext }: { onNext: () => void }) {
  const { draft, setDraft } = useApp()
  return (
    <div className="step">
      <p className="step__lead">What are you in the mood for?</p>
      <div className="vibe-grid">
        {VIBES.map((v) => (
          <button
            key={v.id}
            className={'vibe-card' + (draft.vibe === v.id ? ' is-sel' : '')}
            style={{ ['--vibe' as any]: v.color, ['--vibe-soft' as any]: v.soft }}
            onClick={() => setDraft({ vibe: v.id })}
          >
            <span className="vibe-card__icon">{v.emoji}</span>
            <span className="vibe-card__name">{v.name}</span>
            <span className="vibe-card__tag">{v.tagline}</span>
          </button>
        ))}
      </div>
      <div className="step__actions">
        <Btn wide disabled={!draft.vibe} onClick={onNext}>
          Continue
        </Btn>
      </div>
    </div>
  )
}

function LocationStep({ onNext }: { onNext: () => void }) {
  const { draft, setDraft } = useApp()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const [busy, setBusy] = useState(false)
  const [locating, setLocating] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current)
    if (!q.trim()) {
      setResults([])
      return
    }
    timer.current = window.setTimeout(async () => {
      setBusy(true)
      try {
        setResults(await searchPlaces(q, draft.start?.coord))
      } catch {
        setResults([])
      } finally {
        setBusy(false)
      }
    }, 350)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [q])

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coord: LngLat = [pos.coords.longitude, pos.coords.latitude]
        const name = await reverseGeocode(coord)
        setDraft({ start: { name, detail: 'Your location', coord } })
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  // Open the picker already centred on the user, instead of a fixed
  // fallback point — same lookup as "Use my location", just automatic and
  // silent (the browser still shows its own permission prompt). Skipped
  // entirely if a start is already set (e.g. editing an existing walk), and
  // never overwrites a choice the user made while the lookup was pending.
  useEffect(() => {
    if (draft.start || !('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (useApp.getState().draft.start) return
        const coord: LngLat = [pos.coords.longitude, pos.coords.latitude]
        const name = await reverseGeocode(coord)
        if (useApp.getState().draft.start) return
        setDraft({ start: { name, detail: 'Your location', coord } })
      },
      () => {}, // denied/unavailable — falls back to the default map view
      { enableHighAccuracy: true, timeout: 8000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickOnMap = async (coord: LngLat) => {
    const name = await reverseGeocode(coord)
    setDraft({ start: { name, detail: 'Dropped pin', coord } })
  }

  return (
    <div className="step step--location">
      <p className="step__lead">Where should the walk begin?</p>
      <div className="search">
        <input
          className="search__input"
          placeholder="Search a place, street or postcode…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="search__loc" onClick={useMyLocation} disabled={locating}>
          {locating ? '…' : '◎ Use my location'}
        </button>
      </div>

      {busy && <div className="hint">Searching…</div>}
      {results.length > 0 && (
        <div className="results">
          {results.map((p, i) => (
            <button
              key={i}
              className="result"
              onClick={() => {
                setDraft({ start: p })
                setResults([])
                setQ('')
              }}
            >
              <span className="result__name">{p.name}</span>
              <span className="result__detail">{p.detail}</span>
            </button>
          ))}
        </div>
      )}

      <div className="picker-map">
        <MapCanvas center={draft.start?.coord} onPick={pickOnMap} showCenterPin />
        <div className="picker-map__hint">Tap the map to drop a start pin</div>
      </div>

      {draft.start && (
        <div className="chosen">
          <span className="chosen__pin">📍</span>
          <div>
            <div className="chosen__name">{draft.start.name}</div>
            {draft.start.detail && <div className="chosen__detail">{draft.start.detail}</div>}
          </div>
        </div>
      )}

      <div className="step__actions">
        <Btn wide disabled={!draft.start} onClick={onNext}>
          Continue
        </Btn>
      </div>
    </div>
  )
}

function LengthStep({ onGenerate }: { onGenerate: () => void }) {
  const { draft, setDraft, unit } = useApp()
  const durations = [30, 45, 60, 90]
  return (
    <div className="step">
      <p className="step__lead">How long a walk?</p>
      <div className="chips">
        {durations.map((d) => (
          <button
            key={d}
            className={'chip' + (draft.durationMin === d ? ' is-sel' : '')}
            onClick={() => setDraft({ durationMin: d })}
          >
            {d < 60 ? `${d} min` : `${d / 60} hr${d > 60 ? '+' : ''}`}
          </button>
        ))}
      </div>

      <p className="step__lead" style={{ marginTop: 28 }}>Pace</p>
      <div className="chips">
        <button className={'chip' + (draft.pace === 'stroll' ? ' is-sel' : '')} onClick={() => setDraft({ pace: 'stroll' })}>
          🚶 Stroll
        </button>
        <button className={'chip' + (draft.pace === 'brisk' ? ' is-sel' : '')} onClick={() => setDraft({ pace: 'brisk' })}>
          ⚡ Brisk
        </button>
      </div>

      <p className="step__lead" style={{ marginTop: 28 }}>Shape</p>
      <div className="chips">
        <button className={'chip' + (draft.shape === 'loop' ? ' is-sel' : '')} onClick={() => setDraft({ shape: 'loop' })}>
          🔁 Loop
        </button>
        <button className={'chip' + (draft.shape === 'outAndBack' ? ' is-sel' : '')} onClick={() => setDraft({ shape: 'outAndBack' })}>
          ↔️ There & back
        </button>
      </div>
      <p className="hint" style={{ padding: '6px 2px 0' }}>
        {draft.shape === 'loop'
          ? 'Different streets out and back, ending where you started.'
          : 'Out one way, then back along the very same path.'}
      </p>

      <div className="summary-note">
        We’ll route {draft.shape === 'loop' ? 'a loop' : 'a there-and-back walk'} of roughly{' '}
        {formatDistance((draft.durationMin / 60) * (draft.pace === 'stroll' ? 3.6 : 4.8), unit)} on real footpaths,
        then thread it through the best real places nearby.
      </div>

      <div className="step__actions">
        <Btn wide onClick={onGenerate}>
          Build my walk
        </Btn>
      </div>
    </div>
  )
}
