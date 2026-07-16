// pages/sitemap.xml.js
// Main XML sitemap. Generated dynamically from Sanity data + static pages
// + top 30 coin detail pages.
//
// IMPORTANT: We list 30 coins, not 100. Listing 100 caused Googlebot to crawl
// faster than CoinGecko's Demo plan (~30 calls/min) could handle, leading to
// rate-limit cascades that cached 404s for valid coin pages. 30 covers ~95%
// of search volume safely.

import { client } from '../lib/sanity'

const SITE_URL = 'https://www.gmcrypto.news'

const STATIC_PAGES = [
  { path: '',              priority: 1.0, changefreq: 'hourly'  },
  { path: '/articles',     priority: 0.8, changefreq: 'daily'   },
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

// Top 30 coins by market cap — covers ~95% of search volume.
// Verified slugs that exist on CoinGecko's API.
const TOP_COIN_SLUGS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
  'ripple', 'usd-coin', 'dogecoin', 'cardano', 'tron',
  'avalanche-2', 'chainlink', 'polkadot', 'shiba-inu', 'polygon',
  'litecoin', 'bitcoin-cash', 'uniswap', 'kaspa', 'pepe',
  'near', 'aptos', 'internet-computer', 'monero', 'stellar',
  'ethereum-classic', 'cosmos', 'render-token', 'hedera-hashgraph', 'filecoin',
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

function generateSiteMap(posts, authorSlugs) {
  const today = new Date().toISOString().split('T')[0]

  const staticEntries = STATIC_PAGES.map(p => `
  <url>
    <loc>${SITE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('')

  const coinEntries = TOP_COIN_SLUGS.map(slug => `
  <url>
    <loc>${SITE_URL}/markets/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')

  const authorEntries = (authorSlugs || []).map(slug => {
    if (!slug) return ''
    return `
  <url>
    <loc>${SITE_URL}/author/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
  }).join('')

  const articleEntries = posts.map(post => {
    const slug = post.slug?.current
    if (!slug) return ''
    const lastmod = post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : new Date().toISOString()
    return `
  <url>
    <loc>${SITE_URL}/post/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${coinEntries}${authorEntries}${articleEntries}
</urlset>`
}

function SiteMap() { return null }

export async function getServerSideProps({ res }) {
  let posts = []
  let authorSlugs = []
  try {
    const [postsResult, authorsResult] = await Promise.all([
      client.fetch(`
        *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
          title, slug, publishedAt
        }
      `),
      client.fetch(`*[_type == "author" && defined(slug.current)]{ "slug": slug.current }`),
    ])
    posts = postsResult || []
    authorSlugs = (authorsResult || []).map(a => a.slug).filter(Boolean)
  } catch (err) {
    console.error('Sitemap fetch error:', err)
  }

  const sitemap = generateSiteMap(posts || [], authorSlugs)
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600')
  res.write(sitemap)
  res.end()
  return { props: {} }
}

export default SiteMap
