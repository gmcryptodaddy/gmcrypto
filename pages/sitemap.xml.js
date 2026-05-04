// pages/sitemap.xml.js
// Main XML sitemap. Generated dynamically from Sanity data + static pages
// + top 100 coin detail pages.
//
// The Google News sitemap lives separately at /sitemap-news.xml so news
// crawlers can hit a lightweight 48h-only feed. Robots.txt references both.

import { client } from '../lib/sanity'

const SITE_URL = 'https://www.gmcrypto.news'

const STATIC_PAGES = [
  { path: '',              priority: 1.0, changefreq: 'hourly'  },
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

// Top 100 coins by market cap — covers ~99% of search volume for coin pages.
// Static list to avoid hitting CoinGecko API for every sitemap regeneration.
// Update periodically as the market shifts; alternative is fetching live from
// CoinGecko but that risks rate limits + slow sitemap responses.
const TOP_COIN_SLUGS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'solana',
  'ripple', 'usd-coin', 'staked-ether', 'dogecoin', 'cardano',
  'tron', 'avalanche-2', 'chainlink', 'polkadot', 'wrapped-bitcoin',
  'shiba-inu', 'polygon', 'litecoin', 'bitcoin-cash', 'dai',
  'leo-token', 'uniswap', 'kaspa', 'pepe', 'near',
  'aptos', 'internet-computer', 'monero', 'fetch-ai', 'stellar',
  'ethereum-classic', 'cosmos', 'okb', 'render-token', 'crypto-com-chain',
  'hedera-hashgraph', 'filecoin', 'arbitrum', 'mantle', 'maker',
  'immutable-x', 'optimism', 'stacks', 'first-digital-usd', 'vechain',
  'kucoin-shares', 'theta-token', 'the-graph', 'sui', 'fantom',
  'injective-protocol', 'algorand', 'lido-dao', 'rocket-pool-eth', 'frax',
  'tezos', 'thorchain', 'celestia', 'eos', 'aave',
  'flow', 'sei-network', 'pancakeswap-token', 'rocket-pool', 'true-usd',
  'ordinals', 'havven', 'klaytn', 'gemini-dollar', 'iota',
  'bonk', 'jasmycoin', 'axie-infinity', 'gala', 'nervos-network',
  'neo', 'tellor', 'zcash', 'beam-2', 'kava',
  'wemix-token', 'akash-network', 'gatechain-token', 'osmosis', 'helium',
  'mina-protocol', 'pyth-network', 'curve-dao-token', 'jupiter-exchange-solana', '1inch',
  'huobi-token', 'dash', 'qtum', 'compound-governance-token', 'ravencoin',
  'enjincoin', 'ecash', 'gnosis', 'ondo-finance', 'hyperliquid',
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

  const coinEntries = TOP_COIN_SLUGS.map(slug => `
  <url>
    <loc>${SITE_URL}/markets/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.7</priority>
  </url>`).join('')

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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticEntries}${coinEntries}${articleEntries}
</urlset>`
}

function SiteMap() { return null }

export async function getServerSideProps({ res }) {
  let posts = []
  try {
    posts = await client.fetch(`
      *[_type == "post" && defined(slug.current)] | order(publishedAt desc) {
        title, slug, publishedAt
      }
    `)
  } catch (err) {
    console.error('Sitemap fetch error:', err)
  }

  const sitemap = generateSiteMap(posts || [])
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600')
  res.write(sitemap)
  res.end()
  return { props: {} }
}

export default SiteMap
