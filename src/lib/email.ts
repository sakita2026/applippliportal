/**
 * メール送信の抽象化レイヤー。
 * 現在はモック（送信せずサーバーログに出力）。
 * 実送信に切り替える際は sendEmail の中身を Azure Communication Services /
 * SendGrid / SMTP 等に差し替える（呼び出し側は変更不要）。
 */

const MOCK = (process.env.EMAIL_MODE ?? 'mock') === 'mock'

export type SendEmailResult = { sent: boolean; mock: boolean }

export async function sendEmail(to: string, subject: string, body: string): Promise<SendEmailResult> {
  if (MOCK) {
    console.log('─── [MOCK EMAIL] ──────────────────────────────')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(body)
    console.log('───────────────────────────────────────────────')
    return { sent: true, mock: true }
  }

  // TODO: 実送信の実装（Azure Communication Services 等）
  throw new Error('実メール送信は未設定です（EMAIL_MODE=mock のままにしてください）')
}

export async function sendMagicLinkEmail(to: string, link: string): Promise<SendEmailResult> {
  const subject = 'WorkPortal ログインリンク'
  const body = [
    'WorkPortal へのログインリンクです。以下のリンクを開くとログインできます（15分間有効）。',
    '',
    link,
    '',
    '※ このメールに心当たりがない場合は破棄してください。',
  ].join('\n')
  return sendEmail(to, subject, body)
}
