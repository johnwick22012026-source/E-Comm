import { describe, expect, it, vi, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import * as AuthContext from '../context/AuthContext'

describe('App wiring with the shared Layout', () => {
  const useAuthSpy = vi.spyOn(AuthContext, 'useAuth')

  afterEach(() => {
    useAuthSpy.mockReset()
  })

  afterAll(() => {
    useAuthSpy.mockRestore()
  })

  it('renders the shared layout and nested routes without import issues', () => {
    useAuthSpy.mockReturnValue({ isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /operations/i })).toBeInTheDocument()
  })
})