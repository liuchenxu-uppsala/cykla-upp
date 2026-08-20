import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { bookingId, depositAmount } = await req.json()
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  }

  const amount = Number(depositAmount) || 0

  // 查询订单
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, bike:bikes(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // 更新押金
  const { error: updateError } = await supabase
    .from('bookings')
    .update({ deposit_amount: amount })
    .eq('id', bookingId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to record deposit' }, { status: 500 })
  }

  // 发押金收到确认邮件
  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: booking.email,
    subject: `Deposit received (${amount} SEK) — ${booking.order_id || 'CyklaUpp'}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${booking.name}, deposit payment received!</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #166534;">Deposit collected</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #15803d;">${amount} SEK</p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
          We have recorded your deposit for order <strong>${booking.order_id}</strong>. 
          This deposit will be fully refunded to you when the bike is returned in good condition.
        </p>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}