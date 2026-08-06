import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useAuth } from '../../../context/AuthContext'
import AdminNavigation from '../AdminNavigation'

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))

describe('Admin navigation flows render without router warnings', () => {
  it('renders catalog, coupons, and promotions navigation links with proper routes', () => {
    ;(useAuth as jest.Mock).mockReturnValue({ isAdmin: true })

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin/catalog" element={<AdminNavigation />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /catalog/i })).toHaveAttribute('to', '/admin/catalog')
    expect(screen.getByRole('link', { name: /coupons/i })).toHaveAttribute('to', '/admin/coupons')
    expect(screen.getByRole('link', { name: /promotions/i })).toHaveAttribute('to', '/admin/promotions')
  })
})
