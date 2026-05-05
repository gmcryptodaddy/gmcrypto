// pages/markets/[coin].js
// Coin detail page using ISR.
//
// CRITICAL: differentiates between two failure modes:
//   - CoinGecko returned 404 (coin truly doesn't exist) → cache notFound for 1 hour
//   - CoinGecko returned 429 / 5xx / network error → throw, Next.js returns 500
//     (which is NOT cached, so the next request retries fresh)
//
// This prevents the failure mode where rate-limit errors get cached as 404s
// and stick around forever.

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { CryptocurrencySchema, BreadcrumbSchema } from '../../components/StructuredData'
import { client, urlFor } from '../../lib/sanity'
import {
  getCoinDetails,
  getCoinTickers,
  formatPrice,
  formatBigNumber,
  formatPercent,
  formatSupply,
} from '../../lib/coingecko'

const SITE_URL = 'https://www.gmcrypto.news'

const CoinChart = dynamic(() => import('../../components/CoinChart'), {
  ssr: false,
  loading: () => <div className="coin-chart-loading" style={{ height: 420 }}>Loading chart…</div>,
})

function stripHtml(html) {
  if (!html) return ''
  return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 3600) {
    const m = Math.floor(diff / 60)
    return `${m}m ago`
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600)
    return `${h}h ago`
  }
  const d = Math.floor(diff / 86400)
  return `${d}d ago`
}

function buildMetaDescription(coin) {
  const md = coin.market_data || {}
  const price = md.current_price?.usd
  const change = md.price_change_percentage_24h
  const cap = md.market_cap?.usd
  const rank = coin.market_cap_rank
  const symbol = coin.symbol ? coin.symbol.toUpperCase() : ''
  const name = coin.name || 'Coin'

  const parts = []
  if (price) {
    parts.push(`${name} (${symbol}) price today: ${formatPrice(price)} USD`)
  } else {
    parts.push(`${name} (${symbol}) live price, chart, and market cap`)
  }
  if (change != null && !isNaN(change)) {
    const sign = change >= 0 ? '+' : ''
    parts.push(`${sign}${change.toFixed(2)}% (24h)`)
  }
  if (rank) parts.push(`Rank #${rank}`)
  if (cap) parts.push(`market cap ${formatBigNumber(cap)}`)
  return parts.join('. ') + '. Live charts, news, and analysis on GM Crypto News.'
}

function buildMetaTitle(coin) {
  const md = coin.market_data || {}
  const price = md.current_price?.usd
  const symbol = coin.symbol ? coin.symbol.toUpperCase() : ''
  const name = coin.name || 'Coin'
  if (price) {
    return `${name} (${symbol}) Price: ${formatPrice(price)} USD — Live Chart & News | GM Crypto`
  }
  return `${name} (${symbol}) Price, Chart, Market Cap — GM Crypto News`
}

