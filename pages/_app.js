// pages/_app.js
import Head from 'next/head'
import '../styles/globals.css'
import { OrganizationSchema } from '../components/StructuredData'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover"
        />
        <meta name="theme-color" content="#000000" />
        {/* RSS auto-discovery — feed readers (Feedly, Inoreader, NetNewsWire, etc.)
            detect this tag and let users subscribe with one click from any page. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="[ gm crypto ] — Crypto News RSS Feed"
          href="https://www.gmcrypto.news/feed.xml"
        />
      </Head>
      {/* Organization schema on every page → knowledge panel eligibility */}
      <OrganizationSchema />
      <Component {...pageProps} />
    </>
  )
}
