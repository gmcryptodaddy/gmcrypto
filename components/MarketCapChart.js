// components/MarketCapChart.js
// Compact area chart of the total crypto market cap for the markets page.
// Self-contained: reads the site light/dark theme, fetches its own data from
// /api/global-market-cap-chart, and has small range buttons.

import { useEffect, useRef, useState } from 'react'

const RANGES = [
  { label: '24H', days: '1' },
  { label: '7D', days: '7' },
  { label: '30D', days: '30' },
  { label: '90D', days: '90' },
  { label: '1Y', days: '365' },
]

function fmtCompactUsd(v) {
  if (v == null || isNaN(v)) return ''
  const abs = Math.abs(v)
  if (abs >= 1e12) return '$' + (v / 1e12).toFixed(2) + 'T'
  if (abs >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B'
  if (abs >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M'
  return '$' + v.toFixed(0)
}

function useBodyTheme() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const read = () => setTheme(document.body.classList.contains('light') ? 'light' : 'dark')
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return theme
}

export default function MarketCapChart() {
  const theme = useBodyTheme()
  const wrapRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const [range, setRange] = useState('30')
  const [chartReady, setChartReady] = useState(false)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [approximate, setApproximate] = useState(false)

  // Create chart (re-created on theme change)
  useEffect(() => {
    let disposed = false
    let ro

    ;(async () => {
      const { createChart, ColorType } = await import('lightweight-charts')
      if (disposed || !wrapRef.current) return
      const isLight = theme === 'light'

      const chart = createChart(wrapRef.current, {
        width: wrapRef.current.clientWidth,
        height: 200,
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isLight ? '#555' : '#9aa0a6',
          fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
          fontSize: 11,
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' },
        },
        rightPriceScale: { borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: false, secondsVisible: false },
        crosshair: { mode: 1 },
        handleScale: false,
        handleScroll: false,
        localization: {
          priceFormatter: fmtCompactUsd,
        },
      })

      const series = chart.addAreaSeries({
        lineColor: '#FF6B00',
        topColor: 'rgba(255,107,0,0.22)',
        bottomColor: 'rgba(255,107,0,0.0)',
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
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

  // Load data
  useEffect(() => {
    if (!chartReady) return
    let cancelled = false

    ;(async () => {
      setStatus('loading')
      try {
        const res = await fetch(`/api/global-market-cap-chart?days=${range}`)
        if (!res.ok) throw new Error('bad')
        const data = await res.json()
        const caps = Array.isArray(data?.market_caps) ? data.market_caps : []
        if (!caps.length) throw new Error('empty')

        const map = new Map()
        for (const [ms, val] of caps) map.set(Math.floor(ms / 1000), val)
        const points = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([time, value]) => ({ time, value }))

        if (cancelled || !seriesRef.current) return
        seriesRef.current.setData(points)
        if (chartRef.current) chartRef.current.timeScale().fitContent()
        setApproximate(Boolean(data.approximate))
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [range, chartReady])

  return (
    <div className="mcap-chart">
      <div className="mcap-chart-ranges">
        {RANGES.map(r => (
          <button
            key={r.days}
            className={`mcap-range${range === r.days ? ' active' : ''}`}
            onClick={() => setRange(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="mcap-chart-canvas" ref={wrapRef} style={{ height: 200, position: 'relative' }}>
        {status !== 'ready' && (
          <div className="mcap-chart-status">
            {status === 'loading' ? 'Loading chart…' : 'Chart temporarily unavailable.'}
          </div>
        )}
      </div>
      {approximate && status === 'ready' && (
        <div className="mcap-chart-note">Trend approximated from market leaders; current value is exact.</div>
      )}
    </div>
  )
}
