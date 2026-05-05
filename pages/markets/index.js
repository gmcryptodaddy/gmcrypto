// pages/markets/index.js
// Cryptocurrency prices table with:
//   - ISR-cached page 1 (instant load on first visit + back button)
//   - Client-side pagination via /api/markets-list (cached server-side)
//   - GLOBAL search via /api/coin-search (searches CoinGecko's full database,
//     not just current page)
//   - Proper error states with retry button

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
const SEARCH_DEBOUNCE_MS = 300

export default function MarketsPage({ initialGlobalStats, initialCoins }) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState('market_cap_rank')
  const [sortDir, setSortDir] = useState('asc')

  const [page, setPage] = useState(1)
  const [coins, setCoins] = useState(initialCoins || [])
  const [globalStats, setGlobalStats] = useState(initialGlobalStats || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Search state — fully decoupled from pagination
  const [searchInput, setSearchInput] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchAbortRef = useRef(null)

  // Read URL ?page=N
  useEffect(() => {
    if (!router.isReady) return
    const urlPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(router.query.page) || 1))
    setPage(urlPage)
  }, [router.isReady, router.query.page])

  // Load coins for current page
  // Page 1 uses initialCoins from getStaticProps to avoid double-fetch
  // Pages 2-10 fetch from /api/markets-list
  useEffect(() => {
    if (page === 1 && initialCoins?.length > 0) {
      setCoins(initialCoins)
      setError(null)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/markets-list?page=${page}`, { signal: ac.signal })
      .then(async res => {
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${detail.slice(0, 100)}`)
        }
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          setCoins(data)
          setError(null)
        } else {
          // Empty array = upstream rate limited but no cache. Don't show stale data.
          setCoins([])
          setError('Could not load this page right now. Try again in a moment.')
        }
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        if (cancelled) return
        console.error('Markets fetch error:', err)
        // Reset coins so we don't show page 1 data on a failed page 2 load
        setCoins([])
        setError('Failed to load prices. Try refreshing.')
        setLoading(false)
      })

    return () => { cancelled = true; ac.abort() }
  }, [page, initialCoins])

  // Refresh global stats client-side on mount
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

  // Debounced global coin search via /api/coin-search
  useEffect(() => {
    const q = searchInput.trim()
    if (!q || q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    // Abort previous search if user typed faster than results came back
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const ac = new AbortController()
    searchAbortRef.current = ac

    const t = setTimeout(() => {
      setSearchLoading(true)
      fetch(`/api/coin-search?q=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          setSearchResults(Array.isArray(data) ? data : [])
          setSearchLoading(false)
        })
        .catch(err => {
          if (err.name === 'AbortError') return
          console.error('Search error:', err)
          setSearchResults([])
          setSearchLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [searchInput])

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

  const retryFetch = useCallback(() => {
    // Trigger re-fetch by toggling page state through itself (force the effect)
    setError(null)
    setLoading(true)
    fetch(`/api/markets-list?page=${page}`)
      .then(async res => {
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          throw new Error(`HTTP ${res.status}: ${detail.slice(0, 100)}`)
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCoins(data)
          setError(null)
        } else {
          setError('Still loading… CoinGecko may be busy. Try again in a minute.')
        }
        setLoading(false)
      })
      .catch(() => {
        setError('Still failing. CoinGecko may be rate limited.')
        setLoading(false)
      })
  }, [page])

  const sortedCoins = useMemo(() => {
    const sorted = [...(coins || [])].sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [coins, sortBy, sortDir])

  const isSearching = searchInput.trim().length >= 2

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
            placeholder="Search any coin or symbol…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="markets-page-info">
            {isSearching
              ? `${searchResults.length} match${searchResults.length === 1 ? '' : 'es'}`
              : `Page ${page} of ${TOTAL_PAGES}`}
          </div>
        </div>

        {/* Search results — show when user is searching, replaces table */}
        {isSearching ? (
          <div className="markets-search-results">
            {searchLoading && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>
                Searching…
              </div>
            )}
            {!searchLoading && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)' }}>
                No coins matching "{searchInput}". Try a different name or symbol.
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="markets-search-grid">
                {searchResults.map((coin) => (
                  <Link key={coin.id} href={`/markets/${coin.id}`} className="markets-search-card">
                    {coin.thumb && <img src={coin.thumb} alt={coin.name} className="markets-search-img" />}
                    <div className="markets-search-info">
                      <div className="markets-search-name">{coin.name}</div>
                      <div className="markets-search-symbol">
                        {coin.symbol?.toUpperCase()}
                        {coin.market_cap_rank && <span className="markets-search-rank"> · #{coin.market_cap_rank}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {error && (
              <div className="markets-error-banner">
                <div>{error}</div>
                <button type="button" className="markets-retry-btn" onClick={retryFetch}>
                  Retry
                </button>
              </div>
            )}

            <div
              className="markets-table-wrap"
              style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}
            >
              {sortedCoins.length === 0 && !loading && !error && (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
                  No data on this page.
                </div>
              )}
              {sortedCoins.length > 0 && (
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
              )}
            </div>

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
          </>
        )}

        <Footer />
      </div>
    </>
  )
}

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
