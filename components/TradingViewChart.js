// components/TradingViewChart.js
//
// Embeds TradingView's Symbol Overview widget for the coin chart.
//
// Critical setup notes (lessons learned):
//   - When autosize=true, the WIDGET's inner div needs a CONCRETE height in
//     pixels — calc(100% - 32px) doesn't work because parents may have no
//     defined height. Iframe collapses to 0px otherwise.
//   - Total height must accommodate: top header (~70px) + price row (~40px)
//     + tabs row (~36px) + chart area (300px+ to look right) + copyright
//     (~24px). Minimum sensible total is ~500px.
//   - The script element must use `appendChild(createTextNode(...))` for
//     its config — innerHTML doesn't always work for src-loaded scripts.
//   - The wrapper div MUST have class="tradingview-widget-container" and
//     contain a div with class="tradingview-widget-container__widget".
//     Don't deviate from this structure.

import { useEffect, useRef } from 'react'

const CHART_HEIGHT = 500     // total height in pixels
const WIDGET_HEIGHT = 472    // inner widget area (CHART_HEIGHT - copyright link)

// Curated TradingView symbol mapping. Format: lowercase coin symbol → TV symbol.
// For coins NOT in this map, we fall back to BINANCE:{SYMBOL}USDT.
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

    // Build EXACT structure TradingView's embed script expects:
    //   <div class="tradingview-widget-container">  ← outer (containerRef)
    //     <div class="tradingview-widget-container__widget" style="height: 472px"></div>
    //     <div class="tradingview-widget-copyright">...</div>
    //     <script src="..." async>{config-as-textContent}</script>
    //   </div>

    // 1. Inner widget div with CONCRETE pixel height (this is critical)
    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = `${WIDGET_HEIGHT}px`
    widgetDiv.style.width = '100%'
    container.appendChild(widgetDiv)

    // 2. Copyright link (TradingView requires this for free widgets)
    const copyrightDiv = document.createElement('div')
    copyrightDiv.className = 'tradingview-widget-copyright'
    copyrightDiv.style.fontSize = '13px'
    copyrightDiv.style.lineHeight = '32px'
    copyrightDiv.style.textAlign = 'center'
    copyrightDiv.innerHTML = `<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank" style="color: #2962FF; text-decoration: none;">Track all markets on TradingView</a>`
    container.appendChild(copyrightDiv)

    // 3. Build config — note: do NOT include width/height when autosize=true
    //    (they conflict). Just give it autosize and the parent's pixel height.
    const config = {
      symbols: [
        [coinName || symbol || 'Symbol', tvSymbol + '|1D'],
      ],
      chartOnly: false,
      width: '100%',
      height: WIDGET_HEIGHT,
      locale: 'en',
      colorTheme: 'dark',
      autosize: false,         // explicit pixel height instead — more reliable
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

    // 4. Script — use textContent (via createTextNode) NOT innerHTML
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
    script.async = true
    script.appendChild(document.createTextNode(JSON.stringify(config)))
    container.appendChild(script)

    return () => {
      if (container) container.innerHTML = ''
    }
  }, [tvSymbol, coinName, symbol])

  // Outer container with concrete pixel height
  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height: CHART_HEIGHT, width: '100%' }}
    />
  )
}
