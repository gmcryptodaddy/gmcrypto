import { useState, useEffect } from 'react'

const COIN_IDS = [
  'bitcoin', 'ethereum', 'hyperliquid', 'binancecoin', 'solana',
  'ripple', 'dogecoin', 'pax-gold', 'cardano', 'avalanche-2'
]

const SYMBOLS = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  hyperliquid: 'HYPE',
  binancecoin: 'BNB',
  solana: 'SOL',
  ripple: 'XRP',
  dogecoin: 'DOGE',
  'pax-gold': 'GOLD',
  cardano: 'ADA',
  'avalanche-2': 'AVAX'
}

function formatPrice(price) {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toFixed(4)
}

export default function Ticker() {
  const [coins, setCoins] = useState([])

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
        )
        const data = await res.json()
        setCoins(data)
      } catch (err) {
        console.error('Ticker fetch error:', err)
      }
    }
    fetchPrices()
    const interval = setInterval(fetchPrices, 60000)
    return () => clearInterval(interval)
  }, [])

  const items = coins.length > 0 ? [...coins, ...coins] : []

  if (coins.length === 0) return (
    <div className="ticker-wrap" style={{ textAlign: 'center', letterSpacing: '0.1em' }}>
      LOADING LIVE PRICES...
    </div>
  )

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {items.map((coin, i) => {
          const change = coin.price_change_percentage_24h
          const up = change >= 0
          return (
            <span key={i} className="ticker-item">
              <strong>{SYMBOLS[coin.id] || coin.symbol?.toUpperCase()}</strong>{' '}
              {formatPrice(coin.current_price)}{' '}
              <span className={up ? 'ticker-up' : 'ticker-down'}>
                {up ? '+' : ''}{change?.toFixed(2)}%
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
