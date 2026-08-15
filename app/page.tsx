'use client'
import { useEffect, useState, useRef } from 'react'
import { useLang } from '@/lib/lang'
import { supabase, Bike } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import BookingForm from '@/components/BookingForm'
import Image from 'next/image'

function WechatModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3 max-w-xs w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <p className="font-semibold text-gray-900">WeChat — 刘德胜</p>
        <p className="text-xs text-gray-400">Scan to add on WeChat</p>
        <img src="/wechat-qr.jpg" alt="WeChat QR code" className="w-52 h-52 object-contain rounded-lg" />
        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-700 mt-1"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function WhatsAppModal({ onClose }: { onClose: () => void }) {
  const { t } = useLang()
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-xs w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          <p className="font-semibold text-gray-900">{t.wa_title}</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-1">{t.wa_hours_label}</p>
          <p>{t.wa_hours}</p>
          <p className="text-xs text-gray-400 mt-1">{t.wa_timezone}</p>
        </div>

        <p className="text-sm text-gray-500">
          {t.wa_outside}{' '}
          <a href="mailto:cyklaupp@outlook.com" className="text-[#0F2D6B] underline">
            cyklaupp@outlook.com
          </a>
        </p>

        <a
          href="https://wa.me/46737676784"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] text-white font-semibold py-3 rounded-xl text-center text-sm hover:bg-[#1ebe5d] transition-colors"
        >
          {t.wa_open}
        </a>

        <button
          onClick={onClose}
          className="text-sm text-gray-400 hover:text-gray-700 text-center"
        >
          {t.wa_close}
        </button>
      </div>
    </div>
  )
}

