// pages/api/fiat-rates.js
// Proxies CoinGecko's simple/price for BTC/ETH across the fiats the converter
// supports. Runs server-side (so the API key is usable and visitors' IPs are
// never exposed to CoinGecko) and is edge-cached, so heavy traffic still only
// hits CoinGecko a few times per 5-minute window.

const FIATS = 'usd,eur,gbp,jpy,cny'

export default async function handler(req, res) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=${FIATS}`
    const headers = { accept: 'application/json' }
    if (process.env.COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
    }

    const r = await fetch(url, { headers })
    if (!r.ok) {
      return res.status(502).json({ error: 'upstream', status: r.status })
    }
    const data = await r.json()

    // Cache at the edge for 5 min, serve stale for another 10 while refreshing.
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch (err) {
    console.error('fiat-rates error:', err)
    return res.status(500).json({ error: 'server' })
  }
}
