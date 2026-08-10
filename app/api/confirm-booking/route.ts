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
  flogsta: 'Flogsta',
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

  // 把 bike 状态改为 rented
  if (booking.bike_id) {
    await supabase.from('bikes').update({ status: 'rented' }).eq('id', booking.bike_id)
  }

  // 查找同一辆车其他 pending 的预约，自动取消并发邮件
  if (booking.bike_id) {
    const { data: otherBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('bike_id', booking.bike_id)
      .eq('status', 'pending')
      .neq('id', bookingId)

    if (otherBookings && otherBookings.length > 0) {
      // 批量取消
      await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('bike_id', booking.bike_id)
        .eq('status', 'pending')
        .neq('id', bookingId)

      // 发邮件通知每个被取消的用户
      const bikeName = booking.bike?.name_en || 'the bike'
      for (const other of otherBookings) {
        await resend.emails.send({
          from: 'CyklaUpp <noreply@cyklaupp.se>',
          to: other.email,
          subject: 'Your bike booking — update',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
              <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
              <p style="color: #666; margin-bottom: 24px;">Hi ${other.name},</p>

              <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
                Unfortunately, we have to let you know that your booking request for <strong>${bikeName}</strong>
                (pickup: ${other.pickup_date}) could not be confirmed — the bike has just been rented to another customer.
              </p>

              <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
                We're sorry for the inconvenience. Please visit our website to check if other bikes are available,
                or contact us and we'll do our best to help you find a suitable alternative.
              </p>

              <p style="color: #999; font-size: 13px; line-height: 1.6;">
                Questions? Email us at cyklaupp@outlook.com
              </p>
            </div>
          `,
        })
      }
    }
  }

  // 发确认邮件给被确认的用户
  const bikeName = booking.bike?.name_en || 'your bike'
  const bikeNumber = booking.bike?.bike_number || ''
  const planLabel = planLabels[booking.plan] || booking.plan
  const locationLabel = locationLabels[booking.pickup_location] || booking.pickup_location

  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
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
            <td style="padding: 10px 0; font-weight: 500;">${bikeName}${bikeNumber ? ` <span style="font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${bikeNumber}</span>` : ''}</td>
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
          Questions? WeChat or email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true, orderId })
}
