// pages/api/coins-index.js
// Returns the full CoinGecko coin list (id + symbol + name).
// Used by the markets page search box to find any coin instantly.
//
// The list is fetched once and cached in memory for 24 hours. CoinGecko
// recommends refreshing daily since new coins get listed but the list
// changes slowly day-to-day.

let cached = null // { data: [{id, symbol, name}, ...], fetchedAt }
const FRESH_MS = 24 * 60 * 60 * 1000  // 24 hours
const STALE_MS = 7 * 24 * 60 * 60 * 1000  // 7 days fallback

async function fetchCoinList() {
  const headers = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }
  const res = await fetch('https://api.coingecko.com/api/v3/coins/list', { headers })
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Empty response')
  }
  // Strip everything except id/symbol/name to keep response small (~600KB)
  return data.map(c => ({ id: c.id, symbol: c.symbol, name: c.name }))
}

export default async function handler(req, res) {
  // Aggressive caching at the edge — this list is huge and rarely changes
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=86400, stale-while-revalidate=604800'
  )

  const now = Date.now()

  // Fresh in-memory cache
  if (cached && (now - cached.fetchedAt) < FRESH_MS) {
    return res.status(200).json(cached.data)
  }

  // Stale but usable — return immediately, refresh in background
  if (cached && (now - cached.fetchedAt) < STALE_MS) {
    fetchCoinList()
      .then(data => { cached = { data, fetchedAt: Date.now() } })
      .catch(err => console.warn('coins-index bg refresh failed:', err.message))
    return res.status(200).json(cached.data)
  }

  // No cache — fetch fresh
  try {
    const data = await fetchCoinList()
    cached = { data, fetchedAt: now }
    return res.status(200).json(data)
  } catch (err) {
    if (cached) {
      console.warn('coins-index serving expired cache:', err.message)
      return res.status(200).json(cached.data)
    }
    console.error('coins-index failed and no cache:', err.message)
    // Return empty array so frontend fails gracefully — search just shows "no matches"
    // until next request succeeds. Don't return error — frontend doesn't retry on errors.
    return res.status(200).json([])
  }
}
