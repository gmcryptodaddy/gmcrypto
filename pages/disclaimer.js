// pages/disclaimer.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function DisclaimerPage() {
  return (
    <>
      <Head>
        <title>Disclaimer — GM Crypto News</title>
        <meta name="description" content="Editorial and financial disclaimer for GM Crypto News." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Disclaimer</span>
        </div>

        <h1 className="static-title">Disclaimer</h1>
        <p className="static-updated">Last updated: April 2026</p>

        <div className="static-body">
          <div className="static-warning">
            ⚠️ <strong>Not financial advice.</strong> Everything on this site is for informational purposes only. Always do your own research.
          </div>

          <h2>No investment advice</h2>
          <p>
            GM Crypto News provides news, analysis, and market data about cryptocurrencies, fintech, and traditional finance. None of our content constitutes financial, investment, legal, or tax advice. Cryptocurrency markets are volatile and investments carry significant risk, including the total loss of capital.
          </p>

          <h2>Do your own research</h2>
          <p>
            Before making any financial decision, consult a qualified financial advisor and conduct your own independent research. Past performance does not guarantee future results.
          </p>

          <h2>Market data accuracy</h2>
          <p>
            Price and market data displayed on gmcrypto.news is sourced from third-party providers (such as CoinGecko) and may be delayed, inaccurate, or incomplete. We do not guarantee the accuracy of any data shown on the site.
          </p>

          <h2>Editorial independence</h2>
          <p>
            Our writers operate independently. While we may discuss specific projects, tokens, or companies, this is never a recommendation to buy, sell, or hold any asset. Any sponsored or partnered content will be clearly labeled.
          </p>

          <h2>No guarantees</h2>
          <p>
            The information on gmcrypto.news is provided "as is" without warranties of any kind. We are not liable for any losses, damages, or consequences resulting from the use of our content or reliance on any information presented here.
          </p>

          <h2>Affiliate disclosure</h2>
          <p>
            Some links on this site may be affiliate links. We may receive a small commission if you make a purchase through these links — at no additional cost to you. This does not influence our editorial coverage.
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}
