import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { offerId, comment } = await req.json()
  if (!offerId) {
    return NextResponse.json({ error: 'offerId is required' }, { status: 400 })
  }

  const { data: offer, error: offerError } = await supabase
    .from('bike_offers')
    .select('*')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  }

  const { error: updateError } = await supabase
    .from('bike_offers')
    .update({ status: 'confirmed' })
    .eq('id', offerId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }

  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: offer.email,
    subject: "Good news — we'd like to buy your bike!",
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${offer.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          Thanks for offering to sell your bike to us! We'd like to move forward — we'll come see it in person
          at your chosen location and take care of payment on the spot.
        </p>

        ${comment ? `
        <div style="background: #f0f4ff; border-left: 4px solid #0F2D6B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #0F2D6B;">Note from CyklaUpp:</p>
          <p style="margin: 0; font-size: 14px; color: #1e3a8a; white-space: pre-line;">${comment}</p>
        </div>
        ` : ''}

        <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
          We'll be in touch shortly to confirm a time. If anything changes on your end in the meantime, just reply to this email.
        </p>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
