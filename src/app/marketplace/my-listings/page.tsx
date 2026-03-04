'use client'
export const dynamic = 'force-dynamic'
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
  price_cents: number | null; status: string; is_auction: boolean; created_at: string
}
type Offer = {
  id: string; listing_id: string; buyer_id: string; offer_type: string
  offer_cents: number | null; barter_cards: {name:string;condition:string}[] | null
  status: string; counter_cents: number | null; created_at: string
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

const STATUS_TABS = ['Active','Sold','Cancelled']
const STATUS_COLORS: Record<string,string> = { active:'#22c55e', sold:'#ef4444', cancelled:'#9ca3af' }

export default function MyListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [offers, setOffers] = useState<Record<string, Offer[]>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Active')
  const [expandedListing, setExpandedListing] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)

  const load = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) { setLoading(false); return }

    const { data: ls } = await supabase.from('r7_listings').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setListings(ls ?? [])

    // Load offers for all listings
    if (ls && ls.length > 0) {
      const ids = ls.map(l => l.id)
      const { data: os } = await supabase.from('r7_offers').select('*')
        .in('listing_id', ids).eq('status', 'pending').order('created_at', { ascending: false })
      const grouped: Record<string, Offer[]> = {}
      for (const o of (os ?? [])) {
        grouped[o.listing_id] = [...(grouped[o.listing_id] ?? []), o]
      }
      setOffers(grouped)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleOffer = async (offerId: string, action: 'accepted'|'declined', listingId: string) => {
    setActioning(offerId)
    const { error } = await supabase.from('r7_offers').update({ status: action }).eq('id', offerId)
    if (!error && action === 'accepted') {
      // Mark listing as sold
      await supabase.from('r7_listings').update({ status: 'sold' }).eq('id', listingId)
      // Create transaction record
      const offer = offers[listingId]?.find(o => o.id === offerId)
      const user = (await supabase.auth.getUser()).data.user
      if (offer && user) {
        await supabase.from('r7_transactions').insert({
          listing_id: listingId, offer_id: offerId,
          seller_id: user.id, buyer_id: offer.buyer_id,
          final_cents: offer.offer_cents
        })
      }
      await load()
    } else if (!error) {
      setOffers(prev => ({
        ...prev,
        [listingId]: (prev[listingId] ?? []).filter(o => o.id !== offerId)
      }))
    }
    setActioning(null)
  }

  const filtered = listings.filter(l =>
    tab === 'Active' ? l.status === 'active' :
    tab === 'Sold' ? l.status === 'sold' : l.status === 'cancelled'
  )

  return (
    <div style={{ paddingBottom:'80px', minHeight:'100vh' }}>
      <div style={{ padding:'20px 16px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
          <div>
            <h1 style={{ fontSize:'1.375rem', fontWeight:700 }}>My Listings</h1>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8125rem' }}>{listings.length} total</p>
          </div>
          <Link href="/marketplace/transactions" style={{ fontSize:'0.8125rem', color:'var(--gold)' }}>Transactions</Link>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'16px' }}>
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pill ${tab === t ? 'pill-active' : ''}`}
              style={tab !== t ? { background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.7)', border:'1px solid rgba(255,255,255,0.10)' } : {}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:'0 16px', display:'flex', flexDirection:'column', gap:'10px' }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 16px', color:'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize:'2rem', marginBottom:'8px' }}>📋</div>
            <p>No {tab.toLowerCase()} listings</p>
            {tab === 'Active' && (
              <Link href="/marketplace" style={{ display:'inline-block', marginTop:'16px',
                background:'var(--gold)', color:'#000', fontWeight:700, padding:'10px 20px',
                borderRadius:'12px', textDecoration:'none', fontSize:'0.875rem' }}>
                Go to Marketplace
              </Link>
            )}
          </div>
        ) : (
          filtered.map((l, i) => {
            const pendingOffers = offers[l.id] ?? []
            const isExpanded = expandedListing === l.id
            return (
              <motion.div key={l.id} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * 0.04 }}>
                <div className="card" style={{ overflow:'hidden' }}>
                  <button onClick={() => setExpandedListing(isExpanded ? null : l.id)}
                    style={{ width:'100%', background:'none', border:'none', padding:'16px', display:'flex',
                      justifyContent:'space-between', alignItems:'center', cursor:'pointer', color:'#fff', textAlign:'left' }}>
                    <div>
                      <div style={{ fontWeight:600, marginBottom:'2px' }}>{l.card_name}</div>
                      <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                        <span style={{ fontSize:'0.75rem', padding:'2px 8px', borderRadius:'6px',
                          background:`${STATUS_COLORS[l.status] ?? '#9ca3af'}22`,
                          color: STATUS_COLORS[l.status] ?? '#9ca3af', fontWeight:600 }}>{l.status}</span>
                        {pendingOffers.length > 0 && (
                          <span style={{ fontSize:'0.75rem', background:'rgba(245,158,11,0.2)', color:'var(--gold)',
                            padding:'2px 8px', borderRadius:'6px', fontWeight:600 }}>
                            {pendingOffers.length} offer{pendingOffers.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ color:'var(--gold)', fontWeight:700 }}>
                        {l.price_cents ? `$${(l.price_cents/100).toLocaleString()}` : l.is_auction ? '🏷 Auction' : 'OBO'}
                      </div>
                      <div style={{ fontSize:'1rem', color:'rgba(255,255,255,0.4)', marginTop:'4px' }}>
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height:0 }} animate={{ height:'auto' }} exit={{ height:0 }}
                        style={{ overflow:'hidden', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ padding:'12px 16px' }}>
                          {pendingOffers.length === 0 ? (
                            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:'0.875rem', textAlign:'center', padding:'12px 0' }}>
                              No pending offers
                            </p>
                          ) : (
                            pendingOffers.map(o => (
                              <div key={o.id} style={{ background:'rgba(255,255,255,0.04)', borderRadius:'12px',
                                padding:'12px', marginBottom:'8px' }}>
                                <div style={{ fontSize:'0.8125rem', color:'rgba(255,255,255,0.5)', marginBottom:'6px' }}>
                                  {o.offer_type === 'money' ? '💵 Money offer' : '🔀 Barter offer'}
                                </div>
                                {o.offer_type === 'money' && o.offer_cents && (
                                  <div style={{ fontWeight:700, color:'var(--gold)', fontSize:'1.0625rem', marginBottom:'10px' }}>
                                    ${(o.offer_cents/100).toLocaleString()}
                                  </div>
                                )}
                                {o.offer_type === 'barter' && o.barter_cards && (
                                  <div style={{ marginBottom:'10px' }}>
                                    {o.barter_cards.map((bc, bi) => (
                                      <span key={bi} style={{ display:'inline-block', background:'rgba(255,255,255,0.08)',
                                        borderRadius:'8px', padding:'3px 8px', fontSize:'0.8125rem', marginRight:'6px', marginBottom:'4px' }}>
                                        {bc.name} ({bc.condition})
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ display:'flex', gap:'8px' }}>
                                  <button
                                    onClick={() => handleOffer(o.id, 'accepted', l.id)}
                                    disabled={actioning === o.id}
                                    style={{ flex:1, background:'rgba(34,197,94,0.15)', color:'#22c55e',
                                      border:'1px solid rgba(34,197,94,0.3)', borderRadius:'10px',
                                      padding:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.875rem' }}>
                                    ✓ Accept
                                  </button>
                                  <button
                                    onClick={() => handleOffer(o.id, 'declined', l.id)}
                                    disabled={actioning === o.id}
                                    style={{ flex:1, background:'rgba(239,68,68,0.12)', color:'#ef4444',
                                      border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px',
                                      padding:'8px', fontWeight:600, cursor:'pointer', fontSize:'0.875rem' }}>
                                    ✕ Decline
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
      <BottomNav />
    </div>
  )
}
