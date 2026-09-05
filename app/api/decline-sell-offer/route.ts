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
    .update({ status: 'declined' })
    .eq('id', offerId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }

  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: offer.email,
    subject: 'About your bike sell offer — CyklaUpp',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${offer.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          Thanks for offering to sell us your bike. Unfortunately, we won't be able to buy it this time.
        </p>

        ${comment ? `
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #991b1b;">Note from CyklaUpp:</p>
          <p style="margin: 0; font-size: 14px; color: #7f1d1d; white-space: pre-line;">${comment}</p>
        </div>
        ` : ''}

        <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
          Thanks again for thinking of us — feel free to reach out if you have another bike in the future.
        </p>

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
