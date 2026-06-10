'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLang } from '@/lib/lang'
import { supabase, Bike } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import BookingForm from '@/components/BookingForm'
import Image from 'next/image'
import Link from 'next/link'

export default function BikeDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useLang()
  const [bike, setBike] = useState<Bike | null>(null)
  const [allBikes, setAllBikes] = useState<Bike[]>([])

  useEffect(() => {
    supabase.from('bikes').select('*').eq('id', id).single().then(({ data }) => {
      if (data) setBike(data)
    })
    supabase.from('bikes').select('*').then(({ data }) => {
      if (data) setAllBikes(data)
    })
  }, [id])

  if (!bike) return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>
    </div>
  )

  const name = lang === 'en' ? bike.name_en : bike.name_sv
  const desc = lang === 'en' ? bike.description_en : bike.description_sv
  const typeLabel = bike.type === 'single_speed' ? t.type_single : t.type_multi

  const statusStyles = {
    available: 'bg-green-50 text-green-700',
    rented: 'bg-red-50 text-red-600',
    maintenance: 'bg-yellow-50 text-yellow-700',
  }
  const statusLabel = {
    available: t.status_available,
    rented: t.status_rented,
    maintenance: t.status_maintenance,
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-700 mb-6 inline-block">{t.back}</Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          {/* Photo */}
          <div className="aspect-[4/3] bg-gray-50 rounded-2xl overflow-hidden relative">
            {bike.image_url ? (
              <Image src={bike.image_url} alt={name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="96" height="72" viewBox="0 0 64 48" fill="none" aria-hidden="true">
                  <circle cx="12" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
                  <circle cx="52" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
                  <path d="M12 36 L28 12 L52 36" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
                  <path d="M28 12 L38 24" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="28" cy="10" r="4" fill="#CBD5E1"/>
                </svg>
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="flex items-start gap-3 mb-2">
              <h1 className="text-2xl font-semibold text-gray-900">{name}</h1>
              <span className={"text-xs px-2 py-1 rounded-full mt-0.5 " + statusStyles[bike.status]}>
                {statusLabel[bike.status]}
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-4">{typeLabel}</p>
            <p className="text-gray-600 leading-relaxed mb-8">{desc}</p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: t.plan_day, price: bike.price_day },
                { label: t.plan_week, price: bike.price_week },
                { label: t.plan_month, price: bike.price_month },
                { label: t.plan_semester, price: bike.price_semester },
              ].map(p => (
                <div key={p.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{p.label}</p>
                  <p className="text-lg font-semibold text-gray-900">{p.price} <span className="text-sm font-normal text-gray-400">SEK</span></p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Booking form pre-filled */}
        {bike.status === 'available' && (
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">{t.bike_detail_book}</p>
            <BookingForm bikes={allBikes} preselectedId={bike.id} />
          </div>
        )}
      </div>
    </div>
  )
}
