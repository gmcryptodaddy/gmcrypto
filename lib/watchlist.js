// lib/watchlist.js
// A tiny localStorage-backed watchlist of coins (no accounts needed — it's
// per-browser). Components subscribe to stay in sync, including across tabs.
//
// Stored shape: [{ id, symbol, name }]  (id is the CoinGecko id used in URLs)

const KEY = 'gm_watchlist_v1'
const listeners = new Set()

function read() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {}
  listeners.forEach(fn => { try { fn(list) } catch {} })
}

export function getWatchlist() {
  return read()
}

export function isWatched(id) {
  if (!id) return false
  return read().some(c => c.id === id)
}

export function toggleWatch(coin) {
  if (!coin || !coin.id) return read()
  const list = read()
  const i = list.findIndex(c => c.id === coin.id)
  if (i >= 0) {
    list.splice(i, 1)
  } else {
    list.unshift({
      id: coin.id,
      symbol: (coin.symbol || '').toLowerCase(),
      name: coin.name || coin.id,
    })
  }
  write(list)
  return list
}

export function removeWatch(id) {
  write(read().filter(c => c.id !== id))
}

// Subscribe to changes. Returns an unsubscribe function.
export function subscribe(fn) {
  listeners.add(fn)
  const onStorage = (e) => { if (e.key === KEY) fn(read()) }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(fn)
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage)
  }
}
