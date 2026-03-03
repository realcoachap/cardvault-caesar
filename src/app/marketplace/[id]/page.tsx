'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
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

type BarterCard = { name: string; condition: string }

// Offer state machine states
type OfferState = 'idle' | 'sending' | 'pending' | 'accepted' | 'declined' | 'countered'

const STATE_VARIANTS = {
  idle:      { scale: 1, opacity: 1, y: 0 },
  sending:   { scale: 0.97, opacity: 0.8, y: 2 },
  pending:   { scale: 1, opacity: 1, y: 0, transition: { type:'spring', stiffness:400 } },
  accepted:  { scale: 1.04, opacity: 1, y: -4 },
  declined:  { scale: 0.96, opacity: 0.7, y: 2 },
  countered: { scale: 1.02, opacity: 1, y: -2 },
}

const STATE_COLORS: Record<OfferState, string> = {
  idle:      'var(--gold)',
  sending:   '#f97316',
  pending:   '#a78bfa',
  accepted:  '#22c55e',
  declined:  '#ef4444',
  countered: '#f59e0b',
}

const STATE_LABELS: Record<OfferState, string> = {
  idle:      'Make an Offer',
  sending:   'Sending...',
  pending:   '⏳ Offer Pending',
  accepted:  '✅ Offer Accepted!',
  declined:  '❌ Offer Declined',
  countered: '💬 Counter Received',
}

