// pages/future-news.js
// Dedicated Future News page — full list of 15-20 cards, category filter.

import { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import Navbar from '../components/Navbar'
import Ticker from '../components/Ticker'
import Footer from '../components/Footer'
import FutureNewsCard from '../components/FutureNewsCard'
import { getPolymarketFeed, extractCategories } from '../lib/polymarket'

export default function FutureNewsPage({ items, categories }) {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? items
    : items.filter(i => i.category === activeCategory)

  return (
    <>
      <Head>
        <title>Future News — GM Crypto News</title>
        <meta name="description" content="Forward-looking news powered by prediction markets. What the crowd expects to happen next in crypto, policy, tech, and beyond." />

        <meta property="og:title" content="Future News — GM Crypto News" />
        <meta property="og:description" content="Forward-looking news powered by prediction markets. What the crowd sees coming." />
        <meta property="og:image" content="https://www.gmcrypto.news/og-image.png" />
        <meta property="og:url" content="https://www.gmcrypto.news/future-news" />
        <meta property="og:type" content="website" />
      </Head>

      <Ticker />
      <Navbar />

      <div className="fn-page">
        <div className="fn-page-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Future News</span>
        </div>

        <div className="fn-page-hero">
          <h1 className="fn-page-title">Future News</h1>
          <p className="fn-page-desc">
            Forward-looking signals from prediction markets. When enough capital moves the same way, that's news. We surface only the strongest signals — 75%+ probability with real trading volume behind them.
          </p>
          <div className="fn-page-meta">
            <span className="fn-page-meta-item">
              <span className="fn-page-meta-dot" /> Live from Polymarket
            </span>
            <span className="fn-page-meta-item">
              {items.length} active predictions
            </span>
            <span className="fn-page-meta-item">
              Updated every 5 min
            </span>
          </div>
        </div>

        {categories.length > 1 && (
          <div className="fn-page-filters">
            <button
              className={`fn-filter-pill ${activeCategory === 'All' ? 'fn-filter-active' : ''}`}
              onClick={() => setActiveCategory('All')}
            >
              All ({items.length})
            </button>
            {categories.map(cat => {
              const count = items.filter(i => i.category === cat).length
              return (
                <button
                  key={cat}
                  className={`fn-filter-pill ${activeCategory === cat ? 'fn-filter-active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="fn-page-grid">
            {filtered.map(item => (
              <FutureNewsCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="fn-page-empty">
            <p className="fn-page-empty-title">No strong signals right now</p>
            <p className="fn-page-empty-desc">
              Check back soon — the crowd is still deciding.
            </p>
          </div>
        )}

        <div className="fn-page-disclaimer">
          <strong>Note:</strong> Future News reflects real-money bets on Polymarket, not predictions or endorsements from GM Crypto. Prediction markets can be wrong. Do your own research.
        </div>
      </div>

      <Footer />
    </>
  )
}

export async function getStaticProps() {
  try {
    const items = await getPolymarketFeed()
    const categories = extractCategories(items)
    return {
      props: {
        items: items || [],
        categories: categories || [],
      },
      revalidate: 300,
    }
  } catch (error) {
    console.error('Future News page error:', error)
    return {
      props: { items: [], categories: [] },
      revalidate: 60,
    }
  }
}
