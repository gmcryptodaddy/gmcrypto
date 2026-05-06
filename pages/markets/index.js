// pages/markets/index.js
// Cryptocurrency prices table.
//
// Architecture (zero rate-limit risk):
//   - At build time, getStaticProps fetches ALL 10 pages of CoinGecko data
//     (~1000 coins, ~500KB). This happens once per ISR revalidation cycle
//     (every 5 min), NOT per visitor.
//   - The full 1000-coin array is passed to the page as static props.
//   - Pagination is client-side: slice(start, end) on the array. ZERO API
//     calls when users click Next/Previous.
//   - Search uses /api/coins-index for the full 14k coin list.
//
// This means:
//   - No matter how many users browse, no matter how fast they click pages,
//     CoinGecko gets at most 10 calls per 5 min from this page (during ISR).
//   - Pagination is instant for everyone.
//   - No rate-limit cascade possible.

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
const SEARCH_DEBOUNCE_MS = 150
const MAX_SEARCH_RESULTS = 30

export default function MarketsPage({ globalStats, allCoins }) {
  const router = useRouter()
  const [sortBy, setSortBy] = useState('market_cap_rank')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)

  // Search state
  const [coinIndex, setCoinIndex] = useState([])
  const [coinIndexLoading, setCoinIndexLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Read URL ?page=N
  useEffect(() => {
    if (!router.isReady) return
    const urlPage = Math.max(1, Math.min(TOTAL_PAGES, parseInt(router.query.page) || 1))
    setPage(urlPage)
  }, [router.isReady, router.query.page])

  // Load search index ONCE on mount
  useEffect(() => {
    setCoinIndexLoading(true)
    fetch('/api/coins-index')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) setCoinIndex(data)
        setCoinIndexLoading(false)
      })
      .catch(err => {
        console.error('Coin index load failed:', err)
        setCoinIndexLoading(false)
      })
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim().toLowerCase()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput])

  // Filter coin index for search results
  const searchResults = useMemo(() => {
    if (!debouncedSearch) return []
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

  // CLIENT-SIDE PAGINATION: just slice the full array. No API call.
  const pageCoins = useMemo(() => {
    if (!Array.isArray(allCoins)) return []
    const start = (page - 1) * PER_PAGE
    const end = start + PER_PAGE
    return allCoins.slice(start, end)
  }, [allCoins, page])

  // Sort the current page's slice
  const sortedCoins = useMemo(() => {
    return [...pageCoins].sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [pageCoins, sortBy, sortDir])

  const isSearching = debouncedSearch.length >= 1
  const isPaginatedView = page > 1

  const marketCap = globalStats?.total_market_cap?.usd
  const volume = globalStats?.total_volume?.usd
  const btcDom = globalStats?.market_cap_percentage?.btc
  const capChange = globalStats?.market_cap_change_percentage_24h_usd

  const searchPlaceholder = coinIndexLoading
    ? 'Loading coin database…'
    : coinIndex.length > 0
      ? `Search ${coinIndex.length.toLocaleString()} coins…`
      : 'Search coin or symbol…'

  const noDataLoaded = !Array.isArray(allCoins) || allCoins.length === 0

  return (
    <>
      <Head>
        <title>Crypto Prices & Markets — GM Crypto News</title>
        <meta name="description" content="Live crypto prices, market caps, trading volumes, and charts. Top 1000 cryptocurrencies, updated every minute." />
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
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <div className="markets-page-info">
            {isSearching
              ? `${searchResults.length} match${searchResults.length === 1 ? '' : 'es'}`
              : `Page ${page} of ${TOTAL_PAGES}`}
          </div>
        </div>

        {isSearching ? (
          <div className="markets-search-results">
            {coinIndexLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>
                Loading coin database…
              </div>
            ) : searchResults.length === 0 ? (
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
            <div className="markets-table-wrap">
              {noDataLoaded ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
                  Prices are temporarily unavailable. Refresh in a moment.
                </div>
              ) : sortedCoins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
                  No coins on this page.
                </div>
              ) : (
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

// Helper: fetch one page with retry + delay between calls.
// Spaces out CoinGecko requests to stay under Demo plan rate limit (30/min).
async function fetchPageWithRetry(page, attempt = 1) {
  try {
    return await getCoinsMarkets({ page, perPage: PER_PAGE })
  } catch (err) {
    if (attempt < 3) {
      // Wait 3 seconds and retry
      await new Promise(r => setTimeout(r, 3000))
      return fetchPageWithRetry(page, attempt + 1)
    }
    console.warn(`Page ${page} failed after 3 attempts:`, err.message)
    return [] // Return empty rather than throwing — keep other pages working
  }
}

export async function getStaticProps() {
  try {
    // Fetch global stats first (1 call)
    const globalStats = await getGlobalStats().catch(() => null)

    // Fetch all 10 pages SEQUENTIALLY with small delays.
    // Demo plan = 30 calls/min = 1 call every 2 seconds is safe.
    // Total time: ~20 seconds during build, only happens during ISR revalidate.
    const allCoins = []
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const pageCoins = await fetchPageWithRetry(p)
      if (Array.isArray(pageCoins) && pageCoins.length > 0) {
        allCoins.push(...pageCoins)
      }
      // Small delay between calls to stay well under rate limit
      if (p < TOTAL_PAGES) {
        await new Promise(r => setTimeout(r, 1500))
      }
    }

    return {
      props: {
        globalStats: globalStats || null,
        allCoins,
      },
      // Refresh every 5 minutes. Visitors during the 5min window all see
      // the same cached data instantly — no rate limits possible.
      revalidate: 300,
    }
  } catch (error) {
    console.error('Markets page build error:', error)
    return {
      props: {
        globalStats: null,
        allCoins: [],
      },
      revalidate: 60, // retry sooner if build totally failed
    }
  }
}
