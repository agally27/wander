import { useEffect, useState } from 'react'
import { useApp } from '../store'
import { findPlaceImage, type PlaceImage } from '../lib/api/imagery'
import { haversineKm } from '../lib/geo'
import type { Stop } from '../lib/types'
import { Btn, CatIcon, catLabel } from './ui'
import MapCanvas from './MapCanvas'

export default function WalkScreen() {
  const {
    current, position, simulate, setSimulate, simStep, gpsError,
    activeStopId, openStop, dismissStop, stopWalk, goto, finishWalk,
  } = useApp()
  if (!current) return null

  const active = current.stops.find((s) => s.id === activeStopId) ?? null
  const visited = current.stops.filter((s) => s.status === 'visited').length
  const next = current.stops.find((s) => s.status === 'next')
  const allDone = visited === current.stops.length
  const distToNext = next && position ? haversineKm(position, next.coord) : null

  return (
    <div className="screen walk">
      <div className="walk-map">
        <MapCanvas coords={current.coords} stops={current.stops} position={position} follow onStopClick={openStop} />
        <button
          className="walk-exit"
          onClick={() => {
            stopWalk()
            goto('preview')
          }}
          aria-label="Exit walk"
        >
          ✕
        </button>
        <div className="walk-mode">
          <button className={'seg' + (!simulate ? ' is-on' : '')} onClick={() => setSimulate(false)}>📡 GPS</button>
          <button className={'seg' + (simulate ? ' is-on' : '')} onClick={() => setSimulate(true)}>🧪 Preview</button>
        </div>
      </div>

      <div className="walk-hud">
        <div className="walk-progress">
          <div className="walk-progress__bar">
            <span style={{ width: `${(visited / current.stops.length) * 100}%` }} />
          </div>
          <span className="walk-progress__label">{visited}/{current.stops.length} stops</span>
        </div>

        {gpsError && <div className="banner banner--warn">{gpsError}</div>}

        {!active && !allDone && next && (
          <div className="walk-next">
            <CatIcon category={next.category} size={44} />
            <div className="walk-next__body">
              <div className="walk-next__k">Next stop</div>
              <div className="walk-next__t">{next.title}</div>
              <div className="walk-next__s">
                {distToNext != null ? `${Math.round(distToNext * 1000)} m away` : catLabel(next.category)} · {next.teaser}
              </div>
            </div>
          </div>
        )}

        {!active && !allDone && (
          <div className="walk-controls">
            {simulate ? (
              <Btn wide onClick={simStep}>Walk a little further →</Btn>
            ) : (
              <div className="walk-hint">Head to the next marker — it opens automatically when you arrive. Or tap any marker.</div>
            )}
          </div>
        )}

        {allDone && (
          <div className="walk-controls">
            <div className="walk-hint walk-hint--done">Every stop visited. Nicely done.</div>
            <Btn wide onClick={finishWalk}>Finish walk</Btn>
          </div>
        )}
      </div>

      {active && <StopSheet stop={active} onClose={dismissStop} />}
    </div>
  )
}

function StopSheet({ stop, onClose }: { stop: Stop; onClose: () => void }) {
  const { markVisited, saveNote, isSaved } = useApp()
  const [img, setImg] = useState<PlaceImage | null>(null)
  const saved = isSaved(stop.coord)

  useEffect(() => {
    let live = true
    if (stop.placeName) {
      // Look the photo up at the real OSM location, not the snapped-to-route
      // marker position, so geosearch centres on the actual place.
      findPlaceImage(stop.placeCoord ?? stop.coord, stop.placeName).then((i) => live && setImg(i))
    }
    return () => {
      live = false
    }
  }, [stop.id])

  return (
    <div className="sheet-scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        {img && (
          <div className="sheet__img" style={{ backgroundImage: `url(${img.url})` }}>
            <span className="sheet__credit">{img.credit}</span>
          </div>
        )}
        <div className="sheet__head">
          <CatIcon category={stop.category} size={46} />
          <div>
            <div className="sheet__title">{stop.title}</div>
            <div className="sheet__cat">
              {catLabel(stop.category)}
              {stop.placeName ? ' · a real place on the map' : ' · an open-ended pause'}
            </div>
          </div>
        </div>

        <p className="sheet__blurb">{stop.blurb}</p>
        <div className="sheet__note">
          <span className="sheet__note-k">Worth knowing</span>
          {stop.note}
        </div>

        <div className="sheet__actions">
          <Btn
            kind="ghost"
            onClick={() => saveNote(stop)}
            disabled={saved}
          >
            {saved ? '★ Saved to field notes' : '☆ Save this place'}
          </Btn>
          <Btn
            onClick={() => {
              if (stop.status !== 'visited') markVisited(stop.id)
              onClose()
            }}
          >
            {stop.status === 'visited' ? 'Close' : 'Mark visited'}
          </Btn>
        </div>
      </div>
    </div>
  )
}
