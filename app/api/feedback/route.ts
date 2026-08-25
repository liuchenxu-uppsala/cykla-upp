import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, message, email, bookingId } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // 1. 写入 Supabase
    const { error: dbError } = await supabase
      .from('feedbacks')
      .insert({
        category: category || 'general',
        message: message.trim(),
        email: email?.trim() || null,
        booking_id: bookingId?.trim() || null,
        status: 'pending',
      })

    if (dbError) {
      console.error('Supabase Feedback Insert Error:', dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // 2. 发送保持品牌统一风格的邮件通知
    const timeString = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' })

    const { error: emailError } = await resend.emails.send({
      from: 'CyklaUpp <noreply@cyklaupp.se>',
      to: 'cyklaupp@outlook.com',
      subject: `[Feedback] ${category ? category.toUpperCase() : 'GENERAL'} — ${email || 'Anonymous'}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #0F2D6B; margin-bottom: 4px;">CyklaUpp</h2>
          <p style="color: #666; margin-bottom: 24px;">New user feedback received!</p>

          <!-- 分类高亮卡片 -->
          <div style="background: #f0f4ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Feedback Category</p>
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #0F2D6B; letter-spacing: 1px; text-transform: uppercase;">
              ${category || 'GENERAL'}
            </p>
          </div>

          <!-- 反馈具体内容框 -->
          <div style="background: #f8fafc; border-left: 4px solid #0F2D6B; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #0F2D6B;">User Message:</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-line;">${message.trim()}</p>
          </div>

          <!-- 详细元数据表格 -->
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Contact email</td>
              <td style="padding: 10px 0; font-weight: 500;">
                ${email ? `<a href="mailto:${email}" style="color: #0F2D6B; text-decoration: underline;">${email}</a>` : '<span style="color: #bbb;">Not provided</span>'}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 0; color: #888;">Booking ID</td>
              <td style="padding: 10px 0; font-weight: 500;">
                ${bookingId ? `<span style="font-family: monospace; background: #f5f5f5; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${bookingId}</span>` : '<span style="color: #bbb;">None</span>'}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888;">Submitted time</td>
              <td style="padding: 10px 0; font-weight: 500;">${timeString}</td>
            </tr>
          </table>

          <p style="color: #999; font-size: 13px; line-height: 1.6;">
            This is an automated notification sent to cyklaupp@outlook.com from the website feedback modal.
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend Email Send Error:', emailError)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Feedback API Catch Error:', err)
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}