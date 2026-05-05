// pages/markets/index.js
// Cryptocurrency prices table.
//
// Architecture:
//   - Page 1: ISR (statically generated, revalidates every 60s)
//   - Pages 2-10: client-side fetch via /api/coins?page=N (cached server-side)
//   - Search: instant local filter against /coins-list.json (loaded once on mount)
//     This means search ALWAYS works for any of CoinGecko's 14k+ coins without
//     hitting the API. Click a result to view its full details page.
//
// SEO: only page 1 is indexed (other pages have noindex via robots meta).
// This is fine — page 1 has the top 100 coins and most search traffic goes there.

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
const SEARCH_DEBOUNCE_MS = 150
const MAX_SEARCH_RESULTS = 30

export default function MarketsPage({ initialGlobalStats, initialCoins }) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState('market_cap_rank')
  const [sortDir, setSortDir] = useState('asc')

  const [page, setPage] = useState(1)
  const [coins, setCoins] = useState(initialCoins || [])
  const [globalStats, setGlobalStats] = useState(initialGlobalStats || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Search state — operates on the full coin index (loaded from /coins-list.json)
  const [coinIndex, setCoinIndex] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Read URL ?page=N
  useEffect(() => {
    if (!router.isReady) return
    const urlPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(router.query.page) || 1))
    setPage(urlPage)
  }, [router.isReady, router.query.page])

  // Load coin index ONCE on mount — no API call, just a static JSON file
  useEffect(() => {
    fetch('/coins-list.json')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) setCoinIndex(data)
      })
      .catch(err => console.warn('Coin index load failed:', err.message))
  }, [])

  // Load coins for current page
  // Page 1 = use initialCoins from getStaticProps (already populated)
  // Pages 2-10 = fetch from /api/coins
  useEffect(() => {
    if (page === 1) {
      // Reset to ISR-fresh data from props
      setCoins(initialCoins || [])
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/coins?page=${page}`, { signal: ac.signal })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          setCoins(data)
          setError(null)
        } else {
          setCoins([])
          setError('No data on this page yet. Try again in a moment.')
        }
        setLoading(false)
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        if (cancelled) return
        console.error('Page fetch error:', err)
        setCoins([])
        setError('Failed to load. Try refreshing in a moment.')
        setLoading(false)
      })

    return () => { cancelled = true; ac.abort() }
  }, [page, initialCoins])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  // Filter coin index by search query — instant, no API calls
  const searchResults = useMemo(() => {
    if (!debouncedSearch || debouncedSearch.length < 1) return []
    if (coinIndex.length === 0) return []

    const q = debouncedSearch
    const exact = []
    const startsWith = []
    const contains = []

    for (const coin of coinIndex) {
      const name = (coin.name || '').toLowerCase()
      const symbol = (coin.symbol || '').toLowerCase()

      if (symbol === q || name === q) {
        exact.push(coin)
      } else if (symbol.startsWith(q) || name.startsWith(q)) {
        startsWith.push(coin)
      } else if (symbol.includes(q) || name.includes(q)) {
        contains.push(coin)
      }

      if (exact.length + startsWith.length + contains.length >= MAX_SEARCH_RESULTS * 3) break
    }

    return [...exact, ...startsWith, ...contains].slice(0, MAX_SEARCH_RESULTS)
  }, [debouncedSearch, coinIndex])

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
    return [...(coins || [])].sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [coins, sortBy, sortDir])

  const isSearching = debouncedSearch.length >= 1
  const isPaginatedView = page > 1

  const marketCap = globalStats?.total_market_cap?.usd
  const volume = globalStats?.total_volume?.usd
  const btcDom = globalStats?.market_cap_percentage?.btc
  const capChange = globalStats?.market_cap_change_percentage_24h_usd

  return (
    <>
      <Head>
        <title>Crypto Prices & Markets — GM Crypto News</title>
        <meta name="description" content="Live crypto prices, market caps, trading volumes, and charts. Top 1000 cryptocurrencies, updated every minute." />
        {/* Pages 2-10 shouldn't be indexed — they're dynamic content for power users */}
        {isPaginatedView && <meta name="robots" content="noindex, follow" />}
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
            placeholder={coinIndex.length > 0 ? `Search ${coinIndex.length.toLocaleString()} coins…` : 'Search coin or symbol…'}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="markets-page-info">
            {isSearching
              ? `${searchResults.length} match${searchResults.length === 1 ? '' : 'es'}`
              : `Page ${page} of ${TOTAL_PAGES}`}
          </div>
        </div>

        {/* Search results replace the table */}
        {isSearching ? (
          <div className="markets-search-results">
            {searchResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
                No coins matching "{searchInput}". Try a different name or symbol.
              </div>
            ) : (
              <div className="markets-search-grid">
                {searchResults.map((coin) => (
                  <Link key={coin.id} href={`/markets/${coin.id}`} className="markets-search-card">
                    <div className="markets-search-info">
                      <div className="markets-search-name">{coin.name}</div>
                      <div className="markets-search-symbol">
                        {coin.symbol?.toUpperCase()}
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
                <span>{error}</span>
                <button
                  type="button"
                  className="markets-retry-btn"
                  onClick={() => {
                    // Force re-fetch by toggling to current page
                    const cur = page
                    setPage(0)
                    setTimeout(() => setPage(cur), 10)
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <div
              className="markets-table-wrap"
              style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}
            >
              {sortedCoins.length === 0 && !loading && !error ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
                  Loading coins…
                </div>
              ) : sortedCoins.length > 0 && (
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
