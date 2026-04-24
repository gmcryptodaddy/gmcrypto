// pages/markets/losers.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import Sparkline from '../../components/Sparkline'
import {
  getTopMovers,
  formatPrice,
  formatBigNumber,
  formatPercent,
} from '../../lib/coingecko'

export default function LosersPage({ coins }) {
  return (
    <>
      <Head>
        <title>Top Crypto Losers (24h) — GM Crypto News</title>
        <meta name="description" content="Top cryptocurrency losers in the last 24 hours. Biggest price drops from the top 250 coins by market cap." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <div className="markets-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>Top Losers</span>
        </div>

        <div className="movers-hero">
          <div className="movers-hero-tag losers-tag">24h Losers</div>
          <h1 className="movers-hero-title">Top Crypto Losers</h1>
          <p className="movers-hero-sub">
            The biggest 24-hour price drops across the top 250 cryptocurrencies by market cap. Refreshed on each visit.
          </p>

          <div className="movers-tabs">
            <Link href="/markets/gainers" className="movers-tab">
              📈 Gainers
            </Link>
            <Link href="/markets/losers" className="movers-tab movers-tab-active">
              📉 Losers
            </Link>
            <Link href="/markets" className="movers-tab">
              All Prices
            </Link>
          </div>
        </div>

        <div className="markets-table-wrap">
          <table className="markets-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th className="coin-col">Coin</th>
                <th className="right">Price</th>
                <th className="right">24h %</th>
                <th className="right">Volume (24h)</th>
                <th className="right">Market Cap</th>
                <th className="right">Last 7 days</th>
              </tr>
            </thead>
            <tbody>
              {coins.map((coin, i) => {
                const sparkData = coin.sparkline_in_7d?.price || []
                const sparkPositive = sparkData.length > 1 && sparkData[sparkData.length - 1] >= sparkData[0]
                return (
                  <tr key={coin.id}>
                    <td className="rank">{i + 1}</td>
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
                    <td className="right down" style={{ fontWeight: 600 }}>
                      {formatPercent(coin.price_change_percentage_24h)}
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

        <Footer />
      </div>
    </>
  )
}

export async function getServerSideProps() {
  try {
    const coins = await getTopMovers({ direction: 'losers', limit: 50 })
    return { props: { coins: coins || [] } }
  } catch (error) {
    console.error('Losers page error:', error)
    return { props: { coins: [] } }
  }
}
