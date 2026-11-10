// pages/markets/mcap-calculator.js
// "What would coin A cost with the market cap of B?" — compares a crypto's
// implied price if it reached the market cap of another crypto, a traditional
// asset, the whole crypto market, or a custom value.

import { useState, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { getCoinsMarkets, getGlobalStats, formatPrice, formatBigNumber } from '../../lib/coingecko'

// Approximate, static market caps for non-crypto references (USD). These drift
// over time — shown for illustration, not as live data.
const ASSET_PRESETS = [
  { key: 'gold', label: 'Gold', mcap: 18.5e12 },
  { key: 'silver', label: 'Silver', mcap: 1.7e12 },
  { key: 'nvidia', label: 'NVIDIA', mcap: 3.3e12 },
  { key: 'apple', label: 'Apple', mcap: 3.5e12 },
  { key: 'microsoft', label: 'Microsoft', mcap: 3.1e12 },
  { key: 'amazon', label: 'Amazon', mcap: 2.4e12 },
  { key: 'alphabet', label: 'Alphabet (Google)', mcap: 2.2e12 },
  { key: 'tesla', label: 'Tesla', mcap: 1.4e12 },
  { key: 'aramco', label: 'Saudi Aramco', mcap: 1.8e12 },
  { key: 'sp500', label: 'S&P 500 (total)', mcap: 50e12 },
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
  const [target, setTarget] = useState('asset:nvidia')
  const [customAmt, setCustomAmt] = useState('1')
  const [customUnit, setCustomUnit] = useState('T')

  const coinA = useMemo(() => coins.find(c => c.id === coinId), [coins, coinId])

  const { targetMcap, targetLabel } = useMemo(() => {
    if (target === 'total') return { targetMcap: totalMcap, targetLabel: 'the total crypto market' }
    if (target === 'custom') {
      const n = parseFloat(customAmt)
      const mult = customUnit === 'T' ? 1e12 : customUnit === 'B' ? 1e9 : 1e6
      return { targetMcap: isNaN(n) ? null : n * mult, targetLabel: 'a custom market cap' }
    }
    const [kind, id] = target.split(':')
    if (kind === 'crypto') {
      const c = coins.find(x => x.id === id)
      return { targetMcap: c?.market_cap ?? null, targetLabel: c ? c.name : 'that coin' }
    }
    const a = ASSET_PRESETS.find(x => x.key === id)
    return { targetMcap: a?.mcap ?? null, targetLabel: a ? a.label : 'that asset' }
  }, [target, coins, totalMcap, customAmt, customUnit])

  const supply = coinA?.circulating_supply
  const impliedPrice = supply > 0 && targetMcap > 0 ? targetMcap / supply : null
  const multiple = impliedPrice && coinA?.current_price > 0 ? impliedPrice / coinA.current_price : null
  const up = multiple != null && multiple >= 1

  const symbol = coinA?.symbol?.toUpperCase() || ''

  return (
    <>
      <Head>
        <title>Market Cap Calculator — GM Crypto News</title>
        <meta name="description" content="Calculate what a cryptocurrency's price would be at the market cap of another coin, gold, a top stock, or any value." />
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
            What would a coin be worth if it reached the market cap of another coin, gold, a top stock, or any value you choose?
          </p>
        </div>

        <div className="mcap-calc">
          <div className="mcap-calc-inputs">
            <div className="mcap-calc-field">
              <label className="mcap-calc-label">Coin</label>
              <select className="mcap-calc-select" value={coinId} onChange={e => setCoinId(e.target.value)}>
                {coins.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.symbol?.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="mcap-calc-arrow" aria-hidden="true">at the market cap of</div>

            <div className="mcap-calc-field">
              <label className="mcap-calc-label">Target</label>
              <select className="mcap-calc-select" value={target} onChange={e => setTarget(e.target.value)}>
                <optgroup label="Crypto">
                  <option value="total">Total crypto market</option>
                  {coins.slice(0, 20).map(c => (
                    <option key={c.id} value={`crypto:${c.id}`}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Traditional assets (approx.)">
                  {ASSET_PRESETS.map(a => (
                    <option key={a.key} value={`asset:${a.key}`}>{a.label}</option>
                  ))}
                </optgroup>
                <option value="custom">Custom value…</option>
              </select>

              {target === 'custom' && (
                <div className="mcap-calc-custom">
                  <span className="mcap-calc-custom-prefix">$</span>
                  <input
                    className="mcap-calc-custom-input"
                    type="number"
                    min="0"
                    step="any"
                    value={customAmt}
                    onChange={e => setCustomAmt(e.target.value)}
                  />
                  <select className="mcap-calc-custom-unit" value={customUnit} onChange={e => setCustomUnit(e.target.value)}>
                    <option value="M">Million</option>
                    <option value="B">Billion</option>
                    <option value="T">Trillion</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="mcap-calc-result">
            {!coinA ? (
              <div className="mcap-calc-result-empty">Select a coin.</div>
            ) : !(supply > 0) ? (
              <div className="mcap-calc-result-empty">
                Circulating supply data isn't available for {coinA.name}, so an implied price can't be calculated.
              </div>
            ) : !(targetMcap > 0) ? (
              <div className="mcap-calc-result-empty">Enter a target market cap.</div>
            ) : (
              <>
                <div className="mcap-calc-result-head">
                  {coinA.image && <img src={coinA.image} alt={coinA.name} className="mcap-calc-result-img" />}
                  <span>
                    {symbol} at the market cap of <strong>{targetLabel}</strong>
                    {' '}({formatBigNumber(targetMcap)})
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
            <strong>Note:</strong> Crypto market caps are live (via CoinGecko). Traditional-asset values (gold, stocks, etc.) are approximate, static reference figures for illustration and change over time. This is a hypothetical calculation, not a price prediction. Not financial advice.
          </div>
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getStaticProps() {
  try {
    const [coins, globalStats] = await Promise.all([
      getCoinsMarkets({ page: 1, perPage: 100 }),
      getGlobalStats().catch(() => null),
    ])
    const slim = (coins || []).map(c => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      image: c.image,
      current_price: c.current_price,
      market_cap: c.market_cap,
      circulating_supply: c.circulating_supply,
    }))
    return {
      props: { coins: slim, totalMcap: globalStats?.total_market_cap?.usd || null },
      revalidate: 300,
    }
  } catch (error) {
    console.error('Mcap calculator page error:', error)
    return { props: { coins: [], totalMcap: null }, revalidate: 60 }
  }
}
