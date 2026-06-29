import { expect, test } from '@playwright/test'

test('redirects unauthenticated workspace visitors to sign in', async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: 'locale',
      value: 'en',
      domain: 'localhost',
      path: '/',
    },
  ])

  await page.goto('/')

  await expect(page).toHaveURL(/\/sign-in\?redirect=%2F$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create one' })).toHaveAttribute(
    'href',
    /\/sign-up\?redirect=%2F$/,
  )
})
