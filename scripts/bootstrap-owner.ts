import { bootstrapOwnerAccount } from '#/features/auth/bootstrap'
import { auth } from '#/lib/auth'

type CliArgs = {
  email?: string
  password?: string
  name?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    email: process.env.BOOTSTRAP_OWNER_EMAIL,
    password: process.env.BOOTSTRAP_OWNER_PASSWORD,
    name: process.env.BOOTSTRAP_OWNER_NAME,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--email' && next) {
      args.email = next
      index += 1
      continue
    }

    if (arg === '--password' && next) {
      args.password = next
      index += 1
      continue
    }

    if (arg === '--name' && next) {
      args.name = next
      index += 1
    }
  }

  return args
}

function assertRequiredArgs(args: CliArgs): asserts args is {
  email: string
  password: string
  name?: string
} {
  if (!args.email || !args.password) {
    throw new Error(
      'Usage: BOOTSTRAP_OWNER_EMAIL=owner@example.com BOOTSTRAP_OWNER_PASSWORD=<min-8-chars> [BOOTSTRAP_OWNER_NAME="Owner Name"] bun run bootstrap:owner',
    )
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  assertRequiredArgs(args)

  const result = await bootstrapOwnerAccount({
    auth,
    email: args.email,
    password: args.password,
    name: args.name,
  })

  console.log(
    JSON.stringify(
      {
        ok: true,
        created: result.created,
        email: result.email,
        userId: result.userId,
        next: 'Sign in, then complete /onboarding to create your organization.',
      },
      null,
      2,
    ),
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
