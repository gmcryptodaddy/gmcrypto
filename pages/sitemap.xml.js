// pages/sitemap.xml.js
// Dynamic XML sitemap for SEO. Generated on each request from Sanity data
// + static pages. Cached at the edge for 1 hour.

import { client } from '../lib/sanity'

const SITE_URL = 'https://www.gmcrypto.news'

// Static pages with relative priority (0.0–1.0) and change frequency.
// Priority is a hint to Google about which pages matter most relative to
// other pages on YOUR site.
const STATIC_PAGES = [
  { path: '',              priority: 1.0, changefreq: 'hourly'  }, // homepage
  { path: '/markets',      priority: 0.9, changefreq: 'hourly'  },
  { path: '/markets/gainers',   priority: 0.7, changefreq: 'hourly' },
  { path: '/markets/losers',    priority: 0.7, changefreq: 'hourly' },
  { path: '/markets/converter', priority: 0.6, changefreq: 'weekly' },
  { path: '/markets/exchanges', priority: 0.6, changefreq: 'daily'  },
  { path: '/learn',        priority: 0.5, changefreq: 'weekly'  },
  { path: '/about',        priority: 0.4, changefreq: 'monthly' },
  { path: '/advertise',    priority: 0.3, changefreq: 'monthly' },
  { path: '/terms',        priority: 0.2, changefreq: 'yearly'  },
  { path: '/privacy',      priority: 0.2, changefreq: 'yearly'  },
  { path: '/disclaimer',   priority: 0.2, changefreq: 'yearly'  },
]

// Top coins to include in sitemap (matches your /markets/[coin] pages).
// Pulling top 100 from CoinGecko in the sitemap would be heavy and most
// of those tail pages won't have unique content yet — so we list the
// big ones explicitly. You can grow this list over time.
const COIN_SLUGS = [
  'bitcoin', 'ethereum', 'solana', 'binancecoin', 'ripple',
  'cardano', 'avalanche-2', 'dogecoin', 'tron', 'chainlink',
  'polkadot', 'polygon', 'litecoin', 'shiba-inu', 'uniswap',
]

function escapeXml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateSiteMap(posts) {
  const today = new Date().toISOString().split('T')[0]

  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')

  const coinEntries = COIN_SLUGS.map(slug => `
  <url>
    <loc>${SITE_URL}/markets/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')

  // Article entries with news:news block — eligible for Google News
  const articleEntries = posts.map(post => {
    const slug = post.slug?.current
    if (!slug) return ''
    const lastmod = post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : new Date().toISOString()
    const isRecent = post.publishedAt &&
      (Date.now() - new Date(post.publishedAt).getTime()) < 2 * 24 * 60 * 60 * 1000

    return `
  <url>
    <loc>${SITE_URL}/post/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${isRecent ? `
    <news:news>
      <news:publication>
        <news:name>GM Crypto News</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${lastmod}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>` : ''}
  </url>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${staticEntries}${coinEntries}${articleEntries}
</urlset>`
}

// SiteMap component itself never renders — getServerSideProps handles the response
function SiteMap() { return null }

export async function getServerSideProps({ res }) {
  let posts = []
  try {
    posts = await client.fetch(`
      *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
        title,
        slug,
        publishedAt
      }
    `)
  } catch (err) {
    console.error('Sitemap fetch error:', err)
  }

  const sitemap = generateSiteMap(posts || [])

  res.setHeader('Content-Type', 'application/xml')
  // Cache for 1 hour at the edge, allow 6 hours stale-while-revalidate
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600')
  res.write(sitemap)
  res.end()

  return { props: {} }
}

export default SiteMap
