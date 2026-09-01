// components/FutureNewsCard.js
// Reusable Future News card.
// Props:
//   item: normalized market data
//   compact (bool): if true, no source/link footer + smaller layout
//                   used by homepage teaser (whole card links to /future-news)
//   onClick: optional override for click behavior

import Link from 'next/link'
import { formatVolume, formatDeadline } from '../lib/polymarket'

export default function FutureNewsCard({ item, compact = false }) {
  if (!item) return null

  const pct = Math.round(item.probability * 100)
  const deadlineLabel = formatDeadline(item.deadline)
  const volumeLabel = formatVolume(item.volume)
  const isYes = item.isYesLeading

  // Sentiment class drives all color (percentage, bar, prefix)
  const sentimentClass = isYes ? 'fn-yes' : 'fn-no'

  const inner = (
    <>
      <div className="fn-card-top">
        <div className="fn-card-tags">
          <span className="fn-card-cat">{item.category}</span>
          {deadlineLabel && (
            <span className="fn-card-deadline">{deadlineLabel}</span>
          )}
        </div>
        <span className="fn-card-volume">{volumeLabel} vol</span>
      </div>

      <div className="fn-card-body">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="fn-card-img"
            loading="lazy"
          />
        )}
        <div className="fn-card-text">
          <div className={`fn-card-prefix ${sentimentClass}`}>
            {item.prefix}
          </div>
          <h3 className="fn-card-headline">{item.headline}</h3>
        </div>
      </div>

      <div className="fn-card-prob-row">
        <span className={`fn-card-prob ${sentimentClass}`}>{pct}%</span>
        <div className="fn-card-bar">
          <div
            className={`fn-card-bar-fill ${sentimentClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {!compact && (
        <div className="fn-card-footer">
          <span className="fn-card-source">Source: Polymarket</span>
          <span className="fn-card-link">View market →</span>
        </div>
      )}
    </>
  )

  // Compact = links to /future-news (internal)
  // Full = links to Polymarket (external)
  if (compact) {
    return (
      <Link href="/future-news" className={`fn-card fn-card-compact ${sentimentClass}`}>
        {inner}
      </Link>
    )
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fn-card ${sentimentClass}`}
    >
      {inner}
    </a>
  )
}