function Countdown({ deadline }: { deadline: string }) {
  const [left, setLeft] = useState('')
  useEffect(() => {
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      if (diff <= 0) { setLeft('Auction ended'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setLeft(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [deadline])
  return (
    <div style={{ background:'rgba(249,115,22,0.12)', border:'1px solid rgba(249,115,22,0.3)',
      borderRadius:'12px', padding:'12px 16px', marginBottom:'16px' }}>
      <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)', marginBottom:'2px' }}>Auction ends in</div>
      <div style={{ fontWeight:700, color:'#f97316', fontSize:'1.125rem' }}>{left}</div>
    </div>
  )
}

function SkeletonDetail() {
  return (
    <div style={{ padding:'20px 16px' }} className="animate-pulse">
      <div style={{ height:'200px', borderRadius:'16px', background:'rgba(255,255,255,0.06)', marginBottom:'20px' }} />
      <div style={{ height:'20px', width:'60%', borderRadius:'8px', background:'rgba(255,255,255,0.08)', marginBottom:'10px' }} />
      <div style={{ height:'14px', width:'40%', borderRadius:'6px', background:'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [watched, setWatched] = useState(false)
  const [offerState, setOfferState] = useState<OfferState>('idle')
  const [showOffer, setShowOffer] = useState(false)
  const [offerType, setOfferType] = useState<'money'|'barter'>('money')
  const [offerAmount, setOfferAmount] = useState('')
  const [barterCards, setBarterCards] = useState<BarterCard[]>([{ name:'', condition:'NM' }])
  const [offline, setOffline] = useState(false)
  const [raceError, setRaceError] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('r7_listings').select('*').eq('id', id).single()
    setListing(data)
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
    const ch = supabase.channel(`listing-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'r7_listings', filter: `id=eq.${id}` },
        (payload) => setListing(payload.new as Listing))
      .subscribe((status) => setOffline(status !== 'SUBSCRIBED'))
    return () => { supabase.removeChannel(ch) }
  }, [id, load])

  const toggleWatch = async () => {
    setWatched(w => !w) // optimistic
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return
    if (watched) {
      await supabase.from('r7_watchlist').delete().match({ user_id: user.id, listing_id: id })
    } else {
      await supabase.from('r7_watchlist').insert({ user_id: user.id, listing_id: id })
    }
  }

  const handleOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    setOfferState('sending')
    setRaceError('')

    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setOfferState('idle'); return }

    // Check race condition: re-fetch listing to see if still active
    const { data: fresh } = await supabase.from('r7_listings').select('status,current_bid_cents').eq('id', id).single()
    if (!fresh || fresh.status !== 'active') {
      setOfferState('declined')
      setRaceError('This card was just claimed by another buyer. Try another listing.')
      setTimeout(() => { setOfferState('idle'); setRaceError('') }, 4000)
      return
    }

    const payload: Record<string, unknown> = {
      listing_id: id,
      buyer_id: user.id,
      offer_type: offerType,
    }
    if (offerType === 'money') {
      payload.offer_cents = Math.round(Number(offerAmount) * 100)
    } else {
      payload.barter_cards = barterCards.filter(c => c.name.trim())
    }

    const { error } = await supabase.from('r7_offers').insert(payload)
    if (error) {
      setOfferState('declined')
      setRaceError('Something went wrong. Please try again.')
      setTimeout(() => setOfferState('idle'), 3000)
    } else {
      setOfferState('pending')
      setShowOffer(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight:'100vh' }}>
      <SkeletonDetail />
      <BottomNav />
    </div>
  )

  if (!listing) return (
    <div style={{ padding:'40px 16px', textAlign:'center' }}>
      <div style={{ fontSize:'2rem', marginBottom:'12px' }}>🏷️</div>
      <p style={{ fontWeight:600, marginBottom:'8px' }}>Listing not found</p>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.875rem' }}>This listing may have been removed.</p>
      <button onClick={() => router.push('/marketplace')} style={{ marginTop:'20px', background:'var(--gold)',
        color:'#000', fontWeight:700, padding:'12px 24px', borderRadius:'12px', border:'none', cursor:'pointer' }}>
        Browse Marketplace
      </button>
    </div>
  )

  const isSold = listing.status === 'sold' || listing.status === 'cancelled'

  return (
    <div style={{ paddingBottom:'80px', minHeight:'100vh' }}>
      {/* Offline Banner */}
      <AnimatePresence>
        {offline && (
          <motion.div initial={{ y:-40 }} animate={{ y:0 }} exit={{ y:-40 }}
            style={{ position:'fixed', top:0, left:0, right:0, zIndex:999, background:'#f97316',
              padding:'10px 16px', textAlign:'center', fontSize:'0.8125rem', fontWeight:600, color:'#000', maxWidth:'480px', margin:'0 auto' }}>
            ⚡ Reconnecting...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding:'16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <button onClick={() => router.back()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)',
          fontSize:'1.5rem', cursor:'pointer' }}>←</button>
        <button onClick={toggleWatch} style={{ background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer' }}>
          {watched ? '❤️' : '🤍'}
        </button>
      </div>

      <div style={{ padding:'0 16px' }}>
        {/* Card hero */}
        <div className="card" style={{ padding:'32px', marginBottom:'16px', textAlign:'center' }}>
          <div style={{ fontSize:'4rem', marginBottom:'12px' }}>🃏</div>
          <h1 style={{ fontSize:'1.375rem', fontWeight:700 }}>{listing.card_name}</h1>
          {listing.set_name && <p style={{ color:'rgba(255,255,255,0.5)', marginTop:'4px' }}>{listing.set_name}</p>}
          <div style={{ marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center', flexWrap:'wrap' }}>
            <span style={{ padding:'4px 12px', borderRadius:'8px', fontSize:'0.8125rem', fontWeight:600,
              background:'rgba(245,158,11,0.15)', color:'var(--gold)' }}>{listing.condition}</span>
            {isSold && <span style={{ padding:'4px 12px', borderRadius:'8px', fontSize:'0.8125rem', fontWeight:600,
              background:'rgba(239,68,68,0.15)', color:'#ef4444' }}>SOLD 🏷️</span>}
          </div>
        </div>

        {/* Auction timer */}
        {listing.is_auction && listing.auction_deadline && <Countdown deadline={listing.auction_deadline} />}

        {/* Pricing */}
        <div className="card" style={{ padding:'16px', marginBottom:'16px' }}>
          {listing.is_auction ? (
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div><div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>Current bid</div>
                <div style={{ fontWeight:700, color:'var(--gold)', fontSize:'1.25rem' }}>
                  {listing.current_bid_cents ? `$${(listing.current_bid_cents/100).toLocaleString()}` : 'No bids yet'}</div></div>
            </div>
          ) : (
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div><div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.5)' }}>Asking price</div>
                <div style={{ fontWeight:700, color:'var(--gold)', fontSize:'1.5rem' }}>
                  {listing.price_cents ? `$${(listing.price_cents/100).toLocaleString()}` : 'OBO'}</div></div>
            </div>
          )}
        </div>

        {/* Race condition error */}
        <AnimatePresence>
          {raceError && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)',
                borderRadius:'12px', padding:'12px 14px', marginBottom:'12px', fontSize:'0.875rem', color:'#ef4444' }}>
              {raceError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offer button — animated state machine */}
        {!isSold && (
          <motion.button
            variants={STATE_VARIANTS} animate={offerState}
            onClick={() => offerState === 'idle' ? setShowOffer(true) : null}
            style={{ width:'100%', padding:'16px', borderRadius:'16px', border:'none',
              background: STATE_COLORS[offerState], color: offerState === 'idle' ? '#000' : '#fff',
              fontWeight:700, fontSize:'1rem', cursor: offerState === 'idle' ? 'pointer' : 'default',
              transition: 'background 0.3s' }}
          >
            {STATE_LABELS[offerState]}
          </motion.button>
        )}
      </div>

      {/* Offer Sheet */}
      <AnimatePresence>
        {showOffer && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100 }}
            onClick={() => setShowOffer(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:320 }}
              onClick={e => e.stopPropagation()}
              style={{ position:'absolute', bottom:0, left:0, right:0, maxWidth:'480px', margin:'0 auto',
                background:'rgba(13,22,41,0.97)', borderRadius:'24px 24px 0 0', padding:'24px 20px', backdropFilter:'blur(24px)' }}>
              <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:'rgba(255,255,255,0.2)', margin:'0 auto 20px' }} />
              <h2 style={{ fontWeight:700, fontSize:'1.125rem', marginBottom:'16px' }}>Make an Offer</h2>

              {/* Money vs Barter toggle */}
              <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
                {(['money','barter'] as const).map(t => (
                  <button key={t} onClick={() => setOfferType(t)}
                    className={`pill ${offerType === t ? 'pill-active' : ''}`}
                    style={offerType !== t ? { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.10)' } : {}}>
                    {t === 'money' ? '💵 Money' : '🔀 Barter'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleOffer} style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                {offerType === 'money' ? (
                  <input required type="number" step="0.01" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
                    placeholder="Your offer (USD)"
                    style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                      borderRadius:'12px', padding:'12px 14px', color:'#fff', fontSize:'0.9375rem' }} />
                ) : (
                  <div>
                    <p style={{ fontSize:'0.8125rem', color:'rgba(255,255,255,0.5)', marginBottom:'10px' }}>Cards you&apos;re offering:</p>
                    {barterCards.map((bc, i) => (
                      <div key={i} style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                        <input value={bc.name} onChange={e => setBarterCards(prev => prev.map((c,j) => j===i ? {...c, name:e.target.value} : c))}
                          placeholder="Card name"
                          style={{ flex:2, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                            borderRadius:'10px', padding:'10px 12px', color:'#fff', fontSize:'0.875rem' }} />
                        <select value={bc.condition} onChange={e => setBarterCards(prev => prev.map((c,j) => j===i ? {...c, condition:e.target.value} : c))}
                          style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)',
                            borderRadius:'10px', padding:'10px', color:'#fff', fontSize:'0.875rem' }}>
                          {['NM','LP','MP','HP','DMG'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    ))}
                    <button type="button" onClick={() => setBarterCards(prev => [...prev, {name:'', condition:'NM'}])}
                      style={{ background:'none', border:'1px dashed rgba(255,255,255,0.2)', borderRadius:'10px',
                        color:'rgba(255,255,255,0.5)', padding:'8px', width:'100%', cursor:'pointer', fontSize:'0.875rem' }}>
                      + Add another card
                    </button>
                  </div>
                )}
                <button type="submit"
                  style={{ background:'var(--gold)', color:'#000', fontWeight:700, padding:'14px',
                    borderRadius:'14px', border:'none', fontSize:'1rem', cursor:'pointer' }}>
                  Send Offer
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
