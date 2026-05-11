// components/TradingViewChart.js
//
// Embeds TradingView's Advanced Chart widget (full charting library, free).
//
// Why this widget instead of Symbol Overview:
//   - Advanced Chart's date ranges plot a ROLLING window (1D = last 24h with
//     now at the right edge), fixing the "1D shows half-empty chart" issue
//     the Symbol Overview widget has.
//   - Built-in chart style toggle in top toolbar (candles, bars, line, area,
//     Heikin Ashi, etc.) — no custom button needed.
//   - More information: volume, indicators, drawing tools.
//
// Style codes (set via `style` config):
//   "0" = Bars
//   "1" = Candles (DEFAULT here, what most traders expect)
//   "2" = Line
//   "3" = Area
//   "8" = Heikin Ashi
//   "9" = Hollow Candles
// Users can switch via the bar-style icon in the top toolbar.
//
// Container height MUST be set in pixels (autosize fills parent).

import { useEffect, useRef } from 'react'

const CHART_HEIGHT = 540   // total height in pixels

// Curated TradingView symbol mapping. lowercase coin symbol → TV symbol.
// For coins NOT in this map, fall back to BINANCE:{SYMBOL}USDT.
const TV_SYMBOL_OVERRIDES = {
  btc: 'BINANCE:BTCUSDT',
  eth: 'BINANCE:ETHUSDT',
  usdt: 'BINANCE:USDTUSD',
  bnb: 'BINANCE:BNBUSDT',
  sol: 'BINANCE:SOLUSDT',
  xrp: 'BINANCE:XRPUSDT',
  usdc: 'COINBASE:USDCUSD',
  doge: 'BINANCE:DOGEUSDT',
  ada: 'BINANCE:ADAUSDT',
  trx: 'BINANCE:TRXUSDT',
  avax: 'BINANCE:AVAXUSDT',
  link: 'BINANCE:LINKUSDT',
  dot: 'BINANCE:DOTUSDT',
  shib: 'BINANCE:SHIBUSDT',
  matic: 'BINANCE:MATICUSDT',
  ltc: 'BINANCE:LTCUSDT',
  bch: 'BINANCE:BCHUSDT',
  uni: 'BINANCE:UNIUSDT',
  near: 'BINANCE:NEARUSDT',
  apt: 'BINANCE:APTUSDT',
  icp: 'BINANCE:ICPUSDT',
  xmr: 'KRAKEN:XMRUSD',
  xlm: 'BINANCE:XLMUSDT',
  etc: 'BINANCE:ETCUSDT',
  atom: 'BINANCE:ATOMUSDT',
  fil: 'BINANCE:FILUSDT',
  arb: 'BINANCE:ARBUSDT',
  op: 'BINANCE:OPUSDT',
  hbar: 'BINANCE:HBARUSDT',
  vet: 'BINANCE:VETUSDT',
  inj: 'BINANCE:INJUSDT',
  algo: 'BINANCE:ALGOUSDT',
  sui: 'BINANCE:SUIUSDT',
  fet: 'BINANCE:FETUSDT',
  ftm: 'BINANCE:FTMUSDT',
  rndr: 'BINANCE:RNDRUSDT',
  imx: 'BINANCE:IMXUSDT',
  mkr: 'BINANCE:MKRUSDT',
  pepe: 'BINANCE:PEPEUSDT',
  kas: 'KUCOIN:KASUSDT',
  tia: 'BINANCE:TIAUSDT',
  jup: 'BINANCE:JUPUSDT',
  hype: 'BINANCE:HYPEUSDT',
  aave: 'BINANCE:AAVEUSDT',
  cro: 'CRYPTO:CROUSD',
  ondo: 'BINANCE:ONDOUSDT',
  wld: 'BINANCE:WLDUSDT',
  tao: 'BINANCE:TAOUSDT',
  ena: 'BINANCE:ENAUSDT',
  sei: 'BINANCE:SEIUSDT',
  pyth: 'BINANCE:PYTHUSDT',
  ftt: 'BINANCE:FTTUSDT',
  bonk: 'BINANCE:BONKUSDT',
  wif: 'BINANCE:WIFUSDT',
  flr: 'BINANCE:FLRUSDT',
  pol: 'BINANCE:POLUSDT',
}

function resolveTvSymbol(coinSymbol) {
  if (!coinSymbol) return null
  const lower = coinSymbol.toLowerCase()
  if (TV_SYMBOL_OVERRIDES[lower]) return TV_SYMBOL_OVERRIDES[lower]
  return `BINANCE:${coinSymbol.toUpperCase()}USDT`
}

export default function TradingViewChart({ symbol, coinName }) {
  const containerRef = useRef(null)
  const tvSymbol = resolveTvSymbol(symbol)

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return

    const container = containerRef.current
    container.innerHTML = ''

    // Inner widget div with concrete pixel height
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = `${CHART_HEIGHT - 28}px`
    widgetDiv.style.width = '100%'
    container.appendChild(widgetDiv)

    // Copyright link (TradingView terms require attribution for free widgets)
    const copyrightDiv = document.createElement('div')
    copyrightDiv.className = 'tradingview-widget-copyright'
    copyrightDiv.style.fontSize = '13px'
    copyrightDiv.style.lineHeight = '28px'
    copyrightDiv.style.textAlign = 'center'
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color: #2962FF; text-decoration: none;">Track all markets on TradingView</a>`
    container.appendChild(copyrightDiv)

    // Advanced Chart config
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: 'D',                  // default to daily candles
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',                     // 1 = Candles (default)
      locale: 'en',
      withdateranges: true,           // shows 1D 5D 1M 3M 6M YTD 1Y 5Y All buttons
      range: '12M',                   // default visible range: 12 months
      hide_side_toolbar: true,        // cleaner look — hide left drawing toolbar
      hide_top_toolbar: false,        // CRITICAL: keep top toolbar so user can switch chart style
      hide_legend: false,
      allow_symbol_change: false,     // lock to this coin's symbol
      save_image: false,
      details: false,
      hotlist: false,
      calendar: false,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      gridColor: 'rgba(255, 255, 255, 0.04)',
      support_host: 'https://www.tradingview.com',
    }

    // Script with config as text content (not innerHTML — important!)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.appendChild(document.createTextNode(JSON.stringify(config)))
    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [tvSymbol, coinName, symbol])

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: CHART_HEIGHT, width: '100%' }}
    />
  )
}
