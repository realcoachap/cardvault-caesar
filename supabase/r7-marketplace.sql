-- Round 7: Marketplace Migration
-- prefix: r7_

create table if not exists r7_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_name text not null,
  set_name text,
  condition text not null,
  price_cents integer,
  is_auction boolean default false,
  auction_deadline timestamptz,
  current_bid_cents integer,
  status text default 'active',
  image_url text,
  created_at timestamptz default now()
);

create table if not exists r7_offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references r7_listings not null,
  buyer_id uuid references auth.users not null,
  offer_type text not null,
  offer_cents integer,
  barter_cards jsonb,
  status text default 'pending',
  counter_cents integer,
  created_at timestamptz default now()
);

create table if not exists r7_transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references r7_listings not null,
  offer_id uuid references r7_offers,
  seller_id uuid references auth.users not null,
  buyer_id uuid references auth.users not null,
  final_cents integer,
  completed_at timestamptz default now()
);

create table if not exists r7_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  listing_id uuid references r7_listings not null,
  created_at timestamptz default now(),
  unique(user_id, listing_id)
);

-- RLS
alter table r7_listings enable row level security;
alter table r7_offers enable row level security;
alter table r7_transactions enable row level security;
alter table r7_watchlist enable row level security;

create policy "listings_read_all" on r7_listings for select using (true);
create policy "listings_insert_own" on r7_listings for insert with check (auth.uid() = user_id);
create policy "listings_update_own" on r7_listings for update using (auth.uid() = user_id);

create policy "offers_read_parties" on r7_offers for select
  using (auth.uid() = buyer_id or auth.uid() in (select user_id from r7_listings where id = listing_id));
create policy "offers_insert_buyer" on r7_offers for insert with check (auth.uid() = buyer_id);
create policy "offers_update_parties" on r7_offers for update
  using (auth.uid() = buyer_id or auth.uid() in (select user_id from r7_listings where id = listing_id));

create policy "transactions_read_parties" on r7_transactions for select
  using (auth.uid() = seller_id or auth.uid() = buyer_id);

create policy "watchlist_own" on r7_watchlist for all using (auth.uid() = user_id);

-- Seed demo data
insert into r7_listings (user_id, card_name, set_name, condition, price_cents, status) values
  ('00000000-0000-0000-0000-000000000001', 'Charizard Holo', 'Base Set', 'NM', 420000, 'active'),
  ('00000000-0000-0000-0000-000000000002', 'Black Lotus', 'Alpha', 'EX', 680000, 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Mox Sapphire', 'Beta', 'GD', 340000, 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Jordan RC', '1986 Fleer', 'NM', 210000, 'sold'),
  ('00000000-0000-0000-0000-000000000002', 'LeBron RC', '2003 Topps', 'EX', 180000, 'active'),
  ('00000000-0000-0000-0000-000000000003', 'Charizard VMAX', 'Shining Fates', 'NM', 8500, 'active'),
  ('00000000-0000-0000-0000-000000000001', 'Pikachu Illustrator', 'Promo', 'NM', 500000,
    'active')
on conflict do nothing;
