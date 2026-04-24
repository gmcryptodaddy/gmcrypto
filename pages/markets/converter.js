// pages/markets/converter.js
import { useState, useEffect, useMemo } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { getCoinsMarkets } from '../../lib/coingecko'

const FIAT_CURRENCIES = [
  { id: 'usd', symbol: 'USD', name: 'US Dollar', rate: 1 },
  { id: 'eur', symbol: 'EUR', name: 'Euro', rate: 0.92 },
  { id: 'gbp', symbol: 'GBP', name: 'British Pound', rate: 0.79 },
  { id: 'jpy', symbol: 'JPY', name: 'Japanese Yen', rate: 149 },
  { id: 'cny', symbol: 'CNY', name: 'Chinese Yuan', rate: 7.2 },
]

function formatAmount(n) {
  if (n == null || isNaN(n)) return '0'
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  if (n >= 0.0001) return n.toFixed(6)
  return n.toFixed(8)
}

export default function ConverterPage({ coins }) {
  const [amount, setAmount] = useState('1')
  const [fromId, setFromId] = useState('bitcoin')
  const [toId, setToId] = useState('ethereum')
  const [fiatRates, setFiatRates] = useState({})

  // Fetch fiat rates for BTC/ETH in all supported fiats
  useEffect(() => {
    async function loadFiats() {
      try {
        const vsList = FIAT_CURRENCIES.map(f => f.id).join(',')
        const res = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=${vsList}`
        )
        const data = await res.json()
        setFiatRates(data || {})
      } catch (err) {
        console.error('Fiat rates error:', err)
      }
    }
    loadFiats()
  }, [])

  // Build combined asset list
  const allAssets = useMemo(() => {
    const cryptoAssets = (coins || []).map(c => ({
      id: c.id,
      type: 'crypto',
      symbol: c.symbol?.toUpperCase(),
      name: c.name,
      image: c.image,
      priceUsd: c.current_price,
    }))
    const fiatAssets = FIAT_CURRENCIES.map(f => ({
      id: f.id,
      type: 'fiat',
      symbol: f.symbol,
      name: f.name,
      priceUsd: null,
    }))
    return [...cryptoAssets, ...fiatAssets]
  }, [coins])

  const fromAsset = allAssets.find(a => a.id === fromId)
  const toAsset = allAssets.find(a => a.id === toId)

  // Convert amount from → to (via USD as bridge)
  const result = useMemo(() => {
    if (!fromAsset || !toAsset) return 0
    const num = parseFloat(amount)
    if (isNaN(num) || num <= 0) return 0

    // Step 1: from → USD
    let amountUsd
    if (fromAsset.type === 'crypto') {
      amountUsd = num * (fromAsset.priceUsd || 0)
    } else {
      // fiat → USD (USD per 1 unit of this fiat)
      if (fromAsset.id === 'usd') {
        amountUsd = num
      } else {
        // Use bitcoin's price in both fiats to derive the cross rate
        const btcInUsd = fiatRates.bitcoin?.usd
        const btcInFrom = fiatRates.bitcoin?.[fromAsset.id]
        if (btcInUsd && btcInFrom) {
          amountUsd = num * (btcInUsd / btcInFrom)
        } else return 0
      }
    }

    // Step 2: USD → to
    if (toAsset.type === 'crypto') {
      if (!toAsset.priceUsd) return 0
      return amountUsd / toAsset.priceUsd
    } else {
      if (toAsset.id === 'usd') return amountUsd
      const btcInUsd = fiatRates.bitcoin?.usd
      const btcInTo = fiatRates.bitcoin?.[toAsset.id]
      if (btcInUsd && btcInTo) {
        return amountUsd * (btcInTo / btcInUsd)
      }
      return 0
    }
  }, [amount, fromAsset, toAsset, fiatRates])

  const swap = () => {
    const tmp = fromId
    setFromId(toId)
    setToId(tmp)
  }

  return (
    <>
      <Head>
        <title>Crypto Converter — GM Crypto News</title>
        <meta name="description" content="Convert between cryptocurrencies and fiat currencies in real-time. BTC to ETH, BTC to USD, and more." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <div className="markets-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>Converter</span>
        </div>

        <div className="converter-header">
          <h1 className="converter-title">Crypto Converter</h1>
          <p className="converter-sub">
            Live exchange rates across the top {coins.length} cryptocurrencies plus major fiat currencies.
          </p>
        </div>

        <div className="converter-card">
          {/* From row */}
          <div className="converter-row">
            <div className="converter-label">From</div>
            <div className="converter-input-group">
              <input
                type="number"
                className="converter-amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="any"
                placeholder="0"
              />
              <select
                className="converter-select"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                <optgroup label="Fiat Currencies">
                  {FIAT_CURRENCIES.map(f => (
                    <option key={f.id} value={f.id}>{f.symbol} — {f.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Cryptocurrencies">
                  {coins.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.symbol?.toUpperCase()} — {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Swap button */}
          <div className="converter-swap-wrap">
            <button className="converter-swap-btn" onClick={swap} aria-label="Swap currencies">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
          </div>

          {/* To row */}
          <div className="converter-row">
            <div className="converter-label">To</div>
            <div className="converter-input-group">
              <input
                type="text"
                className="converter-amount-input"
                value={formatAmount(result)}
                readOnly
              />
              <select
                className="converter-select"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                <optgroup label="Fiat Currencies">
                  {FIAT_CURRENCIES.map(f => (
                    <option key={f.id} value={f.id}>{f.symbol} — {f.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Cryptocurrencies">
                  {coins.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.symbol?.toUpperCase()} — {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Rate summary */}
          {fromAsset && toAsset && amount && parseFloat(amount) > 0 && (
            <div className="converter-summary">
              <span className="converter-summary-amount">
                {formatAmount(parseFloat(amount))} {fromAsset.symbol}
              </span>
              <span className="converter-summary-equals">=</span>
              <span className="converter-summary-result">
                {formatAmount(result)} {toAsset.symbol}
              </span>
            </div>
          )}
        </div>

        <div className="converter-note">
          <strong>Note:</strong> Conversion rates are based on live market prices from CoinGecko. Actual exchange rates on trading platforms may differ due to fees and liquidity. Not financial advice.
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps() {
  try {
    const coins = await getCoinsMarkets({ page: 1, perPage: 100 })
    return { props: { coins: coins || [] } }
  } catch (error) {
    console.error('Converter page error:', error)
    return { props: { coins: [] } }
  }
}
