'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Listing = {
  id: string; card_name: string; set_name: string | null; condition: string
  price_cents: number | null; is_auction: boolean; auction_deadline: string | null
  current_bid_cents: number | null; status: string; image_url: string | null; created_at: string
}

const CONDITIONS = ['All','NM','LP','MP','HP','DMG']
const CONDITION_COLORS: Record<string,string> = { NM:'#22c55e', LP:'#f59e0b', MP:'#f97316', HP:'#ef4444', DMG:'#9ca3af' }

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse">
      <div style={{ width:'48px', height:'48px', borderRadius:'12px', background:'rgba(255,255,255,0.08)', marginBottom:'12px' }} />
      <div style={{ height:'14px', width:'70%', borderRadius:'6px', background:'rgba(255,255,255,0.08)', marginBottom:'8px' }} />
      <div style={{ height:'12px', width:'45%', borderRadius:'6px', background:'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

function Countdown({ deadline }: { deadline: string }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setLeft('Ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m ${s}s`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [deadline])
  return <span style={{ color:'#f97316', fontSize:'0.75rem', fontWeight:600 }}>⏱ {left}</span>
}

export default function Marketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [condition, setCondition] = useState('All')
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [showListForm, setShowListForm] = useState(false)
  const [offline, setOffline] = useState(false)

  // New listing form state
  const [newCard, setNewCard] = useState({ card_name:'', set_name:'', condition:'NM', price_cents:'', is_auction:false, auction_deadline:'' })
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('r7_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    setListings(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // Realtime price alerts
    const ch = supabase.channel('marketplace-listings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'r7_listings' }, () => load())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'r7_listings' }, () => load())
      .subscribe((status) => {
        setOffline(status !== 'SUBSCRIBED')
      })
    return () => { supabase.removeChannel(ch) }
  }, [load])

  const filtered = listings.filter(l => {
    if (condition !== 'All' && l.condition !== condition) return false
    if (search && !l.card_name.toLowerCase().includes(search.toLowerCase())) return false
    if (minPrice && l.price_cents !== null && l.price_cents < Number(minPrice) * 100) return false
    if (maxPrice && l.price_cents !== null && l.price_cents > Number(maxPrice) * 100) return false
    return true
  })

  const handleList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCard.card_name.trim()) return
    setSubmitting(true)
    // Optimistic update
    const optimistic: Listing = {
      id: 'opt-' + Date.now(), card_name: newCard.card_name, set_name: newCard.set_name || null,
      condition: newCard.condition, price_cents: newCard.price_cents ? Math.round(Number(newCard.price_cents) * 100) : null,
      is_auction: newCard.is_auction, auction_deadline: newCard.auction_deadline || null,
      current_bid_cents: null, status: 'active', image_url: null, created_at: new Date().toISOString()
    }
    setListings(prev => [optimistic, ...prev])
    setShowListForm(false)

    const { error } = await supabase.from('r7_listings').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      card_name: newCard.card_name, set_name: newCard.set_name || null,
      condition: newCard.condition,
      price_cents: newCard.price_cents ? Math.round(Number(newCard.price_cents) * 100) : null,
      is_auction: newCard.is_auction,
      auction_deadline: newCard.auction_deadline || null,
    })
    if (error) {
      // Rollback
      setListings(prev => prev.filter(l => l.id !== optimistic.id))
      setShowListForm(true)
    } else {
      setNewCard({ card_name:'', set_name:'', condition:'NM', price_cents:'', is_auction:false, auction_deadline:'' })
      load()
    }
    setSubmitting(false)
  }

  return (
    <div style={{ paddingBottom: '80px', minHeight: '100vh' }}>
      {/* Offline Banner */}
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            style={{ position:'fixed', top:0, left:0, right:0, zIndex:999, background:'#f97316',
              padding:'10px 16px', textAlign:'center', fontSize:'0.8125rem', fontWeight:600, color:'#000',
              maxWidth:'480px', margin:'0 auto' }}
          >
            ⚡ Reconnecting to live updates...
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '20px 16px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <h1 style={{ fontSize:'1.375rem', fontWeight:700 }}>Marketplace</h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8125rem' }}>{listings.length} active listings</p>
          </div>
          <Link href="/marketplace/my-listings" style={{ fontSize:'0.8125rem', color:'var(--gold)' }}>My Listings</Link>
        </div>

        {/* Search */}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search cards..."
          style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:'12px', padding:'10px 14px', color:'#fff', fontSize:'0.9375rem', marginBottom:'12px' }}
        />

        {/* Condition filters */}
        <div style={{ display:'flex', gap:'8px', overflowX:'auto', paddingBottom:'4px', marginBottom:'12px', scrollbarWidth:'none' }}>
          {CONDITIONS.map(c => (
            <button key={c} onClick={() => setCondition(c)}
              className={`pill ${condition === c ? 'pill-active' : ''}`}
              style={condition !== c ? { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.10)' } : {}}
            >{c}</button>
          ))}
        </div>

        {/* Price range */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="Min $"
            style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'0.875rem' }} />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Max $"
            style={{ flex:1, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.10)',
              borderRadius:'10px', padding:'8px 12px', color:'#fff', fontSize:'0.875rem' }} />
        </div>
      </div>

      {/* Listings grid */}
      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px', color:'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize:'2rem', marginBottom:'8px' }}>🏪</div>
            <p>No listings found</p>
          </div>
        ) : (
          filtered.map((l, i) => (
            <motion.div key={l.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link href={`/marketplace/${l.id}`} style={{ textDecoration: 'none' }}>
                <div className="card p-4" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <span style={{ fontWeight:600 }}>{l.card_name}</span>
                      {l.status === 'sold' && (
                        <span style={{ fontSize:'0.6875rem', background:'rgba(239,68,68,0.2)', color:'#ef4444',
                          padding:'2px 6px', borderRadius:'6px', fontWeight:600 }}>SOLD 🏷️</span>
                      )}
                    </div>
                    {l.set_name && <div style={{ fontSize:'0.8125rem', color:'rgba(255,255,255,0.5)', marginBottom:'4px' }}>{l.set_name}</div>}
                    <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                      <span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:'6px',
                        background:`${CONDITION_COLORS[l.condition] ?? '#9ca3af'}22`,
                        color: CONDITION_COLORS[l.condition] ?? '#9ca3af', fontWeight:600 }}>{l.condition}</span>
                      {l.is_auction && l.auction_deadline && <Countdown deadline={l.auction_deadline} />}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    {l.is_auction ? (
                      <div>
                        <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>Current bid</div>
                        <div style={{ fontWeight:700, color:'var(--gold)' }}>
                          {l.current_bid_cents ? `$${(l.current_bid_cents/100).toLocaleString()}` : 'No bids'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontWeight:700, color:'var(--gold)', fontSize:'1.0625rem' }}>
                        {l.price_cents ? `$${(l.price_cents/100).toLocaleString()}` : 'OBO'}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setShowListForm(true)}
        style={{ position:'fixed', bottom:'90px', right:'20px', width:'52px', height:'52px',
          borderRadius:'50%', background:'var(--gold)', border:'none', cursor:'pointer',
          fontSize:'1.5rem', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 4px 20px rgba(245,158,11,0.5)', zIndex:50 }}
      >+</motion.button>

      {/* List Card Sheet */}
      <AnimatePresence>
        {showListForm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100 }}
            onClick={() => setShowListForm(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type:'spring', damping:28, stiffness:320 }}
              onClick={e => e.stopPropagation()}
              style={{ position:'absolute', bottom:0, left:0, right:0, maxWidth:'480px', margin:'0 auto',
                background:'rgba(13,22,41,0.97)', borderRadius:'24px 24px 0 0', padding:'24px 20px',
                backdropFilter:'blur(24px)' }}
            >
              <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.2)', margin:'0 auto 20px' }} />
              <h2 style={{ fontWeight:700, fontSize:'1.125rem', marginBottom:'20px' }}>List a Card</h2>
              <form onSubmit={handleList} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <input required value={newCard.card_name} onChange={e => setNewCard(p=>({...p, card_name:e.target.value}))}
                  placeholder="Card name *" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }} />
                <input value={newCard.set_name} onChange={e => setNewCard(p=>({...p, set_name:e.target.value}))}
                  placeholder="Set name" style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }} />
                <select value={newCard.condition} onChange={e => setNewCard(p=>({...p, condition:e.target.value}))}
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                    borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }}>
                  {['NM','LP','MP','HP','DMG'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label style={{ display:'flex', alignItems:'center', gap:'10px', fontSize:'0.9375rem', cursor:'pointer' }}>
                  <input type="checkbox" checked={newCard.is_auction} onChange={e => setNewCard(p=>({...p, is_auction:e.target.checked}))} />
                  Auction
                </label>
                {newCard.is_auction ? (
                  <input type="datetime-local" value={newCard.auction_deadline}
                    onChange={e => setNewCard(p=>({...p, auction_deadline:e.target.value}))}
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }} />
                ) : (
                  <input value={newCard.price_cents} onChange={e => setNewCard(p=>({...p, price_cents:e.target.value}))}
                    placeholder="Price (USD)" type="number" step="0.01"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }} />
                )}
                <button type="submit" disabled={submitting}
                  style={{ background:'var(--gold)', color:'#000', fontWeight:700, padding:'14px',
                    borderRadius:'14px', border:'none', fontSize:'1rem', cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Listing...' : 'List Card'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
