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

export default function Sidebar() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [coins, setCoins] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=true&price_change_percentage=24h`
        )
        const data = await res.json()
        setCoins(data)
        setLastUpdated(new Date())
      } catch (err) {
        console.error('Sidebar prices error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) setSubscribed(true)
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
        {subscribed ? (
          <p style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700 }}>
            ✓ You're in. GM anon!
          </p>
        ) : (
          <>
            <input
              className="newsletter-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button className="newsletter-btn" onClick={handleSubscribe}>
              Subscribe Free →
            </button>
            <p className="newsletter-sub">No spam. Unsubscribe anytime.</p>
          </>
        )}
      </div>
    </aside>
  )
}
