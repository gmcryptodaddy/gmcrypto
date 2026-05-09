// THIS IS THE SNAPSHOT SCRIPT — goes at scripts/snapshot-coins.js
// Run by GitHub Action weekly. Run manually: `node scripts/snapshot-coins.js`
//
// Fetches top 200 coins from CoinGecko, writes public/coins-snapshot.json.
//
// Why top 200:
//   - 200 × 5s delay = ~17 min minimum (well under timeout, even with retries)
//   - Top 200 covers ~99% of search traffic
//   - For coins outside top 200, [coin].js falls back to live CoinGecko fetch
//
// Defensive features:
//   - 5 second delay between calls (12/min, well under 30/min Demo limit)
//   - 3 retries per coin with backoff on rate limits
//   - Saves progress every 25 coins
//   - Always writes a snapshot file (never aborts with no data)
//   - Aggressive logging for debugging

const fs = require('fs')
const path = require('path')
const https = require('https')

const OUTPUT = path.join(process.cwd(), 'public', 'coins-snapshot.json')
const REQUEST_DELAY_MS = 5000        // 5 sec between requests = 12/min, safe
const RETRY_DELAY_MS = 30000         // 30 sec wait after rate-limit
const MAX_RETRIES = 3
const TOTAL_COINS = 200              // Top N coins to snapshot
const PER_PAGE = 100
const TOTAL_PAGES = TOTAL_COINS / PER_PAGE
const SAVE_EVERY = 25

function log(msg) {
  process.stdout.write(`[${new Date().toISOString()}] ${msg}\n`)
}

function fetchJson(url, headers = {}, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let req
    try {
      req = https.get(url, { headers }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          res.resume()
          return fetchJson(res.headers.location, headers, timeoutMs).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
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
            reject(new Error(`JSON parse failed: ${err.message}`))
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

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
    log(`WARN: could not load existing snapshot: ${err.message}`)
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

async function fetchCoinDetailWithRetry(id) {
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`
  let lastErr
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetchJson(url, getHeaders())
    } catch (err) {
      lastErr = err
      if (err.status === 404) throw err
      if (err.status === 429) {
        log(`    rate-limited on ${id}, waiting ${RETRY_DELAY_MS / 1000}s before retry ${attempt}/${MAX_RETRIES}`)
        await sleep(RETRY_DELAY_MS)
      } else if (attempt < MAX_RETRIES) {
        const wait = 5000 * attempt
        log(`    ${id} attempt ${attempt} failed (${err.message}), retrying in ${wait}ms`)
        await sleep(wait)
      }
    }
  }
  throw lastErr
}

async function fetchCoinIds() {
  log(`Fetching top ${TOTAL_COINS} coin IDs from /coins/markets...`)
  const ids = []
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PER_PAGE}&page=${p}&sparkline=false`
    let success = false
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await fetchJson(url, getHeaders())
        if (Array.isArray(data) && data.length > 0) {
          for (const c of data) {
            if (c?.id) ids.push(c.id)
          }
          log(`  Page ${p}/${TOTAL_PAGES}: got ${data.length} coins (total: ${ids.length})`)
          success = true
          break
        } else {
          log(`  Page ${p} attempt ${attempt}: empty response, retrying`)
        }
      } catch (err) {
        log(`  Page ${p} attempt ${attempt} FAILED: ${err.message}`)
        if (err.status === 429) await sleep(RETRY_DELAY_MS)
      }
      if (attempt < MAX_RETRIES) await sleep(5000)
    }
    if (!success) log(`  Page ${p} gave up after ${MAX_RETRIES} attempts`)
    if (p < TOTAL_PAGES) await sleep(REQUEST_DELAY_MS)
  }
  return ids
}

async function main() {
  log('=== CoinGecko Snapshot Build ===')
  const apiKey = process.env.COINGECKO_API_KEY
  log(`API key: ${apiKey ? `present (length ${apiKey.length})` : 'MISSING'}`)
  log(`Node: ${process.version}, Output: ${OUTPUT}`)

  const existingSnapshot = loadExistingSnapshot()
  log(`Existing snapshot: ${existingSnapshot.size} coins`)

  const coinIds = await fetchCoinIds()
  log(`Got ${coinIds.length} coin IDs`)

  let idsToFetch
  if (coinIds.length > 0) {
    idsToFetch = coinIds
  } else if (existingSnapshot.size > 0) {
    log('No fresh IDs but using existing snapshot IDs')
    idsToFetch = Array.from(existingSnapshot.keys()).slice(0, TOTAL_COINS)
  } else {
    log('ERROR: no fresh IDs and no existing snapshot')
    log('Writing empty snapshot so action does not fail')
    saveSnapshot([])
    process.exit(0)
  }

  const expectedMin = Math.round(idsToFetch.length * REQUEST_DELAY_MS / 1000 / 60)
  log(`Will fetch details for ${idsToFetch.length} coins (~${expectedMin} min minimum)`)

  const coins = []
  let succeeded = 0, failedFromCache = 0, totallyFailed = 0

  for (let i = 0; i < idsToFetch.length; i++) {
    const id = idsToFetch[i]
    const progress = `[${i + 1}/${idsToFetch.length}]`

    try {
      const detail = await fetchCoinDetailWithRetry(id)
      const trimmed = trimCoinForSnapshot(detail)
      if (trimmed) {
        coins.push(trimmed)
        succeeded++
        if (i < 10 || i % 25 === 0) log(`${progress} ${id} OK`)
      } else {
        throw new Error('Empty/invalid response')
      }
    } catch (err) {
      const existing = existingSnapshot.get(id)
      if (existing) {
        coins.push(existing)
        failedFromCache++
        log(`${progress} ${id} FAIL (${err.message}) - kept existing`)
      } else {
        totallyFailed++
        log(`${progress} ${id} FAIL (${err.message}) - skipping`)
      }
    }

    if ((i + 1) % SAVE_EVERY === 0) {
      try {
        const sizeMB = saveSnapshot(coins)
        log(`  >>> Progress saved: ${coins.length} coins (${sizeMB} MB)`)
      } catch (err) {
        log(`  >>> Save failed: ${err.message}`)
      }
    }

    if (i < idsToFetch.length - 1) await sleep(REQUEST_DELAY_MS)
  }

  // Keep coins from existing snapshot that aren't in current top list
  const fetchedIdsSet = new Set(coins.map(c => c.id))
  let kept = 0
  for (const [id, data] of existingSnapshot) {
    if (!fetchedIdsSet.has(id)) {
      coins.push(data)
      kept++
    }
  }
  if (kept > 0) log(`Kept ${kept} previously-snapshotted coins not in current top list`)

  const sizeMB = saveSnapshot(coins)
  log('=== Done ===')
  log(`Succeeded fresh: ${succeeded}`)
  log(`Used cache: ${failedFromCache}`)
  log(`Failed: ${totallyFailed}`)
  log(`Total in snapshot: ${coins.length}`)
  log(`Size: ${sizeMB} MB`)
}

main().catch(err => {
  console.error('=== FATAL ERROR ===')
  console.error(err.stack || err.message || err)
  process.exit(1)
})
