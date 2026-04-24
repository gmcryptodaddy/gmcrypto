// lib/coingecko.js
// Wrapper around CoinGecko free API. Rate limit: ~30 calls/min.

const BASE_URL = 'https://api.coingecko.com/api/v3'

async function fetchCG(path, params = {}) {
  const query = new URLSearchParams(params).toString()
  const url = `${BASE_URL}${path}${query ? '?' + query : ''}`
  const res = await fetch(url, {
    headers: { accept: 'application/json' }
  })
  if (!res.ok) {
    throw new Error(`CoinGecko error ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function getGlobalStats() {
  const data = await fetchCG('/global')
  return data?.data || null
}

export async function getCoinsMarkets({ page = 1, perPage = 100, ids = null, priceChangePercentage = '1h,24h,7d' } = {}) {
  const params = {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: perPage,
    page,
    sparkline: 'true',
    price_change_percentage: priceChangePercentage,
  }
  if (ids) params.ids = ids
  return fetchCG('/coins/markets', params)
}

// Top gainers / losers — fetches top 250 by market cap, then we sort client/server-side
export async function getTopMovers({ direction = 'gainers', limit = 50 } = {}) {
  // Pull top 250 by market cap (avoids "scam coin" 9000% pumps dominating the list)
  const data = await fetchCG('/coins/markets', {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: 250,
    page: 1,
    sparkline: 'true',
    price_change_percentage: '24h',
  })
  const sorted = [...(data || [])]
    .filter(c => c.price_change_percentage_24h != null)
    .sort((a, b) => {
      if (direction === 'gainers') {
        return b.price_change_percentage_24h - a.price_change_percentage_24h
      }
      return a.price_change_percentage_24h - b.price_change_percentage_24h
    })
  return sorted.slice(0, limit)
}

export async function getCoinDetails(id) {
  return fetchCG(`/coins/${id}`, {
    localization: 'false',
    tickers: 'true',
    market_data: 'true',
    community_data: 'false',
    developer_data: 'false',
    sparkline: 'false',
  })
}

export async function getCoinChart(id, days = 7) {
  return fetchCG(`/coins/${id}/market_chart`, {
    vs_currency: 'usd',
    days: String(days),
  })
}

export async function getCoinTickers(id) {
  return fetchCG(`/coins/${id}/tickers`, {
    include_exchange_logo: 'true',
    page: 1,
    order: 'volume_desc',
    depth: 'false',
  })
}

// Exchanges directory
export async function getExchanges({ perPage = 20, page = 1 } = {}) {
  return fetchCG('/exchanges', {
    per_page: perPage,
    page,
  })
}

// Simple conversion price lookup (for converter page)
export async function getSimplePrice(ids, vsCurrencies = 'usd') {
  return fetchCG('/simple/price', {
    ids: Array.isArray(ids) ? ids.join(',') : ids,
    vs_currencies: vsCurrencies,
  })
}

// Formatters
export function formatPrice(n) {
  if (n == null) return '$—'
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (n >= 0.01) return '$' + n.toFixed(4)
  return '$' + n.toFixed(8)
}

export function formatBigNumber(n) {
  if (n == null) return '—'
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K'
  return '$' + n.toFixed(2)
}

export function formatPercent(n) {
  if (n == null) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatSupply(n) {
  if (n == null) return '—'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}
