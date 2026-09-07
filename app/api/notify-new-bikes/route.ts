import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { bookingId, comment } = await req.json()
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const { error: emailError } = await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: booking.email,
    subject: 'We have new bikes available — CyklaUpp',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${booking.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          ${comment && comment.trim()
            ? comment.trim().replace(/\n/g, '<br/>')
            : "We know your last booking with us didn't work out, but we now have new bikes available! Come take a look and find one that suits you."}
        </p>

        <a href="https://www.cyklaupp.se"
          style="display: inline-block; background: #0F2D6B; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 8px 0 24px;">
          Browse bikes →
        </a>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  if (emailError) {
    console.error('Resend Email Send Error:', emailError)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      notified_new_bikes_count: (booking.notified_new_bikes_count || 0) + 1,
      notified_new_bikes_at: new Date().toISOString(),
    })
    .eq('id', bookingId)

  if (updateError) {
    console.error('Supabase Update Error:', updateError)
  }

  return NextResponse.json({ success: true })
}
