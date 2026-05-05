// pages/api/coins.js
// Single API route for paginated coin markets data.
// Replaces the old /api/markets-list and /api/coin-search.
//
// Has two layers of caching:
//   1. In-memory cache per page (60s fresh, 1hr stale-while-revalidate)
//   2. Vercel edge cache via Cache-Control headers
//
// On rate-limit errors, ALWAYS serves the last successful response if we
// have one — never returns 500 unless we've never successfully fetched.

const cache = new Map() // page -> { data, fetchedAt }
const FRESH_MS = 60 * 1000           // 1 min: serve cached data, no refetch
const STALE_MS = 60 * 60 * 1000      // 1hr: serve stale, refetch in background
const PER_PAGE = 100

async function fetchPage(page) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: String(PER_PAGE),
    page: String(page),
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d',
  })
  const url = `https://api.coingecko.com/api/v3/coins/markets?${params}`
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
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Empty response')
  }
  return data
}

export default async function handler(req, res) {
  const page = Math.max(1, Math.min(10, parseInt(req.query.page) || 1))

  // Vercel edge cache — most requests hit this and never reach our handler
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=60, stale-while-revalidate=3600`
  )

  const now = Date.now()
  const cached = cache.get(page)

  // Fresh cache hit — return immediately
  if (cached && (now - cached.fetchedAt) < FRESH_MS) {
    return res.status(200).json(cached.data)
  }

  // Stale cache hit — return immediately, refresh in background
  if (cached && (now - cached.fetchedAt) < STALE_MS) {
    fetchPage(page)
      .then(data => cache.set(page, { data, fetchedAt: Date.now() }))
      .catch(err => console.warn(`bg refresh page ${page} failed:`, err.message))
    return res.status(200).json(cached.data)
  }

  // No cache (or very stale) — fetch fresh
  try {
    const data = await fetchPage(page)
    cache.set(page, { data, fetchedAt: now })
    return res.status(200).json(data)
  } catch (err) {
    // If we have ANY cached data — even very old — serve it. Better than 500.
    if (cached) {
      console.warn(`Serving expired cache for page ${page}:`, err.message)
      return res.status(200).json(cached.data)
    }
    console.error(`page ${page} fetch failed and no cache:`, err.message)
    return res.status(503).json({ error: 'CoinGecko temporarily unavailable' })
  }
}
