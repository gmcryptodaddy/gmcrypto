// components/Ticker.js
import { useEffect, useState } from 'react'
import Link from 'next/link'

const COIN_IDS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'dogecoin', 'tron', 'chainlink', 'avalanche-2',
]

function formatPrice(price) {
  if (!price) return '$—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toFixed(4)
}

export default function Ticker() {
  const [coins, setCoins] = useState([])

  useEffect(() => {
    async function fetchCoins() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
        )
        const data = await res.json()
        setCoins(data || [])
      } catch (err) {
        console.error('Ticker error:', err)
      }
    }
    fetchCoins()
    const interval = setInterval(fetchCoins, 60000)
    return () => clearInterval(interval)
  }, [])

  if (coins.length === 0) {
    return <div className="ticker" aria-hidden="true" />
  }

  // Duplicate for seamless loop
  const items = [...coins, ...coins]

  return (
    <div className="ticker">
      <div className="ticker-track">
        {items.map((coin, i) => {
          const change = coin.price_change_percentage_24h
          const up = change >= 0
          return (
            <Link
              key={`${coin.id}-${i}`}
              href={`/markets/${coin.id}`}
              className="ticker-item"
            >
              <span className="ticker-symbol">{coin.symbol?.toUpperCase()}</span>
              <span className="ticker-price">{formatPrice(coin.current_price)}</span>
              <span className={`ticker-change ${up ? 'up' : 'down'}`}>
                {up ? '+' : ''}{change?.toFixed(2)}%
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
