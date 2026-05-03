import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'use-intl'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { LanguageToggle, ThemeToggle } from './header-controls'

const mockTheme = { theme: 'light', setTheme: vi.fn() }

vi.mock('next-themes', () => ({
  useTheme: () => mockTheme,
}))

let originalLocation: Location
const mockAssign = vi.fn()

beforeAll(() => {
  originalLocation = window.location
})

beforeEach(() => {
  mockTheme.theme = 'light'
  mockTheme.setTheme.mockReset()
  mockAssign.mockReset()
})

afterAll(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
  })
})

function setLocation(pathname: string, search = '', hash = '') {
  const href = `http://localhost${pathname}${search}${hash}`
  Object.defineProperty(window, 'location', {
    value: { pathname, search, hash, href, assign: mockAssign },
    writable: true,
  })
}

const testMessages = {
  app: {
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
  },
}

function TestWrapper({
  children,
  locale = 'en',
}: {
  children: React.ReactNode
  locale?: string
}) {
  return (
    <IntlProvider locale={locale} messages={testMessages}>
      {children}
    </IntlProvider>
  )
}

describe('ThemeToggle', () => {
  it('renders a theme toggle button with accessible role', () => {
    render(<ThemeToggle />)
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('calls setTheme with dark when currently light', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockTheme.setTheme).toHaveBeenCalledWith('dark')
  })

  it('calls setTheme with light when currently dark', async () => {
    mockTheme.theme = 'dark'
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button'))
    expect(mockTheme.setTheme).toHaveBeenCalledWith('light')
  })
})

describe('LanguageToggle', () => {
  it('renders a dropdown trigger button', () => {
    setLocation('/products')
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>,
    )
    expect(screen.getByRole('button')).toBeDefined()
  })

  it('shows English and Indonesian options when dropdown opens', async () => {
    setLocation('/products')
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText('English')).toBeDefined()
    expect(screen.getByText('Indonesian')).toBeDefined()
  })

  it('navigates to /id/products when Indonesian is selected from English page', async () => {
    setLocation('/products')
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('Indonesian'))
    expect(mockAssign).toHaveBeenCalledWith('http://localhost/id/products')
  })

  it('strips /id prefix when English is selected from Indonesian page', async () => {
    setLocation('/id/products')
    render(
      <TestWrapper locale="id">
        <LanguageToggle />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('English'))
    expect(mockAssign).toHaveBeenCalledWith('http://localhost/products')
  })

  it('preserves search params when switching language', async () => {
    setLocation('/products', '?q=test')
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByRole('button'))
    await userEvent.click(screen.getByText('Indonesian'))
    expect(mockAssign).toHaveBeenCalledWith(
      'http://localhost/id/products?q=test',
    )
  })
})
