import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProductDetailPage from '../ProductDetailPage'

describe('ProductDetailPage', () => {
  const productResponse = {
    id: 1,
    name: 'Test product',
    description: 'Description',
    brand: 'Brand',
    category: { id: 1, name: 'Category', slug: 'category' },
    subcategory: { id: 2, name: 'Subcategory', slug: 'subcategory' },
    pricing: { price: 10, currency: 'USD', listPrice: 12, salePrice: null },
    availability: { isAvailable: false, inventoryStatus: 'OUT_OF_STOCK', availableQuantity: 0 },
    ratings: { average: 4, count: 0 },
    specifications: [],
    images: [],
    relatedProducts: [],
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('disables add to cart when product is sold out', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => productResponse,
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const addButton = await screen.findByRole('button', { name: /Add to cart/i })
    expect(addButton).toBeDisabled()
    expect(screen.getByText(/Out of stock/i)).toBeInTheDocument()
  })

  it('shows backend insufficient stock error when add to cart fails', async () => {
    const productWithStock = {
      ...productResponse,
      availability: { isAvailable: true, inventoryStatus: 'IN_STOCK', availableQuantity: 2 },
      images: [],
    }

    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => productWithStock })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Insufficient stock available.' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/products/1']}>
        <Routes>
          <Route path="/products/:productId" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )

    const quantityInput = await screen.findByLabelText('Quantity')
    await user.clear(quantityInput)
    await user.type(quantityInput, '2')

    const addButton = screen.getByRole('button', { name: /Add to cart/i })
    await user.click(addButton)

    expect(await screen.findByText(/Insufficient stock available./i)).toBeInTheDocument()
  })
})
