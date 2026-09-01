// components/FutureNewsCard.js
// A single Future News card — used by both the homepage teaser
// and the /future-news page.

import { formatVolume, formatDeadline } from '../lib/polymarket'

export default function FutureNewsCard({ item }) {
  if (!item) return null

  const pct = Math.round(item.probability * 100)
  const deadlineLabel = formatDeadline(item.deadline)
  const volumeLabel = formatVolume(item.volume)

  // Color the probability by confidence tier
  const probClass =
    pct >= 90 ? 'prob-strong' :
    pct >= 80 ? 'prob-high' :
    'prob-mid'

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="fn-card"
    >
      <div className="fn-card-top">
        <div className="fn-card-tags">
          <span className="fn-card-cat">{item.category}</span>
          {deadlineLabel && (
            <span className="fn-card-deadline">{deadlineLabel}</span>
          )}
        </div>
        <span className="fn-card-volume">{volumeLabel} vol</span>
      </div>

      <h3 className="fn-card-headline">
        <span className="fn-card-prefix">{item.prefix}</span>{' '}
        {item.headline}
      </h3>

      <div className="fn-card-prob-row">
        <span className={`fn-card-prob ${probClass}`}>{pct}%</span>
        <div className="fn-card-bar">
          <div
            className={`fn-card-bar-fill ${probClass}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="fn-card-footer">
        <span className="fn-card-source">Source: Polymarket</span>
        <span className="fn-card-link">View market →</span>
      </div>
    </a>
  )
}
