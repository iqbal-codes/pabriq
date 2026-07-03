import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageContent } from './page-content'

describe('PageContent', () => {
  it('renders children inside a main element', () => {
    render(<PageContent>content</PageContent>)
    const main = screen.getByRole('main')
    expect(main).toBeDefined()
    expect(main.textContent).toBe('content')
  })

  it('applies default layout classes', () => {
    render(<PageContent>c</PageContent>)
    const main = screen.getByRole('main')
    expect(main.className).toContain('mx-auto')
    expect(main.className).toContain('max-w-6xl')
    expect(main.className).toContain('px-4')
    expect(main.className).toContain('py-6')
    expect(main.className).toContain('space-y-6')
  })

  it('merges custom className with defaults', () => {
    render(<PageContent className="custom-class">c</PageContent>)
    const main = screen.getByRole('main')
    expect(main.className).toContain('mx-auto')
    expect(main.className).toContain('custom-class')
  })
})
