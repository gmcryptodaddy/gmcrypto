import { useState } from 'react'
import Link from 'next/link'

const MARKETS = [
  { name: 'Bitcoin', symbol: 'BTC', price: '$62,450', change: '+2.4%', up: true },
  { name: 'Ethereum', symbol: 'ETH', price: '$3,210', change: '+1.8%', up: true },
  { name: 'Solana', symbol: 'SOL', price: '$148', change: '-0.9%', up: false },
  { name: 'BNB', symbol: 'BNB', price: '$412', change: '+0.5%', up: true },
  { name: 'XRP', symbol: 'XRP', price: '$0.58', change: '-1.2%', up: false },
]

const CATEGORIES = ['Markets', 'DeFi', 'NFTs', 'Regulation', 'Bitcoin', 'Ethereum', 'Layer 2', 'Web3']

export default function Sidebar() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email) setSubscribed(true)
  }

  return (
    <aside className="sidebar">
      {/* Markets widget */}
      <div className="widget">
        <div className="widget-title"><span>▸</span>Markets</div>
        {MARKETS.map(m => (
          <div key={m.symbol} className="market-item">
            <div>
              <div className="market-name">{m.symbol}</div>
              <div className="market-price">{m.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{m.price}</div>
              <div className={`market-change ${m.up ? 'up' : 'down'}`}>{m.change}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text3)' }}>
          * Prices are for display purposes. Integrate CoinGecko API for live data.
        </div>
      </div>

      {/* Newsletter */}
      <div className="widget">
        <div className="widget-title"><span>▸</span>GM Newsletter</div>
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

      {/* Categories */}
      <div className="widget">
        <div className="widget-title"><span>▸</span>Categories</div>
        <div className="category-list">
          {CATEGORIES.map(cat => (
            <Link key={cat} href={`/category/${cat.toLowerCase().replace(' ', '-')}`}>
              <span className="category-pill">{cat}</span>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  )
}
