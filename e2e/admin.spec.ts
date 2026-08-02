import { expect, test } from '@playwright/test'
import { setLocale, signIn } from './helpers/auth'

const ADMIN_EMAIL = 'superuser@pabriq.dev'
const ADMIN_PASSWORD = 'superuser123'
const SCREENSHOT_DIR = 'e2e/screenshots'

// E2E evidence for the superuser control panel ("Control Panel" / admin area).
// Screenshots land in e2e/screenshots/ as visible proof.
test.describe('Admin control panel (superuser)', () => {
  test.beforeEach(async ({ page }) => {
    await setLocale(page, 'en')
  })

  test('superuser can sign in and sees the admin dashboard metrics', async ({
    page,
  }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin')

    // Headline metrics from useAdminDashboardMetrics
    await expect(page.getByText('Total Organizations').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Active Subscriptions').first()).toBeVisible()
    await expect(page.getByText('Pending Migrations').first()).toBeVisible()

    // Sidebar shows the control panel entry points
    await expect(
      page.getByRole('link', { name: 'Organizations' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: 'Plans' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Audit Log' })).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-admin-dashboard.png`,
      fullPage: true,
    })
  })

  test('organizations page lists orgs with search + actions', async ({
    page,
  }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/organizations')

    await expect(page.getByText('Organizations').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByPlaceholder('Search organizations...')).toBeVisible()
    // Seeded fixtures (e2e/seed-admin-fixtures.ts) render as table rows
    await expect(page.getByText('PT Karet Jaya Abadi').first()).toBeVisible()
    await expect(page.getByText('Furniture Nusantara').first()).toBeVisible()
    // Table headers
    await expect(page.getByText('Members').first()).toBeVisible()
    await expect(page.getByText('Plan').first()).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-admin-organizations.png`,
      fullPage: true,
    })
  })

  test('plans page shows plan management', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/plans')

    await expect(page.getByText('Plans').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByRole('button', { name: 'Create Plan' }),
    ).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-admin-plans.png`,
      fullPage: true,
    })
  })

  test('audit log page renders event table', async ({ page }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/audit')

    await expect(page.getByText('Audit Log').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByText('Timestamp').first()).toBeVisible()
    await expect(page.getByText('Actor').first()).toBeVisible()
    await expect(page.getByText('Action').first()).toBeVisible()
    // Seeded fixtures render as event rows (raw action strings)
    await expect(page.getByText('organization.created').first()).toBeVisible()
    await expect(page.getByText('plan.created').first()).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-admin-audit.png`,
      fullPage: true,
    })
  })

  test('platform admins page shows the superuser as granted admin', async ({
    page,
  }) => {
    await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admins')

    await expect(page.getByText('Platform Admins').first()).toBeVisible({
      timeout: 20_000,
    })
    await expect(
      page.getByRole('button', { name: 'Grant Admin' }),
    ).toBeVisible()
    // The seeded superuser must appear as a granted platform admin
    await expect(page.getByText(ADMIN_EMAIL).first()).toBeVisible()

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-admin-platform-admins.png`,
      fullPage: true,
    })
  })

  test('non-admin user is blocked from /admin', async ({ page }) => {
    // guard@pabriq.dev is a verified, signable account that is NOT a
    // platform admin — the control panel must reject it.
    await signIn(page, 'guard@pabriq.dev', 'guard1234')
    await page.goto('/admin')

    // beforeLoad redirects non-platform-admins away from /admin
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), {
      timeout: 15_000,
    })
    expect(new URL(page.url()).pathname).not.toBe('/admin')
  })
})
