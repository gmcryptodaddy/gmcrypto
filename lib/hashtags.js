// lib/hashtags.js
// Generate relevant hashtags for an article based on its title and category.

const COIN_MAP = {
  bitcoin: '#BTC',
  btc: '#BTC',
  ethereum: '#ETH',
  eth: '#ETH',
  solana: '#SOL',
  sol: '#SOL',
  ripple: '#XRP',
  xrp: '#XRP',
  dogecoin: '#DOGE',
  doge: '#DOGE',
  cardano: '#ADA',
  avalanche: '#AVAX',
  polkadot: '#DOT',
  chainlink: '#LINK',
  polygon: '#MATIC',
  binance: '#BNB',
  bnb: '#BNB',
  tron: '#TRX',
  shiba: '#SHIB',
  pepe: '#PEPE',
  hyperliquid: '#HYPE',
  monero: '#XMR',
  litecoin: '#LTC',
  uniswap: '#UNI',
  aave: '#AAVE',
  chip: '#CHIP',
}

const CATEGORY_TAGS = {
  'breaking news': ['#Breaking', '#News'],
  'explainer': ['#Explainer', '#Learn'],
  'markets': ['#Markets', '#Price'],
  'companies': ['#Companies', '#Business'],
  'tradfi': ['#TradFi', '#Finance'],
  'policy': ['#Policy', '#Regulation'],
  'defi': ['#DeFi', '#Yield'],
  'tech': ['#Tech', '#Crypto'],
  'web3': ['#Web3', '#Blockchain'],
  'security': ['#Security', '#Hack'],
  'news': ['#News', '#Crypto'],
}

const FILLER_TAGS = [
  '#Crypto', '#Web3', '#Markets', '#DeFi', '#Blockchain',
  '#Trading', '#HODL', '#BullRun', '#BearMarket', '#GM'
]

// Simple hash for stable randomness per article
function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function generateHashtags(title = '', category = '', maxTags = 3) {
  const tags = new Set()
  const titleLower = title.toLowerCase()

  // 1. Coin mentions from title
  for (const [keyword, tag] of Object.entries(COIN_MAP)) {
    if (titleLower.includes(keyword)) {
      tags.add(tag)
      if (tags.size >= maxTags) return [...tags].slice(0, maxTags)
    }
  }

  // 2. Category-based tags
  const catLower = category?.toLowerCase() || ''
  const catTags = CATEGORY_TAGS[catLower] || []
  for (const tag of catTags) {
    tags.add(tag)
    if (tags.size >= maxTags) return [...tags].slice(0, maxTags)
  }

  // 3. Fill with stable pseudo-random tags
  const seed = hashString(title + category)
  const shuffled = [...FILLER_TAGS].sort((a, b) => {
    return hashString(a + seed) - hashString(b + seed)
  })
  for (const tag of shuffled) {
    tags.add(tag)
    if (tags.size >= maxTags) break
  }

  return [...tags].slice(0, maxTags)
}
