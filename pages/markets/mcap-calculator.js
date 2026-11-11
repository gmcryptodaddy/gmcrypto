// pages/markets/mcap-calculator.js
// "What would coin A cost with the market cap of B?" — compares a crypto's
// implied price if it reached the market cap of another coin, a stock, the
// whole crypto market, gold, etc.

import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import AssetPicker from '../../components/AssetPicker'
import { getCoinsMarkets, getGlobalStats, formatPrice, formatBigNumber } from '../../lib/coingecko'

// The 20 cryptos offered, by ticker priority (symbols are matched to the
// highest-market-cap coin, so "PEPE" resolves to the real one). The GRAM slot
// tries GRAM first, then falls back to TON.
const CRYPTO_PICKS = [
  ['btc'], ['eth'], ['sol'], ['bnb'], ['xrp'], ['doge'], ['trx'],
  ['hype'], ['zec'], ['aave'], ['uni'], ['jup'], ['sui'], ['xmr'],
  ['near'], ['link'], ['pepe'], ['ena'], ['gram', 'ton'], ['pump'],
]

// Approximate, static market caps for non-crypto references (USD). These drift
// over time — shown for illustration, not as live data.
const STOCK_PRESETS = [
  { key: 'nvidia', label: 'NVIDIA', mcap: 3.3e12, domain: 'nvidia.com' },
  { key: 'apple', label: 'Apple', mcap: 3.5e12, domain: 'apple.com' },
  { key: 'microsoft', label: 'Microsoft', mcap: 3.1e12, domain: 'microsoft.com' },
  { key: 'amazon', label: 'Amazon', mcap: 2.4e12, domain: 'amazon.com' },
  { key: 'alphabet', label: 'Alphabet (Google)', mcap: 2.2e12, domain: 'google.com' },
  { key: 'meta', label: 'Meta', mcap: 1.5e12, domain: 'meta.com' },
  { key: 'tesla', label: 'Tesla', mcap: 1.4e12, domain: 'tesla.com' },
  { key: 'berkshire', label: 'Berkshire Hathaway', mcap: 1.0e12, domain: 'berkshirehathaway.com' },
  { key: 'aramco', label: 'Saudi Aramco', mcap: 1.8e12, domain: 'aramco.com' },
  { key: 'tsmc', label: 'TSMC', mcap: 1.0e12, domain: 'tsmc.com' },
  { key: 'broadcom', label: 'Broadcom', mcap: 1.1e12, domain: 'broadcom.com' },
  { key: 'gold', label: 'Gold', mcap: 18.5e12, icon: '🥇' },
  { key: 'silver', label: 'Silver', mcap: 1.7e12, icon: '🥈' },
  { key: 'sp500', label: 'S&P 500 (total)', mcap: 50e12, icon: '📈' },
]

function fmtMultiple(m) {
  if (m == null || !isFinite(m)) return ''
  if (m >= 100) return Math.round(m).toLocaleString() + '×'
  if (m >= 10) return m.toFixed(1) + '×'
  return m.toFixed(2) + '×'
}

