// pages/api/coin-price.js
//
// Returns live price + 24h change for one or more coins using CoinGecko's
// lightweight /simple/price endpoint (1 cheap call regardless of how many
// coins requested).
//
// Used by [coin].js to fetch fresh prices client-side without burning the
// heavy /coins/{id} endpoint that we use for snapshot building.
//
// Usage: GET /api/coin-price?ids=bitcoin,ethereum
// Response: { bitcoin: { usd, usd_24h_change, usd_market_cap, usd_24h_vol }, ... }

const cache = new Map() // ids string -> { data, fetchedAt }
const FRESH_MS = 60 * 1000        // 1 min: serve cached
const STALE_MS = 30 * 60 * 1000   // 30 min: serve stale on error

async function fetchFromCoinGecko(idsStr) {
  const params = new URLSearchParams({
    ids: idsStr,
    vs_currencies: 'usd',
    include_24hr_change: 'true',
    include_24hr_vol: 'true',
    include_market_cap: 'true',
    include_last_updated_at: 'true',
  })
  const url = `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`
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
  const data = await res.json()
  if (!data || typeof data !== 'object') {
    throw new Error('Empty or invalid response')
  }
  return data
}

export default async function handler(req, res) {
  const idsRaw = (req.query.ids || '').toString().trim()
  if (!idsRaw) {
    return res.status(400).json({ error: 'Missing ids parameter' })
  }

  // Sanitize: lowercase, comma-separated, only [a-z0-9-], max 50 ids
  const ids = idsRaw
    .toLowerCase()
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[a-z0-9-]+$/.test(s))
    .slice(0, 50)

  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid ids' })
  }

  // Sort ids so the cache key is consistent regardless of input order
  const cacheKey = ids.slice().sort().join(',')

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  const now = Date.now()
  const cached = cache.get(cacheKey)

  // Fresh cache hit
  if (cached && (now - cached.fetchedAt) < FRESH_MS) {
    return res.status(200).json(cached.data)
  }

  // Stale-while-revalidate
  if (cached && (now - cached.fetchedAt) < STALE_MS) {
    fetchFromCoinGecko(cacheKey)
      .then(data => cache.set(cacheKey, { data, fetchedAt: Date.now() }))
      .catch(err => console.warn(`bg refresh failed for ${cacheKey}:`, err.message))
    return res.status(200).json(cached.data)
  }

  // No cache — fetch fresh
  try {
    const data = await fetchFromCoinGecko(cacheKey)
    cache.set(cacheKey, { data, fetchedAt: now })
    return res.status(200).json(data)
  } catch (err) {
    if (cached) {
      // Last-ditch: serve very stale cache rather than fail
      console.warn(`Serving expired cache for ${cacheKey}:`, err.message)
      return res.status(200).json(cached.data)
    }
    console.error(`coin-price ${cacheKey} failed:`, err.message)
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited' })
    }
    return res.status(503).json({ error: 'CoinGecko temporarily unavailable' })
  }
}
