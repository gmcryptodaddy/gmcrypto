// pages/api/coingecko-chart.js
// Server-side proxy to CoinGecko's market_chart endpoint.
//
// Caching strategy (per-instance memory + Vercel edge):
//   - Short ranges (24H, 7D):  5 min fresh, 30 min stale-while-revalidate
//   - Mid ranges  (30D, 90D):  15 min fresh, 1 hour stale
//   - Long ranges (1Y, All):   1 hour fresh, 6 hours stale
//
// "stale-while-revalidate" pattern: if cached data is older than `fresh`
// but younger than `stale`, return it INSTANTLY and refresh in the
// background. Users never see loading/rate-limit errors once warm.
//
// API key: if COINGECKO_API_KEY env var is set, sent as x-cg-demo-api-key
// header for higher rate limits. Falls back to public tier if not set.

const cache = new Map() // key -> { data, fetchedAt, refreshing }

const TTL_BY_DAYS = {
  '1':   { fresh: 5  * 60 * 1000, stale: 30 * 60 * 1000 },
  '7':   { fresh: 5  * 60 * 1000, stale: 30 * 60 * 1000 },
  '30':  { fresh: 15 * 60 * 1000, stale: 60 * 60 * 1000 },
  '90':  { fresh: 15 * 60 * 1000, stale: 60 * 60 * 1000 },
  '365': { fresh: 60 * 60 * 1000, stale: 6  * 60 * 60 * 1000 },
  'max': { fresh: 60 * 60 * 1000, stale: 6  * 60 * 60 * 1000 },
}

const ALLOWED_COINS = new Set([
  'bitcoin', 'ethereum', 'solana',
  'binancecoin', 'ripple', 'cardano', 'avalanche-2',
  'dogecoin', 'tron', 'chainlink',
])
const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365', 'max'])

async function fetchFromCoinGecko(coin, days) {
  const url = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}`
  const headers = { 'Accept': 'application/json' }
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

function refreshInBackground(cacheKey, coin, days) {
  const entry = cache.get(cacheKey)
  if (entry?.refreshing) return
  if (entry) entry.refreshing = true

  fetchFromCoinGecko(coin, days)
    .then(data => {
      cache.set(cacheKey, { data, fetchedAt: Date.now(), refreshing: false })
    })
    .catch(err => {
      console.error('Background refresh failed:', cacheKey, err.message)
      const e = cache.get(cacheKey)
      if (e) e.refreshing = false
    })
}

export default async function handler(req, res) {
  const { coin, days } = req.query

  if (!coin || !days) return res.status(400).json({ error: 'Missing coin or days param' })
  if (!ALLOWED_COINS.has(coin)) return res.status(400).json({ error: 'Coin not allowed' })
  if (!ALLOWED_DAYS.has(String(days))) return res.status(400).json({ error: 'Invalid days value' })

  const cacheKey = `${coin}:${days}`
  const ttl = TTL_BY_DAYS[String(days)]
  const cached = cache.get(cacheKey)
  const now = Date.now()

  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${Math.floor(ttl.fresh / 1000)}, stale-while-revalidate=${Math.floor(ttl.stale / 1000)}`
  )

  if (cached) {
    const age = now - cached.fetchedAt
    if (age < ttl.fresh) {
      return res.status(200).json(cached.data)
    }
    if (age < ttl.stale) {
      refreshInBackground(cacheKey, coin, days)
      return res.status(200).json(cached.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko(coin, days)
    cache.set(cacheKey, { data, fetchedAt: now, refreshing: false })
    return res.status(200).json(data)
  } catch (err) {
    if (cached) return res.status(200).json(cached.data)
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited by data provider' })
    console.error('coingecko-chart error:', err)
    return res.status(500).json({ error: 'Failed to fetch chart data' })
  }
}