export default function McapCalculatorPage({ coins, totalMcap }) {
  const defaultCoin = coins.find(c => c.id === 'solana') ? 'solana' : (coins[0]?.id || '')
  const [coinId, setCoinId] = useState(defaultCoin)
  const [target, setTarget] = useState('stock:nvidia')

  const coinA = useMemo(() => coins.find(c => c.id === coinId), [coins, coinId])

  // Picker data
  const coinItems = useMemo(
    () => coins.map(c => ({ id: c.id, name: c.name, sub: c.symbol, image: c.image })),
    [coins]
  )
  const coinGroupA = useMemo(() => [{ key: 'crypto', label: 'Crypto', items: coinItems }], [coinItems])

  const targetGroups = useMemo(() => {
    const cryptoItems = [
      { id: 'total', name: 'Total crypto market', sub: '', icon: '🌐' },
      ...coins.map(c => ({ id: `crypto:${c.id}`, name: c.name, sub: c.symbol, image: c.image })),
    ]
    const stockItems = STOCK_PRESETS.map(s => ({
      id: `stock:${s.key}`,
      name: s.label,
      sub: '',
      logo: s.domain ? `https://logo.clearbit.com/${s.domain}` : null,
      icon: s.icon,
    }))
    return [
      { key: 'crypto', label: 'Crypto', items: cryptoItems },
      { key: 'stocks', label: 'Stocks', items: stockItems },
    ]
  }, [coins])

  const { targetMcap, targetLabel } = useMemo(() => {
    if (target === 'total') return { targetMcap: totalMcap, targetLabel: 'the total crypto market' }
    if (target.startsWith('crypto:')) {
      const c = coins.find(x => x.id === target.slice(7))
      return { targetMcap: c?.market_cap ?? null, targetLabel: c ? c.name : 'that coin' }
    }
    if (target.startsWith('stock:')) {
      const s = STOCK_PRESETS.find(x => x.key === target.slice(6))
      return { targetMcap: s?.mcap ?? null, targetLabel: s ? s.label : 'that asset' }
    }
    return { targetMcap: null, targetLabel: '' }
  }, [target, coins, totalMcap])

  const supply = coinA?.circulating_supply
  const impliedPrice = supply > 0 && targetMcap > 0 ? targetMcap / supply : null
  const multiple = impliedPrice && coinA?.current_price > 0 ? impliedPrice / coinA.current_price : null
  const up = multiple != null && multiple >= 1
  const symbol = coinA?.symbol?.toUpperCase() || ''

  return (
    <>
      <Head>
        <title>Market Cap Calculator — GM Crypto News</title>
        <meta name="description" content="Calculate what a cryptocurrency's price would be at the market cap of another coin, gold, a top stock, or the whole crypto market." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <div className="markets-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>Market Cap Calculator</span>
        </div>

        <div className="converter-header">
          <h1 className="converter-title">Market Cap Calculator</h1>
          <p className="converter-sub">
            What would a coin be worth if it reached the market cap of another coin, a top stock, gold, or the whole crypto market?
          </p>
        </div>

        <div className="mcap-calc">
          <div className="mcap-calc-inputs">
            <AssetPicker
              label="Coin"
              groups={coinGroupA}
              selectedId={coinId}
              onSelect={setCoinId}
            />
            <div className="mcap-calc-arrow" aria-hidden="true">at the market cap of</div>
            <AssetPicker
              label="Target"
              groups={targetGroups}
              selectedId={target}
              onSelect={setTarget}
            />
          </div>

          <div className="mcap-calc-result">
            {!coinA ? (
              <div className="mcap-calc-result-empty">Select a coin.</div>
            ) : !(supply > 0) ? (
              <div className="mcap-calc-result-empty">
                Circulating supply data isn't available for {coinA.name}, so an implied price can't be calculated.
              </div>
            ) : !(targetMcap > 0) ? (
              <div className="mcap-calc-result-empty">Select a target market cap.</div>
            ) : (
              <>
                <div className="mcap-calc-result-head">
                  {coinA.image && <img src={coinA.image} alt={coinA.name} className="mcap-calc-result-img" />}
                  <span>
                    {symbol} at the market cap of <strong>{targetLabel}</strong> ({formatBigNumber(targetMcap)})
                  </span>
                </div>

                <div className="mcap-calc-result-price">{formatPrice(impliedPrice)}</div>

                {multiple != null && (
                  <div className={`mcap-calc-result-mult ${up ? 'up' : 'down'}`}>
                    {fmtMultiple(multiple)} {up ? 'its current price' : 'of its current price'}
                    <span className="mcap-calc-result-current"> (now {formatPrice(coinA.current_price)})</span>
                  </div>
                )}

                <div className="mcap-calc-result-stats">
                  <div><span>Target market cap</span><strong>{formatBigNumber(targetMcap)}</strong></div>
                  <div><span>{symbol} circulating supply</span><strong>{supply.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></div>
                  <div><span>{symbol} current market cap</span><strong>{formatBigNumber(coinA.market_cap)}</strong></div>
                </div>
              </>
            )}
          </div>

          <div className="converter-note">
            <strong>Note:</strong> Crypto market caps are live (via CoinGecko). Stock and commodity values (NVIDIA, gold, etc.) are approximate, static reference figures for illustration and change over time. This is a hypothetical calculation, not a price prediction. Not financial advice.
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getStaticProps() {
  try {
    const [market, globalStats] = await Promise.all([
      getCoinsMarkets({ page: 1, perPage: 250 }),
      getGlobalStats().catch(() => null),
    ])

    const bySymbol = {}
    for (const c of market || []) {
      const s = (c.symbol || '').toLowerCase()
      if (s && !bySymbol[s]) bySymbol[s] = c
    }

    const coins = []
    for (const cands of CRYPTO_PICKS) {
      let found = null
      for (const sym of cands) {
        if (bySymbol[sym]) { found = bySymbol[sym]; break }
      }
      if (found) {
        coins.push({
          id: found.id,
          symbol: (found.symbol || '').toUpperCase(),
          name: found.name,
          image: found.image,
          current_price: found.current_price,
          market_cap: found.market_cap,
          circulating_supply: found.circulating_supply,
        })
      }
    }

    return {
      props: { coins, totalMcap: globalStats?.total_market_cap?.usd || null },
      revalidate: 300,
    }
  } catch (error) {
    console.error('Mcap calculator page error:', error)
    return { props: { coins: [], totalMcap: null }, revalidate: 60 }
  }
}
