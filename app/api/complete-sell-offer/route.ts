import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const paymentLabels: Record<string, string> = {
  swish: 'Swish',
  card: 'Card',
  revolut: 'Revolut',
  cash: 'Cash',
}

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { offerId, finalPrice, finalPaymentMethod, comment } = await req.json()
  if (!offerId || !finalPrice || !finalPaymentMethod) {
    return NextResponse.json({ error: 'offerId, finalPrice and finalPaymentMethod are required' }, { status: 400 })
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
    .update({
      status: 'completed',
      final_price: Number(finalPrice),
      final_payment_method: finalPaymentMethod,
    })
    .eq('id', offerId)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update offer' }, { status: 500 })
  }

  await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: offer.email,
    subject: 'Purchase complete — thanks for selling to CyklaUpp!',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Hi ${offer.name},</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #166534;">Amount paid</p>
          <p style="margin: 0; font-size: 24px; font-weight: 700; color: #15803d;">${Number(finalPrice)} SEK</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: #166534;">via ${paymentLabels[finalPaymentMethod] || finalPaymentMethod}</p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 16px;">
          Thanks for selling your bike to CyklaUpp — we hope it goes on to serve another student well!
        </p>

        ${comment ? `
        <div style="background: #f8fafc; border-left: 4px solid #0F2D6B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #0F2D6B;">Note from CyklaUpp:</p>
          <p style="margin: 0; font-size: 14px; color: #334155; white-space: pre-line;">${comment}</p>
        </div>
        ` : ''}

        <p style="color: #999; font-size: 13px; line-height: 1.6;">
          Questions? Email us at cyklaupp@outlook.com
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
