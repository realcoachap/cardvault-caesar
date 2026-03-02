'use client'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

type Card = { id: number; name: string; set: string; type: string; value: number; condition: string; img: string; sparkline: number[] }

// Same CARDS data as binder — no separate file per spec
const CARDS: Card[] = [
  { id:1, name:'Charizard Holo',    set:'Base Set',    type:'all',        value:4200, condition:'NM', img:'🔥', sparkline:[3800,3900,4100,4050,4200] },
  { id:2, name:'Black Lotus',       set:'Alpha',       type:'mtg',        value:6800, condition:'EX', img:'🌸', sparkline:[6200,6400,6600,6750,6800] },
  { id:3, name:'Jordan RC',         set:'1986 Fleer',  type:'basketball', value:2100, condition:'NM', img:'🏀', sparkline:[2200,2150,2050,2080,2100] },
  { id:4, name:'Mox Sapphire',      set:'Beta',        type:'mtg',        value:3400, condition:'GD', img:'💎', sparkline:[3000,3100,3300,3350,3400] },
  { id:5, name:'LeBron RC',         set:'2003 Topps',  type:'basketball', value:1800, condition:'EX', img:'👑', sparkline:[1600,1700,1750,1780,1800] },
  { id:6, name:'Amazing Fantasy #15',set:'1962',       type:'comics',     value:9200, condition:'GD', img:'🕷️', sparkline:[8800,9000,9100,9150,9200] },
]

const RARE_TYPES = ['holo', 'rare']

function SummaryCard({ icon, value, label, delay }: { icon: string; value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320, delay }}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '1px solid var(--gold-dim)', pointerEvents: 'none' }} />
      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{label}</div>
    </motion.div>
  )
}

export default function Stats() {
  const totalValue = CARDS.reduce((s, c) => s + c.value, 0)
  const totalCards = CARDS.length
  const rareCards = CARDS.filter(c => RARE_TYPES.some(r => c.name.toLowerCase().includes(r))).length
  const mostValuable = Math.max(...CARDS.map(c => c.value))

  const top5 = [...CARDS].sort((a, b) => b.value - a.value).slice(0, 5)

  const typeCounts = CARDS.reduce<Record<string, number>>((acc, c) => {
    const t = c.type === 'all' ? 'Pokemon' : c.type.charAt(0).toUpperCase() + c.type.slice(1)
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {})

  const summaryCards = [
    { icon: '💰', value: `$${totalValue.toLocaleString()}`, label: 'Total Value',    delay: 0.05 },
    { icon: '🃏', value: String(totalCards),                 label: 'Total Cards',   delay: 0.10 },
    { icon: '⭐', value: String(rareCards),                  label: 'Rare Cards',    delay: 0.15 },
    { icon: '📈', value: `$${mostValuable.toLocaleString()}`, label: 'Most Valuable', delay: 0.20 },
  ]

  return (
    <main className="page">
      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9999, padding: '6px 16px', marginBottom: 8 }}>
          <span>📊</span>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>Collection Stats</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>Your collection at a glance</div>
      </div>

      {/* 2×2 Summary Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
        {summaryCards.map(c => <SummaryCard key={c.label} {...c} />)}
      </div>

      {/* Top 5 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320, delay: 0.25 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '1px solid var(--gold-dim)', pointerEvents: 'none' }} />
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>🏆 Top 5 Most Valuable</div>
        {top5.map((card, i) => (
          <div key={card.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: i < top5.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.1rem', width: 28 }}>{card.img}</span>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{card.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{card.set}</div>
              </div>
            </div>
            <motion.span
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--gold)' }}
            >
              ${card.value.toLocaleString()}
            </motion.span>
          </div>
        ))}
      </motion.div>

      {/* Type Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320, delay: 0.30 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '1px solid var(--gold-dim)', pointerEvents: 'none' }} />
        <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>🎴 By Type</div>
        {Object.entries(typeCounts).map(([type, count], i, arr) => (
          <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{type}</span>
            <motion.span
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--gold)', borderRadius: 9999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}
            >
              {count}
            </motion.span>
          </div>
        ))}
      </motion.div>

      <BottomNav />
    </main>
  )
}
