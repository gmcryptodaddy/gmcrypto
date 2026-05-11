// components/TradingViewChart.js
//
// Embeds TradingView's Advanced Chart widget (full charting library, free).
//
// HEIGHT NOTE: the Advanced Chart widget has a top toolbar (~40px) and bottom
// date range bar (~36px) that eat into the container. The actual chart canvas
// gets (container height - 76px). To get a ~525px chart area like trading
// platforms typically use, the container needs ~600px total.
//
// Style codes (set via `style` config):
//   "0" = Bars, "1" = Candles (default), "2" = Line, "3" = Area
//   "8" = Heikin Ashi, "9" = Hollow Candles
// Users can switch via the bar-style icon in the top toolbar.

import { useEffect, useRef } from 'react'

const CHART_HEIGHT = 620   // total container height in pixels
const COPYRIGHT_HEIGHT = 28

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

    const widgetHeight = CHART_HEIGHT - COPYRIGHT_HEIGHT

    // Inner widget div — concrete pixel height
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = `${widgetHeight}px`
    widgetDiv.style.width = '100%'
    container.appendChild(widgetDiv)

    // Copyright link (TradingView terms require attribution)
    const copyrightDiv = document.createElement('div')
    copyrightDiv.className = 'tradingview-widget-copyright'
    copyrightDiv.style.fontSize = '13px'
    copyrightDiv.style.lineHeight = `${COPYRIGHT_HEIGHT}px`
    copyrightDiv.style.textAlign = 'center'
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color: #2962FF; text-decoration: none;">Track all markets on TradingView</a>`
    container.appendChild(copyrightDiv)

    // Advanced Chart config — use explicit pixel height instead of autosize
    // to avoid the widget rendering smaller than expected
    const config = {
      width: '100%',
      height: widgetHeight,
      autosize: false,
      symbol: tvSymbol,
      interval: 'D',
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',                     // 1 = Candles
      locale: 'en',
      withdateranges: true,
      range: '12M',
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      details: false,
      hotlist: false,
      calendar: false,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      gridColor: 'rgba(255, 255, 255, 0.04)',
      support_host: 'https://www.tradingview.com',
    }

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
