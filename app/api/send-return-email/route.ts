import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { type, name, email, bikeName, bikeNumber, depositAmount } = await req.json()

  if (!email || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (type === 'returned') {
    await resend.emails.send({
      from: 'CyklaUpp <noreply@cyklaupp.se>',
      to: email,
      subject: 'Bike return confirmed — CyklaUpp',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
          <p style="color: #666; margin-bottom: 24px;">Hi ${name},</p>

          <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
            We have confirmed the return of your bike <strong>${bikeName}${bikeNumber ? ` (${bikeNumber})` : ''}</strong>. Thank you for taking good care of it!
          </p>

          ${depositAmount > 0 ? `
          <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Deposit refund</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0F2D6B;">${depositAmount} SEK</p>
            <p style="margin: 4px 0 0; font-size: 12px; color: #888;">Will be returned within 7 working days</p>
          </div>
          ` : ''}

          <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
            Thank you for using CyklaUpp. We hope to see you again!
          </p>

          <p style="color: #999; font-size: 13px; line-height: 1.6;">
            Questions? Email us at cyklaupp@outlook.com
          </p>
        </div>
      `,
    })
  }

  if (type === 'deposit') {
    await resend.emails.send({
      from: 'CyklaUpp <noreply@cyklaupp.se>',
      to: email,
      subject: 'Deposit refunded — CyklaUpp',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
          <p style="color: #666; margin-bottom: 24px;">Hi ${name},</p>

          <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
            Good news! Your deposit of <strong>${depositAmount} SEK</strong> has been refunded.
          </p>

          <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
            Thank you for using CyklaUpp. We hope you enjoyed your rental and look forward to serving you again!
          </p>

          <p style="color: #999; font-size: 13px; line-height: 1.6;">
            Questions? Email us at cyklaupp@outlook.com
          </p>
        </div>
      `,
    })
  }

  return NextResponse.json({ success: true })
}
