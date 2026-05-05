// pages/api/coin-search.js
// Searches CoinGecko's full coin database via /search endpoint.
// Used by the markets page search box to find coins beyond the current page.
//
// Cache: 5 minutes per query — search results don't change often.

const cache = new Map() // query -> { data, fetchedAt }
const FRESH_MS = 5 * 60 * 1000
const STALE_MS = 30 * 60 * 1000
const MAX_CACHE_SIZE = 200

async function fetchFromCoinGecko(query) {
  const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
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
  const json = await res.json()
  // We only need the coins array, top 20 results
  return (json?.coins || []).slice(0, 20).map(c => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    market_cap_rank: c.market_cap_rank,
    thumb: c.thumb,
    large: c.large,
  }))
}

export default async function handler(req, res) {
  const q = (req.query.q || '').trim().toLowerCase()
  if (!q || q.length < 2) {
    return res.status(200).json([])
  }

  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${Math.floor(FRESH_MS / 1000)}, stale-while-revalidate=${Math.floor(STALE_MS / 1000)}`
  )

  const now = Date.now()
  const cached = cache.get(q)
  if (cached) {
    const age = now - cached.fetchedAt
    if (age < FRESH_MS) {
      return res.status(200).json(cached.data)
    }
    if (age < STALE_MS) {
      // Background refresh, serve stale immediately
      fetchFromCoinGecko(q)
        .then(data => cache.set(q, { data, fetchedAt: Date.now() }))
        .catch(err => console.error('Search bg refresh failed:', err.message))
      return res.status(200).json(cached.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko(q)
    // Trim cache if too large
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value
      cache.delete(oldestKey)
    }
    cache.set(q, { data, fetchedAt: now })
    return res.status(200).json(data)
  } catch (err) {
    if (cached) return res.status(200).json(cached.data)
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited' })
    console.error('coin-search error:', err)
    return res.status(500).json({ error: 'Search failed' })
  }
}
