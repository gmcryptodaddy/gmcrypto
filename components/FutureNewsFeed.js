// components/FutureNewsFeed.js
// Homepage teaser — shows top 3 Future News cards in compact mode.
// Each card links to /future-news (not directly to Polymarket).

import Link from 'next/link'
import FutureNewsCard from './FutureNewsCard'

export default function FutureNewsFeed({ items }) {
  if (!items || items.length === 0) return null

  // Homepage is the brand surface — lead with crypto predictions when we have
  // them, and only fall back to the broader set if there are no crypto markets.
  const crypto = items.filter(i => i.category === 'Crypto')
  const top = (crypto.length > 0 ? crypto : items).slice(0, 3)

  return (
    <div className="fn-teaser">
      <div className="fn-teaser-header">
        <div className="fn-teaser-title-wrap">
          <span className="fn-teaser-icon">⟶</span>
          <span className="fn-teaser-title">Future News</span>
          <span className="fn-teaser-subtitle">What the crowd sees coming</span>
        </div>
        <Link href="/future-news" className="fn-teaser-viewall">
          View all →
        </Link>
      </div>

      <div className="fn-teaser-grid">
        {top.map(item => (
          <FutureNewsCard key={item.id} item={item} compact />
        ))}
      </div>
    </div>
  )
}
