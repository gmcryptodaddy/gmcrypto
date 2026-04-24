// pages/about.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'
import SocialIcons from '../components/SocialIcons'

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About — GM Crypto News</title>
        <meta name="description" content="GM Crypto News [gm] is a digital publication covering cryptocurrency, fintech, and traditional finance. Clear, timely news and analysis." />
        <meta property="og:title" content="About — GM Crypto News" />
        <meta property="og:description" content="GM Crypto News [gm] is a digital publication covering cryptocurrency, fintech, and traditional finance." />
        <meta property="og:image" content="https://www.gmcrypto.news/og-image.png" />
        <meta property="og:url" content="https://www.gmcrypto.news/about" />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>About</span>
        </div>

        <h1 className="static-title">About GM Crypto News</h1>

        <div className="static-body">
          <p className="static-lead">
            <strong>GM Crypto News [gm]</strong> is a digital publication covering the latest in cryptocurrency, fintech, and traditional finance.
          </p>

          <p>
            We deliver clear, timely news, market insights, and analysis that help you stay ahead in a rapidly evolving financial landscape. From blockchain innovation to global economic trends, [gm] connects the stories shaping the future of finance.
          </p>

          <div className="static-divider" />

          <h2>What we cover</h2>
          <div className="static-pills">
            <span className="static-pill">Breaking News</span>
            <span className="static-pill">Market Analysis</span>
            <span className="static-pill">DeFi</span>
            <span className="static-pill">Policy & Regulation</span>
            <span className="static-pill">TradFi</span>
            <span className="static-pill">Tech</span>
            <span className="static-pill">Security</span>
            <span className="static-pill">Web3</span>
          </div>

          <h2>No hype. Just signal.</h2>
          <p>
            The crypto space is noisy. We focus on what matters — real developments, real data, real context. No shilling, no moonboy takes, no misleading headlines.
          </p>

          <div className="static-divider" />

          <h2>Follow along</h2>
          <p>
            Get our latest stories, market takes, and breaking news straight to your feed.
          </p>
          <div className="about-socials">
            <SocialIcons size="lg" />
          </div>

          <div className="static-cta-row">
            <Link href="/" className="static-cta-btn">Read the latest →</Link>
            <Link href="/markets" className="static-cta-btn static-cta-btn-outline">Explore markets →</Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}
