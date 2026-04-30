// pages/api/coingecko-chart.js
// Server-side proxy to CoinGecko's market_chart endpoint.
// Adds short in-memory caching to reduce rate-limit hits from the browser.
// Cache TTL: 60s — chart data updates that often is plenty for a news site.

const cache = new Map() // key -> { data, expires }
const CACHE_TTL_MS = 60 * 1000

const ALLOWED_COINS = new Set([
  'bitcoin', 'ethereum', 'solana',
  // future-proof if you want to expand pills later
  'binancecoin', 'ripple', 'cardano', 'avalanche-2', 'dogecoin', 'tron', 'chainlink',
])
const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365', 'max'])

export default async function handler(req, res) {
  const { coin, days } = req.query

  if (!coin || !days) {
    return res.status(400).json({ error: 'Missing coin or days param' })
  }
  if (!ALLOWED_COINS.has(coin)) {
    return res.status(400).json({ error: 'Coin not allowed' })
  }
  if (!ALLOWED_DAYS.has(String(days))) {
    return res.status(400).json({ error: 'Invalid days value' })
  }

  const cacheKey = `${coin}:${days}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cached.data)
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}`
    const cgRes = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })

    if (!cgRes.ok) {
      // If we have stale cached data, serve it on rate-limit / upstream failure
      if (cached) {
        res.setHeader('Cache-Control', 's-maxage=30')
        return res.status(200).json(cached.data)
      }
      return res.status(cgRes.status).json({
        error: cgRes.status === 429 ? 'Rate limited by data provider' : 'Upstream error',
      })
    }

    const json = await cgRes.json()
    cache.set(cacheKey, {
      data: json,
      expires: Date.now() + CACHE_TTL_MS,
    })
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(json)
  } catch (err) {
    console.error('coingecko-chart proxy error:', err)
    if (cached) return res.status(200).json(cached.data)
    return res.status(500).json({ error: 'Failed to fetch chart data' })
  }
}
