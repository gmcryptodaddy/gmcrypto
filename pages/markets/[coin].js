// pages/markets/[coin].js
//
// Architecture:
//   - Static data (description, links, logo, ATH/ATL, supply) comes from
//     public/coins-snapshot.json — built weekly by scripts/snapshot-coins.js.
//     Zero CoinGecko calls per page view. Pages always render.
//   - Live price + 24h change is fetched client-side from /api/coin-price
//     using CoinGecko's lightweight /simple/price endpoint. ~30s refresh.
//   - Chart is a TradingView widget — zero CoinGecko API hit.
//
// Result:
//   - Coin pages always work, never rate-limited
//   - Charts are professional + free
//   - We use ~1 cheap CoinGecko call per coin page view (just for live price)
//
// Coins in snapshot but not on Binance: TradingView chart shows "symbol not
// found." Fixable by adding overrides in components/TradingViewChart.js
//
// Coins NOT in snapshot (outside top 1000 by market cap): page returns 404.
// Snapshot refreshes weekly; new top-1000 coins appear within a week.

import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { CryptocurrencySchema, BreadcrumbSchema } from '../../components/StructuredData'
import { client, urlFor } from '../../lib/sanity'
import { getCoinFromSnapshot } from '../../lib/coin-snapshot'
import {
  formatPrice,
  formatBigNumber,
  formatPercent,
  formatSupply,
} from '../../lib/coingecko'

const SITE_URL = 'https://www.gmcrypto.news'

