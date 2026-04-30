// pages/api/coingecko-summary.js
// Server-side proxy for CoinGecko's /coins/markets endpoint (pill summary).
//
// Cache: 2 min fresh, 30 min stale-while-revalidate.
// API key support via COINGECKO_API_KEY env var.

let cache = null // { data, fetchedAt, refreshing }
const FRESH_MS = 2 * 60 * 1000
const STALE_MS = 30 * 60 * 1000

const COIN_IDS = ['bitcoin', 'ethereum', 'solana']

async function fetchFromCoinGecko() {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd` +
    `&ids=${COIN_IDS.join(',')}&order=market_cap_desc&sparkline=false` +
    `&price_change_percentage=24h`
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

function refreshInBackground() {
  if (cache?.refreshing) return
  if (cache) cache.refreshing = true
  fetchFromCoinGecko()
    .then(data => { cache = { data, fetchedAt: Date.now(), refreshing: false } })
    .catch(err => {
      console.error('Summary background refresh failed:', err.message)
      if (cache) cache.refreshing = false
    })
}

export default async function handler(req, res) {
  const now = Date.now()

  res.setHeader(
    'Cache-Control',
    `public, s-maxage=${Math.floor(FRESH_MS / 1000)}, stale-while-revalidate=${Math.floor(STALE_MS / 1000)}`
  )

  if (cache) {
    const age = now - cache.fetchedAt
    if (age < FRESH_MS) return res.status(200).json(cache.data)
    if (age < STALE_MS) {
      refreshInBackground()
      return res.status(200).json(cache.data)
    }
  }

  try {
    const data = await fetchFromCoinGecko()
    cache = { data, fetchedAt: now, refreshing: false }
    return res.status(200).json(data)
  } catch (err) {
    if (cache) return res.status(200).json(cache.data)
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited by data provider' })
    console.error('coingecko-summary error:', err)
    return res.status(500).json({ error: 'Failed to fetch summary data' })
  }
}