export default function CoinPage({ coin, tickers, relatedArticles }) {
  const [showFullAbout, setShowFullAbout] = useState(false)

  if (!coin) {
    return (
      <>
        <Head>
          <title>Coin not found — GM Crypto News</title>
          <meta name="robots" content="noindex" />
        </Head>
        <Ticker />
        <Navbar />
        <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--text2)' }}>
          <h2>Coin not found</h2>
          <Link href="/markets" style={{ color: 'var(--text)', marginTop: 16, display: 'block', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            ← Back to markets
          </Link>
        </div>
        <Footer />
      </>
    )
  }

  const md = coin.market_data || {}
  const price = md.current_price?.usd
  const change24h = md.price_change_percentage_24h
  const change7d = md.price_change_percentage_7d
  const change30d = md.price_change_percentage_30d
  const marketCap = md.market_cap?.usd
  const volume = md.total_volume?.usd
  const ath = md.ath?.usd
  const athChange = md.ath_change_percentage?.usd
  const atl = md.atl?.usd
  const atlChange = md.atl_change_percentage?.usd
  const circSupply = md.circulating_supply
  const totalSupply = md.total_supply
  const maxSupply = md.max_supply
  const rank = coin.market_cap_rank
  const symbolUpper = coin.symbol ? coin.symbol.toUpperCase() : ''
  const coinName = coin.name || 'Coin'

  const description = stripHtml(coin.description?.en || '')
  const shortDesc = description.slice(0, 400)
  const hasMore = description.length > 400

  const homepage = coin.links?.homepage?.[0]
  const twitter = coin.links?.twitter_screen_name
  const github = coin.links?.repos_url?.github?.[0]

  const hasNews = Array.isArray(relatedArticles) && relatedArticles.length > 0
  const newsCategorySlug = `${coinName} News`

  const pageUrl = `${SITE_URL}/markets/${coin.id}`
  const metaTitle = buildMetaTitle(coin)
  const metaDescription = buildMetaDescription(coin)
  const ogImage = coin.image?.large || `${SITE_URL}/og-image.png`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Markets', url: `${SITE_URL}/markets` },
    { name: coinName, url: pageUrl },
  ]

  const isUp7d = typeof change7d === 'number' && change7d >= 0
  const isUp30d = typeof change30d === 'number' && change30d >= 0
  const isUp24h = typeof change24h === 'number' && change24h >= 0

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={`${coinName} logo`} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="GM Crypto News" />
        <meta property="og:locale" content="en_US" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@gm_cryptonews" />
      </Head>

      <CryptocurrencySchema coin={coin} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <Ticker />
      <Navbar />

      <div className="coin-page">
        <div className="coin-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>{coinName}</span>
        </div>

        <section className="coin-header">
          <div className="coin-header-top">
            <div className="coin-header-identity">
              {coin.image?.large && (
                <img src={coin.image.large} alt={`${coinName} logo`} className="coin-header-img" />
              )}
              <div>
                <div className="coin-header-rank">
                  {rank ? `#${rank}` : 'Coin'}
                  {coin.categories && coin.categories[0] ? ` • ${coin.categories[0]}` : ''}
                </div>
                <h1 className="coin-header-name">
                  {coinName}
                  {symbolUpper && <span className="coin-header-symbol">{symbolUpper}</span>}
                </h1>
              </div>
            </div>

            <div className="coin-header-links">
              {homepage && (
                <a href={homepage} target="_blank" rel="noopener noreferrer nofollow" className="coin-link-btn">Website ↗</a>
              )}
              {twitter && (
                <a href={`https://twitter.com/${twitter}`} target="_blank" rel="noopener noreferrer nofollow" className="coin-link-btn">Twitter ↗</a>
              )}
              {github && (
                <a href={github} target="_blank" rel="noopener noreferrer nofollow" className="coin-link-btn">GitHub ↗</a>
              )}
            </div>
          </div>

          <div className="coin-header-price">
            <div className="coin-price-value">{formatPrice(price)}</div>
            {typeof change24h === 'number' && (
              <div className={`coin-price-change ${isUp24h ? 'up' : 'down'}`}>
                {formatPercent(change24h)} <span className="coin-price-change-label">(24h)</span>
              </div>
            )}
          </div>
        </section>

        <section className="coin-chart-section">
          <CoinChart coinId={coin.id} color="#FF6B00" />
        </section>

        <section className="coin-stats-grid">
          <div className="coin-stat">
            <div className="coin-stat-label">Market Cap</div>
            <div className="coin-stat-value">{formatBigNumber(marketCap)}</div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">24h Volume</div>
            <div className="coin-stat-value">{formatBigNumber(volume)}</div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">Circulating Supply</div>
            <div className="coin-stat-value">{formatSupply(circSupply)} {symbolUpper}</div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">Max Supply</div>
            <div className="coin-stat-value">
              {maxSupply ? `${formatSupply(maxSupply)} ${symbolUpper}` : '∞'}
            </div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">All-Time High</div>
            <div className="coin-stat-value">{formatPrice(ath)}</div>
            {typeof athChange === 'number' && (
              <div className={`coin-stat-sub ${athChange >= 0 ? 'up' : 'down'}`}>
                {formatPercent(athChange)} from ATH
              </div>
            )}
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">All-Time Low</div>
            <div className="coin-stat-value">{formatPrice(atl)}</div>
            {typeof atlChange === 'number' && (
              <div className={`coin-stat-sub ${atlChange >= 0 ? 'up' : 'down'}`}>
                {formatPercent(atlChange)} from ATL
              </div>
            )}
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">7d Change</div>
            <div className={`coin-stat-value ${isUp7d ? 'up' : 'down'}`}>
              {formatPercent(change7d)}
            </div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">30d Change</div>
            <div className={`coin-stat-value ${isUp30d ? 'up' : 'down'}`}>
              {formatPercent(change30d)}
            </div>
          </div>
        </section>

        {hasNews && (
          <section className="coin-related">
            <div className="coin-related-header">
              <h2 className="coin-section-title">Latest {coinName} News</h2>
              <Link
                href={`/?category=${encodeURIComponent(newsCategorySlug)}`}
                className="coin-related-more"
              >
                View all →
              </Link>
            </div>
            <div className="coin-related-grid">
              {relatedArticles.map((post) => (
                <Link
                  key={post._id}
                  href={`/post/${post.slug?.current || ''}`}
                  className="coin-related-card"
                >
                  {post.mainImage ? (
                    <img
                      src={urlFor(post.mainImage).width(400).height(220).url()}
                      alt={post.title || ''}
                      className="coin-related-img"
                    />
                  ) : (
                    <div className="coin-related-img img-placeholder" style={{ height: 140 }}>
                      [ no image ]
                    </div>
                  )}
                  <div className="coin-related-body">
                    {post.category && (
                      <span className="coin-related-tag">{post.category}</span>
                    )}
                    <h3>{post.title}</h3>
                    <span className="coin-related-time">{timeAgo(post.publishedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {description && (
          <section className="coin-about">
            <h2 className="coin-section-title">About {coinName}</h2>
            <p className="coin-about-text">
              {showFullAbout ? description : shortDesc}
              {hasMore && !showFullAbout && '…'}
            </p>
            {hasMore && (
              <button
                className="coin-about-toggle"
                onClick={() => setShowFullAbout(!showFullAbout)}
              >
                {showFullAbout ? 'Show less' : 'Read more'}
              </button>
            )}
          </section>
        )}

        {Array.isArray(tickers) && tickers.length > 0 && (
          <section className="coin-exchanges">
            <h2 className="coin-section-title">Top {symbolUpper} Markets</h2>
            <div className="coin-exchanges-wrap">
              <table className="coin-exchanges-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Exchange</th>
                    <th>Pair</th>
                    <th className="right">Price</th>
                    <th className="right">Volume (24h)</th>
                    <th className="right">Trust</th>
                  </tr>
                </thead>
                <tbody>
                  {tickers.slice(0, 15).map((t, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{t.market?.name || '—'}</td>
                      <td><span className="coin-pair">{t.base || '?'}/{t.target || '?'}</span></td>
                      <td className="right">{formatPrice(t.converted_last?.usd)}</td>
                      <td className="right">{formatBigNumber(t.converted_volume?.usd)}</td>
                      <td className="right">
                        <span className={`trust-dot trust-${t.trust_score || 'unknown'}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  )
}

// --- ISR setup ---
export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps({ params }) {
  let coin = null
  let upstreamError = null

  try {
    coin = await getCoinDetails(params.coin)
  } catch (err) {
    // Capture the error so we can decide whether to cache notFound or throw
    upstreamError = err
  }

  // Decide what to do based on error type:
  //
  //   1. Got coin data → render normally, cache for 5 min.
  //   2. CoinGecko returned 404 (coin doesn't exist) → cache notFound for 1 hour.
  //      No reason to keep retrying for a slug that genuinely doesn't exist.
  //   3. Anything else (rate limit, network, 5xx) → THROW.
  //      Throwing means Next.js returns a 500 response which is NOT cached.
  //      The next request will try fresh — perfect for transient failures.
  //
  // The previous version cached notFound on ALL errors, which meant rate-limit
  // errors stuck around for the full revalidate window and crawlers saw 404s
  // for working coins.

  if (upstreamError) {
    const msg = upstreamError.message || ''
    const isRealNotFound = msg.includes('404') || msg.includes('not found')
    if (isRealNotFound) {
      return { notFound: true, revalidate: 3600 }
    }
    // Transient error — throw so Next.js returns a 500 (uncached).
    // Vercel serverless logs this for debugging.
    console.error(`Coin fetch transient error for ${params.coin}:`, msg)
    throw upstreamError
  }

  if (!coin || !coin.id) {
    return { notFound: true, revalidate: 3600 }
  }

  // Tickers and related articles are non-critical — never let them fail the page.
  let tickersData = null
  try {
    tickersData = await getCoinTickers(params.coin)
  } catch (err) {
    console.error(`Tickers fetch failed for ${params.coin}:`, err.message)
  }

  let relatedArticles = []
  try {
    const symbol = coin.symbol ? coin.symbol.toUpperCase() : null
    const name = coin.name
    if (name) {
      const useSymbol = symbol && symbol.length >= 3
      const query = useSymbol
        ? `*[_type == "post" && (
            title match $name ||
            title match $symbol ||
            category match $name ||
            category match $symbol ||
            excerpt match $name
          )] | order(publishedAt desc)[0...4] {
            _id, title, slug, mainImage, category, publishedAt, excerpt
          }`
        : `*[_type == "post" && (
            title match $name ||
            category match $name ||
            excerpt match $name
          )] | order(publishedAt desc)[0...4] {
            _id, title, slug, mainImage, category, publishedAt, excerpt
          }`

      const queryParams = useSymbol
        ? { name: `*${name}*`, symbol: `*${symbol}*` }
        : { name: `*${name}*` }

      relatedArticles = await client.fetch(query, queryParams)
    }
  } catch (err) {
    console.error('Related articles error:', err.message)
  }

  return {
    props: {
      coin,
      tickers: tickersData?.tickers || [],
      relatedArticles: Array.isArray(relatedArticles) ? relatedArticles : [],
    },
    revalidate: 300, // 5 minutes
  }
}
