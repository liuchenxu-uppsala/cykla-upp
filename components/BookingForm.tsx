'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/lang'
import { supabase, Bike } from '@/lib/supabase'

type Step = 'form' | 'otp' | 'done'

export default function BookingForm({ bikes, preselectedId }: { bikes: Bike[], preselectedId?: string }) {
  const { t, lang } = useLang()

  // 表单字段
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [bikeId, setBikeId] = useState(preselectedId || (bikes[0]?.id ?? ''))
  const [plan, setPlan] = useState('semester')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('ekonomikum')
  const [notes, setNotes] = useState('')

  // 验证码
  const [step, setStep] = useState<Step>('form')
  const [otp, setOtp] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 外部点击车卡片时同步
  useEffect(() => {
    if (preselectedId) setBikeId(preselectedId)
  }, [preselectedId])

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const selectedBike = bikes.find(b => b.id === bikeId)
  const selectedName = selectedBike
    ? (lang === 'en' ? selectedBike.name_en : selectedBike.name_sv)
    : '—'

  const planOptions = selectedBike ? [
    { value: 'semester', label: t.plan_semester, price: selectedBike.price_semester },
    { value: 'month',    label: t.plan_month,   price: selectedBike.price_month },
    { value: 'week',     label: t.plan_week,    price: selectedBike.price_week },
    { value: 'day',      label: t.plan_day,     price: selectedBike.price_day },
  ] : []

  const locationOptions = [
    { value: 'ekonomikum', label: t.loc_ekonomikum },
    { value: 'angstrom',   label: t.loc_angstrom },
    { value: 'bmc',        label: t.loc_bmc },
  ]

  // 第一步：校验表单，发验证码
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !email || !date) { setError(t.form_error); return }
    if (!bikeId) { setError('Please select a bike first.'); return }
    setError('')
    setSendingOtp(true)
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setSendingOtp(false)
    if (!res.ok) { setError(data.error || 'Failed to send code'); return }
    setStep('otp')
    setCountdown(60)
  }

  // 第二步：验证验证码，提交预约
  async function handleVerifyAndSubmit() {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit code'); return }
    setError('')
    setVerifyingOtp(true)

    // 验证验证码
    const verifyRes = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: otp }),
    })
    const verifyData = await verifyRes.json()
    if (!verifyRes.ok) {
      setVerifyingOtp(false)
      setError(verifyData.error || 'Invalid code')
      return
    }

    // 验证码正确，提交预约
    setLoading(true)
    const { error: sbError } = await supabase.from('bookings').insert({
      bike_id: bikeId,
      name, email, plan,
      pickup_date: date,
      pickup_location: location,
      notes,
      status: 'pending',
    })
    setVerifyingOtp(false)
    setLoading(false)
    if (sbError) { setError(sbError.message); return }
    setStep('done')
  }

  // 重新发验证码
  async function handleResend() {
    if (countdown > 0) return
    setSendingOtp(true)
    await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSendingOtp(false)
    setCountdown(60)
    setOtp('')
    setError('')
  }

  // 完成
  if (step === 'done') {
    return (
      <div className="border border-green-100 bg-green-50 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="font-semibold text-green-800 mb-1">{t.form_success}{email}</p>
        <p className="text-sm text-green-600">We'll get back to you within 24 hours.</p>
      </div>
    )
  }

  // 验证码输入界面
  if (step === 'otp') {
    return (
      <div className="border border-gray-100 rounded-xl p-6 bg-white">
        <div className="text-center mb-6">
          <div className="text-2xl mb-2">📧</div>
          <p className="font-semibold text-gray-900 mb-1">Check your email</p>
          <p className="text-sm text-gray-500">
            We sent a 6-digit code to <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs font-medium text-gray-500 text-center">Verification code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="border border-gray-200 rounded-lg px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-[#0F2D6B] w-full"
            autoFocus
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        <button
          onClick={handleVerifyAndSubmit}
          disabled={verifyingOtp || loading || otp.length !== 6}
          className="w-full bg-[#0F2D6B] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-60 mb-3"
        >
          {verifyingOtp || loading ? '...' : 'Verify & Submit booking'}
        </button>

        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={countdown > 0 || sendingOtp}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:cursor-not-allowed"
          >
            {countdown > 0 ? `Resend code in ${countdown}s` : sendingOtp ? 'Sending...' : 'Resend code'}
          </button>
        </div>

        <button
          onClick={() => { setStep('form'); setOtp(''); setError('') }}
          className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3"
        >
          ← Back
        </button>
      </div>
    )
  }

  // 主表单
  return (
    <form onSubmit={handleSendOtp} className="border border-gray-100 rounded-xl p-6 bg-white">

      {/* 已选车辆提示 */}
      <div className="bg-[#0F2D6B]/5 border border-[#0F2D6B]/15 rounded-lg px-4 py-3 mb-5 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 22 22" fill="none" className="shrink-0">
          <circle cx="7" cy="16" r="4" stroke="#0F2D6B" strokeWidth="1.5" fill="none"/>
          <circle cx="17" cy="16" r="4" stroke="#0F2D6B" strokeWidth="1.5" fill="none"/>
          <path d="M7 16 L11 8 L17 16" stroke="#0F2D6B" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
          <path d="M11 8 L14 12" stroke="#FFD500" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="11" cy="7" r="1.5" fill="#0F2D6B"/>
        </svg>
        <span className="text-sm text-[#0F2D6B]">
          Selected: <span className="font-semibold">{selectedName}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 租赁方案 */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t.form_plan}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {planOptions.map(o => (
              <button
                type="button"
                key={o.value}
                onClick={() => setPlan(o.value)}
                className={`rounded-lg border-2 py-3 px-2 text-center transition-all
                  ${plan === o.value
                    ? 'border-[#0F2D6B] bg-[#0F2D6B] text-white'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
              >
                <p className={`text-xs mb-1 ${plan === o.value ? 'text-white/70' : 'text-gray-400'}`}>{o.label}</p>
                <p className="text-lg font-semibold">{o.price}</p>
                <p className={`text-xs ${plan === o.value ? 'text-white/70' : 'text-gray-400'}`}>SEK</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.form_name}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.form_email}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="name@student.uu.se"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.form_date}</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.form_location}</label>
          <select value={location} onChange={e => setLocation(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] bg-white">
            {locationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t.form_notes}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={t.form_notes_ph} rows={3}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] resize-none" />
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      <button type="submit" disabled={sendingOtp}
        className="mt-4 w-full bg-[#0F2D6B] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-60">
        {sendingOtp ? 'Sending code...' : 'Get verification code →'}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">{t.form_footer}</p>
    </form>
  )
}
