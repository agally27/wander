import { useApp } from '../store'
import { vibeMeta } from '../lib/vibes'
import { Header } from './ui'

export default function WalksScreen() {
  const { walks, openWalk, goto } = useApp()
  return (
    <div className="screen walks">
      <Header title="Your walks" onBack={() => goto('home')} />
      {walks.length === 0 ? (
        <div className="empty">
          <div className="empty__mark">◈</div>
          <p>No walks yet. Plan one and it’ll be saved here to revisit or replay.</p>
        </div>
      ) : (
        <div className="walk-cards">
          {walks.map((w) => {
            const v = vibeMeta(w.vibe)
            const visited = w.stops.filter((s) => s.status === 'visited').length
            return (
              <button key={w.id} className="walk-card" onClick={() => openWalk(w.id)}>
                <span className="walk-card__emoji" style={{ background: v.soft }}>{v.emoji}</span>
                <div className="walk-card__body">
                  <div className="walk-card__title">{w.title}</div>
                  <div className="walk-card__sub">
                    {v.name} · {w.distanceKm} km · {w.stops.length} stops
                  </div>
                </div>
                <span className={'walk-card__state walk-card__state--' + w.state}>
                  {w.state === 'done' ? '✓ done' : w.state === 'active' ? `${visited}/${w.stops.length}` : 'new'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
