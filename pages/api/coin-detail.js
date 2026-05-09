// pages/api/coin-detail.js
//
// Returns full coin data (snapshot format) for one coin.
// Used by [coin].js placeholder page when snapshot + live fetch both failed
// at build time. Client retries via this endpoint with backoff.
//
// Has its own caching layer so repeated client retries don't hammer CoinGecko.

const cache = new Map()
const FRESH_MS = 5 * 60 * 1000      // 5 min
const STALE_MS = 60 * 60 * 1000     // 1 hr fallback

async function fetchFromCoinGecko(slug) {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(slug)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  const headers = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}`)
    err.status = res.status
    throw err
  }
  const coin = await res.json()
  if (!coin || !coin.id) throw new Error('Empty coin response')
  return coin
}

function trimCoin(coin) {
  if (!coin || !coin.id) return null
  const md = coin.market_data || {}
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image?.large || coin.image?.small || coin.image?.thumb || null,
    market_cap_rank: coin.market_cap_rank || null,
    categories: Array.isArray(coin.categories) ? coin.categories.slice(0, 3) : [],
    description_en: (coin.description?.en || '').slice(0, 3000),
    links: {
      homepage: coin.links?.homepage?.[0] || null,
      twitter_screen_name: coin.links?.twitter_screen_name || null,
      github: coin.links?.repos_url?.github?.[0] || null,
      subreddit_url: coin.links?.subreddit_url || null,
      whitepaper: coin.links?.whitepaper || null,
    },
    market_data: {
      ath_usd: md.ath?.usd ?? null,
      ath_change_percentage_usd: md.ath_change_percentage?.usd ?? null,
      ath_date_usd: md.ath_date?.usd ?? null,
      atl_usd: md.atl?.usd ?? null,
      atl_change_percentage_usd: md.atl_change_percentage?.usd ?? null,
      atl_date_usd: md.atl_date?.usd ?? null,
      circulating_supply: md.circulating_supply ?? null,
      total_supply: md.total_supply ?? null,
      max_supply: md.max_supply ?? null,
    },
    genesis_date: coin.genesis_date || null,
    hashing_algorithm: coin.hashing_algorithm || null,
  }
}

export default async function handler(req, res) {
  const slug = (req.query.slug || '').trim().toLowerCase()
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid slug' })
  }

  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600')

  const now = Date.now()
  const cached = cache.get(slug)

  // Fresh hit
  if (cached && (now - cached.fetchedAt) < FRESH_MS) {
    return res.status(200).json({ coin: cached.data })
  }

  // Stale-while-revalidate
  if (cached && (now - cached.fetchedAt) < STALE_MS) {
    fetchFromCoinGecko(slug)
      .then(data => {
        const trimmed = trimCoin(data)
        if (trimmed) cache.set(slug, { data: trimmed, fetchedAt: Date.now() })
      })
      .catch(err => console.warn(`bg refresh ${slug} failed:`, err.message))
    return res.status(200).json({ coin: cached.data })
  }

  // No cache — fetch fresh
  try {
    const data = await fetchFromCoinGecko(slug)
    const trimmed = trimCoin(data)
    if (trimmed) cache.set(slug, { data: trimmed, fetchedAt: now })
    return res.status(200).json({ coin: trimmed })
  } catch (err) {
    if (cached) {
      console.warn(`Serving expired cache for ${slug}:`, err.message)
      return res.status(200).json({ coin: cached.data })
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Coin not found' })
    }
    console.error(`coin-detail ${slug} failed:`, err.message)
    return res.status(503).json({ error: 'CoinGecko temporarily unavailable' })
  }
}
