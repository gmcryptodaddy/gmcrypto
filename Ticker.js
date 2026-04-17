const TICKERS = [
  { symbol: 'BTC', price: '$62,450', change: '+2.4%', up: true },
  { symbol: 'ETH', price: '$3,210', change: '+1.8%', up: true },
  { symbol: 'SOL', price: '$148', change: '-0.9%', up: false },
  { symbol: 'BNB', price: '$412', change: '+0.5%', up: true },
  { symbol: 'XRP', price: '$0.58', change: '-1.2%', up: false },
  { symbol: 'ADA', price: '$0.44', change: '+3.1%', up: true },
  { symbol: 'AVAX', price: '$34', change: '-0.3%', up: false },
  { symbol: 'DOT', price: '$7.20', change: '+0.8%', up: true },
  { symbol: 'MATIC', price: '$0.88', change: '+1.5%', up: true },
  { symbol: 'LINK', price: '$14.50', change: '-0.7%', up: false },
]

export default function Ticker() {
  const items = [...TICKERS, ...TICKERS] // duplicate for seamless loop
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {items.map((t, i) => (
          <span key={i} className="ticker-item">
            <strong>{t.symbol}</strong>{' '}
            {t.price}{' '}
            <span className={t.up ? 'ticker-up' : 'ticker-down'}>{t.change}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
