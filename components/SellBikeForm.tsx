'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/lang'

type Step = 'form' | 'otp' | 'done'

const inputCls = "border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"

// 计算"最早可看车日期"：瑞典时间 15:00 之后提交，最早只能选明天
function getMinAvailableDate(): string {
  const now = new Date()
  const stockholmHour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', hour: '2-digit', hour12: false }).format(now)
  )
  // "YYYY-MM-DD"，已经是瑞典当地日历日期，不用再做任何时区转换
  const stockholmDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm' }).format(now)

  if (stockholmHour < 15) {
    return stockholmDateStr
  }

  // 15点之后：往后推一天。用 UTC 正午作为锚点纯做日期加法，
  // 避免 toISOString() 把本地午夜换算成 UTC 时跨回前一天。
  const [y, m, d] = stockholmDateStr.split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  anchor.setUTCDate(anchor.getUTCDate() + 1)
  return anchor.toISOString().split('T')[0]
}

export default function SellBikeForm() {
  const { t, lang } = useLang()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('flogsta')
  const [price, setPrice] = useState('')
  const [brandModel, setBrandModel] = useState('')
  const [condition, setCondition] = useState('good')
  const [availableDate, setAvailableDate] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('swish')
  const [notes, setNotes] = useState('')
  const [ownershipConfirmed, setOwnershipConfirmed] = useState(false)

  const [minDate, setMinDate] = useState('')
  useEffect(() => { setMinDate(getMinAvailableDate()) }, [])

  const [step, setStep] = useState<Step>('form')
  const [otp, setOtp] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const locationOptions = [
    { value: 'flogsta',    label: t.loc_flogsta },
    { value: 'ekonomikum', label: t.loc_ekonomikum },
    { value: 'angstrom',   label: t.loc_angstrom },
    { value: 'bmc',        label: t.loc_bmc },
  ]

  const conditionOptions = [
    { value: 'like_new',     label: t.sell_condition_like_new },
    { value: 'good',         label: t.sell_condition_good },
    { value: 'fair',         label: t.sell_condition_fair },
    { value: 'needs_repair', label: t.sell_condition_needs_repair },
  ]

  const paymentOptions = [
    { value: 'swish',   label: 'Swish' },
    { value: 'card',    label: lang === 'sv' ? 'Kort' : 'Card' },
    { value: 'revolut', label: 'Revolut' },
    { value: 'cash',    label: lang === 'sv' ? 'Kontant' : 'Cash' },
    { value: 'any',     label: t.sell_payment_any },
  ]

  const priceNum = Number(price) || 0
  const showPriceWarning = price !== '' && priceNum > 500

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !phone.trim() || !price || !availableDate || !paymentMethod) {
      setError(t.sell_error)
      return
    }
    if (minDate && availableDate < minDate) {
      setError(t.sell_date_error)
      return
    }
    if (!ownershipConfirmed) {
      setError(t.sell_ownership_error)
      return
    }

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

  async function handleVerifyAndSubmit() {
    if (!otp || otp.length !== 6) { setError('Please enter the 6-digit code'); return }
    setError('')
    setVerifyingOtp(true)

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

    setLoading(true)
    const res = await fetch('/api/sell-bike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, phone, location,
        price: priceNum,
        brandModel, condition, availableDate,
        paymentMethod, notes,
      }),
    })
    const data = await res.json()
    setVerifyingOtp(false)
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Something went wrong'); return }
    setStep('done')
  }

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

  if (step === 'done') {
    return (
      <div className="border border-green-100 bg-green-50 rounded-xl p-8 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="font-semibold text-green-800 mb-1">{t.sell_success}{email}</p>
        <p className="text-sm text-green-600">{t.sell_success_sub}</p>
      </div>
    )
  }

  if (step === 'otp') {
    return (
      <div className="border border-gray-100 rounded-xl p-6 bg-white">
        <div className="text-center mb-6">
          <div className="text-2xl mb-2">📧</div>
          <p className="font-semibold text-gray-900 mb-1">{lang === 'sv' ? 'Kolla din e-post' : 'Check your email'}</p>
          <p className="text-sm text-gray-500">
            {lang === 'sv' ? 'Vi skickade en 6-siffrig kod till ' : 'We sent a 6-digit code to '}
            <span className="font-medium text-gray-700">{email}</span>
          </p>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          <label className="text-xs font-medium text-gray-500 text-center">
            {lang === 'sv' ? 'Verifieringskod' : 'Verification code'}
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="border border-gray-200 bg-white text-gray-900 rounded-lg px-4 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:border-[#0F2D6B] w-full"
            autoFocus
          />
        </div>
        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
        <button
          onClick={handleVerifyAndSubmit}
          disabled={verifyingOtp || loading || otp.length !== 6}
          className="w-full bg-[#0F2D6B] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-60 mb-3"
        >
          {verifyingOtp || loading ? '...' : (lang === 'sv' ? 'Verifiera & skicka' : 'Verify & submit')}
        </button>
        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={countdown > 0 || sendingOtp}
            className="text-sm text-gray-400 hover:text-gray-700 disabled:cursor-not-allowed"
          >
            {countdown > 0
              ? `${lang === 'sv' ? 'Skicka ny kod om' : 'Resend code in'} ${countdown}s`
              : sendingOtp ? '...' : (lang === 'sv' ? 'Skicka ny kod' : 'Resend code')}
          </button>
        </div>
        <button
          onClick={() => { setStep('form'); setOtp(''); setError('') }}
          className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3"
        >
          {t.back}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="border border-gray-100 rounded-xl p-6 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 姓名 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_name}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
        </div>

        {/* 邮箱 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_email}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
        </div>

        {/* 手机号 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_phone}</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+46 70 123 45 67"
            className={inputCls}
          />
        </div>

        {/* 交车地点 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_location}</label>
          <select value={location} onChange={e => setLocation(e.target.value)} className={inputCls}>
            {locationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 品牌/型号（选填） */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_brand}</label>
          <input
            type="text"
            value={brandModel}
            onChange={e => setBrandModel(e.target.value)}
            placeholder={t.sell_brand_ph}
            className={inputCls}
          />
        </div>

        {/* 车况 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_condition}</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} className={inputCls}>
            {conditionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 价格 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_price}</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={e => setPrice(e.target.value)}
            className={inputCls}
          />
          <p className={"text-xs mt-0.5 " + (showPriceWarning ? 'text-amber-600' : 'text-gray-400')}>
            {showPriceWarning ? t.sell_price_warning : t.sell_price_hint}
          </p>
        </div>

        {/* 最早可看车日期 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">{t.sell_available_date}</label>
          <input
            type="date"
            value={availableDate}
            onChange={e => setAvailableDate(e.target.value)}
            min={minDate || undefined}
            lang="en"
            className={inputCls}
          />
        </div>

        {/* 期望收款方式（必填，默认Swish） */}
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t.sell_payment_method}</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={inputCls}>
            {paymentOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 备注 */}
        <div className="flex flex-col gap-1 md:col-span-2">
          <label className="text-xs font-medium text-gray-500">{t.sell_notes}</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t.sell_notes_ph}
            rows={3}
            className={inputCls + " resize-none"}
          />
        </div>
      </div>

      {/* 合法拥有确认 */}
      <div className="flex items-start gap-3 mt-4">
        <input
          type="checkbox"
          id="ownership"
          checked={ownershipConfirmed}
          onChange={e => setOwnershipConfirmed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#0F2D6B] cursor-pointer shrink-0"
        />
        <label htmlFor="ownership" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
          {t.sell_ownership}
        </label>
      </div>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      <button
        type="submit"
        disabled={sendingOtp}
        className="mt-4 w-full bg-[#0F2D6B] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {sendingOtp ? (lang === 'sv' ? 'Skickar kod...' : 'Sending code...') : t.sell_submit}
      </button>
      <p className="text-xs text-gray-400 text-center mt-2">{t.sell_footer}</p>
    </form>
  )
}
