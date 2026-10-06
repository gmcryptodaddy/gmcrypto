// components/WatchlistWidget.js
// Shows the user's saved coins with live price + 24h change. Renders nothing
// when the watchlist is empty, so it stays invisible until someone stars a coin.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getWatchlist, subscribe, removeWatch } from '../lib/watchlist'

function fmtPrice(v) {
  if (v == null || isNaN(v)) return '—'
  if (v >= 1) return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 6 })
}

export default function WatchlistWidget() {
  const [list, setList] = useState([])
  const [prices, setPrices] = useState({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setList(getWatchlist())
    const unsub = subscribe(setList)
    return unsub
  }, [])

  const loadPrices = useCallback(async (ids) => {
    if (!ids.length) { setPrices({}); return }
    try {
      const res = await fetch(`/api/coin-price?ids=${encodeURIComponent(ids.join(','))}`)
      const data = await res.json()
      setPrices(data && typeof data === 'object' ? data : {})
    } catch {
      /* keep stale prices on error */
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const ids = list.map(c => c.id)
    loadPrices(ids)
    const t = setInterval(() => loadPrices(ids), 60000)
    return () => clearInterval(t)
  }, [mounted, list, loadPrices])

  if (!mounted) return null          // avoid SSR/hydration mismatch
  if (list.length === 0) return null // hidden until the user stars a coin

  return (
    <section className="wl-widget">
      <div className="wl-widget-head">
        <h2 className="wl-widget-title">★ Your Watchlist</h2>
        <span className="wl-widget-count">{list.length}</span>
      </div>
      <div className="wl-widget-grid">
        {list.map(c => {
          const p = prices[c.id]
          const price = p ? p.usd : null
          const chg = p ? p.usd_24h_change : null
          const up = (chg ?? 0) >= 0
          return (
            <div key={c.id} className="wl-card">
              <Link href={`/markets/${c.id}`} className="wl-card-link">
                <span className="wl-card-sym">{(c.symbol || '').toUpperCase()}</span>
                <span className="wl-card-name">{c.name}</span>
              </Link>
              <div className="wl-card-right">
                <span className="wl-card-price">{fmtPrice(price)}</span>
                {chg != null && (
                  <span className={`wl-card-chg ${up ? 'up' : 'down'}`}>
                    {up ? '+' : ''}{chg.toFixed(2)}%
                  </span>
                )}
              </div>
              <button
                className="wl-card-remove"
                onClick={() => removeWatch(c.id)}
                aria-label={`Remove ${c.name} from watchlist`}
                title="Remove"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
