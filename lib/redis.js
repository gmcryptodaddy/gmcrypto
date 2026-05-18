// lib/redis.js
// Upstash Redis client for article reactions.
//
// Note: we do NOT use Redis.fromEnv() — that helper expects env vars named
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN. The Vercel <> Upstash
// integration on this project provisioned them under the KV_* names instead
// (KV_REST_API_URL / KV_REST_API_TOKEN), so we pass them explicitly.

import { Redis } from '@upstash/redis'

let redisClient = null

// Lazily create a single shared client. Returns null if env vars are missing
// so callers can degrade gracefully instead of crashing the route.
export function getRedis() {
  if (redisClient) return redisClient

  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    console.error('Redis env vars missing (KV_REST_API_URL / KV_REST_API_TOKEN)')
    return null
  }

  redisClient = new Redis({ url, token })
  return redisClient
}
