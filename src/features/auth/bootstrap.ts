import type { auth } from '#/lib/auth'

export type BootstrapOwnerInput = {
  email: string
  password: string
  name?: string
}

export type BootstrapOwnerResult = {
  created: true
  userId: string
  email: string
}

type Auth = typeof auth

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function deriveName(email: string, name?: string): string {
  const trimmedName = name?.trim()
  if (trimmedName) {
    return trimmedName
  }

  return email.split('@')[0] || email
}

function validateBootstrapOwnerInput({
  email,
  password,
}: BootstrapOwnerInput): void {
  const normalizedEmail = normalizeEmail(email)
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    throw new Error('Email must be valid')
  }

  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
}

export async function bootstrapOwnerAccount({
  auth,
  email,
  password,
  name,
}: BootstrapOwnerInput & {
  auth: Auth
}): Promise<BootstrapOwnerResult> {
  validateBootstrapOwnerInput({ email, password, name })

  const normalizedEmail = normalizeEmail(email)
  const ctx = await auth.$context

  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail)
  if (existing?.user) {
    throw new Error('Email already has an account')
  }

  const createdUser = await ctx.internalAdapter.createUser({
    email: normalizedEmail,
    name: deriveName(normalizedEmail, name),
    emailVerified: true,
  })

  try {
    const hashedPassword = await ctx.password.hash(password)

    await ctx.internalAdapter.linkAccount({
      userId: createdUser.id,
      accountId: createdUser.id,
      providerId: 'credential',
      password: hashedPassword,
    })

    return {
      created: true,
      userId: createdUser.id,
      email: normalizedEmail,
    }
  } catch (err: unknown) {
    try {
      await ctx.internalAdapter.deleteUser(createdUser.id)
    } catch {
      // best-effort cleanup; swallow secondary failure and rethrow original
    }
    throw err
  }
}
