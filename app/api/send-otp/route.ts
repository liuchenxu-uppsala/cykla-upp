import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { email } = await req.json()
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  await supabase.from('otp_codes').update({ used: true }).eq('email', email).eq('used', false)

  const { error: dbError } = await supabase.from('otp_codes').insert({ email, code, expires_at })
  if (dbError) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const { error: emailError } = await resend.emails.send({
    from: 'CyklaUpp <noreply@cyklaupp.se>',
    to: email,
    subject: 'Your CyklaUpp verification code',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0F2D6B; margin-bottom: 8px;">CyklaUpp</h2>
        <p style="color: #666; margin-bottom: 24px;">Your verification code for bike booking:</p>
        <div style="background: #f5f5f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0F2D6B;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `,
  })

  if (emailError) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
