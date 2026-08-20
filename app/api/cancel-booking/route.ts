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
    .select('*, bike:bikes(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // 更新订单状态为 cancelled
  await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId)

  // 释放车辆状态为 available
  if (booking.bike_id) {
    await supabase.from('bikes').update({ status: 'available' }).eq('id', booking.bike_id)
  }

  // 发送取消邮件给用户
  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: booking.email,
    subject: `Booking cancelled — ${booking.order_id || 'CyklaUpp'}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${booking.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          Your booking for <strong>${booking.bike?.name_en || 'the bike'}</strong> (Order: ${booking.order_id || 'N/A'}) has been cancelled.
        </p>

        ${comment ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #991b1b;">Reason / Note from CyklaUpp:</p>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d; white-space: pre-line;">${comment}</p>
        </div>
        ` : ''}

        <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
          If you have any questions or think this was a mistake, please reply to this email or contact us.
        </p>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}