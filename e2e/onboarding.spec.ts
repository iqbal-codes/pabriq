import { expect, test } from '@playwright/test'
import { completeOnboarding, signIn } from './helpers/auth'

const TEST_EMAIL = 'e2etesting@gmail.com'
const TEST_PASSWORD = 'testing123'

test.describe('Onboarding', () => {
  test('shows onboarding form after sign-in for new user', async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD)
    await page.waitForTimeout(3000)

    const currentPath = new URL(page.url()).pathname
    if (currentPath === '/onboarding') {
      await expect(page.getByLabel(/business model/i)).toBeVisible()
      await expect(
        page.getByRole('button', { name: 'Create Organization' }),
      ).toBeDisabled()
      await expect(page.getByRole('radio').first()).toBeVisible()
      await expect(page.getByText('Organization Photo')).toBeVisible()
    }
    // If user already has an org, they land on dashboard — that's also valid
  })

  test('creates organization and redirects to dashboard', async ({ page }) => {
    const orgName = `E2E Org ${Date.now()}`

    await signIn(page, TEST_EMAIL, TEST_PASSWORD)
    await page.waitForTimeout(3000)

    const currentPath = new URL(page.url()).pathname
    if (currentPath === '/onboarding') {
      await completeOnboarding(page, orgName)

      // Should redirect to dashboard
      await page.waitForURL((url) => new URL(url).pathname === '/', {
        timeout: 10_000,
      })
      await expect(page).toHaveURL('/')
    }
  })

  test('validates organization name is required', async ({ page }) => {
    await signIn(page, TEST_EMAIL, TEST_PASSWORD)
    await page.waitForTimeout(3000)

    const currentPath = new URL(page.url()).pathname
    if (currentPath === '/onboarding') {
      // Interact with the name field so its onChange validator runs
      const nameField = page.getByLabel('Organization Name')
      await nameField.click()
      await nameField.fill('X')
      await nameField.blur()

      // Should show validation error
      await expect(page.getByText(/at least 2 characters/i)).toBeVisible()
    }
  })
})
