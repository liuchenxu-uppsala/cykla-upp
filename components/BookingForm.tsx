'use client'
import { useState, useEffect } from 'react'
import { useLang } from '@/lib/lang'
import { supabase, Bike } from '@/lib/supabase'

type Step = 'form' | 'otp' | 'done'

const TERMS_EN = `RENTAL TERMS AND CONDITIONS
CyklaUpp — Uppsala

Last updated: August 2025

1. PARTIES
These terms govern the rental agreement between CyklaUpp ("we", "us") and the customer ("you") for bicycle rental services in Uppsala, Sweden.

2. RENTAL PLANS
Monthly rental: One calendar month from the pickup date.
Semester rental: Five (5) calendar months from the pickup date.

3. PRICING AND PAYMENT
Monthly rental: 150 SEK per month.
Semester rental: 600 SEK per semester (5 months).
Payment is due at pickup and can be made via Swish or cash.

4. DEPOSIT
A refundable deposit of 500 SEK is required at the time of pickup.
The deposit will be returned in full when the bicycle is returned in its original condition.
If the bicycle is returned with damage caused by the customer, repair costs will be deducted from the deposit. Additional costs may apply if repair costs exceed the deposit amount.

5. BICYCLE INSPECTION
You are required to carefully inspect the bicycle before accepting it.
Any pre-existing damage must be reported and noted at the time of pickup.
By accepting the bicycle, you confirm it is in acceptable condition. Damage reported after pickup may be considered your responsibility.

6. DAMAGE AND REPAIRS
Normal wear and tear is expected and will not result in charges.
Damage caused by misuse, negligence, or accidents during the rental period will be assessed and repair costs charged to you accordingly.
You agree to notify us immediately if the bicycle is damaged or involved in an accident.

7. LIABILITY DISCLAIMER
CyklaUpp shall not be held liable for any accidents, injuries, or damages occurring during the rental period. By accepting the bicycle, the customer confirms that they have inspected it and found it to be in satisfactory and safe condition for use.

The customer assumes full responsibility for their own safety while riding, including but not limited to the use of a helmet and appropriate bicycle lighting as required by Swedish law. CyklaUpp accepts no liability for any consequences arising from the customer's failure to comply with applicable traffic regulations or safety requirements.

8. THEFT AND LOSS
You are responsible for the security of the bicycle during the rental period.
In the event of theft, you must report it to the police immediately and provide us with a police report.
You may be held liable for the replacement cost of the bicycle if it is stolen due to negligence (e.g. left unlocked).

9. EARLY RETURN
Early returns are accepted at any time.
Your deposit will be returned in full upon return of the bicycle in its original condition.
The rental fee already paid is non-refundable, regardless of when you return the bicycle.

10. PICKUP AND RETURN LOCATIONS
Bicycles can be picked up and returned at the following locations:
- Flogsta
- Ekonomikum (Main campus)
- Angstrom (Engineering campus)
- BMC (Medical campus)
The pickup/return location is selected at the time of booking.

11. CONTACT
For questions or support, contact us at:
Email: cyklaupp@outlook.com
Support hours: Monday to Friday, 09:30 – 17:30 (Uppsala time)`

