// pages/learn.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function LearnPage() {
  return (
    <>
      <Head>
        <title>Learn — GM Crypto News</title>
        <meta name="description" content="Learn about crypto, blockchain, DeFi, and more — coming soon to GM Crypto News." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Learn</span>
        </div>

        <div className="coming-soon">
          <div className="coming-soon-tag">Coming Soon</div>
          <h1 className="coming-soon-title">Learn Crypto</h1>
          <p className="coming-soon-desc">
            We're building a full education section — beginner guides, explainers, deep dives into DeFi, on-chain analysis, trading fundamentals, and more.
          </p>
          <p className="coming-soon-desc">
            No fluff. No moonboy takes. Just clear, practical knowledge to help you navigate crypto with confidence.
          </p>

          <div className="learn-preview-pills">
            <span className="static-pill">What is Bitcoin?</span>
            <span className="static-pill">DeFi Explained</span>
            <span className="static-pill">Reading Charts</span>
            <span className="static-pill">Wallet Security</span>
            <span className="static-pill">On-Chain Analysis</span>
            <span className="static-pill">Staking & Yield</span>
          </div>

          <div className="coming-soon-cta">
            <a href="https://x.com/gm_cryptonews" target="_blank" rel="noopener noreferrer" className="static-cta-btn">
              Follow for updates →
            </a>
            <Link href="/" className="static-cta-btn static-cta-btn-outline">
              Read latest news
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
