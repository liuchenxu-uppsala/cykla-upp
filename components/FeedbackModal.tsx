'use client'
import { useState } from 'react'
import { useLang } from '@/lib/lang'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { lang } = useLang()

  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [bookingId, setBookingId] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const isSv = lang === 'sv'

  const labels = {
    title: isSv ? 'Lämna återkoppling' : 'Give us Feedback',
    subtitle: isSv ? 'Hjälp oss att göra CyklaUpp bättre!' : 'Help us make CyklaUpp better!',
    category: isSv ? 'Kategori' : 'Category',
    catGeneral: isSv ? 'Allmän förslag' : 'General Suggestion',
    catBooking: isSv ? 'Bokningsfråga' : 'Booking Issue',
    catBug: isSv ? 'Rapportera fel' : 'Website Bug',
    catOther: isSv ? 'Övrigt' : 'Other',
    message: isSv ? 'Ditt meddelande' : 'Your Message',
    messagePh: isSv ? 'Beskriv din idé eller ditt problem...' : 'Describe your idea or problem...',
    email: isSv ? 'E-post (Valfritt)' : 'Email (Optional)',
    emailPh: isSv ? 'Om du vill ha ett svar' : 'If you would like a response',
    bookingId: isSv ? 'Boknings-ID (Valfritt)' : 'Booking ID (Optional)',
    bookingIdPh: isSv ? 'T.ex. om det gäller en befintlig bokning' : 'e.g. if related to an existing order',
    submit: isSv ? 'Skicka återkoppling' : 'Submit Feedback',
    sending: isSv ? 'Skickar...' : 'Sending...',
    successMsg: isSv ? 'Tack för din återkoppling!' : 'Thank you for your feedback!',
    close: isSv ? 'Stäng' : 'Close',
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) {
      setError(isSv ? 'Vänligen fyll i ditt meddelande.' : 'Please enter a message.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message, email, bookingId }),
      })

      const data = await res.json()
      setLoading(false)

      if (!res.ok) {
        setError(data.error || 'Failed to submit feedback')
        return
      }

      setSuccess(true)
    } catch (err) {
      setLoading(false)
      setError('An error occurred. Please try again.')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md flex flex-col p-6 relative shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">{labels.successMsg}</h3>
            <button
              onClick={() => { setSuccess(false); setMessage(''); onClose(); }}
              className="mt-4 bg-[#0F2D6B] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a3f8f]"
            >
              {labels.close}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{labels.title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{labels.subtitle}</p>
            </div>

            {/* Kategori */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{labels.category}</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#0F2D6B]"
              >
                <option value="general">{labels.catGeneral}</option>
                <option value="booking">{labels.catBooking}</option>
                <option value="bug">{labels.catBug}</option>
                <option value="other">{labels.catOther}</option>
              </select>
            </div>

            {/* 反馈内容 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{labels.message} *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={labels.messagePh}
                rows={4}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#0F2D6B] resize-none"
              />
            </div>

            {/* 可选邮箱 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{labels.email}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={labels.emailPh}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#0F2D6B]"
              />
            </div>

            {/* 可选订单号 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">{labels.bookingId}</label>
              <input
                type="text"
                value={bookingId}
                onChange={e => setBookingId(e.target.value)}
                placeholder={labels.bookingIdPh}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#0F2D6B]"
              />
            </div>

            {error && <p className="text-red-500 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0F2D6B] text-white font-semibold py-2.5 rounded-lg hover:bg-[#1a3f8f] transition-colors disabled:opacity-50 text-sm mt-2"
            >
              {loading ? labels.sending : labels.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}