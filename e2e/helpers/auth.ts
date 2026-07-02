import { type Page, expect } from '@playwright/test'

/** Set locale cookie to avoid language selector prompts */
export async function setLocale(page: Page, locale = 'en') {
  await page
    .context()
    .addCookies([
      { name: 'locale', value: locale, domain: 'localhost', path: '/' },
    ])
}

/** Wait for React hydration by checking for internal React fiber on the form */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const form = document.querySelector('form')
      if (!form) return false
      // React 18+ stores fiber keys starting with __reactFiber$ or __reactInternalInstance$
      return Object.keys(form).some(
        (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'),
      )
    },
    { timeout: 10_000 },
  )
}

/** Navigate to a path, set locale cookie, and wait for hydration */
export async function gotoApp(page: Page, path: string) {
  await setLocale(page)
  await page.goto(path)
  await page.waitForLoadState('load')
  await waitForHydration(page)
}

/** Fill the sign-in form and submit */
export async function signIn(page: Page, email: string, password: string) {
  await gotoApp(page, '/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
}

/** Fill the sign-up form and submit */
export async function signUp(
  page: Page,
  name: string,
  email: string,
  password: string,
) {
  await gotoApp(page, '/sign-up')
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Create an account' }).click()
}

/** Fill the onboarding form and submit */
export async function completeOnboarding(page: Page, orgName: string) {
  await expect(page).toHaveURL(/\/onboarding/)
  await page.getByLabel('Organization Name').fill(orgName)
  await page.getByRole('button', { name: 'Create Organization' }).click()
}

/** Wait for redirect away from auth/onboarding pages */
export async function waitForAuthenticated(page: Page) {
  await page.waitForURL((url) => {
    const path = new URL(url).pathname
    return path !== '/sign-in' && path !== '/sign-up' && path !== '/onboarding'
  })
}
