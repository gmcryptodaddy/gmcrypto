// pages/privacy.js
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy — GM Crypto News</title>
        <meta name="description" content="Privacy policy for GM Crypto News." />
      </Head>

      <Ticker />
      <Navbar />

      <div className="static-page">
        <div className="static-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Privacy</span>
        </div>

        <h1 className="static-title">Privacy Policy</h1>
        <p className="static-updated">Last updated: April 2026</p>

        <div className="static-body">
          <p>
            Your privacy matters. This policy explains what data we collect and how we use it.
          </p>

          <h2>1. Information we collect</h2>
          <p>
            When you visit gmcrypto.news, we may collect anonymous usage data such as page views, referrer, browser type, and device. If you subscribe to our newsletter, we collect your email address.
          </p>

          <h2>2. How we use your information</h2>
          <p>
            We use this data to improve our content, understand reader preferences, and send newsletters (if you subscribe). We do not sell or rent your personal information to third parties.
          </p>

          <h2>3. Cookies</h2>
          <p>
            We use cookies and similar technologies for essential site functionality and anonymous analytics. You can disable cookies in your browser settings, though some features may not work as expected.
          </p>

          <h2>4. Third-party services</h2>
          <p>
            We use services like CoinGecko for market data, Sanity for content management, and Vercel for hosting. These services may collect their own data subject to their privacy policies.
          </p>

          <h2>5. Newsletter</h2>
          <p>
            If you subscribe to our newsletter, you can unsubscribe at any time using the link in any email. We will not share your email with third parties.
          </p>

          <h2>6. Your rights</h2>
          <p>
            You have the right to request access to, correction of, or deletion of your personal data. Contact us via our social channels to exercise these rights.
          </p>

          <h2>7. Changes to this policy</h2>
          <p>
            We may update this policy occasionally. The "Last updated" date at the top reflects the most recent revision.
          </p>
        </div>
      </div>

      <Footer />
    </>
  )
}
