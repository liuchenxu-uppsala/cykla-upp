import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

function generateOrderId() {
  const year = new Date().getFullYear()
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `CU-${year}-${rand}`
}

const planLabels: Record<string, string> = {
  semester: 'Semester (5 months)',
  month: 'Monthly',
  week: 'Weekly',
  day: 'Daily',
}

const locationLabels: Record<string, string> = {
  ekonomikum: 'Ekonomikum (Main campus)',
  angstrom: 'Ångström (Engineering)',
  bmc: 'BMC (Medical campus)',
}

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

  // 查询预约信息
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, bike:bikes(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // 生成订单号
  const orderId = generateOrderId()

  // 更新数据库：状态改为 confirmed，记录押金和订单号
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      order_id: orderId,
      deposit_amount: depositAmount || 0,
    })
    .eq('id', bookingId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }

  // 同时把 bike 状态改为 rented
  if (booking.bike_id) {
    await supabase.from('bikes').update({ status: 'rented' }).eq('id', booking.bike_id)
  }

  // 发确认邮件给用户
  const bikeName = booking.bike?.name_en || 'your bike'
  const planLabel = planLabels[booking.plan] || booking.plan
  const locationLabel = locationLabels[booking.pickup_location] || booking.pickup_location

  await resend.emails.send({
    from: 'CyklaUpp <onboarding@resend.dev>',
    to: booking.email,
    subject: `Booking confirmed — ${orderId}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Your bike rental is confirmed!</p>

        <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Order number</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #0F2D6B; letter-spacing: 2px;">${orderId}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888;">Bike</td>
            <td style="padding: 10px 0; font-weight: 500;">${bikeName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888;">Plan</td>
            <td style="padding: 10px 0; font-weight: 500;">${planLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888;">Pickup date</td>
            <td style="padding: 10px 0; font-weight: 500;">${booking.pickup_date}</td>
          </tr>
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0; color: #888;">Pickup location</td>
            <td style="padding: 10px 0; font-weight: 500;">${locationLabel}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #888;">Deposit paid</td>
            <td style="padding: 10px 0; font-weight: 500;">${depositAmount || 0} SEK</td>
          </tr>
        </table>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Please keep this order number — you'll need it when returning the bike.<br/>
          Questions? WeChat or email us at chenxu.l@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, orderId })
}
