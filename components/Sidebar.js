import { useState, useEffect } from 'react'
import Link from 'next/link'
import Sparkline from './Sparkline'

const COIN_IDS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'avalanche-2', 'dogecoin', 'tron', 'chainlink'
]

function formatPrice(price) {
  if (!price) return '$—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toFixed(4)
}

const PRICES_URL =
  `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(',')}` +
  `&order=market_cap_desc&sparkline=true&price_change_percentage=24h`

// The homepage renders <Sidebar /> twice (desktop column + bottom-of-feed on
// mobile). Without this shared cache each instance fetched independently AND
// polled every 60s, doubling CoinGecko calls on a rate-limited free tier.
// This dedupes: concurrent mounts share one in-flight request, and repeat
// calls within the TTL reuse the last result.
const priceCache = { data: null, ts: 0, inflight: null }
const PRICE_TTL = 55000 // ms, just under the 60s refresh

async function getSidebarPrices() {
  const now = Date.now()
  if (priceCache.data && now - priceCache.ts < PRICE_TTL) return priceCache.data
  if (priceCache.inflight) return priceCache.inflight
  priceCache.inflight = fetch(PRICES_URL)
    .then(r => r.json())
    .then(data => {
      priceCache.data = data
      priceCache.ts = Date.now()
      priceCache.inflight = null
      return data
    })
    .catch(err => {
      priceCache.inflight = null
      throw err
    })
  return priceCache.inflight
}

export default function Sidebar() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error | soon
  const [message, setMessage] = useState('')
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await getSidebarPrices()
        if (cancelled) return
        setCoins(data)
        setLastUpdated(new Date(priceCache.ts))
      } catch (err) {
        console.error('Sidebar prices error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('error')
      setMessage('Enter a valid email.')
      return
    }
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: value }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('success')
      } else if (data.error === 'not_configured') {
        setStatus('soon')
      } else if (data.error === 'invalid_email') {
        setStatus('error')
        setMessage('Enter a valid email.')
      } else {
        setStatus('error')
        setMessage('Something went wrong. Try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  return (
    <aside className="sidebar">
      {/* Markets widget */}
      <div className="widget">
        <Link href="/markets" className="widget-title widget-title-link">
          Live Markets
        </Link>

        {loading ? (
          <div style={{ padding: '20px 0', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
            Loading live prices...
          </div>
        ) : coins.length > 0 ? (
          <>
            {coins.map(coin => {
              const change = coin.price_change_percentage_24h
              const up = change >= 0
              // CoinGecko 7d sparkline gives ~168 points; trim to last ~24h (~24 points)
              const sparkData = coin.sparkline_in_7d?.price || []
              const last24h = sparkData.slice(-24)
              return (
                <Link key={coin.id} href={`/markets/${coin.id}`} className="market-item">
                  <div className="market-item-left">
                    {coin.image && (
                      <img
                        src={coin.image}
                        alt={coin.name}
                        className="market-coin-img"
                        width={24}
                        height={24}
                        loading="lazy"
                        decoding="async"
                      />
                    )}
                    <div>
                      <div className="market-name">{coin.symbol?.toUpperCase()}</div>
                      <div className="market-price">{coin.name}</div>
                    </div>
                  </div>

                  {last24h.length > 0 && (
                    <div className="market-spark">
                      <Sparkline data={last24h} positive={up} width={56} height={22} />
                    </div>
                  )}

                  <div className="market-item-right">
                    <div className="market-item-value">
                      {formatPrice(coin.current_price)}
                    </div>
                    <div className={`market-change ${up ? 'up' : 'down'}`}>
                      {up ? '+' : ''}{change?.toFixed(2)}%
                    </div>
                  </div>
                </Link>
              )
            })}
            {lastUpdated && (
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--text3)' }}>
                ↻ Updated {lastUpdated.toLocaleTimeString()} · via CoinGecko
              </div>
            )}
          </>
        ) : (
          <div style={{ padding: '12px 0', color: 'var(--text3)', fontSize: 12 }}>
            Could not load prices. Try refreshing.
          </div>
        )}
      </div>

      {/* Newsletter */}
      <div className="widget">
        <div className="widget-title">GM Newsletter</div>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14 }}>
          Get the top crypto stories delivered every morning.
        </p>
        {status === 'success' ? (
          <p className="newsletter-success">✓ You're in. GM anon!</p>
        ) : status === 'soon' ? (
          <p className="newsletter-success">🙌 Newsletter opening soon — you're early.</p>
        ) : (
          <>
            <input
              className="newsletter-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubscribe(e) }}
              disabled={status === 'loading'}
            />
            <button
              className="newsletter-btn"
              onClick={handleSubscribe}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Subscribing…' : 'Subscribe Free →'}
            </button>
            {status === 'error' && <p className="newsletter-error">{message}</p>}
            <p className="newsletter-sub">No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </aside>
  )
}
