// pages/api/search.js
// Site-wide article search.
// Takes ?q=... and returns up to 10 matching posts from Sanity.
//
// Searches title, excerpt, and full body text. Uses Sanity's `match` operator
// with a wildcard suffix so partial words match ("eth" finds "ethereum").
//
// Caching: edge-cached for 5 min with stale-while-revalidate so repeated
// queries (especially common ones like "bitcoin") don't hammer Sanity.

import { client } from '../../lib/sanity'

const MAX_RESULTS = 10
const MIN_QUERY_LENGTH = 2

export default async function handler(req, res) {
  const rawQuery = (req.query.q || '').toString().trim()

  // Edge cache: 5 min fresh, 30 min stale-while-revalidate.
  // Short fresh window because new articles appear and should become findable quickly.
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=1800'
  )

  if (rawQuery.length < MIN_QUERY_LENGTH) {
    return res.status(200).json({ query: rawQuery, results: [] })
  }

  // Strip characters that have special meaning in GROQ match expressions.
  // We only keep letters, numbers, and spaces — search terms don't need anything else.
  const sanitized = rawQuery.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  if (!sanitized) {
    return res.status(200).json({ query: rawQuery, results: [] })
  }

  // Split into terms and add wildcard suffix so partial words match.
  // Example: "eth merg" → ["eth*", "merg*"] → matches "ethereum merge"
  const terms = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8) // cap term count so abusive queries can't slow Sanity
    .map(t => `${t}*`)

  // GROQ `match` is case-insensitive and supports wildcards.
  // pt::text() extracts the plain-text content of the Portable Text body array
  // so we search the actual article prose, not just metadata.
  const groqQuery = `
    *[_type == "post"
      && defined(slug.current)
      && (
        title match $terms
        || excerpt match $terms
        || pt::text(body) match $terms
      )
    ] | order(publishedAt desc)[0...$limit] {
      _id,
      title,
      "slug": slug.current,
      publishedAt,
      excerpt,
      category,
      mainImage
    }
  `

  try {
    const results = await client.fetch(groqQuery, {
      terms,
      limit: MAX_RESULTS,
    })
    return res.status(200).json({
      query: rawQuery,
      results: results || [],
    })
  } catch (err) {
    console.error('Search query failed:', err.message)
    // Return empty results rather than 500 — frontend shows "no results" gracefully.
    return res.status(200).json({ query: rawQuery, results: [] })
  }
}
