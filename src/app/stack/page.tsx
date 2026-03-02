'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

const GROUPS = [
  { type: 'Pokémon', cards: [{ name: 'Charizard Holo', value: 4200, condition: 'NM' }, { name: 'Blastoise Holo', value: 1800, condition: 'EX' }] },
  { type: 'MTG', cards: [{ name: 'Black Lotus', value: 6800, condition: 'EX' }, { name: 'Mox Sapphire', value: 3400, condition: 'GD' }] },
  { type: 'Basketball', cards: [{ name: 'Jordan RC', value: 2100, condition: 'NM' }, { name: 'LeBron RC', value: 1800, condition: 'EX' }] },
]

export default function Stack() {
  const [mode, setMode] = useState<'portfolio'|'sell'>('portfolio')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  const allCards = GROUPS.flatMap(g => g.cards)
  const grandTotal = allCards.reduce((s, c) => s + c.value, 0)
  const sellTotal = Array.from(selected).reduce((s, name) => {
    const c = allCards.find(c => c.name === name)
    return s + (c ? Math.round(c.value * 0.85) : 0)
  }, 0)

  function toggleSelect(name: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(name) ? n.delete(name) : n.add(name)
      return n
    })
  }

  function copyListing() {
    const lines = Array.from(selected).map(name => {
      const c = allCards.find(c => c.name === name)!
      return `${name} (${c.condition}) — $${Math.round(c.value * 0.85)}`
    })
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <main className="page">
      {/* Toggle */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 12, padding: 4, marginBottom: 20, border: '1px solid var(--border)' }}>
        {(['portfolio','sell'] as const).map(m => (
          <motion.button key={m} onClick={() => setMode(m)}
            style={{ flex: 1, padding: '10px', borderRadius: 10, fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--gold)' : 'transparent',
              color: mode === m ? '#000' : 'var(--muted)' }}
            whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
            {m === 'portfolio' ? '📊 Portfolio' : '🏷️ Sell Mode'}
          </motion.button>
        ))}
      </div>

      {loading ? (
        [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 12 }} />)
      ) : mode === 'portfolio' ? (
        <>
          {GROUPS.map(g => (
            <div key={g.type} className="card" style={{ padding: '1rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontWeight: 700 }}>{g.type}</p>
                <p style={{ color: 'var(--gold)', fontWeight: 700 }}>${g.cards.reduce((s,c)=>s+c.value,0).toLocaleString()}</p>
              </div>
              {g.cards.map(c => (
                <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 13 }}>{c.name}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>${c.value.toLocaleString()}</p>
                </div>
              ))}
            </div>
          ))}
          <div className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 700 }}>Grand Total</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)' }}>${grandTotal.toLocaleString()}</p>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Select cards to generate a listing at 85% market value</p>
          {allCards.map(c => (
            <motion.div key={c.name} className="card" style={{ padding: '0.875rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => toggleSelect(c.name)}
              whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
              <div style={{ width: 22, height: 22, borderRadius: 8, border: `2px solid ${selected.has(c.name) ? 'var(--gold)' : 'var(--border)'}`,
                background: selected.has(c.name) ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected.has(c.name) && <span style={{ fontSize: 12, color: '#000', fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</p>
                <p style={{ fontSize: 11, color: 'var(--muted)' }}>Market: ${c.value.toLocaleString()}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>${Math.round(c.value * 0.85).toLocaleString()}</p>
            </motion.div>
          ))}
          {selected.size > 0 && (
            <div style={{ position: 'sticky', bottom: 'calc(4.5rem + env(safe-area-inset-bottom,0px) + 0.75rem)', padding: '1rem', background: 'rgba(13,22,41,0.97)', borderRadius: 16, border: '1px solid var(--border)', backdropFilter: 'blur(24px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{selected.size} card{selected.size > 1 ? 's' : ''} selected</p>
                <p style={{ fontWeight: 700, color: 'var(--gold)' }}>${sellTotal.toLocaleString()}</p>
              </div>
              <motion.button onClick={copyListing}
                style={{ width: '100%', padding: '13px', borderRadius: 12, background: copied ? '#22c55e' : 'var(--gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15 }}
                whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                {copied ? '✓ Copied!' : '📋 Copy Listing'}
              </motion.button>
            </div>
          )}
        </>
      )}

      <BottomNav />
    </main>
  )
}
