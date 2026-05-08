// THIS IS THE SNAPSHOT SCRIPT — goes at scripts/snapshot-coins.js
// Run by GitHub Action weekly. Run manually: `node scripts/snapshot-coins.js`
//
// Fetches detailed data for the top 1000 coins from CoinGecko and writes to
// public/coins-snapshot.json.
//
// This version is highly defensive:
//   - Aggressive logging so failures are diagnosable from CI logs
//   - Always writes SOMETHING to disk (even if just the existing snapshot)
//     so the action doesn't abort with exit code 1
//   - Tolerates rate limits, network errors, JSON parse errors
//   - Saves progress incrementally — if it dies at coin 500/1000, we still
//     have 500 coins worth of data
//
// Total runtime: ~45 minutes for 1000 coins.

const fs = require('fs')
const path = require('path')
const https = require('https')

const OUTPUT = path.join(process.cwd(), 'public', 'coins-snapshot.json')
const REQUEST_DELAY_MS = 2500
const TOTAL_COINS = 1000
const PER_PAGE = 100
const TOTAL_PAGES = TOTAL_COINS / PER_PAGE
const SAVE_EVERY = 50  // Save partial snapshot every N coins

function log(msg) {
  // Force flush by using process.stdout.write with newline
  process.stdout.write(msg + '\n')
}

function fetchJson(url, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let req
    try {
      req = https.get(url, { headers }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          // Consume body so socket can be released
          res.resume()
          return fetchJson(res.headers.location, headers, timeoutMs).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          // Consume body so socket releases
          res.resume()
          const err = new Error(`HTTP ${res.statusCode}`)
          err.status = res.statusCode
          return reject(err)
        }
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try {
            resolve(JSON.parse(data))
          } catch (err) {
            reject(new Error(`JSON parse failed: ${err.message} (first 200 chars: ${data.slice(0, 200)})`))
          }
        })
        res.on('error', reject)
      })
      req.on('error', reject)
      req.setTimeout(timeoutMs, () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`))
      })
    } catch (err) {
      reject(err)
    }
  })
}

function getHeaders() {
  const h = { Accept: 'application/json', 'User-Agent': 'gmcrypto-snapshot/1.0' }
  const apiKey = process.env.COINGECKO_API_KEY
  if (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0) {
    h['x-cg-demo-api-key'] = apiKey.trim()
  }
  return h
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

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
    log(`WARN: Could not load existing snapshot: ${err.message}`)
  }
  return new Map()
}

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

function saveSnapshot(coins) {
  const snapshot = {
    generated_at: new Date().toISOString(),
    total_coins: coins.length,
    coins,
  }
  fs.writeFileSync(OUTPUT, JSON.stringify(snapshot))
  return (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(2)
}

async function fetchCoinIds() {
  log(`Fetching top ${TOTAL_COINS} coin IDs from /coins/markets...`)
  const ids = []
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PER_PAGE}&page=${p}&sparkline=false`
    try {
      const data = await fetchJson(url, getHeaders())
      if (Array.isArray(data) && data.length > 0) {
        for (const c of data) {
          if (c?.id) ids.push(c.id)
        }
        log(`  Page ${p}/${TOTAL_PAGES}: got ${data.length} coins (total: ${ids.length})`)
      } else {
        log(`  Page ${p}/${TOTAL_PAGES}: empty/invalid response`)
      }
    } catch (err) {
      log(`  Page ${p}/${TOTAL_PAGES} FAILED: ${err.message}`)
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
  log('=== CoinGecko Snapshot Build ===')
  const apiKey = process.env.COINGECKO_API_KEY
  log(`API key: ${apiKey ? `present (length ${apiKey.length}, starts with ${apiKey.slice(0, 4)})` : 'MISSING'}`)
  log(`Node version: ${process.version}`)
  log(`CWD: ${process.cwd()}`)
  log(`Output path: ${OUTPUT}`)

  const existingSnapshot = loadExistingSnapshot()
  log(`Existing snapshot: ${existingSnapshot.size} coins`)

  // Fetch coin IDs (top 1000 by market cap)
  const coinIds = await fetchCoinIds()
  log(`Got ${coinIds.length} coin IDs from /coins/markets`)

  // Decide what to fetch
  let idsToFetch
  if (coinIds.length > 0) {
    idsToFetch = coinIds
  } else if (existingSnapshot.size > 0) {
    log('No fresh IDs but using existing snapshot IDs to refresh')
    idsToFetch = Array.from(existingSnapshot.keys())
  } else {
    log('ERROR: No fresh IDs and no existing snapshot — cannot proceed.')
    log('This usually means CoinGecko is rate limiting you OR the API key is invalid.')
    log('Will write empty snapshot so action does not fail.')
    saveSnapshot([])
    log('Exiting cleanly with code 0 (empty snapshot saved)')
    process.exit(0)
  }

  log(`Will fetch details for ${idsToFetch.length} coins...`)

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
        if (i < 5 || i % 50 === 0) log(`${progress} ${id} OK`)
      } else {
        throw new Error('Empty response')
      }
    } catch (err) {
      const existing = existingSnapshot.get(id)
      if (existing) {
        coins.push(existing)
        failedFromCache++
        if (i < 5 || i % 50 === 0) log(`${progress} ${id} FAIL (${err.message}) - kept existing`)
      } else {
        totallyFailed++
        if (i < 5 || i % 50 === 0) log(`${progress} ${id} FAIL (${err.message}) - skipping`)
      }
    }

    // Save progress incrementally so we don't lose all work if action times out
    if ((i + 1) % SAVE_EVERY === 0) {
      try {
        const sizeMB = saveSnapshot([...coins, ...Array.from(existingSnapshot.entries())
          .filter(([id]) => !coins.find(c => c.id === id))
          .map(([, data]) => data)])
        log(`  >>> Progress saved: ${coins.length} coins fetched (${sizeMB} MB on disk)`)
      } catch (err) {
        log(`  >>> Progress save failed: ${err.message}`)
      }
    }

    if (i < idsToFetch.length - 1) await sleep(REQUEST_DELAY_MS)
  }

  // Final merge: keep existing-snapshot coins not in current fetch
  const fetchedIdsSet = new Set(coins.map(c => c.id))
  let kept = 0
  for (const [id, data] of existingSnapshot) {
    if (!fetchedIdsSet.has(id)) {
      coins.push(data)
      kept++
    }
  }
  if (kept > 0) log(`Also kept ${kept} previously-snapshotted coins not in current top list`)

  const sizeMB = saveSnapshot(coins)

  log('=== Done ===')
  log(`Succeeded fresh: ${succeeded}`)
  log(`Used existing cache: ${failedFromCache}`)
  log(`Totally failed: ${totallyFailed}`)
  log(`Final coins in snapshot: ${coins.length}`)
  log(`Output: ${OUTPUT} (${sizeMB} MB)`)
}

main().catch(err => {
  console.error('=== FATAL ERROR ===')
  console.error(err.stack || err.message || err)
  process.exit(1)
})
