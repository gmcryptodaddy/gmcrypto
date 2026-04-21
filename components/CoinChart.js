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
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)

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

    const series = chart.addAreaSeries({
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

    chartRef.current = chart
    seriesRef.current = series

    const handleResize = () => {
      if (containerRef.current && chart) {
        chart.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch data when days change
  useEffect(() => {
    if (!seriesRef.current) return
    let cancelled = false

    async function fetchChart() {
      setLoading(true)
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
        )
        const json = await res.json()
        if (cancelled) return

        const points = (json.prices || []).map(([time, value]) => ({
          time: Math.floor(time / 1000),
          value: value,
        }))

        seriesRef.current.setData(points)
        chartRef.current?.timeScale().fitContent()
      } catch (err) {
        console.error('Chart fetch error:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchChart()
    return () => {
      cancelled = true
    }
  }, [coinId, days])

  return (
    <div className="coin-chart-wrap">
      <div className="coin-chart-controls">
        {RANGES.map((r) => (
          <button
            key={r.label}
            className={`chart-range-btn ${days === r.days ? 'active' : ''}`}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="coin-chart" ref={containerRef}>
        {loading && <div className="coin-chart-loading">Loading chart…</div>}
      </div>
    </div>
  )
}
