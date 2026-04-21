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

// Global market stats (total cap, volume, BTC dominance, etc.)
export async function getGlobalStats() {
  const data = await fetchCG('/global')
  return data?.data || null
}

// List of coins with market data. Paginated.
// Usage: getCoinsMarkets({ page: 1, perPage: 100 })
export async function getCoinsMarkets({ page = 1, perPage = 100, ids = null } = {}) {
  const params = {
    vs_currency: 'usd',
    order: 'market_cap_desc',
    per_page: perPage,
    page,
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d',
  }
  if (ids) params.ids = ids
  return fetchCG('/coins/markets', params)
}

// Single coin details (for individual coin page)
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

// OHLC or market chart data for a coin
// days: 1 | 7 | 14 | 30 | 90 | 180 | 365 | 'max'
export async function getCoinChart(id, days = 7) {
  return fetchCG(`/coins/${id}/market_chart`, {
    vs_currency: 'usd',
    days: String(days),
  })
}

// Top exchanges trading a coin (for /markets/[coin] exchanges table)
export async function getCoinTickers(id) {
  return fetchCG(`/coins/${id}/tickers`, {
    include_exchange_logo: 'true',
    page: 1,
    order: 'volume_desc',
    depth: 'false',
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
