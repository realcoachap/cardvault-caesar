'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

const SETTINGS = [
  { key: 'currency', label: '💱 Currency', options: ['USD','EUR','GBP','CAD'] },
  { key: 'condition', label: '🏷️ Default Condition', options: ['MT','NM','EX','GD','PO'] },
  { key: 'priceSource', label: '📊 Price Source', options: ['TCGPlayer','eBay','Scryfall','PSA'] },
  { key: 'visibility', label: '👁️ Collection Visibility', options: ['Private','Friends','Public'] },
]

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({ currency:'USD', condition:'NM', priceSource:'TCGPlayer', visibility:'Private' })
  const [loading, setLoading] = useState(true)
  const [exported, setExported] = useState(false)

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t) }, [])

  function set(key: string, val: string) { setValues(v => ({ ...v, [key]: val })) }

  function handleExport() {
    setExported(true)
    const csv = 'Name,Set,Value,Condition\nCharizard Holo,Base Set,4200,NM\nBlack Lotus,Alpha,6800,EX'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'cardvault-export.csv'; a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => setExported(false), 2000)
  }

  return (
    <main className="page">
      <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Settings</p>

      {loading ? (
        [1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 16, marginBottom: 12 }} />)
      ) : (
        <>
          {SETTINGS.map(s => (
            <div key={s.key} className="card" style={{ padding: '1rem', marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{s.label}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {s.options.map(opt => (
                  <motion.button key={opt} className={`pill pill-${values[s.key] === opt ? 'active' : 'inactive'}`}
                    onClick={() => set(s.key, opt)}
                    whileTap={{ scale: 0.95 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                    {opt}
                  </motion.button>
                ))}
              </div>
            </div>
          ))}

          {/* Export */}
          <div className="card" style={{ padding: '1rem', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>📤 Export Collection</p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Download your full collection as CSV</p>
            <motion.button onClick={handleExport}
              style={{ padding: '12px 20px', borderRadius: 12, background: exported ? '#22c55e' : 'rgba(245,158,11,0.15)',
                color: exported ? '#fff' : 'var(--gold)', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600, cursor: 'pointer' }}
              whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
              {exported ? '✓ Downloading…' : 'Export CSV'}
            </motion.button>
          </div>

          {/* About */}
          <div className="card" style={{ padding: '1rem' }}>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>ℹ️ About</p>
            {[['Version','1.0.0'],['Build','caesar-reference'],['Data Source','TCGPlayer + eBay']].map(([k,v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{k}</p>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{v}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <BottomNav />
    </main>
  )
}
