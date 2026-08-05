import '@testing-library/jest-dom/vitest'
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
vi.mock('../pages/admin/catalog/categories', () => () => <div>Mock Catalog Admin Categories Page</div>)
vi.mock('../pages/admin/promotions', () => () => <div>Mock Promotions Admin Page</div>)
vi.mock('../pages/admin/catalog/products', () => () => <div>Mock Catalog Admin Products Page</div>)
vi.mock('../pages/admin/coupons', () => () => <div>Mock Coupons Admin Page</div>)
vi.mock('../pages/admin/reporting', () => () => <div>Mock Reporting Admin Page</div>)

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

  it('renders nested promotions admin route when support users visit promotions', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/promotions']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Promotions Admin Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin promotions route', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/admin/promotions']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Promotions Admin Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })

  it('renders nested catalog categories admin route when support users visit catalog categories', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/catalog/categories']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Catalog Admin Categories Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin catalog categories route', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/admin/catalog/categories']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Catalog Admin Categories Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })

  it('renders nested catalog products admin route when support users visit the products create view', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/catalog/products/new']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Catalog Admin Products Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin catalog products route', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/admin/catalog/products/new']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Catalog Admin Products Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })

  it('renders coupons admin route when support users visit coupons landing', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/coupons']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Coupons Admin Page/i)).toBeInTheDocument()
  })

  it('renders nested coupons admin route when support users visit coupons create view', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/coupons/new']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Coupons Admin Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin coupons route', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/admin/coupons']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Coupons Admin Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })

  it('renders reporting admin route when support users visit reporting', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/reporting']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Reporting Admin Page/i)).toBeInTheDocument()
  })

  it('renders nested reporting admin route when support users visit reporting detail view', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: true })

    render(
      <MemoryRouter initialEntries={['/admin/reporting/sales']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Mock Reporting Admin Page/i)).toBeInTheDocument()
  })

  it('redirects non-support users away from admin reporting route', () => {
    useAuthSpy.mockReturnValue({ ...baseAuthContext, isSupportUser: false })

    render(
      <MemoryRouter initialEntries={['/admin/reporting/sales']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Mock Reporting Admin Page/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Mock Catalog Page/i)).toBeInTheDocument()
  })
})
