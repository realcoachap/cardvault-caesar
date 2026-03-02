'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

type Card = { id: number; name: string; set: string; type: string; value: number; condition: 'MT'|'NM'|'EX'|'GD'|'PO'; img: string; sparkline: number[] }

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'mtg', label: 'MTG' },
  { key: 'basketball', label: 'Basketball' },
  { key: 'comics', label: 'Comics' },
]
const SORTS = [
  { key: 'value', label: 'Value' },
  { key: 'name', label: 'Name' },
  { key: 'recent', label: 'Recent' },
  { key: 'condition', label: 'Condition' },
]
const CONDITION_COLORS: Record<string, string> = {
  MT: '#a855f7', NM: '#22c55e', EX: '#f59e0b', GD: 'rgba(255,255,255,0.50)', PO: '#ef4444'
}

const CARDS: Card[] = [
  { id:1, name:'Charizard Holo', set:'Base Set', type:'all', value:4200, condition:'NM', img:'🔥', sparkline:[3800,3900,4100,4050,4200] },
  { id:2, name:'Black Lotus', set:'Alpha', type:'mtg', value:6800, condition:'EX', img:'🌸', sparkline:[6200,6400,6600,6750,6800] },
  { id:3, name:'Jordan RC', set:'1986 Fleer', type:'basketball', value:2100, condition:'NM', img:'🏀', sparkline:[2200,2150,2050,2080,2100] },
  { id:4, name:'Mox Sapphire', set:'Beta', type:'mtg', value:3400, condition:'GD', img:'💎', sparkline:[3000,3100,3300,3350,3400] },
  { id:5, name:'LeBron RC', set:'2003 Topps', type:'basketball', value:1800, condition:'EX', img:'👑', sparkline:[1600,1700,1750,1780,1800] },
  { id:6, name:'Amazing Fantasy #15', set:'1962', type:'comics', value:9200, condition:'GD', img:'🕷️', sparkline:[8800,9000,9100,9150,9200] },
]

function Sparkline({ data }: { data: number[] }) {
  const min = Math.min(...data), max = Math.max(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length-1)) * 60
    const y = 20 - ((v - min) / (max - min + 1)) * 18
    return `${x},${y}`
  }).join(' ')
  const trend = data[data.length-1] >= data[0]
  return (
    <svg width="60" height="22" viewBox="0 0 60 22">
      <polyline points={pts} fill="none" stroke={trend ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function Binder() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('value')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Card | null>(null)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  const filtered = CARDS
    .filter(c => filter === 'all' || c.type === filter)
    .sort((a, b) => sort === 'value' ? b.value - a.value : sort === 'name' ? a.name.localeCompare(b.name) : 0)

  return (
    <main className="page">
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
        {FILTERS.map(f => (
          <motion.button key={f.key} className={`pill pill-${filter === f.key ? 'active' : 'inactive'}`}
            onClick={() => setFilter(f.key)} whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
            {f.label}
          </motion.button>
        ))}
      </div>

      {/* Sort pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
        {SORTS.map(s => (
          <motion.button key={s.key} className={`pill pill-${sort === s.key ? 'active' : 'inactive'}`}
            onClick={() => setSort(s.key)} whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
            {s.label}
          </motion.button>
        ))}
      </div>

      {/* 2-col grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton tile" style={{ borderRadius: 16 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>🔍</p>
          <p style={{ fontWeight: 600 }}>No {filter} cards yet</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Scan a card to add it</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {filtered.map(card => (
            <motion.div key={card.id} className="card tile" style={{ padding: '0.75rem', cursor: 'pointer' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              onClick={() => setSelected(card)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 24 }}>{card.img}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)', color: CONDITION_COLORS[card.condition] }}>
                  {card.condition}
                </span>
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, marginTop: 8, lineHeight: 1.3 }}>{card.name}</p>
              <p style={{ fontSize: 10, color: 'var(--muted)' }}>{card.set}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)', marginTop: 4 }}>
                ${card.value.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Bottom sheet */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
              <div className="sheet-handle" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 700 }}>{selected.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>{selected.set}</p>
                </div>
                <span style={{ fontSize: 36 }}>{selected.img}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p className="label">Market Value</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)' }}>${selected.value.toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="label">Trend (5d)</p>
                  <Sparkline data={selected.sparkline} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'rgba(245,158,11,0.15)', color: 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600, cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                  Price History
                </motion.button>
                <motion.button style={{ flex: 1, padding: '12px', borderRadius: 12, background: 'var(--gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                  Add to Sell List
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <button className="fab" onClick={() => {}} aria-label="Add card">＋</button>
      <BottomNav />
    </main>
  )
}
