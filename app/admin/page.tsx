'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useRef } from 'react'
import { supabase, Bike, Booking } from '@/lib/supabase'

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

type BookingWithBike = Booking & { bike?: Bike }

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
  const [tab, setTab] = useState<'bikes' | 'bookings'>('bikes')
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Confirm 弹框
  const [confirmTarget, setConfirmTarget] = useState<BookingWithBike | null>(null)
  const [depositAmount, setDepositAmount] = useState(500)
  const [customDeposit, setCustomDeposit] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Bikes
  const [newBike, setNewBike] = useState({ ...emptyBike })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBike, setEditBike] = useState({ ...emptyBike })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!authed) return; fetchBikes(); fetchBookings() }, [authed])

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

  // Confirm 弹框提交
  async function handleConfirm() {
    if (!confirmTarget) return
    setConfirming(true)
    const deposit = customDeposit ? parseInt(customDeposit) : depositAmount
    const res = await fetch('/api/confirm-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: confirmTarget.id, depositAmount: deposit }),
    })
    setConfirming(false)
    if (res.ok) {
      setConfirmTarget(null)
      setCustomDeposit('')
      setDepositAmount(500)
      fetchBookings()
      fetchBikes()
    }
  }

  // 还车
  async function handleComplete(booking: BookingWithBike) {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', booking.id)
    if (booking.bike_id) {
      await supabase.from('bikes').update({ status: 'available' }).eq('id', booking.bike_id)
    }
    fetchBookings()
    fetchBikes()
  }

  // 取消
  async function handleCancel(booking: BookingWithBike) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id)
    if (booking.bike_id) {
      await supabase.from('bikes').update({ status: 'available' }).eq('id', booking.bike_id)
    }
    fetchBookings()
    fetchBikes()
  }

  // 押金已退
  async function handleDepositReturned(bookingId: string) {
    await supabase.from('bookings').update({ deposit_returned: true }).eq('id', bookingId)
    fetchBookings()
  }

  async function updateBikeStatus(bikeId: string, status: Bike['status']) {
    await supabase.from('bikes').update({ status }).eq('id', bikeId)
    fetchBikes()
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadTarget || !e.target.files?.[0]) return
    setUploading(uploadTarget)
    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const path = `bikes/${uploadTarget}.${ext}`
    const { error } = await supabase.storage.from('bike-photos').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('bike-photos').getPublicUrl(path)
      await supabase.from('bikes').update({ image_url: data.publicUrl }).eq('id', uploadTarget)
      fetchBikes()
    }
    setUploading(null)
    e.target.value = ''
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

  // 搜索过滤
  const filteredBookings = bookings.filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.email.toLowerCase().includes(q) ||
      (b.order_id?.toLowerCase().includes(q) ?? false)
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

      {/* Confirm 弹框 */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Confirm booking</h3>
            <p className="text-sm text-gray-500 mb-4">
              {confirmTarget.name} — {confirmTarget.bike?.name_en}
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
              A confirmation email with order number will be sent to {confirmTarget.email}
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

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-semibold text-[#0F2D6B]">CyklaUpp Admin</h1>
          <div className="flex gap-2">
            {(['bikes','bookings'] as const).map(t2 => (
              <button key={t2} onClick={() => setTab(t2)}
                className={"px-4 py-1.5 rounded-lg text-sm font-medium transition-colors " +
                  (tab === t2 ? 'bg-[#0F2D6B] text-white' : 'bg-white border border-gray-200 text-gray-600')}>
                {t2.charAt(0).toUpperCase() + t2.slice(1)}
                {t2 === 'bookings' && bookings.filter(b => b.status === 'pending').length > 0 && (
                  <span className="ml-1.5 bg-yellow-400 text-[#0F2D6B] text-xs font-bold rounded-full px-1.5">
                    {bookings.filter(b => b.status === 'pending').length}
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
                  <div className="p-4 flex items-center gap-4">
                    <div
                      className="w-20 h-16 bg-gray-50 rounded-lg overflow-hidden shrink-0 cursor-pointer hover:opacity-80"
                      onClick={() => bike.image_url && setLightboxUrl(bike.image_url)}>
                      {bike.image_url
                        ? <img src={bike.image_url} alt={bike.name_en} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">no photo</div>
                      }
                    </div>
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
                    <button onClick={() => { setUploadTarget(bike.id); fileRef.current?.click() }}
                      className="text-xs text-[#0F2D6B] border border-[#0F2D6B]/30 px-3 py-1.5 rounded-lg hover:bg-blue-50 shrink-0">
                      {uploading === bike.id ? 'Uploading...' : 'Upload photo'}
                    </button>
                    <button onClick={() => editingId === bike.id ? setEditingId(null) : startEdit(bike)}
                      className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shrink-0">
                      {editingId === bike.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button onClick={() => deleteBike(bike.id)}
                      className="text-xs text-red-400 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0">
                      Delete
                    </button>
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
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}

        {tab === 'bookings' && (
          <div>
            {/* 搜索框 */}
            <input
              type="text"
              placeholder="Search by name, email or order number..."
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
                  {/* 概览行 */}
                  <div className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedBooking(expandedBooking === b.id ? null : b.id)}>
                    <div className="w-14 h-12 bg-gray-50 rounded-lg overflow-hidden shrink-0">
                      {b.bike?.image_url
                        ? <img src={b.bike.image_url} alt={b.bike.name_en} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-200 text-xs">?</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{b.name}
                        <span className="text-gray-400 font-normal text-sm"> — {b.email}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.order_id && <span className="font-mono mr-2">{b.order_id}</span>}
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
                          </div>
                          {b.order_id && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Order ID</p>
                              <p className="font-mono font-medium">{b.order_id}</p>
                            </div>
                          )}
                          {b.deposit_amount > 0 && (
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Deposit</p>
                              <p className="font-medium">{b.deposit_amount} SEK</p>
                              <p className={"text-xs " + (b.deposit_returned ? 'text-green-600' : 'text-yellow-600')}>
                                {b.deposit_returned ? '✓ Returned' : '⏳ Not yet returned'}
                              </p>
                            </div>
                          )}
                          {b.notes && (
                            <div className="col-span-2">
                              <p className="text-xs text-gray-400 mb-1">Notes</p>
                              <p className="text-gray-600">{b.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      {b.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => setConfirmTarget(b)}
                            className="bg-[#0F2D6B] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1a3f8f]">
                            ✓ Confirm booking
                          </button>
                          <button onClick={() => handleCancel(b)}
                            className="bg-white text-red-500 border border-red-200 text-sm px-4 py-2 rounded-lg hover:bg-red-50">
                            ✕ Cancel
                          </button>
                        </div>
                      )}

                      {b.status === 'confirmed' && (
                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleComplete(b)}
                            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-700">
                            ✓ Mark as returned — bike available again
                          </button>
                          {b.deposit_amount > 0 && !b.deposit_returned && (
                            <button onClick={() => handleDepositReturned(b.id)}
                              className="bg-white text-[#0F2D6B] border border-[#0F2D6B]/30 text-sm px-4 py-2 rounded-lg hover:bg-blue-50">
                              💰 Deposit returned
                            </button>
                          )}
                        </div>
                      )}

                      {(b.status === 'completed' || b.status === 'cancelled') && (
                        <div className="flex items-center gap-3">
                          <p className="text-xs text-gray-400">This booking is closed.</p>
                          {b.deposit_amount > 0 && !b.deposit_returned && (
                            <button onClick={() => handleDepositReturned(b.id)}
                              className="bg-white text-[#0F2D6B] border border-[#0F2D6B]/30 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50">
                              💰 Mark deposit returned
                            </button>
                          )}
                        </div>
                      )}
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
