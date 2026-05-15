// pages/feed.xml.js
// RSS 2.0 feed for gmcrypto.news articles.
// Helps with: Google News inclusion, content aggregators (Feedly, Inoreader, etc.),
// power users who follow via RSS.
//
// Pattern mirrors pages/sitemap.xml.js — getServerSideProps writes XML directly
// and short-caches via s-maxage so we don't re-query Sanity on every reader poll.

import { client } from '../lib/sanity'

const SITE_URL = 'https://www.gmcrypto.news'
const FEED_TITLE = '[ gm crypto ] — Crypto News & Market Analysis'
const FEED_DESCRIPTION =
  'Daily crypto news, market analysis, and blockchain insights from gmcrypto.news.'
const FEED_LANGUAGE = 'en-us'

// How many recent posts to include. 30 is the RSS sweet spot — enough for
// readers that poll daily to never miss a post, small enough to keep payload light.
const POST_LIMIT = 30

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// CDATA wrapping is the standard way to embed prose in RSS without escaping
// every entity. We strip the literal "]]>" sequence first (the only thing
// that can break out of a CDATA block).
function cdata(str) {
  if (!str) return ''
  return `<![CDATA[${String(str).replace(/\]\]>/g, ']]&gt;')}]]>`
}

// RFC-822 date format (e.g., "Wed, 13 May 2026 12:00:00 GMT") — required by RSS 2.0.
function rfc822(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date()
  return d.toUTCString()
}

function generateRssFeed(posts) {
  const buildDate = rfc822(new Date())

  const items = posts
    .map(post => {
      const slug = post.slug?.current
      if (!slug) return ''
      const url = `${SITE_URL}/post/${slug}`
      const pubDate = rfc822(post.publishedAt)
      const title = escapeXml(post.title || 'Untitled')
      const description = cdata(post.excerpt || post.title || '')
      const author = post.authorName
        ? `<dc:creator>${cdata(post.authorName)}</dc:creator>`
        : ''
      const category = post.category
        ? `<category>${escapeXml(post.category)}</category>`
        : ''

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      ${author}
      ${category}
    </item>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>${FEED_LANGUAGE}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${SITE_URL}</link>
    </image>${items}
  </channel>
</rss>`
}

function RssFeed() { return null }

export async function getServerSideProps({ res }) {
  let posts = []
  try {
    posts = await client.fetch(
      `*[_type == "post" && defined(slug.current) && defined(publishedAt)]
        | order(publishedAt desc)[0...$limit] {
          title,
          slug,
          publishedAt,
          excerpt,
          category,
          "authorName": author->name
        }`,
      { limit: POST_LIMIT }
    )
  } catch (err) {
    console.error('RSS feed fetch error:', err)
  }

  const feed = generateRssFeed(posts || [])
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
  // Same caching strategy as the sitemap: 1 hour fresh, 6 hours stale-while-revalidate.
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600')
  res.write(feed)
  res.end()
  return { props: {} }
}

export default RssFeed
