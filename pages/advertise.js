// pages/advertise.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function AdvertisePage() {
  return (
    <>
      <Head>
        <title>Advertise — GM Crypto News</title>
        <meta name="description" content="Advertising opportunities with GM Crypto News — coming soon." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Advertise</span>
        </div>

        <div className="coming-soon">
          <div className="coming-soon-tag">Coming Soon</div>
          <h1 className="coming-soon-title">Advertise with GM</h1>
          <p className="coming-soon-desc">
            We're building out advertising opportunities — sponsored posts, newsletter placements, banner partnerships, and more.
          </p>
          <p className="coming-soon-desc">
            Want to be first in line when we launch? Drop us a follow on X and stay tuned.
          </p>

          <div className="coming-soon-cta">
            <a href="https://twitter.com/gm_cryptonews" target="_blank" rel="noopener noreferrer" className="static-cta-btn">
              Follow on X →
            </a>
            <Link href="/" className="static-cta-btn static-cta-btn-outline">
              Back to home
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
