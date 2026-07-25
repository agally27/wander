import type { ReactNode } from 'react'
import { CONTENT } from '../lib/content'
import type { StopCategory } from '../lib/types'

export function Btn(props: {
  children: ReactNode
  onClick?: () => void
  kind?: 'primary' | 'ghost'
  wide?: boolean
  sm?: boolean
  disabled?: boolean
}) {
  const cls = [
    'btn',
    props.kind === 'ghost' ? 'btn--ghost' : 'btn--primary',
    props.wide ? 'btn--wide' : '',
    props.sm ? 'btn--sm' : '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  )
}

export function Header(props: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="header">
      {props.onBack && (
        <button className="back" onClick={props.onBack} aria-label="Back">
          ←
        </button>
      )}
      <h2>{props.title}</h2>
      <div className="header__right">{props.right}</div>
    </div>
  )
}

export function CatIcon(props: { category: StopCategory; size?: number }) {
  const c = CONTENT[props.category] ?? CONTENT.wander
  const s = props.size ?? 40
  return (
    <div
      className="cat-icon"
      style={{
        width: s,
        height: s,
        background: `radial-gradient(circle at 30% 25%, ${c.color}33, ${c.color}18 75%)`,
        color: c.color,
        fontSize: s * 0.5,
      }}
      aria-hidden
    >
      {c.emoji}
    </div>
  )
}

export function catLabel(category: StopCategory): string {
  return (CONTENT[category] ?? CONTENT.wander).label
}
