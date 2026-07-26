import { useApp } from '../store'
import { vibeMeta } from '../lib/vibes'
import { formatDistanceValue, formatElevation } from '../lib/units'
import { Btn, CatIcon } from './ui'

export default function DoneScreen() {
  const { current, goto, notes, resetDraft, unit } = useApp()
  if (!current) return null
  const v = vibeMeta(current.vibe)
  const visited = current.stops.filter((s) => s.status === 'visited').length
  const savedThisWalk = notes.filter((n) => n.sourceWalkId === current.id)

  return (
    <div className="screen done">
      <div className="done__hero" style={{ background: v.soft }}>
        <div className="done__emoji">{v.emoji}</div>
        <h1>Walk complete</h1>
        <p className="done__title">{current.title}</p>
      </div>

      <div className="done__stats">
        <div className="stat"><span className="stat__n">{formatDistanceValue(current.distanceKm, unit)}</span><span className="stat__l">{unit}</span></div>
        <div className="stat"><span className="stat__n">{visited}</span><span className="stat__l">stops</span></div>
        <div className="stat"><span className="stat__n">{current.estMinutes}</span><span className="stat__l">min</span></div>
        {!!current.elevationGainM && current.elevationGainM > 15 && (
          <div className="stat"><span className="stat__n">{formatElevation(current.elevationGainM, unit)}</span><span className="stat__l">ascent</span></div>
        )}
      </div>

      {savedThisWalk.length > 0 && (
        <div className="done__saved">
          <h3>Kept for your field notes</h3>
          <div className="done__saved-list">
            {savedThisWalk.map((n) => (
              <div key={n.id} className="done__saved-row">
                <CatIcon category={n.category} size={34} />
                <span>{n.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="done__actions">
        <Btn wide onClick={() => { resetDraft(); goto('create') }}>Plan another</Btn>
        <div className="preview-actions__row">
          <Btn kind="ghost" sm onClick={() => goto('saved')}>Field notes</Btn>
          <Btn kind="ghost" sm onClick={() => goto('home')}>Home</Btn>
        </div>
      </div>
    </div>
  )
}
