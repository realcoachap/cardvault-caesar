'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from '@/components/BottomNav'

type ScanResult = { name: string; set: string; value: number; condition: string }

export default function Scan() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [manual, setManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Safety timer
  useEffect(() => {
    if (!scanning) return
    const t = setTimeout(() => setScanning(false), 1000)
    return () => clearTimeout(t)
  }, [scanning])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanning(true)
    // Simulate GPT-4o Vision
    setTimeout(() => {
      setScanning(false)
      setResult({ name: 'Charizard Holo', set: 'Base Set 1999', value: 4200, condition: 'NM' })
    }, 2200)
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => { setSaved(false); setResult(null) }, 1500)
  }

  return (
    <main className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, alignSelf: 'flex-start' }}>Scan a Card</p>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, alignSelf: 'flex-start' }}>
        Point camera at your card — AI identifies it instantly
      </p>

      {/* Viewfinder */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 360, aspectRatio: '3/4',
        background: 'rgba(0,0,0,0.6)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        {/* Gold card cutout border */}
        <div style={{ position: 'absolute', top: '10%', left: '8%', right: '8%', bottom: '10%',
          border: `2px solid var(--gold)`, borderRadius: 12, zIndex: 2 }}>
          {/* Corner marks */}
          {[{t:'-2px',l:'-2px'},{t:'-2px',r:'-2px'},{b:'-2px',l:'-2px'},{b:'-2px',r:'-2px'}].map((pos,i) => (
            <div key={i} style={{ position: 'absolute', width: 20, height: 20, borderColor: 'var(--gold)', borderStyle: 'solid',
              borderWidth: i<2 ? '3px 0 0 3px' : '0 0 3px 3px',
              ...( (pos as {t?:string;l?:string;r?:string;b?:string}).t && {top:0}),
              ...( (pos as {t?:string;l?:string;r?:string;b?:string}).b && {bottom:0}),
              ...( (pos as {t?:string;l?:string;r?:string;b?:string}).l && {left:0}),
              ...( (pos as {t?:string;l?:string;r?:string;b?:string}).r && {right:0}),
            }} />
          ))}
        </div>

        {/* Scan line animation */}
        {scanning && (
          <motion.div
            style={{ position: 'absolute', left: '8%', right: '8%', height: 2, background: 'var(--gold)',
              boxShadow: '0 0 8px var(--gold)', zIndex: 3, top: '10%' }}
            animate={{ top: ['10%', '88%', '10%'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Placeholder bg */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {scanning
            ? <p style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600, zIndex: 4 }}>Scanning…</p>
            : <p style={{ color: 'var(--muted)', fontSize: 13 }}>Camera preview</p>
          }
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, width: '100%', marginBottom: 16 }}>
        <motion.button onClick={() => fileRef.current?.click()}
          style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'var(--gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 15 }}
          whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
          📷 Take Photo
        </motion.button>
        <motion.button onClick={() => setManual(m => !m)}
          style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'var(--surface)', color: '#fff', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 15 }}
          whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
          ✏️ Manual
        </motion.button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />

      {/* Manual entry */}
      <AnimatePresence>
        {manual && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ width: '100%', overflow: 'hidden' }}>
            <div className="card" style={{ padding: '1rem', marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 12 }}>Manual Entry</p>
              <input value={manualName} onChange={e => setManualName(e.target.value)}
                placeholder="Card name..."
                style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--border)', color: '#fff', fontSize: 14, outline: 'none' }} />
              <motion.button onClick={() => { if (manualName) { setResult({ name: manualName, set: 'Unknown', value: 0, condition: 'NM' }); setManual(false) }}}
                style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                Add Card
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!result && !scanning && (
        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
          No card scanned yet. Tap "Take Photo" or enter manually.
        </p>
      )}

      {/* Result bottom sheet */}
      <AnimatePresence>
        {result && (
          <>
            <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setResult(null)} />
            <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
              <div className="sheet-handle" />
              <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 12 }}>✓ Card Identified</p>
              <div className="card" style={{ padding: '1rem', marginBottom: 16 }}>
                <p style={{ fontSize: 18, fontWeight: 700 }}>{result.name}</p>
                <p style={{ fontSize: 13, color: 'var(--muted)' }}>{result.set}</p>
                {result.value > 0 && <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--gold)', marginTop: 8 }}>${result.value.toLocaleString()}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button onClick={() => setResult(null)}
                  style={{ flex: 1, padding: '13px', borderRadius: 12, background: 'var(--surface)', color: '#fff', fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                  Retry
                </motion.button>
                <motion.button onClick={handleSave}
                  style={{ flex: 2, padding: '13px', borderRadius: 12, background: saved ? '#22c55e' : 'var(--gold)', color: '#000', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  whileTap={{ scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
                  {saved ? '✓ Saved!' : 'Add to Binder'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </main>
  )
}
