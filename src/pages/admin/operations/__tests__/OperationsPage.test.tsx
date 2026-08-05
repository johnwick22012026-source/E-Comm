import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from 'vitest'

vi.mock('next/link', () => {
  throw new Error('next/link should not be used in this client app.')
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  const Link = ({ to, children, href, ...props }: any) => {
    if (href !== undefined) {
      throw new Error('React Router Link should be used with `to`, not `href`.')
    }
    if (to === undefined || to === null) {
      throw new Error('React Router Link requires a `to` prop.')
    }
    const serializedTo = typeof to === 'string' ? to : JSON.stringify(to)
    return (
      <a {...props} data-mocked-router-link-to={serializedTo}>
        {children}
      </a>
    )
  }

  return {
    ...actual,
    Link,
  }
})

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import * as AuthContext from '../../../../context/AuthContext'
import OperationsPage from '../index'

const useAuthSpy = vi.spyOn(AuthContext, 'useAuth')

describe('OperationsPage admin navigation', () => {
  beforeEach(() => {
    useAuthSpy.mockReturnValue({ isSupportUser: true } as any)
  })

  afterEach(() => {
    useAuthSpy.mockReset()
  })

  afterAll(() => {
    useAuthSpy.mockRestore()
  })

  it('renders React Router Link navigation using `to` props', () => {
    render(
      <MemoryRouter>
        <OperationsPage />
      </MemoryRouter>,
    )

    const reportingLink = screen.getByRole('link', { name: /reporting/i })
    expect(reportingLink).toHaveAttribute('data-mocked-router-link-to', '/admin/reporting')
  })
})
