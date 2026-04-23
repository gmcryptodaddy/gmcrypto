// pages/terms.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms of Service — GM Crypto News</title>
        <meta name="description" content="Terms of service for GM Crypto News." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Terms</span>
        </div>

        <h1 className="static-title">Terms of Service</h1>
        <p className="static-updated">Last updated: April 2026</p>

        <div className="static-body">
          <p>
            Welcome to GM Crypto News ("gmcrypto.news", "we", "us", "our"). By accessing or using our website, you agree to be bound by these terms.
          </p>

          <h2>1. Use of the site</h2>
          <p>
            You may access and read the content on gmcrypto.news for personal, non-commercial use. You agree not to reproduce, distribute, or scrape our content without written permission.
          </p>

          <h2>2. No financial advice</h2>
          <p>
            All content on gmcrypto.news is for informational purposes only. Nothing on this site constitutes financial, investment, legal, or tax advice. Always do your own research and consult a qualified professional before making any financial decisions.
          </p>

          <h2>3. Accuracy & liability</h2>
          <p>
            We strive for accuracy but make no warranties about the completeness or reliability of our content. Market data is sourced from third parties (such as CoinGecko) and may be delayed or inaccurate. We are not liable for any losses resulting from the use of this information.
          </p>

          <h2>4. External links</h2>
          <p>
            Articles may link to third-party websites. We do not endorse and are not responsible for the content of those sites.
          </p>

          <h2>5. Intellectual property</h2>
          <p>
            All original content on gmcrypto.news — including articles, branding, and design — is owned by us. Reproduction without permission is prohibited.
          </p>

          <h2>6. Changes to terms</h2>
          <p>
            We may update these terms at any time. Continued use of the site after changes constitutes acceptance of the new terms.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions about these terms? Reach out via our social channels.
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}
