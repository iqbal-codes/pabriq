import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import en from '#/messages/en'
import { AuthForm } from './AuthForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import ResetPasswordForm from './ResetPasswordForm'
import { buildVerificationCallbackUrl } from './route-guards'
import VerificationResendForm from './VerificationResendForm'

const mockSignUpEmail = vi.hoisted(() => vi.fn())
const mockSignInEmail = vi.hoisted(() => vi.fn())
const mockRequestPasswordReset = vi.hoisted(() => vi.fn())
const mockResetPassword = vi.hoisted(() => vi.fn())
const mockSendVerificationEmail = vi.hoisted(() => vi.fn())

vi.mock('#/lib/auth-client', () => ({
  authClient: {
    signUp: { email: mockSignUpEmail },
    signIn: { email: mockSignInEmail },
    requestPasswordReset: mockRequestPasswordReset,
    resetPassword: mockResetPassword,
    sendVerificationEmail: mockSendVerificationEmail,
  },
}))

const mockNavigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockInvalidate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({
    navigate: mockNavigate,
    invalidate: mockInvalidate,
  }),
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: React.ReactNode
    to: string
    search?: Record<string, unknown>
    [key: string]: unknown
  }) => {
    let href = to
    if (search) {
      const params = new URLSearchParams()
      for (const [k, v] of Object.entries(search)) {
        if (v !== undefined) params.set(k, String(v))
      }
      const q = params.toString()
      if (q) href += `?${q}`
    }
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
}))

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <IntlProvider locale="en" messages={en}>
      {ui}
    </IntlProvider>,
  )
}

describe('Auth Flow UI Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('triggers signup callback and navigates to pending verification page', async () => {
    const user = userEvent.setup()
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    renderWithIntl(<AuthForm mode="sign-up" redirectTo="/operator" />)

    await user.type(screen.getByRole('textbox', { name: /Name/ }), 'Jane Doe')
    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'jane@example.com',
    )
    await user.type(screen.getByLabelText(/Password/), 'password123')
    await user.click(screen.getByRole('button', { name: en.auth.signUp }))

    await waitFor(() => {
      expect(mockSignUpEmail).toHaveBeenCalledWith({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'password123',
        callbackURL: buildVerificationCallbackUrl('jane@example.com'),
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/verify-email',
        search: {
          email: 'jane@example.com',
          pending: '1',
          verified: undefined,
          error: undefined,
        },
      })
    })
  })

  it('triggers signin callback and navigates to sanitized destination on success', async () => {
    const user = userEvent.setup()
    mockSignInEmail.mockResolvedValue({
      data: { user: { id: 'user-2' } },
      error: null,
    })

    renderWithIntl(<AuthForm mode="sign-in" redirectTo="/operator" />)

    expect(
      screen.getByRole('link', { name: en.auth.createOne }),
    ).toHaveAttribute('href', '/sign-up?redirect=%2Foperator')
    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'john@example.com',
    )
    await user.type(screen.getByLabelText(/Password/), 'password123')
    await user.click(screen.getByRole('button', { name: en.auth.signIn }))

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        callbackURL: buildVerificationCallbackUrl('john@example.com'),
      })
    })

    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/operator' })
    })
  })

  it('exposes unverified-email resend path when signin returns 403 status', async () => {
    const user = userEvent.setup()
    mockSignInEmail.mockResolvedValue({
      error: { status: 403, message: 'Unverified email' },
    })

    renderWithIntl(<AuthForm mode="sign-in" redirectTo="/" />)

    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'unverified@example.com',
    )
    await user.type(screen.getByLabelText(/Password/), 'password123')
    await user.click(screen.getByRole('button', { name: en.auth.signIn }))

    expect(
      await screen.findByText(en.auth.emailNotVerified),
    ).toBeInTheDocument()

    const resendLink = screen.getByRole('link', {
      name: en.auth.resendVerification,
    })
    expect(resendLink).toBeInTheDocument()
    expect(resendLink).toHaveAttribute(
      'href',
      '/verify-email?email=unverified%40example.com&pending=1',
    )
  })

  it('renders generic success confirmation when requesting password reset', async () => {
    const user = userEvent.setup()
    mockRequestPasswordReset.mockResolvedValue({
      data: { status: true },
      error: null,
    })

    renderWithIntl(<ForgotPasswordForm />)

    await user.type(
      screen.getByRole('textbox', { name: /Email/ }),
      'forgot@example.com',
    )
    await user.click(
      screen.getByRole('button', { name: en.auth.sendResetLink }),
    )

    await waitFor(() => {
      expect(mockRequestPasswordReset).toHaveBeenCalledWith({
        email: 'forgot@example.com',
        redirectTo: '/reset-password',
      })
    })

    expect(
      await screen.findByText(en.auth.resetLinkSentDesc),
    ).toBeInTheDocument()
  })

  it('rejects mismatched passwords and completes reset when matching', async () => {
    const user = userEvent.setup()
    mockResetPassword.mockResolvedValue({
      data: { status: true },
      error: null,
    })

    const { unmount } = renderWithIntl(
      <ResetPasswordForm token="valid-reset-token-123" />,
    )

    // Mismatch case
    await user.type(screen.getByLabelText(/New password/), 'newpassword123')
    await user.type(
      screen.getByLabelText(/Confirm password/),
      'mismatchedpass123',
    )
    await user.click(
      screen.getByRole('button', { name: en.auth.resetPassword }),
    )

    expect(
      await screen.findByText(en.auth.passwordMismatch),
    ).toBeInTheDocument()
    expect(mockResetPassword).not.toHaveBeenCalled()

    unmount()

    // Matching case
    renderWithIntl(<ResetPasswordForm token="valid-reset-token-123" />)

    await user.type(screen.getByLabelText(/New password/), 'newpassword123')
    await user.type(screen.getByLabelText(/Confirm password/), 'newpassword123')
    await user.click(
      screen.getByRole('button', { name: en.auth.resetPassword }),
    )

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        newPassword: 'newpassword123',
        token: 'valid-reset-token-123',
      })
    })

    expect(
      await screen.findByText(en.auth.passwordResetSuccess),
    ).toBeInTheDocument()
    expect(
      screen.getByText(en.auth.passwordResetSuccessDesc),
    ).toBeInTheDocument()
  })

  it('triggers verification resend callback and displays generic confirmation', async () => {
    const user = userEvent.setup()
    mockSendVerificationEmail.mockResolvedValue({
      data: { status: true },
      error: null,
    })

    renderWithIntl(<VerificationResendForm initialEmail="resend@example.com" />)

    await user.click(
      screen.getByRole('button', { name: en.auth.resendVerification }),
    )

    await waitFor(() => {
      expect(mockSendVerificationEmail).toHaveBeenCalledWith({
        email: 'resend@example.com',
        callbackURL: buildVerificationCallbackUrl('resend@example.com'),
      })
    })

    expect(
      await screen.findByText(en.auth.verificationSentDesc),
    ).toBeInTheDocument()
  })
})
