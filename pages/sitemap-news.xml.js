// pages/sitemap-news.xml.js
// Google News sitemap — separate from the main sitemap so Google News
// crawlers can hit a lightweight feed of only recent articles.
// Per Google's spec, news sitemaps include articles published within
// the past 48 hours.

import { client } from '../lib/sanity'

const SITE_URL = 'https://www.gmcrypto.news'
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateNewsSitemap(posts) {
  const cutoff = Date.now() - TWO_DAYS_MS

  const valid = (posts || []).filter(p => p.publishedAt && p.slug?.current)

  const recent = valid.filter(p => new Date(p.publishedAt).getTime() >= cutoff)

  // Fallback: a Google News sitemap with zero <url> entries is reported as a
  // "Missing XML tag (url)" error in Search Console, and that error stays red
  // until a populated version is re-read. To keep the sitemap structurally
  // valid during quiet stretches (no posts in the last 48h), fall back to the
  // single most recent article. Google won't feature a >48h-old article in
  // News, so this doesn't game anything — it just prevents the empty-state
  // error. `valid` is already ordered newest-first by the GROQ query.
  const list = recent.length > 0 ? recent : valid.slice(0, 1)

  const entries = list.map(post => {
    const lastmod = new Date(post.publishedAt).toISOString()
    return `
  <url>
    <loc>${SITE_URL}/post/${post.slug.current}</loc>
    <news:news>
      <news:publication>
        <news:name>GM Crypto News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${lastmod}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${entries}
</urlset>`
}

function NewsSitemap() { return null }

export async function getServerSideProps({ res }) {
  let posts = []
  try {
    posts = await client.fetch(`
      *[_type == "post" && defined(slug.current) && defined(publishedAt)]
        | order(publishedAt desc)[0...100] {
        title, slug, publishedAt
      }
    `)
  } catch (err) {
    console.error('News sitemap error:', err)
  }

  const xml = generateNewsSitemap(posts || [])
  res.setHeader('Content-Type', 'application/xml')
  // Cache shorter than main sitemap — news content needs to refresh fast
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
  res.write(xml)
  res.end()
  return { props: {} }
}

export default NewsSitemap
