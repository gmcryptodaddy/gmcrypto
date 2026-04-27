// lib/telegram.js
// Scrapes the latest posts from a public Telegram channel
// using the t.me/s/ public web preview.

const CHANNEL = 'gmcryptofeed'
const TELEGRAM_URL = `https://t.me/s/${CHANNEL}`
const MAX_POSTS = 5

/**
 * Fetches and parses latest posts from the public Telegram channel preview.
 * Returns an array of { id, text, date, link }.
 * Returns [] on any error (fails gracefully).
 */
export async function getTelegramFeed() {
  try {
    const res = await fetch(TELEGRAM_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // Next.js fetch cache — revalidate in getStaticProps
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.error(`Telegram fetch failed: ${res.status}`)
      return []
    }

    const html = await res.text()
    return parseTelegramHTML(html)
  } catch (err) {
    console.error('Telegram feed error:', err)
    return []
  }
}

/**
 * Parses the raw HTML from t.me/s/channel into structured posts.
 */
function parseTelegramHTML(html) {
  const posts = []

  // Each message is in a .tgme_widget_message_wrap container.
  // We use regex because we're in Node.js without a DOM parser.
  // Match each message bubble block.
  const messageBlocks = html.match(
    /class="tgme_widget_message_wrap[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g
  )

  if (!messageBlocks || messageBlocks.length === 0) {
    console.warn('No Telegram messages found in HTML')
    return []
  }

  for (const block of messageBlocks) {
    // Extract message ID from data-post attribute
    const postMatch = block.match(/data-post="([^"]+)"/)
    const postId = postMatch ? postMatch[1] : null

    // Extract text content from .tgme_widget_message_text
    const textMatch = block.match(
      /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/
    )
    let text = ''
    if (textMatch) {
      text = textMatch[1]
        // Remove <a> tags that are just the [gm] branding link
        .replace(/<a[^>]*>.*?\[gm\].*?<\/a>/gi, '')
        // Convert <br> to newlines
        .replace(/<br\s*\/?>/gi, '\n')
        // Remove remaining HTML tags
        .replace(/<[^>]+>/g, '')
        // Clean up whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    }

    // Skip empty messages or ones that are just the [gm] tag
    if (!text || text.length < 5) continue

    // Extract datetime from the time element
    const dateMatch = block.match(/datetime="([^"]+)"/)
    const date = dateMatch ? dateMatch[1] : null

    // Build the direct link to the Telegram post
    const link = postId
      ? `https://t.me/${postId}`
      : `https://t.me/${CHANNEL}`

    posts.push({
      id: postId || `tg-${posts.length}`,
      text,
      date,
      link,
    })
  }

  // Return only the latest MAX_POSTS, most recent first
  return posts.slice(-MAX_POSTS).reverse()
}

/**
 * Formats a date string into relative time (e.g., "2h ago")
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
