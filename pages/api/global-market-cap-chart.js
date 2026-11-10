// pages/api/global-market-cap-chart.js
// Total crypto market cap history for the markets-page chart.
//
// CoinGecko's precise /global/market_cap_chart is a paid endpoint, so:
//   1. Try it first (works instantly if the account is ever upgraded).
//   2. Otherwise approximate: take Bitcoin's market-cap history (free) and
//      scale it so the latest point equals the current TOTAL market cap.
//      Total cap tracks BTC closely, so the shape is representative and the
//      current value is exact. Flagged with `approximate: true`.
//
// Server-side + edge-cached, so traffic doesn't hammer CoinGecko.

const ALLOWED_DAYS = new Set(['1', '7', '30', '90', '365'])

function cgHeaders() {
  const headers = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  return headers
}

export default async function handler(req, res) {
  const days = String(req.query.days || '30')
  if (!ALLOWED_DAYS.has(days)) return res.status(400).json({ error: 'Invalid days' })

  const headers = cgHeaders()
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800')

  try {
    // 1) Accurate (paid) endpoint
    try {
      const accRes = await fetch(
        `https://api.coingecko.com/api/v3/global/market_cap_chart?days=${days}&vs_currency=usd`,
        { headers }
      )
      if (accRes.ok) {
        const acc = await accRes.json()
        const series = acc?.market_cap_chart?.market_cap || acc?.market_cap
        if (Array.isArray(series) && series.length) {
          return res.status(200).json({ market_caps: series, approximate: false })
        }
      }
    } catch { /* fall through to approximation */ }

    // 2) Approximation from BTC history scaled to the current total
    const [btcRes, globalRes] = await Promise.all([
      fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`, { headers }),
      fetch('https://api.coingecko.com/api/v3/global', { headers }),
    ])
    if (!btcRes.ok || !globalRes.ok) return res.status(502).json({ error: 'upstream' })

    const btc = await btcRes.json()
    const global = await globalRes.json()
    const btcCaps = Array.isArray(btc?.market_caps) ? btc.market_caps : []
    const currentTotal = global?.data?.total_market_cap?.usd

    if (!btcCaps.length || !currentTotal) return res.status(502).json({ error: 'no data' })

    const latestBtc = btcCaps[btcCaps.length - 1][1]
    const factor = latestBtc ? currentTotal / latestBtc : null
    if (!factor) return res.status(502).json({ error: 'no factor' })

    const series = btcCaps.map(([ts, m]) => [ts, m * factor])
    return res.status(200).json({ market_caps: series, approximate: true })
  } catch (err) {
    console.error('global-market-cap-chart error:', err)
    return res.status(500).json({ error: 'server' })
  }
}
