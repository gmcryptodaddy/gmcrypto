// components/WatchlistStar.js
// Star toggle. Use icon-only in dense lists, or label (Watch / Watching) on
// the coin page. Safe inside a <Link> — it stops the click from navigating.

import { useState, useEffect } from 'react'
import { isWatched, toggleWatch, subscribe } from '../lib/watchlist'

export default function WatchlistStar({ id, symbol, name, label = false, className = '' }) {
  const [watched, setWatched] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setWatched(isWatched(id))
    const unsub = subscribe(() => setWatched(isWatched(id)))
    return unsub
  }, [id])

  const onClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleWatch({ id, symbol, name })
  }

  const active = mounted && watched

  return (
    <button
      type="button"
      onClick={onClick}
      className={`wl-star${active ? ' active' : ''}${label ? ' wl-star-labeled' : ''}${className ? ' ' + className : ''}`}
      aria-pressed={active}
      aria-label={active ? `Remove ${name || 'coin'} from watchlist` : `Add ${name || 'coin'} to watchlist`}
      title={active ? 'In your watchlist' : 'Add to watchlist'}
    >
      <span className="wl-star-icon" aria-hidden="true">{active ? '★' : '☆'}</span>
      {label && <span className="wl-star-label">{active ? 'Watching' : 'Watch'}</span>}
    </button>
  )
}
