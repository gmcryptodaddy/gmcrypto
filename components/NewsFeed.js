// components/NewsFeed.js
// Displays latest Telegram channel posts as a compact news wire.

import { formatTelegramDate } from '../lib/telegram'

export default function NewsFeed({ posts }) {
  if (!posts || posts.length === 0) return null

  return (
    <div className="newsfeed">
      <div className="newsfeed-header">
        <div className="newsfeed-dot" />
        <span className="newsfeed-title">News Feed</span>
        <a
          href="https://t.me/gmcryptofeed"
          target="_blank"
          rel="noopener noreferrer"
          className="newsfeed-follow"
        >
          Follow on Telegram →
        </a>
      </div>

      <div className="newsfeed-list">
        {posts.map((post) => {
          // Show full text but cap at ~250 chars
          const lines = post.text.split('\n').filter(l => l.trim())
          const preview = lines.join(' · ')
          const truncated = preview.length > 250
            ? preview.slice(0, 250).trim() + '…'
            : preview

          return (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="newsfeed-item"
            >
              <div className="newsfeed-item-text">{truncated}</div>
              {post.date && (
                <span className="newsfeed-item-time">
                  {formatTelegramDate(post.date)}
                </span>
              )}
            </a>
          )
        })}
      </div>
    </div>
  )
}
