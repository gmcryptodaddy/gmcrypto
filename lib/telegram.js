// lib/telegram.js
// Fetches latest posts from the Telegram channel.
// Strategy: Try Bot API getUpdates first (catches recent posts),
// then fall back to t.me/s/ scraping (catches older posts).

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID
const CHANNEL_USERNAME = 'gmcryptofeed'
const MAX_POSTS = 8

/**
 * Main entry point. Returns array of { id, text, date, link }.
 * Returns [] on any error.
 */
export async function getTelegramFeed() {
  const [botPosts, scrapedPosts] = await Promise.all([
    fetchViaBotAPI().catch(() => []),
    fetchViaScraping().catch(() => []),
  ])

  // Merge: bot API posts are more reliable, scraped fills gaps
  const allPosts = [...botPosts]
  const seenIds = new Set(botPosts.map(p => p.id))

  for (const post of scrapedPosts) {
    if (!seenIds.has(post.id)) {
      allPosts.push(post)
      seenIds.add(post.id)
    }
  }

  // Sort by date descending
  allPosts.sort((a, b) => {
    if (!a.date || !b.date) return 0
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return allPosts.slice(0, MAX_POSTS)
}

/**
 * Cleans up post text
 */
function cleanText(text) {
  return text
    .replace(/\[gm\]/gi, '')
    .replace(/\[.*?gm.*?\]/gi, '')
    .replace(/https?:\/\/(www\.)?gmcrypto\.news\S*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/* ─── Bot API approach ──────────────────────────────────── */
async function fetchViaBotAPI() {
  if (!BOT_TOKEN || !CHANNEL_ID) return []

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?allowed_updates=["channel_post"]&limit=100&timeout=0`

  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  })

  if (!res.ok) return []

  const data = await res.json()
  if (!data.ok || !data.result) return []

  return data.result
    .filter(update => {
      const post = update.channel_post
      if (!post) return false
      if (String(post.chat?.id) !== String(CHANNEL_ID)) return false
      if (!post.text && !post.caption) return false
      return true
    })
    .map(update => {
      const post = update.channel_post
      const text = cleanText(post.text || post.caption || '')
      if (text.length < 5) return null

      return {
        id: `tg-${post.message_id}`,
        text,
        date: post.date ? new Date(post.date * 1000).toISOString() : null,
        link: `https://t.me/${CHANNEL_USERNAME}/${post.message_id}`,
      }
    })
    .filter(Boolean)
}

/* ─── t.me/s/ scraping approach ─────────────────────────── */
async function fetchViaScraping() {
  const url = `https://t.me/s/${CHANNEL_USERNAME}`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) return []

  const html = await res.text()
  if (!html.includes('tgme_widget_message_text')) return []

  const posts = []
  const messageRegex = /data-post="([^"]+)"[\s\S]*?class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?<time[^>]*datetime="([^"]+)"/g

  let match
  while ((match = messageRegex.exec(html)) !== null) {
    const [, postId, rawHtml, datetime] = match

    let text = rawHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim()

    text = cleanText(text)
    if (text.length < 5) continue

    const messageNum = postId.split('/').pop()

    posts.push({
      id: `tg-${messageNum}`,
      text,
      date: datetime || null,
      link: `https://t.me/${postId}`,
    })
  }

  return posts.slice(-MAX_POSTS).reverse()
}

/**
 * Formats a date string into relative time
 */
export function formatTelegramDate(dateStr) {
  if (!dateStr) return ''
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}
