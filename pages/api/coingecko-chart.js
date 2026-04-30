// pages/api/coingecko-chart.js
// Server-side proxy to CoinGecko's market_chart and ohlc endpoints.
//
// Query params:
//   coin=<coin-id>            (required, e.g. 'bitcoin')
//   days=1|7|30|90|365|max    (required)
//   type=area|candle          (optional, default 'area' = market_chart, 'candle' = ohlc)
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

const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365', 'max'])
const ALLOWED_TYPES = new Set(['area', 'candle'])
// Loose validation for coin slug — alphanumeric + hyphens, max 50 chars.
// CoinGecko coin IDs (e.g. 'bitcoin', 'avalanche-2') match this. Prevents
// abuse / SSRF while supporting any of the 17k+ coins on the platform.
const COIN_ID_RE = /^[a-z0-9-]{1,50}$/i

async function fetchFromCoinGecko(coin, days, type) {
  const endpoint = type === 'candle' ? 'ohlc' : 'market_chart'
  const url = `https://api.coingecko.com/api/v3/coins/${coin}/${endpoint}?vs_currency=usd&days=${days}`
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

function refreshInBackground(cacheKey, coin, days, type) {
  const entry = cache.get(cacheKey)
  if (entry?.refreshing) return
  if (entry) entry.refreshing = true

  fetchFromCoinGecko(coin, days, type)
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
  const { coin, days, type = 'area' } = req.query

  if (!coin || !days) return res.status(400).json({ error: 'Missing coin or days param' })
  if (!COIN_ID_RE.test(coin)) return res.status(400).json({ error: 'Invalid coin id' })
  if (!ALLOWED_DAYS.has(String(days))) return res.status(400).json({ error: 'Invalid days value' })
  if (!ALLOWED_TYPES.has(type)) return res.status(400).json({ error: 'Invalid type value' })

  const cacheKey = `${coin}:${days}:${type}`
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
      refreshInBackground(cacheKey, coin, days, type)
      return res.status(200).json(cached.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko(coin, days, type)
    cache.set(cacheKey, { data, fetchedAt: now, refreshing: false })
    return res.status(200).json(data)
  } catch (err) {
    if (cached) return res.status(200).json(cached.data)
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited by data provider' })
    if (err.status === 401) return res.status(401).json({ error: 'Historical data beyond 365 days requires a paid plan' })
    console.error('coingecko-chart error:', err)
    return res.status(500).json({ error: 'Failed to fetch chart data' })
  }
}
