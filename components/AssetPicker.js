// components/AssetPicker.js
// Dropdown for choosing an asset in the market-cap calculator. Supports one or
// more tabbed groups (e.g. Crypto / Stocks), each a list of rows with a logo,
// name, and ticker. Closes on outside-click or Escape.

import { useState, useEffect, useRef } from 'react'

function AssetLogo({ item }) {
  const [failed, setFailed] = useState(false)
  const src = item.image || item.logo
  if (item.icon) return <span className="apick-logo apick-logo-emoji">{item.icon}</span>
  if (src && !failed) {
    return <img className="apick-logo" src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
  }
  return <span className="apick-logo apick-logo-fallback">{(item.sub || item.name || '?').slice(0, 1)}</span>
}

function findItem(groups, id) {
  for (const g of groups) {
    const hit = g.items.find(it => it.id === id)
    if (hit) return hit
  }
  return null
}

export default function AssetPicker({ groups, selectedId, onSelect, label, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(groups[0]?.key)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = findItem(groups, selectedId)
  const activeGroup = groups.find(g => g.key === tab) || groups[0]

  return (
    <div className="apick-field">
      {label && <div className="apick-label">{label}</div>}
      <div className="apick" ref={ref}>
        <button type="button" className="apick-button" onClick={() => setOpen(o => !o)} aria-expanded={open}>
          {selected ? (
            <span className="apick-button-sel">
              <AssetLogo item={selected} />
              <span className="apick-button-name">{selected.name}</span>
              {selected.sub && <span className="apick-button-sub">{selected.sub}</span>}
            </span>
          ) : (
            <span className="apick-button-placeholder">{placeholder}</span>
          )}
          <span className={`apick-chevron${open ? ' up' : ''}`} aria-hidden="true">⌄</span>
        </button>

        {open && (
          <div className="apick-panel">
            {groups.length > 1 && (
              <div className="apick-tabs">
                {groups.map(g => (
                  <button
                    key={g.key}
                    type="button"
                    className={`apick-tab${tab === g.key ? ' active' : ''}`}
                    onClick={() => setTab(g.key)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            )}
            <div className="apick-list">
              {activeGroup?.items.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`apick-row${selectedId === item.id ? ' selected' : ''}`}
                  onClick={() => { onSelect(item.id); setOpen(false) }}
                >
                  <AssetLogo item={item} />
                  <span className="apick-row-name">{item.name}</span>
                  {item.sub && <span className="apick-row-sub">{item.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
