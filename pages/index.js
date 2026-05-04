// pages/markets/index.js
// Cryptocurrency prices table.
//
// Page 1 is statically generated with ISR (revalidate every 60s) — this means:
//   - First-time visitors get instant cached HTML
//   - Back button works perfectly (no failed re-fetches)
//   - Refresh just shows cached data, fast
//
// Pages 2-10 are loaded client-side via /api/markets-list proxy, which has
// its own 60s cache. Pagination doesn't trigger a full page reload anymore.

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import Sparkline from '../../components/Sparkline'
import {
  getGlobalStats,
  getCoinsMarkets,
  formatPrice,
  formatBigNumber,
  formatPercent,
} from '../../lib/coingecko'

const PER_PAGE = 100
const TOTAL_PAGES = 10

export default function MarketsPage({ initialGlobalStats, initialCoins }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('market_cap_rank')
  const [sortDir, setSortDir] = useState('asc')

  // Page state — read from URL ?page=N, default 1
  const [page, setPage] = useState(1)
  const [coins, setCoins] = useState(initialCoins || [])
  const [globalStats, setGlobalStats] = useState(initialGlobalStats || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Read page from URL on mount + when query changes
  useEffect(() => {
    if (!router.isReady) return
    const urlPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(router.query.page) || 1))
    setPage(urlPage)
  }, [router.isReady, router.query.page])

  // Fetch coins for current page (client-side, via our proxy)
  // Page 1 already has initialCoins from getStaticProps, so skip the fetch.
  useEffect(() => {
    if (page === 1 && initialCoins?.length > 0) {
      setCoins(initialCoins)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/markets-list?page=${page}`, { signal: ac.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load page ${page}`)
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        setCoins(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        if (cancelled) return
        console.error('Markets fetch error:', err)
        setError('Failed to load prices. Try refreshing.')
        setLoading(false)
      })

    return () => { cancelled = true; ac.abort() }
  }, [page, initialCoins])

  // Always refresh global stats client-side every time the page mounts —
  // ISR cache might be stale otherwise. Cheap call, single endpoint.
  useEffect(() => {
    let cancelled = false
    fetch('/api/markets-global')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!cancelled && data) setGlobalStats(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir(key === 'market_cap_rank' ? 'asc' : 'desc')
    }
  }

  const goToPage = useCallback((newPage) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, newPage))
    if (clamped === page) return
    if (clamped === 1) {
      router.push('/markets', undefined, { shallow: true, scroll: true })
    } else {
      router.push(`/markets?page=${clamped}`, undefined, { shallow: true, scroll: true })
    }
  }, [page, router])

  const sortedCoins = useMemo(() => {
    const filtered = (coins || []).filter(
      (c) =>
        !search ||
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol?.toLowerCase().includes(search.toLowerCase())
    )
    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [coins, search, sortBy, sortDir])

  const marketCap = globalStats?.total_market_cap?.usd
  const volume = globalStats?.total_volume?.usd
  const btcDom = globalStats?.market_cap_percentage?.btc
  const capChange = globalStats?.market_cap_change_percentage_24h_usd

  return (
    <>
      <Head>
        <title>Crypto Prices & Markets — GM Crypto News</title>
        <meta name="description" content="Live crypto prices, market caps, trading volumes, and charts. Top 1000 cryptocurrencies, updated every minute." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <section className="markets-hero">
          <div className="markets-hero-title">
            <h1>Cryptocurrency Prices</h1>
            <span className="markets-attribution">Data by CoinGecko</span>
          </div>

          <p className="markets-hero-sub">
            The global crypto market cap today is{' '}
            <strong>{formatBigNumber(marketCap)}</strong>
            {capChange != null && (
              <>
                , a{' '}
                <span className={capChange >= 0 ? 'up' : 'down'}>
                  {formatPercent(capChange)}
                </span>{' '}
                change in the last 24 hours.
              </>
            )}
          </p>

          <div className="markets-stats-grid">
            <div className="markets-stat-card">
              <div className="markets-stat-label">Total Market Cap</div>
              <div className="markets-stat-value">{formatBigNumber(marketCap)}</div>
              {capChange != null && (
                <div className={`markets-stat-change ${capChange >= 0 ? 'up' : 'down'}`}>
                  {formatPercent(capChange)}
                </div>
              )}
            </div>
            <div className="markets-stat-card">
              <div className="markets-stat-label">24h Volume</div>
              <div className="markets-stat-value">{formatBigNumber(volume)}</div>
            </div>
            <div className="markets-stat-card">
              <div className="markets-stat-label">BTC Dominance</div>
              <div className="markets-stat-value">
                {btcDom != null ? btcDom.toFixed(2) + '%' : '—'}
              </div>
            </div>
            <div className="markets-stat-card">
              <div className="markets-stat-label">Active Cryptos</div>
              <div className="markets-stat-value">
                {globalStats?.active_cryptocurrencies?.toLocaleString() || '—'}
              </div>
            </div>
          </div>
        </section>

        <div className="markets-controls">
          <input
            type="text"
            className="markets-search"
            placeholder="Search coin or symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="markets-page-info">
            Page {page} of {TOTAL_PAGES}
          </div>
        </div>

        {error && (
          <div style={{
            padding: '16px',
            margin: '16px 0',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            textAlign: 'center',
            color: 'var(--red)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}

        <div className="markets-table-wrap" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <table className="markets-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('market_cap_rank')} className="sortable">#</th>
                <th className="coin-col">Coin</th>
                <th onClick={() => handleSort('current_price')} className="sortable right">Price</th>
                <th onClick={() => handleSort('price_change_percentage_1h_in_currency')} className="sortable right">1h</th>
                <th onClick={() => handleSort('price_change_percentage_24h_in_currency')} className="sortable right">24h</th>
                <th onClick={() => handleSort('price_change_percentage_7d_in_currency')} className="sortable right">7d</th>
                <th onClick={() => handleSort('total_volume')} className="sortable right">Volume (24h)</th>
                <th onClick={() => handleSort('market_cap')} className="sortable right">Market Cap</th>
                <th className="right">Last 7 days</th>
              </tr>
            </thead>
            <tbody>
              {sortedCoins.map((coin) => {
                const sparkData = coin.sparkline_in_7d?.price || []
                const sparkPositive =
                  sparkData.length > 1 && sparkData[sparkData.length - 1] >= sparkData[0]
                return (
                  <tr key={coin.id}>
                    <td className="rank">{coin.market_cap_rank || '—'}</td>
                    <td>
                      <Link href={`/markets/${coin.id}`} className="coin-link">
                        <img src={coin.image} alt={coin.name} className="coin-img" />
                        <div className="coin-name-wrap">
                          <span className="coin-name">{coin.name}</span>
                          <span className="coin-symbol">{coin.symbol?.toUpperCase()}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="right price">{formatPrice(coin.current_price)}</td>
                    <td className={`right ${coin.price_change_percentage_1h_in_currency >= 0 ? 'up' : 'down'}`}>
                      {formatPercent(coin.price_change_percentage_1h_in_currency)}
                    </td>
                    <td className={`right ${coin.price_change_percentage_24h_in_currency >= 0 ? 'up' : 'down'}`}>
                      {formatPercent(coin.price_change_percentage_24h_in_currency)}
                    </td>
                    <td className={`right ${coin.price_change_percentage_7d_in_currency >= 0 ? 'up' : 'down'}`}>
                      {formatPercent(coin.price_change_percentage_7d_in_currency)}
                    </td>
                    <td className="right">{formatBigNumber(coin.total_volume)}</td>
                    <td className="right">{formatBigNumber(coin.market_cap)}</td>
                    <td className="right spark-cell">
                      <Sparkline data={sparkData} positive={sparkPositive} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination — uses buttons + shallow routing instead of <Link> for full reload.
            This keeps page state client-side and prevents the back-button bug. */}
        <div className="markets-pagination">
          {page > 1 && (
            <button
              type="button"
              className="pagination-btn"
              onClick={() => goToPage(page - 1)}
              disabled={loading}
            >
              ← Previous
            </button>
          )}
          <span className="pagination-info">
            Page {page} of {TOTAL_PAGES}
          </span>
          {page < TOTAL_PAGES && (
            <button
              type="button"
              className="pagination-btn"
              onClick={() => goToPage(page + 1)}
              disabled={loading}
            >
              Next →
            </button>
          )}
        </div>

        <Footer />
      </div>
    </>
  )
}

// ISR: page 1 is statically generated, refreshed every 60s in the background.
// Pages 2-10 are loaded client-side via /api/markets-list (also cached).
export async function getStaticProps() {
  try {
    const [globalStats, coins] = await Promise.all([
      getGlobalStats().catch(() => null),
      getCoinsMarkets({ page: 1, perPage: PER_PAGE }).catch(() => []),
    ])
    return {
      props: {
        initialGlobalStats: globalStats || null,
        initialCoins: coins || [],
      },
      revalidate: 60,
    }
  } catch (error) {
    console.error('Markets page build error:', error)
    return {
      props: {
        initialGlobalStats: null,
        initialCoins: [],
      },
      revalidate: 60,
    }
  }
}
