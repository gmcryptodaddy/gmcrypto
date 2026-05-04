// pages/api/markets-global.js
// Server-side proxy for CoinGecko global stats. Cached 60s fresh / 5min stale.

let cache = null // { data, fetchedAt }
const FRESH_MS = 60 * 1000
const STALE_MS = 5 * 60 * 1000

async function fetchFromCoinGecko() {
  const headers = { 'Accept': 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }
  const res = await fetch('https://api.coingecko.com/api/v3/global', { headers })
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}`)
    err.status = res.status
    throw err
  }
  const json = await res.json()
  return json?.data || null
}

export default async function handler(req, res) {
  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${Math.floor(FRESH_MS / 1000)}, stale-while-revalidate=${Math.floor(STALE_MS / 1000)}`
  )

  const now = Date.now()
  if (cache) {
    const age = now - cache.fetchedAt
    if (age < FRESH_MS) return res.status(200).json(cache.data)
    if (age < STALE_MS) {
      fetchFromCoinGecko()
        .then(data => { cache = { data, fetchedAt: Date.now() } })
        .catch(err => console.error('Global background refresh failed:', err.message))
      return res.status(200).json(cache.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko()
    cache = { data, fetchedAt: now }
    return res.status(200).json(data)
  } catch (err) {
    if (cache) return res.status(200).json(cache.data)
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited' })
    console.error('markets-global error:', err)
    return res.status(500).json({ error: 'Failed to fetch global stats' })
  }
}
