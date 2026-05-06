// pages/api/coin-detail.js
// Returns full coin detail data (used by [coin].js placeholder page when
// CoinGecko was unavailable at build time).
//
// This is a separate code path from getStaticProps so it can have its own
// caching and retry behavior, plus the user's browser sees feedback faster.

const cache = new Map() // slug -> { data, fetchedAt }
const FRESH_MS = 5 * 60 * 1000      // 5 min
const STALE_MS = 60 * 60 * 1000     // 1 hr fallback

async function fetchFromCoinGecko(path) {
  const headers = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }
  const res = await fetch(`https://api.coingecko.com/api/v3${path}`, { headers })
  if (!res.ok) {
    const err = new Error(`Upstream ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

async function fetchCoinData(slug) {
  // Fetch detail (mandatory) and tickers (optional)
  const detailUrl = `/coins/${encodeURIComponent(slug)}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`
  const coin = await fetchFromCoinGecko(detailUrl)
  if (!coin || !coin.id) throw new Error('Empty coin response')

  // Tickers — best effort
  let tickers = []
  try {
    const tickersUrl = `/coins/${encodeURIComponent(slug)}/tickers?include_exchange_logo=true&page=1&order=volume_desc&depth=false`
    const tickersData = await fetchFromCoinGecko(tickersUrl)
    tickers = tickersData?.tickers || []
  } catch (err) {
    console.warn(`Tickers fetch failed for ${slug}:`, err.message)
  }

  return { coin, tickers }
}

export default async function handler(req, res) {
  const slug = (req.query.slug || '').trim()
  if (!slug) {
    return res.status(400).json({ error: 'Missing slug' })
  }

  // Edge cache so repeated requests don't all hit our handler
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')

  const now = Date.now()
  const cached = cache.get(slug)

  // Fresh in-memory cache
  if (cached && (now - cached.fetchedAt) < FRESH_MS) {
    return res.status(200).json(cached.data)
  }

  // Stale cache — return immediately, refresh in background
  if (cached && (now - cached.fetchedAt) < STALE_MS) {
    fetchCoinData(slug)
      .then(data => cache.set(slug, { data, fetchedAt: Date.now() }))
      .catch(err => console.warn(`bg refresh ${slug} failed:`, err.message))
    return res.status(200).json(cached.data)
  }

  // No cache — try fetching
  try {
    const data = await fetchCoinData(slug)
    cache.set(slug, { data, fetchedAt: now })
    return res.status(200).json(data)
  } catch (err) {
    if (cached) {
      // Use even-older cache rather than fail
      console.warn(`Serving expired cache for ${slug}:`, err.message)
      return res.status(200).json(cached.data)
    }
    if (err.status === 404) {
      return res.status(404).json({ error: 'Coin not found' })
    }
    console.error(`coin-detail ${slug} failed:`, err.message)
    return res.status(503).json({ error: 'CoinGecko temporarily unavailable' })
  }
}
