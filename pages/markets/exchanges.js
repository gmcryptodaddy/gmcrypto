// pages/markets/exchanges.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { getExchanges, formatBigNumber } from '../../lib/coingecko'

export default function ExchangesPage({ exchanges }) {
  return (
    <>
      <Head>
        <title>Top Crypto Exchanges — GM Crypto News</title>
        <meta name="description" content="Top 20 cryptocurrency exchanges ranked by trust score and 24h trading volume." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <div className="markets-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>Exchanges</span>
        </div>

        <div className="converter-header">
          <h1 className="converter-title">Top Crypto Exchanges</h1>
          <p className="converter-sub">
            The top 20 cryptocurrency exchanges ranked by CoinGecko's trust score, with 24-hour trading volume.
          </p>
        </div>

        <div className="exchanges-grid">
          {exchanges.map((ex, i) => (
            <a
              key={ex.id}
              href={ex.url}
              target="_blank"
              rel="noopener noreferrer"
              className="exchange-card"
            >
              <div className="exchange-card-rank">#{i + 1}</div>
              {ex.image && (
                <img src={ex.image} alt={ex.name} className="exchange-card-img" />
              )}
              <div className="exchange-card-name">{ex.name}</div>
              {ex.country && (
                <div className="exchange-card-country">{ex.country}</div>
              )}
              <div className="exchange-card-stats">
                <div className="exchange-stat">
                  <div className="exchange-stat-label">Trust</div>
                  <div className="exchange-stat-value">
                    <span className={`trust-dot trust-${ex.trust_score >= 8 ? 'green' : ex.trust_score >= 5 ? 'yellow' : 'red'}`} />
                    <span style={{ marginLeft: 6 }}>{ex.trust_score ?? '—'}/10</span>
                  </div>
                </div>
                <div className="exchange-stat">
                  <div className="exchange-stat-label">Volume 24h</div>
                  <div className="exchange-stat-value">
                    {formatBigNumber(ex.trade_volume_24h_btc_normalized * 70000)}
                  </div>
                </div>
              </div>
              <div className="exchange-card-visit">Visit exchange →</div>
            </a>
          ))}
        </div>

        <div className="converter-note">
          <strong>Disclaimer:</strong> Listings and rankings are based on CoinGecko data and do not constitute an endorsement or recommendation. Always do your own research before using any exchange. Not financial advice.
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps() {
  try {
    const exchanges = await getExchanges({ perPage: 20, page: 1 })
    return { props: { exchanges: exchanges || [] } }
  } catch (error) {
    console.error('Exchanges page error:', error)
    return { props: { exchanges: [] } }
  }
}
