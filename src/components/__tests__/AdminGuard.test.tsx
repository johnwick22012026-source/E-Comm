import { describe, expect, it, vi, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminGuard } from '../AdminGuard'
import * as AuthContext from '../../context/AuthContext'

describe('AdminGuard', () => {
  const useAuthSpy = vi.spyOn(AuthContext, 'useAuth')

  afterEach(() => {
    useAuthSpy.mockReset()
  })

  afterAll(() => {
    useAuthSpy.mockRestore()
  })

  it('redirects non-admin users to the home page', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: false, isReady: true, loading: false })

    render(
      <MemoryRouter initialEntries={['/admin/protected']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<AdminGuard />}>
            <Route path="protected" element={<div>Protected admin content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
  })

  it('renders protected content for admin users', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: true, isReady: true, loading: false })

    render(
      <MemoryRouter initialEntries={['/admin/protected']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<AdminGuard />}>
            <Route path="protected" element={<div>Protected admin content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Protected admin content')).toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
  })

  it('does not expose protected content while auth is loading or not ready', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: false, isReady: false, loading: true })

    const { container } = render(
      <MemoryRouter initialEntries={['/admin/protected']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<AdminGuard />}>
            <Route path="protected" element={<div>Protected admin content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument()
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(container.firstChild).toBeNull()
  })
})
