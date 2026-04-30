// pages/api/coingecko-summary.js
// Server-side proxy for CoinGecko's /coins/markets endpoint (used for pill summary).
// Cached for 60s in memory.

let cache = null // { data, expires }
const CACHE_TTL_MS = 60 * 1000

const COIN_IDS = ['bitcoin', 'ethereum', 'solana']

export default async function handler(req, res) {
  if (cache && cache.expires > Date.now()) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(cache.data)
  }

  try {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
      `&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=false` +
      `&price_change_percentage=24h`

    const cgRes = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!cgRes.ok) {
      if (cache) {
        res.setHeader('Cache-Control', 's-maxage=30')
        return res.status(200).json(cache.data)
      }
      return res.status(cgRes.status).json({
        error: cgRes.status === 429 ? 'Rate limited by data provider' : 'Upstream error',
      })
    }
    const json = await cgRes.json()
    cache = { data: json, expires: Date.now() + CACHE_TTL_MS }
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    return res.status(200).json(json)
  } catch (err) {
    console.error('coingecko-summary proxy error:', err)
    if (cache) return res.status(200).json(cache.data)
    return res.status(500).json({ error: 'Failed to fetch summary data' })
  }
}