function FloatingContact({ onWechat }: { onWechat: () => void }) {
  const [open, setOpen] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  return (
    <>
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {open && (
          <div className="flex flex-col items-end gap-2 mb-1">
            <button
              onClick={() => { setShowWhatsApp(true); setOpen(false) }}
              className="flex items-center gap-2 bg-white border border-gray-100 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              onClick={() => { onWechat(); setOpen(false) }}
              className="flex items-center gap-2 bg-white border border-gray-100 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>🔴</span> WeChat
            </button>
            <a
              href="mailto:cyklaupp@outlook.com"
              className="flex items-center gap-2 bg-white border border-gray-100 shadow-lg rounded-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>✉️</span> Email
            </a>
          </div>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 bg-[#0F2D6B] text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[#1a3f8f] transition-colors"
        >
          {open ? '✕' : '💬'}
        </button>
      </div>

      {showWhatsApp && <WhatsAppModal onClose={() => setShowWhatsApp(false)} />}
    </>
  )
}

function BikePhotoGallery({ images, alt, isSelected }: { images: string[], alt: string, isSelected: boolean }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const touchStartX = useRef<number | null>(null)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) setCurrentIdx(i => (i + 1) % images.length)
      else setCurrentIdx(i => (i - 1 + images.length) % images.length)
    }
    touchStartX.current = null
  }

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-gray-50 relative flex items-center justify-center">
        <svg width="64" height="48" viewBox="0 0 64 48" fill="none" aria-hidden="true">
          <circle cx="12" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
          <circle cx="52" cy="36" r="10" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
          <path d="M12 36 L28 12 L52 36" stroke="#CBD5E1" strokeWidth="2" fill="none"/>
          <path d="M28 12 L38 24" stroke="#FFD500" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="28" cy="10" r="4" fill="#CBD5E1"/>
        </svg>
        {isSelected && (
          <div className="absolute top-2 right-2 bg-[#0F2D6B] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">✓</div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
        <div
          className="absolute inset-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => { e.stopPropagation(); setLightbox(true) }}
        >
          <Image
            src={images[currentIdx]}
            alt={alt}
            fill
            className="object-cover cursor-pointer"
          />
        </div>
        {/* Dots only — arrows removed, swipe on mobile */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/30 px-2 py-1 rounded-full">
            {images.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrentIdx(i) }}
                className={`rounded-full transition-all duration-200 ${i === currentIdx ? 'bg-white w-3 h-2' : 'bg-white/60 w-2 h-2'}`} />
            ))}
          </div>
        )}
        {/* Photo count badge */}
        {images.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full z-10">
            {currentIdx + 1}/{images.length}
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-[#0F2D6B] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold z-10">✓</div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setLightbox(false)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={images[currentIdx]} alt={alt} className="w-full rounded-xl object-contain max-h-[80vh]" />
            {images.length > 1 && (
              <>
                <button onClick={() => setCurrentIdx(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg hover:bg-black/70">‹</button>
                <button onClick={() => setCurrentIdx(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg hover:bg-black/70">›</button>
              </>
            )}
            <button onClick={() => setLightbox(false)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70">✕</button>
            <div className="text-center text-white/60 text-sm mt-2">{currentIdx + 1} / {images.length}</div>
          </div>
        </div>
      )}
    </>
  )
}

function BikeSelector({
  bikes,
  selectedId,
  onSelect,
}: {
  bikes: Bike[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const { t, lang } = useLang()

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {bikes.map(bike => {
        const name = lang === 'en' ? bike.name_en : bike.name_sv
        const desc = lang === 'en' ? bike.description_en : bike.description_sv
        const isSelected = bike.id === selectedId
        const isAvailable = bike.status === 'available'

        return (
          <div
            key={bike.id}
            onClick={() => isAvailable && onSelect(bike.id)}
            className={`rounded-xl border-2 overflow-hidden transition-all
              ${isSelected ? 'border-[#0F2D6B] shadow-md' : 'border-gray-100 hover:border-gray-300'}
              ${isAvailable ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}
            `}
          >
            {/* Photo with gallery */}
            <BikePhotoGallery
              images={bike.image_urls && bike.image_urls.length > 0 ? bike.image_urls : bike.image_url ? [bike.image_url] : []}
              alt={name}
              isSelected={isSelected}
            />

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusStyles[bike.status]}`}>
                  {statusLabel[bike.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{desc}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function Home() {
  const { t } = useLang()
  const [bikes, setBikes] = useState<Bike[]>([])
  const [selectedBikeId, setSelectedBikeId] = useState('')
  const [showWechat, setShowWechat] = useState(false)

  useEffect(() => {
    supabase.from('bikes').select('*').order('created_at').then(({ data }) => {
      if (data && data.length > 0) {
        setBikes(data)
        const first = data.find(b => b.status === 'available')
        if (first) setSelectedBikeId(first.id)
      }
    })
  }, [])

  const faqs = [
    { q: t.faq_q1, a: t.faq_a1 },
    { q: t.faq_q2, a: t.faq_a2 },
    { q: t.faq_q3, a: t.faq_a3 },
    { q: t.faq_q4, a: t.faq_a4 },
  ]

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="mx-4 mt-4 mb-12 rounded-2xl bg-[#0F2D6B] text-white px-8 py-16 relative overflow-hidden">
        <span className="inline-block text-xs border border-yellow-400/40 bg-yellow-400/15 text-yellow-300 rounded-full px-3 py-1 mb-5">
          {t.hero_badge}
        </span>
        <h1 className="text-4xl font-semibold leading-tight mb-4 max-w-md">
          {t.hero_title}
        </h1>
        <p className="text-white/65 text-base max-w-sm mb-3 leading-relaxed">
          {t.hero_sub}
        </p>
        <p className="text-white/45 text-sm max-w-sm mb-8">
          Pick a bike below, choose your plan, done.
        </p>
        <a
          href="#bikes"
          className="bg-yellow-400 text-[#0F2D6B] font-semibold px-6 py-3 rounded-lg text-sm hover:bg-yellow-300 transition-colors inline-block"
        >
          {t.btn_browse} ↓
        </a>
        <svg className="absolute right-0 bottom-0 opacity-10 pointer-events-none" width="280" height="200" viewBox="0 0 260 200" fill="none" aria-hidden="true">
          <circle cx="60" cy="140" r="52" stroke="white" strokeWidth="3" fill="none"/>
          <circle cx="200" cy="140" r="52" stroke="white" strokeWidth="3" fill="none"/>
          <path d="M60 140 L120 60 L200 140" stroke="white" strokeWidth="3" fill="none" strokeLinejoin="round"/>
          <path d="M120 60 L155 100" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <path d="M100 60 L140 60" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <circle cx="120" cy="55" r="8" fill="white"/>
        </svg>
      </section>

      <div className="max-w-4xl mx-auto px-4">

        {/* Step 1 — Pick a bike */}
        <section id="bikes" className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-6 h-6 rounded-full bg-[#0F2D6B] text-white text-xs font-bold flex items-center justify-center shrink-0">1</span>
            <p className="font-semibold text-gray-900">{t.step_choose}</p>
          </div>
          {bikes.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="border border-gray-100 rounded-xl h-72 bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : (
            <BikeSelector
              bikes={bikes}
              selectedId={selectedBikeId}
              onSelect={id => {
                setSelectedBikeId(id)
                document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
              }}
            />
          )}
        </section>

        {/* Step 2 — Book */}
        <section id="book" className="mb-14">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-6 h-6 rounded-full bg-[#0F2D6B] text-white text-xs font-bold flex items-center justify-center shrink-0">2</span>
            <p className="font-semibold text-gray-900">{t.step_details}</p>
          </div>
          <BookingForm bikes={bikes} preselectedId={selectedBikeId} />
        </section>

        {/* FAQ */}
        <section className="mb-14">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-4">{t.section_faq}</p>
          <div className="divide-y divide-gray-100">
            {faqs.map((f, i) => (
              <div key={i} className="py-4">
                <p className="font-medium text-gray-900 mb-1">{f.q}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
          © 2025 CyklaUpp · Uppsala · cyklaupp@outlook.com
        </footer>
      </div>

      {showWechat && <WechatModal onClose={() => setShowWechat(false)} />}
      <FloatingContact onWechat={() => setShowWechat(true)} />
    </div>
  )
}