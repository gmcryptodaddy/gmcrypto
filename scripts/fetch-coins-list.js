// scripts/fetch-coins-list.js
// Runs at BUILD TIME (via "prebuild" hook in package.json).
// Downloads CoinGecko's /coins/list (~14k coins, ~1MB) and writes it to
// public/coins-list.json so the markets page can do instant client-side
// search without hitting the API on every keystroke.
//
// If the fetch fails (network, rate limit, etc.), we keep the existing file
// so builds don't break — the search just uses slightly stale data.

const fs = require('fs')
const path = require('path')
const https = require('https')

const OUTPUT = path.join(process.cwd(), 'public', 'coins-list.json')
const URL = 'https://api.coingecko.com/api/v3/coins/list'

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch (err) { reject(err) }
      })
    }).on('error', reject)
  })
}

async function main() {
  const headers = { Accept: 'application/json' }
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY
  }

  try {
    console.log('Fetching CoinGecko coins list...')
    const coins = await fetchJson(URL, headers)
    if (!Array.isArray(coins) || coins.length === 0) {
      throw new Error('Got empty or invalid response')
    }
    // Strip platforms field — we only need id/symbol/name for search.
    // Saves ~50% of file size.
    const trimmed = coins.map(c => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
    }))
    fs.writeFileSync(OUTPUT, JSON.stringify(trimmed))
    console.log(`✓ Wrote ${trimmed.length} coins to public/coins-list.json`)
  } catch (err) {
    console.warn(`⚠ Failed to fetch coins list: ${err.message}`)
    // Don't fail the build — keep existing file if any
    if (fs.existsSync(OUTPUT)) {
      console.warn('  Using existing public/coins-list.json')
    } else {
      // First-ever build: write empty array so the file exists
      fs.writeFileSync(OUTPUT, '[]')
      console.warn('  Wrote empty placeholder; search will be limited until next successful build')
    }
  }
}

main()
