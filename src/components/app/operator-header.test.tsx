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
import { OperatorHeader } from './operator-header'

const mockTheme = { theme: 'light', setTheme: vi.fn() }
const mockRouter = {
  invalidate: vi.fn().mockResolvedValue(undefined),
  navigate: vi.fn().mockResolvedValue(undefined),
}

vi.mock('next-themes', () => ({
  useTheme: () => mockTheme,
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => mockRouter,
}))

vi.mock('js-cookie', () => ({
  default: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
  },
}))

const mockSignOut = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('#/lib/auth-client', () => ({
  authClient: { signOut: mockSignOut },
}))

vi.mock('#/components/app/asset-image', () => ({
  AssetImage: ({ assetId }: { assetId: string }) => (
    <img data-testid="asset-image" src={assetId} alt="" />
  ),
}))

vi.mock('#/components/app/header-controls-utils', () => ({
  switchLocale: vi.fn(),
}))

let originalLocation: Location

beforeAll(() => {
  originalLocation = window.location
})

beforeEach(() => {
  mockTheme.theme = 'light'
  mockTheme.setTheme.mockReset()
  mockRouter.invalidate.mockReset()
  mockRouter.navigate.mockReset()
  mockSignOut.mockReset()
  mockSignOut.mockResolvedValue(undefined)
})

afterAll(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
  })
})

const enMessages = {
  operator: {
    accessDeniedTitle: 'Access denied',
    accessDeniedDescription: "You don't have access to this page.",
    backToProduction: 'Back to production',
    backToDashboard: 'Back to dashboard',
    noOrgHeader: 'No organization',
    noOrgTitle: 'No organization assigned',
    noOrgDescription: 'Your account is not a member of any organization.',
    theme: 'Theme',
  },
  app: {
    language: 'Language',
    english: 'English',
    indonesian: 'Indonesian',
  },
  admin: {
    logOut: 'Log out',
  },
}

function TestWrapper({
  children,
  locale = 'en',
}: {
  children: React.ReactNode
  locale?: 'en' | 'id'
}) {
  return (
    <IntlProvider locale={locale} messages={enMessages}>
      {children}
    </IntlProvider>
  )
}

describe('OperatorHeader', () => {
  it('renders org name and slug when org is provided', () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={{ name: 'My Workshop', slug: 'my-workshop', logo: null }}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    expect(screen.getByText('My Workshop')).toBeDefined()
    expect(screen.getByText('my-workshop')).toBeDefined()
  })

  it('renders noOrgHeader when org is null', () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={null}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    expect(screen.getByText('No organization')).toBeDefined()
  })

  it('shows user name and email in dropdown trigger', () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={{ name: 'My Workshop', slug: 'my-workshop', logo: null }}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    expect(screen.getByText('TU')).toBeDefined()
  })

  it('calls setTheme when theme menu item is clicked', async () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={{ name: 'My Workshop', slug: 'my-workshop', logo: null }}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByText('TU'))
    await userEvent.click(screen.getByText('Theme'))
    expect(mockTheme.setTheme).toHaveBeenCalledWith('dark')
  })

  it('calls authClient.signOut and navigates to /sign-in on sign out', async () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={{ name: 'My Workshop', slug: 'my-workshop', logo: null }}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    await userEvent.click(screen.getByText('TU'))
    await userEvent.click(screen.getByText('Log out'))
    expect(mockSignOut).toHaveBeenCalled()
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      to: '/sign-in',
      search: { redirect: undefined },
    })
  })

  it('shows asset image when org logo is provided', () => {
    render(
      <TestWrapper>
        <OperatorHeader
          org={{ name: 'My Workshop', slug: 'my-workshop', logo: 'asset-123' }}
          user={{ name: 'Test User', email: 'test@example.com', avatar: '' }}
        />
      </TestWrapper>,
    )
    expect(screen.getByTestId('asset-image')).toBeDefined()
  })
})
