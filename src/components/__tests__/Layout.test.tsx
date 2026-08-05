import { describe, expect, it, vi, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Layout } from '../Layout'
import * as AuthContext from '../../context/AuthContext'

describe('Layout', () => {
  const useAuthSpy = vi.spyOn(AuthContext, 'useAuth')

  afterEach(() => {
    useAuthSpy.mockReset()
  })

  afterAll(() => {
    useAuthSpy.mockRestore()
  })

  it('renders admin navigation for support users', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: true })

    render(
      <MemoryRouter>
        <Layout>Child content</Layout>
      </MemoryRouter>,
    )

    const adminLink = screen.getByRole('link', { name: /operations/i })
    expect(adminLink).toHaveAttribute('href', '/admin/operations')
  })

  it('hides admin navigation when user lacks support access', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: false })

    render(
      <MemoryRouter>
        <Layout>Child content</Layout>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: /operations/i })).not.toBeInTheDocument()
  })
})
