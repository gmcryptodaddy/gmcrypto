// pages/markets/index.js
import { useState, useMemo } from 'react'
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

export default function MarketsPage({ globalStats, coins, page, totalPages }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('market_cap_rank')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir(key === 'market_cap_rank' ? 'asc' : 'desc')
    }
  }

  const sortedCoins = useMemo(() => {
    const filtered = coins.filter(
      (c) =>
        !search ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase())
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
        {/* Hero stats */}
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

        {/* Search */}
        <div className="markets-controls">
          <input
            type="text"
            className="markets-search"
            placeholder="Search coin or symbol…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="markets-page-info">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Table */}
        <div className="markets-table-wrap">
          <table className="markets-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('market_cap_rank')} className="sortable">
                  #
                </th>
                <th className="coin-col">Coin</th>
                <th onClick={() => handleSort('current_price')} className="sortable right">
                  Price
                </th>
                <th
                  onClick={() => handleSort('price_change_percentage_1h_in_currency')}
                  className="sortable right"
                >
                  1h
                </th>
                <th
                  onClick={() => handleSort('price_change_percentage_24h_in_currency')}
                  className="sortable right"
                >
                  24h
                </th>
                <th
                  onClick={() => handleSort('price_change_percentage_7d_in_currency')}
                  className="sortable right"
                >
                  7d
                </th>
                <th onClick={() => handleSort('total_volume')} className="sortable right">
                  Volume (24h)
                </th>
                <th onClick={() => handleSort('market_cap')} className="sortable right">
                  Market Cap
                </th>
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
                    <td
                      className={`right ${
                        coin.price_change_percentage_1h_in_currency >= 0 ? 'up' : 'down'
                      }`}
                    >
                      {formatPercent(coin.price_change_percentage_1h_in_currency)}
                    </td>
                    <td
                      className={`right ${
                        coin.price_change_percentage_24h_in_currency >= 0 ? 'up' : 'down'
                      }`}
                    >
                      {formatPercent(coin.price_change_percentage_24h_in_currency)}
                    </td>
                    <td
                      className={`right ${
                        coin.price_change_percentage_7d_in_currency >= 0 ? 'up' : 'down'
                      }`}
                    >
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

        {/* Pagination */}
        <div className="markets-pagination">
          {page > 1 && (
            <Link href={`/markets?page=${page - 1}`} className="pagination-btn">
              ← Previous
            </Link>
          )}
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/markets?page=${page + 1}`} className="pagination-btn">
              Next →
            </Link>
          )}
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps({ query }) {
  const page = Math.max(1, Math.min(10, parseInt(query.page) || 1))
  try {
    const [globalStats, coins] = await Promise.all([
      getGlobalStats(),
      getCoinsMarkets({ page, perPage: PER_PAGE }),
    ])
    return {
      props: {
        globalStats: globalStats || null,
        coins: coins || [],
        page,
        totalPages: 10,
      },
    }
  } catch (error) {
    console.error('Markets page error:', error)
    return {
      props: {
        globalStats: null,
        coins: [],
        page,
        totalPages: 10,
      },
    }
  }
}
