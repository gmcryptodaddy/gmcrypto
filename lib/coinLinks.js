// lib/coinLinks.js
// Maps coin names and tickers to their /markets/[slug] page slugs.
// Used by the PortableText renderer to auto-link coin mentions in article body.
//
// Matching rules (handled by the renderer):
//   - Word-boundary match (won't link "ETH" inside "method")
//   - Case-insensitive
//   - Only first occurrence per article gets linked (avoids spammy over-linking)
//   - Symbols require length 3+ to be auto-linked

export const COIN_LINKS = {
  // Name → slug
  'bitcoin':    'bitcoin',
  'ethereum':   'ethereum',
  'solana':     'solana',
  'cardano':    'cardano',
  'avalanche':  'avalanche-2',
  'dogecoin':   'dogecoin',
  'polkadot':   'polkadot',
  'chainlink':  'chainlink',
  'polygon':    'polygon',
  'litecoin':   'litecoin',
  'uniswap':    'uniswap',
  'binance':    'binancecoin',
  'tron':       'tron',
  'monero':     'monero',
  'aave':       'aave',
  'hyperliquid': 'hyperliquid',
  'shiba inu':  'shiba-inu',
  'ripple':     'ripple',

  // Symbol → slug (only 3+ chars to avoid ambiguity)
  'btc':  'bitcoin',
  'eth':  'ethereum',
  'sol':  'solana',
  'ada':  'cardano',
  'avax': 'avalanche-2',
  'doge': 'dogecoin',
  'dot':  'polkadot',
  'link': 'chainlink',
  'matic':'polygon',
  'ltc':  'litecoin',
  'uni':  'uniswap',
  'bnb':  'binancecoin',
  'trx':  'tron',
  'xmr':  'monero',
  'xrp':  'ripple',
  'shib': 'shiba-inu',
  'hype': 'hyperliquid',
}

// Get the slug for a given keyword (case-insensitive). Returns null if no match.
export function getCoinSlug(keyword) {
  if (!keyword) return null
  return COIN_LINKS[keyword.toLowerCase()] || null
}
