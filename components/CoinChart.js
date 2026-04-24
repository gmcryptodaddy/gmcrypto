// components/CoinChart.js
import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'

const RANGES = [
  { label: '24h', days: 1 },
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '1y', days: 365 },
  { label: 'All', days: 'max' },
]

export default function CoinChart({ coinId, color = '#FF6B00' }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  const latestRequestId = useRef(0)
  const [days, setDays] = useState(7)
  const [chartType, setChartType] = useState('area') // 'area' or 'candle'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Initialize chart once
  useEffect(() => {
    if (!containerRef.current) return

    const isDark = !document.body.classList.contains('light')
    const textColor = isDark ? '#999999' : '#555555'
    const gridColor = isDark ? '#1a1a1a' : '#eeeeee'
    const bgColor = isDark ? '#0a0a0a' : '#f8f8f8'

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bgColor },
        textColor: textColor,
        fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: gridColor,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: color, width: 1, style: 2 },
        horzLine: { color: color, width: 1, style: 2 },
      },
      width: containerRef.current.clientWidth,
      height: 420,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Swap series type when chartType changes
  useEffect(() => {
    if (!chartRef.current) return

    // Remove old series if exists
    if (seriesRef.current) {
      try {
        chartRef.current.removeSeries(seriesRef.current)
      } catch (e) {
        // series might already be gone
      }
      seriesRef.current = null
    }

    // Create new series of the chosen type
    if (chartType === 'candle') {
      seriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#4caf50',
        downColor: '#f44336',
        borderVisible: false,
        wickUpColor: '#4caf50',
        wickDownColor: '#f44336',
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
    } else {
      seriesRef.current = chartRef.current.addAreaSeries({
        lineColor: color,
        topColor: color + '55',
        bottomColor: color + '05',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      })
    }
    // Trigger a data refetch for the new series
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, color])

  // Fetch data when coinId, days, OR chartType changes
  useEffect(() => {
    if (!seriesRef.current) return

    const requestId = ++latestRequestId.current
    const abortController = new AbortController()
    setLoading(true)
    setError(null)

    async function fetchChart() {
      try {
        // For candle view, use OHLC endpoint; for area, use market_chart
        const url = chartType === 'candle'
          ? `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`
          : `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`

        const res = await fetch(url, { signal: abortController.signal })

        // Bail if a newer request has started
        if (requestId !== latestRequestId.current) return

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Rate limited — please wait a moment and try again.')
          }
          throw new Error(`Chart unavailable (${res.status})`)
        }

        const json = await res.json()
        if (requestId !== latestRequestId.current) return

        let points = []
        if (chartType === 'candle') {
          // OHLC response: [[time_ms, open, high, low, close], ...]
          points = (json || []).map(([time, open, high, low, close]) => ({
            time: Math.floor(time / 1000),
            open, high, low, close,
          }))
        } else {
          // market_chart: { prices: [[time_ms, price], ...] }
          points = (json.prices || []).map(([time, value]) => ({
            time: Math.floor(time / 1000),
            value,
          }))
        }

        if (points.length === 0) {
          throw new Error('No data available for this range')
        }

        // De-dupe: lightweight-charts errors on duplicate timestamps
        const seen = new Set()
        const cleaned = points.filter(p => {
          if (seen.has(p.time)) return false
          seen.add(p.time)
          return true
        }).sort((a, b) => a.time - b.time)

        // Guard against series being gone (component unmounted or type switched)
        if (seriesRef.current && requestId === latestRequestId.current) {
          seriesRef.current.setData(cleaned)
          chartRef.current?.timeScale().fitContent()
          setLoading(false)
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        if (requestId !== latestRequestId.current) return
        console.error('Chart fetch error:', err)
        setError(err.message || 'Failed to load chart')
        setLoading(false)
      }
    }

    fetchChart()

    return () => {
      abortController.abort()
    }
  }, [coinId, days, chartType])

  return (
    <div className="coin-chart-wrap">
      <div className="coin-chart-controls">
        <div className="coin-chart-ranges">
          {RANGES.map((r) => (
            <button
              key={r.label}
              className={`chart-range-btn ${days === r.days ? 'active' : ''}`}
              onClick={() => setDays(r.days)}
              disabled={loading}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="coin-chart-types">
          <button
            className={`chart-type-btn ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
            disabled={loading}
            aria-label="Area chart"
            title="Area chart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 17l6-6 4 4 8-8" />
              <path d="M3 21l6-6 4 4 8-8V21H3z" fill="currentColor" fillOpacity="0.2" />
            </svg>
          </button>
          <button
            className={`chart-type-btn ${chartType === 'candle' ? 'active' : ''}`}
            onClick={() => setChartType('candle')}
            disabled={loading}
            aria-label="Candlestick chart"
            title="Candlestick chart"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="3" x2="7" y2="21" />
              <rect x="4" y="7" width="6" height="10" fill="currentColor" fillOpacity="0.3" />
              <line x1="17" y1="3" x2="17" y2="21" />
              <rect x="14" y="9" width="6" height="8" fill="currentColor" fillOpacity="0.3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="coin-chart" ref={containerRef}>
        {loading && <div className="coin-chart-loading">Loading chart…</div>}
        {error && !loading && (
          <div className="coin-chart-error">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
