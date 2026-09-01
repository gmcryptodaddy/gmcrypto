// lib/polymarket.js
// Fetches high-probability binary prediction markets from Polymarket.

const GAMMA_URL = 'https://gamma-api.polymarket.com/markets'
const MIN_PROBABILITY = 0.75
const MIN_VOLUME_24H = 10000
const OUTPUT_LIMIT = 20

/**
 * Main entry — returns array of FutureNews items:
 * { id, question, headline, prefix, category, probability, volume,
 *   deadline, url, image, isYesLeading }
 */
export async function getPolymarketFeed() {
  try {
    const url = `${GAMMA_URL}?active=true&closed=false&archived=false&order=volume24hr&ascending=false&limit=100`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'gmcrypto-news/1.0',
        'Accept': 'application/json',
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      console.error(`Polymarket API error: ${res.status}`)
      return []
    }

    const markets = await res.json()
    if (!Array.isArray(markets)) return []

    return markets
      .map(parseMarket)
      .filter(Boolean)
      .filter(m => m.probability >= MIN_PROBABILITY)
      .filter(m => m.volume >= MIN_VOLUME_24H)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, OUTPUT_LIMIT)
  } catch (err) {
    console.error('Polymarket feed error:', err)
    return []
  }
}

function parseMarket(m) {
  try {
    let outcomes, outcomePrices
    try {
      outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes
      outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices
    } catch {
      return null
    }

    if (!Array.isArray(outcomes) || !Array.isArray(outcomePrices)) return null
    if (outcomes.length !== 2) return null

    const normalized = outcomes.map(o => String(o).toLowerCase().trim())
    if (!(normalized.includes('yes') && normalized.includes('no'))) return null

    const yesIdx = normalized.indexOf('yes')
    const yesPrice = parseFloat(outcomePrices[yesIdx])
    if (isNaN(yesPrice)) return null

    const isYesLeading = yesPrice >= 0.5
    const probability = isYesLeading ? yesPrice : (1 - yesPrice)

    const volume = parseFloat(m.volume24hr || m.volumeNum || m.volume || 0)
    if (!volume || isNaN(volume)) return null

    const deadline = m.endDate || m.endDateIso || null
    if (deadline) {
      const deadlineDate = new Date(deadline)
      if (deadlineDate < new Date()) return null
    }

    const category = inferCategory(m)
    const question = (m.question || '').trim()
    if (!question) return null

    const { prefix, headline } = frameHeadline(question, isYesLeading)

    const slug = m.slug || ''
    const url = slug ? `https://polymarket.com/market/${slug}` : 'https://polymarket.com'

    // Image: prefer icon (square, smaller), fall back to image
    const image = m.icon || m.image || m.twitterCardImage || null

    return {
      id: m.id || m.conditionId || slug,
      question,
      headline,
      prefix,
      category,
      probability,
      volume,
      deadline,
      url,
      image,
      isYesLeading,
    }
  } catch (err) {
    return null
  }
}

function inferCategory(m) {
  let tags = []
  if (Array.isArray(m.tags)) {
    tags = m.tags.map(t =>
      typeof t === 'string' ? t : (t?.label || t?.slug || '')
    ).filter(Boolean)
  }

  const tagStr = tags.join(' ').toLowerCase()
  const questionStr = (m.question || '').toLowerCase()
  const combined = tagStr + ' ' + questionStr

  if (/\b(bitcoin|btc|ethereum|eth|solana|crypto|defi|stablecoin|xrp|token|nft|blockchain)\b/.test(combined)) {
    return 'Crypto'
  }
  if (/\b(election|president|senate|congress|trump|biden|policy|regulation|sec|fed|rate|law|court|supreme)\b/.test(combined)) {
    return 'Policy'
  }
  if (/\b(ai|openai|anthropic|google|apple|microsoft|tesla|nvidia|tech|chip|semiconductor)\b/.test(combined)) {
    return 'Tech'
  }
  if (/\b(stocks|market|s&p|nasdaq|dow|economy|inflation|recession|gdp|treasury)\b/.test(combined)) {
    return 'Markets'
  }
  if (/\b(sports|nfl|nba|mlb|world cup|olympics|super bowl|match|championship)\b/.test(combined)) {
    return 'Sports'
  }
  return 'Markets'
}

function frameHeadline(question, isYesLeading) {
  const prefix = isYesLeading ? 'Odds favor:' : 'Crowd expects no:'
  const headline = question
    .replace(/\?+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return { prefix, headline }
}

export function formatVolume(volume) {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`
  }
  return `$${Math.round(volume)}`
}

export function formatDeadline(dateStr) {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return 'Ending today'
    if (diffDays === 1) return 'Ends tomorrow'
    if (diffDays <= 7) return `Ends in ${diffDays}d`
    if (diffDays <= 30) return `Ends in ${Math.ceil(diffDays / 7)}w`
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  } catch {
    return null
  }
}

export function extractCategories(items) {
  const cats = new Set(items.map(i => i.category))
  return Array.from(cats).sort()
}
