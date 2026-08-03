import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckoutPage from '../CheckoutPage'

describe('CheckoutPage', () => {
  const successResponse = {
    success: true,
    status: 'authorized',
    message: 'Authorized',
    providerReference: 'ref-123',
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays method cards and indicates selection', async () => {
    render(<CheckoutPage />)
    const methodButton = screen.getByRole('button', { name: /Card on file/i })
    expect(methodButton).toHaveClass('is-active')
    const walletButton = screen.getByRole('button', { name: /Wallet/i })
    await userEvent.click(walletButton)
    expect(walletButton).toHaveClass('is-active')
  })

  it('makes authorization request and shows success feedback', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => successResponse,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CheckoutPage />)

    const tokenInput = screen.getByPlaceholderText(/token issued by the gateway/i)
    await userEvent.type(tokenInput, 'tok_abc')

    const authorizeButton = screen.getByRole('button', { name: /Authorize payment/i })
    await userEvent.click(authorizeButton)

    expect(fetchMock).toHaveBeenCalled()
    expect(await screen.findByText(/Payment authorized/)).toBeInTheDocument()
  })

  it('shows error when backend responds with failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Cards offline' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CheckoutPage />)

    const tokenInput = screen.getByPlaceholderText(/token issued by the gateway/i)
    await userEvent.type(tokenInput, 'tok_fail')

    const authorizeButton = screen.getByRole('button', { name: /Authorize payment/i })
    await userEvent.click(authorizeButton)

    expect(await screen.findByText(/Cards offline/)).toBeInTheDocument()
  })
})
