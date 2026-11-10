// pages/markets/losers.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import MoversTable from '../../components/MoversTable'
import { getTopMovers } from '../../lib/coingecko'

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
            The biggest 24-hour price drops across the top 250 cryptocurrencies by market cap. Updated every few minutes.
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

        <MoversTable coins={coins} direction="losers" />

        <Footer />
      </div>
    </>
  )
}

export async function getStaticProps() {
  try {
    const coins = await getTopMovers({ direction: 'losers', limit: 50 })
    return { props: { coins: coins || [] }, revalidate: 300 }
  } catch (error) {
    console.error('Losers page error:', error)
    return { props: { coins: [] }, revalidate: 60 }
  }
}
