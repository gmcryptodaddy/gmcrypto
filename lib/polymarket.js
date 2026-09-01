// lib/polymarket.js
// Fetches high-probability binary prediction markets from Polymarket.
// Returns filtered, cleaned data ready for the Future News UI.

const GAMMA_URL = 'https://gamma-api.polymarket.com/markets'
const MIN_PROBABILITY = 0.75       // Only show 75%+ predictions
const MIN_VOLUME_24H = 10000       // $10k+ 24h volume = real signal
const MAX_MARKETS = 30             // Fetch pool before filtering
const OUTPUT_LIMIT = 20            // Final feed cap

/**
 * Main entry — returns array of FutureNews items:
 * { id, question, headline, category, probability, volume,
 *   deadline, url, prefix }
 * Returns [] on failure (fails gracefully).
 */
export async function getPolymarketFeed() {
  try {
    // Query: active + not closed, sorted by 24h volume desc, big pool
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

    const processed = markets
      .map(parseMarket)
      .filter(Boolean)
      .filter(m => m.probability >= MIN_PROBABILITY)
      .filter(m => m.volume >= MIN_VOLUME_24H)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, OUTPUT_LIMIT)

    return processed
  } catch (err) {
    console.error('Polymarket feed error:', err)
    return []
  }
}

/**
 * Parse a single Polymarket market into our normalized shape.
 * Returns null if the market should be skipped (multi-outcome,
 * missing data, expired, etc.)
 */
function parseMarket(m) {
  try {
    // Parse JSON-encoded string fields
    let outcomes, outcomePrices
    try {
      outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : m.outcomes
      outcomePrices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices
    } catch {
      return null
    }

    if (!Array.isArray(outcomes) || !Array.isArray(outcomePrices)) return null

    // ONLY binary Yes/No markets (skip multi-outcome)
    if (outcomes.length !== 2) return null
    const normalized = outcomes.map(o => String(o).toLowerCase().trim())
    if (!(normalized.includes('yes') && normalized.includes('no'))) return null

    // Get YES probability (index of "Yes")
    const yesIdx = normalized.indexOf('yes')
    const yesPrice = parseFloat(outcomePrices[yesIdx])
    if (isNaN(yesPrice)) return null

    // We treat the "leading" side as our probability. If YES is winning,
    // use YES probability. If NO is winning (i.e. YES < 50%), it means
    // the answer is likely NO — we still capture that as a strong signal.
    const isYesLeading = yesPrice >= 0.5
    const probability = isYesLeading ? yesPrice : (1 - yesPrice)

    // Volume: prefer 24h, fall back to total volume
    const volume = parseFloat(m.volume24hr || m.volumeNum || m.volume || 0)
    if (!volume || isNaN(volume)) return null

    // Deadline
    const deadline = m.endDate || m.endDateIso || null
    if (deadline) {
      const deadlineDate = new Date(deadline)
      if (deadlineDate < new Date()) return null // Skip expired
    }

    // Category inference from tags / groupItemTitle / category
    const category = inferCategory(m)

    // Question and headline framing
    const question = (m.question || '').trim()
    if (!question) return null

    const { prefix, headline } = frameHeadline(question, isYesLeading)

    // Build market URL — use slug
    const slug = m.slug || m.marketMakerAddress || ''
    const url = slug ? `https://polymarket.com/market/${slug}` : 'https://polymarket.com'

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
      isYesLeading,
    }
  } catch (err) {
    return null
  }
}

/**
 * Infer category from Polymarket tags. Falls back to "Markets".
 */
function inferCategory(m) {
  // Tags come as an array of tag objects or strings
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

/**
 * Frame a Polymarket question as a news-style statement.
 * Returns { prefix, headline } — the prefix is "Odds favor:" or "Crowd expects:"
 * and the headline is the (lightly cleaned) question itself.
 */
function frameHeadline(question, isYesLeading) {
  // Alternate prefixes based on confidence — creates variety
  const prefix = isYesLeading ? 'Odds favor:' : 'Crowd expects no:'

  // Lightly clean the question — strip trailing ?, normalize whitespace
  let headline = question
    .replace(/\?+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  return { prefix, headline }
}

/**
 * Format a volume number for display: $1.2M, $450K, $12.5K
 */
export function formatVolume(volume) {
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(0)}K`
  }
  return `$${Math.round(volume)}`
}

/**
 * Format a deadline date as a human-readable string.
 */
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

/**
 * Get unique categories present in a feed (for the filter dropdown).
 */
export function extractCategories(items) {
  const cats = new Set(items.map(i => i.category))
  return Array.from(cats).sort()
}
