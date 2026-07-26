import { useApp } from '../store'
import { formatDistance, formatDistanceValue } from '../lib/units'
import { Btn, UnitToggle } from './ui'

export default function HomeScreen() {
  const { goto, resetDraft, walks, notes, stats, unit } = useApp()
  const inProgress = walks.filter((w) => w.state === 'active')

  return (
    <div className="screen home">
      <div className="home__hero">
        <div className="home__mark">◈</div>
        <h1 className="home__title">Wander</h1>
        <p className="home__tag">Curated local walks for grown-ups — stitched together from the real places around you.</p>
        <Btn
          wide
          onClick={() => {
            resetDraft()
            goto('create')
          }}
        >
          Plan a walk
        </Btn>
      </div>

      <div className="home__stats">
        <div className="stat">
          <span className="stat__n">{stats.walksCompleted}</span>
          <span className="stat__l">walks</span>
        </div>
        <div className="stat">
          <span className="stat__n">{stats.stopsVisited}</span>
          <span className="stat__l">stops</span>
        </div>
        <div className="stat">
          <span className="stat__n">{formatDistanceValue(stats.kmWalked, unit)}</span>
          <span className="stat__l">{unit}</span>
        </div>
      </div>

      <div className="home__units">
        <span>Distance</span>
        <UnitToggle sm />
      </div>

      <div className="home__cards">
        {inProgress.length > 0 && (
          <button className="home__card home__card--accent" onClick={() => useApp.getState().openWalk(inProgress[0].id)}>
            <div className="home__card-k">Continue</div>
            <div className="home__card-t">{inProgress[0].title}</div>
            <div className="home__card-s">
              {inProgress[0].stops.filter((s) => s.status === 'visited').length}/{inProgress[0].stops.length} stops · {formatDistance(inProgress[0].distanceKm, unit)}
            </div>
          </button>
        )}
        <button className="home__card" onClick={() => goto('walks')}>
          <div className="home__card-k">Your walks</div>
          <div className="home__card-t">{walks.length ? `${walks.length} saved` : 'None yet'}</div>
          <div className="home__card-s">Revisit or replay a route</div>
        </button>
        <button className="home__card" onClick={() => goto('saved')}>
          <div className="home__card-k">Field notes</div>
          <div className="home__card-t">{notes.length ? `${notes.length} places` : 'Empty'}</div>
          <div className="home__card-s">Places you kept along the way</div>
        </button>
      </div>

      <p className="home__foot">
        Real places from OpenStreetMap · footpath routing · your location never leaves the device.
      </p>
    </div>
  )
}
