// lib/coin-snapshot.js
//
// Reads the coin snapshot JSON from public/coins-snapshot.json on the server.
// The file is built by scripts/snapshot-coins.js (run weekly via GitHub Action).
//
// Cached in memory after first read — server keeps the data warm and never
// re-reads from disk.

import fs from 'fs'
import path from 'path'

let cachedSnapshot = null
let cachedMap = null
let lastReadTime = 0
const RE_READ_INTERVAL_MS = 5 * 60 * 1000  // re-check disk every 5 min in case file updated

function loadFromDisk() {
  const filepath = path.join(process.cwd(), 'public', 'coins-snapshot.json')
  try {
    if (!fs.existsSync(filepath)) {
      console.warn('coins-snapshot.json does not exist — coin pages will fail until snapshot is built')
      return null
    }
    const raw = fs.readFileSync(filepath, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load coins-snapshot.json:', err.message)
    return null
  }
}

function ensureLoaded() {
  const now = Date.now()
  if (cachedSnapshot && (now - lastReadTime) < RE_READ_INTERVAL_MS) {
    return cachedSnapshot
  }
  const snapshot = loadFromDisk()
  if (snapshot) {
    cachedSnapshot = snapshot
    cachedMap = new Map()
    if (Array.isArray(snapshot.coins)) {
      for (const c of snapshot.coins) {
        if (c?.id) cachedMap.set(c.id, c)
      }
    }
    lastReadTime = now
  }
  return cachedSnapshot
}

// Get one coin by id from the snapshot. Returns null if not found.
export function getCoinFromSnapshot(id) {
  ensureLoaded()
  if (!cachedMap) return null
  return cachedMap.get(id) || null
}

// Check if a coin exists in the snapshot
export function snapshotHasCoin(id) {
  ensureLoaded()
  return cachedMap ? cachedMap.has(id) : false
}

// Get all snapshotted coin IDs (used by getStaticPaths if we ever pre-build)
export function getAllSnapshotIds() {
  ensureLoaded()
  return cachedMap ? Array.from(cachedMap.keys()) : []
}

// Get snapshot metadata (when it was generated, total count)
export function getSnapshotMeta() {
  const s = ensureLoaded()
  if (!s) return null
  return {
    generated_at: s.generated_at,
    total_coins: s.total_coins,
  }
}
