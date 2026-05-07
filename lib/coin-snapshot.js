// scripts/snapshot-coins.js
//
// Fetches detailed data for the top 1000 coins from CoinGecko and writes to
// public/coins-snapshot.json. This is the "static" data that doesn't change
// often: name, symbol, description, links, logo, ATH, ATL, supply info, etc.
//
// Run by GitHub Action weekly (see .github/workflows/snapshot-coins.yml).
// Can also be run manually: `node scripts/snapshot-coins.js`
//
// Why this exists: hitting CoinGecko's /coins/{id} endpoint per page view
// burns through the Demo plan rate limit quickly. By snapshotting once per
// week, we serve all the static data from disk → zero API calls per visit.
//
// The script:
//   1. Fetches /coins/markets pages 1-10 to get the list of top 1000 coin IDs
//   2. For each coin, fetches /coins/{id} for full details
//   3. Spaces requests at 2.5 sec intervals to stay under 30/min Demo limit
//   4. Writes consolidated snapshot to public/coins-snapshot.json
//   5. If a coin fetch fails, keeps any existing data for that coin from
//      the previous snapshot — so we never lose data, only refresh it
//
// Total runtime: ~45 minutes for 1000 coins. GitHub Actions free tier limit
// is 2000 minutes/month, so weekly runs use ~3 hours/month — well under.

const fs = require('fs')
const path = require('path')
const https = require('https')

const OUTPUT = path.join(process.cwd(), 'public', 'coins-snapshot.json')
const REQUEST_DELAY_MS = 2500    // 2.5 sec between calls = 24/min, under 30/min limit
const TOTAL_COINS = 1000          // Top N coins to snapshot
const PER_PAGE = 100
const TOTAL_PAGES = TOTAL_COINS / PER_PAGE

function fetchJson(url, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchJson(res.headers.location, headers, timeoutMs).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        const err = new Error(`HTTP ${res.statusCode}`)
        err.status = res.statusCode
        return reject(err)
      }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (err) { reject(err) }
      })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timed out'))
    })
  })
}

