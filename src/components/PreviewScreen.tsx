import { useApp } from '../store'
import { vibeMeta } from '../lib/vibes'
import { Btn, Header, CatIcon, catLabel } from './ui'
import MapCanvas from './MapCanvas'

export default function PreviewScreen() {
  const { current, goto, startWalk, editCurrent, deleteWalk } = useApp()
  if (!current) return null
  const v = vibeMeta(current.vibe)
  const realStops = current.stops.filter((s) => s.placeName).length

  return (
    <div className="screen preview">
      <Header title="Your walk" onBack={() => goto('home')} right={<span className="pill" style={{ background: v.soft, color: v.color }}>{v.emoji} {v.name}</span>} />

      <div className="preview-map">
        <MapCanvas coords={current.coords} stops={current.stops} />
        <button className="preview-map__fly" onClick={() => goto('flyover')}>
          ▶ Fly the route
        </button>
      </div>

      <div className="preview-body">
        <h1 className="preview__title">{current.title}</h1>
        <div className="preview__meta">
          <span>⏱ {current.estMinutes} min</span>
          <span>📏 {current.distanceKm} km</span>
          <span>📍 {current.stops.length} stops</span>
        </div>
        <p className="preview__intro">{current.intro}</p>
        {realStops > 0 && (
          <p className="preview__note">
            {realStops} of {current.stops.length} stops are real places pulled from the map around you.
          </p>
        )}

        <ol className="stop-list">
          {current.stops.map((s, i) => (
            <li key={s.id} className="stop-row">
              <div className="stop-row__num">{i + 1}</div>
              <CatIcon category={s.category} size={38} />
              <div className="stop-row__body">
                <div className="stop-row__title">
                  {s.title}
                  {s.placeName && <span className="stop-row__real">real place</span>}
                </div>
                <div className="stop-row__sub">
                  {catLabel(s.category)} · {s.teaser}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="preview-actions">
        <Btn wide onClick={startWalk}>
          {current.state === 'active' ? 'Resume walk' : 'Start walk'}
        </Btn>
        <div className="preview-actions__row">
          <Btn kind="ghost" sm onClick={editCurrent}>Edit</Btn>
          <Btn
            kind="ghost"
            sm
            onClick={() => {
              deleteWalk(current.id)
              goto('home')
            }}
          >
            Delete
          </Btn>
        </div>
      </div>
    </div>
  )
}
