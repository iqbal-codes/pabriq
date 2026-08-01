import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderAuthEmail, sendAuthEmail } from './auth-email'

const send = vi.fn()
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({ emails: { send } })),
}))

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.RESEND_API_KEY
  delete process.env.EMAIL_FROM
})

describe('renderAuthEmail', () => {
  it('escapes all HTML template values', () => {
    const rendered = renderAuthEmail({
      title: '<title>',
      greeting: 'Hi "user"',
      message: 'A & B',
      actionLabel: "It's safe",
      actionUrl: 'https://example.com/?x=<script>',
      footer: 'Footer',
    })
    expect(rendered.html).toContain('&lt;title&gt;')
    expect(rendered.html).toContain('https://example.com/?x=&lt;script&gt;')
    expect(rendered.html).not.toContain('<script>')
    expect(rendered.text).toContain('A & B')
  })
})

describe('sendAuthEmail', () => {
  it('sends the exact Resend payload', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.EMAIL_FROM = 'Pabriq <auth@example.com>'
    send.mockResolvedValue({ data: { id: 'email-1' }, error: null })
    await sendAuthEmail({
      to: 'user@example.com',
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    })
    expect(send).toHaveBeenCalledWith({
      from: 'Pabriq <auth@example.com>',
      to: ['user@example.com'],
      subject: 'Subject',
      text: 'Text',
      html: '<p>HTML</p>',
    })
  })

  it('requires provider configuration', async () => {
    await expect(
      sendAuthEmail({
        to: 'user@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>HTML</p>',
      }),
    ).rejects.toThrow('RESEND_API_KEY')
    process.env.RESEND_API_KEY = 'test-key'
    await expect(
      sendAuthEmail({
        to: 'user@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>HTML</p>',
      }),
    ).rejects.toThrow('EMAIL_FROM')
  })

  it('throws returned provider errors', async () => {
    process.env.RESEND_API_KEY = 'test-key'
    process.env.EMAIL_FROM = 'auth@example.com'
    send.mockResolvedValue({ data: null, error: { message: 'Rejected' } })
    await expect(
      sendAuthEmail({
        to: 'user@example.com',
        subject: 'Subject',
        text: 'Text',
        html: '<p>HTML</p>',
      }),
    ).rejects.toThrow('Rejected')
  })
})
