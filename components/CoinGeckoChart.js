// components/CoinGeckoChart.js
// A price chart drawn from CoinGecko data (via /api/coingecko-chart) using
// lightweight-charts. Used for any coin TradingView can't reliably show — since
// every coin on the site comes from CoinGecko, this chart always has data.
// Theme-aware (light/dark) and has a timeframe selector.

import { useEffect, useRef, useState } from 'react'

const RANGES = [
  { label: '24H', days: '1' },
  { label: '7D', days: '7' },
  { label: '30D', days: '30' },
  { label: '90D', days: '90' },
  { label: '1Y', days: '365' },
  { label: 'All', days: 'max' },
]

export default function CoinGeckoChart({ coinId, coinName, theme = 'dark' }) {
  const wrapRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [range, setRange] = useState('7')
  const [chartReady, setChartReady] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | empty | error

  // Create the chart (re-created when the theme changes so colors update).
  useEffect(() => {
    let disposed = false
    let ro

    ;(async () => {
      const { createChart, ColorType } = await import('lightweight-charts')
      if (disposed || !wrapRef.current) return

      const isLight = theme === 'light'
      const chart = createChart(wrapRef.current, {
        width: wrapRef.current.clientWidth,
        height: 380,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isLight ? '#555' : '#9aa0a6',
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
        },
        grid: {
          vertLines: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
          horzLines: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
        },
        rightPriceScale: { borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' },
        timeScale: {
          borderColor: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
          timeVisible: false,
          secondsVisible: false,
        },
        crosshair: { mode: 1 },
        handleScale: false,
        handleScroll: false,
      })

      const series = chart.addAreaSeries({
        lineColor: '#FF6B00',
        topColor: 'rgba(255,107,0,0.25)',
        bottomColor: 'rgba(255,107,0,0.0)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
      })

      chartRef.current = chart
      seriesRef.current = series

      ro = new ResizeObserver(() => {
        if (wrapRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: wrapRef.current.clientWidth })
        }
      })
      ro.observe(wrapRef.current)
      setChartReady(true)
    })()

    return () => {
      disposed = true
      setChartReady(false)
      if (ro) ro.disconnect()
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        seriesRef.current = null
      }
    }
  }, [theme])

  // Load data whenever the coin, range, or (re-created) chart changes.
  useEffect(() => {
    if (!chartReady) return
    let cancelled = false

    ;(async () => {
      setStatus('loading')
      try {
        const res = await fetch(
          `/api/coingecko-chart?coin=${encodeURIComponent(coinId)}&days=${range}&type=area`
        )
        if (!res.ok) throw new Error('bad response')
        const data = await res.json()
        const prices = Array.isArray(data?.prices) ? data.prices : []
        if (!prices.length) {
          if (!cancelled) setStatus('empty')
          return
        }

        // Convert to lightweight-charts format, de-duplicate + sort by time.
        const map = new Map()
        for (const [ms, price] of prices) {
          map.set(Math.floor(ms / 1000), price)
        }
        const points = [...map.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([time, value]) => ({ time, value }))

        if (cancelled || !seriesRef.current) return
        seriesRef.current.setData(points)
        if (chartRef.current) chartRef.current.timeScale().fitContent()
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [coinId, range, chartReady])

  return (
    <div className="cg-chart">
      <div className="cg-chart-ranges">
        {RANGES.map(r => (
          <button
            key={r.days}
            className={`cg-range${range === r.days ? ' active' : ''}`}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="cg-chart-canvas" ref={wrapRef} style={{ height: 380, position: 'relative' }}>
        {status !== 'ready' && (
          <div className="cg-chart-status">
            {status === 'loading' && 'Loading chart…'}
            {status === 'empty' && `No chart data available for ${coinName || 'this coin'}.`}
            {status === 'error' && 'Chart data is temporarily unavailable.'}
          </div>
        )}
      </div>
      <div className="cg-chart-credit">Chart data via CoinGecko</div>
    </div>
  )
}
