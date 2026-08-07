import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CheckoutPage from '../CheckoutPage'

const createMockResponse = (body: unknown, ok = true) =>
  Promise.resolve({
    ok,
    json: async () => body,
  } as Response)

describe('CheckoutPage payment authorization flow', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('shows a success message when the backend authorizes the payment', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response)
      .mockResolvedValueOnce(
        createMockResponse({
          status: 'AUTHORIZED',
          result: { providerReference: 'REF-123' },
        }),
      )

    render(<CheckoutPage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const tokenInput = screen.getByLabelText(/card token/i)
    await userEvent.type(tokenInput, 'tok_test')

    const button = screen.getByRole('button', { name: /authorize payment/i })
    await userEvent.click(button)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/payment authorized/i))
    expect(screen.getByRole('status')).toHaveTextContent(/ref: REF-123/i)
  })

  it('renders server errors when authorization is declined', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [] }),
      } as Response)
      .mockResolvedValueOnce(
        createMockResponse({
          status: 'failed',
          message: 'Marketplace rejected the request.',
          errors: ['Card expired', 'Bank blocked the transaction'],
        }),
      )

    render(<CheckoutPage />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const tokenInput = screen.getByLabelText(/card token/i)
    await userEvent.type(tokenInput, 'tok_decline')

    const button = screen.getByRole('button', { name: /authorize payment/i })
    await userEvent.click(button)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/marketplace rejected/i))
    expect(screen.getByText('Card expired')).toBeInTheDocument()
    expect(screen.getByText('Bank blocked the transaction')).toBeInTheDocument()
  })
})