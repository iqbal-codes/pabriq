import { Resend } from 'resend'

export type AuthEmailInput = {
  to: string
  subject: string
  text: string
  html: string
}

export type AuthEmailTemplateInput = {
  title: string
  greeting: string
  message: string
  actionLabel: string
  actionUrl: string
  footer: string
}

export type AuthEmailContent = {
  html: string
  text: string
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  )
}

export function renderAuthEmail(
  input: AuthEmailTemplateInput,
): AuthEmailContent {
  const values = [
    input.title,
    input.greeting,
    input.message,
    input.actionLabel,
    input.actionUrl,
    input.footer,
  ]
  const escapedValues = values.map(escapeHtml)
  const [title, greeting, message, actionLabel, actionUrl, footer] =
    escapedValues

  return {
    text: values.join('\n'),
    html: `<!doctype html><html><body><h1>${title}</h1><p>${greeting}</p><p>${message}</p><p><a href="${actionUrl}">${actionLabel}</a></p><p>${footer}</p></body></html>`,
  }
}

export async function sendAuthEmail(input: AuthEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  if (!from) throw new Error('EMAIL_FROM is not configured')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
  })
  if (error) throw new Error(`Resend email delivery failed: ${error.message}`)
}
