// components/AnalysisEmbed.js
// In-feed compact chart embed (BeInCrypto-style). Shown after the 3rd article
// in the homepage feed. Hidden on mobile.
//
// Coin pills (BTC/ETH/SOL) load summary prices from CoinGecko once on mount.
// Selecting a pill swaps the active chart. Time-range buttons (24H/7D/30D/1Y/All)
// refetch the chart for the selected coin.

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createChart, ColorType } from 'lightweight-charts'

const COINS = [
  { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana',   symbol: 'SOL', name: 'Solana' },
]

const RANGES = [
  { label: '24H', days: 1 },
  { label: '7D',  days: 7 },
  { label: '30D', days: 30 },
  { label: '1Y',  days: 365 },
  { label: 'All', days: 'max' },
]

function formatPrice(price) {
  if (price == null) return '$—'
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (price >= 1) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return '$' + price.toFixed(4)
}

export default function AnalysisEmbed() {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const latestRequestId = useRef(0)

  const [activeCoinId, setActiveCoinId] = useState('bitcoin')
  const [days, setDays] = useState(1)
  const [coinData, setCoinData] = useState({}) // { bitcoin: {price, change, image}, ... }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const activeCoin = COINS.find(c => c.id === activeCoinId)
  const activeData = coinData[activeCoinId] || {}
  const isUp = (activeData.change ?? 0) >= 0
  const changeColor = isUp ? '#4caf50' : '#f44336'

  // Load coin summary data (price, 24h change, image) for all 3 pills once
  useEffect(() => {
    let cancelled = false
    async function loadSummary() {
      try {
        const ids = COINS.map(c => c.id).join(',')
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
        )
        const data = await res.json()
        if (cancelled) return
        const map = {}
        for (const c of data) {
          map[c.id] = {
            price: c.current_price,
            change: c.price_change_percentage_24h,
            image: c.image,
          }
        }
        setCoinData(map)
      } catch (err) {
        console.error('AnalysisEmbed summary error:', err)
      }
    }
    loadSummary()
    return () => { cancelled = true }
  }, [])

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return

    const isDark = !document.body.classList.contains('light')
    const textColor = isDark ? '#999999' : '#555555'
    const gridColor = isDark ? '#1a1a1a' : '#eeeeee'
    const bgColor = isDark ? '#0a0a0a' : '#ffffff'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
      },
      grid: {
        vertLines: { color: 'transparent' },
        horzLines: { color: gridColor },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'transparent',
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: false,
      handleScale: false,
      width: containerRef.current.clientWidth,
      height: 320,
    })

    chartRef.current = chart

    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Recreate area series when coin changes (color reflects up/down)
  useEffect(() => {
    if (!chartRef.current) return

    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current)
      } catch (e) { /* ignore */ }
      seriesRef.current = null
    }

    const lineColor = isUp ? '#4caf50' : '#f44336'
    seriesRef.current = chartRef.current.addAreaSeries({
      lineColor: lineColor,
      topColor: lineColor + '40',
      bottomColor: lineColor + '05',
      lineWidth: 2,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
    })
  }, [activeCoinId, isUp])

  // Fetch chart data when coin or range changes
  useEffect(() => {
    if (!seriesRef.current) return

    const requestId = ++latestRequestId.current
    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    async function fetchChart() {
      try {
        const url = `https://api.coingecko.com/api/v3/coins/${activeCoinId}/market_chart?vs_currency=usd&days=${days}`
        const res = await fetch(url, { signal: abortController.signal })
        if (requestId !== latestRequestId.current) return
        if (!res.ok) {
          if (res.status === 429) throw new Error('Rate limited. Please wait a moment.')
          throw new Error(`Chart unavailable (${res.status})`)
        }
        const json = await res.json()
        if (requestId !== latestRequestId.current) return

        const points = (json.prices || []).map(([time, value]) => ({
          time: Math.floor(time / 1000),
          value,
        }))

        if (points.length === 0) throw new Error('No data available')

        const seen = new Set()
        const cleaned = points
          .filter(p => { if (seen.has(p.time)) return false; seen.add(p.time); return true })
          .sort((a, b) => a.time - b.time)

        if (seriesRef.current && requestId === latestRequestId.current) {
          seriesRef.current.setData(cleaned)
          chartRef.current?.timeScale().fitContent()
          setLoading(false)
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        if (requestId !== latestRequestId.current) return
        console.error('AnalysisEmbed chart error:', err)
        setError(err.message || 'Failed to load chart')
        setLoading(false)
      }
    }

    fetchChart()
    return () => abortController.abort()
  }, [activeCoinId, days])

  return (
    <div className="analysis-embed">
      <div className="analysis-embed-header">
        <h3 className="analysis-embed-title">Analysis</h3>
        <Link href="/markets" className="analysis-embed-more">
          More Markets <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Coin selector pills */}
      <div className="analysis-embed-pills">
        {COINS.map(coin => {
          const d = coinData[coin.id] || {}
          const up = (d.change ?? 0) >= 0
          const isActive = coin.id === activeCoinId
          return (
            <button
              key={coin.id}
              className={`analysis-embed-pill ${isActive ? 'analysis-embed-pill-active' : ''}`}
              onClick={() => setActiveCoinId(coin.id)}
            >
              {d.image && (
                <img src={d.image} alt={coin.name} className="analysis-embed-pill-img" />
              )}
              <span className="analysis-embed-pill-price">
                {formatPrice(d.price)}
              </span>
              <span className={`analysis-embed-pill-change ${up ? 'up' : 'down'}`}>
                {up ? '▲' : '▼'} {Math.abs(d.change ?? 0).toFixed(2)}%
              </span>
            </button>
          )
        })}
      </div>

      {/* Chart panel with overlay */}
      <div className="analysis-embed-chart-wrap">
        <div className="analysis-embed-overlay">
          <div className="analysis-embed-overlay-row">
            {activeData.image && (
              <img src={activeData.image} alt={activeCoin.name} className="analysis-embed-overlay-img" />
            )}
            <span className="analysis-embed-overlay-name">{activeCoin.name}</span>
            <span className="analysis-embed-overlay-symbol">{activeCoin.symbol}</span>
          </div>
          <div className="analysis-embed-overlay-price">
            {formatPrice(activeData.price)}
          </div>
          <div className="analysis-embed-overlay-change" style={{ color: changeColor }}>
            {isUp ? '▲' : '▼'} {Math.abs(activeData.change ?? 0).toFixed(2)}%
            <span className="analysis-embed-overlay-period">
              {days === 1 ? 'for 24 hours' : days === 7 ? 'for 7 days' : days === 30 ? 'for 30 days' : days === 365 ? 'for 1 year' : 'all time'}
            </span>
          </div>
        </div>

        <div className="analysis-embed-chart" ref={containerRef}>
          {loading && <div className="analysis-embed-loading">Loading chart…</div>}
          {error && !loading && <div className="analysis-embed-error">{error}</div>}
        </div>
      </div>

      {/* Time range buttons */}
      <div className="analysis-embed-ranges">
        {RANGES.map(r => (
          <button
            key={r.label}
            className={`analysis-embed-range-btn ${days === r.days ? 'analysis-embed-range-active' : ''}`}
            onClick={() => setDays(r.days)}
            disabled={loading}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
