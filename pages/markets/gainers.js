// pages/markets/gainers.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../../components/Navbar'
import Ticker from '../../components/Ticker'
import Footer from '../../components/Footer'
import MoversTable from '../../components/MoversTable'
import { getTopMovers } from '../../lib/coingecko'

export default function GainersPage({ coins }) {
  return (
    <>
      <Head>
        <title>Top Crypto Gainers (24h) — GM Crypto News</title>
        <meta name="description" content="Top cryptocurrency gainers in the last 24 hours. Biggest price increases from the top 250 coins by market cap." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="markets-page">
        <div className="markets-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/markets">Markets</Link>
          <span className="sep">/</span>
          <span>Top Gainers</span>
        </div>

        <div className="movers-hero">
          <div className="movers-hero-tag gainers-tag">24h Gainers</div>
          <h1 className="movers-hero-title">Top Crypto Gainers</h1>
          <p className="movers-hero-sub">
            The biggest 24-hour price increases across the top 250 cryptocurrencies by market cap. Updated every few minutes.
          </p>

          <div className="movers-tabs">
            <Link href="/markets/gainers" className="movers-tab movers-tab-active">
              📈 Gainers
            </Link>
            <Link href="/markets/losers" className="movers-tab">
              📉 Losers
            </Link>
            <Link href="/markets" className="movers-tab">
              All Prices
            </Link>
          </div>
        </div>

        <MoversTable coins={coins} direction="gainers" />

        <Footer />
      </div>
    </>
  )
}

export async function getStaticProps() {
  try {
    const coins = await getTopMovers({ direction: 'gainers', limit: 50 })
    return { props: { coins: coins || [] }, revalidate: 300 }
  } catch (error) {
    console.error('Gainers page error:', error)
    return { props: { coins: [] }, revalidate: 60 }
  }
}
