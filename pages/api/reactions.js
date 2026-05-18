// pages/api/reactions.js
// Article emoji reactions — GET counts, POST to increment.
//
// Storage model in Redis:
//   - reactions:<postId>  → a HASH mapping emojiKey → count
//     e.g. HSET reactions:abc123 rocket 5 thinking 2
//   - ratelimit:<ip>      → a counter with TTL, caps reactions per IP per hour
//
// Abuse prevention is two-layer:
//   1. Client-side: localStorage stops the same browser reacting twice (in component)
//   2. Server-side: IP rate limit here stops scripted spam
//
// We never return an error that would break the UI — on failure we return
// zeroed counts (GET) or a soft failure flag (POST).

import { getRedis } from '../../lib/redis'

// The 5 allowed reactions. The KEY is what's stored in Redis; the emoji is
// display-only and lives in the frontend component. Server validates against
// these keys so a malicious client can't invent arbitrary reaction types.
const VALID_REACTIONS = ['rocket', 'thinking', 'skull', 'fire', 'eyes']

// Rate limit: max reactions per IP per rolling hour, across all articles.
const RATE_LIMIT_MAX = 30
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60

function getClientIp(req) {
  // Vercel sets x-forwarded-for; take the first hop (the real client).
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

// Returns an object with every reaction key set to a number (zero-filled),
// so the frontend always gets a complete, predictable shape.
function normalizeCounts(raw) {
  const counts = {}
  for (const key of VALID_REACTIONS) {
    const v = raw ? raw[key] : 0
    const n = typeof v === 'number' ? v : parseInt(v, 10)
    counts[key] = Number.isFinite(n) && n > 0 ? n : 0
  }
  return counts
}

export default async function handler(req, res) {
  const redis = getRedis()

  // If Redis isn't configured, degrade gracefully — reactions just show as 0
  // and POSTs report a soft failure. The article page still works.
  if (!redis) {
    if (req.method === 'POST') {
      return res.status(200).json({ ok: false, reason: 'storage_unavailable', counts: normalizeCounts(null) })
    }
    return res.status(200).json({ counts: normalizeCounts(null) })
  }

  // ---- GET: fetch current counts for a post ----
  if (req.method === 'GET') {
    const postId = (req.query.postId || '').toString().trim()
    if (!postId) {
      return res.status(400).json({ error: 'postId required' })
    }
    try {
      const raw = await redis.hgetall(`reactions:${postId}`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ counts: normalizeCounts(raw) })
    } catch (err) {
      console.error('Reactions GET failed:', err.message)
      return res.status(200).json({ counts: normalizeCounts(null) })
    }
  }

  // ---- POST: increment one reaction for a post ----
  if (req.method === 'POST') {
    let body = req.body
    // Body may arrive as a string depending on content-type
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const postId = (body?.postId || '').toString().trim()
    const reaction = (body?.reaction || '').toString().trim()

    if (!postId || !reaction) {
      return res.status(400).json({ error: 'postId and reaction required' })
    }
    if (!VALID_REACTIONS.includes(reaction)) {
      return res.status(400).json({ error: 'invalid reaction type' })
    }

    // ---- IP rate limit ----
    try {
      const ip = getClientIp(req)
      const rlKey = `ratelimit:reactions:${ip}`
      const current = await redis.incr(rlKey)
      if (current === 1) {
        // First hit in this window — set the expiry.
        await redis.expire(rlKey, RATE_LIMIT_WINDOW_SECONDS)
      }
      if (current > RATE_LIMIT_MAX) {
        // Over the limit — reject but still return current counts so UI stays consistent.
        const raw = await redis.hgetall(`reactions:${postId}`)
        return res.status(429).json({
          ok: false,
          reason: 'rate_limited',
          counts: normalizeCounts(raw),
        })
      }
    } catch (err) {
      // If the rate-limit check itself fails, don't block the reaction —
      // just log and continue. Better to allow than to break the feature.
      console.error('Rate limit check failed:', err.message)
    }

    // ---- Increment ----
    try {
      await redis.hincrby(`reactions:${postId}`, reaction, 1)
      const raw = await redis.hgetall(`reactions:${postId}`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ ok: true, counts: normalizeCounts(raw) })
    } catch (err) {
      console.error('Reactions POST failed:', err.message)
      return res.status(200).json({ ok: false, reason: 'write_failed', counts: normalizeCounts(null) })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
