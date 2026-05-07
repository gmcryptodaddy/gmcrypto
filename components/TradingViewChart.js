// components/TradingViewChart.js
//
// Embeds TradingView's Symbol Overview widget for a coin's price chart.
// Zero CoinGecko API calls — TradingView handles all the chart data.
//
// Symbol format: "EXCHANGE:PAIR" e.g., "BINANCE:BTCUSDT" or "COINBASE:ETHUSD"
// We map common coin symbols to known TradingView symbols. For unknown coins,
// we attempt BINANCE:{SYMBOL}USDT as a sensible default — TradingView will
// show "Symbol not found" if the pair doesn't exist.

import { useEffect, useRef } from 'react'

// Curated mapping for top coins. Format: lowercase symbol → TradingView symbol.
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
  xmr: 'KRAKEN:XMRUSD',  // Monero often delisted from Binance
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
  // Default: assume Binance USDT pair. TradingView will show "Symbol not found"
  // if the coin isn't on Binance, which is a known limitation we accept.
  return `BINANCE:${coinSymbol.toUpperCase()}USDT`
}

export default function TradingViewChart({ symbol, coinName }) {
  const containerRef = useRef(null)
  const tvSymbol = resolveTvSymbol(symbol)

  useEffect(() => {
    if (!containerRef.current || !tvSymbol) return

    // Clear previous widget if symbol changed
    containerRef.current.innerHTML = ''

    const widgetWrap = document.createElement('div')
    widgetWrap.className = 'tradingview-widget-container__widget'
    widgetWrap.style.height = '100%'
    widgetWrap.style.width = '100%'
    containerRef.current.appendChild(widgetWrap)

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: [[coinName || symbol, tvSymbol + '|1D']],
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
      maLineColor: '#2962FF',
      maLineWidth: 1,
      maLength: 9,
      headerFontSize: 'medium',
      lineWidth: 2,
      lineType: 0,
      dateRanges: ['1d|1', '1m|30', '3m|60', '12m|1D', '60m|1W', 'all|1M'],
    })
    containerRef.current.appendChild(script)

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [tvSymbol, coinName, symbol])

  return (
    <div className="tradingview-widget-container" ref={containerRef} style={{ height: 460, width: '100%' }} />
  )
}
