'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { supabase, Bike, Booking, BikeOffer } from '@/lib/supabase'

const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123'

const emptyBike = {
  name_en: '', name_sv: '', description_en: '', description_sv: '',
  type: 'single_speed', price_day: 50, price_week: 280, price_month: 150, price_semester: 500,
}

function generateBikeNumber(existingNumbers: string[]): string {
  let num = 611 + existingNumbers.length
  while (existingNumbers.includes(`CY-${num}`)) num++
  return `CY-${num}`
}

type BookingWithBike = Booking & { bike?: Bike; phone?: string }

const DEPOSIT_OPTIONS = [300, 500, 700, 1000]

const planLabels: Record<string, string> = {
  semester: 'Semester (5 months)',
  month: 'Monthly',
  week: 'Weekly',
  day: 'Daily',
}

const inputCls = "border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] w-full"

function BikeFormFields({ data, onChange }: { data: typeof emptyBike, onChange: (u: typeof emptyBike) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <input placeholder="Name (EN) *" value={data.name_en} onChange={e => onChange({...data, name_en: e.target.value})} className={inputCls} />
      <input placeholder="Name (SV)" value={data.name_sv} onChange={e => onChange({...data, name_sv: e.target.value})} className={inputCls} />
      <input placeholder="Description (EN)" value={data.description_en} onChange={e => onChange({...data, description_en: e.target.value})} className={inputCls} />
      <input placeholder="Description (SV)" value={data.description_sv} onChange={e => onChange({...data, description_sv: e.target.value})} className={inputCls} />

      <div className="grid grid-cols-4 gap-2">
        {(['price_day','price_week','price_month','price_semester'] as const).map(f => (
          <div key={f} className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">{f.split('_')[1]}</label>
            <input type="number" value={(data as any)[f]}
              onChange={e => onChange({...data, [f]: Number(e.target.value)})}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#0F2D6B]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')

  useEffect(() => {
    if (sessionStorage.getItem('cyklaupp_admin') === 'true') {
      setAuthed(true)
    }
  }, [])

  const [bikes, setBikes] = useState<Bike[]>([])
  const [bookings, setBookings] = useState<BookingWithBike[]>([])
  const [tab, setTab] = useState<'bikes' | 'bookings' | 'offers'>('bikes')
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // 1. Confirm 弹框
  const [confirmTarget, setConfirmTarget] = useState<BookingWithBike | null>(null)
  const [confirmComment, setConfirmComment] = useState('')
  const [confirming, setConfirming] = useState(false)

  // 2. Deposit 弹框
  const [depositTarget, setDepositTarget] = useState<BookingWithBike | null>(null)
  const [depositAmount, setDepositAmount] = useState(500)
  const [customDeposit, setCustomDeposit] = useState('')
  const [savingDeposit, setSavingDeposit] = useState(false)

  // 3. Cancel 弹框
  const [cancelTarget, setCancelTarget] = useState<BookingWithBike | null>(null)
  const [cancelComment, setCancelComment] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // 3b. Notify about new bikes 弹框（针对 cancelled / completed 的订单）
  const DEFAULT_NOTIFY_MESSAGE_CANCELLED = "We know your last booking with us didn't work out, but we now have new bikes available! Come take a look and find one that suits you."
  const DEFAULT_NOTIFY_MESSAGE_COMPLETED = "Thanks again for renting with us! We've got new bikes in stock now — come check them out if you ever need one again."
  const [notifyTarget, setNotifyTarget] = useState<BookingWithBike | null>(null)
  const [notifyComment, setNotifyComment] = useState(DEFAULT_NOTIFY_MESSAGE_CANCELLED)
  const [notifying, setNotifying] = useState(false)

  // Sell offers
  const [offers, setOffers] = useState<BikeOffer[]>([])
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null)
  const [offerSearch, setOfferSearch] = useState('')

  // 4. Confirm offer 弹框
  const [confirmOfferTarget, setConfirmOfferTarget] = useState<BikeOffer | null>(null)
  const [confirmOfferComment, setConfirmOfferComment] = useState('')
  const [confirmingOffer, setConfirmingOffer] = useState(false)

  // 5. Complete offer 弹框
  const [completeOfferTarget, setCompleteOfferTarget] = useState<BikeOffer | null>(null)
  const [finalPrice, setFinalPrice] = useState('')
  const [finalPaymentMethod, setFinalPaymentMethod] = useState('')
  const [completeOfferComment, setCompleteOfferComment] = useState('')
  const [completingOffer, setCompletingOffer] = useState(false)

  // 6. Decline offer 弹框
  const [declineOfferTarget, setDeclineOfferTarget] = useState<BikeOffer | null>(null)
  const [declineOfferComment, setDeclineOfferComment] = useState('')
  const [decliningOffer, setDecliningOffer] = useState(false)

  // Bikes
  const [newBike, setNewBike] = useState({ ...emptyBike })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBike, setEditBike] = useState({ ...emptyBike })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!authed) return; fetchBikes(); fetchBookings(); fetchOffers() }, [authed])

  async function fetchBikes() {
    const { data } = await supabase.from('bikes').select('*').order('created_at')
    if (data) setBikes(data)
  }

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, bike:bikes(*)')
      .order('created_at', { ascending: false })
    if (data) setBookings(data as BookingWithBike[])
  }

  async function fetchOffers() {
    const { data } = await supabase
      .from('bike_offers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOffers(data)
  }

  async function handleConfirm() {
    if (!confirmTarget) return
    setConfirming(true)
    const res = await fetch('/api/confirm-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: confirmTarget.id, comment: confirmComment }),
    })
    setConfirming(false)
    if (res.ok) {
      setConfirmTarget(null)
      setConfirmComment('')
      fetchBookings()
      fetchBikes()
    }
  }

  async function handleRecordDeposit() {
    if (!depositTarget) return
    setSavingDeposit(true)
    const deposit = customDeposit ? parseInt(customDeposit) : depositAmount
    const res = await fetch('/api/record-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: depositTarget.id, depositAmount: deposit }),
    })
    setSavingDeposit(false)
    if (res.ok) {
      setDepositTarget(null)
      setCustomDeposit('')
      setDepositAmount(500)
      fetchBookings()
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    const res = await fetch('/api/cancel-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: cancelTarget.id, comment: cancelComment }),
    })
    setCancelling(false)
    if (res.ok) {
      setCancelTarget(null)
      setCancelComment('')
      fetchBookings()
      fetchBikes()
    }
  }

  async function handleNotifyNewBikes() {
    if (!notifyTarget) return
    setNotifying(true)
    const res = await fetch('/api/notify-new-bikes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: notifyTarget.id, comment: notifyComment }),
    })
    setNotifying(false)
    if (res.ok) {
      setNotifyTarget(null)
      setNotifyComment(DEFAULT_NOTIFY_MESSAGE_CANCELLED)
      fetchBookings()
    }
  }

  async function handleComplete(booking: BookingWithBike) {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id)
    if (booking.bike_id) {
      await supabase.from('bikes').update({ status: 'available' }).eq('id', booking.bike_id)
    }
    await fetch('/api/send-return-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'returned',
        name: booking.name,
        email: booking.email,
        bikeName: booking.bike?.name_en || 'your bike',
        bikeNumber: booking.bike?.bike_number || '',
        depositAmount: booking.deposit_amount,
      }),
    })
    fetchBookings()
    fetchBikes()
  }

  async function handleDepositReturned(bookingId: string) {
    await supabase.from('bookings').update({ deposit_returned: true }).eq('id', bookingId)
    const booking = bookings.find(b => b.id === bookingId)
    if (booking) {
      await fetch('/api/send-return-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'deposit',
          name: booking.name,
          email: booking.email,
          depositAmount: booking.deposit_amount,
        }),
      })
    }
    fetchBookings()
  }

  async function handleConfirmOffer() {
    if (!confirmOfferTarget) return
    setConfirmingOffer(true)
    const res = await fetch('/api/confirm-sell-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: confirmOfferTarget.id, comment: confirmOfferComment }),
    })
    setConfirmingOffer(false)
    if (res.ok) {
      setConfirmOfferTarget(null)
      setConfirmOfferComment('')
      fetchOffers()
    }
  }

  function openCompleteOffer(offer: BikeOffer) {
    setCompleteOfferTarget(offer)
    setFinalPrice(String(offer.price))
    setFinalPaymentMethod(offer.payment_method === 'any' ? '' : offer.payment_method)
  }

  async function handleCompleteOffer() {
    if (!completeOfferTarget || !finalPaymentMethod || !finalPrice) return
    setCompletingOffer(true)
    const res = await fetch('/api/complete-sell-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: completeOfferTarget.id,
        finalPrice,
        finalPaymentMethod,
        comment: completeOfferComment,
      }),
    })
    setCompletingOffer(false)
    if (res.ok) {
      setCompleteOfferTarget(null)
      setFinalPrice('')
      setFinalPaymentMethod('')
      setCompleteOfferComment('')
      fetchOffers()
    }
  }

  async function handleDeclineOffer() {
    if (!declineOfferTarget) return
    setDecliningOffer(true)
    const res = await fetch('/api/decline-sell-offer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offerId: declineOfferTarget.id, comment: declineOfferComment }),
    })
    setDecliningOffer(false)
    if (res.ok) {
      setDeclineOfferTarget(null)
      setDeclineOfferComment('')
      fetchOffers()
    }
  }

  async function updateBikeStatus(bikeId: string, status: Bike['status']) {
    await supabase.from('bikes').update({ status }).eq('id', bikeId)
    fetchBikes()
  }

  // 上传前在浏览器里压缩：缩放到最大宽度1200px + 转成JPEG质量70%，避免存原图拖慢加载
  async function compressImage(file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new window.Image()
      const objectUrl = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error('Canvas not supported')); return }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          blob => {
            URL.revokeObjectURL(objectUrl)
            if (blob) resolve(blob)
            else reject(new Error('Image compression failed'))
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Failed to read image')) }
      img.src = objectUrl
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadTarget || !e.target.files || e.target.files.length === 0) return
    setUploading(uploadTarget)
    const bike = bikes.find(b => b.id === uploadTarget)
    const existingUrls: string[] = (bike?.image_urls && bike.image_urls.length > 0)
      ? bike.image_urls
      : (bike?.image_url ? [bike.image_url] : [])
    const remaining = 5 - existingUrls.length
    if (remaining <= 0) { alert('Maximum 5 photos allowed.'); setUploading(null); return }
    const files = Array.from(e.target.files).slice(0, remaining)
    const newUrls: string[] = []
    for (const file of files) {
      let uploadBlob: Blob = file
      try {
        uploadBlob = await compressImage(file)
      } catch {
        // 压缩失败就退回上传原图，不阻塞整个流程
        uploadBlob = file
      }
      const path = `bikes/${uploadTarget}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
      const { error } = await supabase.storage.from('bike-photos').upload(path, uploadBlob, {
        upsert: false,
        contentType: 'image/jpeg',
      })
      if (!error) {
        const { data } = supabase.storage.from('bike-photos').getPublicUrl(path)
        newUrls.push(data.publicUrl)
      }
    }
    if (newUrls.length > 0) {
      const allUrls = [...existingUrls, ...newUrls]
      await supabase.from('bikes').update({
        image_url: allUrls[0],
        image_urls: allUrls,
      }).eq('id', uploadTarget)
      fetchBikes()
    }
    setUploading(null)
    e.target.value = ''
  }

  async function handleDeleteImage(bikeId: string, urlToDelete: string) {
    const bike = bikes.find(b => b.id === bikeId)
    if (!bike) return
    const allUrls = (bike.image_urls && bike.image_urls.length > 0)
      ? bike.image_urls
      : (bike.image_url ? [bike.image_url] : [])
    const newUrls = allUrls.filter(u => u !== urlToDelete)
    await supabase.from('bikes').update({
      image_url: newUrls[0] || null,
      image_urls: newUrls,
    }).eq('id', bikeId)
    fetchBikes()
  }

  async function addBike() {
    if (!newBike.name_en) return
    setAdding(true)
    const existingNumbers = bikes.map(b => b.bike_number).filter(Boolean) as string[]
    const bikeNumber = generateBikeNumber(existingNumbers)
    await supabase.from('bikes').insert({ ...newBike, status: 'available', bike_number: bikeNumber })
    setNewBike({ ...emptyBike })
    fetchBikes()
    setAdding(false)
  }

  function startEdit(bike: Bike) {
    setEditingId(bike.id)
    setEditBike({
      name_en: bike.name_en, name_sv: bike.name_sv,
      description_en: bike.description_en, description_sv: bike.description_sv,
      type: bike.type, price_day: bike.price_day, price_week: bike.price_week,
      price_month: bike.price_month, price_semester: bike.price_semester,
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('bikes').update({ ...editBike }).eq('id', id)
    setEditingId(null)
    fetchBikes()
    setSaving(false)
  }

  async function deleteBike(id: string) {
    if (!confirm('Delete this bike?')) return
    await supabase.from('bikes').delete().eq('id', id)
    fetchBikes()
  }

  const statusBadge: Record<string, string> = {
    pending:   'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    cancelled: 'bg-red-50 text-red-600',
  }

  const offerConditionLabels: Record<string, string> = {
    like_new: 'Like new',
    good: 'Good',
    fair: 'Fair',
    needs_repair: 'Needs repair',
  }

  const offerPaymentLabels: Record<string, string> = {
    swish: 'Swish',
    card: 'Card',
    revolut: 'Revolut',
    cash: 'Cash',
    any: 'Any (no preference)',
  }

  const offerStatusBadge: Record<string, string> = {
    new:       'bg-yellow-50 text-yellow-700',
    confirmed: 'bg-blue-50 text-blue-700',
    completed: 'bg-green-50 text-green-700',
    declined:  'bg-red-50 text-red-600',
  }

  const filteredOffers = offers.filter(o => {
    if (!offerSearch) return true
    const q = offerSearch.toLowerCase()
    return (
      (o.name || '').toLowerCase().includes(q) ||
      (o.email || '').toLowerCase().includes(q) ||
      (o.phone || '').toLowerCase().includes(q) ||
      (o.brand_model || '').toLowerCase().includes(q)
    )
  })

  const filteredBookings = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (b.name || '').toLowerCase().includes(q) ||
      (b.email || '').toLowerCase().includes(q) ||
      (b.phone || '').toLowerCase().includes(q) ||
      (b.order_id || '').toLowerCase().includes(q)
    )
  })

  if (!authed) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-100 p-8 w-80">
        <h1 className="text-lg font-semibold mb-4 text-[#0F2D6B]">Admin login</h1>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          placeholder="Password" onKeyDown={e => { if (e.key === 'Enter') { const ok = pw === ADMIN_PASS; if (ok) sessionStorage.setItem('cyklaupp_admin','true'); setAuthed(ok) }}}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#0F2D6B]" />
        <button onClick={() => { const ok = pw === ADMIN_PASS; if (ok) sessionStorage.setItem('cyklaupp_admin','true'); setAuthed(ok) }}
          className="w-full bg-[#0F2D6B] text-white rounded-lg py-2 text-sm font-medium">Login</button>
        {pw && pw !== ADMIN_PASS && <p className="text-red-500 text-xs mt-2">Wrong password</p>}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="bike" className="max-w-full max-h-full rounded-xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl">✕</button>
        </div>
      )}

      {/* 1. Confirm 弹框 */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Confirm booking</h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmTarget.name} — {confirmTarget.bike?.name_en}
            </p>

            <p className="text-xs font-medium text-gray-700 mb-1">Note / Comment to customer (optional)</p>
            <textarea
              rows={3}
              placeholder="e.g. Please bring your ID card. Meet at Flogsta entrance."
              value={confirmComment}
              onChange={e => setConfirmComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              A confirmation email will be sent to {confirmTarget.email} with deposit status <strong>To be paid at pickup</strong>.
            </p>

            <div className="flex gap-2">
              <button onClick={handleConfirm} disabled={confirming}
                className="flex-1 bg-[#0F2D6B] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                {confirming ? 'Confirming...' : 'Confirm & send email'}
              </button>
              <button onClick={() => setConfirmTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Record Deposit 弹框 */}
      {depositTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">
              {depositTarget.deposit_amount > 0 ? 'Edit recorded deposit' : 'Record deposit received'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {depositTarget.name} ({depositTarget.order_id || 'Booking'})
            </p>

            <p className="text-xs font-medium text-gray-500 mb-2">Deposit collected (SEK)</p>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {DEPOSIT_OPTIONS.map(d => (
                <button key={d} type="button"
                  onClick={() => { setDepositAmount(d); setCustomDeposit('') }}
                  className={"rounded-lg border-2 py-2 text-sm font-medium transition-all " +
                    (depositAmount === d && !customDeposit
                      ? 'border-[#0F2D6B] bg-[#0F2D6B] text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300')}>
                  {d}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom amount"
              value={customDeposit}
              onChange={e => { setCustomDeposit(e.target.value); setDepositAmount(0) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              An official deposit receipt email will be sent to {depositTarget.email}.
            </p>

            <div className="flex gap-2">
              <button onClick={handleRecordDeposit} disabled={savingDeposit}
                className="flex-1 bg-[#0F2D6B] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                {savingDeposit ? 'Saving...' : 'Save & Send receipt'}
              </button>
              <button onClick={() => setDepositTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cancel 弹框 */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-red-600 mb-1">Cancel booking</h3>
            <p className="text-sm text-gray-500 mb-4">
              {cancelTarget.name} — {cancelTarget.bike?.name_en}
            </p>

            <p className="text-xs font-medium text-gray-700 mb-1">Reason / Note to customer (optional)</p>
            <textarea
              rows={3}
              placeholder="e.g. Bike requires urgent maintenance / Unable to contact user."
              value={cancelComment}
              onChange={e => setCancelComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-red-500 mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              A cancellation email with details will be sent to {cancelTarget.email}.
            </p>

            <div className="flex gap-2">
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {cancelling ? 'Cancelling...' : 'Cancel booking & notify'}
              </button>
              <button onClick={() => setCancelTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3b. Notify about new bikes 弹框 */}
      {notifyTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Notify about new bikes</h3>
            <p className="text-sm text-gray-500 mb-4">
              {notifyTarget.name} — {notifyTarget.email}
            </p>

            {notifyTarget.notified_new_bikes_count > 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                ⚠ Already notified {notifyTarget.notified_new_bikes_count}x
                {notifyTarget.notified_new_bikes_at && ` (last on ${new Date(notifyTarget.notified_new_bikes_at).toLocaleDateString('en-SE', { dateStyle: 'medium' })})`}
              </p>
            )}

            <p className="text-xs font-medium text-gray-700 mb-1">Message (editable)</p>
            <textarea
              rows={4}
              value={notifyComment}
              onChange={e => setNotifyComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              An email with a link to the site will be sent to {notifyTarget.email}.
            </p>

            <div className="flex gap-2">
              <button onClick={handleNotifyNewBikes} disabled={notifying || !notifyComment.trim()}
                className="flex-1 bg-[#0F2D6B] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#1a3f8f] disabled:opacity-60">
                {notifying ? 'Sending...' : 'Send email'}
              </button>
              <button onClick={() => setNotifyTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Confirm offer 弹框 */}
      {confirmOfferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Confirm sell offer</h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmOfferTarget.name} — {confirmOfferTarget.price} SEK
            </p>

            <p className="text-xs font-medium text-gray-700 mb-1">Note to seller (optional)</p>
            <textarea
              rows={3}
              placeholder="e.g. We'll come by Flogsta around 3pm on your chosen date."
              value={confirmOfferComment}
              onChange={e => setConfirmOfferComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              An email will be sent to {confirmOfferTarget.email} letting them know we'd like to buy the bike.
            </p>

            <div className="flex gap-2">
              <button onClick={handleConfirmOffer} disabled={confirmingOffer}
                className="flex-1 bg-[#0F2D6B] text-white py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
                {confirmingOffer ? 'Confirming...' : 'Confirm & send email'}
              </button>
              <button onClick={() => setConfirmOfferTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Complete offer 弹框 */}
      {completeOfferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Mark as purchased</h3>
            <p className="text-sm text-gray-500 mb-4">
              {completeOfferTarget.name} — asked {completeOfferTarget.price} SEK
            </p>

            <p className="text-xs font-medium text-gray-500 mb-1">Amount actually paid (SEK)</p>
            <input
              type="number"
              min={0}
              value={finalPrice}
              onChange={e => setFinalPrice(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-3"
            />

            <p className="text-xs font-medium text-gray-500 mb-1">Payment method used</p>
            <select
              value={finalPaymentMethod}
              onChange={e => setFinalPaymentMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-3 bg-white"
            >
              <option value="" disabled>Select a method</option>
              <option value="swish">Swish</option>
              <option value="card">Card</option>
              <option value="revolut">Revolut</option>
              <option value="cash">Cash</option>
            </select>

            <p className="text-xs font-medium text-gray-700 mb-1">Note to seller (optional)</p>
            <textarea
              rows={2}
              placeholder="e.g. Thanks again, enjoy your day!"
              value={completeOfferComment}
              onChange={e => setCompleteOfferComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              A confirmation email will be sent to {completeOfferTarget.email}.
            </p>

            <div className="flex gap-2">
              <button onClick={handleCompleteOffer} disabled={completingOffer || !finalPaymentMethod || !finalPrice}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60">
                {completingOffer ? 'Saving...' : 'Confirm purchase & send email'}
              </button>
              <button onClick={() => setCompleteOfferTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Decline offer 弹框 */}
      {declineOfferTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-red-600 mb-1">Decline sell offer</h3>
            <p className="text-sm text-gray-500 mb-4">
              {declineOfferTarget.name} — {declineOfferTarget.price} SEK
            </p>

            <p className="text-xs font-medium text-gray-700 mb-1">Reason / note to seller (optional)</p>
            <textarea
              rows={3}
              placeholder="e.g. Bike condition didn't match the description."
              value={declineOfferComment}
              onChange={e => setDeclineOfferComment(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:border-red-500 mb-4"
            />

            <p className="text-xs text-gray-400 mb-4">
              A decline email will be sent to {declineOfferTarget.email}.
            </p>

            <div className="flex gap-2">
              <button onClick={handleDeclineOffer} disabled={decliningOffer}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60">
                {decliningOffer ? 'Declining...' : 'Decline & notify'}
              </button>
              <button onClick={() => setDeclineOfferTarget(null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-[#0F2D6B]">CyklaUpp Admin</h1>
          <div className="flex gap-2">
            {(['bikes','bookings','offers'] as const).map(t2 => (
              <button key={t2} onClick={() => setTab(t2)}
                className={"px-4 py-1.5 rounded-lg text-sm font-medium transition-colors " +
                  (tab === t2 ? 'bg-[#0F2D6B] text-white' : 'bg-white border border-gray-200 text-gray-600')}>
                {t2 === 'offers' ? 'Sell offers' : t2.charAt(0).toUpperCase() + t2.slice(1)}
                {t2 === 'bookings' && bookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-[#0F2D6B] text-xs font-bold rounded-full px-1.5">
                    {bookings.filter(b => b.status === 'pending').length}
                  </span>
                )}
                {t2 === 'offers' && offers.filter(o => o.status === 'new').length > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-[#0F2D6B] text-xs font-bold rounded-full px-1.5">
                    {offers.filter(o => o.status === 'new').length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {tab === 'bikes' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Add new bike</h2>
              <BikeFormFields data={newBike} onChange={setNewBike} />
              <button onClick={addBike} disabled={adding || !newBike.name_en}
                className="mt-3 bg-[#0F2D6B] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {adding ? 'Adding...' : 'Add bike'}
              </button>
            </div>

            <div className="space-y-3">
              {bikes.map(bike => (
                <div key={bike.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{bike.name_en}</p>
                          {bike.bike_number && (
                            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{bike.bike_number}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {bike.price_month} SEK/month · {bike.price_semester} SEK/semester
                        </p>
                      </div>
                      <select value={bike.status} onChange={e => updateBikeStatus(bike.id, e.target.value as Bike['status'])}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">
                        <option value="available">Available</option>
                        <option value="rented">Rented</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                      <button onClick={() => editingId === bike.id ? setEditingId(null) : startEdit(bike)}
                        className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0">
                        {editingId === bike.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button onClick={() => deleteBike(bike.id)}
                        className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0">
                        Delete
                      </button>
                    </div>

                    {(() => {
                      const imgs = (bike.image_urls && bike.image_urls.length > 0)
                        ? bike.image_urls
                        : (bike.image_url ? [bike.image_url] : [])
                      const slots = Array.from({ length: 5 })
                      return (
                        <div className="flex gap-2">
                          {slots.map((_, idx) => {
                            const url = imgs[idx]
                            if (url) {
                              return (
                                <div key={idx} className="relative group w-16 h-14 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                                  <img src={url} alt="" className="w-full h-full object-cover cursor-pointer hover:opacity-80"
                                    onClick={() => setLightboxUrl(url)} />
                                  <button
                                    onClick={() => handleDeleteImage(bike.id, url)}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs hidden group-hover:flex items-center justify-center leading-none">
                                    ×
                                  </button>
                                </div>
                              )
                            } else {
                              return (
                                <button key={idx}
                                  onClick={() => { setUploadTarget(bike.id); fileRef.current?.click() }}
                                  disabled={uploading === bike.id}
                                  className="w-16 h-14 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-[#0F2D6B] hover:text-[#0F2D6B] transition-colors shrink-0 text-xl disabled:opacity-50">
                                  {uploading === bike.id && imgs.length === idx ? '...' : '+'}
                                </button>
                              )
                            }
                          })}
                        </div>
                      )
                    })()}
                  </div>
                  {editingId === bike.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <BikeFormFields data={editBike} onChange={setEditBike} />
                      <button onClick={() => saveEdit(bike.id)} disabled={saving}
                        className="mt-3 bg-[#0F2D6B] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save changes'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            <input
              type="text"
              placeholder="Search by name, email, phone or order number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4 bg-white"
            />

            <div className="space-y-3">
              {filteredBookings.length === 0 && (
                <p className="text-gray-400 text-sm">{search ? 'No results found.' : 'No bookings yet.'}</p>
              )}
              {filteredBookings.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* 未展开时的标题行 */}
                  <div className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}>
                    <div className="w-14 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {b.bike?.image_url
                        ? <img src={b.bike.image_url} alt={b.bike.name_en} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">?</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{b.name}</span>
                        <span className="text-gray-400 font-normal text-sm">— {b.email}</span>
                        {b.phone && (
                          <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            {b.phone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {b.order_id && <span className="font-mono mr-2 text-[#0F2D6B] font-semibold">{b.order_id}</span>}
                        {b.bike?.name_en || 'Unknown'} · {planLabels[b.plan] || b.plan} · {b.pickup_date}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Submitted: {new Date(b.created_at).toLocaleString('en-SE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className={"text-xs px-2 py-1 rounded-full font-medium " + (statusBadge[b.status] || '')}>
                      {b.status}
                    </span>
                    <span className="text-gray-300 text-sm">{expandedBooking === b.id ? '▲' : '▼'}</span>
                  </div>

                  {/* 展开详情 */}
                  {expandedBooking === b.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <div className="flex gap-6 mb-4">
                        {b.bike?.image_url && (
                          <div className="w-40 h-32 rounded-xl overflow-hidden shrink-0 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxUrl(b.bike!.image_url!)}>
                            <img src={b.bike.image_url} alt={b.bike.name_en} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Bike</p>
                            <p className="font-medium">{b.bike?.name_en || '—'}</p>
                            {b.bike?.bike_number && (
                              <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{b.bike.bike_number}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Plan & Date</p>
                            <p className="font-medium">{planLabels[b.plan] || b.plan}</p>
                            <p className="text-xs text-gray-400">Pickup: {b.pickup_date}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Submitted</p>
                            <p className="font-medium text-sm">{new Date(b.created_at).toLocaleString('en-SE', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Location</p>
                            <p className="font-medium">{b.pickup_location}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Contact</p>
                            <p className="font-medium">{b.name}</p>
                            <p className="text-xs text-gray-400">{b.email}</p>
                            <p className="text-xs text-gray-600 font-mono mt-0.5">{b.phone || '—'}</p>
                          </div>
                          {b.order_id && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Order ID</p>
                              <p className="font-mono font-medium">{b.order_id}</p>
                            </div>
                          )}

                          {/* 动态精确展示 Supabase 里的 deposit_amount 与 deposit_returned */}
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Deposit Status</p>
                            {b.deposit_amount && b.deposit_amount > 0 ? (
                              <div>
                                <p className="font-semibold text-green-700">{b.deposit_amount} SEK (Recorded)</p>
                                <p className={"text-xs mt-0.5 " + (b.deposit_returned ? 'text-green-600 font-medium' : 'text-amber-600')}>
                                  {b.deposit_returned ? '✓ Refunded to customer' : '⏳ Deposit currently held'}
                                </p>
                              </div>
                            ) : (
                              <p className="text-amber-600 font-medium text-xs">0 SEK (Not collected yet)</p>
                            )}
                          </div>

                          {b.notes && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400 mb-1">User Notes</p>
                              <p className="text-gray-600">{b.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 按钮区域 */}
                      <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-gray-200/60">

                        {/* 1. Pending 状态控制 */}
                        {b.status === 'pending' && (
                          <>
                            <button onClick={() => setConfirmTarget(b)}
                              className="bg-[#0F2D6B] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1a3f8f] font-medium">
                              ✓ Confirm booking
                            </button>
                            <button onClick={() => setCancelTarget(b)}
                              className="bg-white text-red-500 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                              ✕ Cancel
                            </button>
                          </>
                        )}

                        {/* 2. Confirmed 状态控制 */}
                        {b.status === 'confirmed' && (
                          <>
                            {/* 未收押金时才显示“录入押金”按钮 */}
                            {(!b.deposit_amount || b.deposit_amount === 0) ? (
                              <button onClick={() => setDepositTarget(b)}
                                className="bg-amber-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-amber-600 font-medium">
                                💰 Record deposit received
                              </button>
                            ) : (
                              /* 已收押金后，变更为状态提示按钮，防止重复多点，但保留 Edit 修改选项 */
                              <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-800 font-medium">
                                <span>✓ Deposit paid ({b.deposit_amount} SEK)</span>
                                <button onClick={() => setDepositTarget(b)} className="text-gray-400 hover:text-gray-600 underline ml-2">
                                  Edit
                                </button>
                              </div>
                            )}

                            {/* 还车按钮 */}
                            <button onClick={() => handleComplete(b)}
                              className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 font-medium">
                              ✓ Mark bike as returned
                            </button>

                            {/* Cancel 按钮在 Confirmed 下仍保留 */}
                            <button onClick={() => setCancelTarget(b)}
                              className="bg-white text-red-500 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                              ✕ Cancel
                            </button>
                          </>
                        )}

                        {/* 3. 退还押金按钮逻辑（已收押金且未退还时可点） */}
                        {b.deposit_amount > 0 && !b.deposit_returned && (
                          <button onClick={() => handleDepositReturned(b.id)}
                            className="bg-white text-[#0F2D6B] border border-[#0F2D6B]/30 text-xs px-3 py-2 rounded-lg hover:bg-blue-50">
                            ↩ Mark deposit refunded to customer
                          </button>
                        )}

                        {/* 4. Cancelled / Completed：发"新车上架"通知邮件 */}
                        {(b.status === 'cancelled' || b.status === 'completed') && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {b.notified_new_bikes_count > 0 && (
                              <span className="text-xs text-green-600">
                                ✓ Notified {b.notified_new_bikes_count}x
                                {b.notified_new_bikes_at && ` · last ${new Date(b.notified_new_bikes_at).toLocaleDateString('en-SE', { dateStyle: 'medium' })}`}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setNotifyTarget(b)
                                setNotifyComment(b.status === 'completed' ? DEFAULT_NOTIFY_MESSAGE_COMPLETED : DEFAULT_NOTIFY_MESSAGE_CANCELLED)
                              }}
                              className={b.notified_new_bikes_count > 0
                                ? "text-xs text-gray-400 underline hover:text-gray-600"
                                : "bg-white text-[#0F2D6B] border border-[#0F2D6B]/30 text-xs px-3 py-2 rounded-lg hover:bg-blue-50"}
                            >
                              {b.notified_new_bikes_count > 0 ? 'Send again' : '📢 Notify about new bikes'}
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'offers' && (
          <div>
            <input
              type="text"
              placeholder="Search by name, email, phone or brand/model..."
              value={offerSearch}
              onChange={e => setOfferSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0F2D6B] mb-4 bg-white"
            />

            <div className="space-y-3">
              {filteredOffers.length === 0 && (
                <p className="text-gray-400 text-sm">{offerSearch ? 'No results found.' : 'No sell offers yet.'}</p>
              )}
              {filteredOffers.map(o => (
                <div key={o.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* 未展开时的标题行 */}
                  <div className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedOffer(expandedOffer === o.id ? null : o.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{o.name}</span>
                        <span className="text-gray-400 font-normal text-sm">— {o.email}</span>
                        <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {o.phone}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        <span className="font-semibold text-[#0F2D6B] mr-2">{o.price} SEK</span>
                        {o.brand_model || 'Brand/model not given'} · {offerConditionLabels[o.condition] || o.condition} · {o.location}
                      </p>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Submitted: {new Date(o.created_at).toLocaleString('en-SE', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                    <span className={"text-xs px-2 py-1 rounded-full font-medium " + (offerStatusBadge[o.status] || '')}>
                      {o.status}
                    </span>
                    <span className="text-gray-300 text-sm">{expandedOffer === o.id ? '▲' : '▼'}</span>
                  </div>

                  {/* 展开详情 */}
                  {expandedOffer === o.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Asking price</p>
                          <p className="font-semibold text-[#0F2D6B]">{o.price} SEK</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Condition</p>
                          <p className="font-medium">{offerConditionLabels[o.condition] || o.condition}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Brand / model</p>
                          <p className="font-medium">{o.brand_model || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Drop-off location</p>
                          <p className="font-medium">{o.location}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Earliest viewing date</p>
                          <p className="font-medium">{o.available_date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Preferred payment</p>
                          <p className="font-medium">{offerPaymentLabels[o.payment_method] || o.payment_method}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Contact</p>
                          <p className="font-medium">{o.name}</p>
                          <p className="text-xs text-gray-400">{o.email}</p>
                          <p className="text-xs text-gray-600 font-mono mt-0.5">{o.phone}</p>
                        </div>
                        {o.status === 'completed' && (
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Final payment</p>
                            <p className="font-semibold text-green-700">{o.final_price} SEK</p>
                            <p className="text-xs text-gray-500">via {offerPaymentLabels[o.final_payment_method || ''] || o.final_payment_method}</p>
                          </div>
                        )}
                        {o.notes && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-1">Seller notes</p>
                            <p className="text-gray-600">{o.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* 按钮区域 */}
                      <div className="flex gap-2 flex-wrap items-center pt-2 border-t border-gray-200/60">
                        {o.status === 'new' && (
                          <>
                            <button onClick={() => setConfirmOfferTarget(o)}
                              className="bg-[#0F2D6B] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1a3f8f] font-medium">
                              ✓ Confirm
                            </button>
                            <button onClick={() => setDeclineOfferTarget(o)}
                              className="bg-white text-red-500 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                              ✕ Decline
                            </button>
                          </>
                        )}

                        {o.status === 'confirmed' && (
                          <>
                            <button onClick={() => openCompleteOffer(o)}
                              className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700 font-medium">
                              ✓ Mark as purchased
                            </button>
                            <button onClick={() => setDeclineOfferTarget(o)}
                              className="bg-white text-red-500 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                              ✕ Decline
                            </button>
                          </>
                        )}

                        {(o.status === 'completed' || o.status === 'declined') && (
                          <span className="text-xs text-gray-400">Offer closed.</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}