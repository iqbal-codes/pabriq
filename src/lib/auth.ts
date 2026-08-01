import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { createAccessControl } from 'better-auth/plugins/access'
import { organization } from 'better-auth/plugins/organization'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '#/db/index'
import * as schema from '#/db/schema'
import { renderAuthEmail, sendAuthEmail } from '#/lib/auth-email'
import { logger } from '#/lib/logger'

const statement = {
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  customer: ['create', 'read', 'update', 'delete'],
  order: ['create', 'read', 'update', 'delete', 'approve', 'cancel'],
  product: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete', 'send', 'void'],
  production: ['read', 'update'],
  settings: ['read', 'update'],
} as const

const ac = createAccessControl(statement)

const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  customer: ['create', 'read', 'update', 'delete'],
  order: ['create', 'read', 'update', 'delete', 'approve', 'cancel'],
  product: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete', 'send', 'void'],
  production: ['read', 'update'],
  settings: ['read', 'update'],
})

const admin = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  customer: ['create', 'read', 'update', 'delete'],
  order: ['create', 'read', 'update', 'delete', 'approve', 'cancel'],
  product: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete', 'send', 'void'],
  production: ['read', 'update'],
  settings: ['read', 'update'],
})

const member = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
  customer: ['create', 'read'],
  order: ['create', 'read'],
  product: ['read'],
  invoice: ['read'],
  production: [],
  settings: ['read'],
})

const operator = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: [],
  customer: [],
  order: ['read'],
  product: ['read'],
  invoice: [],
  production: ['read'],
  settings: [],
})

const cookieDomain =
  process.env.COOKIE_DOMAIN ||
  (process.env.NODE_ENV === 'production' ? '.pabriq.com' : '.localhost')

export const auth = betterAuth({
  appName: 'Pabriq',
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      const rendered = renderAuthEmail({
        title: 'Verify your Pabriq email address',
        greeting: `Hi ${user.name || user.email},`,
        message:
          'Confirm your email address to finish creating your Pabriq account.',
        actionLabel: 'Verify email address',
        actionUrl: url,
        footer: 'This link expires in 1 hour.',
      })
      void sendAuthEmail({
        to: user.email,
        subject: 'Verify your Pabriq email address',
        ...rendered,
      }).catch((error: unknown) => {
        logger.error(
          { err: error, email: user.email },
          'Failed to send verification email',
        )
      })
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      const rendered = renderAuthEmail({
        title: 'Reset your Pabriq password',
        greeting: `Hi ${user.name || user.email},`,
        message:
          'Use the button below to choose a new password for your Pabriq account.',
        actionLabel: 'Reset password',
        actionUrl: url,
        footer: 'This link expires in 1 hour and can be used only once.',
      })
      void sendAuthEmail({
        to: user.email,
        subject: 'Reset your Pabriq password',
        ...rendered,
      }).catch((error: unknown) => {
        logger.error(
          { error, email: user.email },
          'Failed to send password reset email',
        )
      })
    },
    resetPasswordTokenExpiresIn: 3600,
    revokeSessionsOnPasswordReset: true,
  },
  trustedOrigins: [
    ...(process.env.TRUSTED_ORIGINS?.split(',').filter(Boolean) ?? []),
  ],
  plugins: [
    tanstackStartCookies(),
    organization({
      ac,
      roles: {
        owner,
        admin,
        member,
        operator,
      },
      async sendInvitationEmail(data) {
        logger.warn({ invitationId: data.id }, 'invite email not configured')
      },
    }),
  ],
  advanced: {
    cookiePrefix: 'pbq',
    crossSubDomainCookies: {
      enabled: true,
      domain: cookieDomain,
    },
  },
})
