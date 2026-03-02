'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

const MOCK_CARDS = [
  { id: 1, name: 'Charizard Holo', set: 'Base Set', value: 4200, change: +12.4, img: '🔥', condition: 'NM' },
  { id: 2, name: 'Black Lotus', set: 'Alpha', value: 6800, change: +3.1, img: '🌸', condition: 'EX' },
  { id: 3, name: 'Michael Jordan RC', set: '1986 Fleer', value: 2100, change: -1.8, img: '🏀', condition: 'NM' },
]

const MOVERS = [
  { name: 'Charizard Holo', delta: +12.4 },
  { name: 'Blue-Eyes White Dragon', delta: +8.7 },
  { name: 'Jordan PSA 10', delta: -2.3 },
]

export default function Home() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [])

  const total = MOCK_CARDS.reduce((s, c) => s + c.value, 0)
  const todayChange = +2.34

  return (
    <main className="page">
      {/* ── Portfolio Hero ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        {loading ? (
          <>
            <div className="skeleton" style={{ height: 16, width: 120, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 40, width: 180, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 14, width: 80 }} />
          </>
        ) : (
          <>
            <p className="label" style={{ marginBottom: 4 }}>Total Portfolio Value</p>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              style={{ fontSize: 36, fontWeight: 800, color: 'var(--gold)', marginBottom: 4 }}
            >
              ${total.toLocaleString()}
            </motion.p>
            <p style={{ fontSize: 13, color: todayChange >= 0 ? '#22c55e' : '#ef4444' }}>
              {todayChange >= 0 ? '▲' : '▼'} {Math.abs(todayChange)}% today
            </p>
          </>
        )}
      </div>

      {/* ── 3-Stat Strip ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ flex: 1, height: 64 }} />)
          : [
              { label: 'Cards', value: MOCK_CARDS.length },
              { label: 'Sets',  value: 3 },
              { label: 'Sell Value', value: `$${Math.round(total * 0.85).toLocaleString()}` },
            ].map(s => (
              <div key={s.label} className="card" style={{ flex: 1, padding: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</p>
                <p className="label">{s.label}</p>
              </div>
            ))
        }
      </div>

      {/* ── Recently Added Carousel ── */}
      <p className="label" style={{ marginBottom: 8, paddingLeft: 14 }}>Recently Added</p>
      {loading ? (
        <div style={{ display: 'flex', gap: 12, padding: '0 14px', marginBottom: '1.25rem' }}>
          {[1,2].map(i => <div key={i} className="skeleton carousel-slide" style={{ height: 100 }} />)}
        </div>
      ) : (
        <div className="carousel-track" style={{ marginBottom: '1.25rem' }}>
          {MOCK_CARDS.map(card => (
            <motion.div
              key={card.id}
              className="card carousel-slide"
              style={{ padding: '0.875rem' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 28 }}>{card.img}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px',
                  borderRadius: 999, background: 'rgba(245,158,11,0.15)', color: 'var(--gold)'
                }}>{card.condition}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>{card.name}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>{card.set}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gold)', marginTop: 6 }}>
                ${card.value.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Price Movers ── */}
      <p className="label" style={{ marginBottom: 8 }}>Price Movers</p>
      {loading
        ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44, marginBottom: 8 }} />)
        : MOVERS.map((m, i) => (
          <motion.div
            key={i}
            className="card"
            style={{ padding: '0.75rem 1rem', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            <p style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: m.delta >= 0 ? '#22c55e' : '#ef4444' }}>
              {m.delta >= 0 ? '+' : ''}{m.delta}%
            </p>
          </motion.div>
        ))
      }

      {/* ── Empty state ── */}
      {!loading && MOCK_CARDS.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>📦</p>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No cards yet</p>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>Scan your first card to get started</p>
        </div>
      )}

      <button className="fab" aria-label="Scan card">📸</button>
      <BottomNav />
    </main>
  )
}