const TERMS_SV = `HYRESVILLKOR
CyklaUpp — Uppsala

Senast uppdaterad: Augusti 2025

1. PARTER
Dessa villkor reglerar hyresavtalet mellan CyklaUpp ("vi", "oss") och kunden ("du") för cykeluthyrningstjänster i Uppsala, Sverige.

2. HYRESPLANER
Månadshyra: En kalendermånad från upphämtningsdatumet.
Terminshyra: Fem (5) kalendermånader från upphämtningsdatumet.

3. PRISER OCH BETALNING
Månadshyra: 150 SEK per månad.
Terminshyra: 600 SEK per termin (5 månader).
Betalning sker vid upphämtning och kan göras via Swish eller kontant.

4. DEPOSITION
En återbetalningsbar deposition på 500 SEK krävs vid upphämtning.
Depositionen återbetalas i sin helhet när cykeln lämnas tillbaka i originalskick.
Om cykeln återlämnas med skador orsakade av kunden, dras reparationskostnader från depositionen. Ytterligare kostnader kan tillkomma om reparationskostnaderna överstiger depositionsbeloppet.

5. CYKELINSPEKTATION
Du är skyldig att noggrant inspektera cykeln innan du accepterar den.
Befintliga skador måste rapporteras och noteras vid upphämtningstillfället.
Genom att acceptera cykeln bekräftar du att den är i acceptabelt skick. Skador som rapporteras efter upphämtning kan anses vara ditt ansvar.

6. SKADOR OCH REPARATIONER
Normalt slitage förväntas och medför inga avgifter.
Skador orsakade av missbruk, vårdslöshet eller olyckor under hyresperioden bedöms och reparationskostnader debiteras dig i enlighet med detta.
Du förbinder dig att omedelbart meddela oss om cykeln skadas eller är inblandad i en olycka.

7. ANSVARSFRISKRIVNING
CyklaUpp ansvarar inte för olyckor, skador eller personskador som inträffar under hyresperioden. Genom att acceptera cykeln bekräftar kunden att de har inspekterat den och funnit den i tillfredsställande och säkert skick för användning.

Kunden tar fullt ansvar för sin egen säkerhet under cykling, inklusive men inte begränsat till användning av hjälm och lämplig cykelbelysning enligt svensk lag. CyklaUpp accepterar inget ansvar för konsekvenser som uppstår till följd av kundens underlåtenhet att följa tillämpliga trafikregler eller säkerhetskrav.

8. STÖLD OCH FÖRLUST
Du ansvarar för cykelns säkerhet under hyresperioden.
Vid stöld måste du omedelbart anmäla det till polisen och förse oss med en polisanmälan.
Du kan hållas ansvarig för cykelns ersättningskostnad om den stjäls på grund av vårdslöshet (t.ex. lämnad olåst).

9. TIDIG ÅTERLÄMNING
Tidig återlämning accepteras när som helst.
Din deposition återbetalas i sin helhet vid återlämning av cykeln i originalskick.
Den redan betalda hyresavgiften återbetalas inte, oavsett när du lämnar tillbaka cykeln.

10. UPPHÄMTNINGS- OCH ÅTERLÄMNINGSPLATSER
Cyklar kan hämtas upp och lämnas tillbaka på följande platser:
- Flogsta
- Ekonomikum (Huvudcampus)
- Angstrom (Teknikcampus)
- BMC (Medicincampus)
Upphämtnings-/återlämningsplatsen väljs vid bokningstillfället.

11. KONTAKT
För frågor eller support, kontakta oss på:
E-post: cyklaupp@outlook.com
Supporttider: Måndag till fredag, 09:30 – 17:30 (Uppsalatid)`