function getHeaders() {
  const h = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    h['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }
  return h
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// Load existing snapshot to fall back to if any coin fails to refresh.
function loadExistingSnapshot() {
  try {
    if (fs.existsSync(OUTPUT)) {
      const raw = fs.readFileSync(OUTPUT, 'utf8')
      const parsed = JSON.parse(raw)
      const map = new Map()
      if (Array.isArray(parsed?.coins)) {
        for (const c of parsed.coins) {
          if (c?.id) map.set(c.id, c)
        }
      }
      return map
    }
  } catch (err) {
    console.warn('Could not load existing snapshot:', err.message)
  }
  return new Map()
}

// Trim coin object to just what the page needs. Saves 80% of file size.
function trimCoinForSnapshot(coin) {
  if (!coin || !coin.id) return null
  const md = coin.market_data || {}
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: coin.image?.large || coin.image?.small || coin.image?.thumb || null,
    market_cap_rank: coin.market_cap_rank || null,
    categories: Array.isArray(coin.categories) ? coin.categories.slice(0, 3) : [],
    description_en: (coin.description?.en || '').slice(0, 3000),
    links: {
      homepage: coin.links?.homepage?.[0] || null,
      twitter_screen_name: coin.links?.twitter_screen_name || null,
      github: coin.links?.repos_url?.github?.[0] || null,
      subreddit_url: coin.links?.subreddit_url || null,
      whitepaper: coin.links?.whitepaper || null,
    },
    market_data: {
      ath_usd: md.ath?.usd ?? null,
      ath_change_percentage_usd: md.ath_change_percentage?.usd ?? null,
      ath_date_usd: md.ath_date?.usd ?? null,
      atl_usd: md.atl?.usd ?? null,
      atl_change_percentage_usd: md.atl_change_percentage?.usd ?? null,
      atl_date_usd: md.atl_date?.usd ?? null,
      circulating_supply: md.circulating_supply ?? null,
      total_supply: md.total_supply ?? null,
      max_supply: md.max_supply ?? null,
    },
    genesis_date: coin.genesis_date || null,
    hashing_algorithm: coin.hashing_algorithm || null,
  }
}

async function fetchCoinIds() {
  console.log(`Fetching top ${TOTAL_COINS} coin IDs from /coins/markets...`)
  const ids = []
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PER_PAGE}&page=${p}&sparkline=false`
    try {
      const data = await fetchJson(url, getHeaders())
      if (Array.isArray(data)) {
        for (const c of data) {
          if (c?.id) ids.push(c.id)
        }
      }
      console.log(`  Page ${p}/${TOTAL_PAGES}: got ${data.length} coins (total: ${ids.length})`)
    } catch (err) {
      console.warn(`  Page ${p} failed: ${err.message} (will use existing data for these)`)
    }
    if (p < TOTAL_PAGES) await sleep(REQUEST_DELAY_MS)
  }
  return ids
}

async function fetchCoinDetail(id) {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  return fetchJson(url, getHeaders())
}

async function main() {
  console.log('=== CoinGecko Snapshot Build ===')
  console.log(`API key: ${process.env.COINGECKO_API_KEY ? 'present' : 'MISSING (will be slower)'}`)

  const existingSnapshot = loadExistingSnapshot()
  console.log(`Existing snapshot: ${existingSnapshot.size} coins`)

  const coinIds = await fetchCoinIds()
  if (coinIds.length === 0 && existingSnapshot.size === 0) {
    console.error('No coin IDs fetched and no existing data — aborting.')
    process.exit(1)
  }

  // If we got fewer IDs than expected, use existing snapshot's IDs as fallback
  // so we don't shrink the snapshot unnecessarily.
  const idsToFetch = coinIds.length > 0 ? coinIds : Array.from(existingSnapshot.keys())
  console.log(`Will fetch details for ${idsToFetch.length} coins...`)

  const coins = []
  let succeeded = 0
  let failedFromCache = 0
  let totallyFailed = 0

  for (let i = 0; i < idsToFetch.length; i++) {
    const id = idsToFetch[i]
    const progress = `[${i + 1}/${idsToFetch.length}]`

    try {
      const detail = await fetchCoinDetail(id)
      const trimmed = trimCoinForSnapshot(detail)
      if (trimmed) {
        coins.push(trimmed)
        succeeded++
        if (i % 50 === 0) console.log(`${progress} ✓ ${id}`)
      } else {
        throw new Error('Empty response')
      }
    } catch (err) {
      // On error, keep existing data if we have any
      const existing = existingSnapshot.get(id)
      if (existing) {
        coins.push(existing)
        failedFromCache++
        console.log(`${progress} ⚠ ${id} failed (${err.message}) — kept existing`)
      } else {
        totallyFailed++
        console.log(`${progress} ✗ ${id} failed (${err.message}) — no existing, skipping`)
      }
    }

    if (i < idsToFetch.length - 1) await sleep(REQUEST_DELAY_MS)
  }

  // Also include any coins in existing snapshot that weren't in current fetch
  // (e.g., dropped out of top 1000 — we keep them so old URLs still work)
  const fetchedIdsSet = new Set(coins.map(c => c.id))
  let kept = 0
  for (const [id, data] of existingSnapshot) {
    if (!fetchedIdsSet.has(id)) {
      coins.push(data)
      kept++
    }
  }
  if (kept > 0) console.log(`Also kept ${kept} previously-snapshotted coins not in current top list`)

  const snapshot = {
    generated_at: new Date().toISOString(),
    total_coins: coins.length,
    coins,
  }

  fs.writeFileSync(OUTPUT, JSON.stringify(snapshot))
  const sizeMB = (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2)

  console.log('=== Done ===')
  console.log(`✓ Succeeded: ${succeeded}`)
  console.log(`⚠ Used cache: ${failedFromCache}`)
  console.log(`✗ Failed: ${totallyFailed}`)
  console.log(`📦 Output: ${OUTPUT} (${sizeMB} MB)`)
}

main().catch(err => {
  console.error('Snapshot script failed:', err)
  process.exit(1)
})
