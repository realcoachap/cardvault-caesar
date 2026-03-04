'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import BottomNav from '@/components/BottomNav'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Transaction = {
  id: string; listing_id: string; seller_id: string; buyer_id: string
  final_cents: number | null; completed_at: string
  r7_listings?: { card_name: string; set_name: string | null; condition: string }
}

function SkeletonRow() {
  return (
    <div className="card p-4 animate-pulse" style={{ display:'flex', gap:'12px', alignItems:'center' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(255,255,255,0.08)', flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <div style={{ height:'14px', width:'55%', borderRadius:'6px', background:'rgba(255,255,255,0.08)', marginBottom:'8px' }} />
        <div style={{ height:'12px', width:'35%', borderRadius:'6px', background:'rgba(255,255,255,0.06)' }} />
      </div>
    </div>
  )
}

export default function Transactions() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [tab, setTab] = useState<'bought'|'sold'>('bought')

  const load = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setLoading(false); return }
    setUserId(user.id)

    const { data } = await supabase
      .from('r7_transactions')
      .select('*, r7_listings(card_name, set_name, condition)')
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('completed_at', { ascending: false })
    setTxns((data ?? []) as Transaction[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = txns.filter(t =>
    tab === 'bought' ? t.buyer_id === userId : t.seller_id === userId
  )

  const totalValue = filtered.reduce((sum, t) => sum + (t.final_cents ?? 0), 0)

  return (
    <div style={{ paddingBottom:'80px', minHeight:'100vh' }}>
      <div style={{ padding:'20px 16px 12px' }}>
        <h1 style={{ fontSize:'1.375rem', fontWeight:700, marginBottom:'4px' }}>Transactions</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8125rem', marginBottom:'16px' }}>
          {filtered.length} trade{filtered.length !== 1 ? 's' : ''}
          {filtered.length > 0 && <span style={{ color:'var(--gold)' }}> · ${(totalValue/100).toLocaleString()} total</span>}
        </p>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          {(['bought','sold'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pill ${tab === t ? 'pill-active' : ''}`}
              style={tab !== t ? { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.10)' } : {}}>
              {t === 'bought' ? '🛒 Bought' : '💰 Sold'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px', color:'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize:'2rem', marginBottom:'8px' }}>{tab === 'bought' ? '🛒' : '💰'}</div>
            <p>No {tab} transactions yet</p>
          </div>
        ) : (
          filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}>
              <div className="card p-4" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                  <div style={{ width:'42px', height:'42px', borderRadius:'12px',
                    background: tab === 'bought' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.375rem', flexShrink:0 }}>
                    {tab === 'bought' ? '🛒' : '💰'}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:'0.9375rem' }}>
                      {t.r7_listings?.card_name ?? 'Unknown Card'}
                    </div>
                    <div style={{ fontSize:'0.8125rem', color:'rgba(255,255,255,0.5)' }}>
                      {t.r7_listings?.set_name ?? ''} · {t.r7_listings?.condition ?? ''}
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', marginTop:'2px' }}>
                      {new Date(t.completed_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:700, fontSize:'1.0625rem',
                    color: tab === 'bought' ? '#ef4444' : '#22c55e' }}>
                    {tab === 'bought' ? '-' : '+'}${t.final_cents ? (t.final_cents/100).toLocaleString() : '—'}
                  </div>
                  <div style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:'6px', marginTop:'4px',
                    background: tab === 'bought' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    color: tab === 'bought' ? '#22c55e' : 'var(--gold)' }}>
                    {tab === 'bought' ? 'Purchased' : 'Sold'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  )
}
