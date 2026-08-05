import React from 'react'
import { describe, expect, it, vi, afterEach, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import * as AuthContext from '../context/AuthContext'

vi.mock('../components/Layout', () => ({
  Layout: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}))

vi.mock('../pages/CatalogPage', () => () => <div>Mock Catalog Page</div>)
vi.mock('../pages/ProductDetailPage', () => () => <div>Mock Product Detail Page</div>)
vi.mock('../pages/CartPage', () => () => <div>Mock Cart Page</div>)
vi.mock('../pages/CheckoutPage', () => () => <div>Mock Checkout Page</div>)
vi.mock('../pages/OrderConfirmationPage', () => () => <div>Mock Order Confirmation Page</div>)
vi.mock('../pages/LoginPage', () => () => <div>Mock Login Page</div>)
vi.mock('../pages/RegisterPage', () => () => <div>Mock Register Page</div>)
vi.mock('../pages/RequestPasswordResetPage', () => () => <div>Mock Password Reset Page</div>)
vi.mock('../pages/SetNewPasswordPage', () => () => <div>Mock Set Password Page</div>)
vi.mock('../pages/VerifyEmailPage', () => () => <div>Mock Verify Email Page</div>)
vi.mock('../pages/AccountPage', () => () => <div>Mock Account Page</div>)
vi.mock('../pages/OrderHistoryPage', () => () => <div>Mock Order History Page</div>)
vi.mock('../pages/OrderDetailPage', () => () => <div>Mock Order Detail Page</div>)
vi.mock('../pages/admin/OperationsPage', () => () => <div>Mock Operations Admin Page</div>)

const routeExpectations = [
  { description: 'root catalog', path: '/', expectedText: /Mock Catalog Page/i },
  { description: 'catalog landing', path: '/catalog', expectedText: /Mock Catalog Page/i },
  { description: 'catalog detail', path: '/catalog/42', expectedText: /Mock Product Detail Page/i },
  { description: 'cart flow', path: '/cart', expectedText: /Mock Cart Page/i },
  { description: 'checkout flow', path: '/checkout', expectedText: /Mock Checkout Page/i },
  { description: 'login', path: '/login', expectedText: /Mock Login Page/i },
  { description: 'registration', path: '/register', expectedText: /Mock Register Page/i },
  { description: 'account overview', path: '/account', expectedText: /Mock Account Page/i },
  { description: 'order history', path: '/account/orders', expectedText: /Mock Order History Page/i },
  { description: 'order detail', path: '/account/orders/xyz', expectedText: /Mock Order Detail Page/i },
]

describe('Customer-facing router regression coverage', () => {
  it.each(routeExpectations)('renders %s route component', ({ path, expectedText }) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })

  it('does not surface customer pages for unmatched routes', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Catalog Page/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mock Login Page/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Mock Account Page/i)).not.toBeInTheDocument()
  })
})

describe('Admin routing protection', () => {
  const useAuthSpy = vi.spyOn(AuthContext, 'useAuth')
  const baseAuthContext = {
    isSupportUser: false,
    isAuthenticated: false,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }

  afterEach(() => {
    useAuthSpy.mockReset()
  })

  afterAll(() => {
    useAuthSpy.mockRestore()
  })

  it('renders nested admin route when support users visit operations', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/operations']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Operations Admin Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin routes', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/operations']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Operations Admin Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })
})
