// components/TradingViewChart.js
//
// Embeds TradingView's Symbol Overview widget for a coin's price chart.
// Zero CoinGecko API calls — TradingView handles all chart data.
//
// IMPORTANT: TradingView's embed script reads its config from the script tag's
// TEXT CONTENT (not innerHTML). The script must be appended INSIDE a div that
// has class="tradingview-widget-container__widget" — that's where the iframe
// gets injected. Getting this structure wrong = chart shows header but no
// actual chart canvas.

import { useEffect, useRef } from 'react'

// Curated TradingView symbol mapping. Format: lowercase coin symbol → TV symbol.
// For coins NOT in this map, we try BINANCE:{SYMBOL}USDT as a fallback.
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

    // Build the EXACT structure TradingView expects:
    //   <div class="tradingview-widget-container">  ← containerRef
    //     <div class="tradingview-widget-container__widget"></div>  ← inner div for iframe
    //     <script src="..." async>{config-as-textContent}</script>  ← script with TEXT not innerHTML
    //   </div>
    //
    // Setting innerHTML on the script tag does NOT work — the TradingView script
    // reads config from textContent. Use createTextNode or .text instead.

    const container = containerRef.current
    container.innerHTML = '' // clear previous render

    // Inner widget div — this is where the iframe gets injected
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = 'calc(100% - 32px)' // leave room for copyright link
    widgetDiv.style.width = '100%'
    container.appendChild(widgetDiv)

    // Copyright link (TradingView terms require attribution)
    const copyrightDiv = document.createElement('div')
    copyrightDiv.className = 'tradingview-widget-copyright'
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>`
    container.appendChild(copyrightDiv)

    // Build config object — keep it minimal and proven
    const config = {
      symbols: [[coinName || symbol || 'Symbol', tvSymbol + '|1D']],
      chartOnly: false,
      width: '100%',
      height: '100%',
      locale: 'en',
      colorTheme: 'dark',
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: '-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif',
      fontSize: '10',
      noTimeScale: false,
      valuesTracking: '1',
      changeMode: 'price-and-percent',
      chartType: 'area',
      headerFontSize: 'medium',
      lineWidth: 2,
      lineType: 0,
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
    }

    // Create script tag the way TradingView expects:
    // - src attribute pointing to embed script
    // - JSON config as TEXT CONTENT (NOT innerHTML, NOT JSON.stringify into innerHTML)
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
    script.async = true
    // Critical: use appendChild(textNode) so the JSON becomes the script's text content
    script.appendChild(document.createTextNode(JSON.stringify(config)))
    container.appendChild(script)

    // Cleanup: TradingView creates iframes that we want to remove on unmount
    return () => {
      if (container) {
        container.innerHTML = ''
      }
    }
  }, [tvSymbol, coinName, symbol])

  // Outer container — needs explicit height for autosize to work
  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: 480, width: '100%' }}
    />
  )
}
