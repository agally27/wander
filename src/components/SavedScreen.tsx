import { useApp } from '../store'
import { Header, CatIcon, catLabel } from './ui'
import type { FieldNote } from '../lib/types'

export default function SavedScreen() {
  const { notes, goto } = useApp()
  return (
    <div className="screen saved">
      <Header title="Field notes" onBack={() => goto('home')} />
      {notes.length === 0 ? (
        <div className="empty">
          <div className="empty__mark">☆</div>
          <p>Places you save on a walk land here — with room for a rating and a remark.</p>
        </div>
      ) : (
        <div className="notes">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} />
          ))}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note }: { note: FieldNote }) {
  const { updateNote, removeNote } = useApp()
  return (
    <div className="note-card">
      <div className="note-card__head">
        <CatIcon category={note.category} size={40} />
        <div className="note-card__id">
          <div className="note-card__name">{note.name}</div>
          <div className="note-card__cat">{catLabel(note.category)} · from “{note.sourceWalkTitle}”</div>
        </div>
        <button className="note-card__x" onClick={() => removeNote(note.id)} aria-label="Remove">✕</button>
      </div>
      <div className="note-card__stars">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            className={'star' + ((note.rating ?? 0) >= r ? ' on' : '')}
            onClick={() => updateNote(note.id, { rating: note.rating === r ? undefined : r })}
            aria-label={`${r} stars`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="note-card__remark"
        placeholder="Add a remark — what you thought, or what to try next time…"
        value={note.remark ?? ''}
        onChange={(e) => updateNote(note.id, { remark: e.target.value })}
      />
    </div>
  )
}
