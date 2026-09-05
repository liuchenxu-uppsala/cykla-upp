import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const conditionLabels: Record<string, string> = {
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  needs_repair: 'Needs repair',
}

const locationLabels: Record<string, string> = {
  flogsta: 'Flogsta',
  ekonomikum: 'Ekonomikum (Main campus)',
  angstrom: 'Ångström (Engineering)',
  bmc: 'BMC (Medical campus)',
}

const paymentLabels: Record<string, string> = {
  swish: 'Swish',
  card: 'Card',
  revolut: 'Revolut',
  cash: 'Cash',
  any: 'Any (no preference)',
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name, email, phone, location, price,
      brandModel, condition, availableDate,
      paymentMethod, notes,
    } = body

    if (!name || !email || !phone || !location || !price || !condition || !availableDate || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. 写入 Supabase
    const { error: dbError } = await supabase
      .from('bike_offers')
      .insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        location,
        price: Number(price),
        brand_model: brandModel?.trim() || null,
        condition,
        available_date: availableDate,
        payment_method: paymentMethod,
        notes: notes?.trim() || '',
        status: 'new',
      })

    if (dbError) {
      console.error('Supabase Bike Offer Insert Error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 2. 邮件通知管理员
    const { error: emailError } = await resend.emails.send({
      from: 'CyklaUpp <noreply@cyklaupp.se>',
      to: 'cyklaupp@outlook.com',
      subject: `[Sell offer] ${name.trim()} — ${Number(price)} SEK`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
          <p style="color: #666; margin-bottom: 24px;">New bike sell offer received!</p>

          <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Asking price</p>
            <p style="margin: 0; font-size: 24px; font-weight: 700; color: #0F2D6B;">${Number(price)} SEK</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Seller</td>
              <td style="padding: 10px 0; font-weight: 500;">${name.trim()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Email</td>
              <td style="padding: 10px 0; font-weight: 500;"><a href="mailto:${email.trim()}" style="color: #0F2D6B;">${email.trim()}</a></td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Phone</td>
              <td style="padding: 10px 0; font-weight: 500;">${phone.trim()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Drop-off location</td>
              <td style="padding: 10px 0; font-weight: 500;">${locationLabels[location] || location}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Brand / model</td>
              <td style="padding: 10px 0; font-weight: 500;">${brandModel?.trim() || '<span style="color:#bbb;">Not provided</span>'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Condition</td>
              <td style="padding: 10px 0; font-weight: 500;">${conditionLabels[condition] || condition}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Earliest viewing date</td>
              <td style="padding: 10px 0; font-weight: 500;">${availableDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888;">Preferred payment</td>
              <td style="padding: 10px 0; font-weight: 500;">${paymentLabels[paymentMethod] || paymentMethod}</td>
            </tr>
          </table>

          ${notes?.trim() ? `
          <div style="background: #f8fafc; border-left: 4px solid #0F2D6B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #0F2D6B;">Seller notes:</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">${notes.trim()}</p>
          </div>
          ` : ''}

          <p style="color: #999; font-size: 13px; line-height: 1.6;">
            This is an automated notification from the CyklaUpp "Sell your bike" form.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend Email Send Error:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Sell Bike API Catch Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
