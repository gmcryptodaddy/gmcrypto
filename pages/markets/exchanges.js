// pages/markets/exchanges.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import { getExchanges, getSimplePrice, formatBigNumber } from '../../lib/coingecko'

// Referral links override exchange default URLs for affiliated partners
const REFERRAL_LINKS = {
  binance: 'https://www.binance.com/register?ref=GMCRYPTONEWS',
  bybit_spot: 'https://www.bybit.com/invite?ref=X8GRAZ',
  bybit: 'https://www.bybit.com/invite?ref=X8GRAZ',
  okex: 'https://okx.com/join/26503312',
  okx: 'https://okx.com/join/26503312',
  hyperliquid: 'https://app.hyperliquid.xyz/join/CUTECAPITAL',
}

// Hyperliquid isn't in CoinGecko's /exchanges endpoint (it's a perps DEX),
// so we inject it manually.
const HYPERLIQUID_ENTRY = {
  id: 'hyperliquid',
  name: 'Hyperliquid',
  year_established: 2023,
  country: 'Decentralized',
  image: 'https://assets.coingecko.com/markets/images/1438/small/hyperliquid.png',
  trust_score: 10,
  trade_volume_24h_btc_normalized: null, // we'll fetch separately
  url: REFERRAL_LINKS.hyperliquid,
}

const PARTNER_IDS = new Set(['binance', 'bybit_spot', 'bybit', 'okex', 'okx', 'hyperliquid'])

export default function ExchangesPage({ exchanges, btcPriceUsd }) {
  return (
    <>
      <Head>
        <title>Top Crypto Exchanges — GM Crypto News</title>
        <meta name="description" content="Top cryptocurrency exchanges ranked by trust score and 24h trading volume." />
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
            The top cryptocurrency exchanges ranked by CoinGecko's trust score, with 24-hour trading volume.
          </p>
        </div>

        <div className="exchanges-grid">
          {exchanges.map((ex, i) => {
            const url = REFERRAL_LINKS[ex.id] || ex.url
            const isPartner = PARTNER_IDS.has(ex.id)
            // Convert normalized BTC volume to USD using live BTC price
            const volumeUsd = ex.trade_volume_24h_btc_normalized != null && btcPriceUsd
              ? ex.trade_volume_24h_btc_normalized * btcPriceUsd
              : null
            return (
              <a
                key={ex.id}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`exchange-card ${isPartner ? 'exchange-card-partner' : ''}`}
              >
                {isPartner && <div className="exchange-card-badge">Partner</div>}
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
                      {volumeUsd ? formatBigNumber(volumeUsd) : '—'}
                    </div>
                  </div>
                </div>
                <div className="exchange-card-visit">
                  {isPartner ? 'Sign up with GM →' : 'Visit exchange →'}
                </div>
              </a>
            )
          })}
        </div>

        <div className="converter-note">
          <strong>Disclaimer:</strong> Listings and rankings are based on CoinGecko data. Links marked "Partner" are referral links — we may receive a commission if you sign up through them, at no extra cost to you. This does not influence our rankings. Always do your own research. Not financial advice.
        </div>

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps() {
  try {
    const [exchanges, btcData] = await Promise.all([
      getExchanges({ perPage: 20, page: 1 }),
      getSimplePrice('bitcoin', 'usd').catch(() => null),
    ])
    const btcPriceUsd = btcData?.bitcoin?.usd || null

    // Inject Hyperliquid if not already in the list
    const list = exchanges || []
    const hasHyperliquid = list.some(e => e.id === 'hyperliquid')
    const finalList = hasHyperliquid ? list : [...list, HYPERLIQUID_ENTRY]

    return {
      props: {
        exchanges: finalList,
        btcPriceUsd,
      },
    }
  } catch (error) {
    console.error('Exchanges page error:', error)
    return { props: { exchanges: [], btcPriceUsd: null } }
  }
}