// TradingView widget loads dynamically (client-side only)
const TradingViewChart = dynamic(() => import('../../components/TradingViewChart'), {
  ssr: false,
  loading: () => <div className="coin-chart-loading" style={{ height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading chart…</div>,
})

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

function buildMetaDescription(coin, livePrice, liveChange) {
  const symbol = coin.symbol ? coin.symbol.toUpperCase() : ''
  const name = coin.name || 'Coin'
  const rank = coin.market_cap_rank
  const parts = []
  if (livePrice) {
    parts.push(`${name} (${symbol}) price today: ${formatPrice(livePrice)} USD`)
  } else {
    parts.push(`${name} (${symbol}) live price, chart, and market cap`)
  }
  if (liveChange != null && !isNaN(liveChange)) {
    const sign = liveChange >= 0 ? '+' : ''
    parts.push(`${sign}${liveChange.toFixed(2)}% (24h)`)
  }
  if (rank) parts.push(`Rank #${rank}`)
  return parts.join('. ') + '. Live charts, news, and analysis on GM Crypto News.'
}

function buildMetaTitle(coin, livePrice) {
  const symbol = coin.symbol ? coin.symbol.toUpperCase() : ''
  const name = coin.name || 'Coin'
  if (livePrice) {
    return `${name} (${symbol}) Price: ${formatPrice(livePrice)} USD — Live Chart & News | GM Crypto`
  }
  return `${name} (${symbol}) Price, Chart, Market Cap — GM Crypto News`
}

export default function CoinPage({ coin, relatedArticles }) {
  // Live price state — fetched client-side
  const [livePrice, setLivePrice] = useState(null)
  const [liveChange, setLiveChange] = useState(null)
  const [liveMarketCap, setLiveMarketCap] = useState(null)
  const [liveVolume, setLiveVolume] = useState(null)
  const [priceLoading, setPriceLoading] = useState(true)

  const [showFullAbout, setShowFullAbout] = useState(false)

  // Fetch live price on mount, then refresh every 30s while page is open
  useEffect(() => {
    if (!coin?.id) return

    let cancelled = false
    let intervalId = null

    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/coin-price?ids=${encodeURIComponent(coin.id)}`)
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const priceData = data?.[coin.id]
        if (priceData) {
          setLivePrice(priceData.usd ?? null)
          setLiveChange(priceData.usd_24h_change ?? null)
          setLiveMarketCap(priceData.usd_market_cap ?? null)
          setLiveVolume(priceData.usd_24h_vol ?? null)
        }
        setPriceLoading(false)
      } catch (err) {
        // Silent fail — page still works without live price
        setPriceLoading(false)
      }
    }

    fetchPrice()
    intervalId = setInterval(fetchPrice, 30000) // refresh every 30s

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [coin?.id])

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

  // Static data from snapshot
  const md = coin.market_data || {}
  const ath = md.ath_usd
  const athChange = md.ath_change_percentage_usd
  const atl = md.atl_usd
  const atlChange = md.atl_change_percentage_usd
  const circSupply = md.circulating_supply
  const totalSupply = md.total_supply
  const maxSupply = md.max_supply
  const rank = coin.market_cap_rank
  const symbolUpper = coin.symbol ? coin.symbol.toUpperCase() : ''
  const coinName = coin.name || 'Coin'

  const description = (coin.description_en || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  const shortDesc = description.slice(0, 400)
  const hasMore = description.length > 400

  const homepage = coin.links?.homepage
  const twitter = coin.links?.twitter_screen_name
  const github = coin.links?.github

  const hasNews = Array.isArray(relatedArticles) && relatedArticles.length > 0
  const newsCategorySlug = `${coinName} News`

  const pageUrl = `${SITE_URL}/markets/${coin.id}`
  const metaTitle = buildMetaTitle(coin, livePrice)
  const metaDescription = buildMetaDescription(coin, livePrice, liveChange)
  const ogImage = coin.image || `${SITE_URL}/og-image.png`

  const breadcrumbItems = [
    { name: 'Home', url: SITE_URL },
    { name: 'Markets', url: `${SITE_URL}/markets` },
    { name: coinName, url: pageUrl },
  ]

  const isUp24h = typeof liveChange === 'number' && liveChange >= 0

  // Build coin object for schema (combines static + live data)
  const schemaCoin = {
    ...coin,
    image: { large: coin.image },
    market_cap_rank: rank,
    market_data: {
      current_price: livePrice ? { usd: livePrice } : undefined,
    },
    description: { en: description },
  }

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

      <CryptocurrencySchema coin={schemaCoin} />
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
              {coin.image && (
                <img src={coin.image} alt={`${coinName} logo`} className="coin-header-img" />
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
            <div className="coin-price-value">
              {livePrice != null ? formatPrice(livePrice) : (priceLoading ? '…' : '—')}
            </div>
            {typeof liveChange === 'number' && (
              <div className={`coin-price-change ${isUp24h ? 'up' : 'down'}`}>
                {formatPercent(liveChange)} <span className="coin-price-change-label">(24h)</span>
              </div>
            )}
          </div>
        </section>

        <section className="coin-chart-section">
          <TradingViewChart symbol={symbolUpper} coinName={coinName} />
        </section>

        <section className="coin-stats-grid">
          <div className="coin-stat">
            <div className="coin-stat-label">Market Cap</div>
            <div className="coin-stat-value">{formatBigNumber(liveMarketCap)}</div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">24h Volume</div>
            <div className="coin-stat-value">{formatBigNumber(liveVolume)}</div>
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
            <div className="coin-stat-label">Total Supply</div>
            <div className="coin-stat-value">
              {totalSupply ? `${formatSupply(totalSupply)} ${symbolUpper}` : '—'}
            </div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">Rank</div>
            <div className="coin-stat-value">{rank ? `#${rank}` : '—'}</div>
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

        <Footer />
      </div>
    </>
  )
}

export async function getStaticPaths() {
  return {
    paths: [],
    fallback: 'blocking',
  }
}

export async function getStaticProps({ params }) {
  const slug = params.coin
  const coin = getCoinFromSnapshot(slug)

  if (!coin) {
    // Coin not in our snapshot. Either it's outside top 1000 or doesn't exist.
    // Cache the not-found for 1 hour — snapshot refreshes weekly so a new
    // top-1000 coin will appear within a week.
    return { notFound: true, revalidate: 3600 }
  }

  // Fetch related articles from Sanity (best-effort, never fails the page)
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
    console.warn(`Related articles failed for ${slug}: ${err.message}`)
  }

  return {
    props: {
      coin,
      relatedArticles: Array.isArray(relatedArticles) ? relatedArticles : [],
    },
    // Snapshot refreshes weekly via GitHub Action. Revalidate every hour
    // so deployed app picks up new snapshot within an hour after push.
    revalidate: 3600,
  }
}
