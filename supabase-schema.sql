-- Run this in your Supabase SQL Editor

-- Bikes table
create table bikes (
  id uuid default gen_random_uuid() primary key,
  name_en text not null,
  name_sv text not null default '',
  description_en text not null default '',
  description_sv text not null default '',
  type text not null check (type in ('single_speed', 'multi_speed')),
  price_day int not null default 50,
  price_week int not null default 280,
  price_month int not null default 500,
  price_semester int not null default 900,
  status text not null default 'available' check (status in ('available', 'rented', 'maintenance')),
  image_url text,
  created_at timestamptz default now()
);

-- Bookings table
create table bookings (
  id uuid default gen_random_uuid() primary key,
  bike_id uuid references bikes(id),
  name text not null,
  email text not null,
  plan text not null,
  pickup_date date not null,
  pickup_location text not null,
  notes text default '',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz default now()
);

-- Allow public read on bikes (so the site can show them)
alter table bikes enable row level security;
create policy "Public can read bikes" on bikes for select using (true);
create policy "Public can insert bikes" on bikes for insert with check (true);
create policy "Public can update bikes" on bikes for update using (true);
create policy "Public can delete bikes" on bikes for delete using (true);

-- Allow public insert on bookings (so anyone can book)
alter table bookings enable row level security;
create policy "Public can insert bookings" on bookings for insert with check (true);
create policy "Public can read bookings" on bookings for select using (true);
create policy "Public can update bookings" on bookings for update using (true);

-- Storage bucket for bike photos
-- (Run this separately or create it manually in Supabase Storage UI)
-- insert into storage.buckets (id, name, public) values ('bike-photos', 'bike-photos', true);
