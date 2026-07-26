import { useApp } from '../store'
import type { GenProgress } from '../lib/generator'

const STEPS: { key: GenProgress; label: string }[] = [
  { key: 'sizing', label: 'Sizing the walk' },
  { key: 'finding', label: 'Looking at what’s nearby' },
  { key: 'mapping', label: 'Aiming the walk that way' },
  { key: 'choosing', label: 'Choosing the best stops for your vibe' },
  { key: 'routing', label: 'Threading the walk through them' },
  { key: 'ready', label: 'Ready' },
]

export default function GeneratingScreen() {
  const progress = useApp((s) => s.genProgress)
  const idx = STEPS.findIndex((s) => s.key === progress)
  return (
    <div className="screen generating">
      <div className="gen-mark">◈</div>
      <h2>Building your walk</h2>
      <ul className="gen-steps">
        {STEPS.map((s, i) => (
          <li key={s.key} className={i < idx ? 'done' : i === idx ? 'active' : ''}>
            <span className="gen-dot">{i < idx ? '✓' : i === idx ? '◈' : '○'}</span>
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