function TermsModal({ onClose, lang }: { onClose: () => void, lang: string }) {
  const content = lang === 'sv' ? TERMS_SV : TERMS_EN
  const title = lang === 'sv' ? 'Hyresvillkor' : 'Terms and Conditions'
  const downloadLabel = lang === 'sv' ? 'Ladda ner PDF' : 'Download PDF'
  const closeLabel = lang === 'sv' ? 'Stäng' : 'Close'

  async function handleDownload() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const lines = doc.splitTextToSize(content, 180)
    let y = 20
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage()
        y = 20
      }
      doc.text(line, 15, y)
      y += 7
    })
    doc.save('CyklaUpp-Terms-and-Conditions.pdf')
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap font-sans">
            {content}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleDownload}
            className="flex-1 border border-[#0F2D6B] text-[#0F2D6B] text-sm font-medium py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            ↓ {downloadLabel}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-[#0F2D6B] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#1a3f8f] transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BookingForm({ bikes, preselectedId }: { bikes: Bike[], preselectedId?: string }) {
  const { t, lang } = useLang()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [bikeId, setBikeId] = useState(preselectedId || (bikes[0]?.id ?? ''))
  const [plan, setPlan] = useState('semester')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('flogsta')
  const [notes, setNotes] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const [step, setStep] = useState<Step>('form')
  const [otp, setOtp] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (preselectedId) setBikeId(preselectedId)
  }, [preselectedId])

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
  ] : []

  const locationOptions = [
    { value: 'flogsta',    label: t.loc_flogsta },
    { value: 'ekonomikum', label: t.loc_ekonomikum },
    { value: 'angstrom',   label: t.loc_angstrom },
    { value: 'bmc',        label: t.loc_bmc },
  ]

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !date) {
      setError(t.form_error)
      return
    }

    if (!phone.trim()) {
      setError(
        lang === 'sv'
          ? 'Vänligen fyll i ditt telefonnummer.'
          : 'Please enter your phone number.'
      )
      return
    }

    if (!bikeId) { setError('Please select a bike first.'); return }
    const today = new Date().toISOString().split('T')[0]
    if (date < today) { setError('Please select today or a future date.'); return }
    if (!agreedToTerms) { setError(lang === 'sv' ? 'Du måste godkänna villkoren för att fortsätta.' : 'You must agree to the terms and conditions to continue.'); return }

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
    const { error: sbError } = await supabase.from('bookings').insert({
      bike_id: bikeId,
      name,
      email,
      phone: phone.trim(),
      plan,
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
        <p className="font-semibold text-green-800 mb-1">{t.form_success}{email}</p>
        <p className="text-sm text-green-600">We'll get back to you within 24 hours.</p>
      </div>
    )
  }

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

  return (
    <>
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
            <div className="grid grid-cols-2 gap-3">
              {planOptions.map(o => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => setPlan(o.value)}
                  className={`rounded-xl border-2 py-5 px-4 text-center transition-all
                    ${plan === o.value
                      ? 'border-[#0F2D6B] bg-[#0F2D6B] text-white'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                >
                  <p className={`text-sm font-medium mb-2 ${plan === o.value ? 'text-white/80' : 'text-gray-500'}`}>{o.label}</p>
                  <p className="text-3xl font-bold">{o.price} <span className={`text-sm font-normal ${plan === o.value ? 'text-white/70' : 'text-gray-400'}`}>SEK</span></p>
                  <p className={`text-xs mt-1 ${plan === o.value ? 'text-white/60' : 'text-gray-400'}`}>
                    {o.value === 'semester' ? '5 months' : 'per month'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* 姓名 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t.form_name}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"
            />
          </div>

          {/* 邮箱 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t.form_email}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"
            />
          </div>

          {/* 手机号 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              {lang === 'sv' ? 'Telefonnummer' : 'Phone Number'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+46 70 123 45 67"
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"
            />
          </div>

          {/* 提取日期 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">{t.form_date}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              lang="en"
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"
            />
          </div>

          {/* 提取地点 */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-500">{t.form_location}</label>
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B]"
            >
              {locationOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* 备注 */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-gray-500">{t.form_notes}</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={t.form_notes_ph}
              rows={3}
              className="border border-gray-200 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0F2D6B] resize-none"
            />
          </div>
        </div>

        {/* Terms checkbox */}
        <div className="flex items-start gap-3 mt-4">
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#0F2D6B] cursor-pointer shrink-0"
          />
          <label htmlFor="terms" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
            {lang === 'sv' ? 'Jag har läst och godkänner ' : 'I have read and agree to the '}
            <button
              type="button"
              onClick={() => setShowTerms(true)}
              className="text-[#0F2D6B] underline underline-offset-2 hover:text-[#1a3f8f]"
            >
              {lang === 'sv' ? 'hyresvillkoren' : 'Terms and Conditions'}
            </button>
          </label>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <button type="submit" disabled={sendingOtp || !agreedToTerms}
          className="mt-4 w-full bg-[#0F2D6B] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          {sendingOtp ? 'Sending code...' : 'Get verification code →'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">{t.form_footer}</p>
      </form>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} lang={lang} />}
    </>
  )
}