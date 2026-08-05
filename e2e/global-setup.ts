import { test as setup } from '@playwright/test'

const TEST_EMAIL = 'e2etesting@gmail.com'
const TEST_PASSWORD = 'testing123'
const TEST_NAME = 'E2E Testing'

/**
 * Global setup: create the test account if it doesn't exist.
 * Run once before all tests: npx playwright test e2e/global-setup.ts
 *
 * This ensures the test account e2etesting@gmail.com / testing123
 * exists for all E2E tests that need to sign in.
 */
setup('create test account', async ({ page }) => {
  // Set locale
  await page
    .context()
    .addCookies([
      { name: 'locale', value: 'en', domain: 'localhost', path: '/' },
    ])

  // Try to sign up — if account already exists, the server may reject it
  // or redirect. Either way, we're done.
  await page.goto('/sign-up')
  await page.waitForLoadState('load')

  // Wait for React hydration
  await page.waitForFunction(
    () => {
      const form = document.querySelector('form')
      if (!form) return false
      return Object.keys(form).some(
        (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'),
      )
    },
    { timeout: 10_000 },
  )

  // Fill and submit the sign-up form
  await page.getByLabel('Name').fill(TEST_NAME)
  await page.getByLabel('Email').fill(TEST_EMAIL)
  await page.getByLabel('Password').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Create an account' }).click()

  // Wait for response — either onboarding (success) or error (account exists)
  await page.waitForTimeout(3000)

  if (page.url().includes('/onboarding')) {
    // Account was created. Complete onboarding with a test org.
    await page.getByRole('radio').first().click()
    await page.getByLabel('Organization Name').fill('E2E Test Org')
    await page.getByRole('button', { name: 'Create Organization' }).click()
    await page.waitForURL((u) => new URL(u).pathname === '/', {
      timeout: 10_000,
    })
  }
  // If account already exists, we're already signed in or on sign-in page — fine.
})
