import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Bike = {
  id: string
  name_en: string
  name_sv: string
  description_en: string
  description_sv: string
  type: 'single_speed' | '3_speed' | 'multi_speed'
  price_day: number
  price_week: number
  price_month: number
  price_semester: number
  status: 'available' | 'rented' | 'maintenance'
  image_url: string | null
  image_urls: string[]
  bike_number: string | null
  created_at: string
}

export type Booking = {
  id: string
  bike_id: string
  name: string
  email: string
  plan: string
  pickup_date: string
  pickup_location: string
  notes: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  order_id: string | null
  deposit_amount: number
  deposit_returned: boolean
  created_at: string
}

export type BikeOffer = {
  id: string
  name: string
  email: string
  phone: string
  location: string
  price: number
  brand_model: string | null
  condition: 'like_new' | 'good' | 'fair' | 'needs_repair'
  available_date: string
  payment_method: 'swish' | 'card' | 'revolut' | 'cash' | 'any'
  notes: string
  status: 'new' | 'confirmed' | 'completed' | 'declined'
  final_price: number | null
  final_payment_method: 'swish' | 'card' | 'revolut' | 'cash' | null
  created_at: string
}
