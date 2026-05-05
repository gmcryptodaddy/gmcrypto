// pages/api/markets-list.js
// Server-side proxy for CoinGecko's /coins/markets endpoint with caching.
// Used by /markets page for pagination.
//
// Cache: 60s fresh, 5min stale-while-revalidate.

const cache = new Map() // page -> { data, fetchedAt }
const FRESH_MS = 60 * 1000
const STALE_MS = 5 * 60 * 1000

const PER_PAGE = 100

async function fetchFromCoinGecko(page) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: String(PER_PAGE),
    page: String(page),
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d',
  })
  const url = `https://api.coingecko.com/api/v3/coins/markets?${params.toString()}`
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
  return res.json()
}

export default async function handler(req, res) {
  const page = Math.max(1, Math.min(10, parseInt(req.query.page) || 1))

  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${Math.floor(FRESH_MS / 1000)}, stale-while-revalidate=${Math.floor(STALE_MS / 1000)}`
  )

  const cached = cache.get(page)
  const now = Date.now()

  if (cached) {
    const age = now - cached.fetchedAt
    if (age < FRESH_MS) {
      return res.status(200).json(cached.data)
    }
    if (age < STALE_MS) {
      // Refresh in background; serve stale immediately
      fetchFromCoinGecko(page)
        .then(data => cache.set(page, { data, fetchedAt: Date.now() }))
        .catch(err => console.error('Markets-list bg refresh failed:', err.message))
      return res.status(200).json(cached.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko(page)
    cache.set(page, { data, fetchedAt: now })
    return res.status(200).json(data)
  } catch (err) {
    // If we have ANY cached data, even very old, serve it rather than fail
    if (cached) {
      console.warn(`Serving stale cache for markets-list page ${page}:`, err.message)
      return res.status(200).json(cached.data)
    }
    console.error(`markets-list page ${page} failed:`, err.message)
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited by upstream' })
    }
    return res.status(500).json({ error: 'Failed to fetch markets', detail: err.message })
  }
}
