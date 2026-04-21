// pages/markets/[coin].js
import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { client, urlFor } from '../../lib/sanity'
import {
  getCoinDetails,
  getCoinTickers,
  formatPrice,
  formatBigNumber,
  formatPercent,
  formatSupply,
} from '../../lib/coingecko'

// Load chart only on client — lightweight-charts needs window
const CoinChart = dynamic(() => import('../../components/CoinChart'), {
  ssr: false,
  loading: () => <div className="coin-chart-loading" style={{ height: 420 }}>Loading chart…</div>,
})

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

export default function CoinPage({ coin, tickers, relatedArticles }) {
  const [showFullAbout, setShowFullAbout] = useState(false)

  if (!coin) {
    return (
      <>
        <Head>
          <title>Coin not found — GM Crypto News</title>
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
  const athDate = md.ath_date?.usd
  const atl = md.atl?.usd
  const atlChange = md.atl_change_percentage?.usd
  const atlDate = md.atl_date?.usd
  const circSupply = md.circulating_supply
  const totalSupply = md.total_supply
  const maxSupply = md.max_supply
  const rank = coin.market_cap_rank

  const description = stripHtml(coin.description?.en || '')
  const shortDesc = description.slice(0, 400)
  const hasMore = description.length > 400

  const homepage = coin.links?.homepage?.[0]
  const twitter = coin.links?.twitter_screen_name
  const reddit = coin.links?.subreddit_url
  const github = coin.links?.repos_url?.github?.[0]

  return (
    <>
      <Head>
        <title>{coin.name} ({coin.symbol?.toUpperCase()}) Price, Chart, Market Cap — GM Crypto News</title>
        <meta name="description" content={`${coin.name} live price, chart, market cap, and trading volume. ${shortDesc.slice(0, 120)}`} />
        <meta property="og:title" content={`${coin.name} (${coin.symbol?.toUpperCase()}) — GM Crypto News`} />
        <meta property="og:description" content={shortDesc.slice(0, 200)} />
        {coin.image?.large && (
          <meta property="og:image" content={coin.image.large} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <Ticker />
      <Navbar />

      <div className="coin-page">
        {/* Breadcrumbs */}
        <div className="coin-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>{coin.name}</span>
        </div>

        {/* Header */}
        <section className="coin-header">
          <div className="coin-header-top">
            <div className="coin-header-identity">
              {coin.image?.large && (
                <img src={coin.image.large} alt={coin.name} className="coin-header-img" />
              )}
              <div>
                <div className="coin-header-rank">#{rank} • {coin.categories?.[0] || 'Coin'}</div>
                <h1 className="coin-header-name">
                  {coin.name}
                  <span className="coin-header-symbol">{coin.symbol?.toUpperCase()}</span>
                </h1>
              </div>
            </div>

            <div className="coin-header-links">
              {homepage && (
                <a href={homepage} target="_blank" rel="noopener noreferrer" className="coin-link-btn">
                  Website ↗
                </a>
              )}
              {twitter && (
                <a href={`https://twitter.com/${twitter}`} target="_blank" rel="noopener noreferrer" className="coin-link-btn">
                  Twitter ↗
                </a>
              )}
              {github && (
                <a href={github} target="_blank" rel="noopener noreferrer" className="coin-link-btn">
                  GitHub ↗
                </a>
              )}
            </div>
          </div>

          <div className="coin-header-price">
            <div className="coin-price-value">{formatPrice(price)}</div>
            {change24h != null && (
              <div className={`coin-price-change ${change24h >= 0 ? 'up' : 'down'}`}>
                {formatPercent(change24h)} <span className="coin-price-change-label">(24h)</span>
              </div>
            )}
          </div>
        </section>

        {/* Chart */}
        <section className="coin-chart-section">
          <CoinChart coinId={coin.id} color="#FF6B00" />
        </section>

        {/* Stats grid */}
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
            <div className="coin-stat-value">{formatSupply(circSupply)} {coin.symbol?.toUpperCase()}</div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">Max Supply</div>
            <div className="coin-stat-value">
              {maxSupply ? `${formatSupply(maxSupply)} ${coin.symbol?.toUpperCase()}` : '∞'}
            </div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">All-Time High</div>
            <div className="coin-stat-value">{formatPrice(ath)}</div>
            {athChange != null && (
              <div className={`coin-stat-sub ${athChange >= 0 ? 'up' : 'down'}`}>
                {formatPercent(athChange)} from ATH
              </div>
            )}
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">All-Time Low</div>
            <div className="coin-stat-value">{formatPrice(atl)}</div>
            {atlChange != null && (
              <div className={`coin-stat-sub ${atlChange >= 0 ? 'up' : 'down'}`}>
                {formatPercent(atlChange)} from ATL
              </div>
            )}
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">7d Change</div>
            <div className={`coin-stat-value ${change7d >= 0 ? 'up' : 'down'}`}>
              {formatPercent(change7d)}
            </div>
          </div>
          <div className="coin-stat">
            <div className="coin-stat-label">30d Change</div>
            <div className={`coin-stat-value ${change30d >= 0 ? 'up' : 'down'}`}>
              {formatPercent(change30d)}
            </div>
          </div>
        </section>

        {/* About */}
        {description && (
          <section className="coin-about">
            <h2 className="coin-section-title">About {coin.name}</h2>
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

        {/* Related articles */}
        {relatedArticles && relatedArticles.length > 0 && (
          <section className="coin-related">
            <h2 className="coin-section-title">Latest {coin.name} News</h2>
            <div className="coin-related-grid">
              {relatedArticles.map((post) => (
                <Link
                  key={post._id}
                  href={`/post/${post.slug.current}`}
                  className="coin-related-card"
                >
                  {post.mainImage ? (
                    <img
                      src={urlFor(post.mainImage).width(400).height(220).url()}
                      alt={post.title}
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
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Top exchanges / markets */}
        {tickers && tickers.length > 0 && (
          <section className="coin-exchanges">
            <h2 className="coin-section-title">Top {coin.symbol?.toUpperCase()} Markets</h2>
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
                      <td>
                        {t.market?.name || '—'}
                      </td>
                      <td>
                        <span className="coin-pair">
                          {t.base}/{t.target}
                        </span>
                      </td>
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

export async function getServerSideProps({ params }) {
  try {
    const [coin, tickersData] = await Promise.all([
      getCoinDetails(params.coin),
      getCoinTickers(params.coin).catch(() => null),
    ])

    // Fetch related articles from Sanity — match by category or symbol
    const symbol = coin?.symbol?.toUpperCase()
    const name = coin?.name
    let relatedArticles = []

    try {
      if (symbol || name) {
        const query = `*[_type == "post" && (
          category match $symbol ||
          category match $name ||
          title match $symbol ||
          title match $name
        )] | order(publishedAt desc)[0...6] {
          _id, title, slug, mainImage, category, publishedAt, excerpt
        }`
        relatedArticles = await client.fetch(query, {
          symbol: `*${symbol}*`,
          name: `*${name}*`,
        })
      }
    } catch (err) {
      console.error('Related articles error:', err)
    }

    return {
      props: {
        coin: coin || null,
        tickers: tickersData?.tickers || [],
        relatedArticles: relatedArticles || [],
      },
    }
  } catch (error) {
    console.error('Coin page error:', error)
    return {
      props: { coin: null, tickers: [], relatedArticles: [] },
    }
  }
}
