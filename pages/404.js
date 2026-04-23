// pages/404.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found — GM Crypto News</title>
      </Head>

      <Ticker />
      <Navbar />

      <div className="notfound-page">
        <div className="notfound-inner">
          <div className="notfound-frog">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#FF6B00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="50" cy="55" rx="32" ry="28" />
              <circle cx="32" cy="28" r="11" />
              <circle cx="68" cy="28" r="11" />
              <circle cx="32" cy="28" r="3" fill="#FF6B00" />
              <circle cx="68" cy="28" r="3" fill="#FF6B00" />
              <path d="M 32 62 Q 50 74 68 62" />
              <circle cx="26" cy="58" r="1.5" fill="#FF6B00" />
              <circle cx="74" cy="58" r="1.5" fill="#FF6B00" />
            </svg>
          </div>

          <div className="notfound-code">404</div>
          <h1 className="notfound-title">This page went to the moon 🚀</h1>
          <p className="notfound-desc">
            We can't find what you're looking for. It might have been delisted, moved, or never existed.
          </p>

          <div className="notfound-cta">
            <Link href="/" className="static-cta-btn">
              Back to home
            </Link>
            <Link href="/markets" className="static-cta-btn static-cta-btn-outline">
              Check markets
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
